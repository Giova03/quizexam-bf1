import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import ZAI from "z-ai-web-dev-sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const runtime = "nodejs";

/**
 * POST /api/translate
 *
 * Translates a piece of French text into a target language using the
 * z-ai-web-dev-sdk chat completions API (same pattern as /api/chat and
 * /api/generate-questions).
 *
 * Body: { text: string, targetLang: "moore" | "dioula" | "en" | "fr" }
 *
 * The endpoint is open to any authenticated user (admins will be the main
 * callers via the TranslationHelper component, but there's no need to
 * restrict — translation is read-only and rate-limited upstream by the LLM
 * provider).
 */

const MAX_INPUT_CHARS = 4000;

const LANG_LABELS: Record<string, string> = {
  moore: "Mooré (langue nationale du Burkina Faso)",
  dioula: "Dioula (langue nationale du Burkina Faso)",
  en: "Anglais",
  fr: "Français",
};

/** Allow ADMIN and CONTRIBUTOR roles by default; visitors also allowed. */
async function getSession() {
  return getServerSession(authOptions);
}

function buildPrompt(text: string, targetLang: string): string {
  const label = LANG_LABELS[targetLang] ?? targetLang;
  return `Traduis le texte français suivant en ${label}.

RÈGLES:
- Conserve le sens exact du texte source.
- Si la traduction mot-à-mot est impossible (concept inexistant dans la langue cible), propose l'équivalent le plus naturel et idiomatique.
- Ne renvoie QUE la traduction, sans commentaire, sans guillemets, sans préfixe "Traduction :".
- Si le texte contient du jargon technique ou des noms propres, garde-les tels quels.
- Préserve les retours à la ligne et la mise en forme du texte source.

TEXTE À TRADUIRE:
"""
${text}
"""`;
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json(
      { error: "Connexion requise" },
      { status: 401 }
    );
  }

  let body: { text?: unknown; targetLang?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corps de requête JSON invalide." },
      { status: 400 }
    );
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json(
      { error: "Le champ 'text' est requis." },
      { status: 400 }
    );
  }
  if (text.length > MAX_INPUT_CHARS) {
    return NextResponse.json(
      { error: `Texte trop long (maximum ${MAX_INPUT_CHARS} caractères).` },
      { status: 400 }
    );
  }

  const targetLang =
    typeof body.targetLang === "string" ? body.targetLang.trim().toLowerCase() : "";
  if (!LANG_LABELS[targetLang]) {
    return NextResponse.json(
      {
        error: `Langue cible invalide. Langues supportées : ${Object.keys(LANG_LABELS).join(", ")}.`,
      },
      { status: 400 }
    );
  }

  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "assistant",
          content:
            "Tu es un traducteur professionnel spécialisé dans les langues nationales du Burkina Faso et les langues internationales. Tu réponds uniquement avec la traduction, sans aucun commentaire.",
        },
        { role: "user", content: buildPrompt(text, targetLang) },
      ],
      thinking: { type: "disabled" },
    });

    const translated =
      completion?.choices?.[0]?.message?.content?.trim() ?? "";

    if (!translated) {
      return NextResponse.json(
        { error: "L'IA n'a pas pu produire une traduction. Réessayez." },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      original: text,
      targetLang,
      translated,
    });
  } catch (error) {
    console.error("translate error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la traduction par l'IA." },
      { status: 500 }
    );
  }
}
