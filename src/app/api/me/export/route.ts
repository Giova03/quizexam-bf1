import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function escapeCSV(value: string): string {
  if (!value) return "";
  const v = String(value);
  if (v.includes(",") || v.includes('"') || v.includes("\n")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

// GET /api/me/export - export personal results as CSV
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const sessions = await db.quizSession.findMany({
    where: { userId: user.id },
    orderBy: { startedAt: "desc" },
    include: { answers: true },
  });

  let csv = "Titre,Mode,Score,Total,Pourcentage,Date debut,Date fin,Statut\n";
  for (const s of sessions) {
    const pct = Math.round((s.score / Math.max(1, s.totalQuestions)) * 100);
    csv += [
      escapeCSV(s.title),
      s.mode === "immediate" ? "Immédiate" : "Finale",
      s.score,
      s.totalQuestions,
      pct + "%",
      new Date(s.startedAt).toLocaleString("fr-FR"),
      s.completedAt ? new Date(s.completedAt).toLocaleString("fr-FR") : "En cours",
      s.completedAt ? (pct >= 50 ? "Réussi" : "Échec") : "Non terminé",
    ].join(",") + "\n";
  }

  const filename = `mes-resultats-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
