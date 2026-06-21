import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/leaderboard - global leaderboard of all users
export async function GET() {
  try {
    const sessions = await db.quizSession.findMany({
      where: { completedAt: { not: null } },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    // Group by user
    const userMap: Record<string, { name: string; email: string; role: string; sessions: any[] }> = {};
    for (const s of sessions) {
      const uid = s.user?.id ?? "anon";
      if (!userMap[uid]) {
        userMap[uid] = {
          name: s.user?.name ?? "Visiteur",
          email: s.user?.email ?? "N/A",
          role: s.user?.role ?? "VISITOR",
          sessions: [],
        };
      }
      userMap[uid].sessions.push(s);
    }

    const leaderboard = Object.entries(userMap).map(([id, data]) => {
      const completed = data.sessions;
      const avgPct = completed.length > 0
        ? Math.round(completed.reduce((sum, s) => sum + (s.score / Math.max(1, s.totalQuestions)) * 100, 0) / completed.length)
        : 0;
      const totalCorrect = completed.reduce((sum, s) => sum + s.score, 0);
      const totalQ = completed.reduce((sum, s) => sum + s.totalQuestions, 0);
      const bestScore = completed.length > 0
        ? Math.max(...completed.map((s) => (s.score / Math.max(1, s.totalQuestions)) * 100))
        : 0;
      return {
        id,
        name: data.name,
        email: data.email,
        role: data.role,
        sessionCount: completed.length,
        avgPct,
        bestScore: Math.round(bestScore),
        totalCorrect,
        totalQ,
        xp: totalCorrect * 10 + (completed.length * 5),
      };
    }).sort((a, b) => b.xp - a.xp);

    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json([]);
  }
}
