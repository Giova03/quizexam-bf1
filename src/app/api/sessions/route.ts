import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface CreateSessionBody {
  title: string;
  mode: "immediate" | "final";
  sourceType: "bank" | "exam";
  sourceId: string;
}

<<<<<<< HEAD
// GET — list sessions for the current user (with answers for dashboard)
=======
// GET — list sessions for the current user
>>>>>>> 2537018 (feat: Notifications temps réel + correction responsive + chatbot fix + 10 nouvelles fonctionnalités)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
<<<<<<< HEAD
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
=======
      return NextResponse.json([]);
>>>>>>> 2537018 (feat: Notifications temps réel + correction responsive + chatbot fix + 10 nouvelles fonctionnalités)
    }

    const sessions = await db.quizSession.findMany({
      where: { userId: user.id },
      orderBy: { startedAt: "desc" },
      take: 100,
      include: {
        answers: {
          select: {
            id: true,
            questionText: true,
            correctAnswer: true,
            userAnswer: true,
            isCorrect: true,
            explanation: true,
          },
          orderBy: { id: "asc" },
        },
      },
    });

    return NextResponse.json(sessions);
  } catch (error) {
    console.error("Failed to load sessions:", error);
<<<<<<< HEAD
    return NextResponse.json(
      { error: "Failed to load sessions" },
      { status: 500 }
    );
=======
    return NextResponse.json([]);
>>>>>>> 2537018 (feat: Notifications temps réel + correction responsive + chatbot fix + 10 nouvelles fonctionnalités)
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateSessionBody;
    const { title, mode, sourceType, sourceId } = body;

    if (!title || !mode || !sourceType || !sourceId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (mode !== "immediate" && mode !== "final") {
      return NextResponse.json(
        { error: "Invalid mode (must be 'immediate' or 'final')" },
        { status: 400 }
      );
    }

    // Get the current user from the session
    const authSession = await getServerSession(authOptions);
    let userId: string | null = null;
    if (authSession?.user?.email) {
      const user = await db.user.findUnique({
        where: { email: authSession.user.email },
        select: { id: true },
      });
      userId = user?.id ?? null;
    }

    // Gather questions based on source type
    let questions: Array<{
      id: string;
      question: string;
      optionA: string;
      optionB: string;
      optionC: string;
      optionD: string;
      correctAnswer: string;
      correctAnswer2: string | null;
      explanation: string;
    }> = [];

    if (sourceType === "bank") {
      const bank = await db.questionBank.findUnique({
        where: { id: sourceId },
        include: { questions: { orderBy: { order: "asc" } } },
      });
      if (!bank) {
        return NextResponse.json({ error: "Bank not found" }, { status: 404 });
      }
      questions = bank.questions;
    } else {
      const exam = await db.exam.findUnique({
        where: { id: sourceId },
        include: {
          examQuestions: {
            include: { question: true },
            orderBy: { order: "asc" },
          },
        },
      });
      if (!exam) {
        return NextResponse.json({ error: "Exam not found" }, { status: 404 });
      }
      questions = exam.examQuestions.map((eq) => eq.question);
    }

    if (questions.length === 0) {
      return NextResponse.json(
        { error: "No questions available for this source" },
        { status: 400 }
      );
    }

    // Create the session with answer snapshots (linked to the user)
    const session = await db.quizSession.create({
      data: {
        title,
        mode,
        sourceType,
        sourceId,
        userId,
        totalQuestions: questions.length,
        score: 0,
        answers: {
          create: questions.map((q) => ({
            questionId: q.id,
            questionText: q.question,
            optionA: q.optionA,
            optionB: q.optionB,
            optionC: q.optionC,
            optionD: q.optionD,
            correctAnswer: q.correctAnswer,
            correctAnswer2: q.correctAnswer2,
            explanation: q.explanation,
            userAnswer: null,
            isCorrect: null,
            answeredAt: null,
          })),
        },
      },
      include: { answers: true },
    });

    return NextResponse.json(session);
  } catch (error) {
    console.error("Failed to create session:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}
