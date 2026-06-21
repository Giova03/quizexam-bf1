import { NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SYSTEM_PROMPT = `Tu es QuizExam Assistant, le chatbot intelligent de la plateforme QuizExam BF — une plateforme burkinabè de préparation aux concours.

TON RÔLE: Aider les visiteurs, expliquer des notions de cours, donner des conseils de révision, répondre sur le fonctionnement de la plateforme.

INFORMATIONS VÉRIFIÉES (juin 2025):
- Président du Faso: Capitaine Ibrahim Traoré
- Président ALT: Dr Ousmane Bougma (installée le 11 novembre 2022)
- 17 régions et 47 provinces (depuis juillet 2025)
- AES: Mali, Burkina Faso, Niger — créée 16/09/2023, Confédération 09/07/2024
- Devise AES: "Un espace, un peuple, un destin"
- FESPACO, SIAO à Ouagadougou; SNC à Bobo-Dioulasso

STYLE: Français, amical, concis, encourageant. Si tu ne sais pas, dis-le.`;

// Fallback responses when AI is unavailable
function getFallbackResponse(message: string): string {
  const msg = message.toLowerCase();

  // Greetings
  if (msg.includes("bonjour") || msg.includes("salut") || msg.includes("hello") || msg.includes("coucou")) {
    return "Bonjour ! 👋 Je suis QuizExam Assistant, votre coach IA pour la préparation aux concours du Burkina Faso.\n\nJe peux vous aider avec :\n• Des informations sur les concours et l'actualité du Burkina\n• Des conseils de révision\n• Des informations sur la plateforme\n\nPosez-moi votre question !";
  }

  // President / Burkina Faso politics
  if (msg.includes("président") || msg.includes("ibrahim") || msg.includes("traoré")) {
    return "Le Président du Burkina Faso est le Capitaine Ibrahim Traoré, au pouvoir depuis le 30 septembre 2022.\n\nLe Président de l'Assemblée Législative de Transition (ALT) est le Dr Ousmane Bougma, installé le 11 novembre 2022.";
  }

  // AES
  if (msg.includes("aes") || msg.includes("alliance") || msg.includes("sahel")) {
    return "L'Alliance des États du Sahel (AES) regroupe le Mali, le Burkina Faso et le Niger.\n\n• Créée le 16 septembre 2023\n• Confédération signée le 9 juillet 2024\n• Devise: \"Un espace, un peuple, un destin\"";
  }

  // FESPACO
  if (msg.includes("fespaco") || msg.includes("cinéma")) {
    return "Le FESPACO (Festival Panafricain du Cinéma et de la Télévision de Ouagadougou) est le plus grand festival de cinéma africain. Il se tient à Ouagadougou, capitale du Burkina Faso.";
  }

  // Regions
  if (msg.includes("région") || msg.includes("province")) {
    return "Le Burkina Faso compte 17 régions et 47 provinces (depuis juillet 2025).\n\nLes régions incluent: Hauts-Bassins, Cascades, Sud-Ouest, Boucle du Mouhoun, Nord, Centre, Plateau Central, Centre-Nord, Centre-Ouest, Centre-Est, Est, Sahel, etc.";
  }

  // Concours / exam preparation
  if (msg.includes("concours") || msg.includes("examen") || msg.includes("préparation")) {
    return "Pour bien préparer vos concours :\n\n1. 📚 Révisez régulièrement avec les banques de questions\n2. 📝 Faites des examens blancs complets (50 questions)\n3. ⚡ Utilisez le mode correction immédiate pour apprendre\n4. ⭐ Marquez vos questions difficiles en favoris\n5. 📊 Suivez votre progression dans le tableau de bord\n\nQuelle matière vous intéresse ?";
  }

  // Mode correction
  if (msg.includes("mode") || msg.includes("correction")) {
    return "La plateforme propose 2 modes de correction :\n\n• **Mode 1 - Correction immédiate**: La bonne réponse et l'explication s'affichent après chaque question. Idéal pour apprendre.\n\n• **Mode 2 - Correction finale**: Vous répondez à toutes les questions, puis voyez la correction à la fin. Simule les conditions d'examen réel.";
  }

  // Banques
  if (msg.includes("banque") || msg.includes("question")) {
    return "La plateforme contient 53 banques de questions avec plus de 3155 QCM, couvrant :\n\n• Culture générale (Burkina Faso, monde, actualité)\n• Droit (33 modules UFR)\n• Sciences (SVT, maths, physique-chimie)\n• Lettres (littérature africaine, française, anglaise)\n• Sciences sociales (sociologie, anthropologie, psychologie)\n• Et bien plus encore !\n\nUtilisez la recherche (Ctrl+K) pour trouver des questions par mot-clé.";
  }

  // Conseil / révision
  if (msg.includes("conseil") || msg.includes("réviser") || msg.includes("révision")) {
    return "Mes conseils de révision efficace :\n\n1. ⏰ Révisez régulièrement (15-30 min/jour) plutôt qu'en marathon\n2. 🔄 Alternez les matières pour maintenir l'attention\n3. ✅ Faites des quiz courts en mode immédiat pour apprendre\n4. 📋 Faites des examens blancs en mode final pour tester\n5. 📝 Notez vos erreurs et revoyez-les\n6. 🏆 Visez la régularité (série de jours)\n\nBonne révision ! 🎓";
  }

  // Merci
  if (msg.includes("merci") || msg.includes("thank")) {
    return "De rien ! 😊 N'hésitez pas si vous avez d'autres questions. Bonne révision et bonne chance pour vos concours ! 🎓🇧🇫";
  }

  // Default
  return "Je suis votre assistant QuizExam BF. Je peux vous renseigner sur :\n\n• Le Burkina Faso (président, régions, AES, FESPACO...)\n• Les concours et examens\n• Comment utiliser la plateforme\n• Des conseils de révision\n\nPosez-moi une question précise ! 📚";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messages } = body;
    if (!messages || !Array.isArray(messages) || messages.length === 0)
      return NextResponse.json({ error: "Messages requis" }, { status: 400 });

    let contextInfo = "";
    try {
      const banks = await db.questionBank.findMany({ select: { title: true, _count: { select: { questions: true } } } });
      const totalQ = banks.reduce((s, b) => s + b._count.questions, 0);
      contextInfo = `\n\n[Contexte: ${banks.length} banques, ${totalQ} questions]`;
    } catch {}

    const conversation = [
      { role: "assistant", content: SYSTEM_PROMPT + contextInfo },
      ...messages.map((m: any) => ({ role: m.role, content: m.content })),
    ];

    // Get last user message for fallback
    const lastUserMessage = messages.filter((m: any) => m.role === "user").pop()?.content || "";

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
    const fallbackResponse = getFallbackResponse(lastUserMessage);
    return NextResponse.json({ response: fallbackResponse, role: "assistant" });
  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json({
      response: "Bonjour ! Je suis QuizExam Assistant. Posez-moi une question sur le Burkina Faso, les concours, ou la plateforme ! 📚",
      role: "assistant"
    });
  }
}
