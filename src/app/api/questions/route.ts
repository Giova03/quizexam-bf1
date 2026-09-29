import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/questions?bankId=X
 *
 * Returns questions for revision mode. Requires authentication.
 *
 * P0 SECURITY: The correctAnswer and explanation are ONLY returned to:
 * - ADMIN, EDITOR, REVIEWER, MODERATOR roles (for content management)
 * - Regular users ONLY when the session is completed (revision mode)
 *
 * For regular users viewing a bank without a completed session,
 * we return the question text and options but OMIT the correctAnswer
 * and explanation to prevent cheating.
 */
export async function GET(request: Request) {
  try {
    // P0: Authentication required
    const authSession = await getServerSession(authOptions);
    if (!authSession?.user?.email) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { email: authSession.user.email },
      select: { id: true, role: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const bankId = searchParams.get("bankId");
    if (!bankId) return NextResponse.json({ error: "bankId required" }, { status: 400 });

    // P0: Staff roles can see full question data (for content management)
    const isStaff = ["ADMIN", "EDITOR", "REVIEWER", "MODERATOR"].includes(user.role);

    const questions = await db.question.findMany({
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

    // P0: For non-staff users, strip correctAnswer and explanation
    // to prevent answer key leakage. They get these only after completing a quiz.
    if (!isStaff) {
      return NextResponse.json({
        questions: questions.map((q) => ({
          ...q,
          correctAnswer: undefined,
          correctAnswer2: undefined,
          explanation: undefined,
        })),
      });
    }

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("Failed to load questions:", error);
    return NextResponse.json({ error: "Failed to load questions" }, { status: 500 });
  }
}
