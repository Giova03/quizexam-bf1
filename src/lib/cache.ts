/**
 * cache.ts — simple in-memory TTL cache for server-side use.
 *
 * Lives for the lifetime of the Node.js process (survives HMR via globalThis).
 * NOT shared across server instances — appropriate for a single-instance deploy
 * (which is how this Next.js app runs in this sandbox).
 *
 * Public API:
 *   - cacheGet<T>(key)         -> T | null
 *   - cacheSet(key, value, ttlMs?) -> void
 *   - cacheInvalidate(key)     -> void
 *   - cacheClear()             -> void
 *   - cacheStats()             -> { size, keys }  (handy for debugging)
 *
 * Default TTL: 5 minutes (DEFAULT_TTL_MS).
 */

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  /** The cached value (any JSON-serialisable structure). */
  value: unknown;
  /** Absolute epoch-millis timestamp at which this entry expires. */
  expiresAt: number;
}

/**
 * Module-private cache map. We attach it to `globalThis` so that it survives
 * Next.js dev HMR (where module state would otherwise be wiped on every
 * change). This mirrors the pattern used by `src/lib/db.ts` for the Prisma
 * client.
 */
type CacheStore = Map<string, CacheEntry>;

const globalForCache = globalThis as unknown as {
  __quizexamCache?: CacheStore;
};

const cache: CacheStore =
  globalForCache.__quizexamCache ?? new Map<string, CacheEntry>();

if (!globalForCache.__quizexamCache) {
  globalForCache.__quizexamCache = cache;
}

/**
 * Read a cached value. Returns null if the key is missing or has expired
 * (expired entries are lazily evicted on read).
 */
export function cacheGet<T = unknown>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  // Lazy TTL eviction: drop the entry on read if it has expired.
  if (Date.now() >= entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value as T;
}

/**
 * Store a value with an optional TTL. If `ttlMs` is omitted, the default
 * 5-minute TTL is used. Pass `0` (or a negative number) to disable expiry
 * for this entry — the entry will live until explicitly invalidated or the
 * process restarts.
 */
export function cacheSet(key: string, value: unknown, ttlMs: number = DEFAULT_TTL_MS): void {
  const expiresAt =
    ttlMs && ttlMs > 0 ? Date.now() + ttlMs : Number.POSITIVE_INFINITY;
  cache.set(key, { value, expiresAt });
}

/**
 * Remove a single key from the cache. Safe to call on a missing key.
 */
export function cacheInvalidate(key: string): void {
  cache.delete(key);
}

/**
 * Remove all entries from the cache.
 */
export function cacheClear(): void {
  cache.clear();
}

/**
 * Return a snapshot of the cache for debugging / introspection.
 * The `keys` list also lazily evicts any expired entries it encounters.
 */
export function cacheStats(): { size: number; keys: string[] } {
  const now = Date.now();
  const keys: string[] = [];
  for (const [k, entry] of cache) {
    if (now >= entry.expiresAt) {
      cache.delete(k);
    } else {
      keys.push(k);
    }
  }
  return { size: cache.size, keys };
}

/**
 * Well-known cache keys used across the codebase. Centralised here so that
 * producers (the GET endpoints) and consumers (the mutation endpoints that
 * invalidate) stay in sync.
 */
export const CACHE_KEYS = {
  banksList: "banks:list",
  examsList: "exams:list",
} as const;
