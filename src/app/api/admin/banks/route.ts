import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { invalidateBanksListCache } from "@/lib/cache";
import {
  logStaffAction,
  staffActorFromSession,
} from "@/server/application/audit/log-staff-action";

/** Valid education levels (added in E1). */
const VALID_EDUCATION_LEVELS = new Set([
  "BEPC",
  "BAC",
  "LICENCE",
  "CONCOURS",
  "TOUS",
]);

/** Coerce an incoming educationLevel value to a valid level (default TOUS). */
function normalizeEducationLevel(v: unknown): string {
  if (typeof v === "string" && VALID_EDUCATION_LEVELS.has(v.toUpperCase())) {
    return v.toUpperCase();
  }
  return "TOUS";
}

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") return null;
  return session;
}

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const body = await request.json();
  const { title, description, category, subcategory, icon, color, level, educationLevel } = body;
  if (!title) return NextResponse.json({ error: "Titre requis" }, { status: 400 });
  const bank = await db.questionBank.create({
    data: {
      title,
      description: description || "",
      category: category || "Divers",
      subcategory: subcategory || "",
      icon: icon || "BookOpen",
      color: color || "emerald",
      level: level || "TOUS",
      educationLevel: normalizeEducationLevel(educationLevel),
    },
  });
  invalidateBanksListCache();

  // P4 audit trail — staff mutations are traceable (best-effort).
  await logStaffAction(staffActorFromSession(session), {
    action: "bank.create",
    entity: "QuestionBank",
    entityId: bank.id,
    newValue: bank,
  });

  return NextResponse.json(bank);
}

export async function PATCH(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const body = await request.json();
  const { id, title, description, category, subcategory, icon, color, level, educationLevel } = body;
  if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });
  // P4 audit trail — capture the state BEFORE the update.
  const before = await db.questionBank.findUnique({ where: { id } });
  const bank = await db.questionBank.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(category !== undefined && { category }),
      ...(subcategory !== undefined && { subcategory }),
      ...(icon !== undefined && { icon }),
      ...(color !== undefined && { color }),
      ...(level !== undefined && { level }),
      // Only update educationLevel when the caller explicitly provided it;
      // an explicit null is coerced back to "TOUS" (the schema default).
      ...(educationLevel !== undefined && {
        educationLevel: normalizeEducationLevel(educationLevel),
      }),
    },
  });
  invalidateBanksListCache();

  await logStaffAction(staffActorFromSession(session), {
    action: "bank.update",
    entity: "QuestionBank",
    entityId: id,
    oldValue: before ?? undefined,
    newValue: bank,
  });

  return NextResponse.json(bank);
}

export async function DELETE(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });
  // P4 audit trail — capture the row BEFORE deleting it.
  const before = await db.questionBank.findUnique({ where: { id } });
  await db.questionBank.delete({ where: { id } });
  invalidateBanksListCache();

  await logStaffAction(staffActorFromSession(session), {
    action: "bank.delete",
    entity: "QuestionBank",
    entityId: id,
    oldValue: before ?? undefined,
  });

  return NextResponse.json({ success: true });
}
