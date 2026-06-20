import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN")
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const [banks, questions, exams, users, sessions, completedSessions] = await Promise.all([
    db.questionBank.count(), db.question.count(), db.exam.count(),
    db.user.count(), db.quizSession.count(),
    db.quizSession.count({ where: { completedAt: { not: null } } }),
  ]);
  const recentUsers = await db.user.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, email: true, name: true, role: true, createdAt: true } });
  const recentSessions = await db.quizSession.findMany({ where: { completedAt: { not: null } }, orderBy: { completedAt: "desc" }, take: 5, include: { user: { select: { name: true, email: true } } } });
  const bankStats = await db.questionBank.findMany({ include: { _count: { select: { questions: true } } }, orderBy: { createdAt: "asc" } });
  return NextResponse.json({ counts: { banks, questions, exams, users, sessions, completedSessions }, recentUsers, recentSessions, bankStats });
}
