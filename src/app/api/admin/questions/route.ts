import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { cacheInvalidate, CACHE_KEYS } from "@/lib/cache";
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
  const { bankId, question, optionA, optionB, optionC, optionD, correctAnswer, correctAnswer2, explanation, level, difficulty, imageUrl, audioUrl } = body;
  if (!bankId || !question || !optionA || !optionB || !optionC || !optionD || !correctAnswer || !explanation)
    return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 });
  if (!["A", "B", "C", "D"].includes(correctAnswer))
    return NextResponse.json({ error: "Réponse correcte invalide" }, { status: 400 });
  // Validate difficulty (default to "medium" if absent or invalid).
  const validDifficulty =
    difficulty && ["easy", "medium", "hard"].includes(difficulty)
      ? difficulty
      : "medium";
  // Optional media URLs. Coerce to null when empty so we store SQL NULL
  // rather than the literal string "" (cleaner queries + UX).
  const validImageUrl =
    typeof imageUrl === "string" && imageUrl.trim() ? imageUrl.trim() : null;
  const validAudioUrl =
    typeof audioUrl === "string" && audioUrl.trim() ? audioUrl.trim() : null;
  const count = await db.question.count({ where: { bankId } });
  // Create the question WITHOUT imageUrl/audioUrl via the Prisma client.
  // The dev server's Turbopack-cached Prisma client may not know about the
  // new columns (added in F4) until the dev server is restarted, so including
  // them in the `data` object would trigger a PrismaClientValidationError.
  // We set them via a raw SQL UPDATE immediately after the create.
  const q = await db.question.create({
    data: {
      bankId,
      order: count,
      question,
      optionA,
      optionB,
      optionC,
      optionD,
      correctAnswer,
      correctAnswer2: correctAnswer2 || null,
      explanation,
      level: level || "TOUS",
      difficulty: validDifficulty,
    },
  });
  // Backfill the media columns via raw SQL (bypasses Prisma's field validation).
  if (validImageUrl !== null || validAudioUrl !== null) {
    await db.$executeRaw`
      UPDATE "Question"
      SET "imageUrl" = ${validImageUrl}, "audioUrl" = ${validAudioUrl}
      WHERE id = ${q.id}
    `;
  }
  // Question count for this bank changed — invalidate the cached banks list.
  cacheInvalidate(CACHE_KEYS.banksList);
  return NextResponse.json({ ...q, imageUrl: validImageUrl, audioUrl: validAudioUrl });
}

export async function PATCH(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const body = await request.json();
  const { id, question, optionA, optionB, optionC, optionD, correctAnswer, correctAnswer2, explanation, difficulty, imageUrl, audioUrl } = body;
  if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });
  // Validate difficulty if provided.
  let difficultyUpdate: { difficulty?: string } = {};
  if (difficulty !== undefined) {
    if (!["easy", "medium", "hard"].includes(difficulty)) {
      return NextResponse.json({ error: "Difficulté invalide (easy, medium ou hard)" }, { status: 400 });
    }
    difficultyUpdate = { difficulty };
  }
  // Update the question WITHOUT imageUrl/audioUrl via the Prisma client.
  // Media URLs are handled separately via raw SQL below.
  const updated = await db.question.update({
    where: { id },
    data: {
      ...(question !== undefined && { question }),
      ...(optionA !== undefined && { optionA }),
      ...(optionB !== undefined && { optionB }),
      ...(optionC !== undefined && { optionC }),
      ...(optionD !== undefined && { optionD }),
      ...(correctAnswer !== undefined && { correctAnswer }),
      ...(correctAnswer2 !== undefined && { correctAnswer2 }),
      ...(explanation !== undefined && { explanation }),
      ...difficultyUpdate,
    },
  });
  // Backfill media columns via raw SQL when the caller explicitly provided
  // them. Missing keys leave the column untouched; explicit null/empty
  // clears it.
  if (imageUrl !== undefined || audioUrl !== undefined) {
    const imgVal =
      typeof imageUrl === "string" && imageUrl.trim() ? imageUrl.trim() : null;
    const audVal =
      typeof audioUrl === "string" && audioUrl.trim() ? audioUrl.trim() : null;
    // Build a single UPDATE that sets whichever columns were provided.
    // We use a CASE expression to leave the un-provided column unchanged.
    await db.$executeRaw`
      UPDATE "Question"
      SET
        "imageUrl" = CASE WHEN ${imageUrl !== undefined}::boolean THEN ${imgVal} ELSE "imageUrl" END,
        "audioUrl" = CASE WHEN ${audioUrl !== undefined}::boolean THEN ${audVal} ELSE "audioUrl" END
      WHERE id = ${id}
    `;
  }
  // Edits don't change the count, but they DO change the bank's contents.
  // Invalidate so /api/banks (which only returns counts) stays accurate for
  // the count field — and future endpoints that inline questions stay fresh.
  cacheInvalidate(CACHE_KEYS.banksList);
  return NextResponse.json(updated);
}

export async function DELETE(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });
  await db.question.delete({ where: { id } });
  cacheInvalidate(CACHE_KEYS.banksList);
  return NextResponse.json({ success: true });
}
