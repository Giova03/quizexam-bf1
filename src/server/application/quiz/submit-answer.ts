/**
 * Submit Answer Use Case — application layer.
 *
 * Records the user's answer for one question of a session:
 * 1. Ownership enforcement via the shared RBAC (owner or admin-level).
 * 2. Answer value validation (A/B/C/D).
 * 3. Correctness evaluation through the QUIZ DOMAIN (checkAnswer), which
 *    supports dual-answer questions (correctAnswer2). This fixes the P1-era
 *    bug where the route compared only against correctAnswer.
 * 4. Returns the full session (unchanged client contract), including the
 *    exam durationMin for exam-backed sessions.
 *
 * Behavior note (documented in ROADMAP, P3): the legacy route allowed
 * answering on completed sessions and that is preserved here — enforcing the
 * strict session state machine on this path is deferred to P3 to avoid any
 * regression in the client flows.
 */

import { checkAnswer, type Answer } from "@/server/domain/quiz/quiz-domain";
import { PermissionError, requireOwnershipOrAdmin } from "@/shared/security/rbac";
import {
  findExamDuration,
  findSessionAnswer,
  findSessionMeta,
  findSessionWithAnswers,
  updateSessionAnswer,
  type SessionWithAnswers,
} from "@/server/infrastructure/repositories/quiz-session-repository";
import type { Actor } from "./get-session";

const VALID_ANSWERS: readonly string[] = ["A", "B", "C", "D"];

export type SubmitAnswerResult =
  | { kind: "ok"; session: SessionWithAnswers; durationMin: number | null }
  | { kind: "session_not_found" }
  | { kind: "answer_not_found" }
  | { kind: "invalid_answer" };

/**
 * @throws PermissionError when the actor is neither the owner nor admin-level.
 */
export async function submitAnswer(
  sessionId: string,
  answerId: string,
  actor: Actor,
  userAnswer: string,
): Promise<SubmitAnswerResult> {
  if (!VALID_ANSWERS.includes(userAnswer)) {
    return { kind: "invalid_answer" };
  }

  const session = await findSessionMeta(sessionId);
  if (!session) return { kind: "session_not_found" };

  // P0 rule, now enforced through the shared RBAC helper.
  requireOwnershipOrAdmin(session.userId, actor.id, actor.role);

  const existing = await findSessionAnswer(answerId);
  if (!existing || existing.sessionId !== sessionId) {
    return { kind: "answer_not_found" };
  }

  // Domain-level correctness check — handles correctAnswer2 (dual answer).
  const isCorrect = checkAnswer(userAnswer as Answer, {
    correctAnswer: existing.correctAnswer as Answer,
    correctAnswer2: (existing.correctAnswer2 as Answer | null) ?? null,
  });

  await updateSessionAnswer(answerId, {
    userAnswer,
    isCorrect,
    answeredAt: new Date(),
  });

  // Return the FULL session with all answers (legacy client contract).
  const full = await findSessionWithAnswers(sessionId);
  if (!full) return { kind: "session_not_found" };

  const durationMin =
    full.sourceType === "exam" ? await findExamDuration(full.sourceId) : null;

  return { kind: "ok", session: full, durationMin };
}

export { PermissionError };
