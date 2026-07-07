import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Prédiction de réussite — GET /api/predict-success
 *
 * Analyzes the user's performance across all sessions and predicts the
 * probability of succeeding at their next exam.
 *
 * Factors taken into account:
 *   - Overall average score
 *   - Recent trend (last 7 days vs previous 7 days)
 *   - Streak / consistency (days active in last 14 days)
 *   - Number of distinct banks explored (polyvalence)
 *   - Strong vs weak area ratio
 *
 * Returns: { probability, confidence, factors: [{factor, impact}], analysis }
 *
 * `probability` is the predicted success rate at a typical exam (50%+ to
 * pass), clamped to 5-95%. `confidence` reflects how much data we have
 * (low if < 5 sessions, high if > 20). Each factor has a signed impact
 * (positive = helps, negative = hurts) on the probability, so the UI can
 * show a breakdown like:
 *   "Probabilité de réussite: 72%
 *    Facteurs: bonne série (7 jours) +12%, faiblesse en droit -15%"
 */

interface FactorBreakdown {
  factor: string;
  impact: number; // signed percentage points
}

interface SessionRow {
  id: string;
  score: number;
  totalQuestions: number;
  startedAt: Date;
  sourceType: string;
  sourceId: string;
  answers: Array<{ isCorrect: boolean | null; userAnswer: string | null }>;
}

interface BankRow {
  id: string;
  title: string;
  category: string;
}

interface PredictionResponse {
  probability: number; // 0-100
  confidence: number; // 0-100
  factors: FactorBreakdown[];
  analysis: string;
  stats: {
    totalSessions: number;
    avgScore: number;
    recentTrend: number; // pct points (last7 - previous7)
    activeDays: number; // distinct days active in last 14d
    distinctBanks: number;
    weakAreaCount: number;
    strongAreaCount: number;
  };
}

interface RawSession {
  id: string;
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

/**
 * Compute the prediction. All inputs are simple typed primitives so the
 * function is pure and easy to reason about.
 */
function computePrediction(
  sessions: RawSession[],
  banks: BankRow[],
): PredictionResponse {
  const totalSessions = sessions.length;

  // --- Average score ------------------------------------------------------
  const avgScore =
    totalSessions > 0
      ? Math.round(
          sessions.reduce(
            (acc, s) =>
              acc + (s.score / Math.max(1, s.totalQuestions)) * 100,
            0,
          ) / totalSessions,
        )
      : 0;

  // --- Recent trend (last 7d vs previous 7d) ------------------------------
  const now = Date.now();
  const last7Start = now - 7 * 24 * 60 * 60 * 1000;
  const prev7Start = now - 14 * 24 * 60 * 60 * 1000;
  const last7 = sessions.filter((s) => s.startedAt.getTime() >= last7Start);
  const prev7 = sessions.filter(
    (s) =>
      s.startedAt.getTime() >= prev7Start &&
      s.startedAt.getTime() < last7Start,
  );
  const last7Pct =
    last7.length > 0
      ? last7.reduce(
          (acc, s) => acc + (s.score / Math.max(1, s.totalQuestions)) * 100,
          0,
        ) / last7.length
      : 0;
  const prev7Pct =
    prev7.length > 0
      ? prev7.reduce(
          (acc, s) => acc + (s.score / Math.max(1, s.totalQuestions)) * 100,
          0,
        ) / prev7.length
      : 0;
  const recentTrend = Math.round(last7Pct - prev7Pct);

  // --- Active days in last 14 days ----------------------------------------
  const dayBuckets = new Set<string>();
  for (const s of sessions) {
    if (s.startedAt.getTime() >= prev7Start) {
      const d = s.startedAt;
      const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
      dayBuckets.add(key);
    }
  }
  const activeDays = dayBuckets.size;

  // --- Distinct banks explored --------------------------------------------
  const bankIds = new Set<string>();
  for (const s of sessions) {
    if (s.sourceType === "bank") bankIds.add(s.sourceId);
  }
  const distinctBanks = bankIds.size;

  // --- Weak / strong area counts ------------------------------------------
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
  let weakAreaCount = 0;
  let strongAreaCount = 0;
  for (const stats of perBank.values()) {
    const total = stats.correct + stats.wrong + stats.skipped;
    if (total < 3) continue;
    const wrongRate = (stats.wrong + stats.skipped) / total;
    const successRate = stats.correct / total;
    if (wrongRate >= 0.3) weakAreaCount++;
    else if (successRate >= 0.7) strongAreaCount++;
  }
  // Names of top weak banks (for the human-readable analysis).
  const weakBankNames: string[] = [];
  for (const [bankId, stats] of perBank.entries()) {
    const total = stats.correct + stats.wrong + stats.skipped;
    if (total < 3) continue;
    const wrongRate = (stats.wrong + stats.skipped) / total;
    if (wrongRate >= 0.3) {
      const info = banks.find((b) => b.id === bankId);
      if (info) {
        weakBankNames.push(`${info.title} (${Math.round(wrongRate * 100)}%)`);
      }
    }
  }

  // --- Baseline probability: weighted average score -----------------------
  // Start from the user's average score. We treat 50% as the "pass" line.
  let probability = avgScore;

  // --- Factor adjustments -------------------------------------------------
  const factors: FactorBreakdown[] = [];

  // Trend (improving trend helps, declining hurts).
  if (totalSessions >= 4) {
    const trendImpact = Math.max(-15, Math.min(15, recentTrend * 0.5));
    if (Math.abs(trendImpact) >= 1) {
      probability += trendImpact;
      factors.push({
        factor:
          trendImpact > 0
            ? `Tendance haussière (+${recentTrend} pts sur 7j)`
            : `Tendance baissière (${recentTrend} pts sur 7j)`,
        impact: Math.round(trendImpact),
      });
    }
  }

  // Streak / consistency.
  if (activeDays >= 7) {
    const streakImpact = Math.min(15, activeDays * 1.5);
    probability += streakImpact;
    factors.push({
      factor: `Bonne série (${activeDays} jours actifs sur 14j)`,
      impact: Math.round(streakImpact),
    });
  } else if (activeDays <= 2 && totalSessions > 0) {
    const streakImpact = -10;
    probability += streakImpact;
    factors.push({
      factor: `Série faible (${activeDays} jour(s) actif(s) sur 14j)`,
      impact: streakImpact,
    });
  }

  // Polyvalence (multiple banks → well-rounded).
  if (distinctBanks >= 5) {
    const polyImpact = Math.min(10, distinctBanks);
    probability += polyImpact;
    factors.push({
      factor: `Polyvalence (${distinctBanks} banques explorées)`,
      impact: polyImpact,
    });
  } else if (distinctBanks > 0 && distinctBanks < 3) {
    probability -= 5;
    factors.push({
      factor: `Manque de variété (${distinctBanks} banque(s) uniquement)`,
      impact: -5,
    });
  }

  // Weak areas penalty.
  if (weakAreaCount > 0) {
    const weakPenalty = Math.min(25, weakAreaCount * 5);
    probability -= weakPenalty;
    factors.push({
      factor: `${weakAreaCount} zone(s) de faiblesse identifiée(s)`,
      impact: -weakPenalty,
    });
  }

  // Strong areas bonus.
  if (strongAreaCount > 0) {
    const strongBonus = Math.min(10, strongAreaCount * 3);
    probability += strongBonus;
    factors.push({
      factor: `${strongAreaCount} point(s) fort(s) consolidé(s)`,
      impact: strongBonus,
    });
  }

  // Volume of practice (more sessions → more confident we are in the avg).
  if (totalSessions >= 20) {
    probability += 5;
    factors.push({
      factor: `Volume de pratique (${totalSessions} sessions)`,
      impact: 5,
    });
  } else if (totalSessions > 0 && totalSessions < 5) {
    probability -= 3;
    factors.push({
      factor: `Peu de sessions (${totalSessions}) — prédictions moins fiables`,
      impact: -3,
    });
  }

  // Clamp to [5, 95].
  probability = Math.max(5, Math.min(95, Math.round(probability)));

  // --- Confidence: how much data do we have? ------------------------------
  let confidence: number;
  if (totalSessions === 0) {
    confidence = 0;
  } else if (totalSessions < 5) {
    confidence = 25 + totalSessions * 5; // 30-45
  } else if (totalSessions < 15) {
    confidence = 50 + (totalSessions - 5) * 3; // 53-80
  } else {
    confidence = Math.min(95, 80 + (totalSessions - 15));
  }
  confidence = Math.max(0, Math.min(95, Math.round(confidence)));

  // --- Human-readable analysis --------------------------------------------
  let analysis: string;
  if (totalSessions === 0) {
    analysis =
      "Pas encore assez de données pour établir une prédiction. Faites au moins 3 sessions pour obtenir une première estimation.";
  } else {
    const trendStr =
      recentTrend > 0
        ? `en progression (+${recentTrend} pts sur 7 jours)`
        : recentTrend < 0
          ? `en recul (${recentTrend} pts sur 7 jours)`
          : "stable";
    const weakStr =
      weakBankNames.length > 0
        ? ` Faiblesses à travailler : ${weakBankNames.slice(0, 3).join(", ")}.`
        : " Aucune zone de faiblesse majeure détectée.";
    analysis =
      `Probabilité de réussite à votre prochain examen : ${probability}%. ` +
      `Votre niveau est ${trendStr} (score moyen ${avgScore}%).` +
      weakStr;
  }

  return {
    probability,
    confidence,
    factors,
    analysis,
    stats: {
      totalSessions,
      avgScore,
      recentTrend,
      activeDays,
      distinctBanks,
      weakAreaCount,
      strongAreaCount,
    },
  };
}

export async function GET() {
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
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 },
      );
    }

    const sessions = (await db.quizSession.findMany({
      where: { userId: user.id, completedAt: { not: null } },
      orderBy: { startedAt: "desc" },
      take: 100,
      select: {
        id: true,
        score: true,
        totalQuestions: true,
        startedAt: true,
        sourceType: true,
        sourceId: true,
        answers: {
          select: { isCorrect: true, userAnswer: true },
        },
      },
    })) as RawSession[];

    const banks = (await db.questionBank.findMany({
      select: { id: true, title: true, category: true },
    })) as BankRow[];

    const prediction = computePrediction(sessions, banks);
    return NextResponse.json(prediction);
  } catch (error) {
    console.error("predict-success error:", error);
    return NextResponse.json(
      { error: "Échec de la prédiction de réussite" },
      { status: 500 },
    );
  }
}
