/**
 * Exam Repository — infrastructure layer (server only).
 *
 * P3: Prisma data-access for official exams. Query shapes are identical to
 * the legacy GET /api/exams and GET /api/exams/[id] routes.
 */

import { db } from "@/lib/db";

export type ExamWithCount = Awaited<ReturnType<typeof findExams>>[number];

export async function findExams() {
  return db.exam.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { examQuestions: true } },
    },
  });
}

export async function findExamWithQuestions(id: string) {
  return db.exam.findUnique({
    where: { id },
    include: {
      examQuestions: {
        include: {
          question: true,
        },
        orderBy: { order: "asc" },
      },
    },
  });
}
