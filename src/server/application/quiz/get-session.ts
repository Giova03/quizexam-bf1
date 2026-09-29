/**
 * Get Session Use Case — application layer.
 *
 * Loads a quiz session for an authenticated actor:
 * 1. Repository lookup (session + answers, ordered like the legacy route).
 * 2. Ownership enforcement via the shared RBAC (owner or admin-level).
 * 3. Exam-backed sessions expose the exam's durationMin.
 *
 * The route layer stays thin: map the result kinds to HTTP codes.
 */

import { PermissionError, requireOwnershipOrAdmin } from "@/shared/security/rbac";
import {
  findExamDuration,
  findSessionWithAnswers,
  type SessionWithAnswers,
} from "@/server/infrastructure/repositories/quiz-session-repository";

export interface Actor {
  id: string;
  role: string;
}

export interface SessionView {
  session: SessionWithAnswers;
  durationMin: number | null;
}

export type GetSessionResult =
  | { kind: "ok"; view: SessionView }
  | { kind: "not_found" };

/**
 * @throws PermissionError when the actor is neither the owner nor admin-level.
 */
export async function getSessionForActor(
  sessionId: string,
  actor: Actor,
): Promise<GetSessionResult> {
  const session = await findSessionWithAnswers(sessionId);
  if (!session) return { kind: "not_found" };

  // P0 rule, now enforced through the shared RBAC helper.
  requireOwnershipOrAdmin(session.userId, actor.id, actor.role);

  let durationMin: number | null = null;
  if (session.sourceType === "exam") {
    durationMin = await findExamDuration(session.sourceId);
  }

  return { kind: "ok", view: { session, durationMin } };
}

export { PermissionError };
