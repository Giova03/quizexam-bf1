/**
 * Tests unitaires pour src/lib/favorites-store.ts (Zustand store)
 *
 * Exécutés par `bun run scripts/run-tests.ts`.
 *
 * Le store utilise le middleware `persist` qui s'appuie sur `localStorage`.
 * En environnement Node/Bun, on polyfille `globalThis.localStorage` avec
 * une Map mémoire avant d'importer le store.
 */

// Polyfill minimal de localStorage pour Bun/Node (avant l'import du store)
class MemStorage {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  clear(): void {
    this.map.clear();
  }
  key(index: number): string | null {
    const keys = Array.from(this.map.keys());
    return keys[index] ?? null;
  }
  get length(): number {
    return this.map.size;
  }
}

// Injecte le polyfill AVANT l'import du module testé
const g = globalThis as unknown as { localStorage?: MemStorage };
if (!g.localStorage) {
  g.localStorage = new MemStorage();
}

import { useFavorites, type FavoriteQuestion } from "../favorites-store";
import { test, describe, expect } from "./test-framework";

// Helper : réinitialise le store entre les tests
function resetFavorites(): void {
  useFavorites.setState({ favorites: [] });
  // Nettoie aussi le localStorage polyfillé
  if (g.localStorage) g.localStorage.clear();
}

// Helper : crée une question favorite de test
function makeFavorite(id: string, question = "Question ?"): FavoriteQuestion {
  return {
    id,
    question,
    correctAnswer: "A",
    explanation: "Parce que...",
    bankId: "bank-1",
    bankTitle: "Banque Test",
    bankColor: "emerald",
    savedAt: new Date().toISOString(),
  };
}

describe("Favorites store - isFavorite", () => {
  test("isFavorite renvoie false quand la liste est vide", () => {
    resetFavorites();
    expect(useFavorites.getState().isFavorite("any-id")).toBeFalsy();
  });

  test("isFavorite renvoie false pour une question non présente", () => {
    resetFavorites();
    const fav = makeFavorite("q1");
    useFavorites.getState().toggleFavorite(fav);
    expect(useFavorites.getState().isFavorite("q2")).toBeFalsy();
  });

  test("isFavorite renvoie true pour une question présente", () => {
    resetFavorites();
    const fav = makeFavorite("q1");
    useFavorites.getState().toggleFavorite(fav);
    expect(useFavorites.getState().isFavorite("q1")).toBeTruthy();
  });
});

describe("Favorites store - toggleFavorite", () => {
  test("toggleFavorite ajoute une question à la liste", () => {
    resetFavorites();
    const fav = makeFavorite("q1", "Quelle est la capitale du Burkina ?");
    useFavorites.getState().toggleFavorite(fav);
    const list = useFavorites.getState().favorites;
    expect(list.length).toBe(1);
    expect(list[0].id).toBe("q1");
  });

  test("toggleFavorite ajoute en tête de liste (LIFO)", () => {
    resetFavorites();
    useFavorites.getState().toggleFavorite(makeFavorite("q1"));
    useFavorites.getState().toggleFavorite(makeFavorite("q2"));
    const list = useFavorites.getState().favorites;
    expect(list.length).toBe(2);
    expect(list[0].id).toBe("q2"); // la dernière ajoutée est en tête
    expect(list[1].id).toBe("q1");
  });

  test("toggleFavorite retire la question si elle est déjà présente", () => {
    resetFavorites();
    const fav = makeFavorite("q1");
    useFavorites.getState().toggleFavorite(fav); // ajoute
    expect(useFavorites.getState().favorites.length).toBe(1);
    useFavorites.getState().toggleFavorite(fav); // retire
    expect(useFavorites.getState().favorites.length).toBe(0);
  });

  test("toggleFavorite préserve les autres questions", () => {
    resetFavorites();
    useFavorites.getState().toggleFavorite(makeFavorite("q1"));
    useFavorites.getState().toggleFavorite(makeFavorite("q2"));
    useFavorites.getState().toggleFavorite(makeFavorite("q3"));
    useFavorites.getState().toggleFavorite(makeFavorite("q2")); // retire q2
    const list = useFavorites.getState().favorites;
    expect(list.length).toBe(2);
    expect(list[0].id).toBe("q3");
    expect(list[1].id).toBe("q1");
  });

  test("toggleFavorite préserve tous les champs de la question", () => {
    resetFavorites();
    const fav = makeFavorite("q1");
    fav.question = "Test détaillé ?";
    fav.correctAnswer = "C";
    fav.explanation = "Explication longue";
    fav.bankColor = "rose";
    useFavorites.getState().toggleFavorite(fav);
    const stored = useFavorites.getState().favorites[0];
    expect(stored.question).toBe("Test détaillé ?");
    expect(stored.correctAnswer).toBe("C");
    expect(stored.explanation).toBe("Explication longue");
    expect(stored.bankColor).toBe("rose");
  });
});

describe("Favorites store - removeFavorite", () => {
  test("removeFavorite supprime une question par son id", () => {
    resetFavorites();
    useFavorites.getState().toggleFavorite(makeFavorite("q1"));
    useFavorites.getState().toggleFavorite(makeFavorite("q2"));
    useFavorites.getState().removeFavorite("q1");
    const list = useFavorites.getState().favorites;
    expect(list.length).toBe(1);
    expect(list[0].id).toBe("q2");
  });

  test("removeFavorite ne fait rien si l'id n'existe pas", () => {
    resetFavorites();
    useFavorites.getState().toggleFavorite(makeFavorite("q1"));
    useFavorites.getState().removeFavorite("non-existent");
    expect(useFavorites.getState().favorites.length).toBe(1);
  });

  test("removeFavorite ne lève pas d'erreur sur liste vide", () => {
    resetFavorites();
    useFavorites.getState().removeFavorite("any");
    expect(useFavorites.getState().favorites.length).toBe(0);
  });
});

describe("Favorites store - clearAll", () => {
  test("clearAll vide toute la liste", () => {
    resetFavorites();
    useFavorites.getState().toggleFavorite(makeFavorite("q1"));
    useFavorites.getState().toggleFavorite(makeFavorite("q2"));
    useFavorites.getState().toggleFavorite(makeFavorite("q3"));
    useFavorites.getState().clearAll();
    expect(useFavorites.getState().favorites.length).toBe(0);
  });

  test("clearAll ne lève pas d'erreur sur liste déjà vide", () => {
    resetFavorites();
    useFavorites.getState().clearAll();
    expect(useFavorites.getState().favorites.length).toBe(0);
  });
});
