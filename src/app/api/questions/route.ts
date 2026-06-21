import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

<<<<<<< HEAD
// GET /api/questions?bankId=... - get all questions for revision mode
=======
>>>>>>> 2537018 (feat: Notifications temps réel + correction responsive + chatbot fix + 10 nouvelles fonctionnalités)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bankId = searchParams.get("bankId");
<<<<<<< HEAD

    if (!bankId) {
      return NextResponse.json(
        { error: "bankId required" },
        { status: 400 }
      );
    }
=======
    if (!bankId) return NextResponse.json({ error: "bankId required" }, { status: 400 });
>>>>>>> 2537018 (feat: Notifications temps réel + correction responsive + chatbot fix + 10 nouvelles fonctionnalités)

    const questions = await db.question.findMany({
      where: { bankId },
      select: {
<<<<<<< HEAD
        id: true,
        question: true,
        optionA: true,
        optionB: true,
        optionC: true,
        optionD: true,
        correctAnswer: true,
        correctAnswer2: true,
        explanation: true,
=======
        id: true, question: true, optionA: true, optionB: true,
        optionC: true, optionD: true, correctAnswer: true, correctAnswer2: true, explanation: true,
>>>>>>> 2537018 (feat: Notifications temps réel + correction responsive + chatbot fix + 10 nouvelles fonctionnalités)
      },
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("Failed to load questions:", error);
<<<<<<< HEAD
    return NextResponse.json(
      { error: "Failed to load questions" },
      { status: 500 }
    );
=======
    return NextResponse.json({ error: "Failed to load questions" }, { status: 500 });
>>>>>>> 2537018 (feat: Notifications temps réel + correction responsive + chatbot fix + 10 nouvelles fonctionnalités)
  }
}
