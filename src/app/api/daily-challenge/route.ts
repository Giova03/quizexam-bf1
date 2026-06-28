import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
<<<<<<< Updated upstream
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
=======
 * Défi quotidien — 10 questions à choix multiples avec un thème tournant
 * selon le jour de la semaine :
 *   Lun = Culture
 *   Mar = Droit
 *   Mer = SVT
 *   Jeu = Littérature
 *   Ven = Sciences Éco
 *   Sam = Psycho
 *   Dim = Mixte
 *
 * La sélection est **déterministe** : pour un même jour calendaire, tous les
 * utilisateurs obtiennent les mêmes 10 questions (basé sur un seed construit
 * à partir de YYYY-MM-DD).
 */

interface DailyTheme {
  code: string;
  label: string;
  // Mots-clés recherchés dans le titre, la catégorie ou la sous-catégorie
  // des banques (insensible à la casse). Le dimanche ("Mixte") on accepte
  // toutes les banques.
  keywords: string[];
  color: string;
  icon: string;
}

const DAILY_THEMES: Record<number, DailyTheme> = {
  1: { code: "culture", label: "Culture Générale", keywords: ["culture", "burkina", "histoire", "actualit"], color: "amber", icon: "Globe" },
  2: { code: "droit", label: "Droit", keywords: ["droit", "juridi", "constitution", "administratif"], color: "violet", icon: "Scale" },
  3: { code: "svt", label: "Sciences de la Vie et de la Terre", keywords: ["svt", "science", "biologie", "terre", "géologie", "geologie"], color: "emerald", icon: "Leaf" },
  4: { code: "litterature", label: "Littérature", keywords: ["littérature", "litterature", "français", "francais", "roman", "poésie"], color: "rose", icon: "BookOpen" },
  5: { code: "sciences-eco", label: "Sciences Économiques", keywords: ["économ", "econom", "éco", "gestion", "finance", "social"], color: "sky", icon: "TrendingUp" },
  6: { code: "psycho", label: "Psychotechnique", keywords: ["psycho", "logique", "vocabulaire", "test", "orthographe", "suites"], color: "cyan", icon: "Brain" },
  0: { code: "mixte", label: "Mixte", keywords: [], color: "teal", icon: "Layers" },
};

function themeForDay(date: Date): { theme: DailyTheme; dayKey: string } {
  const day = date.getDay(); // 0 = Sunday ... 6 = Saturday
  const theme = DAILY_THEMES[day] ?? DAILY_THEMES[0];
  // Clé de cache au format YYYY-MM-DD
  const dayKey = date.toISOString().slice(0, 10);
  return { theme, dayKey };
}

/**
 * Pseudo-RNG déterministe basé sur une chaîne de caractères.
 * Retourne un nombre entre 0 et 1 (exclusif).
 */
function seededRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // mulberry32
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
>>>>>>> Stashed changes
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

<<<<<<< Updated upstream
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
=======
export async function GET() {
  try {
    const { theme, dayKey } = themeForDay(new Date());

    // Sélectionne les banques qui matchent le thème du jour
    const allBanks = await db.questionBank.findMany({
>>>>>>> Stashed changes
      select: {
        id: true,
        title: true,
        category: true,
<<<<<<< Updated upstream
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
=======
        subcategory: true,
        color: true,
        icon: true,
      },
    });

    const lowerKeywords = theme.keywords.map((k) => k.toLowerCase());
    const matchingBanks =
      theme.code === "mixte"
        ? allBanks
        : allBanks.filter((b) => {
            const hay = `${b.title} ${b.category} ${b.subcategory}`.toLowerCase();
            return lowerKeywords.some((k) => hay.includes(k));
          });

    if (matchingBanks.length === 0) {
      return NextResponse.json({
        dayKey,
        theme,
        questions: [],
        message: "Aucune banque ne correspond au thème du jour.",
      });
    }

    const bankIds = matchingBanks.map((b) => b.id);

    // Récupère toutes les questions des banques candidates
    const questions = await db.question.findMany({
      where: { bankId: { in: bankIds } },
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
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
=======
        difficulty: true,
      },
    });

    if (questions.length === 0) {
      return NextResponse.json({
        dayKey,
        theme,
        questions: [],
        message: "Aucune question disponible pour le thème du jour.",
      });
    }

    // Mélange déterministe basé sur la date du jour
    const rng = seededRandom(`daily-${dayKey}-${theme.code}`);
    const shuffled = [...questions].sort(() => rng() - 0.5);
    const selected = shuffled.slice(0, 10);

    return NextResponse.json({
      dayKey,
      theme,
      bankMeta: matchingBanks.map((b) => ({
        id: b.id,
        title: b.title,
        category: b.category,
        color: b.color,
        icon: b.icon,
      })),
      questions: selected,
    });
  } catch (error) {
    console.error("Failed to load daily challenge:", error);
    return NextResponse.json(
      { error: "Failed to load daily challenge" },
>>>>>>> Stashed changes
      { status: 500 }
    );
  }
}
