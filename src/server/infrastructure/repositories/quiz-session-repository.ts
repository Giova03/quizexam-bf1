/**
 * Quiz Session Repository — infrastructure layer (server only).
 *
 * P2: thin Prisma data-access for the quiz session lifecycle. All queries
 * used by the session use cases live here so the application layer stays
 * free of technology concerns (and the routes stay thin).
 *
 * Response shapes are intentionally identical to what the API routes returned
 * before the P2 refactor — the client contract is unchanged.
 */

import { db } from "@/lib/db";
import type { QuizSession, SessionAnswer } from "@prisma/client";

export type SessionWithAnswers = QuizSession & { answers: SessionAnswer[] };

/** Row shape of the question pool gathered for a new session. */
export interface SourceQuestion {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  correctAnswer2: string | null;
  explanation: string;
  imageUrl: string | null;
  audioUrl: string | null;
}

/** Minimal session info needed for ownership and state decisions. */
export interface SessionMeta {
  id: string;
  userId: string | null;
  sourceType: string;
  sourceId: string;
  completedAt: Date | null;
}

export async function findSessionWithAnswers(
  id: string,
): Promise<SessionWithAnswers | null> {
  return db.quizSession.findUnique({
    where: { id },
    include: { answers: { orderBy: { id: "asc" } } },
  });
}

export async function findSessionMeta(
  id: string,
): Promise<SessionMeta | null> {
  return db.quizSession.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      sourceType: true,
      sourceId: true,
      completedAt: true,
    },
  });
}

export async function findSessionAnswer(answerId: string) {
  return db.sessionAnswer.findUnique({ where: { id: answerId } });
}

export async function updateSessionAnswer(
  answerId: string,
  data: { userAnswer: string; isCorrect: boolean; answeredAt: Date },
): Promise<void> {
  await db.sessionAnswer.update({ where: { id: answerId }, data });
}

export async function finalizeSession(
  id: string,
  score: number,
): Promise<SessionWithAnswers> {
  return db.quizSession.update({
    where: { id },
    data: { score, completedAt: new Date() },
    include: { answers: { orderBy: { id: "asc" } } },
  });
}

export async function findExamDuration(examId: string): Promise<number | null> {
  const exam = await db.exam.findUnique({
    where: { id: examId },
    select: { durationMin: true },
  });
  return exam?.durationMin ?? null;
}

// ===== Source question gathering (POST /api/sessions) =====

export interface SourceQuestionsResult {
  kind: "bank_not_found" | "exam_not_found" | "ok";
  questions: SourceQuestion[];
}

/**
 * Load the question pool for a new session.
 * - `questionIds` given → load exactly those rows, preserving caller order
 *   (daily-challenge path; the difficulty filter is NOT applied there).
 * - sourceType "bank" → all bank questions (optionally difficulty-filtered).
 * - sourceType "exam" → exam questions via the join table (optionally
 *   difficulty-filtered).
 */
export async function loadSourceQuestions(input: {
  sourceType: "bank" | "exam";
  sourceId: string;
  questionIds?: string[];
  difficulty?: "easy" | "medium" | "hard" | null;
}): Promise<SourceQuestionsResult> {
  const { sourceType, sourceId, questionIds, difficulty } = input;

  // Daily-challenge path: explicit, ordered question list.
  if (questionIds && questionIds.length > 0) {
    const rows = await db.question.findMany({
      where: { id: { in: questionIds } },
    });
    const byId = new Map(rows.map((q) => [q.id, q]));
    const questions = questionIds
      .map((id) => byId.get(id))
      .filter((q): q is NonNullable<typeof q> => Boolean(q));
    return { kind: "ok", questions };
  }

  if (sourceType === "bank") {
    const bank = await db.questionBank.findUnique({
      where: { id: sourceId },
      include: {
        questions: difficulty
          ? { where: { difficulty }, orderBy: { order: "asc" } }
          : { orderBy: { order: "asc" } },
      },
    });
    if (!bank) return { kind: "bank_not_found", questions: [] };
    return { kind: "ok", questions: bank.questions };
  }

  const exam = await db.exam.findUnique({
    where: { id: sourceId },
    include: {
      examQuestions: { include: { question: true }, orderBy: { order: "asc" } },
    },
  });
  if (!exam) return { kind: "exam_not_found", questions: [] };
  const questions = exam.examQuestions
    .map((eq) => eq.question)
    .filter((q) => (difficulty ? q.difficulty === difficulty : true));
  return { kind: "ok", questions };
}

/**
 * Create a session together with its answer snapshots in one round trip.
 * The snapshots (option text, correct answer, explanation, media URLs) make
 * the session immune to later edits of the underlying questions.
 */
export async function createSessionWithAnswers(input: {
  title: string;
  mode: string;
  sourceType: "bank" | "exam";
  sourceId: string;
  userId: string | null;
  questions: SourceQuestion[];
}): Promise<SessionWithAnswers> {
  return db.quizSession.create({
    data: {
      title: input.title,
      mode: input.mode,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      userId: input.userId,
      totalQuestions: input.questions.length,
      score: 0,
      answers: {
        create: input.questions.map((q) => ({
          questionId: q.id,
          questionText: q.question,
          optionA: q.optionA,
          optionB: q.optionB,
          optionC: q.optionC,
          optionD: q.optionD,
          correctAnswer: q.correctAnswer,
          correctAnswer2: q.correctAnswer2 ?? null,
          explanation: q.explanation,
          // Snapshot the media URLs so the session keeps rendering
          // images/audio even if the bank's question is later edited.
          imageUrl: q.imageUrl ?? null,
          audioUrl: q.audioUrl ?? null,
          userAnswer: null,
          isCorrect: null,
          answeredAt: null,
        })),
      },
    },
    include: { answers: true },
  });
}
