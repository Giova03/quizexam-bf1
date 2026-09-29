/**
 * spaced-repetition.test.ts — SM-2 algorithm tests (store-side contract).
 *
 * Converted to vitest in P3 (was: dependency-free assert harness run by
 * scripts/run-tests.ts, now removed). Tests the `applySm2` exported by the
 * shared spaced-repetition store (ISO-string card shape, used by the client
 * and by /api/spaced-repetition).
 */

import { describe, it, expect } from "vitest";
import { applySm2, type SpacedCard } from "../spaced-repetition-store";

/** Build a fresh card with the default SM-2 starting state. */
function newCard(): SpacedCard {
  return {
    questionId: "q1",
    bankId: "b1",
    ease: 2.5,
    interval: 1,
    repetitions: 0,
    nextReview: new Date().toISOString(),
    lastReview: null,
  };
}

describe("applySm2 — successful reviews (q >= 3)", () => {
  it("quality 5 on a fresh card sets interval=1 and repetitions=1", () => {
    const result = applySm2(newCard(), 5);
    expect(result.interval).toBe(1);
    expect(result.repetitions).toBe(1);
    expect(result.ease).toBe(2.6);
    expect(result.lastReview).toBeTruthy();
  });

  it("quality 4 on a fresh card sets interval=1 and repetitions=1", () => {
    const result = applySm2(newCard(), 4);
    expect(result.interval).toBe(1);
    expect(result.repetitions).toBe(1);
    // ease: 2.5 + (0.1 - 1*(0.08 + 1*0.02)) = 2.5 + (0.1 - 0.1) = 2.5
    expect(result.ease).toBe(2.5);
  });

  it("quality 3 on a fresh card still increments repetitions", () => {
    // SM-2 treats q >= 3 as a successful review.
    const result = applySm2(newCard(), 3);
    expect(result.repetitions).toBe(1);
    expect(result.interval).toBe(1);
  });

  it("quality 5 on reps=1 sets interval=6 (SM-2 second-step rule)", () => {
    let card = applySm2(newCard(), 5); // reps=1, interval=1, ease=2.6
    card = applySm2(card, 5); // reps=2, interval=6, ease=2.7
    expect(card.repetitions).toBe(2);
    expect(card.interval).toBe(6);
    expect(card.ease).toBe(2.7);
  });

  it("quality 5 on reps>=2 multiplies interval by ease", () => {
    // After two perfect reviews: reps=2, interval=6, ease=2.7
    let card = applySm2(newCard(), 5);
    card = applySm2(card, 5);
    // Third review: interval = round(6 * 2.7) = round(16.2) = 16
    card = applySm2(card, 5);
    expect(card.repetitions).toBe(3);
    expect(card.interval).toBe(16);
  });
});

describe("applySm2 — lapses (q < 3)", () => {
  it("quality 0 (blackout) resets repetitions to 0 and interval to 1", () => {
    // Build up some history first.
    let card = applySm2(newCard(), 5);
    card = applySm2(card, 5);
    expect(card.repetitions).toBe(2);
    expect(card.interval).toBe(6);

    // Lapse.
    const result = applySm2(card, 0);
    expect(result.repetitions).toBe(0);
    expect(result.interval).toBe(1);
  });

  it("quality 2 (incorrect) resets repetitions to 0 and interval to 1", () => {
    let card = applySm2(newCard(), 5);
    card = applySm2(card, 5);
    const result = applySm2(card, 2);
    expect(result.repetitions).toBe(0);
    expect(result.interval).toBe(1);
  });

  it("quality 1 (wrong but familiar) resets repetitions to 0 and interval to 1", () => {
    let card = applySm2(newCard(), 5);
    const result = applySm2(card, 1);
    expect(result.repetitions).toBe(0);
    expect(result.interval).toBe(1);
  });

  it("quality 0-2 always produces repetitions=0 and interval=1", () => {
    // Try from several starting states.
    const states: SpacedCard[] = [
      { ...newCard() },
      { ...newCard(), repetitions: 1, interval: 1, ease: 2.6 },
      { ...newCard(), repetitions: 5, interval: 30, ease: 2.8 },
    ];
    for (const state of states) {
      for (const q of [0, 1, 2]) {
        const result = applySm2(state, q);
        expect(result.repetitions).toBe(0);
        expect(result.interval).toBe(1);
      }
    }
  });
});

describe("applySm2 — invariants", () => {
  it("quality 3-5 always increments repetitions from a reset card", () => {
    const resetCard: SpacedCard = {
      ...newCard(),
      repetitions: 0,
      interval: 1,
      ease: 2.5,
    };
    for (const q of [3, 4, 5]) {
      const result = applySm2(resetCard, q);
      expect(result.repetitions).toBe(1);
      expect(result.interval).toBeGreaterThanOrEqual(1);
    }
  });

  it("ease never drops below 1.3 (SM-2 floor)", () => {
    // Repeated quality=0 lapses should drive ease down — but never below 1.3.
    let card = newCard();
    for (let i = 0; i < 20; i += 1) {
      card = applySm2(card, 0);
    }
    expect(card.ease).toBeGreaterThanOrEqual(1.3);
    expect(card.ease).toBeLessThan(1.31); // exactly 1.3 after enough lapses
  });

  it("quality above 5 is clamped to 5", () => {
    // q=10 should behave the same as q=5.
    const a = applySm2(newCard(), 10);
    const b = applySm2(newCard(), 5);
    expect(a.repetitions).toBe(b.repetitions);
    expect(a.interval).toBe(b.interval);
    expect(a.ease).toBe(b.ease);
  });

  it("quality below 0 is clamped to 0", () => {
    // q=-5 should behave the same as q=0.
    const a = applySm2(newCard(), -5);
    const b = applySm2(newCard(), 0);
    expect(a.repetitions).toBe(b.repetitions);
    expect(a.interval).toBe(b.interval);
    expect(a.ease).toBe(b.ease);
  });

  it("applySm2 does not mutate the input card", () => {
    const card = newCard();
    const snapshot = { ...card };
    applySm2(card, 5);
    expect(card.ease).toBe(snapshot.ease);
    expect(card.interval).toBe(snapshot.interval);
    expect(card.repetitions).toBe(snapshot.repetitions);
  });

  it("nextReview is advanced by the new interval (in days)", () => {
    const card = newCard();
    const before = new Date();
    const result = applySm2(card, 5);
    const after = new Date();
    // nextReview should be ~interval days in the future (q=5 on fresh card → 1 day).
    const ms = new Date(result.nextReview).getTime() - before.getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    // Allow a small slack for test execution time.
    expect(ms).toBeGreaterThanOrEqual(oneDayMs - 1000);
    expect(ms).toBeLessThan(
      oneDayMs + (after.getTime() - before.getTime()) + 1000
    );
  });
});
