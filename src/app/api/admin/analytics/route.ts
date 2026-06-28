import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
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
}
