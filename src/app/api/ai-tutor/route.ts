import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import ZAI from "z-ai-web-dev-sdk";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserTier } from "@/lib/subscription-limits";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface TutorBody {
  userId?: string;
  question: string;
  userHistory?: Array<{
    questionText: string;
    correctAnswer: string;
    userAnswer: string | null;
    isCorrect: boolean | null;
    bankTitle?: string;
  }>;
}

/**
 * Build a compact "weak areas" summary from the user's session answers.
 * Groups wrong/skipped answers by bank title, picks the top 3 banks with
 * the most errors, and lists up to 3 sample wrong questions per bank.
 */
function buildWeakAreasSummary(
  history: NonNullable<TutorBody["userHistory"]>
): string {
  if (history.length === 0) return "Aucun historique disponible.";
  const wrong = history.filter(
    (a) => a.isCorrect === false || a.userAnswer === null
  );
  if (wrong.length === 0) {
    return "Aucune erreur récente — l'utilisateur maîtrise bien les sujets abordés.";
  }
  const byBank = new Map<string, typeof wrong>();
  for (const w of wrong) {
    const key = w.bankTitle || "Banque inconnue";
    if (!byBank.has(key)) byBank.set(key, []);
    byBank.get(key)!.push(w);
  }
  const ranked = Array.from(byBank.entries())
    .map(([bank, items]) => ({ bank, items }))
    .sort((a, b) => b.items.length - a.items.length)
    .slice(0, 3);
  const lines = ranked.map((r) => {
    const samples = r.items
      .slice(0, 3)
      .map(
        (w) =>
          `  • "${w.questionText.slice(0, 90)}${w.questionText.length > 90 ? "…" : ""}" → bonne réponse: ${w.correctAnswer}`
      )
      .join("\n");
    return `- ${r.bank} (${r.items.length} erreur(s)):\n${samples}`;
  });
  return lines.join("\n");
}

const SYSTEM_PROMPT = `Tu es le Tuteur IA de QuizExam BF, une plateforme burkinabè de préparation aux concours.
Tu es bienveillant, pédagogue et précis. Tu réponds en français.

TON RÔLE :
1. Répondre aux questions de cours (histoire, géographie, sciences, droit, lettres, mathématiques, actualité du Burkina Faso et du monde).
2. Analyser les zones de faiblesse de l'utilisateur à partir de son historique de réponses.
3. Proposer des recommandations concrètes : quelles banques réviser, quels exercices faire, quelles notions approfondir.

STYLE :
- Sois concis (max 250 mots).
- Utilise des puces (•) pour les recommandations.
- Cite des notions vérifiables (président du Faso, AES, FESPACO, etc.) quand pertinent.
- Si la question sort de ton domaine, dis-le simplement et propose une alternative.`;

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentification requise" },
        { status: 401 }
      );
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, name: true },
    });
    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    // Freemium gate: AI Tutor is Premium-only.
    const tier = await getUserTier(user.id);
    if (tier !== "premium" && tier !== "admin") {
      return NextResponse.json(
        {
          error:
            "Le Tuteur IA est réservé aux membres Premium. Passez à Premium pour l'utiliser.",
          code: "PREMIUM_REQUIRED",
        },
        { status: 403 }
      );
    }

    const body = (await request.json()) as TutorBody;
    const question = (body.question ?? "").trim();
    if (!question) {
      return NextResponse.json(
        { error: "Question manquante" },
        { status: 400 }
      );
    }
    if (question.length > 1000) {
      return NextResponse.json(
        { error: "Question trop longue (max 1000 caractères)" },
        { status: 400 }
      );
    }

    // If the client didn't send a userHistory, fetch the most recent wrong
    // answers from the DB so the tutor always has context.
    let userHistory = body.userHistory;
    if (!userHistory) {
      const recentSessions = await db.quizSession.findMany({
        where: { userId: user.id, completedAt: { not: null } },
        orderBy: { startedAt: "desc" },
        take: 5,
        select: {
          title: true,
          answers: {
            select: {
              questionText: true,
              correctAnswer: true,
              userAnswer: true,
              isCorrect: true,
            },
            take: 20,
          },
        },
      });
      userHistory = recentSessions.flatMap((s) =>
        s.answers.map((a) => ({
          ...a,
          bankTitle: s.title,
        }))
      );
    }

    const weakAreas = buildWeakAreasSummary(userHistory ?? []);

    const messages = [
      {
        role: "system" as const,
        content: `${SYSTEM_PROMPT}

[Contexte utilisateur]
- Nom: ${user.name}
- Zones de faiblesse identifiées:
${weakAreas}

Réponds à la question en tenant compte de ce contexte. Si la question porte sur une zone de faiblesse, propose une explication pédagogique et un exercice pratique.`,
      },
      { role: "user" as const, content: question },
    ];

    let answer: string | null = null;
    try {
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages,
        thinking: { type: "disabled" },
      });
      answer = completion?.choices?.[0]?.message?.content ?? null;
    } catch (aiError) {
      console.error("AI Tutor error:", aiError);
    }

    if (!answer) {
      // Friendly fallback so the UI still works if the AI provider is down.
      answer =
        `Je n'ai pas pu joindre le moteur IA pour le moment.\n\n` +
        `Voici ce que je peux vous proposer :\n` +
        `• Révisez vos zones de faiblesse identifiées ci-dessous.\n` +
        `• Refaites une session dans la banque concernée pour ancrer les notions.\n` +
        `• Utilisez la révision espacée pour mémoriser à long terme.\n\n` +
        `Zones de faiblesse:\n${weakAreas}`;
    }

    // Derive 3 simple next-action recommendations from the weak-areas map.
    const recommendations = deriveRecommendations(userHistory ?? []);

    return NextResponse.json({
      answer,
      recommendations,
      weakAreas,
      tier,
    });
  } catch (error) {
    console.error("AI Tutor route error:", error);
    return NextResponse.json(
      { error: "Échec du Tuteur IA" },
      { status: 500 }
    );
  }
}

function deriveRecommendations(
  history: NonNullable<TutorBody["userHistory"]>
): string[] {
  if (history.length === 0) {
    return [
      "Faites votre première session pour recevoir des recommandations personnalisées.",
    ];
  }
  const wrong = history.filter(
    (a) => a.isCorrect === false || a.userAnswer === null
  );
  if (wrong.length === 0) {
    return [
      "Continuez sur cette lancée — essayez une banque plus difficile.",
      "Participez au défi quotidien pour gagner 2× XP.",
    ];
  }
  const byBank = new Map<string, number>();
  for (const w of wrong) {
    const key = w.bankTitle || "Banque inconnue";
    byBank.set(key, (byBank.get(key) ?? 0) + 1);
  }
  const ranked = Array.from(byBank.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  return ranked.map(
    ([bank, count]) =>
      `Refaire une session dans « ${bank} » (${count} erreur(s) récente(s)).`
  );
}
