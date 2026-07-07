import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import ZAI from "z-ai-web-dev-sdk";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { applyUserRateLimit } from "@/lib/api-rate-limit";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SYSTEM_PROMPT = `Tu es QuizExam Assistant, le chatbot intelligent de la plateforme QuizExam BF — une plateforme burkinabè de préparation aux concours.

TON RÔLE: Aider les visiteurs, expliquer des notions de cours, donner des conseils de révision, répondre sur le fonctionnement de la plateforme, et analyser la progression de l'utilisateur.

INFORMATIONS VÉRIFIÉES (juin 2025):
- Président du Faso: Capitaine Ibrahim Traoré
- Président ALT: Dr Ousmane Bougma (installée le 11 novembre 2022)
- 17 régions et 47 provinces (depuis juillet 2025)
- AES: Mali, Burkina Faso, Niger — créée 16/09/2023, Confédération 09/07/2024
- Devise AES: "Un espace, un peuple, un destin"
- FESPACO, SIAO à Ouagadougou; SNC à Bobo-Dioulasso

STYLE: Français, amical, concis, encourageant. Si tu ne sais pas, dis-le.
PERSONNALISATION: Quand tu reçois du contexte utilisateur (zones de faiblesse, progression, sessions récentes), utilise-le pour donner des conseils personnalisés et concrets.`;

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
    const { messages } = body;
    if (!messages || !Array.isArray(messages) || messages.length === 0)
      return NextResponse.json({ error: "Messages requis" }, { status: 400 });

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
