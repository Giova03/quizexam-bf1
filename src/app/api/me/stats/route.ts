import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/me/stats - personal stats with comparison to global average
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // User sessions
    const userSessions = await db.quizSession.findMany({
      where: { userId: user.id, completedAt: { not: null } },
      orderBy: { startedAt: "desc" },
    });

    const totalSessions = userSessions.length;
    const avgScore = totalSessions > 0
      ? Math.round(userSessions.reduce((sum, s) => sum + (s.score / Math.max(1, s.totalQuestions)) * 100, 0) / totalSessions)
      : 0;
    const totalCorrect = userSessions.reduce((sum, s) => sum + s.score, 0);
    const totalQuestions = userSessions.reduce((sum, s) => sum + s.totalQuestions, 0);

    // Best score
    const bestScore = totalSessions > 0
      ? Math.max(...userSessions.map((s) => (s.score / Math.max(1, s.totalQuestions)) * 100))
      : 0;

    // Last 30 days activity
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentSessions = userSessions.filter((s) => new Date(s.startedAt) >= thirtyDaysAgo);

    // Global stats for comparison
    const allSessions = await db.quizSession.findMany({
      where: { completedAt: { not: null } },
      select: { score: true, totalQuestions: true, userId: true },
    });

    const globalAvg = allSessions.length > 0
      ? Math.round(allSessions.reduce((sum, s) => sum + (s.score / Math.max(1, s.totalQuestions)) * 100, 0) / allSessions.length)
      : 0;

    // Rank
    const userMap: Record<string, number> = {};
    for (const s of allSessions) {
      const uid = s.userId ?? "anon";
      if (!userMap[uid]) userMap[uid] = 0;
      userMap[uid] += s.score;
    }
    const ranked = Object.entries(userMap).sort((a, b) => b[1] - a[1]);
    const myRank = ranked.findIndex(([uid]) => uid === user.id) + 1;
    const totalUsers = ranked.length;

    return NextResponse.json({
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      stats: {
        totalSessions,
        avgScore,
        bestScore: Math.round(bestScore),
        totalCorrect,
        totalQuestions,
        recentSessions: recentSessions.length,
        rank: myRank,
        totalUsers,
        percentile: totalUsers > 0 ? Math.round((1 - (myRank - 1) / totalUsers) * 100) : 0,
      },
      comparison: {
        globalAvgScore: globalAvg,
        diff: avgScore - globalAvg,
        status: avgScore > globalAvg ? "above" : avgScore < globalAvg ? "below" : "equal",
      },
      last30Days: recentSessions.map((s) => ({
        date: s.startedAt,
        score: s.score,
        total: s.totalQuestions,
        pct: Math.round((s.score / Math.max(1, s.totalQuestions)) * 100),
        title: s.title,
      })),
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}
