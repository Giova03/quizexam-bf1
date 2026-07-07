import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import ZAI from "z-ai-web-dev-sdk";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Parcours personnalisé généré par IA — POST /api/study-plan
 *
 * Body: { targetExam?: string, daysUntil?: number, currentLevel?: string }
 *
 * Uses z-ai-web-dev-sdk to generate a personalized day-by-day study plan
 * based on:
 *   - The user's recent activity (banks explored, weak areas)
 *   - The target exam (e.g. "Concours Administration")
 *   - The number of days until the exam
 *   - The user's current level (BEPC / BAC / LICENCE / CONCOURS)
 *
 * Returns: { plan: [{ day, focus, banks, duration, exercises }], summary, generatedAt }
 *
 * Graceful degradation: if the LLM call fails (or the SDK is unavailable),
 * we build a deterministic fallback plan from the user's weak areas.
 */

interface StudyPlanBody {
  targetExam?: string;
  daysUntil?: number;
  currentLevel?: string;
}

interface PlanDay {
  day: number;
  focus: string;
  banks: string[];
  duration: number; // minutes
  exercises: string[];
}

interface StudyPlanResponse {
  plan: PlanDay[];
  summary: string;
  generatedAt: string;
  source: "ai" | "fallback";
}

interface BankRow {
  id: string;
  title: string;
  category: string;
  educationLevel: string;
  _count: { questions: number };
}

interface SessionRow {
  title: string;
  score: number;
  totalQuestions: number;
  sourceType: string;
  sourceId: string;
  answers: Array<{ isCorrect: boolean | null; userAnswer: string | null }>;
}

/**
 * Fetch the user's recent completed sessions so we can derive weak areas
 * and prefer them in the plan.
 */
async function fetchUserContext(userId: string): Promise<{
  weakBanks: BankRow[];
  strongBanks: BankRow[];
  allBanks: BankRow[];
  avgPct: number;
  totalSessions: number;
}> {
  const allBanks = (await db.questionBank.findMany({
    select: {
      id: true,
      title: true,
      category: true,
      educationLevel: true,
      _count: { select: { questions: true } },
    },
  })) as BankRow[];

  const sessions = (await db.quizSession.findMany({
    where: { userId, completedAt: { not: null } },
    orderBy: { startedAt: "desc" },
    take: 30,
    select: {
      title: true,
      score: true,
      totalQuestions: true,
      sourceType: true,
      sourceId: true,
      answers: {
        select: { isCorrect: true, userAnswer: true },
      },
    },
  })) as SessionRow[];

  const avgPct =
    sessions.length > 0
      ? Math.round(
          sessions.reduce(
            (acc, s) =>
              acc + (s.score / Math.max(1, s.totalQuestions)) * 100,
            0,
          ) / sessions.length,
        )
      : 0;

  // Aggregate per-bank success/wrong rates.
  const perBank = new Map<
    string,
    { correct: number; wrong: number; skipped: number }
  >();
  for (const s of sessions) {
    if (s.sourceType !== "bank") continue;
    const cur = perBank.get(s.sourceId) ?? {
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

  const weakBanks: BankRow[] = [];
  const strongBanks: BankRow[] = [];
  for (const b of allBanks) {
    const stats = perBank.get(b.id);
    if (!stats) continue;
    const total = stats.correct + stats.wrong + stats.skipped;
    if (total < 3) continue;
    const wrongRate = (stats.wrong + stats.skipped) / total;
    const successRate = stats.correct / total;
    if (wrongRate >= 0.3) weakBanks.push(b);
    else if (successRate >= 0.7) strongBanks.push(b);
  }

  return {
    weakBanks,
    strongBanks,
    allBanks,
    avgPct,
    totalSessions: sessions.length,
  };
}

/**
 * Build a deterministic fallback plan if the AI fails. The plan cycles
 * through the user's weak banks first, then explores new banks.
 */
function buildFallbackPlan(
  days: number,
  ctx: {
    weakBanks: BankRow[];
    strongBanks: BankRow[];
    allBanks: BankRow[];
    avgPct: number;
    totalSessions: number;
  },
  targetExam: string,
): PlanDay[] {
  const plan: PlanDay[] = [];
  // Pool: start with weak banks, then top up with all banks the user
  // hasn't mastered yet, then add a daily challenge day every 5 days.
  const weakTitles = ctx.weakBanks.map((b) => b.title);
  const weakSet = new Set(weakTitles);

  // Other banks the user hasn't worked on yet (or has but isn't strong at).
  const otherBanks = ctx.allBanks
    .filter((b) => !weakSet.has(b.title))
    .filter(
      (b) => !ctx.strongBanks.some((s) => s.id === b.id),
    )
    .slice(0, 14);

  const pool = [...ctx.weakBanks, ...otherBanks];

  for (let day = 1; day <= days; day++) {
    const isChallengeDay = day % 5 === 0;
    if (isChallengeDay) {
      plan.push({
        day,
        focus: "Défi du jour + révision espacée",
        banks: ["Défi quotidien", "Révision espacée"],
        duration: 30,
        exercises: [
          "Faites le défi du jour (10 questions, 2× XP)",
          "Révisez 5 cartes espacées",
          "Notez vos erreurs pour la prochaine session",
        ],
      });
      continue;
    }

    const bank = pool[(day - 1) % Math.max(1, pool.length)];
    if (!bank) {
      plan.push({
        day,
        focus: targetExam
          ? `Préparation ${targetExam}`
          : "Révision générale",
        banks: [],
        duration: 30,
        exercises: [
          "Faites 10 questions dans une banque de votre choix",
          "Lisez les explications de chaque réponse",
        ],
      });
      continue;
    }

    const isWeak = ctx.weakBanks.some((w) => w.id === bank.id);
    plan.push({
      day,
      focus: isWeak
        ? `Renforcer « ${bank.title} » (zone de faiblesse)`
        : `Réviser « ${bank.title} »`,
      banks: [bank.title],
      duration: isWeak ? 45 : 30,
      exercises: isWeak
        ? [
            "Faites 10 questions en mode correction immédiate",
            "Notez les notions que vous ratez",
            "Ajoutez vos erreurs à la révision espacée",
          ]
        : [
            "Faites 10 questions en mode immédiat",
            "Visez au moins 70% de réussite",
            "Passez en mode final si vous êtes à l'aise",
          ],
    });
  }
  return plan;
}

/** Parse the LLM's plan output. Resilient to markdown fences / prose. */
function parsePlan(content: string): PlanDay[] {
  if (!content) return [];
  let cleaned = content.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json|JSON)?\s*/, "")
      .replace(/```\s*$/, "")
      .trim();
  }

  const tryParse = (s: string): PlanDay[] | null => {
    try {
      const p = JSON.parse(s);
      if (Array.isArray(p)) return p as PlanDay[];
      if (p && Array.isArray((p as { plan?: PlanDay[] }).plan)) {
        return (p as { plan: PlanDay[] }).plan;
      }
    } catch {
      /* ignore */
    }
    return null;
  };

  // Strategy 1: direct parse.
  let parsed = tryParse(cleaned);
  if (parsed) return sanitize(parsed);

  // Strategy 2: first {...} block (model sometimes appends trailing prose).
  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) {
    parsed = tryParse(objMatch[0]);
    if (parsed) return sanitize(parsed);
  }

  // Strategy 3: first [...] block.
  const arrMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    parsed = tryParse(arrMatch[0]);
    if (parsed) return sanitize(parsed);
  }

  return [];
}

/** Validate / normalize each day entry from the LLM output. */
function sanitize(plan: unknown[]): PlanDay[] {
  return plan
    .map((d, i): PlanDay | null => {
      if (!d || typeof d !== "object") return null;
      const o = d as Record<string, unknown>;
      const day = typeof o.day === "number" ? o.day : i + 1;
      const focus =
        typeof o.focus === "string" && o.focus.trim().length > 0
          ? o.focus.trim()
          : `Jour ${day}`;
      const banks = Array.isArray(o.banks)
        ? o.banks.filter((b) => typeof b === "string").map((b) => String(b))
        : [];
      const dur =
        typeof o.duration === "number" && o.duration > 0
          ? o.duration
          : typeof o.duration === "string" &&
              /^\d+$/.test(o.duration.trim())
            ? parseInt(o.duration.trim(), 10)
            : 30;
      const exercises = Array.isArray(o.exercises)
        ? o.exercises
            .filter((e) => typeof e === "string")
            .map((e) => String(e))
        : [];
      return { day, focus, banks, duration: dur, exercises };
    })
    .filter((d): d is PlanDay => d !== null);
}

export async function POST(request: Request) {
  try {
    const authSession = await getServerSession(authOptions);
    if (!authSession?.user?.email) {
      return NextResponse.json(
        { error: "Authentification requise" },
        { status: 401 },
      );
    }
    const user = await db.user.findUnique({
      where: { email: authSession.user.email },
      select: { id: true, name: true },
    });
    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as StudyPlanBody;
    const targetExam =
      typeof body.targetExam === "string" && body.targetExam.trim().length > 0
        ? body.targetExam.trim().slice(0, 120)
        : "Concours Administration";
    const rawDays =
      typeof body.daysUntil === "number"
        ? body.daysUntil
        : parseInt(String(body.daysUntil ?? "7"), 10);
    const daysUntil = Number.isFinite(rawDays)
      ? Math.min(60, Math.max(1, Math.round(rawDays)))
      : 7;
    const currentLevel =
      typeof body.currentLevel === "string" &&
      ["BEPC", "BAC", "LICENCE", "CONCOURS", "TOUS"].includes(
        body.currentLevel.toUpperCase(),
      )
        ? body.currentLevel.toUpperCase()
        : "TOUS";

    // --- Fetch user context -------------------------------------------------
    const ctx = await fetchUserContext(user.id);

    // --- Build the LLM prompt ----------------------------------------------
    const weakBanksList = ctx.weakBanks
      .slice(0, 5)
      .map((b) => `• ${b.title} (${b.category})`)
      .join("\n");
    const strongBanksList = ctx.strongBanks
      .slice(0, 3)
      .map((b) => `• ${b.title} (${b.category})`)
      .join("\n");

    const prompt = `Tu es un coach pédagogique IA pour la plateforme QuizExam BF (préparation aux concours du Burkina Faso).

Génère un plan de révision personnalisé de ${daysUntil} jour(s) pour cet utilisateur.

CONTEXTE:
- Objectif: ${targetExam}
- Niveau actuel: ${currentLevel}
- Sessions terminées: ${ctx.totalSessions}
- Score moyen: ${ctx.avgPct}%
${weakBanksList ? `- Zones de faiblesse:\n${weakBanksList}` : "- Zones de faiblesse: aucune identifiée"}
${strongBanksList ? `- Points forts:\n${strongBanksList}` : ""}

EXIGENCES:
- Répartition équilibrée: alterner révision des faiblesses, consolidation des points forts, et défis.
- Tous les 5 jours, inclure une journée "défi + révision espacée".
- Durée quotidienne: 30-45 minutes.
- Exercices concrets: "10 questions en mode immédiat", "examen blanc 50 questions", "révision espacée 5 cartes", etc.
- Mentionner les noms de banques réelles quand pertinent.

FORMAT: JSON STRICT (pas de markdown, pas de commentaire) — un tableau d'objets:
[
  { "day": 1, "focus": "...", "banks": ["..."], "duration": 30, "exercises": ["...", "..."] },
  ...
]

Réponds UNIQUEMENT avec le JSON.`;

    // --- Try the LLM --------------------------------------------------------
    let plan: PlanDay[] = [];
    let source: "ai" | "fallback" = "fallback";
    try {
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: "assistant",
            content:
              "Tu es un générateur expert de plans de révision pédagogiques. Tu réponds STRICTEMENT en JSON valide, sans markdown ni commentaire.",
          },
          { role: "user", content: prompt },
        ],
        thinking: { type: "disabled" },
      });
      const content = completion?.choices?.[0]?.message?.content ?? "";
      plan = parsePlan(content);
      if (plan.length > 0) source = "ai";
    } catch (aiError) {
      console.error("study-plan AI error:", aiError);
    }

    // --- Fallback: deterministic plan from the user's data -----------------
    if (plan.length === 0) {
      plan = buildFallbackPlan(daysUntil, ctx, targetExam);
      source = "fallback";
    } else if (plan.length < daysUntil) {
      // The LLM returned fewer days than requested — pad with fallback days.
      const padding = buildFallbackPlan(
        daysUntil - plan.length,
        ctx,
        targetExam,
      ).map((d) => ({ ...d, day: d.day + plan.length }));
      plan = [...plan, ...padding];
    } else if (plan.length > daysUntil) {
      plan = plan.slice(0, daysUntil);
    }

    // Renumber days 1..N in case the LLM got creative.
    plan = plan.map((d, i) => ({ ...d, day: i + 1 }));

    // --- Build the human-readable summary ----------------------------------
    const totalMinutes = plan.reduce((s, d) => s + d.duration, 0);
    const summary =
      `Plan de ${plan.length} jour(s) — ${Math.round(totalMinutes / 60)}h ${
        totalMinutes % 60
      }min au total. ` +
      (source === "ai"
        ? "Généré par IA à partir de votre historique."
        : "Plan de secours basé sur vos zones de faiblesse (IA momentanément indisponible).") +
      ` Objectif: ${targetExam}.`;

    const response: StudyPlanResponse = {
      plan,
      summary,
      generatedAt: new Date().toISOString(),
      source,
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error("study-plan error:", error);
    return NextResponse.json(
      { error: "Échec de la génération du plan de révision" },
      { status: 500 },
    );
  }
}
