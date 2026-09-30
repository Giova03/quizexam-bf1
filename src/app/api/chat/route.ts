import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import ZAI from "z-ai-web-dev-sdk";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { applyUserRateLimit } from "@/lib/api-rate-limit";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SYSTEM_PROMPT = `Tu es QuizExam Assistant, le coach IA (GLM) de la plateforme QuizExam BF — une plateforme burkinabè de préparation aux concours.

TON RÔLE: Tu réponds à TOUT TYPE DE QUESTION, sans exception :
- Culture générale (Burkina Faso, Afrique, monde, histoire, géographie, actualité)
- Sciences (maths, physique, chimie, SVT, informatique), droit, économie, lettres
- Langues (français, anglais...), calculs, raisonnement logique, traductions
- Coaching: méthodes de révision, organisation, motivation, orientation
- Plateforme QuizExam BF: banques, modes de correction, fonctionnalités
- Discussions générales, conseils pratiques, questions de vie courante

MÉTHODE: Réponds toujours de façon utile et directe. Pour une question de cours,
structure la réponse (définition → explication → exemple). Pour un calcul, détaille
les étapes. Si une question est ambiguë, propose l'interprétation la plus probable
et réponds quand même. Tu ne refuses jamais d'aider sur un sujet scolaire ou général.

INFORMATIONS VÉRIFIÉES (juin 2025):
- Président du Faso: Capitaine Ibrahim Traoré
- Président ALT: Dr Ousmane Bougma (installée le 11 novembre 2022)
- 17 régions et 47 provinces (depuis juillet 2025)
- AES: Mali, Burkina Faso, Niger — créée 16/09/2023, Confédération 09/07/2024
- Devise AES: "Un espace, un peuple, un destin"
- FESPACO, SIAO à Ouagadougou; SNC à Bobo-Dioulasso

STYLE: Français, amical, concis, encourageant. Si tu ne sais pas, dis-le.
PERSONNALISATION: Quand tu reçois du contexte utilisateur (zones de faiblesse, progression, sessions récentes), utilise-le pour donner des conseils personnalisés et concrets.`;

/**
 * Mode « QCM d'apprentissage » : l'IA génère une question à la fois, sous
 * forme de JSON strict, et s'adapte EN AUTONOMIE au fil de la conversation
 * (historique fourni) : montée/descente en difficulté, sujets variés,
 * enchaînement sans intervention hors du chat.
 */
const QCM_SYSTEM_PROMPT = `Tu es QuizExam Coach, un générateur autonome de QCM d'apprentissage (GLM) pour des candidats aux concours du Burkina Faso.

RÈGLES ABSOLUES:
1. Tu réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, sans balises markdown.
2. Format EXACT:
{"question":"...","options":["...","...","...","..."],"answerIndex":0,"explanation":"...","topic":"...","difficulty":"facile|moyenne|difficile"}
3. exactement 4 options, une seule correcte (answerIndex = 0, 1, 2 ou 3).
4. explanation: 1 à 3 phrases pédagogiques qui justifient la bonne réponse.
5. topic: nom court du thème (ex: "Culture générale BF", "Maths", "Droit constitutionnel", "Anglais", "SVT", "Logique").

ADAPTATION AUTONOME (crucial):
- Analyse l'historique de la conversation (questions déjà posées + réponses du candidat).
- Ne répète JAMAIS une question déjà posée (ni quasi identique).
- Si le candidat vient de réussir: augmente progressivement la difficulté ou durcis les distracteurs.
- S'il vient d'échouer: reste sur le même thème avec une question plus accessible qui consolide la notion ratée.
- Varie les thèmes toutes les 2-3 questions SAUF si l'utilisateur a demandé un thème précis (alors reste-y).
- Si aucune indication: commence par un mélange équilibré culture générale Burkina / maths / français / logique, niveau moyenne.`;

/* ------------------------------------------------------------------ */
/* Mode QCM d'apprentissage (généré par GLM, adaptation autonome)      */
/* ------------------------------------------------------------------ */

interface QcmQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  topic: string;
  difficulty: "facile" | "moyenne" | "difficile";
}

/** Retire les fences ```json éventuelles autour de la réponse du modèle. */
function stripFences(s: string): string {
  let t = s.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json|JSON)?\s*/, "").replace(/```\s*$/, "");
  }
  return t.trim();
}

/** Parse + valide la réponse JSON du modèle. Retourne null si invalide. */
function parseQcm(content: string): QcmQuestion | null {
  if (!content) return null;
  const cleaned = stripFences(content);
  let raw: unknown = null;
  try {
    raw = JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      raw = JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.question !== "string" || o.question.trim().length < 5) return null;
  if (!Array.isArray(o.options) || o.options.length !== 4) return null;
  const options = o.options.map((x) => String(x).trim());
  if (options.some((x) => x.length === 0)) return null;
  if (new Set(options.map((x) => x.toLowerCase())).size !== 4) return null;
  const answerIndex = Number(o.answerIndex);
  if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex > 3) return null;
  const difficultyRaw = String(o.difficulty ?? "moyenne").toLowerCase();
  const difficulty: QcmQuestion["difficulty"] =
    difficultyRaw === "facile" || difficultyRaw === "difficile"
      ? (difficultyRaw as QcmQuestion["difficulty"])
      : "moyenne";
  return {
    question: o.question.trim(),
    options,
    answerIndex,
    explanation:
      typeof o.explanation === "string" && o.explanation.trim()
        ? o.explanation.trim()
        : "La bonne réponse est soulignée dans la correction.",
    topic:
      typeof o.topic === "string" && o.topic.trim()
        ? o.topic.trim()
        : "Culture générale",
    difficulty,
  };
}

/**
 * Banque de secours : si GLM est indisponible, le mode QCM continue de
 * fonctionner avec ces questions statiques (servies dans l'ordre, sans
 * répétition grâce à l'historique de conversation).
 */
const FALLBACK_QCMS: QcmQuestion[] = [
  {
    question: "Qui est l'actuel Président du Faso (Burkina Faso) ?",
    options: ["Capitaine Ibrahim Traoré", "Dr Ousmane Bougma", "Blaise Compaoré", "Roch Marc Christian Kaboré"],
    answerIndex: 0,
    explanation: "Le Capitaine Ibrahim Traoré est au pouvoir depuis le 30 septembre 2022, suite au coup d'État du 30 septembre.",
    topic: "Culture générale BF",
    difficulty: "facile",
  },
  {
    question: "Combien de régions compte le Burkina Faso depuis juillet 2025 ?",
    options: ["13", "17", "45", "47"],
    answerIndex: 1,
    explanation: "Le Burkina compte 17 régions et 47 provinces depuis juillet 2025.",
    topic: "Culture générale BF",
    difficulty: "facile",
  },
  {
    question: "Quelle est la devise de l'Alliance des États du Sahel (AES) ?",
    options: ["Un peuple, un but, une foi", "Un espace, un peuple, un destin", "Force, honneur, justice", "Unité, progrès, justice"],
    answerIndex: 1,
    explanation: "La devise de l'AES (Mali, Burkina Faso, Niger) est « Un espace, un peuple, un destin ». La confédération a été signée le 9 juillet 2024.",
    topic: "Culture générale BF",
    difficulty: "moyenne",
  },
  {
    question: "Quel est le résultat de 15% de 480 ?",
    options: ["62", "72", "48", "75"],
    answerIndex: 1,
    explanation: "10% de 480 = 48 ; 5% = 24 ; donc 15% = 48 + 24 = 72.",
    topic: "Maths",
    difficulty: "facile",
  },
  {
    question: "Quelle est la racine carrée de 169 ?",
    options: ["12", "13", "14", "17"],
    answerIndex: 1,
    explanation: "13 × 13 = 169. La racine carrée de 169 est donc 13.",
    topic: "Maths",
    difficulty: "facile",
  },
  {
    question: "Si 3 ouvriers creusent un puits en 12 jours, combien de jours faut-il à 6 ouvriers (même rythme) ?",
    options: ["3 jours", "6 jours", "9 jours", "24 jours"],
    answerIndex: 1,
    explanation: "C'est une proportionnalité inverse : doubler le nombre d'ouvriers divise le temps par 2 → 6 jours.",
    topic: "Logique",
    difficulty: "moyenne",
  },
  {
    question: "Quel mot est un synonyme de « éphémère » ?",
    options: ["Éternel", "Passager", "Robuste", "Latent"],
    answerIndex: 1,
    explanation: "« Éphémère » désigne ce qui dure très peu de temps, comme « passager ». « Éternel » est l'antonyme.",
    topic: "Français",
    difficulty: "facile",
  },
  {
    question: "Dans quelle ville se tient le FESPACO ?",
    options: ["Bobo-Dioulasso", "Ouagadougou", "Koudougou", "Banfora"],
    answerIndex: 1,
    explanation: "Le FESPACO, plus grand festival de cinéma d'Afrique, se tient à Ouagadougou tous les deux ans depuis 1969.",
    topic: "Culture générale BF",
    difficulty: "facile",
  },
  {
    question: "Quel organe de l'État burkinabè adopte les lois pendant la transition ?",
    options: ["Le Conseil constitutionnel", "L'Assemblée Législative de Transition (ALT)", "Le Conseil des ministres", "La Cour de cassation"],
    answerIndex: 1,
    explanation: "L'ALT, présidée par le Dr Ousmane Bougma, exerce le pouvoir législatif pendant la transition.",
    topic: "Droit constitutionnel",
    difficulty: "moyenne",
  },
  {
    question: "Choose the correct English sentence:",
    options: ["She don't like mangoes.", "She doesn't likes mangoes.", "She doesn't like mangoes.", "She not like mangoes."],
    answerIndex: 2,
    explanation: "À la 3e personne du singulier au présent simple, on utilise « doesn't » + base verbale : « She doesn't like mangoes. »",
    topic: "Anglais",
    difficulty: "moyenne",
  },
  {
    question: "Quel est l'organe principal de la circulation sanguine ?",
    options: ["Le foie", "Les poumons", "Le cœur", "Les reins"],
    answerIndex: 2,
    explanation: "Le cœur est la pompe musculaire qui propulse le sang dans tout le corps via le réseau artériel et veineux.",
    topic: "SVT",
    difficulty: "facile",
  },
  {
    question: "Quelle est la capitale administrative du Burkina Faso (deuxième ville) ?",
    options: ["Bobo-Dioulasso", "Ouahigouya", "Kaya", "Tenkodogo"],
    answerIndex: 0,
    explanation: "Bobo-Dioulasso est la capitale économique et la deuxième ville du pays ; Ouagadougou reste la capitale politique.",
    topic: "Culture générale BF",
    difficulty: "facile",
  },
  {
    question: "Un article coûte 2 500 F. Il bénéficie d'une remise de 20 %. Quel est le nouveau prix ?",
    options: ["2 000 F", "2 100 F", "2 250 F", "1 800 F"],
    answerIndex: 0,
    explanation: "Remise = 2 500 × 0,20 = 500 F. Nouveau prix = 2 500 − 500 = 2 000 F.",
    topic: "Maths",
    difficulty: "moyenne",
  },
  {
    question: "Complete the series: 2, 6, 12, 20, 30, ?",
    options: ["36", "40", "42", "44"],
    answerIndex: 2,
    explanation: "Les écarts augmentent de 2 en 2 : +4, +6, +8, +10, +12 → 30 + 12 = 42. (Formule : n×(n+1).)",
    topic: "Logique",
    difficulty: "difficile",
  },
  {
    question: "Quelle figure de style utilise « cette femme est un dragon » ?",
    options: ["La comparaison", "La métaphore", "L'hyperbole", "L'euphémisme"],
    answerIndex: 1,
    explanation: "Il n'y a pas d'outil de comparaison (« comme ») : l'assimilation directe est une métaphore.",
    topic: "Français",
    difficulty: "moyenne",
  },
  {
    question: "En quelle année la Confédération de l'AES a-t-elle été signée ?",
    options: ["16 septembre 2023", "9 juillet 2024", "30 septembre 2022", "1er janvier 2025"],
    answerIndex: 1,
    explanation: "L'AES créée le 16/09/2023 est devenue Confédération le 9 juillet 2024.",
    topic: "Culture générale BF",
    difficulty: "moyenne",
  },
];

/**
 * Choisit une question de secours non encore posée (en comparant les
 * énoncés présents dans l'historique de la conversation).
 */
function pickFallbackQcm(history: { role: string; content: string }[]): QcmQuestion {
  const asked = history
    .filter((m) => m.role === "assistant")
    .map((m) => m.content.toLowerCase());
  const unused = FALLBACK_QCMS.filter(
    (q) => !asked.some((a) => a.includes(q.question.toLowerCase().slice(0, 40)))
  );
  const pool = unused.length > 0 ? unused : FALLBACK_QCMS;
  return pool[Math.floor(Math.random() * pool.length)];
}

interface SessionAnswerRow {
  questionText: string;
  correctAnswer: string;
  userAnswer: string | null;
  isCorrect: boolean | null;
}

interface UserSessionRow {
  id: string;
  title: string;
  score: number;
  totalQuestions: number;
  startedAt: Date;
  completedAt: Date | null;
  sourceType: string;
  sourceId: string;
  answers: SessionAnswerRow[];
}

/**
 * Resolve the authenticated user (if any). Returns null for anonymous
 * visitors — the chat endpoint still works without auth, it just won't
 * include personalized context.
 */
async function resolveUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  const user = await db.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, name: true },
  });
  return user;
}

/**
 * Fetch the user's recent completed sessions (with answers) so we can
 * build a compact personalized context for the system prompt.
 */
async function fetchUserContext(userId: string): Promise<string> {
  try {
    const sessions = (await db.quizSession.findMany({
      where: { userId, completedAt: { not: null } },
      orderBy: { startedAt: "desc" },
      take: 10,
      select: {
        id: true,
        title: true,
        score: true,
        totalQuestions: true,
        startedAt: true,
        completedAt: true,
        sourceType: true,
        sourceId: true,
        answers: {
          select: {
            questionText: true,
            correctAnswer: true,
            userAnswer: true,
            isCorrect: true,
          },
          take: 30,
        },
      },
    })) as UserSessionRow[];

    if (sessions.length === 0) {
      return "[Contexte utilisateur: aucune session terminée pour le moment]";
    }

    const total = sessions.length;
    const avgPct = Math.round(
      sessions.reduce(
        (acc, s) =>
          acc + (s.score / Math.max(1, s.totalQuestions)) * 100,
        0,
      ) / total,
    );

    // Group wrong answers by session title (= bank) to identify weak areas.
    const wrongByBank = new Map<string, { wrong: number; total: number }>();
    for (const s of sessions) {
      const key = s.title ?? "Banque inconnue";
      const cur = wrongByBank.get(key) ?? { wrong: 0, total: 0 };
      cur.total += s.answers.length;
      for (const a of s.answers) {
        if (a.isCorrect === false || a.userAnswer === null) cur.wrong++;
      }
      wrongByBank.set(key, cur);
    }

    const ranked = Array.from(wrongByBank.entries())
      .map(([bank, { wrong, total }]) => ({
        bank,
        wrong,
        total,
        wrongRate: total > 0 ? Math.round((wrong / total) * 100) : 0,
      }))
      .sort((a, b) => b.wrongRate - a.wrongRate)
      .slice(0, 5);

    const topWeak = ranked
      .filter((r) => r.wrongRate >= 30)
      .slice(0, 3)
      .map(
        (r) =>
          `• ${r.bank} — ${r.wrongRate}% d'erreur (${r.wrong}/${r.total})`,
      )
      .join("\n");

    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentCount = sessions.filter(
      (s) => new Date(s.startedAt) >= last7Days,
    ).length;

    const parts: string[] = [
      `[Contexte utilisateur]`,
      `- Sessions terminées: ${total}`,
      `- Score moyen: ${avgPct}%`,
      `- Sessions dans les 7 derniers jours: ${recentCount}`,
    ];
    if (topWeak) {
      parts.push(`- Zones de faiblesse détectées:\n${topWeak}`);
    } else {
      parts.push("- Zones de faiblesse: aucune banque avec > 30% d'erreur");
    }
    return parts.join("\n");
  } catch (e) {
    console.error("fetchUserContext error:", e);
    return "";
  }
}

// Fallback responses when AI is unavailable.
// Built dynamically using the user's session history when available.
function getFallbackResponse(
  message: string,
  ctx: { avgPct: number; total: number; weakBanks: string[]; recentCount: number } | null,
): string {
  const msg = message.toLowerCase();

  // --- Personalized: "quelles sont mes faiblesses ?" -------------------
  if (
    msg.includes("faiblesse") ||
    msg.includes("faible") ||
    (msg.includes("mes") && msg.includes("erreur"))
  ) {
    if (!ctx || ctx.total === 0) {
      return "Je n'ai pas encore d'historique pour vous. Faites quelques sessions de quiz et revenez me voir — je pourrai alors identifier vos zones de faiblesse par matière. 📊";
    }
    if (ctx.weakBanks.length === 0) {
      return `Bravo ! 🎉 Sur vos ${ctx.total} session(s), aucune matière ne présente un taux d'erreur alarmant (> 30%). Votre score moyen est de ${ctx.avgPct}%. Continuez sur cette lancée !`;
    }
    return `D'après vos ${ctx.total} sessions récentes (score moyen ${ctx.avgPct}%), vos principales zones de faiblesse sont :\n\n${ctx.weakBanks.map((b) => `• ${b}`).join("\n")}\n\nJe recommande de refaire une session en mode correction immédiate dans ces matières pour ancrer les notions. ✅`;
  }

  // --- Personalized: "comment va mon progression ?" --------------------
  if (
    msg.includes("progression") ||
    msg.includes("progress") ||
    (msg.includes("comment") && msg.includes("va")) ||
    msg.includes("évolution") ||
    msg.includes("evolution")
  ) {
    if (!ctx || ctx.total === 0) {
      return "Vous n'avez pas encore de session terminée — la progression se mesure à partir de votre activité. Commencez par un quiz dans une banque qui vous intéresse et revenez me voir pour un bilan. 📈";
    }
    return `📊 Votre progression :\n\n• ${ctx.total} session(s) terminée(s)\n• Score moyen : ${ctx.avgPct}%\n• Activité 7 derniers jours : ${ctx.recentCount} session(s)\n\n${
      ctx.recentCount >= 3
        ? "Vous êtes régulier — c'est la clé de la réussite ! 🔥"
        : "Essayez de faire au moins 1 session par jour pour maintenir votre série. ⏰"
    }`;
  }

  // --- Personalized: "que dois-je réviser ?" ---------------------------
  if (
    msg.includes("réviser") ||
    msg.includes("reviser") ||
    msg.includes("révision") ||
    msg.includes("revision") ||
    (msg.includes("dois") && msg.includes("je")) ||
    msg.includes("par où commencer") ||
    msg.includes("par ou commencer")
  ) {
    if (!ctx || ctx.weakBanks.length === 0) {
      return "Pour réviser efficacement :\n\n1. 📚 Choisissez une banque de questions (Ctrl+K pour chercher)\n2. ⚡ Commencez en mode correction immédiate pour apprendre\n3. 📋 Refaites un examen blanc en mode final pour tester\n4. ⭐ Marquez vos questions difficiles en favoris\n\nAucune zone de faiblesse détectée — explorez de nouvelles matières !";
    }
    return `D'après vos sessions récentes, je vous recommande de prioriser :\n\n${ctx.weakBanks.map((b, i) => `${i + 1}. ${b}`).join("\n")}\n\nPour chaque matière :\n• Refaites une session de 10 questions en mode immédiat\n• Lisez attentivement chaque explication\n• Notez les notions que vous ratez le plus\n\nBonne révision ! 🎓`;
  }

  // --- "explique moi [concept]" → use AI or fallback -------------------
  if (
    msg.startsWith("explique") ||
    msg.startsWith("expliquer") ||
    msg.includes("c'est quoi") ||
    msg.includes("qu'est-ce que") ||
    msg.includes("qu est ce que") ||
    msg.includes("peux-tu expliquer") ||
    msg.includes("peux tu expliquer")
  ) {
    // Try to detect a few common concepts we have scripted answers for.
    if (msg.includes("aes") || msg.includes("alliance") || msg.includes("sahel")) {
      return "L'Alliance des États du Sahel (AES) regroupe le Mali, le Burkina Faso et le Niger.\n\n• Créée le 16 septembre 2023\n• Confédération signée le 9 juillet 2024\n• Devise: \"Un espace, un peuple, un destin\"";
    }
    if (msg.includes("fespaco") || msg.includes("cinéma")) {
      return "Le FESPACO (Festival Panafricain du Cinéma et de la Télévision de Ouagadougou) est le plus grand festival de cinéma africain. Il se tient à Ouagadougou, capitale du Burkina Faso, tous les deux ans depuis 1969.";
    }
    if (msg.includes("constitutionnel") || msg.includes("constitution")) {
      return "Le droit constitutionnel est la branche du droit qui étudie l'organisation de l'État, la séparation des pouvoirs (exécutif, législatif, judiciaire) et les droits fondamentaux des citoyens.\n\nAu Burkina Faso, la Constitution de 1991 (révisée plusieurs fois) instaure la transition politique actuelle dirigée par le Capitaine Ibrahim Traoré.";
    }
    return "Je peux expliquer des notions de culture générale, d'histoire, de géographie, de droit, de sciences, etc. Essayez par exemple : « Explique-moi l'AES » ou « C'est quoi la séparation des pouvoirs ? ». Pour des explications plus poussées, le Tuteur IA (onglet dans votre tableau de bord) est disponible pour les membres Premium. 🎓";
  }

  // --- "donne moi un conseil" → personalized advice --------------------
  if (
    msg.includes("conseil") ||
    msg.includes("astuce") ||
    msg.includes("recommandation") ||
    (msg.includes("un") && msg.includes("aide"))
  ) {
    if (ctx && ctx.total > 0) {
      if (ctx.avgPct < 40) {
        return `Conseil personnalisé : votre score moyen est de ${ctx.avgPct}%. Ne vous découragez pas ! 🌱\n\n1. Reprenez les bases — refaites une session facile\n2. Lisez attentivement chaque explication\n3. Visez la régularité (10-15 min/jour) plutôt que la quantité\n4. Utilisez la révision espacée pour mémoriser à long terme`;
      }
      if (ctx.avgPct < 70) {
        return `Conseil personnalisé : votre score moyen est de ${ctx.avgPct}%. Vous êtes sur la bonne voie ! 🚀\n\n1. Identifiez vos erreurs récurrentes (regardez vos zones de faiblesse)\n2. Refaites ces matières en mode immédiat\n3. Participez au défi quotidien pour gagner 2× XP\n4. Essayez un examen blanc complet pour tester votre endurance`;
      }
      return `Conseil personnalisé : votre score moyen est de ${ctx.avgPct}%. Excellent ! 🏆\n\n1. Essayez les questions difficiles pour vous challenger\n2. Aidez les autres sur le forum\n3. Visez 100% sur un examen blanc complet\n4. Partagez vos astuces avec votre groupe d'étude`;
    }
    return "Mes conseils de révision efficace :\n\n1. ⏰ Révisez régulièrement (15-30 min/jour) plutôt qu'en marathon\n2. 🔄 Alternez les matières pour maintenir l'attention\n3. ✅ Faites des quiz courts en mode immédiat pour apprendre\n4. 📋 Faites des examens blancs en mode final pour tester\n5. 📝 Notez vos erreurs et revoyez-les\n6. 🏆 Visez la régularité (série de jours)\n\nBonne révision ! 🎓";
  }

  // --- Greetings -------------------------------------------------------
  if (msg.includes("bonjour") || msg.includes("salut") || msg.includes("hello") || msg.includes("coucou")) {
    const name = ctx && ctx.total > 0 ? "" : "";
    return `Bonjour ${name}! 👋 Je suis QuizExam Assistant, votre coach IA pour la préparation aux concours du Burkina Faso.\n\nJe peux vous aider avec :\n• Des informations sur les concours et l'actualité du Burkina\n• Des conseils de révision personnalisés\n• L'analyse de votre progression et de vos faiblesses\n• Des informations sur la plateforme\n\nPosez-moi votre question !`;
  }

  // --- President / Burkina Faso politics -------------------------------
  if (msg.includes("président") || msg.includes("ibrahim") || msg.includes("traoré") || msg.includes("traore")) {
    return "Le Président du Burkina Faso est le Capitaine Ibrahim Traoré, au pouvoir depuis le 30 septembre 2022.\n\nLe Président de l'Assemblée Législative de Transition (ALT) est le Dr Ousmane Bougma, installé le 11 novembre 2022.";
  }

  // --- Regions ---------------------------------------------------------
  if (msg.includes("région") || msg.includes("region") || msg.includes("province")) {
    return "Le Burkina Faso compte 17 régions et 47 provinces (depuis juillet 2025).\n\nLes régions incluent: Hauts-Bassins, Cascades, Sud-Ouest, Boucle du Mouhoun, Nord, Centre, Plateau Central, Centre-Nord, Centre-Ouest, Centre-Est, Est, Sahel, etc.";
  }

  // --- Concours / exam preparation -------------------------------------
  if (msg.includes("concours") || msg.includes("examen") || msg.includes("préparation")) {
    return "Pour bien préparer vos concours :\n\n1. 📚 Révisez régulièrement avec les banques de questions\n2. 📝 Faites des examens blancs complets (50 questions)\n3. ⚡ Utilisez le mode correction immédiate pour apprendre\n4. ⭐ Marquez vos questions difficiles en favoris\n5. 📊 Suivez votre progression dans le tableau de bord\n\nQuelle matière vous intéresse ?";
  }

  // --- Mode correction -------------------------------------------------
  if (msg.includes("mode") || msg.includes("correction")) {
    return "La plateforme propose 2 modes de correction :\n\n• **Mode 1 - Correction immédiate**: La bonne réponse et l'explication s'affichent après chaque question. Idéal pour apprendre.\n\n• **Mode 2 - Correction finale**: Vous répondez à toutes les questions, puis voyez la correction à la fin. Simule les conditions d'examen réel.";
  }

  // --- Banques ---------------------------------------------------------
  if (msg.includes("banque") || msg.includes("question")) {
    return "La plateforme contient de nombreuses banques de questions avec des milliers de QCM, couvrant :\n\n• Culture générale (Burkina Faso, monde, actualité)\n• Droit\n• Sciences (SVT, maths, physique-chimie)\n• Lettres (littérature africaine, française)\n• Sciences sociales (sociologie, anthropologie, psychologie)\n• Et bien plus encore !\n\nUtilisez la recherche (Ctrl+K) pour trouver des questions par mot-clé.";
  }

  // --- Merci -----------------------------------------------------------
  if (msg.includes("merci") || msg.includes("thank")) {
    return "De rien ! 😊 N'hésitez pas si vous avez d'autres questions. Bonne révision et bonne chance pour vos concours ! 🎓🇧🇫";
  }

  // --- Default ---------------------------------------------------------
  return "Je suis votre assistant QuizExam BF. Je peux vous renseigner sur :\n\n• Le Burkina Faso (président, régions, AES, FESPACO...)\n• Les concours et examens\n• Comment utiliser la plateforme\n• Des conseils de révision\n• Votre progression et vos faiblesses\n\nPosez-moi une question précise ! 📚";
}

export async function POST(request: Request) {
  try {
    // E6.7 — per-user rate limiting (100 req/min).
    const limit = await applyUserRateLimit(request);
    if (!limit.allowed && limit.response) return limit.response;

    const body = await request.json();
    const { messages, mode } = body as {
      messages?: { role: string; content: string }[];
      mode?: "general" | "qcm";
    };
    if (!messages || !Array.isArray(messages) || messages.length === 0)
      return NextResponse.json({ error: "Messages requis" }, { status: 400 });

    /* ================================================================
     * MODE QCM D'APPRENTISSAGE (autonome)
     * Le client renvoie l'historique complet (questions générées +
     * réponses/corrections du candidat encodées en messages user). GLM
     * s'adapte à partir de cet historique : difficulté, thème, non-répétition.
     * ================================================================ */
    if (mode === "qcm") {
      const history = messages.slice(-24); // garde-fou de contexte
      try {
        const zai = await ZAI.create();
        const completion = await zai.chat.completions.create({
          messages: [
            { role: "assistant", content: QCM_SYSTEM_PROMPT },
            ...history.map((m) => ({
              role: (m.role === "user" ? "user" : "assistant") as
                | "user"
                | "assistant",
              content: m.content,
            })),
            {
              role: "user",
              content:
                "Génère MAINTENANT la prochaine question de QCM en respectant strictement le format JSON.",
            },
          ],
          thinking: { type: "disabled" },
        });
        const content = completion?.choices?.[0]?.message?.content ?? "";
        const qcm = parseQcm(content);
        if (qcm) {
          return NextResponse.json({ qcm, role: "assistant" });
        }
        // JSON invalide → question de secours (fonctionne hors-ligne IA).
        return NextResponse.json({
          qcm: pickFallbackQcm(history),
          degraded: true,
          role: "assistant",
        });
      } catch (aiError) {
        console.error("QCM AI error, using static fallback:", aiError);
        return NextResponse.json({
          qcm: pickFallbackQcm(history),
          degraded: true,
          role: "assistant",
        });
      }
    }

    // --- Build personalized context (if the user is signed in) ----------
    const user = await resolveUser();
    let contextInfo = "";
    let fallbackCtx: {
      avgPct: number;
      total: number;
      weakBanks: string[];
      recentCount: number;
    } | null = null;

    if (user) {
      const userCtxStr = await fetchUserContext(user.id);
      if (userCtxStr) contextInfo = `\n\n${userCtxStr}`;

      // Also build a compact ctx for the fallback path.
      try {
        const sessions = await db.quizSession.findMany({
          where: { userId: user.id, completedAt: { not: null } },
          orderBy: { startedAt: "desc" },
          take: 10,
          select: {
            score: true,
            totalQuestions: true,
            startedAt: true,
            title: true,
            answers: {
              select: { isCorrect: true, userAnswer: true },
              take: 30,
            },
          },
        });
        if (sessions.length > 0) {
          const avgPct = Math.round(
            sessions.reduce(
              (acc, s) =>
                acc + (s.score / Math.max(1, s.totalQuestions)) * 100,
              0,
            ) / sessions.length,
          );
          const wrongByBank = new Map<string, { wrong: number; total: number }>();
          for (const s of sessions) {
            const key = s.title ?? "Banque inconnue";
            const cur = wrongByBank.get(key) ?? { wrong: 0, total: 0 };
            cur.total += s.answers.length;
            for (const a of s.answers) {
              if (a.isCorrect === false || a.userAnswer === null) cur.wrong++;
            }
            wrongByBank.set(key, cur);
          }
          const weakBanks = Array.from(wrongByBank.entries())
            .map(([bank, { wrong, total }]) => ({
              bank,
              wrongRate: total > 0 ? wrong / total : 0,
            }))
            .filter((r) => r.wrongRate >= 0.3)
            .sort((a, b) => b.wrongRate - a.wrongRate)
            .slice(0, 3)
            .map(
              (r) =>
                `${r.bank} (${Math.round(r.wrongRate * 100)}% d'erreur)`,
            );
          const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          const recentCount = sessions.filter(
            (s) => new Date(s.startedAt) >= last7Days,
          ).length;
          fallbackCtx = {
            avgPct,
            total: sessions.length,
            weakBanks,
            recentCount,
          };
        }
      } catch {
        // ignore — fallback context stays null
      }
    } else {
      // Anonymous fallback: include bank catalogue summary as context.
      try {
        const banks = await db.questionBank.findMany({
          select: {
            title: true,
            _count: { select: { questions: true } },
          },
        });
        const totalQ = banks.reduce(
          (s, b) => s + b._count.questions,
          0,
        );
        contextInfo = `\n\n[Contexte: ${banks.length} banques, ${totalQ} questions]`;
      } catch {
        // ignore
      }
    }

    const conversation: Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }> = [
      { role: "assistant", content: SYSTEM_PROMPT + contextInfo },
      ...messages.map(
        (m: { role: string; content: string }) => ({
          role: (m.role === "user"
            ? "user"
            : m.role === "assistant"
              ? "assistant"
              : "system") as "system" | "user" | "assistant",
          content: m.content,
        }),
      ),
    ];

    // Get last user message for fallback
    const lastUserMessage =
      messages.filter((m: { role: string }) => m.role === "user").pop()
        ?.content || "";

    // Try AI first
    try {
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: conversation,
        thinking: { type: "disabled" },
      });
      const response = completion?.choices?.[0]?.message?.content;
      if (response && response.length > 0) {
        return NextResponse.json({ response, role: "assistant" });
      }
    } catch (aiError) {
      console.error("AI error, using fallback:", aiError);
    }

    // Fallback: use contextual responses
    const fallbackResponse = getFallbackResponse(lastUserMessage, fallbackCtx);
    return NextResponse.json({ response: fallbackResponse, role: "assistant" });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({
      response:
        "Bonjour ! Je suis QuizExam Assistant. Posez-moi une question sur le Burkina Faso, les concours, ou la plateforme ! 📚",
      role: "assistant",
    });
  }
}
