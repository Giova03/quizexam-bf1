/**
 * cache.test.ts — unit tests for the in-memory TTL cache.
 *
 * Converted to vitest in P3 (was: dependency-free assert harness run by
 * scripts/run-tests.ts, now removed).
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  cacheGet,
  cacheSet,
  cacheInvalidate,
  cacheClear,
  cacheStats,
  CACHE_KEYS,
} from "../cache";

// Always start from a clean slate so test ordering doesn't matter.
beforeEach(() => {
  cacheClear();
});

describe("cache basic roundtrip", () => {
  it("cacheGet returns null for a missing key", () => {
    expect(cacheGet("does-not-exist")).toBeNull();
  });

  it("cacheSet/cacheGet roundtrip returns the same value", () => {
    cacheSet("greeting", { hello: "world" });
    expect(cacheGet("greeting")).toEqual({ hello: "world" });
  });

  it("cacheSet with a string value roundtrips", () => {
    cacheSet("name", "QuizExam");
    expect(cacheGet("name")).toBe("QuizExam");
  });

  it("cacheSet with a number value roundtrips", () => {
    cacheSet("answer", 42);
    expect(cacheGet<number>("answer")).toBe(42);
  });

  it("cacheSet with an array value roundtrips", () => {
    cacheSet("banks", [{ id: 1 }, { id: 2 }]);
    expect(cacheGet("banks")).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it("cacheSet overwrites a prior value for the same key", () => {
    cacheSet("k", "v1");
    cacheSet("k", "v2");
    expect(cacheGet("k")).toBe("v2");
  });
});

describe("cache invalidation", () => {
  it("cacheInvalidate removes a single key", () => {
    cacheSet("keep", "yes");
    cacheSet("drop", "no");
    cacheInvalidate("drop");
    expect(cacheGet("keep")).toBe("yes");
    expect(cacheGet("drop")).toBeNull();
  });

  it("cacheInvalidate on a missing key is a no-op", () => {
    // Should not throw.
    cacheInvalidate("never-set");
    expect(cacheGet("never-set")).toBeNull();
  });

  it("cacheClear removes every key", () => {
    cacheSet("a", 1);
    cacheSet("b", 2);
    cacheSet("c", 3);
    cacheClear();
    expect(cacheGet("a")).toBeNull();
    expect(cacheGet("b")).toBeNull();
    expect(cacheGet("c")).toBeNull();
    expect(cacheStats().size).toBe(0);
  });
});

describe("TTL expiry", () => {
  it("a short-TTL entry is present synchronously after set", () => {
    cacheSet("short-lived", "gone", 50);
    expect(cacheGet("short-lived")).toBe("gone");
  });

  it("a short-TTL entry becomes null after waiting > TTL", async () => {
    cacheSet("flash", "data", 20); // 20ms
    await new Promise((r) => setTimeout(r, 60)); // wait 60ms
    expect(cacheGet("flash")).toBeNull();
  });

  it("lazy eviction drops the expired entry from the cache map", async () => {
    cacheSet("ephemeral", "value", 15);
    await new Promise((r) => setTimeout(r, 50));
    // First read triggers eviction.
    expect(cacheGet("ephemeral")).toBeNull();
    // Second read confirms the entry is gone (not just expired-but-present).
    expect(cacheStats().size).toBe(0);
  });
});

describe("cache metadata", () => {
  it("CACHE_KEYS exports the expected well-known keys", () => {
    expect(CACHE_KEYS.banksList).toBe("banks:list");
    expect(CACHE_KEYS.examsList).toBe("exams:list");
  });

  it("cacheStats reports the correct number of live entries", () => {
    cacheClear();
    cacheSet("one", 1);
    cacheSet("two", 2);
    const s = cacheStats();
    expect(s.size).toBe(2);
    expect(s.keys.length).toBe(2);
  });
});
