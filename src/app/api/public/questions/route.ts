import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  rateLimitCheck,
  getClientKey,
  rateLimitHeaders,
} from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
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
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const bankId = searchParams.get("bankId");
    if (!bankId) {
      return NextResponse.json(
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
      { status: 500 }
    );
  }
}
