import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { applyUserRateLimit } from "@/lib/api-rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // E6.7 — per-user rate limiting (100 req/min).
    const rateLimit = await applyUserRateLimit(request);
    if (!rateLimit.allowed && rateLimit.response) return rateLimit.response;

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").trim().toLowerCase();
    const takeLimit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);

    if (q.length < 2) {
      return NextResponse.json({ results: [], total: 0 });
    }

    const questions = await db.question.findMany({
      where: {
        OR: [
          { question: { contains: q } },
          { optionA: { contains: q } },
          { optionB: { contains: q } },
          { optionC: { contains: q } },
          { optionD: { contains: q } },
          { explanation: { contains: q } },
        ],
      },
      select: {
        id: true, question: true, optionA: true, optionB: true,
        optionC: true, optionD: true, correctAnswer: true, explanation: true,
        bank: { select: { id: true, title: true, color: true, icon: true, category: true } },
      },
      take: takeLimit,
    });

    return NextResponse.json({ results: questions, total: questions.length });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Search failed", results: [], total: 0 }, { status: 500 });
  }
}
