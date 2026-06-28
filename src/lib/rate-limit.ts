/**
<<<<<<< Updated upstream
 * Simple in-memory IP-based rate limiter (added in F5).
 *
 * Used by the public API endpoints (/api/public/banks,
 * /api/public/questions) to prevent abuse. Each IP gets a fixed-size
 * sliding window of `max` requests per `windowMs`. Entries older than
 * the window are pruned lazily on read.
 *
 * This is intentionally minimal — no Redis, no distributed sync. The
 * counter resets when the dev server restarts, which is fine for the
 * public-API use case (these endpoints return public data anyway).
 *
 * We attach the limiter to `globalThis` so it survives HMR reloads in
 * the dev server (otherwise every code change would reset the counter).
 */

interface Bucket {
  /** Timestamps (ms) of recent requests. */
  hits: number[];
}

interface RateLimiterState {
  buckets: Map<string, Bucket>;
  windowMs: number;
  max: number;
}

const RATE_LIMIT_GLOBAL_KEY = "qebf_public_rate_limiter_v1";

interface GlobalWithRateLimiter {
  [key: string]: unknown;
}

function getState(windowMs: number, max: number): RateLimiterState {
  const g = globalThis as unknown as GlobalWithRateLimiter;
  let s = g[RATE_LIMIT_GLOBAL_KEY] as RateLimiterState | undefined;
  if (!s) {
    s = { buckets: new Map(), windowMs, max };
    g[RATE_LIMIT_GLOBAL_KEY] = s;
  }
  return s;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Seconds until the oldest hit in the window expires. */
  reset: number;
}

/**
 * Check (and record) a hit for the given key. Returns whether the
 * request is allowed and the standard X-RateLimit-* metadata.
 */
export function rateLimitCheck(
  key: string,
  max = 30,
  windowMs = 60_000
): RateLimitResult {
  const state = getState(windowMs, max);
  const now = Date.now();
  const cutoff = now - windowMs;
  const bucket = state.buckets.get(key);
  if (bucket) {
    // Prune expired hits.
    bucket.hits = bucket.hits.filter((t) => t > cutoff);
  } else {
    state.buckets.set(key, { hits: [] });
  }
  const b = state.buckets.get(key)!;

  if (b.hits.length >= max) {
    // Oldest hit tells us when the window will free up a slot.
    const oldest = b.hits[0] ?? now;
    return {
      allowed: false,
      limit: max,
      remaining: 0,
      reset: Math.ceil((oldest + windowMs - now) / 1000),
    };
  }

  b.hits.push(now);
  const remaining = Math.max(0, max - b.hits.length);
  const oldest = b.hits[0] ?? now;
  return {
    allowed: true,
    limit: max,
    remaining,
    reset: Math.ceil((oldest + windowMs - now) / 1000),
=======
 * Simple in-memory rate limiter (per-process).
 * Tracks request counts per identifier (e.g. IP address) within a sliding window.
 *
 * Note: this is a single-instance in-memory limiter; for multi-instance deployments
 * a distributed store (e.g. Redis) would be required. Sufficient for current usage.
 */

interface RateBucket {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  /** Maximum number of requests allowed within the window. */
  limit: number;
  /** Window duration in milliseconds. */
  windowMs: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  limit: 60,
  windowMs: 60_000,
};

const buckets = new Map<string, RateBucket>();

// Periodic cleanup of expired buckets (every 5 minutes)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, 5 * 60_000).unref?.();
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

/**
 * Check whether a request from `identifier` should be allowed.
 * Returns the updated bucket state along with a `success` boolean.
 */
export function checkRateLimit(
  identifier: string,
  config: Partial<RateLimitConfig> = {}
): RateLimitResult {
  const { limit, windowMs } = { ...DEFAULT_CONFIG, ...config };
  const now = Date.now();
  const bucket = buckets.get(identifier);

  if (!bucket || bucket.resetAt <= now) {
    const newBucket: RateBucket = {
      count: 1,
      resetAt: now + windowMs,
    };
    buckets.set(identifier, newBucket);
    return {
      success: true,
      limit,
      remaining: limit - 1,
      resetAt: newBucket.resetAt,
    };
  }

  if (bucket.count >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      resetAt: bucket.resetAt,
    };
  }

  bucket.count += 1;
  return {
    success: true,
    limit,
    remaining: limit - bucket.count,
    resetAt: bucket.resetAt,
>>>>>>> Stashed changes
  };
}

/**
<<<<<<< Updated upstream
 * Extract a stable client key from a Next.js Request. Falls back to
 * "anon" if no IP header is present (which would happen in some
 * localhost setups — in that case all anonymous requests share the
 * same bucket).
 */
export function getClientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // Use the first IP in the chain.
    return forwarded.split(",")[0]!.trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "anon";
}

/**
 * Build standard rate-limit headers for a NextResponse.
 */
export function rateLimitHeaders(r: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(r.limit),
    "X-RateLimit-Remaining": String(r.remaining),
    "X-RateLimit-Reset": String(r.reset),
  };
=======
 * Extract the best-effort client IP from a Next.js Request.
 * Falls back to "anonymous" when no IP can be determined.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "anonymous";
>>>>>>> Stashed changes
}
