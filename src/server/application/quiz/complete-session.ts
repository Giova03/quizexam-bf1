/**
 * Complete Session Use Case — application layer.
 *
 * Finalizes a quiz session:
 * 1. Ownership enforcement via the shared RBAC (owner or admin-level).
 * 2. Anti-double-completion guard (P0 rule).
 * 3. Final score computed by the QUIZ DOMAIN (calculateScore) instead of an
 *    inline filter — single source of truth for scoring rules.
 * 4. Returns the updated session (unchanged client contract, answers ordered
 *    by id asc — note: intentionally WITHOUT durationMin, exactly like the
 *    legacy route).
 */

import {
  calculateScore,
  canTransition,
  deriveSessionStatus,
  type Answer,
} from "@/server/domain/quiz/quiz-domain";
import { PermissionError, requireOwnershipOrAdmin } from "@/shared/security/rbac";
import {
  finalizeSession,
  findSessionWithAnswers,
  type SessionWithAnswers,
} from "@/server/infrastructure/repositories/quiz-session-repository";
import type { Actor } from "./get-session";

export type CompleteSessionResult =
  | { kind: "ok"; session: SessionWithAnswers }
  | { kind: "not_found" }
  | { kind: "already_completed" };

/**
 * @throws PermissionError when the actor is neither the owner nor admin-level.
 */
export async function completeSession(
  sessionId: string,
  actor: Actor,
): Promise<CompleteSessionResult> {
  const session = await findSessionWithAnswers(sessionId);
  if (!session) return { kind: "not_found" };

  // P0 rule, now enforced through the shared RBAC helper.
  requireOwnershipOrAdmin(session.userId, actor.id, actor.role);

  // P0 rule: prevent double-completion — now expressed through the QUIZ
  // DOMAIN state machine (in_progress → completed is the only valid path;
  // completed is terminal). Behavior identical, single source of truth.
  if (!canTransition(deriveSessionStatus(session.completedAt), "completed")) {
    return { kind: "already_completed" };
  }

  const correctCount = calculateScore(
    session.answers.map((a) => ({
      id: a.id,
      questionId: a.questionId,
      userAnswer: (a.userAnswer as Answer | null) ?? null,
      isCorrect: a.isCorrect,
      answeredAt: a.answeredAt,
    })),
  );

  const updated = await finalizeSession(sessionId, correctCount);
  return { kind: "ok", session: updated };
}

export { PermissionError };
