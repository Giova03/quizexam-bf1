import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bankId = searchParams.get("bankId");
    if (!bankId) return NextResponse.json({ error: "bankId required" }, { status: 400 });

    const questions = await db.question.findMany({
      where: { bankId },
      select: {
        id: true, question: true, optionA: true, optionB: true,
        optionC: true, optionD: true, correctAnswer: true, correctAnswer2: true, explanation: true,
      },
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("Failed to load questions:", error);
    return NextResponse.json({ error: "Failed to load questions" }, { status: 500 });
  }
}
