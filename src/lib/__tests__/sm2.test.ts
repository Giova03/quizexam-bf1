/**
 * Tests unitaires pour src/lib/spaced-repetition-store.ts (algorithme SM-2)
 *
 * Exécutés par `bun run scripts/run-tests.ts`.
 */
import { applySm2, type SpacedCard } from "../spaced-repetition-store";
import { test, describe, expect } from "./test-framework";

// Helper: build a SpacedCard with sensible defaults so each test only sets
// the fields it cares about.
function makeCard(overrides: Partial<SpacedCard> = {}): SpacedCard {
  return {
    questionId: "q-test",
    bankId: "bank-test",
    ease: 2.5,
    interval: 0,
    repetitions: 0,
    nextReview: new Date().toISOString(),
    lastReview: null,
    ...overrides,
  };
}

describe("SM-2 - qualité 0 à 2 réinitialise les répétitions", () => {
  test("qualité 0 réinitialise repetitions à 0 et interval à 1", () => {
    const card = makeCard({ repetitions: 5, interval: 30, ease: 2.5 });
    const r = applySm2(card, 0);
    expect(r.repetitions).toBe(0);
    expect(r.interval).toBe(1);
  });

  test("qualité 1 réinitialise repetitions à 0 et interval à 1", () => {
    const card = makeCard({ repetitions: 4, interval: 20, ease: 2.5 });
    const r = applySm2(card, 1);
    expect(r.repetitions).toBe(0);
    expect(r.interval).toBe(1);
  });

  test("qualité 2 réinitialise repetitions à 0 et interval à 1", () => {
    const card = makeCard({ repetitions: 10, interval: 100, ease: 2.5 });
    const r = applySm2(card, 2);
    expect(r.repetitions).toBe(0);
    expect(r.interval).toBe(1);
  });

  test("qualité 0 diminue l'ease", () => {
    const card = makeCard({ repetitions: 5, interval: 30, ease: 2.5 });
    const r = applySm2(card, 0);
    // EF' = 2.5 + (0.1 - 5 * (0.08 + 5 * 0.02)) = 2.5 + (0.1 - 5 * 0.18) = 2.5 + (0.1 - 0.9) = 2.5 - 0.8 = 1.7
    expect(Math.round(r.ease * 100) / 100).toBe(1.7);
  });
});

describe("SM-2 - qualité 3 à 5 augmente l'intervalle", () => {
  test("qualité 3 augmente repetitions de 0 à 1, interval devient 1", () => {
    const card = makeCard({ repetitions: 0, interval: 0, ease: 2.5 });
    const r = applySm2(card, 3);
    expect(r.repetitions).toBe(1);
    expect(r.interval).toBe(1);
  });

  test("qualité 4 augmente repetitions à 2, interval devient 6", () => {
    const card = makeCard({ repetitions: 1, interval: 1, ease: 2.5 });
    const r = applySm2(card, 4);
    expect(r.repetitions).toBe(2);
    expect(r.interval).toBe(6);
  });

  test("qualité 5 augmente repetitions à 3+, interval = round(prev * ease)", () => {
    const card = makeCard({ repetitions: 2, interval: 6, ease: 2.5 });
    const r = applySm2(card, 5);
    expect(r.repetitions).toBe(3);
    // newEase = 2.5 + 0.1 = 2.6 ; 6 * 2.6 = 15.6 → arrondi à 16
    expect(r.interval).toBe(16);
  });

  test("qualité 5 augmente l'ease", () => {
    const card = makeCard({ repetitions: 5, interval: 30, ease: 2.5 });
    const r = applySm2(card, 5);
    // EF' = 2.5 + 0.1 = 2.6
    expect(r.ease).toBe(2.6);
  });

  test("qualité 4 maintient l'ease à 2.5", () => {
    const card = makeCard({ repetitions: 5, interval: 30, ease: 2.5 });
    const r = applySm2(card, 4);
    // EF' = 2.5 + (0.1 - 1 * (0.08 + 1 * 0.02)) = 2.5 + (0.1 - 0.1) = 2.5
    expect(r.ease).toBe(2.5);
  });
});

describe("SM-2 - ease ne descend jamais sous 1.3", () => {
  test("plusieurs mauvaises réponses consécutives maintiennent ease >= 1.3", () => {
    let card = makeCard({ ease: 2.5 });
    // Simule 10 mauvaises réponses consécutives
    for (let i = 0; i < 10; i++) {
      card = applySm2(card, 0);
    }
    expect(card.ease).toBeGreaterThanOrEqual(1.3);
  });

  test("ease déjà à 1.3 reste à 1.3 après mauvaise réponse", () => {
    const card = makeCard({ repetitions: 0, interval: 1, ease: 1.3 });
    const r = applySm2(card, 0);
    expect(r.ease).toBeGreaterThanOrEqual(1.3);
  });
});

describe("SM-2 - bornes et cas limites", () => {
  test("qualité négative est bornée à 0", () => {
    const r = applySm2(makeCard({ repetitions: 3, interval: 10, ease: 2.5 }), -5);
    expect(r.repetitions).toBe(0);
    expect(r.interval).toBe(1);
  });

  test("qualité > 5 est bornée à 5", () => {
    const r = applySm2(makeCard({ repetitions: 0, interval: 0, ease: 2.5 }), 99);
    expect(r.repetitions).toBe(1);
    expect(r.interval).toBe(1);
    // Comme quality 5, ease doit être 2.6
    expect(r.ease).toBe(2.6);
  });

  test("applySm2 ne mute pas la carte en entrée", () => {
    const original = makeCard({ repetitions: 2, interval: 6, ease: 2.5 });
    const snapshot = JSON.stringify(original);
    applySm2(original, 5);
    expect(JSON.stringify(original)).toBe(snapshot);
  });

  test("applySm2 met à jour lastReview et nextReview", () => {
    const card = makeCard({ repetitions: 0, interval: 0, ease: 2.5, lastReview: null });
    const r = applySm2(card, 5);
    expect(r.lastReview === null).toBeFalsy();
    expect(r.nextReview === null).toBeFalsy();
    // nextReview doit être dans le futur (interval = 1 jour)
    expect(new Date(r.nextReview).getTime()).toBeGreaterThan(Date.now() - 1000);
  });
});
