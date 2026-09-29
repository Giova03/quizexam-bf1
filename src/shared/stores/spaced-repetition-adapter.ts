/**
 * SM-2 Adapter (P4) — single source of truth for the spaced-repetition math.
 *
 * History: two algorithmically-identical SM-2 implementations coexisted —
 * the client store (ISO strings, localStorage) and the QUIZ DOMAIN (Dates,
 * pure). This adapter makes the DOMAIN the reference and keeps the store's
 * public shape (ISO-string `SpacedCard`, with `bankId`) untouched, so the
 * client view, the /api/spaced-repetition route and existing tests keep
 * working without changes.
 *
 * The domain arithmetic is branch-safe for fractional qualities (only
 * comparisons and arithmetic), so the store's historical clamp-only
 * behavior (no rounding) is preserved here.
 */

import {
  applySm2 as applySm2Domain,
  type SpacedCard as DomainCard,
  type ReviewQuality,
} from "@/server/domain/quiz/quiz-domain";
import type { SpacedCard } from "./spaced-repetition-store";

/** Client card (ISO strings + bankId) → domain card (Date objects). */
export function toDomainCard(card: SpacedCard): DomainCard {
  return {
    questionId: card.questionId,
    ease: card.ease,
    interval: card.interval,
    repetitions: card.repetitions,
    nextReview: new Date(card.nextReview),
    lastReview: card.lastReview ? new Date(card.lastReview) : null,
  };
}

/** Domain card (Date objects) → client card (ISO strings + bankId). */
export function fromDomainCard(card: DomainCard, bankId: string): SpacedCard {
  return {
    questionId: card.questionId,
    bankId,
    ease: card.ease,
    interval: card.interval,
    repetitions: card.repetitions,
    nextReview: card.nextReview.toISOString(),
    lastReview: card.lastReview ? card.lastReview.toISOString() : null,
  };
}

/**
 * Apply SM-2 on the client-shaped card by delegating to the QUIZ DOMAIN.
 * Clamps quality into [0, 5] (historical store contract) before the call.
 */
export function applySm2WithDomain(card: SpacedCard, quality: number): SpacedCard {
  const clamped = Math.max(0, Math.min(5, quality)) as ReviewQuality;
  return fromDomainCard(applySm2Domain(toDomainCard(card), clamped), card.bankId);
}
