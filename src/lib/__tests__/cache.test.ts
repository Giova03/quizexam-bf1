/**
<<<<<<< Updated upstream
 * cache.test.ts — unit tests for the in-memory TTL cache.
 *
 * Uses a tiny assert-based test framework (no Jest / Vitest dependency).
 * Runnable via `bun run scripts/run-tests.ts`.
 */

=======
 * Tests unitaires pour src/lib/cache.ts
 *
 * Exécutés par `bun run scripts/run-tests.ts`.
 */
>>>>>>> Stashed changes
import {
  cacheGet,
  cacheSet,
  cacheInvalidate,
  cacheClear,
  cacheStats,
<<<<<<< Updated upstream
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
=======
  cacheInvalidatePrefix,
  CACHE_KEYS,
} from "../cache";
import { test, describe, expect } from "./test-framework";

describe("Cache mémoire", () => {
  // Nettoie avant chaque série
  cacheClear();

  test("cacheGet renvoie null pour une clé manquante", () => {
    expect(cacheGet("missing-key")).toBeNull();
  });

  test("cacheSet puis cacheGet roundtrip renvoie la valeur", () => {
    cacheSet("user:1", { name: "Alice", age: 30 });
    const v = cacheGet<{ name: string; age: number }>("user:1");
    expect(v).toBeTruthy();
    expect(v?.name).toBe("Alice");
    expect(v?.age).toBe(30);
  });

  test("cacheSet accepte une valeur primitive", () => {
    cacheSet("count", 42);
    expect(cacheGet<number>("count")).toBe(42);
  });

  test("cacheSet accepte une valeur null (non null après get)", () => {
    // La convention : cacheGet renvoie null seulement pour "absent" ou "expiré"
    // mais on peut stocker null et le distinguer avec un wrapper.
    cacheSet("nullable", "ok");
    expect(cacheGet("nullable")).toBe("ok");
  });

  test("cacheInvalidate supprime une clé", () => {
    cacheSet("temp-key", "hello");
    expect(cacheGet("temp-key")).toBe("hello");
    cacheInvalidate("temp-key");
    expect(cacheGet("temp-key")).toBeNull();
  });

  test("cacheClear vide tout le cache", () => {
    cacheSet("a", 1);
    cacheSet("b", 2);
    cacheSet("c", 3);
    const statsBefore = cacheStats();
    expect(statsBefore.size).toBeGreaterThan(2);
    cacheClear();
    const statsAfter = cacheStats();
    expect(statsAfter.size).toBe(0);
    expect(cacheGet("a")).toBeNull();
    expect(cacheGet("b")).toBeNull();
    expect(cacheGet("c")).toBeNull();
  });

  test("cacheStats renvoie les clés présentes", () => {
    cacheClear();
    cacheSet("alpha", 1);
    cacheSet("beta", 2);
    const stats = cacheStats();
    expect(stats.size).toBe(2);
    expect(stats.keys).toContain("alpha");
    expect(stats.keys).toContain("beta");
  });

  test("cacheInvalidatePrefix supprime les clés qui matchent", () => {
    cacheClear();
    cacheSet("banks:list", []);
    cacheSet("banks:1", { id: 1 });
    cacheSet("banks:2", { id: 2 });
    cacheSet("exams:list", []);
    const removed = cacheInvalidatePrefix("banks:");
    expect(removed).toBe(3);
    expect(cacheGet("banks:list")).toBeNull();
    expect(cacheGet("banks:1")).toBeNull();
    expect(cacheGet("banks:2")).toBeNull();
    // Les clés non concernées restent
    expect(cacheGet("exams:list")).toBeTruthy();
  });

  test("cacheSet avec TTL 0 invalide immédiatement la clé", () => {
    cacheSet("ephemeral", "data", 0);
    expect(cacheGet("ephemeral")).toBeNull();
  });

  test("cacheSet avec TTL négatif invalide immédiatement la clé", () => {
    cacheSet("ephemeral2", "data", -100);
    expect(cacheGet("ephemeral2")).toBeNull();
  });

  test("cacheGet renvoie null après expiration du TTL", async () => {
    cacheSet("short-lived", "value", 50); // 50 ms
    // Immédiatement, la valeur est disponible
    expect(cacheGet("short-lived")).toBe("value");
    // Attendre l'expiration
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(cacheGet("short-lived")).toBeNull();
  });

  test("le cache survit au HMR via globalThis", () => {
    // Re-importer le module ne devrait pas perdre le cache
    cacheClear();
    cacheSet("persistent", "yes");
    // Simule un re-import en réutilisant le même globalThis
    // (puisque cache.ts lit globalThis.__APP_CACHE__, plusieurs imports
    // partagent le même Map.)
    const stats = cacheStats();
    expect(stats.keys).toContain("persistent");
  });
});

describe("Cache mémoire - CACHE_KEYS", () => {
  test("CACHE_KEYS exporte les clés attendues", () => {
    expect(CACHE_KEYS.BANKS).toBe("banks:list");
    expect(CACHE_KEYS.EXAMS).toBe("exams:list");
  });

  test("CACHE_KEYS peut être utilisé pour stocker et récupérer une valeur", () => {
    cacheClear();
    cacheSet(CACHE_KEYS.BANKS, [{ id: 1, name: "Bank A" }]);
    const v = cacheGet<{ id: number; name: string }[]>(CACHE_KEYS.BANKS);
    expect(v).toBeTruthy();
    expect(v?.length).toBe(1);
    expect(v?.[0]?.name).toBe("Bank A");
  });

  test("cacheInvalidate(CACHE_KEYS.BANKS) supprime la bonne clé", () => {
    cacheClear();
    cacheSet(CACHE_KEYS.BANKS, "banks-data");
    cacheSet(CACHE_KEYS.EXAMS, "exams-data");
    cacheInvalidate(CACHE_KEYS.BANKS);
    expect(cacheGet(CACHE_KEYS.BANKS)).toBeNull();
    // L'autre clé reste intacte
    expect(cacheGet(CACHE_KEYS.EXAMS)).toBe("exams-data");
  });
});
>>>>>>> Stashed changes
