import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

<<<<<<< Updated upstream
const ALLOWED_TARGET_TYPES = new Set([
  "forum_topic",
  "forum_reply",
  "post",
  "comment",
  "user",
  "question",
  "session",
  "other",
]);

/**
 * POST /api/reports
 * Authenticated users can create a new report.
 * Body: { targetType, targetId, reason }
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
  }
  const userId = (session.user as { id?: string }).id;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const targetType = typeof body?.targetType === "string" ? body.targetType.trim() : "";
  const targetId = typeof body?.targetId === "string" ? body.targetId.trim() : "";
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

  if (!targetType || !targetId || !reason) {
    return NextResponse.json(
      { error: "Champs requis manquants: targetType, targetId, reason" },
      { status: 400 }
    );
  }
  if (!ALLOWED_TARGET_TYPES.has(targetType)) {
    return NextResponse.json({ error: "Type de cible invalide" }, { status: 400 });
  }
  if (reason.length > 1000) {
    return NextResponse.json({ error: "Raison trop longue (max 1000 caractères)" }, { status: 400 });
  }

  const report = await db.report.create({
    data: {
      reporterId: userId,
      targetType,
      targetId,
      reason,
      status: "pending",
    },
  });

  return NextResponse.json(report, { status: 201 });
}

/**
 * GET /api/reports
 * Admin-only: list all reports, optionally filtered by ?status=pending|resolved|dismissed
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status");

  const where = status && ["pending", "resolved", "dismissed"].includes(status)
    ? { status }
    : {};

  const reports = await db.report.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      reporter: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return NextResponse.json(reports);
=======
/** GET /api/reports — admin only. Optional status filter. */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
      return NextResponse.json({ error: "Réservé à l'administrateur" }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? "pending";
    const where = status === "all" ? {} : { status };
    const reports = await db.report.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        reporter: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(reports);
  } catch (error) {
    console.error("Failed to list reports:", error);
    return NextResponse.json({ error: "Failed to load reports" }, { status: 500 });
  }
}

/** POST /api/reports — any authenticated user can create a report. */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }
    const body = (await request.json()) as {
      targetType?: string;
      targetId?: string;
      reason?: string;
      category?: string;
    };
    const targetType = body.targetType?.trim();
    const targetId = body.targetId?.trim();
    if (!targetType || !targetId) {
      return NextResponse.json({ error: "Cible du signalement manquante" }, { status: 400 });
    }
    const report = await db.report.create({
      data: {
        targetType,
        targetId,
        reason: (body.reason ?? "").trim().slice(0, 1000),
        category: body.category?.trim() || "autre",
        reporterId: user.id,
      },
      include: { reporter: { select: { id: true, name: true } } },
    });
    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error("Failed to create report:", error);
    return NextResponse.json({ error: "Failed to create report" }, { status: 500 });
  }
>>>>>>> Stashed changes
}
