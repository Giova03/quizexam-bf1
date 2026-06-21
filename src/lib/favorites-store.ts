"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

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

interface FavoritesState {
  favorites: FavoriteQuestion[];
  toggleFavorite: (q: FavoriteQuestion) => void;
  removeFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  clearAll: () => void;
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
    { name: "quizexam-favorites" }
  )
);
