/**
 * List Exams Use Case — application layer.
 *
 * GET /api/exams business logic: serve the exam list from the in-memory
 * cache when warm (same key as the legacy route), otherwise load through
 * the repository and cache. Admin mutation endpoints invalidate this key.
 */

import { cacheGet, cacheSet, CACHE_KEYS } from "@/lib/cache";
import { findExams, type ExamWithCount } from "@/server/infrastructure/repositories/exam-repository";

export type ListExamsResult = { kind: "ok"; exams: ExamWithCount[] };

export async function listExams(): Promise<ListExamsResult> {
  const cached = cacheGet<ExamWithCount[]>(CACHE_KEYS.examsList);
  if (cached) return { kind: "ok", exams: cached };

  const exams = await findExams();
  cacheSet(CACHE_KEYS.examsList, exams);
  return { kind: "ok", exams };
}
