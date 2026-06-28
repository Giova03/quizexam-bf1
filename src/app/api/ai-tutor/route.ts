import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
<<<<<<< Updated upstream
import ZAI from "z-ai-web-dev-sdk";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserTier } from "@/lib/subscription-limits";
=======
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import ZAI from "z-ai-web-dev-sdk";
>>>>>>> Stashed changes

export const dynamic = "force-dynamic";
export const maxDuration = 60;

<<<<<<< Updated upstream
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

=======
interface WeakArea {
  bankId: string;
  bankTitle: string;
  category: string;
  total: number;
  correct: number;
  wrongQuestions: Array<{
    question: string;
    correctAnswer: string;
    userAnswer: string | null;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    explanation: string;
  }>;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * POST /api/ai-tutor
 *
 * Two modes (detected via body):
 *
 *  1. Chat mode (when `question` is provided):
 *     Body: { question: string, history?: ChatMessage[] }
 *     Returns: { answer: string, recommendations: string[] }
 *     The LLM is given the user's recent wrong-answer summary as context,
 *     so its answer is personalised.
 *
 *  2. Analysis mode (when `question` is absent or empty):
 *     Body: { limit?: number }
 *     Returns: { hasData, weakAreas, plan, ... }
 *     Generates a personalised study plan based on recent errors.
 *
 * Both modes fall back to a deterministic rule-based answer when the LLM
 * is unavailable, so the feature degrades gracefully.
 */
>>>>>>> Stashed changes
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
<<<<<<< Updated upstream
        { error: "Authentification requise" },
=======
        { error: "Non authentifié" },
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
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
=======
    const body = await request.json().catch(() => ({}));
    const question =
      typeof body?.question === "string" ? body.question.trim() : "";

    // ===== Chat mode =====
    if (question.length > 0) {
      return await handleChat(user, question, Array.isArray(body?.history) ? body.history : []);
    }

    // ===== Analysis mode =====
    const limit = Math.min(
      Math.max(Number(body?.limit ?? 30) || 30, 5),
      100
    );
    return await handleAnalysis(user, limit);
  } catch (error) {
    console.error("[ai-tutor] error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'analyse IA" },
>>>>>>> Stashed changes
      { status: 500 }
    );
  }
}

<<<<<<< Updated upstream
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
=======
// ---------------------------------------------------------------------------
// Chat mode
// ---------------------------------------------------------------------------

async function handleChat(
  user: { id: string; name: string },
  question: string,
  history: ChatMessage[]
) {
  // Trim history to last 8 messages to keep token usage reasonable.
  const safeHistory = history.slice(-8).filter(
    (m) =>
      m &&
      (m.role === "user" || m.role === "assistant") &&
      typeof m.content === "string"
  );

  // Build a compact context summary of the user's recent wrong answers
  // (last 15) so the LLM can personalise its answer.
  const contextSummary = await buildWeakAreasSummary(user.id, 15);

  const systemPrompt = `Tu es le Tuteur IA de la plateforme QuizExam BF (préparation aux concours du Burkina Faso). Tu réponds en français, de façon concise (max 250 mots), pédagogue et bienveillante.

${contextSummary ? `Profil de l'étudiant (${user.name}) :\n${contextSummary}\n` : ""}Quand cela est pertinent, propose des références aux banques de la plateforme, des méthodes de révision, ou des exemples concrets. Évite les longues introductions, va à l'essentiel.`;

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt },
    ...safeHistory.map((m) => ({
      role: m.role,
      content: m.content.slice(0, 1500),
    })),
    { role: "user", content: question.slice(0, 1500) },
  ];

  let answer = "";
  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: "disabled" },
    });
    answer = completion?.choices?.[0]?.message?.content?.trim() || "";
  } catch (aiError) {
    console.error("[ai-tutor] chat LLM error:", aiError);
  }

  if (!answer) {
    answer = fallbackChatAnswer(question);
  }

  // Light-weight recommendations: 3 generic next-steps based on the question.
  const recommendations = buildRecommendations(question);

  return NextResponse.json({
    mode: "chat",
    answer,
    recommendations,
  });
}

function fallbackChatAnswer(question: string): string {
  const q = question.toLowerCase();
  if (q.includes("bonjour") || q.includes("salut") || q.includes("bonsoir")) {
    return "Bonjour 👋 Je suis votre Tuteur IA. Posez-moi une question sur vos cours, vos erreurs récentes ou demandez-moi un plan de révision personnalisé.";
  }
  if (q.includes("plan") || q.includes("révis") || q.includes("etud")) {
    return "Pour un plan de révision personnalisé, cliquez sur « Lancer l'analyse » ci-dessus : j'examinerai vos dernières erreurs et je vous proposerai un planning sur 7 jours adapté à vos points faibles.";
  }
  if (q.includes("erreur") || q.includes("faute")) {
    return "Vos erreurs récentes sont listées dans la section « Points à travailler ». Refaites ces banques en priorité, puis utilisez la révision espacée (SM-2) pour ancrer les bonnes réponses à long terme.";
  }
  return "Bonne question ! Le service IA est temporairement indisponible. En attendant, je vous conseille de consulter vos points faibles ci-dessus et de refaire les banques associées.";
}

function buildRecommendations(question: string): string[] {
  const q = question.toLowerCase();
  const recs: string[] = [];
  if (q.includes("mémoris") || q.includes("retenir") || q.includes("apprendre")) {
    recs.push("Utilisez la révision espacée SM-2 (onglet dédié) pour ancrer durablement les notions.");
  }
  if (q.includes("vite") || q.includes("rapid") || q.includes("temps")) {
    recs.push("Entraînez-vous en mode chronométré via les examens blancs pour gagner en vitesse.");
  }
  if (q.includes("erreur") || q.includes("faute")) {
    recs.push("Consultez la section « Points à travailler » puis refaites les banques concernées.");
  }
  recs.push("Faites le défi quotidien pour entretenir vos connaissances chaque jour.");
  recs.push("Activez les favoris sur les questions difficiles pour les retrouver facilement.");
  return recs.slice(0, 4);
}

// ---------------------------------------------------------------------------
// Analysis mode
// ---------------------------------------------------------------------------

async function handleAnalysis(user: { id: string; name: string }, limit: number) {
  // Fetch recent wrong answers
  const wrongAnswers = await db.sessionAnswer.findMany({
    where: {
      isCorrect: false,
      session: { userId: user.id },
    },
    select: {
      questionText: true,
      correctAnswer: true,
      userAnswer: true,
      optionA: true,
      optionB: true,
      optionC: true,
      optionD: true,
      explanation: true,
      session: {
        select: {
          sourceType: true,
          sourceId: true,
          title: true,
          startedAt: true,
        },
      },
    },
    orderBy: { answeredAt: "desc" },
    take: limit,
  });

  if (wrongAnswers.length === 0) {
    return NextResponse.json({
      hasData: false,
      message:
        "Aucune erreur récente trouvée. Faites un quiz pour activer l'analyse IA.",
      weakAreas: [],
      plan: null,
    });
  }

  // Look up bank titles for each unique sourceId
  const sourceIds = Array.from(
    new Set(
      wrongAnswers
        .filter((a) => a.session.sourceType === "bank")
        .map((a) => a.session.sourceId)
    )
  );
  const banks =
    sourceIds.length > 0
      ? await db.questionBank.findMany({
          where: { id: { in: sourceIds } },
          select: { id: true, title: true, category: true },
        })
      : [];
  const bankMap = new Map(banks.map((b) => [b.id, b]));

  // Group wrong answers by bank
  const grouped = new Map<string, WeakArea>();
  for (const a of wrongAnswers) {
    const bankId =
      a.session.sourceType === "bank"
        ? a.session.sourceId
        : a.session.title;
    const bankInfo = bankMap.get(bankId);
    const bankTitle = bankInfo?.title ?? a.session.title;
    const category = bankInfo?.category ?? "Examen";

    if (!grouped.has(bankId)) {
      grouped.set(bankId, {
        bankId,
        bankTitle,
        category,
        total: 0,
        correct: 0,
        wrongQuestions: [],
      });
    }
    const entry = grouped.get(bankId)!;
    entry.total += 1;
    entry.wrongQuestions.push({
      question: a.questionText,
      correctAnswer: a.correctAnswer,
      userAnswer: a.userAnswer,
      optionA: a.optionA,
      optionB: a.optionB,
      optionC: a.optionC,
      optionD: a.optionD,
      explanation: a.explanation,
    });
  }

  const weakAreas = Array.from(grouped.values()).sort(
    (a, b) => b.total - a.total
  );

  // Build a compact summary for the LLM
  const summary = weakAreas
    .slice(0, 8)
    .map((w, i) => {
      const sample = w.wrongQuestions
        .slice(0, 2)
        .map(
          (q) =>
            `  • Q: "${q.question.slice(0, 120)}..." → Bonne réponse: ${q.correctAnswer}, Votre réponse: ${q.userAnswer ?? "—"}`
        )
        .join("\n");
      return `${i + 1}. ${w.bankTitle} (${w.category}) — ${w.total} erreur(s)\n${sample}`;
    })
    .join("\n\n");

  const systemPrompt = `Tu es un tuteur IA spécialisé dans la préparation aux concours du Burkina Faso sur la plateforme QuizExam BF. Tu analyses les erreurs récentes d'un étudiant et tu produis un PLAN D'ÉTUDE PERSONNALISÉ, concis et actionnable.

Format de réponse (en français, maximum 300 mots) :
🎯 PRIORITÉS (3 domaines à travailler en priorité)
📚 RESSOURCES (banques ou types de questions à refaire)
⏰ PLAN (planning conseillé sur 7 jours, 30 min/jour)
💡 CONSEILS (2-3 astuces spécifiques aux erreurs observées)

Sois bienveillant, concret, et base-toi uniquement sur les erreurs fournies.`;

  const userMessage = `Étudiant: ${user.name}
Erreurs récentes (${wrongAnswers.length} au total, ${weakAreas.length} domaines):

${summary}

Génère le plan d'étude personnalisé.`;

  let aiPlan: string | null = null;
  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      thinking: { type: "disabled" },
    });
    aiPlan =
      completion?.choices?.[0]?.message?.content?.trim() || null;
  } catch (aiError) {
    console.error("[ai-tutor] LLM error:", aiError);
  }

  // Fallback plan if AI failed
  const fallbackPlan =
    aiPlan ??
    weakAreas
      .slice(0, 3)
      .map(
        (w, i) =>
          `${i + 1}. Refaites la banque « ${w.bankTitle} » — ${w.total} erreur(s) à corriger.`
      )
      .join("\n");

  return NextResponse.json({
    hasData: true,
    totalErrors: wrongAnswers.length,
    weakAreasCount: weakAreas.length,
    weakAreas: weakAreas.slice(0, 10).map((w) => ({
      bankId: w.bankId,
      bankTitle: w.bankTitle,
      category: w.category,
      errorCount: w.total,
      samples: w.wrongQuestions.slice(0, 3),
    })),
    plan: fallbackPlan,
  });
}

/**
 * Builds a compact (≤ 1500 char) summary of the user's recent wrong answers
 * for inclusion in the chat LLM context.
 */
async function buildWeakAreasSummary(userId: string, limit: number): Promise<string> {
  const wrongAnswers = await db.sessionAnswer.findMany({
    where: {
      isCorrect: false,
      session: { userId },
    },
    select: {
      questionText: true,
      correctAnswer: true,
      userAnswer: true,
      session: { select: { sourceType: true, sourceId: true, title: true } },
    },
    orderBy: { answeredAt: "desc" },
    take: limit,
  });

  if (wrongAnswers.length === 0) return "";

  const sourceIds = Array.from(
    new Set(
      wrongAnswers
        .filter((a) => a.session.sourceType === "bank")
        .map((a) => a.session.sourceId)
    )
  );
  const banks =
    sourceIds.length > 0
      ? await db.questionBank.findMany({
          where: { id: { in: sourceIds } },
          select: { id: true, title: true },
        })
      : [];
  const titleMap = new Map(banks.map((b) => [b.id, b.title]));

  const grouped = new Map<string, number>();
  for (const a of wrongAnswers) {
    const key =
      a.session.sourceType === "bank"
        ? titleMap.get(a.session.sourceId) ?? a.session.title
        : a.session.title;
    grouped.set(key, (grouped.get(key) ?? 0) + 1);
  }

  const lines = Array.from(grouped.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([title, n]) => `  • ${title}: ${n} erreur(s)`);

  return `Domaines à travailler (${wrongAnswers.length} erreurs récentes):\n${lines.join("\n")}`.slice(0, 1500);
>>>>>>> Stashed changes
}
