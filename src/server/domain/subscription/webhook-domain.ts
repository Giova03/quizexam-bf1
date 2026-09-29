/**
 * FedaPay Webhook Domain — pure logic (P5).
 *
 * Zero framework, zero I/O: signature verification and event parsing for the
 * FedaPay payment webhooks. Keeping it here makes the security-critical part
 * unit-testable (vitest) without any HTTP or Prisma dependency.
 *
 * FedaPay webhook contract:
 * - Header `X-FEDAPAY-SIGNATURE` carries `t=<unix-seconds>,s=<hex-hmac>`.
 * - `s` = HMAC-SHA256(hex) of `${t}.${rawBody}` keyed with the webhook secret.
 * - Events are JSON: { name: "transaction.approved" | ..., entity: {...} } —
 *   for `transaction.*` events, `entity` is the transaction object, whose
 *   `custom_metadata` we control at checkout time (userId).
 */

import { createHmac, timingSafeEqual as nodeTimingSafeEqual } from "node:crypto";

/** Maximum age of the signed timestamp (replay window): 5 minutes. */
const REPLAY_WINDOW_MS = 5 * 60 * 1000;

/**
 * Verify the `X-FEDAPAY-SIGNATURE` header against the raw request body.
 *
 * Accepts (most specific first):
 * 1. `t=<sec>,s=<hex>` — HMAC of `${t}.${body}` (documented FedaPay format).
 * 2. `t=<sec>,s=<hex>` with any separator spacing — normalized first.
 * 3. Bare hex string — legacy/simple mode: HMAC of the raw body only.
 *
 * `nowMs` is injected (default Date.now()) so tests can simulate expiry.
 */
export function verifyFedapaySignature(
  secret: string,
  rawBody: string,
  signatureHeader: string,
  nowMs: number = Date.now(),
): boolean {
  if (!secret || !rawBody || !signatureHeader) return false;

  const header = signatureHeader.trim();
  const parts = new Map<string, string>();
  for (const chunk of header.split(",")) {
    const idx = chunk.indexOf("=");
    if (idx > 0) {
      parts.set(chunk.slice(0, idx).trim().toLowerCase(), chunk.slice(idx + 1).trim());
    }
  }

  const timestamp = parts.get("t");
  const signature = parts.get("s");

  let expected: string;
  let provided: string;

  if (timestamp && signature) {
    // Replay-window check (uint seconds since epoch).
    const ts = Number.parseInt(timestamp, 10);
    if (!Number.isFinite(ts) || ts <= 0) return false;
    const signedAtMs = ts * 1000;
    if (Math.abs(nowMs - signedAtMs) > REPLAY_WINDOW_MS) return false;
    expected = hmacSha256Hex(secret, `${timestamp}.${rawBody}`);
    provided = signature.toLowerCase();
  } else if (/^[0-9a-f]{64}$/i.test(header)) {
    // Bare-hex fallback: HMAC of the body only (no replay protection).
    expected = hmacSha256Hex(secret, rawBody);
    provided = header.toLowerCase();
  } else {
    return false;
  }

  return timingSafeEqual(expected, provided);
}

/** SHA-256 HMAC as lowercase hex. */
function hmacSha256Hex(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

/** Constant-time hex comparison (returns false on length mismatch). */
function timingSafeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  try {
    return nodeTimingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
  } catch {
    return false;
  }
}

// ===== Event parsing =====

export interface FedapayTransactionLike {
  id?: number | string;
  status?: string;
  merchant_reference?: string;
  custom_metadata?: Record<string, unknown> | null;
  amount?: number;
  currency?: { iso?: string } | string;
}

export interface FedapayEventLike {
  name?: string;
  entity?: FedapayTransactionLike | Record<string, unknown> | null;
}

/** Parse the raw webhook body; returns null on malformed JSON. */
export function parseFedapayEvent(rawBody: string): FedapayEventLike | null {
  try {
    const parsed: unknown = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as FedapayEventLike;
  } catch {
    return null;
  }
}

export type PremiumActivationResolution =
  | { kind: "activate"; userId: string; transactionId: string }
  | { kind: "ignore"; reason: string };

/**
 * Decide what the webhook should do:
 * - ONLY `transaction.approved` (or status "approved"/"transferred") activates.
 * - The userId MUST come from our own checkout metadata — never from a
 *   customer-controlled field — and must be a non-empty string.
 * - Anything else (declined, canceled, malformed metadata) is safely ignored.
 */
export function resolvePremiumActivation(
  event: FedapayEventLike,
): PremiumActivationResolution {
  const name = typeof event.name === "string" ? event.name : "";
  const entity = event.entity as FedapayTransactionLike | undefined;

  if (!entity || typeof entity !== "object") {
    return { kind: "ignore", reason: "no_entity" };
  }

  const status = typeof entity.status === "string" ? entity.status.toLowerCase() : "";
  const approved = name === "transaction.approved" || status === "approved" || status === "transferred";
  if (!approved) {
    return { kind: "ignore", reason: name || status || "unknown_event" };
  }

  const metadata = entity.custom_metadata;
  const userId =
    metadata && typeof metadata === "object" && typeof metadata.userId === "string"
      ? metadata.userId.trim()
      : "";
  if (!userId) {
    return { kind: "ignore", reason: "missing_user_metadata" };
  }

  const transactionId =
    entity.id !== undefined && entity.id !== null ? String(entity.id) : "unknown";
  return { kind: "activate", userId, transactionId };
}
