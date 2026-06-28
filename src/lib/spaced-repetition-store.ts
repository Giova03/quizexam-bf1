"use client";

import { create } from "zustand";
<<<<<<< Updated upstream
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
=======
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * Implémentation de l'algorithme SM-2 (SuperMemo 2) pour la répétition espacée.
 *
 * Référence : https://www.supermemo.com/en/blog/application-of-a-computer-to-improve-the-results-obtained-in-working-with-the-supermemo-method
 *
 * - `quality` est la qualité de la réponse, de 0 à 5 :
 *    0 = oubli total
 *    1 = mauvaise réponse, mais elle semblait familière
 *    2 = mauvaise réponse, mais la bonne semblait facile à deviner
 *    3 = bonne réponse mais demandant un effort important
 *    4 = bonne réponse avec quelques hésitations
 *    5 = réponse parfaite
 * - Si quality < 3, on réinitialise les répétitions et l'intervalle à 1.
 * - Sinon, l'intervalle grandit : 1, 6, puis n * easeFactor (n = répétitions).
 * - Le facteur de facilité (easeFactor) ne descend jamais sous 1.3.
 */

export interface Sm2Card {
  /** Nombre de répétitions réussies consécutives. */
  repetitions: number;
  /** Intervalle actuel en jours. */
  interval: number;
  /** Facteur de facilité (≥ 1.3). */
  easeFactor: number;
  /** Date du prochain examen (timestamp epoch ms). */
  due: number;
}

export interface Sm2Input {
  repetitions?: number;
  interval?: number;
  easeFactor?: number;
  due?: number;
}

/** Crée une nouvelle carte SM-2 avec les valeurs par défaut. */
export function createSm2Card(input: Sm2Input = {}): Sm2Card {
  const now = Date.now();
  return {
    repetitions: input.repetitions ?? 0,
    interval: input.interval ?? 0,
    easeFactor: clampEase(input.easeFactor ?? 2.5),
    due: input.due ?? now,
  };
}

function clampEase(value: number): number {
  return Math.max(1.3, Number(value) || 2.5);
}

/**
 * Applique l'algorithme SM-2 à une carte en fonction de la qualité de réponse.
 * Renvoie une NOUVELLE carte (ne mute pas l'entrée).
 */
export function applySm2(quality: number, card: Sm2Card | Sm2Input): Sm2Card {
  // borne quality sur [0, 5]
  const q = Math.max(0, Math.min(5, Math.floor(quality)));

  const current: Sm2Card = {
    repetitions: card.repetitions ?? 0,
    interval: card.interval ?? 0,
    easeFactor: clampEase(card.easeFactor ?? 2.5),
    due: card.due ?? Date.now(),
  };

  // Mise à jour du facteur de facilité
  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  const newEaseRaw =
    current.easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  const newEase = clampEase(newEaseRaw);

  let newRepetitions: number;
  let newInterval: number;

  if (q < 3) {
    // Réponse incorrecte : on réinitialise
    newRepetitions = 0;
    newInterval = 1;
  } else {
    // Réponse correcte : on augmente l'intervalle
    newRepetitions = current.repetitions + 1;
    if (newRepetitions === 1) {
      newInterval = 1;
    } else if (newRepetitions === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.round(current.interval * newEase);
    }
  }

  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;
  const newDue = now + newInterval * DAY_MS;

  return {
    repetitions: newRepetitions,
    interval: newInterval,
    easeFactor: newEase,
    due: newDue,
  };
}

/**
 * Indique si une carte est due (la date d'échéance est passée ou égale à maintenant).
 */
export function isDue(card: Sm2Card, now: number = Date.now()): boolean {
  return now >= card.due;
}

/**
 * Renvoie le nombre de jours restants avant l'échéance (négatif si déjà due).
 */
export function daysUntilDue(card: Sm2Card, now: number = Date.now()): number {
  const DAY_MS = 24 * 60 * 60 * 1000;
  return Math.round((card.due - now) / DAY_MS);
}

// ============================================================
// Zustand store (persisté dans localStorage) pour la révision
// espacée côté client.
// ============================================================

/**
 * Carte de révision associée à une question de la plateforme.
 * Utilise les champs nommés dans le cahier des charges (ease, interval,
 * repetitions, nextReview, lastReview) tout en s'appuyant sur l'algorithme
 * SM-2 exposé plus haut.
 */
export interface SpacedCard {
  /** Identifiant de la question en base (Prisma). */
  questionId: string;
  /** Banque d'origine (utile pour le filtrage côté API). */
  bankId: string;
  /** Facteur de facilité (≥ 1.3, défaut 2.5). */
  ease: number;
  /** Intervalle actuel en jours (défaut 1). */
  interval: number;
  /** Nombre de répétitions réussies consécutives. */
  repetitions: number;
  /** Timestamp epoch ms du prochain examen. */
  nextReview: number;
  /** Timestamp epoch ms du dernier examen. */
  lastReview: number;
}

interface SpacedRepetitionState {
  cards: Record<string, SpacedCard>; // key = questionId
  addCard: (questionId: string, bankId: string) => void;
  removeCard: (questionId: string) => void;
  reviewCard: (questionId: string, quality: number) => SpacedCard | null;
  getDueCards: (now?: number) => SpacedCard[];
  getCard: (questionId: string) => SpacedCard | undefined;
  clearAll: () => void;
}

function safeStorage(): ReturnType<typeof createJSONStorage> | {
  getItem: () => null;
  setItem: () => void;
  removeItem: () => void;
} {
  const noopStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };
  if (typeof window === "undefined") return noopStorage;
  try {
    const test = "__qe_sr_test__";
    window.localStorage.setItem(test, "1");
    window.localStorage.removeItem(test);
    return createJSONStorage(() => window.localStorage);
  } catch {
    return noopStorage;
  }
}

function defaultCard(questionId: string, bankId: string): SpacedCard {
  const now = Date.now();
>>>>>>> Stashed changes
  return {
    questionId,
    bankId,
    ease: 2.5,
    interval: 1,
    repetitions: 0,
<<<<<<< Updated upstream
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
=======
    nextReview: now, // due immediately on first add
    lastReview: 0,
>>>>>>> Stashed changes
  };
}

export const useSpacedRepetition = create<SpacedRepetitionState>()(
  persist(
    (set, get) => ({
      cards: {},

      addCard: (questionId, bankId) => {
<<<<<<< Updated upstream
        const existing = get().cards[questionId];
        if (existing) return; // already tracked — keep prior history
        set({
          cards: {
            ...get().cards,
            [questionId]: makeNewCard(questionId, bankId),
          },
=======
        if (get().cards[questionId]) return; // déjà présente
        set((state) => ({
          cards: {
            ...state.cards,
            [questionId]: defaultCard(questionId, bankId),
          },
        }));
      },

      removeCard: (questionId) => {
        set((state) => {
          const next = { ...state.cards };
          delete next[questionId];
          return { cards: next };
>>>>>>> Stashed changes
        });
      },

      reviewCard: (questionId, quality) => {
<<<<<<< Updated upstream
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
=======
        const existing = get().cards[questionId];
        if (!existing) return null;

        // Adapte SpacedCard → Sm2Input pour réutiliser applySm2
        const updated = applySm2(quality, {
          repetitions: existing.repetitions,
          interval: existing.interval,
          easeFactor: existing.ease,
          due: existing.nextReview,
        });

        const nextCard: SpacedCard = {
          questionId,
          bankId: existing.bankId,
          ease: updated.easeFactor,
          interval: updated.interval,
          repetitions: updated.repetitions,
          nextReview: updated.due,
          lastReview: Date.now(),
        };

        set((state) => ({
          cards: { ...state.cards, [questionId]: nextCard },
        }));

        return nextCard;
      },

      getDueCards: (now = Date.now()) => {
        return Object.values(get().cards)
          .filter((c) => c.nextReview <= now)
          .sort((a, b) => a.nextReview - b.nextReview);
>>>>>>> Stashed changes
      },

      getCard: (questionId) => get().cards[questionId],

<<<<<<< Updated upstream
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
=======
      clearAll: () => set({ cards: {} }),
    }),
    {
      name: "quizexam-spaced-repetition",
      storage: safeStorage(),
    }
>>>>>>> Stashed changes
  )
);
