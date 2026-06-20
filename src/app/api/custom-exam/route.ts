import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface CustomExamBody {
  bankIds: string[];
  questionCount: number;
  mode: "immediate" | "final";
}

// POST — create a custom exam from selected banks
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string })?.id ?? null;

    const body = (await request.json()) as CustomExamBody;
    const { bankIds, questionCount, mode } = body;

    if (!bankIds || bankIds.length === 0) {
      return NextResponse.json(
        { error: "Sélectionnez au moins une banque" },
        { status: 400 }
      );
    }

    if (!questionCount || questionCount < 5 || questionCount > 100) {
      return NextResponse.json(
        { error: "Le nombre de questions doit être entre 5 et 100" },
        { status: 400 }
      );
    }

    if (mode !== "immediate" && mode !== "final") {
      return NextResponse.json({ error: "Mode invalide" }, { status: 400 });
    }

    // Fetch all questions from selected banks
    const questions = await db.question.findMany({
      where: { bankId: { in: bankIds } },
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
      },
    });

    if (questions.length === 0) {
      return NextResponse.json(
        { error: "Aucune question disponible dans les banques sélectionnées" },
        { status: 400 }
      );
    }

    // Shuffle and take the requested count
    const shuffled = [...questions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const selected = shuffled.slice(0, Math.min(questionCount, shuffled.length));

    // Build bank titles for the session name
    const banks = await db.questionBank.findMany({
      where: { id: { in: bankIds } },
      select: { title: true },
    });
    const title =
      banks.length === 1
        ? `Examen personnalisé — ${banks[0].title}`
        : `Examen personnalisé — ${banks.length} modules`;

    // Create the session
    const quizSession = await db.quizSession.create({
      data: {
        title,
        mode,
        sourceType: "bank",
        sourceId: bankIds[0], // first bank as reference
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
            userAnswer: null,
            userAnswer2: null,
            isCorrect: null,
            answeredAt: null,
          })),
        },
      },
      include: { answers: true },
    });

    return NextResponse.json(quizSession);
  } catch (error) {
    console.error("Custom exam creation failed:", error);
    return NextResponse.json(
      { error: "Échec de la création de l'examen" },
      { status: 500 }
    );
  }
}
