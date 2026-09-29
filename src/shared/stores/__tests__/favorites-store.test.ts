/**
 * favorites-store.test.ts — unit tests for the favorites Zustand store.
 *
 * Converted to vitest in P3 (was: dependency-free assert harness run by
 * scripts/run-tests.ts, now removed). The localStorage shim needed by the
 * persist middleware is installed globally by vitest.setup.ts.
 *
 * IMPORTANT: Zustand `set()` always creates a NEW array reference for the
 * `favorites` field (the store never mutates in place). So we MUST re-read
 * `useFavorites.getState()` after each mutation rather than holding on to a
 * destructured `favorites` array — otherwise the local variable stays stale.
 */

import { describe, it, expect, beforeEach } from "vitest";
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
beforeEach(() => {
  useFavorites.getState().clearAll();
});

describe("favorites store — toggleFavorite", () => {
  it("adds a question that is not yet favorited", () => {
    useFavorites.getState().toggleFavorite(makeFav("q1"));
    const { favorites } = useFavorites.getState();
    expect(favorites.length).toBe(1);
    expect(favorites[0].id).toBe("q1");
  });

  it("removes the question if it is already favorited", () => {
    useFavorites.getState().toggleFavorite(makeFav("q3"));
    expect(useFavorites.getState().isFavorite("q3")).toBe(true);
    useFavorites.getState().toggleFavorite(makeFav("q3")); // toggle off
    expect(useFavorites.getState().isFavorite("q3")).toBe(false);
    expect(
      useFavorites.getState().favorites.find((f) => f.id === "q3")
    ).toBeFalsy();
  });

  it("preserves other favorites when removing one", () => {
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

  it("toggling the same id twice returns to the original state", () => {
    useFavorites.getState().toggleFavorite(makeFav("q4"));
    expect(useFavorites.getState().favorites.length).toBe(1);
    useFavorites.getState().toggleFavorite(makeFav("q4"));
    expect(useFavorites.getState().favorites.length).toBe(0);
  });

  it("stores favorites newest-first (unshift)", () => {
    useFavorites.getState().toggleFavorite(makeFav("first"));
    useFavorites.getState().toggleFavorite(makeFav("second"));
    useFavorites.getState().toggleFavorite(makeFav("third"));
    const { favorites } = useFavorites.getState();
    expect(favorites[0].id).toBe("third");
    expect(favorites[1].id).toBe("second");
    expect(favorites[2].id).toBe("first");
  });
});

describe("favorites store — isFavorite", () => {
  it("returns false for a question that was never added", () => {
    expect(useFavorites.getState().isFavorite("never-added")).toBe(false);
  });

  it("returns true after toggleFavorite adds the question", () => {
    useFavorites.getState().toggleFavorite(makeFav("q2"));
    expect(useFavorites.getState().isFavorite("q2")).toBe(true);
  });
});

describe("favorites store — removeFavorite / clearAll", () => {
  it("removeFavorite deletes only the targeted question", () => {
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

  it("removeFavorite on a missing id is a no-op", () => {
    const before = useFavorites.getState().favorites.length;
    useFavorites.getState().removeFavorite("does-not-exist");
    expect(useFavorites.getState().favorites.length).toBe(before);
  });

  it("clearAll empties the favorites array", () => {
    useFavorites.getState().toggleFavorite(makeFav("x"));
    useFavorites.getState().toggleFavorite(makeFav("y"));
    useFavorites.getState().toggleFavorite(makeFav("z"));
    expect(useFavorites.getState().favorites.length).toBeGreaterThan(0);
    useFavorites.getState().clearAll();
    expect(useFavorites.getState().favorites.length).toBe(0);
  });
});
