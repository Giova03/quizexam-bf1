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
  /**
   * Mode selector (added in E2):
   *   - "chat"     (default): ask the tutor a question — uses AI.
   *   - "analyze"            : return a structured weak/strong-areas
   *                            analysis with recommendations (no AI call).
   *
   * Backward-compat: when `question` is present, the route behaves as
   * before (chat mode), regardless of `mode`. The `analyze` mode is only
   * triggered when the client explicitly asks for it AND no `question`
   * is supplied (or `question` is the literal "analyze").
   */
  mode?: "chat" | "analyze";
}

// --- Shared types for the analysis payload -----------------------------
interface WeakArea {
  bank: string;
  category: string;
  wrongRate: number; // 0-100
  total: number;
}

interface StrongArea {
  bank: string;
  category: string;
  successRate: number; // 0-100
  total: number;
}

interface AnalysisResponse {
  weakAreas: WeakArea[];
  strongAreas: StrongArea[];
  recommendations: string[];
  summary: string;
}

/**
 * Build a compact "weak areas" summary from the user's session answers.
 * Groups wrong/skipped answers by bank title, picks the top 3 banks with
 * the most errors, and lists up to 3 sample wrong questions per bank.
 */
function buildWeakAreasSummary(
  history: NonNullable<TutorBody["userHistory"]>,
): string {
  if (history.length === 0) return "Aucun historique disponible.";
  const wrong = history.filter(
    (a) => a.isCorrect === false || a.userAnswer === null,
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
          `  • "${w.questionText.slice(0, 90)}${w.questionText.length > 90 ? "…" : ""}" → bonne réponse: ${w.correctAnswer}`,
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

// ---------------------------------------------------------------------------
// Analysis helpers
// ---------------------------------------------------------------------------

interface AnalysisSessionRow {
  id: string;
  title: string;
  score: number;
  totalQuestions: number;
  startedAt: Date;
  sourceType: string;
  sourceId: string;
  answers: Array<{
    isCorrect: boolean | null;
    userAnswer: string | null;
  }>;
}

interface BankInfo {
  id: string;
  title: string;
  category: string;
}

/**
 * Fetch the user's recent completed sessions with their answers, plus a
 * lookup of bank info (title + category) keyed by bank id. Sessions store
 * `sourceId` (bank or exam id) + `sourceType` ("bank" | "exam").
 */
async function fetchAnalysisData(userId: string): Promise<{
  sessions: AnalysisSessionRow[];
  banks: Map<string, BankInfo>;
}> {
  const sessions = (await db.quizSession.findMany({
    where: { userId, completedAt: { not: null } },
    orderBy: { startedAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      score: true,
      totalQuestions: true,
      startedAt: true,
      sourceType: true,
      sourceId: true,
      answers: {
        select: { isCorrect: true, userAnswer: true },
      },
    },
  })) as AnalysisSessionRow[];

  const bankIds = new Set<string>();
  for (const s of sessions) {
    if (s.sourceType === "bank") bankIds.add(s.sourceId);
  }
  const bankRows = await db.questionBank.findMany({
    where: { id: { in: Array.from(bankIds) } },
    select: { id: true, title: true, category: true },
  });
  const banks = new Map<string, BankInfo>();
  for (const b of bankRows) {
    banks.set(b.id, { id: b.id, title: b.title, category: b.category });
  }
  return { sessions, banks };
}

/**
 * Compute weak/strong areas + recommendations from the user's sessions.
 *
 * A "weak area" is a bank where the user's wrong rate is ≥ 30% on at least
 * 5 answered questions. A "strong area" is a bank where the success rate
 * is ≥ 70% on at least 5 answered questions.
 */
function analyzePerformance(
  sessions: AnalysisSessionRow[],
  banks: Map<string, BankInfo>,
): AnalysisResponse {
  // Aggregate per-bank stats.
  const perBank = new Map<
    string,
    { bank: BankInfo; correct: number; wrong: number; skipped: number }
  >();

  for (const s of sessions) {
    if (s.sourceType !== "bank") continue;
    const info = banks.get(s.sourceId);
    if (!info) continue;
    const cur =
      perBank.get(s.sourceId) ?? {
        bank: info,
        correct: 0,
        wrong: 0,
        skipped: 0,
      };
    for (const a of s.answers) {
      if (a.isCorrect === true) cur.correct++;
      else if (a.isCorrect === false) cur.wrong++;
      else cur.skipped++;
    }
    perBank.set(s.sourceId, cur);
  }

  const weakAreas: WeakArea[] = [];
  const strongAreas: StrongArea[] = [];

  for (const { bank, correct, wrong, skipped } of perBank.values()) {
    const total = correct + wrong + skipped;
    if (total < 5) continue; // not enough data
    const wrongRate = Math.round(((wrong + skipped) / total) * 100);
    const successRate = Math.round((correct / total) * 100);

    if (wrongRate >= 30) {
      weakAreas.push({
        bank: bank.title,
        category: bank.category,
        wrongRate,
        total,
      });
    }
    if (successRate >= 70) {
      strongAreas.push({
        bank: bank.title,
        category: bank.category,
        successRate,
        total,
      });
    }
  }

  // Sort: worst wrong rate first for weak; best success rate first for strong.
  weakAreas.sort((a, b) => b.wrongRate - a.wrongRate);
  strongAreas.sort((a, b) => b.successRate - a.successRate);

  // Build recommendations.
  const recommendations: string[] = [];

  if (weakAreas.length === 0 && strongAreas.length === 0) {
    recommendations.push(
      "Continuez à faire des sessions — vous n'avez pas encore assez d'historique pour des recommandations ciblées.",
    );
  } else {
    // 1) Top weak area → recommend refaire une session.
    if (weakAreas[0]) {
      recommendations.push(
        `Vous ratez ${weakAreas[0].wrongRate}% des questions en « ${weakAreas[0].bank} » — révisez ce module en priorité (mode correction immédiate).`,
      );
    }
    if (weakAreas[1]) {
      recommendations.push(
        `Travaillez aussi « ${weakAreas[1].bank} » (${weakAreas[1].wrongRate}% d'erreur) pour élargir vos bases.`,
      );
    }

    // 2) Top strong area → encourage to maintain / go harder.
    if (strongAreas[0]) {
      recommendations.push(
        `Vos meilleures performances sont en « ${strongAreas[0].bank} » (${strongAreas[0].successRate}% de réussite) — essayez des questions plus difficiles pour vous challenger.`,
      );
    }

    // 3) Daily challenge reminder.
    recommendations.push(
      "Participez au défi du jour pour gagner 2× XP et tester votre polyvalence.",
    );

    // 4) Spaced repetition reminder for the worst weak area.
    if (weakAreas[0]) {
      recommendations.push(
        `Ajoutez vos erreurs de « ${weakAreas[0].bank} » à la révision espacée pour les mémoriser à long terme.`,
      );
    }
  }

  // Build a short human-readable summary.
  let summary: string;
  if (perBank.size === 0) {
    summary =
      "Vous n'avez pas encore de session terminée sur une banque de questions.";
  } else {
    const totalCorrect = Array.from(perBank.values()).reduce(
      (s, v) => s + v.correct,
      0,
    );
    const totalAnswered = Array.from(perBank.values()).reduce(
      (s, v) => s + v.correct + v.wrong,
      0,
    );
    const overallPct =
      totalAnswered > 0
        ? Math.round((totalCorrect / totalAnswered) * 100)
        : 0;
    summary = `Sur ${perBank.size} banque(s) abordée(s), votre taux de réussite global est de ${overallPct}%. ${
      weakAreas.length > 0
        ? `${weakAreas.length} zone(s) de faiblesse identifiée(s).`
        : "Aucune zone de faiblesse majeure."
    } ${
      strongAreas.length > 0
        ? `${strongAreas.length} point(s) fort(s) à exploiter.`
        : ""
    }`.trim();
  }

  return {
    weakAreas: weakAreas.slice(0, 5),
    strongAreas: strongAreas.slice(0, 5),
    recommendations,
    summary,
  };
}

// ---------------------------------------------------------------------------
// Main route handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentification requise" },
        { status: 401 },
      );
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, name: true },
    });
    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 },
      );
    }

    // Freemium gate: AI Tutor chat is Premium-only. The analyze mode is
    // available to everyone because it doesn't call the LLM (it's pure
    // arithmetic on the user's session history).
    const tier = await getUserTier(user.id);

    const body = (await request.json().catch(() => ({}))) as TutorBody;
    const question = (body.question ?? "").trim();
    const wantAnalyze =
      body.mode === "analyze" && (question === "" || question === "analyze");

    // --- Mode: analyze ----------------------------------------------------
    if (wantAnalyze) {
      const { sessions, banks } = await fetchAnalysisData(user.id);
      const analysis = analyzePerformance(sessions, banks);
      return NextResponse.json({ ...analysis, tier });
    }

    // --- Mode: chat (default, Premium-gated) ------------------------------
    if (tier !== "premium" && tier !== "admin") {
      return NextResponse.json(
        {
          error:
            "Le Tuteur IA est réservé aux membres Premium. Passez à Premium pour l'utiliser.",
          code: "PREMIUM_REQUIRED",
        },
        { status: 403 },
      );
    }

    if (!question) {
      return NextResponse.json(
        { error: "Question manquante" },
        { status: 400 },
      );
    }
    if (question.length > 1000) {
      return NextResponse.json(
        { error: "Question trop longue (max 1000 caractères)" },
        { status: 400 },
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
        })),
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
      { status: 500 },
    );
  }
}

/**
 * GET handler — convenience wrapper for the analyze mode.
 *
 * `GET /api/ai-tutor` returns the structured weak/strong-areas analysis
 * (same payload as `POST /api/ai-tutor` with `{ mode: "analyze" }`).
 * Useful for the dashboard which can fetch the analysis without crafting
 * a POST body.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentification requise" },
        { status: 401 },
      );
    }
    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 },
      );
    }
    const { sessions, banks } = await fetchAnalysisData(user.id);
    const analysis = analyzePerformance(sessions, banks);
    const tier = await getUserTier(user.id);
    return NextResponse.json({ ...analysis, tier });
  } catch (error) {
    console.error("AI Tutor GET error:", error);
    return NextResponse.json(
      { error: "Échec de l'analyse" },
      { status: 500 },
    );
  }
}

function deriveRecommendations(
  history: NonNullable<TutorBody["userHistory"]>,
): string[] {
  if (history.length === 0) {
    return [
      "Faites votre première session pour recevoir des recommandations personnalisées.",
    ];
  }
  const wrong = history.filter(
    (a) => a.isCorrect === false || a.userAnswer === null,
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
      `Refaire une session dans « ${bank} » (${count} erreur(s) récente(s)).`,
  );
}
