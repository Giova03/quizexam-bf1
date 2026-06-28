import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
<<<<<<< Updated upstream
 * GET /api/admin/analytics
 * Admin-only analytics endpoint:
 *  - Engagement metrics: total sessions today / this week / this month + avg sessions per user
 *  - Top 20 most-failed questions (grouped by questionText, isCorrect=false)
 *  - 7-day x 24-hour user activity heatmap (from QuizSession.startedAt)
 *  - Top 10 most-active users (by session count)
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const now = new Date();

  // --- Engagement metrics ---
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfWeek = new Date(startOfToday);
  // ISO week: Monday as first day
  const dayOfWeek = (startOfWeek.getDay() + 6) % 7; // 0 = Monday
  startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [sessionsToday, sessionsThisWeek, sessionsThisMonth, totalUsers, totalSessions] =
    await Promise.all([
      db.quizSession.count({ where: { startedAt: { gte: startOfToday } } }),
      db.quizSession.count({ where: { startedAt: { gte: startOfWeek } } }),
      db.quizSession.count({ where: { startedAt: { gte: startOfMonth } } }),
      db.user.count(),
      db.quizSession.count(),
    ]);

  const avgSessionsPerUser =
    totalUsers > 0 ? Math.round((totalSessions / totalUsers) * 100) / 100 : 0;

  // --- Most failed questions (top 20) ---
  // Group SessionAnswer by questionText where isCorrect=false, count failures.
  // We pull raw rows and group in JS for portability (SQLite/Postgres both work).
  const failedAnswers = await db.sessionAnswer.findMany({
    where: { isCorrect: false },
    select: { questionText: true, correctAnswer: true },
  });

  const failMap = new Map<string, { questionText: string; failures: number }>();
  for (const a of failedAnswers) {
    const key = a.questionText;
    const entry = failMap.get(key);
    if (entry) entry.failures += 1;
    else failMap.set(key, { questionText: key, failures: 1 });
  }
  const failedQuestions = Array.from(failMap.values())
    .sort((a, b) => b.failures - a.failures)
    .slice(0, 20);

  // --- Activity heatmap (7 days x 24 hours) ---
  // 7 days ago at start of day
  const heatmapStart = new Date(startOfToday);
  heatmapStart.setDate(heatmapStart.getDate() - 6); // last 7 days including today

  const recentSessions = await db.quizSession.findMany({
    where: { startedAt: { gte: heatmapStart } },
    select: { startedAt: true },
  });

  // Build a 7x24 grid: rows = day offset (row 0 = oldest, row 6 = today)
  const heatmap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const s of recentSessions) {
    const d = s.startedAt;
    const dayDiff = Math.floor(
      (startOfToday.getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) /
        86400000
    );
    if (dayDiff < 0 || dayDiff > 6) continue;
    const row = 6 - dayDiff; // row 6 = today (bottom), row 0 = oldest (top)
    const hour = d.getHours();
    heatmap[row][hour] += 1;
  }

  // --- Top 10 active users by session count ---
  const topUsersRaw = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      _count: { select: { sessions: true } },
    },
    orderBy: { sessions: { _count: "desc" } },
    take: 10,
  });
  const topUsers = topUsersRaw
    .filter((u) => u._count.sessions > 0)
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      sessionCount: u._count.sessions,
    }));

  return NextResponse.json({
    engagement: {
      sessionsToday,
      sessionsThisWeek,
      sessionsThisMonth,
      avgSessionsPerUser,
      totalSessions,
      totalUsers,
    },
    failedQuestions,
    heatmap,
    topUsers,
    generatedAt: now.toISOString(),
  });
=======
 * GET /api/admin/analytics — advanced analytics for admin dashboard.
 * Returns:
 *  - sessionsToday, sessionsWeek, sessionsMonth (counts)
 *  - topFailedQuestions: top 10 questions with highest wrong-answer rate
 *  - heatmap: 7-day × 24-hour matrix of session counts
 *  - topUsers: top 10 users by completed session count + avg score
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - 6); // 7 days incl. today
    const startOfMonth = new Date(startOfToday);
    startOfMonth.setDate(startOfMonth.getDate() - 29); // 30 days incl. today

    const [sessionsToday, sessionsWeek, sessionsMonth] = await Promise.all([
      db.quizSession.count({ where: { completedAt: { gte: startOfToday } } }),
      db.quizSession.count({ where: { completedAt: { gte: startOfWeek } } }),
      db.quizSession.count({ where: { completedAt: { gte: startOfMonth } } }),
    ]);

    // Top failed questions: aggregate SessionAnswer where isCorrect=false
    // grouped by questionId, return top 10 with the question text.
    const failedGroups = await db.sessionAnswer.groupBy({
      by: ["questionId"],
      where: { isCorrect: false },
      _count: { _all: true },
      orderBy: { _count: { questionId: "desc" } },
      take: 10,
    });

    const topFailedQuestions = await Promise.all(
      failedGroups.map(async (g) => {
        const answer = await db.sessionAnswer.findFirst({
          where: { questionId: g.questionId },
          select: { questionText: true, correctAnswer: true },
        });
        const totalAnswers = await db.sessionAnswer.count({
          where: { questionId: g.questionId },
        });
        return {
          questionId: g.questionId,
          questionText: answer?.questionText ?? "(supprimée)",
          correctAnswer: answer?.correctAnswer ?? "",
          failedCount: g._count._all,
          totalAnswers,
          failureRate:
            totalAnswers > 0
              ? Math.round((g._count._all / totalAnswers) * 100)
              : 0,
        };
      })
    );

    // 7-day × 24-hour heatmap: count completed sessions per (day, hour)
    const sessions = await db.quizSession.findMany({
      where: {
        completedAt: { gte: startOfWeek },
      },
      select: { completedAt: true },
    });

    const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
    const heatmap: number[][] = Array.from({ length: 7 }, () =>
      Array.from({ length: 24 }, () => 0)
    );
    for (const s of sessions) {
      if (!s.completedAt) continue;
      const d = new Date(s.completedAt);
      const dayIdx = (d.getDay() + 6) % 7; // Mon=0..Sun=6
      const hour = d.getHours();
      heatmap[dayIdx][hour]++;
    }

    // Top users by completed session count + avg score
    const userAgg = await db.quizSession.groupBy({
      by: ["userId"],
      where: { completedAt: { not: null }, userId: { not: null } },
      _count: { _all: true },
      _avg: { score: true },
      orderBy: { _count: { userId: "desc" } },
      take: 10,
    });
    const userIds = userAgg
      .map((u) => u.userId)
      .filter((id): id is string => id !== null);
    const users = await db.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));
    const topUsers = userAgg
      .map((u) => {
        const user = u.userId ? userMap.get(u.userId) : null;
        return {
          userId: u.userId,
          name: user?.name ?? "Anonyme",
          email: user?.email ?? "",
          sessions: u._count._all,
          avgScore: Math.round(u._avg.score ?? 0),
        };
      })
      .filter((u) => u.userId !== null);

    return NextResponse.json({
      sessionsToday,
      sessionsWeek,
      sessionsMonth,
      topFailedQuestions,
      heatmap: { days, hours: Array.from({ length: 24 }, (_, i) => i), data: heatmap },
      topUsers,
    });
  } catch (error) {
    console.error("Failed to load analytics:", error);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
>>>>>>> Stashed changes
}
