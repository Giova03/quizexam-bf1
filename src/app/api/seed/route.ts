import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as fs from "fs";
import * as path from "path";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface SeedQuestion {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: "A" | "B" | "C" | "D";
  explanation: string;
}

interface SeedBank {
  bankKey: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  questions: SeedQuestion[];
}

const BANKS_DIR = "/home/z/my-project/scripts/generated/banks";

// Exam compositions: each exam draws questions from one or more banks.
// We build 50-question exams by sampling across banks.
const EXAM_DEFS = [
  {
    title: "Examen Blanc — Concours Administratif (50 questions)",
    description: "Culture générale, histoire, géographie, français et logique. Idéal pour les concours de la fonction publique.",
    durationMin: 60,
    distribution: [
      { bankKey: "culture-bf", count: 14 },
      { bankKey: "histoire", count: 10 },
      { bankKey: "geographie", count: 10 },
      { bankKey: "francais", count: 9 },
      { bankKey: "psycho-logique", count: 7 },
    ] as Array<{ bankKey: string; count: number }>,
  },
  {
    title: "Examen Blanc — Tests Psychotechniques (50 questions)",
    description: "Logique, suites numériques, vocabulaire et orthographe.",
    durationMin: 50,
    distribution: [
      { bankKey: "psycho-logique", count: 25 },
      { bankKey: "psycho-vocabulaire", count: 25 },
    ] as Array<{ bankKey: string; count: number }>,
  },
  {
    title: "Examen Blanc — Culture Générale & Économie (50 questions)",
    description: "Culture générale du BF, économie, développement durable et sciences de la Terre.",
    durationMin: 60,
    distribution: [
      { bankKey: "culture-bf", count: 15 },
      { bankKey: "economie", count: 15 },
      { bankKey: "geographie", count: 12 },
      { bankKey: "histoire", count: 8 },
    ] as Array<{ bankKey: string; count: number }>,
  },
  {
    title: "Examen Blanc — Sciences & SVT (50 questions)",
    description: "SVT, physique-chimie, mathématiques et médecine de base.",
    durationMin: 60,
    distribution: [
      { bankKey: "svt-lycee", count: 13 },
      { bankKey: "svt-6e-termd", count: 12 },
      { bankKey: "physique-chimie-lycee", count: 13 },
      { bankKey: "medecine-bases", count: 12 },
    ] as Array<{ bankKey: string; count: number }>,
  },
  {
    title: "Examen Blanc — Informatique & Réseaux (50 questions)",
    description: "Algorithmique, Python, bases de données, réseaux, télécoms et sécurité.",
    durationMin: 60,
    distribution: [
      { bankKey: "info-algorithmique", count: 10 },
      { bankKey: "info-python", count: 10 },
      { bankKey: "info-bdd", count: 10 },
      { bankKey: "reseau-telecom", count: 10 },
      { bankKey: "securite-informatique", count: 10 },
    ] as Array<{ bankKey: string; count: number }>,
  },
  {
    title: "Examen Blanc — Mathématiques (50 questions)",
    description: "Maths collège, lycée, analyse, probabilités et statistiques.",
    durationMin: 60,
    distribution: [
      { bankKey: "math-college", count: 12 },
      { bankKey: "math-lycee", count: 13 },
      { bankKey: "math-analyse", count: 8 },
      { bankKey: "math-proba-stats", count: 9 },
      { bankKey: "statistique", count: 8 },
    ] as Array<{ bankKey: string; count: number }>,
  },
  {
    title: "Examen Blanc — Lettres & Sciences Humaines (40 questions)",
    description: "Français, littérature, philosophie, histoire et culture du monde.",
    durationMin: 50,
    distribution: [
      { bankKey: "francais", count: 10 },
      { bankKey: "philo-terminale", count: 10 },
      { bankKey: "histoire-monde", count: 10 },
      { bankKey: "culture-generale-monde", count: 10 },
    ] as Array<{ bankKey: string; count: number }>,
  },
  {
    title: "Examen Blanc — Concours Santé & Social (40 questions)",
    description: "Santé publique, action sociale, genre, SVT et médecine.",
    durationMin: 50,
    distribution: [
      { bankKey: "concours-sante-social", count: 15 },
      { bankKey: "medecine-bases", count: 10 },
      { bankKey: "svt-lycee", count: 8 },
      { bankKey: "svt-6e-termd", count: 7 },
    ] as Array<{ bankKey: string; count: number }>,
  },
  {
    title: "Examen Blanc — Culture Pop & Actualité (30 questions)",
    description: "Culture populaire, actualité mondiale, diplomatie et MPSR 2.",
    durationMin: 30,
    distribution: [
      { bankKey: "culture-populaire", count: 10 },
      { bankKey: "actualite-mondiale", count: 8 },
      { bankKey: "diplomatie-mondiale", count: 6 },
      { bankKey: "mpsr2-faits", count: 6 },
    ] as Array<{ bankKey: string; count: number }>,
  },
  {
    title: "Examen Express — Toutes Matières (25 questions)",
    description: "Examen court couvrant les principales matières en 30 minutes.",
    durationMin: 30,
    distribution: [
      { bankKey: "culture-bf", count: 5 },
      { bankKey: "histoire", count: 3 },
      { bankKey: "francais", count: 3 },
      { bankKey: "geographie", count: 3 },
      { bankKey: "math-lycee", count: 3 },
      { bankKey: "svt-lycee", count: 3 },
      { bankKey: "economie", count: 2 },
      { bankKey: "culture-populaire", count: 3 },
    ] as Array<{ bankKey: string; count: number }>,
  },
];

function readBankFiles(): SeedBank[] {
  const banks: SeedBank[] = [];
  if (!fs.existsSync(BANKS_DIR)) {
    return banks;
  }
  const files = fs
    .readdirSync(BANKS_DIR)
    .filter((f) => f.endsWith(".json") && f !== "summary.json");
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(BANKS_DIR, file), "utf-8");
      const bank = JSON.parse(raw) as SeedBank;
      if (bank.questions && bank.questions.length > 0) {
        banks.push(bank);
      }
    } catch (e) {
      console.error(`Failed to read bank file ${file}:`, e);
    }
  }
  return banks;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      reset?: boolean;
    };
    const reset = body.reset === true;

    // Optionally wipe existing data
    if (reset) {
      await db.sessionAnswer.deleteMany();
      await db.quizSession.deleteMany();
      await db.examQuestion.deleteMany();
      await db.exam.deleteMany();
      await db.question.deleteMany();
      await db.questionBank.deleteMany();
      await db.document.deleteMany();
    } else {
      // If banks already exist, don't reseed
      const existingCount = await db.questionBank.count();
      if (existingCount > 0) {
        return NextResponse.json({
          message: "Database already seeded",
          banks: existingCount,
        });
      }
    }

    const seedBanks = readBankFiles();
    if (seedBanks.length === 0) {
      return NextResponse.json(
        { error: "No bank JSON files found. Run the generation script first." },
        { status: 400 }
      );
    }

    const bankIdMap = new Map<string, string>();
    let totalQuestions = 0;

    // Create banks and questions
    for (const seedBank of seedBanks) {
      const bank = await db.questionBank.create({
        data: {
          title: seedBank.title,
          description: seedBank.description,
          category: seedBank.category,
          icon: seedBank.icon,
          color: seedBank.color,
          questions: {
            create: seedBank.questions.map((q, idx) => ({
              order: idx,
              question: q.question,
              optionA: q.optionA,
              optionB: q.optionB,
              optionC: q.optionC,
              optionD: q.optionD,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
            })),
          },
        },
      });
      bankIdMap.set(seedBank.bankKey, bank.id);
      totalQuestions += seedBank.questions.length;
    }

    // Create exams by sampling from banks
    // Fetch all questions per bank to sample from
    const examResults: Array<{ title: string; count: number }> = [];
    for (const examDef of EXAM_DEFS) {
      const selectedQuestions: Array<{ questionId: string; order: number }> =
        [];
      let order = 0;

      for (const dist of examDef.distribution) {
        const bankId = bankIdMap.get(dist.bankKey);
        if (!bankId) {
          console.warn(`Bank ${dist.bankKey} not found for exam ${examDef.title}`);
          continue;
        }
        const questions = await db.question.findMany({
          where: { bankId },
          select: { id: true },
        });
        const sampled = shuffle(questions).slice(0, dist.count);
        for (const q of sampled) {
          selectedQuestions.push({ questionId: q.id, order: order++ });
        }
      }

      if (selectedQuestions.length === 0) {
        continue;
      }

      const exam = await db.exam.create({
        data: {
          title: examDef.title,
          description: examDef.description,
          durationMin: examDef.durationMin,
          examQuestions: {
            create: selectedQuestions.map((sq) => ({
              questionId: sq.questionId,
              order: sq.order,
            })),
          },
        },
      });
      examResults.push({ title: exam.title, count: selectedQuestions.length });
    }

    return NextResponse.json({
      message: "Database seeded successfully",
      banksCreated: seedBanks.length,
      questionsCreated: totalQuestions,
      examsCreated: examResults,
    });
  } catch (error) {
    console.error("Seed failed:", error);
    return NextResponse.json(
      {
        error: "Seed failed",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
