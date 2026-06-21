import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/search?q=...&limit=50
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").trim().toLowerCase();
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);

    if (q.length < 2) {
      return NextResponse.json({ results: [], total: 0 });
    }

    const questions = await db.question.findMany({
      where: {
        OR: [
          { question: { contains: q, mode: "insensitive" } },
          { optionA: { contains: q, mode: "insensitive" } },
          { optionB: { contains: q, mode: "insensitive" } },
          { optionC: { contains: q, mode: "insensitive" } },
          { optionD: { contains: q, mode: "insensitive" } },
          { explanation: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        question: true,
        optionA: true,
        optionB: true,
        optionC: true,
        optionD: true,
        correctAnswer: true,
        explanation: true,
        bank: {
          select: {
            id: true,
            title: true,
            color: true,
            icon: true,
            category: true,
          },
        },
      },
      take: limit,
    });

    return NextResponse.json({ results: questions, total: questions.length });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Search failed", results: [], total: 0 },
      { status: 500 }
    );
  }
}
