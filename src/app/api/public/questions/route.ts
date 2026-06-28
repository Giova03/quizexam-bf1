import { NextResponse } from "next/server";
import { db } from "@/lib/db";
<<<<<<< Updated upstream
import {
  rateLimitCheck,
  getClientKey,
  rateLimitHeaders,
} from "@/lib/rate-limit";
=======
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
>>>>>>> Stashed changes

export const dynamic = "force-dynamic";

/**
<<<<<<< Updated upstream
 * GET /api/public/questions?bankId=X
 *
 * Public, rate-limited list of questions for a given bank. Returns the
 * question text + 4 options but OMITS the correct answer and the
 * explanation (so external integrators can build quizzes without
 * leaking the answer key).
 *
 * Rate limit: 30 requests / minute / IP.
 */
export async function GET(request: Request) {
  // --- Rate limit ---
  const key = getClientKey(request);
  const rl = rateLimitCheck(key);
  const headers = rateLimitHeaders(rl);
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: "Trop de requêtes. Réessayez dans quelques secondes.",
        code: "RATE_LIMITED",
      },
      { status: 429, headers }
=======
 * GET /api/public/questions?bankId=<id>
 * Public, rate-limited list of questions for a given bank.
 *
 * IMPORTANT: the correct answer and explanation are NOT included in the
 * response — this endpoint is intended for learners who want to import
 * questions into their own study tools without spoiling the answers.
 *
 * Query params:
 *   - bankId: required
 *   - limit:  default 20, max 100
 */
export async function GET(request: Request) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`public:questions:${ip}`, {
    limit: 60,
    windowMs: 60_000,
  });
  if (!rl.success) {
    return NextResponse.json(
      { error: "Trop de requêtes. Réessayez dans un instant." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(rl.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(rl.resetAt),
          "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
        },
      }
>>>>>>> Stashed changes
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const bankId = searchParams.get("bankId");
    if (!bankId) {
      return NextResponse.json(
<<<<<<< Updated upstream
        { error: "bankId requis" },
        { status: 400, headers }
      );
    }

    const questions = await db.question.findMany({
      where: { bankId },
      select: {
        id: true,
        question: true,
        optionA: true,
        optionB: true,
        optionC: true,
        optionD: true,
        // Intentionally NOT selecting correctAnswer, correctAnswer2,
        // explanation — those are answer-key fields.
      },
      orderBy: { order: "asc" },
      take: 100, // hard cap to keep payloads reasonable
    });

    // Reshape: shuffle option labels? No — keep order so external
    // integrators can render the question as-is.
    const publicQuestions = questions.map((q) => ({
      id: q.id,
      question: q.question,
      options: {
        A: q.optionA,
        B: q.optionB,
        C: q.optionC,
        D: q.optionD,
      },
    }));

    return NextResponse.json(
      {
        bankId,
        questions: publicQuestions,
        count: publicQuestions.length,
        rateLimit: {
          limit: rl.limit,
          remaining: rl.remaining,
          reset: rl.reset,
        },
      },
      { headers }
    );
  } catch (error) {
    console.error("public/questions GET error:", error);
    return NextResponse.json(
      { error: "Échec du chargement des questions" },
=======
        { error: "Paramètre bankId requis" },
        { status: 400 }
      );
    }

    const limitParam = Number(searchParams.get("limit") ?? 20);
    const limit = Math.min(Math.max(isNaN(limitParam) ? 20 : limitParam, 1), 100);

    const bank = await db.questionBank.findUnique({
      where: { id: bankId },
      select: {
        id: true,
        title: true,
        category: true,
        questions: {
          select: {
            id: true,
            question: true,
            optionA: true,
            optionB: true,
            optionC: true,
            optionD: true,
            difficulty: true,
          },
          orderBy: { order: "asc" },
          take: limit,
        },
      },
    });

    if (!bank) {
      return NextResponse.json(
        { error: "Banque introuvable" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      bank: {
        id: bank.id,
        title: bank.title,
        category: bank.category,
      },
      count: bank.questions.length,
      questions: bank.questions.map((q) => ({
        id: q.id,
        question: q.question,
        options: {
          A: q.optionA,
          B: q.optionB,
          C: q.optionC,
          D: q.optionD,
        },
        difficulty: q.difficulty,
      })),
      rateLimit: {
        limit: rl.limit,
        remaining: rl.remaining,
        resetAt: rl.resetAt,
      },
    });
  } catch (error) {
    console.error("[public/questions] error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des questions" },
>>>>>>> Stashed changes
      { status: 500 }
    );
  }
}
