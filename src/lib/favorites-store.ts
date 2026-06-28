"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface FavoriteQuestion {
  id: string;
  question: string;
  correctAnswer: string;
  explanation: string;
  bankId: string;
  bankTitle: string;
  bankColor: string;
  savedAt: string;
}

interface FavoritesState {
  favorites: FavoriteQuestion[];
  toggleFavorite: (q: FavoriteQuestion) => void;
  removeFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  clearAll: () => void;
}

/**
 * Storage compatible SSR :
 * - Navigateur : renvoie un storage basé sur `localStorage`.
 * - Node/SSR/tests : renvoie un storage no-op (silencieux) pour éviter
 *   les warnings du middleware persist lorsque `storage` est falsy.
 *
 * NB : passer `storage: false` déclenche un warning à chaque setState
 * dans zustand v5, d'où l'usage d'un no-op storage.
 */
function safeStorage(): ReturnType<typeof createJSONStorage> | {
  getItem: () => null;
  setItem: () => void;
  removeItem: () => void;
} {
  // No-op storage pour environnements sans localStorage
  const noopStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };
  if (typeof window === "undefined") return noopStorage;
  try {
    const test = "__qe_test__";
    window.localStorage.setItem(test, "1");
    window.localStorage.removeItem(test);
    return createJSONStorage(() => window.localStorage);
  } catch {
    return noopStorage;
  }
}

export const useFavorites = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],
      toggleFavorite: (q) => {
        const exists = get().favorites.some((f) => f.id === q.id);
        if (exists) {
          set({ favorites: get().favorites.filter((f) => f.id !== q.id) });
        } else {
          set({ favorites: [q, ...get().favorites] });
        }
      },
      removeFavorite: (id) =>
        set({ favorites: get().favorites.filter((f) => f.id !== id) }),
      isFavorite: (id) => get().favorites.some((f) => f.id === id),
      clearAll: () => set({ favorites: [] }),
    }),
    {
      name: "quizexam-favorites",
      storage: safeStorage(),
    }
  )
);
