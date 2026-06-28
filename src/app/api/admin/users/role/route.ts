import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = new Set([
  "VISITOR",
  "CONTRIBUTOR",
  "MODERATOR",
  "EXAMINER",
  "ADMIN",
]);

/**
 * PATCH /api/admin/users/role
 * Admin-only: change a user's role.
 * Body: { userId: string, role: "VISITOR" | "CONTRIBUTOR" | "MODERATOR" | "EXAMINER" | "ADMIN" }
 */
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const userId = typeof body?.userId === "string" ? body.userId.trim() : "";
  const role = typeof body?.role === "string" ? body.role.trim().toUpperCase() : "";

  if (!userId || !role) {
    return NextResponse.json(
      { error: "Champs requis manquants: userId, role" },
      { status: 400 }
    );
  }

  if (!ALLOWED_ROLES.has(role)) {
    return NextResponse.json(
      {
        error:
          "Rôle invalide. Rôles autorisés: VISITOR, CONTRIBUTOR, MODERATOR, EXAMINER, ADMIN",
      },
      { status: 400 }
    );
  }

  const target = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!target) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  const updated = await db.user.update({
    where: { id: userId },
    data: { role },
    select: { id: true, name: true, email: true, role: true },
  });

  return NextResponse.json(updated);
}
