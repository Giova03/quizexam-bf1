import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Défis Quotidiens — Daily Challenge API
 *
 * Returns today's challenge: 10 questions from a rotating theme.
 * The theme rotates by day of week:
 *   Monday    → Culture Générale
 *   Tuesday   → Droit
 *   Wednesday → SVT / Sciences
 *   Thursday  → Littérature / Histoire
 *   Friday    → Sciences Éco / Gestion
 *   Saturday  → Psychotechnique
 *   Sunday    → Mixte (all categories)
 *
 * The selection is deterministic per date: all users hitting the API on the
 * same calendar day (in UTC) get the exact same 10 questions, so the daily
 * leaderboard is fair.
 */

interface ThemeConfig {
  label: string;
  /** Substrings matched (case-insensitive) against bank titles. */
  keywords: string[];
}

// Order index = JS getDay(): 0 = Sunday … 6 = Saturday
const THEMES: ThemeConfig[] = [
  // Sunday — Mixte
  {
    label: "Mixte (toutes catégories)",
    keywords: [], // empty => all banks
  },
  // Monday — Culture Générale
  {
    label: "Culture Générale",
    keywords: ["culture", "actualite", "pays", "monde", "diplomatie", "capitale"],
  },
  // Tuesday — Droit
  {
    label: "Droit",
    keywords: ["droit", "justice", "juridique", "ohada"],
  },
  // Wednesday — SVT / Sciences
  {
    label: "SVT / Sciences",
    keywords: ["svt", "sciences", "physique", "chimie", "medecine", "sante", "biologie", "geologie"],
  },
  // Thursday — Littérature / Histoire
  {
    label: "Littérature / Histoire",
    keywords: ["litterature", "histoire", "francais", "philo", "archeologie"],
  },
  // Friday — Sciences Éco / Gestion
  {
    label: "Sciences Éco / Gestion",
    keywords: ["economie", "sciences-eco", "gestion", "grh", "statistique", "finance"],
  },
  // Saturday — Psychotechnique
  {
    label: "Psychotechnique",
    keywords: ["psycho"],
  },
];

const QUESTIONS_PER_CHALLENGE = 10;

/** Tiny seeded PRNG (Mulberry32) — deterministic per string seed. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function todayUTCDateString(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function GET() {
  try {
    const today = todayUTCDateString();
    const dayOfWeek = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0-6 (Sun-Sat)
    const theme = THEMES[dayOfWeek];

    // Load banks (with question count only — we'll fetch questions separately)
    const banks = await db.questionBank.findMany({
      select: {
        id: true,
        title: true,
        category: true,
        color: true,
        icon: true,
        _count: { select: { questions: true } },
      },
    });

    // Filter banks by theme keywords (case-insensitive on title).
    const kw = theme.keywords.map((k) => k.toLowerCase());
    const matchedBanks =
      kw.length === 0
        ? banks
        : banks.filter((b) => {
            const t = b.title.toLowerCase();
            return kw.some((k) => t.includes(k));
          });

    // Fallback: if no bank matched (e.g. brand-new install), use all banks.
    const candidateBanks = matchedBanks.length > 0 ? matchedBanks : banks;

    if (candidateBanks.length === 0) {
      return NextResponse.json({
        date: today,
        theme: theme.label,
        title: `Défi du jour — ${theme.label}`,
        questionIds: [],
        questions: [],
        bankCount: 0,
        message: "Aucune banque de questions disponible pour le défi aujourd'hui.",
      });
    }

    const candidateBankIds = candidateBanks.map((b) => b.id);

    // Pull all question IDs from the candidate banks. We only need IDs +
    // bankId for deterministic sampling; full question rows are returned to
    // the client so the start-session call can use them directly.
    const allQuestions = await db.question.findMany({
      where: { bankId: { in: candidateBankIds } },
      select: {
        id: true,
        bankId: true,
        question: true,
        optionA: true,
        optionB: true,
        optionC: true,
        optionD: true,
        correctAnswer: true,
        explanation: true,
      },
    });

    if (allQuestions.length === 0) {
      return NextResponse.json({
        date: today,
        theme: theme.label,
        title: `Défi du jour — ${theme.label}`,
        questionIds: [],
        questions: [],
        bankCount: candidateBanks.length,
        message: "Aucune question disponible pour le défi aujourd'hui.",
      });
    }

    // Deterministic shuffle keyed by date.
    const rng = mulberry32(hashString(`daily-${today}`));
    const shuffled = [...allQuestions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const picked = shuffled.slice(0, Math.min(QUESTIONS_PER_CHALLENGE, shuffled.length));

    // Build a stable title for the daily session: "Défi du jour — {theme} ({date})".
    const title = `Défi du jour — ${theme.label} (${today})`;

    return NextResponse.json({
      date: today,
      theme: theme.label,
      title,
      questionIds: picked.map((q) => q.id),
      questions: picked,
      bankCount: candidateBanks.length,
      xpMultiplier: 2,
      message: `10 questions tirées de ${candidateBanks.length} banque(s) — thème du jour : ${theme.label}.`,
    });
  } catch (error) {
    console.error("Failed to build daily challenge:", error);
    return NextResponse.json(
      { error: "Failed to build daily challenge" },
      { status: 500 }
    );
  }
}
