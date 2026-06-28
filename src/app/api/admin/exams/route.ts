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

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const exams = await db.exam.findMany({
    include: { _count: { select: { examQuestions: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(exams);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { title, description, durationMin, distributions, questionIds } = body;

    if (!title) {
      return NextResponse.json({ error: "title required" }, { status: 400 });
    }

    const allQuestions: Array<{ id: string; order: number }> = [];
    let order = 0;

    // Mode 1: explicit list of question IDs (drag & drop order preserved)
    if (Array.isArray(questionIds) && questionIds.length > 0) {
      // Verify the questions exist
      const valid = await db.question.findMany({
        where: { id: { in: questionIds } },
        select: { id: true },
      });
      const validSet = new Set(valid.map((q) => q.id));
      for (const qid of questionIds) {
        if (validSet.has(qid)) {
          allQuestions.push({ id: qid, order: order++ });
        }
      }
    } else if (Array.isArray(distributions) && distributions.length > 0) {
      // Mode 2: distribution by bank (random pick within each bank)
      for (const dist of distributions) {
        const { bankId, count } = dist;
        if (!bankId || !count) continue;
        const questions = await db.question.findMany({ where: { bankId }, select: { id: true } });
        const shuffled = [...questions].sort(() => Math.random() - 0.5);
        const picked = shuffled.slice(0, Math.min(count, shuffled.length));
        for (const q of picked) {
          allQuestions.push({ id: q.id, order: order++ });
        }
      }
    } else {
      return NextResponse.json(
        { error: "questionIds[] or distributions[] required" },
        { status: 400 }
      );
    }

    if (allQuestions.length === 0) {
      return NextResponse.json({ error: "Aucune question trouvée" }, { status: 400 });
    }

    const exam = await db.exam.create({
      data: {
        title, description: description ?? "", durationMin: durationMin ?? 60,
        examQuestions: { create: allQuestions.map((q) => ({ questionId: q.id, order: q.order })) },
      },
      include: { _count: { select: { examQuestions: true } } },
    });

<<<<<<< Updated upstream
    cacheInvalidate(CACHE_KEYS.examsList);
=======
    cacheInvalidate("exams:list");
>>>>>>> Stashed changes
    return NextResponse.json(exam);
  } catch (error) {
    console.error("Failed to create exam:", error);
    return NextResponse.json({ error: "Failed to create exam" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get("id");
    if (!examId) return NextResponse.json({ error: "id required" }, { status: 400 });
<<<<<<< Updated upstream
    await db.exam.delete({ where: { id: examId } });
    cacheInvalidate(CACHE_KEYS.examsList);
=======
    await db.exam.delete({ where: { id: examId } }).catch(() => {});
    cacheInvalidate("exams:list");
    cacheInvalidate(`exam:${examId}`);
>>>>>>> Stashed changes
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete exam" }, { status: 500 });
  }
}
