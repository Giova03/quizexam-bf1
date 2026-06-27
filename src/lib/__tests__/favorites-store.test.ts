/**
 * favorites-store.test.ts — unit tests for the favorites Zustand store.
 *
 * Uses a tiny assert-based test framework (no Jest / Vitest dependency).
 * Runnable via `bun run scripts/run-tests.ts`.
 *
 * IMPORTANT: Zustand `set()` always creates a NEW array reference for the
 * `favorites` field (the store never mutates in place). So we MUST re-read
 * `useFavorites.getState()` after each mutation rather than holding on to a
 * destructured `favorites` array — otherwise the local variable stays stale.
 *
 * NOTE: A localStorage shim is installed by `scripts/run-tests.ts` BEFORE
 * this module is dynamically imported, so the Zustand persist middleware
 * captures a working storage reference and does not log "Unable to update
 * item" warnings.
 */

import { useFavorites } from "../favorites-store";

/**
 * Local copy of the FavoriteQuestion shape (the store doesn't export the
 * interface itself). Keeping a local copy avoids coupling the test to the
 * store's internal type exports.
 */
interface FavoriteQuestion {
  id: string;
  question: string;
  correctAnswer: string;
  explanation: string;
  bankId: string;
  bankTitle: string;
  bankColor: string;
  savedAt: string;
}

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
    toBeTruthy() {
      if (!actual) {
        throw new Error(`expected ${JSON.stringify(actual)} to be truthy`);
      }
    },
    toBeFalsy() {
      if (actual) {
        throw new Error(`expected ${JSON.stringify(actual)} to be falsy`);
      }
    },
    toBeGreaterThan(n: number) {
      if (!(typeof actual === "number" && actual > n)) {
        throw new Error(`expected ${actual} to be greater than ${n}`);
      }
    },
  };
}

function makeFav(id: string): FavoriteQuestion {
  return {
    id,
    question: `Question ${id}?`,
    correctAnswer: "A",
    explanation: "because",
    bankId: "bank-1",
    bankTitle: "Bank 1",
    bankColor: "emerald",
    savedAt: new Date().toISOString(),
  };
}

// Always start from a clean state so test ordering doesn't matter.
useFavorites.getState().clearAll();

// --- Tests -------------------------------------------------------------------

test("toggleFavorite adds a question that is not yet favorited", () => {
  useFavorites.getState().toggleFavorite(makeFav("q1"));
  const { favorites } = useFavorites.getState();
  expect(favorites.length).toBe(1);
  expect(favorites[0].id).toBe("q1");
});

test("isFavorite returns false for a question that was never added", () => {
  expect(useFavorites.getState().isFavorite("never-added")).toBe(false);
});

test("isFavorite returns true after toggleFavorite adds the question", () => {
  useFavorites.getState().toggleFavorite(makeFav("q2"));
  expect(useFavorites.getState().isFavorite("q2")).toBe(true);
});

test("toggleFavorite removes the question if it is already favorited", () => {
  useFavorites.getState().toggleFavorite(makeFav("q3"));
  expect(useFavorites.getState().isFavorite("q3")).toBe(true);
  useFavorites.getState().toggleFavorite(makeFav("q3")); // toggle off
  expect(useFavorites.getState().isFavorite("q3")).toBe(false);
  expect(
    useFavorites.getState().favorites.find((f) => f.id === "q3")
  ).toBeFalsy();
});

test("toggleFavorite preserves other favorites when removing one", () => {
  useFavorites.getState().clearAll();
  useFavorites.getState().toggleFavorite(makeFav("keep-1"));
  useFavorites.getState().toggleFavorite(makeFav("drop-2"));
  useFavorites.getState().toggleFavorite(makeFav("keep-3"));
  expect(useFavorites.getState().favorites.length).toBe(3);
  useFavorites.getState().toggleFavorite(makeFav("drop-2"));
  const { favorites } = useFavorites.getState();
  expect(favorites.length).toBe(2);
  expect(favorites.find((f) => f.id === "keep-1")).toBeTruthy();
  expect(favorites.find((f) => f.id === "keep-3")).toBeTruthy();
});

test("toggleFavorite on the same id twice returns to the original state", () => {
  useFavorites.getState().clearAll();
  useFavorites.getState().toggleFavorite(makeFav("q4"));
  expect(useFavorites.getState().favorites.length).toBe(1);
  useFavorites.getState().toggleFavorite(makeFav("q4"));
  expect(useFavorites.getState().favorites.length).toBe(0);
});

test("removeFavorite deletes only the targeted question", () => {
  useFavorites.getState().clearAll();
  useFavorites.getState().toggleFavorite(makeFav("a"));
  useFavorites.getState().toggleFavorite(makeFav("b"));
  useFavorites.getState().toggleFavorite(makeFav("c"));
  useFavorites.getState().removeFavorite("b");
  const { favorites, isFavorite } = useFavorites.getState();
  expect(favorites.length).toBe(2);
  expect(isFavorite("a")).toBe(true);
  expect(isFavorite("b")).toBe(false);
  expect(isFavorite("c")).toBe(true);
});

test("removeFavorite on a missing id is a no-op", () => {
  const before = useFavorites.getState().favorites.length;
  useFavorites.getState().removeFavorite("does-not-exist");
  expect(useFavorites.getState().favorites.length).toBe(before);
});

test("clearAll empties the favorites array", () => {
  useFavorites.getState().toggleFavorite(makeFav("x"));
  useFavorites.getState().toggleFavorite(makeFav("y"));
  useFavorites.getState().toggleFavorite(makeFav("z"));
  expect(useFavorites.getState().favorites.length).toBeGreaterThan(0);
  useFavorites.getState().clearAll();
  expect(useFavorites.getState().favorites.length).toBe(0);
});

test("favorites are stored newest-first (unshift)", () => {
  useFavorites.getState().clearAll();
  useFavorites.getState().toggleFavorite(makeFav("first"));
  useFavorites.getState().toggleFavorite(makeFav("second"));
  useFavorites.getState().toggleFavorite(makeFav("third"));
  const { favorites } = useFavorites.getState();
  expect(favorites[0].id).toBe("third");
  expect(favorites[1].id).toBe("second");
  expect(favorites[2].id).toBe("first");
});

// Final clean-up.
useFavorites.getState().clearAll();

// --- Summary -----------------------------------------------------------------
console.log(`\n  favorites-store.test.ts: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exitCode = 1;
}
