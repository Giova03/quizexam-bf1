import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

<<<<<<< Updated upstream
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

  return NextResponse.json(updated);
=======
/** PATCH /api/reports/[id] — admin resolves or dismisses a report. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
      return NextResponse.json({ error: "Réservé à l'administrateur" }, { status: 403 });
    }
    const user = await db.user.findUnique({
      where: { email: session.user.email! },
      select: { id: true },
    });
    const { id } = await params;
    const body = (await request.json()) as {
      status?: string;
      resolution?: string;
    };
    const status = body.status === "resolved" || body.status === "dismissed" ? body.status : "resolved";
    const updated = await db.report.update({
      where: { id },
      data: {
        status,
        resolution: (body.resolution ?? "").trim().slice(0, 1000),
        resolvedById: user?.id ?? null,
        resolvedAt: new Date(),
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update report:", error);
    return NextResponse.json({ error: "Failed to update report" }, { status: 500 });
  }
>>>>>>> Stashed changes
}
