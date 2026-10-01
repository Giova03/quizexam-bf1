import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { chatComplete } from "@/lib/ai-engine";
import { applyUserRateLimit } from "@/lib/api-rate-limit";
import { parseQcmTextSmart, type ParsedQuestion } from "@/lib/qcm-parser";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/parse-qcm-text
 * Body: { text, engine?: "local" | "ai" | "auto" }
 *
 * Analyse un texte brut (copier-coller, PDF, Word) et retourne un tableau
 * structuré de questions QCM.
 *
 *   - "local" (défaut) : parseur déterministe sans failles (formats
 *     multiples : numéros, romains, options multi-par-ligne, corrigé
 *     global en fin de document, marquage inline ✅/✔/étoile/gras…).
 *   - "ai"    : extraction par LLM (GLM) — gère n'importe quel texte libre.
 *   - "auto"  : parseur local d'abord ; si 0 question détectée → IA.
 *
 * Réponse: { questions, count, engine, notes? }
 */

const AI_EXTRACT_PROMPT = `Tu es un extracteur de QCM ultra-précis. On te fournit un texte brut (issu d'un PDF, d'un Word ou d'un copier-coller) qui contient des questions à choix multiples, dans un format potentiellement chaotique.

TA MISSION :
1. Identifie CHAQUE question et ses options (a-d / A-D / 1-4 / I-IV / puces).
2. Identifie la bonne réponse depuis : marqueurs inline (✅ ✔ ✓ * (x) gras), lignes « Réponse : ... », corrigé global en fin de texte.
3. Si aucune réponse n'est identifiable pour une question, choisis la lettre la plus plausible et ajoute dans l'explication « (réponse proposée par l'IA, à vérifier) ».
4. Reconstitue les énoncés/options coupés par les sauts de ligne ou la pagination.
5. IGNORE les en-têtes, numéros de page, consignes et textes hors QCM.

FORMAT DE SORTIE — STRICTEMENT ce JSON, sans markdown ni commentaire :
{"questions":[{"question":"...","optionA":"...","optionB":"...","optionC":"...","optionD":"...","correctAnswer":"A|B|C|D","explanation":"..."}]}

RÈGLES :
- exactement 4 options par question (A, B, C, D), distinctes.
- correctAnswer : une seule lettre majuscule parmi A, B, C, D.
- explanation : justification courte ; si le texte n'en fournit pas, résume pourquoi la réponse est correcte.
- N'invente pas de questions absentes du texte ; extrais celles qui existent.`;

interface RawAiQuestion {
  question?: unknown;
  optionA?: unknown;
  optionB?: unknown;
  optionC?: unknown;
  optionD?: unknown;
  correctAnswer?: unknown;
  explanation?: unknown;
}

function coerceAiQuestions(content: string): ParsedQuestion[] {
  if (!content) return [];
  let cleaned = content.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json|JSON)?\s*/, "")
      .replace(/```\s*$/, "");
  }
  let data: unknown = null;
  try {
    data = JSON.parse(cleaned);
  } catch {
    const m =
      cleaned.match(/\{[\s\S]*\}/) ?? cleaned.match(/\[[\s\S]*\]/);
    if (!m) return [];
    try {
      data = JSON.parse(m[0]);
    } catch {
      return [];
    }
  }
  const list: unknown[] = Array.isArray(data)
    ? data
    : Array.isArray((data as { questions?: unknown[] })?.questions)
      ? ((data as { questions: unknown[] }).questions)
      : [];
  const out: ParsedQuestion[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const o = item as RawAiQuestion;
    const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
    const question = str(o.question);
    const options = [str(o.optionA), str(o.optionB), str(o.optionC), str(o.optionD)];
    if (!question || options.some((x) => !x)) continue;
    const ca = str(o.correctAnswer).toUpperCase().replace(/[^A-D]/g, "");
    const warnings: string[] = [];
    let correctAnswer = ["A", "B", "C", "D"].includes(ca) ? ca : "";
    if (!correctAnswer) {
      correctAnswer = "A";
      warnings.push("Réponse reconstruite par l'IA — à vérifier");
    }
    out.push({
      question,
      optionA: options[0],
      optionB: options[1],
      optionC: options[2],
      optionD: options[3],
      correctAnswer,
      explanation: str(o.explanation),
      warnings,
    });
  }
  return out;
}

async function extractWithAi(text: string): Promise<ParsedQuestion[]> {
  // Découpage en tronçons (~4000 caractères) aux frontières de paragraphes.
  const CHUNK = 4000;
  const chunks: string[] = [];
  let rest = text.trim();
  while (rest.length > 0 && chunks.length < 3) {
    if (rest.length <= CHUNK) {
      chunks.push(rest);
      break;
    }
    let cut = rest.lastIndexOf("\n", CHUNK);
    if (cut < CHUNK * 0.5) cut = CHUNK;
    chunks.push(rest.slice(0, cut));
    rest = rest.slice(cut).trim();
  }

  const seen = new Set<string>();
  const merged: ParsedQuestion[] = [];
  for (const chunk of chunks) {
    const result = await chatComplete(
      [
        { role: "system", content: AI_EXTRACT_PROMPT },
        {
          role: "user",
          content: `Extrais les QCM de ce texte :\n\n${chunk}`,
        },
      ],
      { temperature: 0.2, timeoutMs: 35_000 },
    );
    if (!result) continue;
    for (const q of coerceAiQuestions(result.content)) {
      const key = q.question.toLowerCase().replace(/\s+/g, " ").slice(0, 120);
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(q);
      }
    }
  }
  return merged;
}

export async function POST(request: Request) {
  try {
    // Protection anti-abus (le chemin IA consomme des tokens).
    const limit = await applyUserRateLimit(request);
    if (!limit.allowed && limit.response) return limit.response;

    const body = (await request.json()) as {
      text?: unknown;
      engine?: unknown;
    };
    const text = typeof body.text === "string" ? body.text : "";
    const engine =
      body.engine === "ai" || body.engine === "auto" ? body.engine : "local";

    if (!text.trim()) {
      return NextResponse.json({ error: "Texte requis" }, { status: 400 });
    }

    /* ---- Moteur local (déterministe) ---- */
    const localQuestions = parseQcmTextSmart(text);

    if (engine === "ai") {
      const aiQuestions = await extractWithAi(text);
      if (aiQuestions.length > 0) {
        return NextResponse.json({
          questions: aiQuestions,
          count: aiQuestions.length,
          engine: "ai",
          notes:
            localQuestions.length > 0
              ? `${localQuestions.length} question(s) également détectée(s) par le parseur local.`
              : undefined,
        });
      }
      return NextResponse.json(
        {
          error:
            "L'IA n'a détecté aucune question exploitable. Vérifiez que le texte contient bien des QCM.",
        },
        { status: 422 },
      );
    }

    if (engine === "auto" && localQuestions.length === 0) {
      const aiQuestions = await extractWithAi(text);
      return NextResponse.json({
        questions: aiQuestions,
        count: aiQuestions.length,
        engine: aiQuestions.length > 0 ? "ai-fallback" : "local",
        notes:
          aiQuestions.length > 0
            ? "Le parseur local n'a rien détecté — extraction IA utilisée."
            : undefined,
      });
    }

    return NextResponse.json({
      questions: localQuestions,
      count: localQuestions.length,
      engine: "local",
    });
  } catch (error) {
    console.error("QCM text parse error:", error);
    return NextResponse.json(
      { error: "Échec de l'analyse du texte" },
      { status: 500 },
    );
  }
}

/** Session requise non-admin acceptée : l'extraction locale reste ouverte
 * aux connectés (cohérent avec l'ancien comportement). L'extraction IA
 * est réservée aux admins via /api/extract-qcm-ai. */
export async function GET() {
  const session = await getServerSession(authOptions);
  return NextResponse.json({
    engine: "local+ai",
    authenticated: Boolean(session?.user),
  });
}
