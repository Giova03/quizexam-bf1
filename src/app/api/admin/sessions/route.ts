import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";

// GET — all sessions with user info and answer details (admin only)
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN")
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const includeAnswers = searchParams.get("details") === "true";

  const where = userId ? { userId } : {};
  const sessions = await db.quizSession.findMany({
    where,
    orderBy: { startedAt: "desc" },
    take: 100,
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      _count: { select: { answers: true } },
      ...(includeAnswers
        ? {
            answers: {
              select: {
                id: true,
                questionText: true,
                correctAnswer: true,
                userAnswer: true,
                isCorrect: true,
              },
            },
          }
        : {}),
    },
  });

  return NextResponse.json(sessions);
}
