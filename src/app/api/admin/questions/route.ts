import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
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
  const { bankId, question, optionA, optionB, optionC, optionD, correctAnswer, correctAnswer2, explanation, level, difficulty } = body;
  if (!bankId || !question || !optionA || !optionB || !optionC || !optionD || !correctAnswer || !explanation)
    return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 });
  if (!["A", "B", "C", "D"].includes(correctAnswer))
    return NextResponse.json({ error: "Réponse correcte invalide" }, { status: 400 });
  // Validate difficulty (default to "medium" if absent or invalid).
  const validDifficulty =
    difficulty && ["easy", "medium", "hard"].includes(difficulty)
      ? difficulty
      : "medium";
  const count = await db.question.count({ where: { bankId } });
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
  return NextResponse.json(q);
}

export async function PATCH(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const body = await request.json();
  const { id, question, optionA, optionB, optionC, optionD, correctAnswer, correctAnswer2, explanation, difficulty } = body;
  if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });
  // Validate difficulty if provided.
  let difficultyUpdate: { difficulty?: string } = {};
  if (difficulty !== undefined) {
    if (!["easy", "medium", "hard"].includes(difficulty)) {
      return NextResponse.json({ error: "Difficulté invalide (easy, medium ou hard)" }, { status: 400 });
    }
    difficultyUpdate = { difficulty };
  }
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
  return NextResponse.json(updated);
}

export async function DELETE(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });
  await db.question.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
