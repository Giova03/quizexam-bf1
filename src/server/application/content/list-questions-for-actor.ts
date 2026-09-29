/**
 * List Questions Use Case — application layer.
 *
 * GET /api/questions?bankId=X business logic:
 * 1. Load the bank's questions through the repository (legacy select + order).
 * 2. Decide visibility through the QUESTION DOMAIN (`questionViewForActor`):
 *    staff (EDITOR and above, per shared RBAC) see the answer key; students
 *    get the question stripped of correctAnswer / correctAnswer2 /
 *    explanation.
 *
 * Note: the legacy route hardcoded ["ADMIN","EDITOR","REVIEWER","MODERATOR"];
 * the shared RBAC `isStaff` adds SUPER_ADMIN (above ADMIN) — intended
 * alignment with the role hierarchy, documented in ROADMAP P3.
 */

import {
  questionViewForActor,
  type QuestionView,
} from "@/server/domain/questions/question-view";
import { isStaff } from "@/shared/security/rbac";
import { findQuestionsByBank } from "@/server/infrastructure/repositories/question-repository";

export type ListQuestionsResult = { kind: "ok"; questions: QuestionView[] };

export async function listQuestionsForActor(
  bankId: string,
  actorRole: string,
): Promise<ListQuestionsResult> {
  const rows = await findQuestionsByBank(bankId);
  const staff = isStaff(actorRole);
  return {
    kind: "ok",
    questions: rows.map((q) => questionViewForActor(q, staff)),
  };
}
