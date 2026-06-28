import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { cacheInvalidate } from "@/lib/cache";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return null;
  }
  return session;
}

interface ImportQuestion {
  question?: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctAnswer?: string;
  correct?: string;
  answer?: string;
  explanation?: string;
  level?: string;
}

function pickCorrectAnswer(q: ImportQuestion): string | null {
  const raw = q.correctAnswer ?? q.correct ?? q.answer;
  if (!raw) return null;
  const letter = String(raw).trim().toUpperCase().match(/^[A-D]/);
  if (!letter) return null;
  return letter[0];
}

function validate(q: ImportQuestion): {
  ok: boolean;
  error?: string;
  cleaned?: {
    question: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctAnswer: string;
    explanation: string;
    level: string;
  };
} {
  const question = (q.question ?? "").trim();
  const optionA = (q.optionA ?? "").trim();
  const optionB = (q.optionB ?? "").trim();
  const optionC = (q.optionC ?? "").trim();
  const optionD = (q.optionD ?? "").trim();
  const correctAnswer = pickCorrectAnswer(q);
  const explanation = (q.explanation ?? "").trim();
  const level = (q.level ?? "TOUS").trim() || "TOUS";

  if (!question) return { ok: false, error: "Question vide" };
  if (!optionA || !optionB || !optionC || !optionD) {
    return { ok: false, error: "Options incomplètes (4 requises A-D)" };
  }
  if (!correctAnswer) {
    return { ok: false, error: "Réponse correcte invalide (A, B, C ou D)" };
  }
  if (!explanation) {
    return { ok: false, error: "Explication manquante" };
  }
  const opts = [optionA, optionB, optionC, optionD].map((s) => s.toLowerCase());
  if (new Set(opts).size < 4) {
    return { ok: false, error: "Options dupliquées" };
  }
  return {
    ok: true,
    cleaned: {
      question,
      optionA,
      optionB,
      optionC,
      optionD,
      correctAnswer,
      explanation,
      level,
    },
  };
}

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { questions, bankId } = body as {
      questions?: ImportQuestion[];
      bankId?: string;
    };

    if (!bankId) {
      return NextResponse.json({ error: "bankId requis" }, { status: 400 });
    }
    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { error: "questions[] doit être un tableau non vide" },
        { status: 400 }
      );
    }
    if (questions.length > 500) {
      return NextResponse.json(
        { error: "Trop de questions à la fois (max 500)" },
        { status: 400 }
      );
    }

    const bank = await db.questionBank.findUnique({
      where: { id: bankId },
      select: { id: true, title: true },
    });
    if (!bank) {
      return NextResponse.json({ error: "Banque introuvable" }, { status: 404 });
    }

    const results: Array<{
      index: number;
      ok: boolean;
      error?: string;
      questionId?: string;
    }> = [];
    let success = 0;
    let failure = 0;
    const toCreate: Array<{
      question: string;
      optionA: string;
      optionB: string;
      optionC: string;
      optionD: string;
      correctAnswer: string;
      explanation: string;
      level: string;
      order: number;
    }> = [];

    // Existing count for ordering offset
    const existingCount = await db.question.count({ where: { bankId } });
    let nextOrder = existingCount;

    questions.forEach((q, index) => {
      const v = validate(q);
      if (!v.ok) {
        failure++;
        results.push({ index, ok: false, error: v.error });
      } else {
        toCreate.push({ ...v.cleaned!, order: nextOrder++ });
        success++;
        results.push({ index, ok: true });
      }
    });

    // Batch insert valid questions
    if (toCreate.length > 0) {
      await db.question.createMany({
        data: toCreate.map((q) => ({ bankId, ...q })),
      });
      // Invalide le cache des banques (liste + cette banque spécifique)
      cacheInvalidate("banks:list");
      cacheInvalidate(`bank:${bankId}`);
    }

    return NextResponse.json({
      bankId,
      bankTitle: bank.title,
      total: questions.length,
      success,
      failure,
      results,
    });
  } catch (error) {
    console.error("Import questions error:", error);
    return NextResponse.json(
      { error: "Échec de l'import en masse" },
      { status: 500 }
    );
  }
}
