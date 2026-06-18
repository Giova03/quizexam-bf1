import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface CreateSessionBody {
  title: string;
  mode: "immediate" | "final";
  sourceType: "bank" | "exam";
  sourceId: string;
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

    // Gather questions based on source type
    let questions: Array<{
      id: string;
      question: string;
      optionA: string;
      optionB: string;
      optionC: string;
      optionD: string;
      correctAnswer: string;
      explanation: string;
    }> = [];

    if (sourceType === "bank") {
      const bank = await db.questionBank.findUnique({
        where: { id: sourceId },
        include: {
          questions: { orderBy: { order: "asc" } },
        },
      });
      if (!bank) {
        return NextResponse.json(
          { error: "Bank not found" },
          { status: 404 }
        );
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
        return NextResponse.json(
          { error: "Exam not found" },
          { status: 404 }
        );
      }
      questions = exam.examQuestions.map((eq) => eq.question);
    }

    if (questions.length === 0) {
      return NextResponse.json(
        { error: "No questions available for this source" },
        { status: 400 }
      );
    }

    // Create the session with answer snapshots
    const session = await db.quizSession.create({
      data: {
        title,
        mode,
        sourceType,
        sourceId,
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
            explanation: q.explanation,
            userAnswer: null,
            isCorrect: null,
            answeredAt: null,
          })),
        },
      },
      include: {
        answers: true,
      },
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
