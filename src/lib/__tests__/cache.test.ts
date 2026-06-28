/**
 * cache.test.ts — unit tests for the in-memory TTL cache.
 *
 * Uses a tiny assert-based test framework (no Jest / Vitest dependency).
 * Runnable via `bun run scripts/run-tests.ts`.
 */

import {
  cacheGet,
  cacheSet,
  cacheInvalidate,
  cacheClear,
  cacheStats,
  CACHE_KEYS,
} from "../cache";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    passed += 1;
    console.log(`  \u2713 ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`  \u2717 ${name}: ${(e as Error).message}`);
  }
}

function expect(actual: unknown) {
  return {
    toBe(expected: unknown) {
      if (actual !== expected) {
        throw new Error(
          `expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`
        );
      }
    },
    toEqual(expected: unknown) {
      const a = JSON.stringify(actual);
      const b = JSON.stringify(expected);
      if (a !== b) {
        throw new Error(`expected ${a} to equal ${b}`);
      }
    },
    toBeNull() {
      if (actual !== null) {
        throw new Error(`expected ${JSON.stringify(actual)} to be null`);
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error(`expected ${JSON.stringify(actual)} to be truthy`);
      }
    },
    toBeGreaterThan(n: number) {
      if (!(typeof actual === "number" && actual > n)) {
        throw new Error(`expected ${actual} to be greater than ${n}`);
      }
    },
  };
}

// Always start from a clean slate so test ordering doesn't matter.
cacheClear();

// --- Tests -------------------------------------------------------------------

test("cacheGet returns null for a missing key", () => {
  expect(cacheGet("does-not-exist")).toBeNull();
});

test("cacheSet/cacheGet roundtrip returns the same value", () => {
  cacheSet("greeting", { hello: "world" });
  expect(cacheGet("greeting")).toEqual({ hello: "world" });
});

test("cacheSet with a string value roundtrips", () => {
  cacheSet("name", "QuizExam");
  expect(cacheGet("name")).toBe("QuizExam");
});

test("cacheSet with a number value roundtrips", () => {
  cacheSet("answer", 42);
  expect(cacheGet<number>("answer")).toBe(42);
});

test("cacheSet with an array value roundtrips", () => {
  cacheSet("banks", [{ id: 1 }, { id: 2 }]);
  expect(cacheGet("banks")).toEqual([{ id: 1 }, { id: 2 }]);
});

test("cacheInvalidate removes a single key", () => {
  cacheSet("keep", "yes");
  cacheSet("drop", "no");
  cacheInvalidate("drop");
  expect(cacheGet("keep")).toBe("yes");
  expect(cacheGet("drop")).toBeNull();
});

test("cacheInvalidate on a missing key is a no-op", () => {
  // Should not throw.
  cacheInvalidate("never-set");
  expect(cacheGet("never-set")).toBeNull();
});

test("cacheClear removes every key", () => {
  cacheSet("a", 1);
  cacheSet("b", 2);
  cacheSet("c", 3);
  cacheClear();
  expect(cacheGet("a")).toBeNull();
  expect(cacheGet("b")).toBeNull();
  expect(cacheGet("c")).toBeNull();
  expect(cacheStats().size).toBe(0);
});

test("TTL expiry: a short-TTL entry is present synchronously after set", () => {
  cacheSet("short-lived", "gone", 50);
  expect(cacheGet("short-lived")).toBe("gone");
});

test("TTL expiry: a short-TTL entry becomes null after waiting > TTL", async () => {
  cacheSet("flash", "data", 20); // 20ms
  await new Promise((r) => setTimeout(r, 60)); // wait 60ms
  expect(cacheGet("flash")).toBeNull();
});

test("TTL expiry: lazy eviction drops the expired entry from the cache map", async () => {
  cacheSet("ephemeral", "value", 15);
  await new Promise((r) => setTimeout(r, 50));
  // First read triggers eviction.
  expect(cacheGet("ephemeral")).toBeNull();
  // Second read confirms the entry is gone (not just expired-but-present).
  expect(cacheStats().size).toBe(0);
});

test("CACHE_KEYS exports the expected well-known keys", () => {
  expect(CACHE_KEYS.banksList).toBe("banks:list");
  expect(CACHE_KEYS.examsList).toBe("exams:list");
});

test("cacheSet overwrites a prior value for the same key", () => {
  cacheSet("k", "v1");
  cacheSet("k", "v2");
  expect(cacheGet("k")).toBe("v2");
});

test("cacheStats reports the correct number of live entries", () => {
  cacheClear();
  cacheSet("one", 1);
  cacheSet("two", 2);
  const s = cacheStats();
  expect(s.size).toBe(2);
  expect(s.keys.length).toBe(2);
});

// Final clean-up so the cache is empty for any subsequent test files.
cacheClear();

// --- Summary -----------------------------------------------------------------
console.log(`\n  cache.test.ts: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exitCode = 1;
}
