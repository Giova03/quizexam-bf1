import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN")
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const sessions = await db.quizSession.findMany({
    orderBy: { startedAt: "desc" },
    take: 50,
    include: {
      user: { select: { name: true, email: true } },
      _count: { select: { answers: true } },
    },
  });
  return NextResponse.json(sessions);
}
