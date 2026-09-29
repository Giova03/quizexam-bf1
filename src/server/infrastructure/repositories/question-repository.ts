/**
 * Question Repository — infrastructure layer (server only).
 *
 * P3: Prisma data-access for question listing. The select is intentionally
 * identical to the legacy GET /api/questions query so the client contract
 * is unchanged.
 */

import { db } from "@/lib/db";
import type { QuestionRow } from "@/server/domain/questions/question-view";

export async function findQuestionsByBank(bankId: string): Promise<QuestionRow[]> {
  return db.question.findMany({
    where: { bankId },
    select: {
      id: true,
      question: true,
      optionA: true,
      optionB: true,
      optionC: true,
      optionD: true,
      correctAnswer: true,
      correctAnswer2: true,
      explanation: true,
      difficulty: true,
    },
    orderBy: { order: "asc" },
  });
}
