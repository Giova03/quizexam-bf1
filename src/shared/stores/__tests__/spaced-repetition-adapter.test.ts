/**
 * spaced-repetition-adapter.test.ts — P4 unification contract.
 *
 * The quiz domain's applySm2 is now the single SM-2 implementation; the
 * store delegates through this adapter. These tests lock the adapter
 * contract: round-trip ISO <-> Date, parity of the SM-2 math, clamping and
 * non-mutation of the input card.
 */

import { describe, it, expect } from "vitest";
import {
  applySm2 as applySm2Domain,
  type SpacedCard as DomainCard,
} from "@/server/domain/quiz/quiz-domain";
import {
  toDomainCard,
  fromDomainCard,
  applySm2WithDomain,
} from "../spaced-repetition-adapter";
import type { SpacedCard } from "../spaced-repetition-store";

function newClientCard(): SpacedCard {
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

describe("spaced-repetition adapter — conversions", () => {
  it("round-trips a client card through the domain shape (Z-string ISO dates)", () => {
    const original = newClientCard();
    const domain = toDomainCard(original);
    const back = fromDomainCard(domain, original.bankId);

    expect(back).toEqual(original);
  });

  it("maps lastReview null <-> null", () => {
    const domain = toDomainCard(newClientCard());
    expect(domain.lastReview).toBeNull();

    const withHistory: SpacedCard = {
      ...newClientCard(),
      lastReview: "2026-01-15T10:30:00.000Z",
    };
    expect(toDomainCard(withHistory).lastReview).toBeInstanceOf(Date);
    expect(fromDomainCard(toDomainCard(withHistory), "b1")).toEqual(withHistory);
  });

  it("preserves bankId through apply (fromDomainCard re-attaches it)", () => {
    const card = { ...newClientCard(), bankId: "physics-3eme" };
    const result = applySm2WithDomain(card, 5);
    expect(result.bankId).toBe("physics-3eme");
    expect(result.questionId).toBe("q1");
  });
});

describe("spaced-repetition adapter — SM-2 parity with the domain", () => {
  it("store-shaped applySm2 and domain applySm2 agree on ease/interval/repetitions", () => {
    // Walk both implementations through the same scenario.
    let client = newClientCard();
    let domain: DomainCard = toDomainCard(client);

    const qualities = [5, 5, 4, 0, 3, 5, 5] as const;
    for (const q of qualities) {
      client = applySm2WithDomain(client, q);
      domain = applySm2Domain(domain, q);
    }

    expect(client.ease).toBeCloseTo(domain.ease, 10);
    expect(client.interval).toBe(domain.interval);
    expect(client.repetitions).toBe(domain.repetitions);
  });

  it("lapse scenario matches the domain (q<3 resets repetitions, interval=1)", () => {
    let client = applySm2WithDomain(newClientCard(), 5);
    client = applySm2WithDomain(client, 5);
    client = applySm2WithDomain(client, 1);

    expect(client.repetitions).toBe(0);
    expect(client.interval).toBe(1);
  });

  it("quality is clamped into [0, 5] (historical store contract)", () => {
    const a = applySm2WithDomain(newClientCard(), 10);
    const b = applySm2WithDomain(newClientCard(), 5);
    expect(a.ease).toBe(b.ease);
    expect(a.interval).toBe(b.interval);

    const c = applySm2WithDomain(newClientCard(), -5);
    const d = applySm2WithDomain(newClientCard(), 0);
    expect(c.ease).toBe(d.ease);
    expect(c.interval).toBe(d.interval);
  });

  it("does not mutate the input card", () => {
    const card = newClientCard();
    const snapshot = { ...card };
    applySm2WithDomain(card, 5);
    expect(card).toEqual(snapshot);
  });

  it("nextReview moves ~interval days into the future (q=5, fresh card)", () => {
    const before = Date.now();
    const result = applySm2WithDomain(newClientCard(), 5);
    const after = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const ms = new Date(result.nextReview).getTime() - before;

    expect(ms).toBeGreaterThanOrEqual(oneDayMs - 1000);
    expect(ms).toBeLessThan(oneDayMs + (after - before) + 1000);
  });
});
