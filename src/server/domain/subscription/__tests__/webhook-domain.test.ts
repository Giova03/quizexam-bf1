/**
 * webhook-domain.test.ts — FedaPay webhook security contract (P5).
 *
 * These tests lock the security-critical behaviors:
 * - signature verification (valid / tampered / expired / malformed),
 * - event parsing (malformed JSON),
 * - activation resolution (only approved + our own metadata activates).
 */

import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import {
  verifyFedapaySignature,
  parseFedapayEvent,
  resolvePremiumActivation,
} from "../webhook-domain";

const SECRET = "whsec_test_1234567890abcdef";

function sign(secret: string, payload: string, timestampSec: number): string {
  return createHmac("sha256", secret).update(`${timestampSec}.${payload}`, "utf8").digest("hex");
}

const NOW_MS = 1_800_000_000_000; // fixed "now" for reproducible tests
const NOW_SEC = Math.floor(NOW_MS / 1000);

describe("verifyFedapaySignature", () => {
  const body = JSON.stringify({ name: "transaction.approved", entity: { id: 42 } });

  it("accepts a valid t/s signature", () => {
    const header = `t=${NOW_SEC},s=${sign(SECRET, body, NOW_SEC)}`;
    expect(verifyFedapaySignature(SECRET, body, header, NOW_MS)).toBe(true);
  });

  it("rejects a signature computed with a different secret", () => {
    const header = `t=${NOW_SEC},s=${sign("whsec_other", body, NOW_SEC)}`;
    expect(verifyFedapaySignature(SECRET, body, header, NOW_MS)).toBe(false);
  });

  it("rejects a tampered body", () => {
    const header = `t=${NOW_SEC},s=${sign(SECRET, body, NOW_SEC)}`;
    const tampered = body.replace("42", "43");
    expect(verifyFedapaySignature(SECRET, tampered, header, NOW_MS)).toBe(false);
  });

  it("rejects signatures outside the replay window (6 minutes old)", () => {
    const oldSec = NOW_SEC - 6 * 60;
    const header = `t=${oldSec},s=${sign(SECRET, body, oldSec)}`;
    expect(verifyFedapaySignature(SECRET, body, header, NOW_MS)).toBe(false);
  });

  it("accepts a signature inside the replay window (1 minute old)", () => {
    const recentSec = NOW_SEC - 60;
    const header = `t=${recentSec},s=${sign(SECRET, body, recentSec)}`;
    expect(verifyFedapaySignature(SECRET, body, header, NOW_MS)).toBe(true);
  });

  it("accepts the bare-hex fallback (HMAC of the body only)", () => {
    const hex = createHmac("sha256", SECRET).update(body, "utf8").digest("hex");
    expect(verifyFedapaySignature(SECRET, body, hex, NOW_MS)).toBe(true);
  });

  it("rejects garbage headers and empty inputs", () => {
    expect(verifyFedapaySignature(SECRET, body, "not-a-signature", NOW_MS)).toBe(false);
    expect(verifyFedapaySignature(SECRET, body, "", NOW_MS)).toBe(false);
    expect(verifyFedapaySignature("", body, `t=${NOW_SEC},s=abc`, NOW_MS)).toBe(false);
    expect(verifyFedapaySignature(SECRET, "", `t=${NOW_SEC},s=abc`, NOW_MS)).toBe(false);
    // Malformed t (non-numeric).
    expect(
      verifyFedapaySignature(SECRET, body, `t=abc,s=${sign(SECRET, body, 1)}`, NOW_MS),
    ).toBe(false);
  });
});

describe("parseFedapayEvent", () => {
  it("parses a valid event", () => {
    const raw = JSON.stringify({ name: "transaction.approved", entity: { id: 7 } });
    const event = parseFedapayEvent(raw);
    expect(event).not.toBeNull();
    expect(event?.name).toBe("transaction.approved");
  });

  it("returns null on malformed JSON, arrays and primitives", () => {
    expect(parseFedapayEvent("{not json")).toBeNull();
    expect(parseFedapayEvent("[1,2,3]")).toBeNull();
    expect(parseFedapayEvent("42")).toBeNull();
    expect(parseFedapayEvent("")).toBeNull();
  });
});

describe("resolvePremiumActivation", () => {
  it("activates on transaction.approved with our userId metadata", () => {
    const resolution = resolvePremiumActivation({
      name: "transaction.approved",
      entity: { id: 42, status: "approved", custom_metadata: { userId: "user_123" } },
    });
    expect(resolution).toEqual({ kind: "activate", userId: "user_123", transactionId: "42" });
  });

  it("activates on an approved STATUS even if the event name is unknown", () => {
    const resolution = resolvePremiumActivation({
      name: "some.other.event",
      entity: { id: 9, status: "approved", custom_metadata: { userId: "user_abc" } },
    });
    expect(resolution.kind).toBe("activate");
  });

  it("ignores declined / canceled / unknown events", () => {
    const declined = resolvePremiumActivation({
      name: "transaction.declined",
      entity: { id: 1, custom_metadata: { userId: "u1" } },
    });
    expect(declined).toEqual({ kind: "ignore", reason: "transaction.declined" });

    const canceled = resolvePremiumActivation({
      name: "transaction.canceled",
      entity: { id: 1, custom_metadata: { userId: "u1" } },
    });
    expect(canceled.kind).toBe("ignore");
  });

  it("ignores events without our metadata (cannot trust other fields)", () => {
    const noMeta = resolvePremiumActivation({
      name: "transaction.approved",
      entity: { id: 3 },
    });
    expect(noMeta).toEqual({ kind: "ignore", reason: "missing_user_metadata" });

    const emptyMeta = resolvePremiumActivation({
      name: "transaction.approved",
      entity: { id: 3, custom_metadata: { userId: "   " } },
    });
    expect(emptyMeta).toEqual({ kind: "ignore", reason: "missing_user_metadata" });
  });

  it("ignores events without an entity object", () => {
    const resolution = resolvePremiumActivation({ name: "transaction.approved" });
    expect(resolution).toEqual({ kind: "ignore", reason: "no_entity" });
  });
});
