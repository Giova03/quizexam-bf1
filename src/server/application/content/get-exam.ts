/**
 * Get Exam Use Case — application layer.
 *
 * GET /api/exams/[id] business logic: load one exam with its questions
 * (via the join table, ordered by `order`) through the repository.
 */

import { findExamWithQuestions } from "@/server/infrastructure/repositories/exam-repository";

export type GetExamResult =
  | { kind: "ok"; exam: NonNullable<Awaited<ReturnType<typeof findExamWithQuestions>>> }
  | { kind: "not_found" };

export async function getExam(id: string): Promise<GetExamResult> {
  const exam = await findExamWithQuestions(id);
  if (!exam) return { kind: "not_found" };
  return { kind: "ok", exam };
}
