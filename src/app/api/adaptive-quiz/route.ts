import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * IA Adaptative — Niveau auto-ajustable
 *
 * POST /api/adaptive-quiz
 * Body: { bankId: string, userId?: string }
 *
 * Behaviour:
 *   1. Resolve the current user (from session, falling back to body.userId).
 *   2. Fetch every completed session the user has on this specific bank
 *      (matched via QuizSession.sourceId = bankId AND sourceType = "bank").
 *   3. Compute the user's average score (%) on this bank.
 *      - score < 40%  → serve 10 "easy" questions
 *      - 40-70%       → serve 10 "medium" questions
 *      - > 70%        → serve 10 "hard" questions
 *      If the user has no history on this bank yet, default to "medium".
 *   4. Create a brand-new QuizSession with 10 questions at the chosen
 *      difficulty (snapshots taken at session creation time, like the
 *      regular /api/sessions POST). This keeps the adaptive path
 *      consistent with the rest of the platform — the client can call
 *      `startSession(session.id, difficulty)` directly afterwards.
 *   5. Return: { sessionId, difficulty, score, totalQuestions, questions, reason }
 *      The `questions` array contains the 10 picked questions (with the
 *      full bank-info context) so the client can preview them.
 */

type AdaptiveDifficulty = "easy" | "medium" | "hard";

interface AdaptiveBody {
  bankId?: string;
  userId?: string;
  /** Optional override of the correction mode (defaults to "immediate"). */
  mode?: "immediate" | "final";
}

interface SessionRow {
  id: string;
  title: string;
  score: number;
  totalQuestions: number;
  sourceType: string;
  sourceId: string;
  startedAt: Date;
}

/** Compute the average score (%) across a list of completed sessions. */
function averagePct(rows: SessionRow[]): number {
  if (rows.length === 0) return 0;
  const sum = rows.reduce(
    (acc, s) => acc + (s.score / Math.max(1, s.totalQuestions)) * 100,
    0,
  );
  return Math.round(sum / rows.length);
}

/** Pick the adaptive difficulty based on the user's average score. */
function pickDifficulty(
  avgPct: number,
  hasHistory: boolean,
): AdaptiveDifficulty {
  if (!hasHistory) return "medium"; // first attempt → middle ground
  if (avgPct < 40) return "easy";
  if (avgPct <= 70) return "medium";
  return "hard";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as AdaptiveBody;
    const bankId = typeof body.bankId === "string" ? body.bankId : null;
    if (!bankId) {
      return NextResponse.json(
        { error: "bankId est requis" },
        { status: 400 },
      );
    }

    // --- Resolve the current user -----------------------------------------
    // Prefer the authenticated session; fall back to body.userId so the
    // endpoint stays usable from server-side callers that already know
    // the user id (e.g. scheduled study-plan jobs).
    let userId: string | null = null;
    const authSession = await getServerSession(authOptions);
    if (authSession?.user?.email) {
      const u = await db.user.findUnique({
        where: { email: authSession.user.email },
        select: { id: true },
      });
      userId = u?.id ?? null;
    }
    if (!userId && typeof body.userId === "string" && body.userId.length > 0) {
      // Validate that the supplied userId exists before trusting it.
      const exists = await db.user.findUnique({
        where: { id: body.userId },
        select: { id: true },
      });
      if (exists) userId = exists.id;
    }
    if (!userId) {
      return NextResponse.json(
        { error: "Authentification requise" },
        { status: 401 },
      );
    }

    // --- Verify the bank exists --------------------------------------------
    const bank = await db.questionBank.findUnique({
      where: { id: bankId },
      select: {
        id: true,
        title: true,
        category: true,
        color: true,
        icon: true,
      },
    });
    if (!bank) {
      return NextResponse.json(
        { error: "Banque introuvable" },
        { status: 404 },
      );
    }

    // --- 1) Fetch user's past sessions on this bank ------------------------
    const pastSessions = await db.quizSession.findMany({
      where: {
        userId,
        sourceType: "bank",
        sourceId: bankId,
        completedAt: { not: null },
      },
      select: {
        id: true,
        title: true,
        score: true,
        totalQuestions: true,
        sourceType: true,
        sourceId: true,
        startedAt: true,
      },
      orderBy: { startedAt: "desc" },
      take: 20, // last 20 sessions on this bank — enough to gauge level
    });

    const hasHistory = pastSessions.length > 0;
    const avgPct = averagePct(pastSessions);
    const difficulty = pickDifficulty(avgPct, hasHistory);

    // --- 2) Gather up to 10 questions at the chosen difficulty -------------
    // The bank may have fewer than 10 questions at the target difficulty
    // (especially for new banks). In that case, we backfill with the next
    // easier tier first, then the next harder tier, so the session always
    // has 10 questions if the bank has at least 10 questions in total.
    const allQuestions = await db.question.findMany({
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
        imageUrl: true,
        audioUrl: true,
      },
    });

    if (allQuestions.length === 0) {
      return NextResponse.json(
        { error: "Cette banque ne contient aucune question" },
        { status: 400 },
      );
    }

    // Bucket questions by difficulty.
    const buckets: Record<AdaptiveDifficulty, typeof allQuestions> = {
      easy: [],
      medium: [],
      hard: [],
    };
    for (const q of allQuestions) {
      const d = (q.difficulty ?? "medium").toLowerCase();
      if (d === "easy" || d === "medium" || d === "hard") {
        buckets[d].push(q);
      } else {
        buckets.medium.push(q);
      }
    }

    // Shuffle helper (Fisher-Yates).
    const shuffle = <T,>(arr: T[]): T[] => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };

    const TARGET = 10;
    const picked: typeof allQuestions = [];
    picked.push(...shuffle(buckets[difficulty]));

    // Backfill from adjacent tiers if we don't have enough.
    if (picked.length < TARGET) {
      const order: AdaptiveDifficulty[] =
        difficulty === "easy"
          ? ["medium", "hard"]
          : difficulty === "hard"
            ? ["medium", "easy"]
            : ["easy", "hard"];
      for (const tier of order) {
        if (picked.length >= TARGET) break;
        const remaining = TARGET - picked.length;
        const pool = shuffle(buckets[tier]).filter(
          (q) => !picked.some((p) => p.id === q.id),
        );
        picked.push(...pool.slice(0, remaining));
      }
    }

    // Final safety cap — never return more than TARGET.
    const selected = picked.slice(0, TARGET);

    if (selected.length === 0) {
      return NextResponse.json(
        { error: "Aucune question disponible pour cette banque" },
        { status: 400 },
      );
    }

    // --- 3) Create the adaptive session ------------------------------------
    const mode = body.mode === "final" ? "final" : "immediate";
    const sessionTitle = `Quiz adaptatif — ${bank.title} (${difficulty})`;

    const newSession = await db.quizSession.create({
      data: {
        title: sessionTitle,
        mode,
        sourceType: "bank",
        sourceId: bankId,
        userId,
        totalQuestions: selected.length,
        score: 0,
        answers: {
          create: selected.map((q) => ({
            questionId: q.id,
            questionText: q.question,
            optionA: q.optionA,
            optionB: q.optionB,
            optionC: q.optionC,
            optionD: q.optionD,
            correctAnswer: q.correctAnswer,
            correctAnswer2: q.correctAnswer2 ?? null,
            explanation: q.explanation,
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

    // --- 4) Build a human-readable "reason" explaining the choice ----------
    let reason: string;
    if (!hasHistory) {
      reason =
        "Première session sur cette banque — nous commençons par des questions de niveau moyen pour évaluer votre niveau.";
    } else if (difficulty === "easy") {
      reason = `Votre score moyen sur « ${bank.title} » est de ${avgPct}% — nous servons des questions faciles pour consolider les bases.`;
    } else if (difficulty === "medium") {
      reason = `Votre score moyen sur « ${bank.title} » est de ${avgPct}% — niveau moyen sélectionné pour progresser sans vous décourager.`;
    } else {
      reason = `Votre score moyen sur « ${bank.title} » est de ${avgPct}% — vous maîtrisez cette banque, montons en difficulté !`;
    }

    return NextResponse.json({
      sessionId: newSession.id,
      difficulty,
      mode,
      score: 0,
      totalQuestions: selected.length,
      // Public-facing fields (no correctAnswer leakage beyond what the
      // client already has access to — these come from the snapshots).
      questions: selected.map((q) => ({
        id: q.id,
        question: q.question,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        difficulty: q.difficulty ?? "medium",
      })),
      bank: {
        id: bank.id,
        title: bank.title,
        category: bank.category,
        color: bank.color,
        icon: bank.icon,
      },
      analysis: {
        sessionsAnalyzed: pastSessions.length,
        averageScore: avgPct,
        hasHistory,
      },
      reason,
    });
  } catch (error) {
    console.error("adaptive-quiz error:", error);
    return NextResponse.json(
      { error: "Échec de la génération du quiz adaptatif" },
      { status: 500 },
    );
  }
}
