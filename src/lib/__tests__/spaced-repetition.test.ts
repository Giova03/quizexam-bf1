/**
 * spaced-repetition.test.ts — unit tests for the SM-2 spaced-repetition
 * algorithm exposed by `applySm2` in `../spaced-repetition-store`.
 *
 * Uses a tiny assert-based test framework (no Jest / Vitest dependency).
 * Runnable via `bun run scripts/run-tests.ts`.
 */

import { applySm2, type SpacedCard } from "../spaced-repetition-store";

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
    toBeLessThan(n: number) {
      if (!(typeof actual === "number" && actual < n)) {
        throw new Error(`expected ${actual} to be less than ${n}`);
      }
    },
    toBeGreaterThanOrEqual(n: number) {
      if (!(typeof actual === "number" && actual >= n)) {
        throw new Error(`expected ${actual} to be >= ${n}`);
      }
    },
  };
}

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

// --- Tests -------------------------------------------------------------------

test("quality 5 on a fresh card sets interval=1 and repetitions=1", () => {
  const result = applySm2(newCard(), 5);
  expect(result.interval).toBe(1);
  expect(result.repetitions).toBe(1);
  expect(result.ease).toBe(2.6);
  expect(result.lastReview).toBeTruthy();
});

test("quality 4 on a fresh card sets interval=1 and repetitions=1", () => {
  const result = applySm2(newCard(), 4);
  expect(result.interval).toBe(1);
  expect(result.repetitions).toBe(1);
  // ease: 2.5 + (0.1 - 1*(0.08 + 1*0.02)) = 2.5 + (0.1 - 0.1) = 2.5
  expect(result.ease).toBe(2.5);
});

test("quality 3 on a fresh card still increments repetitions", () => {
  // SM-2 treats q >= 3 as a successful review.
  const result = applySm2(newCard(), 3);
  expect(result.repetitions).toBe(1);
  expect(result.interval).toBe(1);
});

test("quality 5 on reps=1 sets interval=6 (SM-2 second-step rule)", () => {
  let card = applySm2(newCard(), 5); // reps=1, interval=1, ease=2.6
  card = applySm2(card, 5); // reps=2, interval=6, ease=2.7
  expect(card.repetitions).toBe(2);
  expect(card.interval).toBe(6);
  expect(card.ease).toBe(2.7);
});

test("quality 5 on reps>=2 multiplies interval by ease", () => {
  // After two perfect reviews: reps=2, interval=6, ease=2.7
  let card = applySm2(newCard(), 5);
  card = applySm2(card, 5);
  // Third review: interval = round(6 * 2.7) = round(16.2) = 16
  card = applySm2(card, 5);
  expect(card.repetitions).toBe(3);
  expect(card.interval).toBe(16);
});

test("quality 0 (blackout) resets repetitions to 0 and interval to 1", () => {
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

test("quality 2 (incorrect) resets repetitions to 0 and interval to 1", () => {
  let card = applySm2(newCard(), 5);
  card = applySm2(card, 5);
  const result = applySm2(card, 2);
  expect(result.repetitions).toBe(0);
  expect(result.interval).toBe(1);
});

test("quality 1 (wrong but familiar) resets repetitions to 0 and interval to 1", () => {
  let card = applySm2(newCard(), 5);
  const result = applySm2(card, 1);
  expect(result.repetitions).toBe(0);
  expect(result.interval).toBe(1);
});

test("quality 3-5 always increases the interval compared to a reset card", () => {
  // After a reset (reps=0, interval=1), a quality>=3 should give interval >=1
  // (which it does) AND increment repetitions.
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

test("quality 0-2 always produces repetitions=0 and interval=1", () => {
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

test("ease never drops below 1.3 (SM-2 floor)", () => {
  // Repeated quality=0 lapses should drive ease down — but never below 1.3.
  let card = newCard();
  for (let i = 0; i < 20; i += 1) {
    card = applySm2(card, 0);
  }
  expect(card.ease).toBeGreaterThanOrEqual(1.3);
  expect(card.ease).toBeLessThan(1.31); // exactly 1.3 after enough lapses
});

test("quality above 5 is clamped to 5", () => {
  // q=10 should behave the same as q=5.
  const a = applySm2(newCard(), 10);
  const b = applySm2(newCard(), 5);
  expect(a.repetitions).toBe(b.repetitions);
  expect(a.interval).toBe(b.interval);
  expect(a.ease).toBe(b.ease);
});

test("quality below 0 is clamped to 0", () => {
  // q=-5 should behave the same as q=0.
  const a = applySm2(newCard(), -5);
  const b = applySm2(newCard(), 0);
  expect(a.repetitions).toBe(b.repetitions);
  expect(a.interval).toBe(b.interval);
  expect(a.ease).toBe(b.ease);
});

test("applySm2 does not mutate the input card", () => {
  const card = newCard();
  const snapshot = { ...card };
  applySm2(card, 5);
  expect(card.ease).toBe(snapshot.ease);
  expect(card.interval).toBe(snapshot.interval);
  expect(card.repetitions).toBe(snapshot.repetitions);
});

test("nextReview is advanced by the new interval (in days)", () => {
  const card = newCard();
  const before = new Date();
  const result = applySm2(card, 5);
  const after = new Date();
  // nextReview should be ~interval days in the future (interval=1 day for q=5 on fresh card).
  const ms = new Date(result.nextReview).getTime() - before.getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;
  // Allow a small slack for test execution time.
  expect(ms).toBeGreaterThanOrEqual(oneDayMs - 1000);
  expect(ms).toBeLessThan(oneDayMs + (after.getTime() - before.getTime()) + 1000);
});

// --- Summary -----------------------------------------------------------------
console.log(`\n  spaced-repetition.test.ts: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exitCode = 1;
}
