// QuizExam BF - Service Worker for offline mode and PWA support
// Strategies:
//   - Static assets (HTML/CSS/JS/images/fonts): cache-first with network fallback
//   - API GET requests (banks/exams/leaderboard): network-first, fall back to cache
//   - API POST/PATCH/DELETE (mutations): passthrough; queued for background sync
//   - Navigation requests: network-first, fall back to cached "/" (offline shell)

const CACHE_VERSION = "v2";
const STATIC_CACHE = `quizexam-static-${CACHE_VERSION}`;
const API_CACHE = `quizexam-api-${CACHE_VERSION}`;
const BG_SYNC_QUEUE = "quizexam-bg-sync-queue";

// Pages and assets to pre-cache on install.
const PRE_CACHE_URLS = [
  "/",
  "/manifest.json",
  "/logo-quizexam.svg",
  "/api/banks",
  "/api/exams",
];

// Static asset extensions — cache-first strategy applies to these.
const STATIC_ASSET_EXTENSIONS = [
  ".css",
  ".js",
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      // Use addAll with individual catch so a single failure doesn't break the SW install.
      await Promise.all(
        PRE_CACHE_URLS.map((url) =>
          cache
            .add(new Request(url, { cache: "reload" }))
            .catch((err) => console.warn("[SW] Pre-cache miss:", url, err))
        )
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(
            (key) => key !== STATIC_CACHE && key !== API_CACHE
          )
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

// Helper: detect static asset requests.
function isStaticAsset(url) {
  const pathname = url.pathname.toLowerCase();
  if (url.pathname.startsWith("/_next/static/")) return true;
  return STATIC_ASSET_EXTENSIONS.some((ext) => pathname.endsWith(ext));
}

// Helper: detect navigation (page) requests.
function isNavigationRequest(request) {
  return (
    request.mode === "navigate" ||
    (request.headers.get("accept") || "").includes("text/html")
  );
}

// Helper: detect API GET requests that benefit from cache fallback.
function isCacheableApiGet(request, url) {
  if (request.method !== "GET") return false;
  if (!url.pathname.startsWith("/api/")) return false;
  // Don't cache auth-related or admin endpoints (avoid leaking session data).
  if (url.pathname.startsWith("/api/auth/")) return false;
  if (url.pathname.startsWith("/api/admin/")) return false;
  if (url.pathname.startsWith("/api/me")) return false;
  if (url.pathname.startsWith("/api/competition")) return false; // live data
  return true;
}

// Network-first strategy with cache fallback (used for API GETs).
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      cache.put(request, networkResponse.clone()).catch(() => {});
    }
    return networkResponse;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

// Cache-first strategy with network fallback (used for static assets).
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      cache.put(request, networkResponse.clone()).catch(() => {});
    }
    return networkResponse;
  } catch (err) {
    // Last-resort fallback for navigations: cached "/" shell.
    if (isNavigationRequest(request)) {
      const shell = await cache.match("/");
      if (shell) return shell;
    }
    throw err;
  }
}

// Background sync: queue mutations while offline and replay them when online.
async function queueMutation(request) {
  try {
    const cache = await caches.open(BG_SYNC_QUEUE);
    const bodyBlob = request.method !== "GET" ? await request.clone().blob() : null;
    const meta = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      timestamp: Date.now(),
    };
    const metaBlob = new Blob([JSON.stringify(meta)], { type: "application/json" });
    // Store meta + body together as a single Response so the cache API keeps them.
    const combined = new Response(
      new Blob([metaBlob, bodyBlob || new Blob([])], { type: "multipart/related" })
    );
    await cache.put(`mutation-${Date.now()}-${Math.random()}`, combined);
    if (self.registration && "sync" in self.registration) {
      try {
        await self.registration.sync.register("quizexam-replay");
      } catch {
        // sync not supported; replay will happen on next 'online' message.
      }
    }
  } catch (e) {
    console.warn("[SW] Failed to queue mutation:", e);
  }
}

async function replayQueue() {
  const cache = await caches.open(BG_SYNC_QUEUE);
  const requests = await cache.keys();
  for (const req of requests) {
    const response = await cache.match(req);
    if (!response) continue;
    try {
      const blob = await response.blob();
      const text = await blob.text();
      // meta is the first JSON object; rest is body. We split on the closing brace
      // of the meta object (best-effort for our queued mutations).
      const metaEnd = text.indexOf("}") + 1;
      const meta = JSON.parse(text.slice(0, metaEnd));
      const bodyText = text.slice(metaEnd);
      const init = {
        method: meta.method,
        headers: meta.headers || {},
      };
      if (meta.method !== "GET" && bodyText.length > 0) {
        init.body = bodyText;
      }
      const networkResponse = await fetch(meta.url, init);
      if (networkResponse && networkResponse.ok) {
        await cache.delete(req);
        // Notify clients that a queued mutation was replayed.
        const clients = await self.clients.matchAll();
        clients.forEach((c) =>
          c.postMessage({ type: "BG_SYNC_REPLAYED", url: meta.url })
        );
      }
    } catch (e) {
      console.warn("[SW] Replay failed for", req.url, e);
    }
  }
}

self.addEventListener("sync", (event) => {
  if (event.tag === "quizexam-replay") {
    event.waitUntil(replayQueue());
  }
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "SKIP_WAITING") self.skipWaiting();
  if (data.type === "REPLAY_QUEUE") {
    if (event.waitUntil) {
      event.waitUntil(replayQueue());
    } else {
      replayQueue();
    }
  }
  if (data.type === "GET_CACHE_STATS") {
    (async () => {
      const staticKeys = await caches.keys();
      let total = 0;
      for (const k of staticKeys) {
        const c = await caches.open(k);
        const keys = await c.keys();
        total += keys.length;
      }
      if (event.source) {
        event.source.postMessage({
          type: "CACHE_STATS",
          caches: staticKeys,
          totalEntries: total,
        });
      }
    })();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") {
    // For mutations: try network; if it fails, queue for background sync.
    if (
      request.url.startsWith(self.location.origin + "/api/") &&
      ["POST", "PATCH", "DELETE", "PUT"].includes(request.method)
    ) {
      event.respondWith(
        (async () => {
          try {
            return await fetch(request);
          } catch (err) {
            await queueMutation(request);
            return new Response(
              JSON.stringify({
                queued: true,
                message:
                  "Hors ligne : votre action sera synchronisée à la reconnexion.",
              }),
              {
                status: 202,
                headers: { "Content-Type": "application/json" },
              }
            );
          }
        })()
      );
    }
    return;
  }

  // Skip non-http(s) requests (e.g. chrome-extension://).
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Skip Next.js HMR and dev requests.
  if (url.pathname.includes("_next/webpack-hmr")) return;

  // API GET: network-first with cache fallback.
  if (isCacheableApiGet(request, url)) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Static assets: cache-first.
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Navigation: network-first, fall back to cached "/" shell when offline.
  if (isNavigationRequest(request)) {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          const cache = await caches.open(STATIC_CACHE);
          if (networkResponse && networkResponse.ok) {
            cache.put(request, networkResponse.clone()).catch(() => {});
          }
          return networkResponse;
        } catch (err) {
          const cache = await caches.open(STATIC_CACHE);
          const cached = await cache.match(request);
          if (cached) return cached;
          const shell = await cache.match("/");
          if (shell) return shell;
          throw err;
        }
      })()
    );
    return;
  }

  // Default: try network, fall back to cache.
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
