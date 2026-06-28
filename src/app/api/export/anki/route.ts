import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

<<<<<<< Updated upstream
// ============================================================================
// Anki CSV export — produces a semicolon-separated CSV (Anki's default for
// French / European locales) with a UTF-8 BOM so accented characters render
// correctly when imported into Anki.
//
// Format:
//   Front;Back;Tags
//   "Question text";"Correct answer text. Explanation.";""Bank" "Category" "Difficulty""
//
// Two entry points:
//   GET  ?bankId=xxx       — export all questions from a public question bank
//   POST { favorites: [...] } — export the user's localStorage favorites
//                               (the favorites data is sent in the body so
//                                the server can enrich it with full question
//                                info — option text, difficulty, category —
//                                looked up from the DB by question id)
// ============================================================================

const BOM = "\uFEFF";

/**
 * Escape a single CSV cell value and wrap it in double quotes.
 * Any internal `"` is escaped by doubling it (`""`).
 */
function csvCell(value: string | null | undefined): string {
  const v = (value ?? "").toString();
  // Escape internal double-quotes by doubling them
  const escaped = v.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Build the Tags cell value: 3 space-separated tokens, each wrapped in
 * double quotes so Anki can store multi-word tags (bank title, category,
 * difficulty). The whole cell is then CSV-escaped (so internal `"` are
 * doubled) and wrapped in outer double-quotes.
 *
 * Final shape: """Bank Title"" ""Category"" ""Difficulty"""
 */
function tagsCell(bankTitle: string, category: string, difficulty: string): string {
  const tags = [bankTitle, category, difficulty]
    .filter(Boolean)
    .map((t) => `"${t}"`)
    .join(" ");
  return csvCell(tags);
}

/**
 * Resolve the textual answer from a question given the correctAnswer letter
 * (e.g. "A" → optionA). Falls back to the letter itself if the option text
 * is empty. If the question has a 2nd correct answer, both are joined.
 */
function answerText(
  correctAnswer: string,
  optionA: string,
  optionB: string,
  optionC: string,
  optionD: string,
  correctAnswer2?: string | null
): string {
  const options: Record<string, string> = {
    A: optionA,
    B: optionB,
    C: optionC,
    D: optionD,
  };
  const primary = options[correctAnswer] ?? correctAnswer;
  if (correctAnswer2 && options[correctAnswer2]) {
    return `${primary} (ou ${options[correctAnswer2]})`;
  }
  return primary;
}

/**
 * Build the Back cell: "Correct answer text. Explanation." (or just one of
 * them if the other is missing). Properly CSV-escaped.
 */
function backCell(answerTextStr: string, explanation: string): string {
  const parts: string[] = [];
  if (answerTextStr && answerTextStr.trim()) parts.push(answerTextStr.trim());
  if (explanation && explanation.trim()) parts.push(explanation.trim());
  return csvCell(parts.join(". "));
}

/**
 * Convert an array of questions (with their bank info) into the Anki CSV.
 */
function buildCsv(
  rows: Array<{
    question: string;
    answer: string;
    explanation: string;
    bankTitle: string;
    category: string;
    difficulty: string;
  }>
): string {
  const lines = ["Front;Back;Tags"];
  for (const r of rows) {
    lines.push(
      [
        csvCell(r.question),
        backCell(r.answer, r.explanation),
        tagsCell(r.bankTitle, r.category, r.difficulty),
      ].join(";")
    );
  }
  return BOM + lines.join("\r\n") + "\r\n";
}

// ----------------------------------------------------------------------------
// GET — export all questions of a public question bank
// ----------------------------------------------------------------------------
=======
/**
 * GET /api/export/anki?bankId=<id>
 * Exports all questions of a bank as a CSV file in Anki-compatible format:
 *   Front;Back;Tags
 *
 * - UTF-8 BOM (so Excel/Anki detect encoding properly)
 * - Semicolon-separated
 * - Quotes are escaped by doubling them, fields are wrapped in double quotes
 *   if they contain a separator, quote, or newline.
 *
 * Public endpoint (no auth) so learners can export any public bank.
 */
>>>>>>> Stashed changes
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bankId = searchParams.get("bankId");
<<<<<<< Updated upstream

    if (!bankId) {
      return NextResponse.json(
        { error: "Paramètre 'bankId' manquant" },
=======
    if (!bankId) {
      return NextResponse.json(
        { error: "Paramètre bankId requis" },
>>>>>>> Stashed changes
        { status: 400 }
      );
    }

    const bank = await db.questionBank.findUnique({
      where: { id: bankId },
<<<<<<< Updated upstream
      include: {
        questions: { orderBy: { order: "asc" } },
=======
      select: {
        id: true,
        title: true,
        category: true,
        questions: {
          select: {
            question: true,
            optionA: true,
            optionB: true,
            optionC: true,
            optionD: true,
            correctAnswer: true,
            explanation: true,
            difficulty: true,
          },
          orderBy: { order: "asc" },
        },
>>>>>>> Stashed changes
      },
    });

    if (!bank) {
      return NextResponse.json(
        { error: "Banque introuvable" },
        { status: 404 }
      );
    }

<<<<<<< Updated upstream
    const rows = bank.questions.map((q) => ({
      question: q.question,
      answer: answerText(
        q.correctAnswer,
        q.optionA,
        q.optionB,
        q.optionC,
        q.optionD,
        q.correctAnswer2
      ),
      explanation: q.explanation,
      bankTitle: bank.title,
      category: bank.category,
      difficulty: q.difficulty ?? "medium",
    }));

    const csv = buildCsv(rows);

    // Slugify the bank title for the filename
    const slug = bank.title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50) || "banque";
    const filename = `anki-${slug}-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Anki export (GET) failed:", error);
    return NextResponse.json(
      { error: "Échec de l'export Anki" },
      { status: 500 }
    );
  }
}

// ----------------------------------------------------------------------------
// POST — export the user's localStorage favorites (the body carries the list)
// ----------------------------------------------------------------------------
interface FavoritePayload {
  id: string;
  question?: string;
  correctAnswer?: string;
  explanation?: string;
  bankTitle?: string;
  bankId?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | { favorites?: FavoritePayload[] }
      | null;

    const favorites = body?.favorites;
    if (!Array.isArray(favorites) || favorites.length === 0) {
      return NextResponse.json(
        { error: "Aucun favori à exporter" },
        { status: 400 }
      );
    }

    // Fetch full question info for all favorites in a single DB round-trip.
    const ids = favorites
      .map((f) => f.id)
      .filter((id): id is string => Boolean(id));

    const questions = ids.length > 0
      ? await db.question.findMany({
          where: { id: { in: ids } },
          include: { bank: { select: { title: true, category: true } } },
        })
      : [];
    const qById = new Map(questions.map((q) => [q.id, q]));

    const rows: Array<{
      question: string;
      answer: string;
      explanation: string;
      bankTitle: string;
      category: string;
      difficulty: string;
    }> = [];

    for (const fav of favorites) {
      const dbQ = fav.id ? qById.get(fav.id) : undefined;
      if (dbQ) {
        // Full info from DB — preferred
        rows.push({
          question: dbQ.question,
          answer: answerText(
            dbQ.correctAnswer,
            dbQ.optionA,
            dbQ.optionB,
            dbQ.optionC,
            dbQ.optionD,
            dbQ.correctAnswer2
          ),
          explanation: dbQ.explanation,
          bankTitle: dbQ.bank?.title ?? fav.bankTitle ?? "Favoris",
          category: dbQ.bank?.category ?? "",
          difficulty: dbQ.difficulty ?? "medium",
        });
      } else {
        // Fallback: the favorite's stored snapshot (we only have the
        // correct-answer letter, not the option text — but we still
        // produce a useful card with the explanation).
        rows.push({
          question: fav.question ?? "",
          answer: fav.correctAnswer ?? "",
          explanation: fav.explanation ?? "",
          bankTitle: fav.bankTitle ?? "Favoris",
          category: "",
          difficulty: "medium",
        });
      }
    }

    const csv = buildCsv(rows);

    const filename = `anki-favoris-${new Date().toISOString().slice(0, 10)}.csv`;
=======
    const escape = (s: string): string => {
      const str = String(s ?? "");
      if (/[";\n\r]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const lines: string[] = ["Front;Back;Tags"];
    const tagBase = bank.category.replace(/[^a-zA-Z0-9_-]/g, "_");

    for (const q of bank.questions) {
      const front = `${q.question}\nA) ${q.optionA}\nB) ${q.optionB}\nC) ${q.optionC}\nD) ${q.optionD}`;
      const correctLetter = q.correctAnswer;
      const correctText =
        correctLetter === "A"
          ? q.optionA
          : correctLetter === "B"
            ? q.optionB
            : correctLetter === "C"
              ? q.optionC
              : q.optionD;
      const back = `Bonne réponse : ${correctLetter}) ${correctText}\n\nExplication : ${q.explanation}`;
      const tags = `${tagBase} ${q.difficulty || "medium"}`.trim();
      lines.push(
        [escape(front), escape(back), escape(tags)].join(";")
      );
    }

    // Prepend UTF-8 BOM (\uFEFF) for proper encoding detection by Anki/Excel.
    const csv = "\uFEFF" + lines.join("\r\n");
    const safeTitle = bank.title.replace(/[^a-zA-Z0-9-_]/g, "_");

>>>>>>> Stashed changes
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
<<<<<<< Updated upstream
        "Content-Disposition": `attachment; filename="${filename}"`,
=======
        "Content-Disposition": `attachment; filename="${safeTitle}_anki.csv"`,
>>>>>>> Stashed changes
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
<<<<<<< Updated upstream
    console.error("Anki export (POST) failed:", error);
    return NextResponse.json(
      { error: "Échec de l'export Anki" },
=======
    console.error("[export/anki] error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'export Anki" },
>>>>>>> Stashed changes
      { status: 500 }
    );
  }
}
