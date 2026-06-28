/**
<<<<<<< Updated upstream
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
=======
 * Cache mémoire simple avec TTL (Time-To-Live).
 *
 * - Utilise `globalThis` pour survivre au HMR (Hot Module Replacement)
 *   en développement Next.js, afin de ne pas créer un store par requête.
 * - Fonctions exportées :
 *   - cacheGet<T>(key)             → valeur ou null si expirée / absente
 *   - cacheSet(key, value, ttlMs)  → stocke une valeur avec TTL
 *   - cacheInvalidate(key)         → supprime une clé
 *   - cacheClear()                 → vide tout le cache
 *   - cacheStats()                 → renvoie nbClés + taille mémoire approx.
 *
 * TTL par défaut : 5 minutes (300 000 ms).
 */

const DEFAULT_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  value: unknown;
  expiresAt: number; // timestamp epoch ms
}

interface CacheStore {
  map: Map<string, CacheEntry>;
}

// Singleton via globalThis pour survivre au HMR
const g = globalThis as unknown as { __APP_CACHE__?: CacheStore };
if (!g.__APP_CACHE__) {
  g.__APP_CACHE__ = { map: new Map<string, CacheEntry>() };
}
const store: CacheStore = g.__APP_CACHE__!;

/**
 * Récupère une valeur en cache.
 * Renvoie null si la clé n'existe pas ou si elle a expiré
 * (auquel cas elle est supprimée à cette occasion).
 */
export function cacheGet<T = unknown>(key: string): T | null {
  const entry = store.map.get(key);
  if (!entry) return null;
  if (Date.now() >= entry.expiresAt) {
    store.map.delete(key);
>>>>>>> Stashed changes
    return null;
  }
  return entry.value as T;
}

/**
<<<<<<< Updated upstream
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
=======
 * Stocke une valeur avec un TTL donné (par défaut 5 minutes).
 * Si `ttlMs` est 0 ou négatif, la clé est immédiatement invalidée.
 */
export function cacheSet<T = unknown>(
  key: string,
  value: T,
  ttlMs: number = DEFAULT_TTL_MS
): void {
  if (ttlMs <= 0) {
    store.map.delete(key);
    return;
  }
  store.map.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

/**
 * Supprime explicitement une clé du cache.
 */
export function cacheInvalidate(key: string): void {
  store.map.delete(key);
}

/**
 * Vide entièrement le cache (toutes les clés).
 */
export function cacheClear(): void {
  store.map.clear();
}

/**
 * Renvoie des statistiques simples sur le cache.
 * Utile pour le debug et les tests.
 */
export function cacheStats(): {
  size: number;
  keys: string[];
} {
  return {
    size: store.map.size,
    keys: Array.from(store.map.keys()),
  };
}

/**
 * Invalide toutes les clés qui commencent par un préfixe donné.
 * Pratique pour invalider des groupes de clés liées (ex: "banks:*").
 */
export function cacheInvalidatePrefix(prefix: string): number {
  let n = 0;
  for (const key of Array.from(store.map.keys())) {
    if (key.startsWith(prefix)) {
      store.map.delete(key);
      n++;
    }
  }
  return n;
}

export const CACHE_DEFAULT_TTL_MS = DEFAULT_TTL_MS;

/**
 * Clés de cache centralisées pour les listes fréquemment accédées.
 * Utilisées par les routes API `/api/banks` et `/api/exams` notamment.
 *
 * NB : les routes existantes utilisent déjà les chaînes `"banks:list"` et
 * `"exams:list"` ; cet objet est un alias typé pour faciliter l'usage dans
 * les futurs développements et les tests.
 */
export const CACHE_KEYS = {
  BANKS: "banks:list",
  EXAMS: "exams:list",
>>>>>>> Stashed changes
} as const;
