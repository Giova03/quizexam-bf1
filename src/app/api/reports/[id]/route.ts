import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  logStaffAction,
  staffActorFromSession,
} from "@/server/application/audit/log-staff-action";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/reports/[id]
 * Admin-only: update the status of a report.
 * Body: { status: "resolved" | "dismissed" | "pending" }
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { id } = await params;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const status = typeof body?.status === "string" ? body.status.trim() : "";
  if (!["pending", "resolved", "dismissed"].includes(status)) {
    return NextResponse.json(
      { error: "Statut invalide (attendu: pending | resolved | dismissed)" },
      { status: 400 }
    );
  }

  const existing = await db.report.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Signalement introuvable" }, { status: 404 });
  }

  const updated = await db.report.update({
    where: { id },
    data: { status },
  });

  // P4 audit trail — moderation decisions are traceable (best-effort).
  await logStaffAction(staffActorFromSession(session), {
    action: "report.status_change",
    entity: "Report",
    entityId: id,
    oldValue: { status: existing.status },
    newValue: { status: updated.status },
    metadata: { targetType: existing.targetType },
  });

  return NextResponse.json(updated);
}
