import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import ZAI from "z-ai-web-dev-sdk";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Fiches de révision auto-générées (Feature E6.2).
 *
 * GET /api/study-sheet?bankId=X
 *
 * Generates a structured study sheet from the user's wrong answers in the
 * given bank. Returns:
 *   {
 *     bankId: string,
 *     bankTitle: string,
 *     chapters: [{ title, keyPoints: string[], commonMistakes: string[] }],
 *     source: "ai" | "fallback",
 *     generatedAt: string
 *   }
 *
 * Strategy:
 *   1. Load the user's wrong answers for this bank (across all sessions).
 *   2. Group wrong answers by chapter (Question.chapter) or by question
 *      keyword cluster as a fallback.
 *   3. Try the LLM (z-ai-web-dev-sdk) to summarize each chapter into
 *      key points + common mistakes.
 *   4. If the LLM fails (or the SDK is unavailable), build a deterministic
 *      fallback from the raw wrong-answer explanations.
 */

interface WrongAnswerRow {
  questionId: string;
  questionText: string;
  correctAnswer: string;
  userAnswer: string | null;
  explanation: string;
  chapter: string | null;
  subject: string | null;
}

interface ChapterSheet {
  title: string;
  keyPoints: string[];
  commonMistakes: string[];
}

interface StudySheetResponse {
  bankId: string;
  bankTitle: string;
  chapters: ChapterSheet[];
  source: "ai" | "fallback";
  generatedAt: string;
}

function dedupe(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of arr) {
    const k = s.toLowerCase().slice(0, 80);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(s);
    }
  }
  return out;
}

/**
 * Build a deterministic fallback sheet from the raw wrong-answer
 * explanations, grouped by chapter (or "Chapitre général" when the
 * question has no chapter field).
 */
function buildFallbackSheet(wrong: WrongAnswerRow[]): ChapterSheet[] {
  const byChapter = new Map<string, WrongAnswerRow[]>();
  for (const w of wrong) {
    const key = (
      w.chapter?.trim() ||
      w.subject?.trim() ||
      "Chapitre général"
    ).slice(0, 80);
    const arr = byChapter.get(key) ?? [];
    arr.push(w);
    byChapter.set(key, arr);
  }

  const chapters: ChapterSheet[] = [];
  for (const [chapterTitle, rows] of byChapter.entries()) {
    const keyPoints: string[] = [];
    const commonMistakes: string[] = [];
    for (const r of rows.slice(0, 5)) {
      const expl = r.explanation?.trim();
      if (expl) {
        keyPoints.push(expl.slice(0, 240));
      }
      const qShort = r.questionText.slice(0, 140);
      commonMistakes.push(
        `Question : « ${qShort}${r.questionText.length > 140 ? "…" : ""} » — la bonne réponse était ${r.correctAnswer}.`,
      );
    }
    chapters.push({
      title: chapterTitle,
      keyPoints: dedupe(keyPoints).slice(0, 5),
      commonMistakes: dedupe(commonMistakes).slice(0, 5),
    });
  }
  return chapters.slice(0, 8);
}

function sanitizeChapters(arr: unknown[]): ChapterSheet[] {
  const out: ChapterSheet[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const title =
      typeof o.title === "string" && o.title.trim().length > 0
        ? o.title.trim().slice(0, 120)
        : "Chapitre";
    const keyPoints = Array.isArray(o.keyPoints)
      ? o.keyPoints
          .filter((s) => typeof s === "string")
          .map((s) => String(s).slice(0, 240))
      : [];
    const commonMistakes = Array.isArray(o.commonMistakes)
      ? o.commonMistakes
          .filter((s) => typeof s === "string")
          .map((s) => String(s).slice(0, 240))
      : [];
    if (keyPoints.length === 0 && commonMistakes.length === 0) continue;
    out.push({ title, keyPoints, commonMistakes });
  }
  return out.slice(0, 10);
}

function parseSheet(content: string): ChapterSheet[] | null {
  if (!content) return null;
  let cleaned = content.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json|JSON)?\s*/, "")
      .replace(/```\s*$/, "")
      .trim();
  }
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return sanitizeChapters(parsed);
    if (parsed && Array.isArray((parsed as { chapters?: unknown }).chapters)) {
      return sanitizeChapters((parsed as { chapters: unknown[] }).chapters);
    }
  } catch {
    // ignore
  }
  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      const parsed = JSON.parse(objMatch[0]);
      if (parsed && Array.isArray((parsed as { chapters?: unknown }).chapters)) {
        return sanitizeChapters((parsed as { chapters: unknown[] }).chapters);
      }
    } catch {
      // ignore
    }
  }
  return null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bankId = searchParams.get("bankId");
    if (!bankId) {
      return NextResponse.json(
        { error: "Paramètre bankId requis." },
        { status: 400 },
      );
    }

    const authSession = await getServerSession(authOptions);
    if (!authSession?.user?.email) {
      return NextResponse.json(
        { error: "Authentification requise." },
        { status: 401 },
      );
    }
    const user = await db.user.findUnique({
      where: { email: authSession.user.email },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable." },
        { status: 404 },
      );
    }

    const bank = await db.questionBank.findUnique({
      where: { id: bankId },
      select: { id: true, title: true },
    });
    if (!bank) {
      return NextResponse.json(
        { error: "Banque introuvable." },
        { status: 404 },
      );
    }

    const sessions = await db.quizSession.findMany({
      where: {
        userId: user.id,
        sourceType: "bank",
        sourceId: bankId,
        completedAt: { not: null },
      },
      select: {
        answers: {
          where: { isCorrect: false },
          select: {
            questionId: true,
            questionText: true,
            correctAnswer: true,
            userAnswer: true,
            explanation: true,
          },
        },
      },
      take: 30,
    });

    const wrongAnswers: WrongAnswerRow[] = [];
    const seenQuestionIds = new Set<string>();
    for (const s of sessions) {
      for (const a of s.answers) {
        if (!a.questionId || seenQuestionIds.has(a.questionId)) continue;
        seenQuestionIds.add(a.questionId);
        wrongAnswers.push({
          questionId: a.questionId,
          questionText: a.questionText,
          correctAnswer: a.correctAnswer,
          userAnswer: a.userAnswer,
          explanation: a.explanation,
          chapter: null,
          subject: null,
        });
      }
    }
    if (wrongAnswers.length > 0) {
      const ids = wrongAnswers.map((w) => w.questionId);
      const enriched = await db.question.findMany({
        where: { id: { in: ids } },
        select: { id: true, chapter: true, subject: true },
      });
      const byId = new Map(enriched.map((q) => [q.id, q]));
      for (const w of wrongAnswers) {
        const e = byId.get(w.questionId);
        if (e) {
          w.chapter = e.chapter;
          w.subject = e.subject;
        }
      }
    }

    if (wrongAnswers.length === 0) {
      return NextResponse.json({
        bankId: bank.id,
        bankTitle: bank.title,
        chapters: [],
        source: "fallback" as const,
        generatedAt: new Date().toISOString(),
        message:
          "Aucune mauvaise réponse trouvée pour cette banque. Faites d'abord un quiz pour générer une fiche de révision.",
      });
    }

    const fallback = buildFallbackSheet(wrongAnswers);

    let chapters: ChapterSheet[] = [];
    let source: "ai" | "fallback" = "fallback";
    try {
      const zai = await ZAI.create();
      const wrongSummary = wrongAnswers
        .slice(0, 30)
        .map(
          (w, i) =>
            `${i + 1}. Q: ${w.questionText.slice(0, 200)}\n   Bonne réponse: ${w.correctAnswer}\n   Explication: ${(w.explanation ?? "").slice(0, 200)}`,
        )
        .join("\n");

      const prompt = `Tu es un coach pédagogique IA. Génère une FICHE DE RÉVISION structurée à partir des erreurs suivantes d'un étudiant sur la banque « ${bank.title} ».

ERREURS:
${wrongSummary}

FORMAT: JSON STRICT (pas de markdown, pas de commentaire) — un objet:
{
  "chapters": [
    {
      "title": "Titre du chapitre",
      "keyPoints": ["point clé 1", "point clé 2", "point clé 3"],
      "commonMistakes": ["erreur fréquente 1", "erreur fréquente 2"]
    }
  ]
}

Regroupe les erreurs en 2 à 5 chapitres thématiques. keyPoints = notions à retenir. commonMistakes = pièges à éviter. Sois concret et pédagogique.

Réponds UNIQUEMENT avec le JSON.`;

      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: "assistant",
            content:
              "Tu es un générateur expert de fiches de révision pédagogiques. Tu réponds STRICTEMENT en JSON valide, sans markdown ni commentaire.",
          },
          { role: "user", content: prompt },
        ],
        thinking: { type: "disabled" },
      });
      const content = completion?.choices?.[0]?.message?.content ?? "";
      const parsed = parseSheet(content);
      if (parsed && parsed.length > 0) {
        chapters = parsed;
        source = "ai";
      }
    } catch (aiError) {
      console.error("study-sheet AI error:", aiError);
    }

    if (chapters.length === 0) {
      chapters = fallback;
      source = "fallback";
    }

    const response: StudySheetResponse = {
      bankId: bank.id,
      bankTitle: bank.title,
      chapters,
      source,
      generatedAt: new Date().toISOString(),
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error("study-sheet error:", error);
    return NextResponse.json(
      { error: "Échec de la génération de la fiche de révision." },
      { status: 500 },
    );
  }
}
