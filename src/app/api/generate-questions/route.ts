import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import ZAI from "z-ai-web-dev-sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const runtime = "nodejs";

const MIN_COUNT = 5;
const MAX_COUNT = 20;
const MAX_SUBJECT_LENGTH = 300;

interface GeneratedQuestion {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
}

/** Allow ADMIN and CONTRIBUTOR roles to use the AI generator. */
async function requirePrivileged() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role ?? "VISITOR";
  if (role !== "ADMIN" && role !== "CONTRIBUTOR") return null;
  return session;
}

function stripFences(s: string): string {
  let t = s.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json|JSON)?\s*/, "").replace(/```\s*$/, "");
  }
  return t.trim();
}

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

  // Strategy 2: first {...} block
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
    }
  }

  return [];
}

function cleanQuestion(q: GeneratedQuestion): GeneratedQuestion {
  return {
    question: q.question.trim().slice(0, 2000),
    optionA: q.optionA.trim().slice(0, 500),
    optionB: q.optionB.trim().slice(0, 500),
    optionC: q.optionC.trim().slice(0, 500),
    optionD: q.optionD.trim().slice(0, 500),
    correctAnswer: q.correctAnswer.trim().toUpperCase(),
    explanation: q.explanation.trim().slice(0, 1000),
  };
}

/**
 * Ask the LLM to produce {count} QCM questions about the given subject.
 *
 * Unlike /api/generate-qcm (which extracts QCM from a provided text), this
 * endpoint asks the AI to use its own knowledge on the given subject.
 */
async function generateQuestions(
  subject: string,
  count: number
): Promise<GeneratedQuestion[]> {
  const zai = await ZAI.create();

  const seen = new Set<string>();
  const collected: GeneratedQuestion[] = [];
  const MAX_ATTEMPTS = 3;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS && collected.length < count; attempt++) {
    const remaining = count - collected.length;
    const prompt = `Génère ${remaining} questions QCM à choix multiples sur le sujet suivant : "${subject}".

Format JSON: {questions: [{question, optionA, optionB, optionC, optionD, correctAnswer, explanation}]}

EXIGENCES:
- Les questions doivent porter sur le sujet demandé et être pertinentes.
- 4 options A, B, C, D distinctes (pas de doublons, pas de "Toutes les réponses" génériques).
- correctAnswer doit être une seule lettre parmi "A", "B", "C", "D".
- explanation: une phrase courte qui justifie la bonne réponse.
- Adapte le niveau et le contexte au Burkina Faso quand c'est pertinent (culture, concours, administration).
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
      console.error(`generate-questions attempt ${attempt} failed:`, err);
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
  }

  return collected.slice(0, count);
}

/**
 * POST /api/generate-questions
 * Body: { subject, count, bankId?, addToBank? }
 *
 * Generates QCM questions on the given subject using z-ai-web-dev-sdk.
 * If `bankId` is provided AND `addToBank` is true, the validated questions
 * are inserted into the bank.
 */
export async function POST(request: Request) {
  const session = await requirePrivileged();
  if (!session) {
    return NextResponse.json(
      { error: "Réservé aux administrateurs et contributeurs" },
      { status: 403 }
    );
  }

  let body: {
    subject?: unknown;
    count?: unknown;
    bankId?: unknown;
    addToBank?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corps de requête JSON invalide." },
      { status: 400 }
    );
  }

  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  if (!subject || subject.length < 3) {
    return NextResponse.json(
      { error: "Sujet trop court (minimum 3 caractères)." },
      { status: 400 }
    );
  }
  if (subject.length > MAX_SUBJECT_LENGTH) {
    return NextResponse.json(
      { error: `Sujet trop long (maximum ${MAX_SUBJECT_LENGTH} caractères).` },
      { status: 400 }
    );
  }

  let count =
    typeof body.count === "number"
      ? body.count
      : parseInt(String(body.count ?? "10"), 10);
  if (!Number.isFinite(count)) count = 10;
  count = Math.min(MAX_COUNT, Math.max(MIN_COUNT, Math.round(count)));

  const bankId = typeof body.bankId === "string" ? body.bankId : null;
  const addToBank = !!body.addToBank && !!bankId;

  // If addToBank is requested, verify the bank exists before generating.
  if (addToBank) {
    try {
      const bank = await db.questionBank.findUnique({
        where: { id: bankId! },
        select: { id: true, title: true },
      });
      if (!bank) {
        return NextResponse.json(
          { error: "Banque introuvable." },
          { status: 404 }
        );
      }
    } catch (err) {
      console.error("generate-questions: bank lookup error", err);
      return NextResponse.json(
        { error: "Erreur de base de données." },
        { status: 500 }
      );
    }
  }

  try {
    const questions = await generateQuestions(subject, count);

    if (questions.length === 0) {
      return NextResponse.json(
        {
          error:
            "L'IA n'a pas pu générer de questions valides sur ce sujet. Reformulez le sujet ou réessayez.",
        },
        { status: 422 }
      );
    }

    let addedCount = 0;
    if (addToBank && bankId) {
      try {
        // Get the current question count for the bank so we can set the order.
        const existingCount = await db.question.count({ where: { bankId } });
        // Insert all generated questions in a single transaction.
        await db.$transaction(
          questions.map((q, i) =>
            db.question.create({
              data: {
                bankId,
                order: existingCount + i,
                question: q.question,
                optionA: q.optionA,
                optionB: q.optionB,
                optionC: q.optionC,
                optionD: q.optionD,
                correctAnswer: q.correctAnswer,
                explanation: q.explanation,
                level: "TOUS",
                difficulty: "medium",
              },
            })
          )
        );
        addedCount = questions.length;
      } catch (err) {
        console.error("generate-questions: insert error", err);
        return NextResponse.json(
          {
            error:
              "Questions générées mais une erreur est survenue lors de l'ajout à la banque.",
            questions,
            addedCount: 0,
          },
          { status: 207 }
        );
      }
    }

    return NextResponse.json({
      count: questions.length,
      requested: count,
      subject,
      bankId,
      addedToBank: addedCount,
      questions,
    });
  } catch (error: unknown) {
    console.error("generate-questions error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération des questions par l'IA." },
      { status: 500 }
    );
  }
}
