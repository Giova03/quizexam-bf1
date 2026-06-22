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

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "users";
  let csv = "";
  let filename = "";

  if (type === "users") {
    filename = `utilisateurs-${new Date().toISOString().slice(0, 10)}.csv`;
    const users = await db.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true, _count: { select: { sessions: true } } },
      orderBy: { createdAt: "desc" },
    });
    csv = "Nom,Email,Role,Date inscription,Sessions\n";
    for (const u of users) {
      csv += [escapeCSV(u.name), escapeCSV(u.email), u.role, new Date(u.createdAt).toLocaleDateString("fr-FR"), u._count.sessions].join(",") + "\n";
    }
  } else if (type === "sessions") {
    filename = `sessions-${new Date().toISOString().slice(0, 10)}.csv`;
    const sessions = await db.quizSession.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { startedAt: "desc" },
      take: 500,
    });
    csv = "Utilisateur,Email,Titre,Mode,Score,Total,Pourcentage,Date debut,Date fin\n";
    for (const s of sessions) {
      const pct = Math.round((s.score / Math.max(1, s.totalQuestions)) * 100);
      csv += [escapeCSV(s.user?.name ?? "Anonyme"), escapeCSV(s.user?.email ?? ""), escapeCSV(s.title), s.mode === "immediate" ? "Immédiate" : "Finale", s.score, s.totalQuestions, pct + "%", new Date(s.startedAt).toLocaleString("fr-FR"), s.completedAt ? new Date(s.completedAt).toLocaleString("fr-FR") : "En cours"].join(",") + "\n";
    }
  } else if (type === "banks") {
    filename = `banques-${new Date().toISOString().slice(0, 10)}.csv`;
    const banks = await db.questionBank.findMany({
      select: { id: true, title: true, category: true, description: true, createdAt: true, _count: { select: { questions: true } } },
      orderBy: { title: "asc" },
    });
    csv = "Titre,Categorie,Description,Questions,Date creation\n";
    for (const b of banks) {
      csv += [escapeCSV(b.title), escapeCSV(b.category), escapeCSV(b.description), b._count.questions, new Date(b.createdAt).toLocaleDateString("fr-FR")].join(",") + "\n";
    }
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
