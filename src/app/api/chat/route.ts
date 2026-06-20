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

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({ messages: conversation, thinking: { type: "disabled" } });
    const response = completion?.choices?.[0]?.message?.content ?? "Désolé, je n'ai pas pu générer de réponse.";
    return NextResponse.json({ response, role: "assistant" });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ response: "Désolé, une erreur est survenue. Réessayez." }, { status: 500 });
  }
}
