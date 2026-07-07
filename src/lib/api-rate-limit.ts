import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { db } from "./db";
import { rateLimitCheck, type RateLimitResult } from "./rate-limit";

/**
 * Per-user API rate limiting (Feature E6.7).
 *
 * - 100 requests per minute per authenticated user.
 * - Returns 429 (Too Many Requests) when the limit is exceeded.
 * - Falls back to anonymous IP-based limiting when the request is not
 *   authenticated (so anonymous abuse is still throttled).
 *
 * The bucket key is `user:<userId>` for authenticated requests and
 * `ip:<ip>` for anonymous ones (reusing the existing rate-limit module
 * so all throttling lives in a single in-memory store).
 *
 * Usage:
 *   const limit = await applyUserRateLimit(request);
 *   if (!limit.allowed) {
 *     return limit.response!; // 429 with retry-after header
 *   }
 *   // …continue handling the request…
 */

export const USER_RATE_LIMIT_MAX = 100;
export const USER_RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute

export interface RateLimitOutcome {
  allowed: boolean;
  result: RateLimitResult;
  /** Pre-built 429 response (only set when `allowed` is false). */
  response?: Response;
  /** The user id if authenticated, null otherwise. */
  userId: string | null;
}

/**
 * Resolve the authenticated user (if any) from the request session.
 * Returns null for anonymous requests.
 */
export async function resolveAuthUserId(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return null;
    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    return user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Extract a stable client key for anonymous requests (when the user is
 * not authenticated). Falls back to the IP from x-forwarded-for or
 * x-real-ip, then to "anon".
 */
function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "anon";
}

/**
 * Apply the per-user rate limit. Returns the outcome + a pre-built 429
 * response if the request was denied.
 *
 * Set `max` / `windowMs` to override the defaults (100/min).
 */
export async function applyUserRateLimit(
  request: Request,
  options?: { max?: number; windowMs?: number },
): Promise<RateLimitOutcome> {
  const max = options?.max ?? USER_RATE_LIMIT_MAX;
  const windowMs = options?.windowMs ?? USER_RATE_LIMIT_WINDOW_MS;

  const userId = await resolveAuthUserId();
  const key = userId ? `user:${userId}` : `ip:${getClientIp(request)}`;

  const result = rateLimitCheck(key, max, windowMs);
  if (!result.allowed) {
    const body = {
      error:
        "Trop de requêtes. Veuillez patienter quelques instants avant de réessayer.",
      code: "RATE_LIMITED",
      retryAfter: result.reset,
    };
    const response = new Response(JSON.stringify(body), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(result.reset),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(result.reset),
      },
    });
    return { allowed: false, result, response, userId };
  }
  return { allowed: true, result, userId };
}
