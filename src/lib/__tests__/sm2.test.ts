/**
 * Tests unitaires pour src/lib/spaced-repetition-store.ts (algorithme SM-2)
 *
 * Exécutés par `bun run scripts/run-tests.ts`.
 */
import {
  createSm2Card,
  applySm2,
  isDue,
  daysUntilDue,
  type Sm2Card,
} from "../spaced-repetition-store";
import { test, describe, expect } from "./test-framework";

describe("SM-2 - createSm2Card", () => {
  test("createSm2Card initialise avec les valeurs par défaut", () => {
    const c = createSm2Card();
    expect(c.repetitions).toBe(0);
    expect(c.interval).toBe(0);
    expect(c.easeFactor).toBe(2.5);
    expect(c.due).toBeGreaterThan(0);
  });

  test("createSm2Card accepte des valeurs personnalisées", () => {
    const c = createSm2Card({
      repetitions: 3,
      interval: 12,
      easeFactor: 2.8,
      due: 1000,
    });
    expect(c.repetitions).toBe(3);
    expect(c.interval).toBe(12);
    expect(c.easeFactor).toBe(2.8);
    expect(c.due).toBe(1000);
  });

  test("createSm2Card borne easeFactor à 1.3 minimum", () => {
    const c = createSm2Card({ easeFactor: 0.5 });
    expect(c.easeFactor).toBe(1.3);
  });
});

describe("SM-2 - qualité 0 à 2 réinitialise les répétitions", () => {
  test("qualité 0 réinitialise repetitions à 0 et interval à 1", () => {
    const card: Sm2Card = {
      repetitions: 5,
      interval: 30,
      easeFactor: 2.5,
      due: Date.now(),
    };
    const r = applySm2(0, card);
    expect(r.repetitions).toBe(0);
    expect(r.interval).toBe(1);
  });

  test("qualité 1 réinitialise repetitions à 0 et interval à 1", () => {
    const card: Sm2Card = {
      repetitions: 4,
      interval: 20,
      easeFactor: 2.5,
      due: Date.now(),
    };
    const r = applySm2(1, card);
    expect(r.repetitions).toBe(0);
    expect(r.interval).toBe(1);
  });

  test("qualité 2 réinitialise repetitions à 0 et interval à 1", () => {
    const card: Sm2Card = {
      repetitions: 10,
      interval: 100,
      easeFactor: 2.5,
      due: Date.now(),
    };
    const r = applySm2(2, card);
    expect(r.repetitions).toBe(0);
    expect(r.interval).toBe(1);
  });

  test("qualité 0 diminue l'easeFactor", () => {
    const card: Sm2Card = {
      repetitions: 5,
      interval: 30,
      easeFactor: 2.5,
      due: Date.now(),
    };
    const r = applySm2(0, card);
    // EF' = 2.5 + (0.1 - 5 * (0.08 + 5 * 0.02)) = 2.5 + (0.1 - 5 * 0.18) = 2.5 + (0.1 - 0.9) = 2.5 - 0.8 = 1.7
    // (tolérance flottante)
    expect(Math.round(r.easeFactor * 100) / 100).toBe(1.7);
  });
});

describe("SM-2 - qualité 3 à 5 augmente l'intervalle", () => {
  test("qualité 3 augmente repetitions de 0 à 1, interval devient 1", () => {
    const card: Sm2Card = {
      repetitions: 0,
      interval: 0,
      easeFactor: 2.5,
      due: Date.now(),
    };
    const r = applySm2(3, card);
    expect(r.repetitions).toBe(1);
    expect(r.interval).toBe(1);
  });

  test("qualité 4 augmente repetitions à 2, interval devient 6", () => {
    const card: Sm2Card = {
      repetitions: 1,
      interval: 1,
      easeFactor: 2.5,
      due: Date.now(),
    };
    const r = applySm2(4, card);
    expect(r.repetitions).toBe(2);
    expect(r.interval).toBe(6);
  });

  test("qualité 5 augmente repetitions à 3+, interval = round(prev * easeFactor)", () => {
    const card: Sm2Card = {
      repetitions: 2,
      interval: 6,
      easeFactor: 2.5,
      due: Date.now(),
    };
    const r = applySm2(5, card);
    expect(r.repetitions).toBe(3);
    // newEase = 2.5 + 0.1 = 2.6 ; 6 * 2.6 = 15.6 → arrondi à 16
    expect(r.interval).toBe(16);
  });

  test("qualité 5 augmente l'easeFactor", () => {
    const card: Sm2Card = {
      repetitions: 5,
      interval: 30,
      easeFactor: 2.5,
      due: Date.now(),
    };
    const r = applySm2(5, card);
    // EF' = 2.5 + (0.1 - 0 * ...) = 2.6
    expect(r.easeFactor).toBe(2.6);
  });

  test("qualité 4 diminue légèrement l'easeFactor", () => {
    const card: Sm2Card = {
      repetitions: 5,
      interval: 30,
      easeFactor: 2.5,
      due: Date.now(),
    };
    const r = applySm2(4, card);
    // EF' = 2.5 + (0.1 - 1 * (0.08 + 1 * 0.02)) = 2.5 + (0.1 - 0.1) = 2.5
    expect(r.easeFactor).toBe(2.5);
  });
});

describe("SM-2 - easeFactor ne descend jamais sous 1.3", () => {
  test("plusieurs mauvaises réponses consécutives maintiennent easeFactor >= 1.3", () => {
    let card: Sm2Card = createSm2Card({ easeFactor: 2.5 });
    // Simule 10 mauvaises réponses consécutives
    for (let i = 0; i < 10; i++) {
      card = applySm2(0, card);
    }
    expect(card.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  test("easeFactor déjà à 1.3 reste à 1.3 après mauvaise réponse", () => {
    const card: Sm2Card = {
      repetitions: 0,
      interval: 1,
      easeFactor: 1.3,
      due: Date.now(),
    };
    const r = applySm2(0, card);
    expect(r.easeFactor).toBeGreaterThanOrEqual(1.3);
  });
});

describe("SM-2 - bornes et cas limites", () => {
  test("qualité négative est bornée à 0", () => {
    const r = applySm2(-5, { repetitions: 3, interval: 10, easeFactor: 2.5, due: Date.now() });
    expect(r.repetitions).toBe(0);
    expect(r.interval).toBe(1);
  });

  test("qualité > 5 est bornée à 5", () => {
    const r = applySm2(99, { repetitions: 0, interval: 0, easeFactor: 2.5, due: Date.now() });
    expect(r.repetitions).toBe(1);
    expect(r.interval).toBe(1);
    // Comme quality 5, easeFactor doit être 2.6
    expect(r.easeFactor).toBe(2.6);
  });

  test("applySm2 ne mute pas la carte en entrée", () => {
    const original: Sm2Card = {
      repetitions: 2,
      interval: 6,
      easeFactor: 2.5,
      due: 12345,
    };
    const snapshot = JSON.stringify(original);
    applySm2(5, original);
    expect(JSON.stringify(original)).toBe(snapshot);
  });

  test("applySm2 accepte un objet partiel (Sm2Input)", () => {
    const r = applySm2(5, {});
    expect(r.repetitions).toBe(1);
    expect(r.interval).toBe(1);
    expect(r.easeFactor).toBe(2.6);
  });
});

describe("SM-2 - helpers isDue / daysUntilDue", () => {
  test("isDue renvoie true quand la date est passée", () => {
    const past: Sm2Card = {
      repetitions: 0,
      interval: 0,
      easeFactor: 2.5,
      due: Date.now() - 10000,
    };
    expect(isDue(past)).toBeTruthy();
  });

  test("isDue renvoie false quand la date est future", () => {
    const future: Sm2Card = {
      repetitions: 0,
      interval: 0,
      easeFactor: 2.5,
      due: Date.now() + 100000,
    };
    expect(isDue(future)).toBeFalsy();
  });

  test("daysUntilDue renvoie un nombre négatif quand déjà due", () => {
    const past: Sm2Card = {
      repetitions: 0,
      interval: 0,
      easeFactor: 2.5,
      due: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 jours dans le passé
    };
    const d = daysUntilDue(past);
    expect(d).toBeLessThanOrEqual(-1);
  });

  test("daysUntilDue renvoie un nombre positif quand futur", () => {
    const future: Sm2Card = {
      repetitions: 0,
      interval: 0,
      easeFactor: 2.5,
      due: Date.now() + 3 * 24 * 60 * 60 * 1000, // 3 jours dans le futur
    };
    const d = daysUntilDue(future);
    expect(d).toBeGreaterThanOrEqual(2);
  });
});
