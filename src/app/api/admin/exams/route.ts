import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

<<<<<<< HEAD
// GET - list all exams with their question count
=======
>>>>>>> 2537018 (feat: Notifications temps réel + correction responsive + chatbot fix + 10 nouvelles fonctionnalités)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
<<<<<<< HEAD

  const exams = await db.exam.findMany({
    include: {
      _count: { select: { examQuestions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(exams);
}

// POST - create a new exam from selected banks
=======
  const exams = await db.exam.findMany({
    include: { _count: { select: { examQuestions: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(exams);
}

>>>>>>> 2537018 (feat: Notifications temps réel + correction responsive + chatbot fix + 10 nouvelles fonctionnalités)
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    const { title, description, durationMin, distributions } = await request.json();
    if (!title || !distributions || !Array.isArray(distributions)) {
<<<<<<< HEAD
      return NextResponse.json(
        { error: "title and distributions required" },
        { status: 400 }
      );
    }

    // Collect questions from each bank
=======
      return NextResponse.json({ error: "title and distributions required" }, { status: 400 });
    }

>>>>>>> 2537018 (feat: Notifications temps réel + correction responsive + chatbot fix + 10 nouvelles fonctionnalités)
    const allQuestions: Array<{ id: string; order: number }> = [];
    let order = 0;

    for (const dist of distributions) {
      const { bankId, count } = dist;
      if (!bankId || !count) continue;
<<<<<<< HEAD

      const questions = await db.question.findMany({
        where: { bankId },
        select: { id: true },
      });

      // Shuffle and pick
      const shuffled = [...questions].sort(() => Math.random() - 0.5);
      const picked = shuffled.slice(0, Math.min(count, shuffled.length));

=======
      const questions = await db.question.findMany({ where: { bankId }, select: { id: true } });
      const shuffled = [...questions].sort(() => Math.random() - 0.5);
      const picked = shuffled.slice(0, Math.min(count, shuffled.length));
>>>>>>> 2537018 (feat: Notifications temps réel + correction responsive + chatbot fix + 10 nouvelles fonctionnalités)
      for (const q of picked) {
        allQuestions.push({ id: q.id, order: order++ });
      }
    }

    if (allQuestions.length === 0) {
<<<<<<< HEAD
      return NextResponse.json(
        { error: "Aucune question trouvée pour les banques sélectionnées" },
        { status: 400 }
      );
=======
      return NextResponse.json({ error: "Aucune question trouvée" }, { status: 400 });
>>>>>>> 2537018 (feat: Notifications temps réel + correction responsive + chatbot fix + 10 nouvelles fonctionnalités)
    }

    const exam = await db.exam.create({
      data: {
<<<<<<< HEAD
        title,
        description: description ?? "",
        durationMin: durationMin ?? 60,
        examQuestions: {
          create: allQuestions.map((q) => ({
            questionId: q.id,
            order: q.order,
          })),
        },
      },
      include: {
        _count: { select: { examQuestions: true } },
      },
=======
        title, description: description ?? "", durationMin: durationMin ?? 60,
        examQuestions: { create: allQuestions.map((q) => ({ questionId: q.id, order: q.order })) },
      },
      include: { _count: { select: { examQuestions: true } } },
>>>>>>> 2537018 (feat: Notifications temps réel + correction responsive + chatbot fix + 10 nouvelles fonctionnalités)
    });

    return NextResponse.json(exam);
  } catch (error) {
    console.error("Failed to create exam:", error);
<<<<<<< HEAD
    return NextResponse.json(
      { error: "Failed to create exam" },
      { status: 500 }
    );
  }
}

// DELETE - delete an exam
=======
    return NextResponse.json({ error: "Failed to create exam" }, { status: 500 });
  }
}

>>>>>>> 2537018 (feat: Notifications temps réel + correction responsive + chatbot fix + 10 nouvelles fonctionnalités)
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get("id");
<<<<<<< HEAD
    if (!examId) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    await db.exam.delete({ where: { id: examId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete exam:", error);
    return NextResponse.json(
      { error: "Failed to delete exam" },
      { status: 500 }
    );
=======
    if (!examId) return NextResponse.json({ error: "id required" }, { status: 400 });
    await db.exam.delete({ where: { id: examId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete exam" }, { status: 500 });
>>>>>>> 2537018 (feat: Notifications temps réel + correction responsive + chatbot fix + 10 nouvelles fonctionnalités)
  }
}
