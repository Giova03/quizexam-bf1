import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import ZAI from "z-ai-web-dev-sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
<<<<<<< Updated upstream
export const runtime = "nodejs";

const MIN_COUNT = 5;
const MAX_COUNT = 20;
const MAX_TEXT_CHARS = 5000;

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") return null;
=======

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return null;
  }
>>>>>>> Stashed changes
  return session;
}

interface GeneratedQuestion {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
}

<<<<<<< Updated upstream
/** Strip ```json fences if the model wrapped its output in markdown. */
function stripFences(s: string): string {
  let t = s.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json|JSON)?\s*/, "").replace(/```\s*$/, "");
  }
  return t.trim();
}

/**
 * Validate a single question object: must have all required string fields, a
 * correctAnswer in A-D, and 4 distinct options (case-insensitive).
 */
function isValidQuestion(q: unknown): q is GeneratedQuestion {
  if (!q || typeof q !== "object") return false;
  const o = q as Record<string, unknown>;
  for (const f of ["question", "optionA", "optionB", "optionC", "optionD", "correctAnswer", "explanation"]) {
    if (typeof o[f] !== "string" || (o[f] as string).trim().length === 0) return false;
  }
  if (!["A", "B", "C", "D"].includes(String(o.correctAnswer))) return false;
  const opts = [o.optionA, o.optionB, o.optionC, o.optionD].map((s) =>
    String(s).trim().toLowerCase()
  );
  if (new Set(opts).size < 4) return false;
  return true;
}

/**
 * Try several JSON-parsing strategies to be resilient to LLM formatting quirks:
 * direct parse, fenced parse, first {...} block, first [...] block.
 */
function parseQuestions(content: string): GeneratedQuestion[] {
  if (!content) return [];
  const cleaned = stripFences(content);

  // Strategy 1: direct parse
  try {
    const p = JSON.parse(cleaned);
    if (Array.isArray(p)) return p.filter(isValidQuestion) as GeneratedQuestion[];
    if (p && Array.isArray((p as { questions?: unknown[] }).questions)) {
      return ((p as { questions: unknown[] }).questions).filter(isValidQuestion) as GeneratedQuestion[];
    }
  } catch {
    /* fall through */
  }

  // Strategy 2: first {...} block (model sometimes appends trailing prose)
  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      const p = JSON.parse(objMatch[0]);
      if (p && Array.isArray((p as { questions?: unknown[] }).questions)) {
        return ((p as { questions: unknown[] }).questions).filter(isValidQuestion) as GeneratedQuestion[];
      }
    } catch {
      /* fall through */
    }
  }

  // Strategy 3: first [...] block
  const arrMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try {
      const p = JSON.parse(arrMatch[0]);
      if (Array.isArray(p)) return p.filter(isValidQuestion) as GeneratedQuestion[];
    } catch {
      /* fall through */
=======
function buildPrompt(text: string, count: number, subject: string): string {
  return `Tu es un générateur expert de QCM pour une plateforme de préparation aux concours.
À partir du texte source fourni ci-dessous, génère exactement ${count} questions à choix multiples (QCM) sur le sujet: "${subject}".

CONTRAINTES STRICTES:
1. Chaque question doit avoir EXACTEMENT 4 options (A, B, C, D) — pas plus, pas moins.
2. Les 4 options doivent être différentes les unes des autres.
3. Une seule réponse correcte (lettre A, B, C ou D).
4. Fournis une explication concise (1-3 phrases) pour chaque question.
5. Les questions doivent porter sur le contenu du texte source.
6. Évite les questions trop évidentes ou triviales.
7. Varie le type de questions (définition, application, analyse, fait).

FORMAT DE SORTIE — RÉPONDS UNIQUEMENT AVEC DU JSON VALIDE, SANS TEXTE AUTOUR:
[
  {
    "question": "Libellé de la question?",
    "optionA": "Texte de l'option A",
    "optionB": "Texte de l'option B",
    "optionC": "Texte de l'option C",
    "optionD": "Texte de l'option D",
    "correctAnswer": "A",
    "explanation": "Explication courte de la réponse."
  }
]

TEXTE SOURCE:
"""
${text}
"""

Génère maintenant ${count} questions au format JSON exact:`;
}

function extractJson(content: string): any[] {
  // Try to find a JSON array in the response
  if (!content) return [];

  // First try direct parse
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.questions)) return parsed.questions;
  } catch {
    // fall through
  }

  // Try to find the first [ ... ] block
  const start = content.indexOf("[");
  const end = content.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start) {
    const slice = content.slice(start, end + 1);
    try {
      return JSON.parse(slice);
    } catch {
      // fall through
>>>>>>> Stashed changes
    }
  }

  return [];
}

<<<<<<< Updated upstream
/** Trim each validated question's string fields to avoid storing huge blobs. */
function cleanQuestion(q: GeneratedQuestion): GeneratedQuestion {
  return {
    question: q.question.trim(),
    optionA: q.optionA.trim(),
    optionB: q.optionB.trim(),
    optionC: q.optionC.trim(),
    optionD: q.optionD.trim(),
    correctAnswer: q.correctAnswer.trim().toUpperCase(),
    explanation: q.explanation.trim(),
  };
}

/**
 * Ask the LLM to produce {count} QCM questions from the provided text. Uses
 * the exact prompt format mandated by the task spec.
 *
 * If the first attempt yields fewer than `count` valid questions, we retry up
 * to 2 more times and merge results (dedup by question text).
 */
async function generateQuestions(
  text: string,
  count: number,
  subject: string
): Promise<GeneratedQuestion[]> {
  const zai = await ZAI.create();
  const subjectPart = subject && subject.trim().length > 0 ? ` (sujet: ${subject.trim()})` : "";

  const seen = new Set<string>();
  const collected: GeneratedQuestion[] = [];

  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS && collected.length < count; attempt++) {
    const remaining = count - collected.length;
    const prompt = `Génère ${remaining} questions QCM à choix multiples basées sur ce texte${subjectPart}: ${text}\n\nFormat JSON: {questions: [{question, optionA, optionB, optionC, optionD, correctAnswer, explanation}]}

EXIGENCES:
- Les questions doivent porter sur le contenu du texte fourni.
- 4 options A, B, C, D distinctes (pas de doublons, pas de "Toutes les réponses" génériques).
- correctAnswer doit être une seule lettre parmi "A", "B", "C", "D".
- explanation: une phrase courte qui justifie la bonne réponse.
- Réponds en JSON valide uniquement, sans markdown, sans texte avant ou après.`;

    try {
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: "assistant",
            content:
              "Tu es un générateur expert de QCM pédagogiques. Tu réponds STRICTEMENT en JSON valide, sans markdown ni commentaire.",
          },
          { role: "user", content: prompt },
        ],
        thinking: { type: "disabled" },
      });

      const content = completion?.choices?.[0]?.message?.content ?? "";
      const parsed = parseQuestions(content);
      for (const q of parsed) {
        const c = cleanQuestion(q);
        const key = c.question.toLowerCase().replace(/\s+/g, " ").slice(0, 120);
        if (!seen.has(key)) {
          seen.add(key);
          collected.push(c);
        }
        if (collected.length >= count) break;
      }
    } catch (err) {
      console.error(`generate-qcm attempt ${attempt} failed:`, err);
      // Brief backoff before retrying.
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
  }

  return collected.slice(0, count);
=======
function validateQuestion(q: any): q is GeneratedQuestion {
  if (!q || typeof q !== "object") return false;
  const required = ["question", "optionA", "optionB", "optionC", "optionD", "correctAnswer", "explanation"];
  for (const k of required) {
    if (typeof q[k] !== "string" || !q[k].trim()) return false;
  }
  if (!["A", "B", "C", "D"].includes(String(q.correctAnswer).toUpperCase())) {
    return false;
  }
  // All 4 options must be distinct
  const opts = [q.optionA, q.optionB, q.optionC, q.optionD].map((s) =>
    String(s).trim().toLowerCase()
  );
  if (new Set(opts).size < 4) return false;
  return true;
}

function normalizeQuestion(q: any): GeneratedQuestion {
  return {
    question: String(q.question).trim(),
    optionA: String(q.optionA).trim(),
    optionB: String(q.optionB).trim(),
    optionC: String(q.optionC).trim(),
    optionD: String(q.optionD).trim(),
    correctAnswer: String(q.correctAnswer).trim().toUpperCase(),
    explanation: String(q.explanation).trim(),
  };
>>>>>>> Stashed changes
}

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

<<<<<<< Updated upstream
  let body: { text?: unknown; count?: unknown; subject?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corps de requête JSON invalide." },
      { status: 400 }
    );
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text || text.length < 30) {
    return NextResponse.json(
      { error: "Texte source trop court pour générer des questions (minimum 30 caractères)." },
      { status: 400 }
    );
  }

  // Parse and clamp count to the 5-20 range.
  let count = typeof body.count === "number" ? body.count : parseInt(String(body.count ?? "10"), 10);
  if (!Number.isFinite(count)) count = 10;
  count = Math.min(MAX_COUNT, Math.max(MIN_COUNT, Math.round(count)));

  const subject = typeof body.subject === "string" ? body.subject.trim() : "";

  // Truncate text just in case the client sent a longer version.
  const truncatedText = text.slice(0, MAX_TEXT_CHARS);

  try {
    const questions = await generateQuestions(truncatedText, count, subject);
=======
  try {
    const body = await request.json();
    const { text, count, subject } = body;
    if (!text || typeof text !== "string" || text.trim().length < 50) {
      return NextResponse.json(
        { error: "Texte source trop court (min 50 caractères)" },
        { status: 400 }
      );
    }
    const n = Math.min(20, Math.max(5, parseInt(count, 10) || 10));
    const subj = (subject ?? "général").toString().trim();

    const prompt = buildPrompt(text.slice(0, 4500), n, subj);

    let questions: GeneratedQuestion[] = [];

    try {
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: "assistant",
            content:
              "Tu es un générateur expert de QCM pour la préparation aux concours. Tu réponds UNIQUEMENT avec du JSON valide, sans texte avant ou après.",
          },
          { role: "user", content: prompt },
        ],
        thinking: { type: "disabled" },
      });
      const content = completion?.choices?.[0]?.message?.content ?? "";
      const raw = extractJson(content);
      questions = raw.filter(validateQuestion).map(normalizeQuestion);
    } catch (aiError) {
      console.error("AI generation failed:", aiError);
    }
>>>>>>> Stashed changes

    if (questions.length === 0) {
      return NextResponse.json(
        {
          error:
<<<<<<< Updated upstream
            "L'IA n'a pas pu générer de questions valides à partir de ce texte. Essayez avec un PDF plus textuel ou un autre extrait.",
=======
            "Échec de la génération: le modèle n'a pas produit de questions valides. Réessayez avec un texte plus clair.",
          questions: [],
>>>>>>> Stashed changes
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
<<<<<<< Updated upstream
      count: questions.length,
      requested: count,
      subject,
      questions,
    });
  } catch (error: unknown) {
    console.error("generate-qcm error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération des questions par l'IA." },
=======
      questions,
      count: questions.length,
      requested: n,
    });
  } catch (error) {
    console.error("Generate QCM error:", error);
    return NextResponse.json(
      { error: "Échec de la génération de QCM" },
>>>>>>> Stashed changes
      { status: 500 }
    );
  }
}
