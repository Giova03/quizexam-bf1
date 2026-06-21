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

    // Initialize ZAI SDK with error handling
    let zai;
    try {
      zai = await ZAI.create();
    } catch (initErr) {
      console.error("ZAI init error:", initErr);
      return NextResponse.json({
        response: "Je suis暂时 indisponible. Le service IA rencontre un problème technique. Réessayez dans un instant. 🙏",
        role: "assistant",
        error: "ZAI_INIT_FAILED"
      });
    }

    let completion;
    try {
      completion = await zai.chat.completions.create({
        messages: conversation,
        thinking: { type: "disabled" },
      });
    } catch (chatErr: any) {
      console.error("ZAI chat error:", chatErr);
      // Return a helpful fallback response
      const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || "";

      // Try to provide a helpful response based on keywords
      if (lastMessage.includes("bonjour") || lastMessage.includes("salut") || lastMessage.includes("hello")) {
        return NextResponse.json({
          response: "Bonjour ! 👋 Je suis QuizExam Assistant. Je peux vous aider avec:\n• Des explications sur les cours\n• Des conseils de révision\n• Des informations sur la plateforme\n\nPosez-moi votre question !",
          role: "assistant"
        });
      }
      if (lastMessage.includes("président") || lastMessage.includes("burkina")) {
        return NextResponse.json({
          response: "Le Président du Burkina Faso est le Capitaine Ibrahim Traoré, au pouvoir depuis le 30 septembre 2022. Le Président de l'Assemblée Législative de Transition (ALT) est le Dr Ousmane Bougma.",
          role: "assistant"
        });
      }
      if (lastMessage.includes("concours") || lastMessage.includes("examen")) {
        return NextResponse.json({
          response: "Pour préparer un concours, je recommande:\n1. Révisez régulièrement avec les banques de questions\n2. Faites des examens blancs complets\n3. Utilisez le mode correction immédiate pour apprendre\n4. Marquez vos questions difficiles en favoris\n\nQuelle matière vous intéresse ?",
          role: "assistant"
        });
      }

      return NextResponse.json({
        response: "Je rencontre une difficulté technique temporaire. Vous pouvez continuer à utiliser la plateforme normalement. Pour votre question, je vous suggère de consulter les banques de questions disponibles. 📚",
        role: "assistant"
      });
    }

    const response = completion?.choices?.[0]?.message?.content ?? "Désolé, je n'ai pas pu générer de réponse.";
    return NextResponse.json({ response, role: "assistant" });
  } catch (error: any) {
    console.error("Chat API outer error:", error);
    return NextResponse.json({
      response: "Une erreur est survenue. Vous pouvez continuer à utiliser la plateforme normalement.",
      role: "assistant"
    });
  }
}
