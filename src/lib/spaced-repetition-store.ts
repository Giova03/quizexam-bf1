"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * SpacedCard — a single question tracked by the SM-2 spaced-repetition
 * algorithm. State is persisted in localStorage so reviews survive reloads.
 */
export interface SpacedCard {
  /** The Question ID this card tracks. */
  questionId: string;
  /** The bank the question belongs to (for grouping/filtering). */
  bankId: string;
  /** Easiness factor (>= 1.3). Higher = card is "easier" and grows faster. */
  ease: number;
  /** Current interval in days before the next review. */
  interval: number;
  /** Number of consecutive successful reviews. */
  repetitions: number;
  /** ISO date string — when the card should next be reviewed. */
  nextReview: string;
  /** ISO date string of the last review, or null if never reviewed. */
  lastReview: string | null;
}

interface SpacedRepetitionState {
  cards: Record<string, SpacedCard>;

  addCard: (questionId: string, bankId: string) => void;
  reviewCard: (questionId: string, quality: number) => void;
  removeCard: (questionId: string) => void;
  getDueCards: () => SpacedCard[];
  getCard: (questionId: string) => SpacedCard | undefined;
  getStats: () => {
    totalCards: number;
    dueToday: number;
    reviewedToday: number;
    averageEase: number;
  };
  clearAll: () => void;
}

/** Default values for a brand new card. */
function makeNewCard(questionId: string, bankId: string): SpacedCard {
  return {
    questionId,
    bankId,
    ease: 2.5,
    interval: 1,
    repetitions: 0,
    nextReview: new Date().toISOString(),
    lastReview: null,
  };
}

/** Return an ISO timestamp for "now". */
function nowIso(): string {
  return new Date().toISOString();
}

/** Return YYYY-MM-DD for an ISO date (used for "today" comparison). */
function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * Apply the SM-2 algorithm to a card given a quality rating (0-5).
 *
 *  - quality 0-2 (incorrect / forgotten): reset repetitions to 0, interval = 1
 *  - quality 3-5 (correct):
 *      repetitions == 0  → interval = 1
 *      repetitions == 1  → interval = 6
 *      repetitions >= 2  → interval = round(interval * ease)
 *  - ease = max(1.3, ease + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
 *
 * Returns the updated card.
 */
export function applySm2(card: SpacedCard, quality: number): SpacedCard {
  // Clamp quality into [0, 5].
  const q = Math.max(0, Math.min(5, quality));

  let ease = card.ease;
  let interval = card.interval;
  let repetitions = card.repetitions;

  if (q < 3) {
    // Lapse — forget the card.
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * ease);
    }
    repetitions += 1;
  }

  // Update ease (only the formula — guard against going below 1.3).
  ease = ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (ease < 1.3) ease = 1.3;

  const next = new Date();
  next.setDate(next.getDate() + interval);

  return {
    ...card,
    ease,
    interval,
    repetitions,
    nextReview: next.toISOString(),
    lastReview: nowIso(),
  };
}

export const useSpacedRepetition = create<SpacedRepetitionState>()(
  persist(
    (set, get) => ({
      cards: {},

      addCard: (questionId, bankId) => {
        const existing = get().cards[questionId];
        if (existing) return; // already tracked — keep prior history
        set({
          cards: {
            ...get().cards,
            [questionId]: makeNewCard(questionId, bankId),
          },
        });
      },

      reviewCard: (questionId, quality) => {
        const card = get().cards[questionId];
        if (!card) return;
        const updated = applySm2(card, quality);
        set({
          cards: { ...get().cards, [questionId]: updated },
        });
      },

      removeCard: (questionId) => {
        const next = { ...get().cards };
        delete next[questionId];
        set({ cards: next });
      },

      getDueCards: () => {
        const now = nowIso();
        return Object.values(get().cards)
          .filter((c) => c.nextReview <= now)
          .sort((a, b) => a.nextReview.localeCompare(b.nextReview));
      },

      getCard: (questionId) => get().cards[questionId],

      getStats: () => {
        const all = Object.values(get().cards);
        const today = dayKey(nowIso());
        const dueToday = all.filter((c) => c.nextReview <= nowIso()).length;
        const reviewedToday = all.filter(
          (c) => c.lastReview && dayKey(c.lastReview) === today
        ).length;
        const averageEase =
          all.length === 0
            ? 0
            : all.reduce((sum, c) => sum + c.ease, 0) / all.length;
        return {
          totalCards: all.length,
          dueToday,
          reviewedToday,
          averageEase: Math.round(averageEase * 100) / 100,
        };
      },

      clearAll: () => set({ cards: {} }),
    }),
    { name: "quizexam-spaced-repetition" }
  )
);
