import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
<<<<<<< Updated upstream
import { cacheInvalidate, CACHE_KEYS } from "@/lib/cache";
=======
import { cacheInvalidate } from "@/lib/cache";
>>>>>>> Stashed changes
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
  const { title, description, category, subcategory, icon, color, level } = body;
  if (!title) return NextResponse.json({ error: "Titre requis" }, { status: 400 });
  const bank = await db.questionBank.create({
    data: { title, description: description || "", category: category || "Divers", subcategory: subcategory || "", icon: icon || "BookOpen", color: color || "emerald", level: level || "TOUS" },
  });
<<<<<<< Updated upstream
  cacheInvalidate(CACHE_KEYS.banksList);
=======
  cacheInvalidate("banks:list");
>>>>>>> Stashed changes
  return NextResponse.json(bank);
}

export async function PATCH(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const body = await request.json();
  const { id, title, description, category, subcategory, icon, color, level } = body;
  if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });
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
    },
  });
<<<<<<< Updated upstream
  cacheInvalidate(CACHE_KEYS.banksList);
=======
  cacheInvalidate("banks:list");
  cacheInvalidate(`bank:${id}`);
>>>>>>> Stashed changes
  return NextResponse.json(bank);
}

export async function DELETE(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });
<<<<<<< Updated upstream
  await db.questionBank.delete({ where: { id } });
  cacheInvalidate(CACHE_KEYS.banksList);
=======
  await db.questionBank.delete({ where: { id } }).catch(() => {});
  cacheInvalidate("banks:list");
  cacheInvalidate(`bank:${id}`);
>>>>>>> Stashed changes
  return NextResponse.json({ success: true });
}
