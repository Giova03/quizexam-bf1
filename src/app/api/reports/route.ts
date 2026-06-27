import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

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
}
