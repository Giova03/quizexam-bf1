import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Parse pasted QCM text and return a structured array of questions.
 *
 * Supported formats:
 *  - Question numbers: "1.", "1)", "1-", "Question 1:"
 *  - Options: "a)", "a.", "(a)", "A.", "A)", "A-"  (case-insensitive)
 *  - Correct answer markers:
 *      • "Réponse: a" / "Rép: a" / "Réponse : A" / "Bonne réponse: A"
 *      • ✅ emoji placed inline at the end of an option
 *      • ✔ check mark inline at the end of an option
 *      • "*" or "(correct)" / "(vrai)" / "(juste)" placed after an option
 *  - Explanation markers: "Explication:", "Justification:", "✔", "Raisonnement:"
 */
export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Texte requis" },
        { status: 400 }
      );
    }

    const questions = parseQcmText(text);
    return NextResponse.json({ questions, count: questions.length });
  } catch (error) {
    console.error("QCM text parse error:", error);
    return NextResponse.json(
      { error: "Échec de l'analyse du texte" },
      { status: 500 }
    );
  }
}

export interface ParsedQuestion {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string; // "A" | "B" | "C" | "D"
  explanation: string;
  warnings: string[];
}

const OPTION_RE =
  /^\s*(?:\(?([a-dA-D])[\)\.\-:])\s*(.+?)\s*$/u;
const QUESTION_RE =
  /^\s*(?:Q(?:uestion)?[\s.:]*)?(\d+)[\)\.\-:]\s*(.+)$/i;
const ANSWER_RE =
  /^\s*(?:r(?:é|e)ponse\s*[:\-]?\s*|r(?:é|e)p\s*[:\-]?\s*|bonne\s+r(?:é|e)ponse\s*[:\-]?\s*|correct\s*answer\s*[:\-]?\s*)?([a-dA-D])\b\.?\s*$/i;
const EXPL_RE =
  /^\s*(?:explication|justification|raisonnement|raison|explanation)\s*[:\-]?\s*(.*)$/i;

function stripInlineMarker(s: string): { text: string; marked: boolean } {
  let marked = false;
  let out = s.trimEnd();
  const trailingMarkers = [
    /\s*\u2705\s*$/,
    /\s*\u2714\uFE0F?\s*$/,
    /\s*\u2713\s*$/,
    /\s*\u2714\s*$/,
    /\s*\*\s*$/,
    /\s*\(correct\)\s*$/i,
    /\s*\(vrai\)\s*$/i,
    /\s*\(juste\)\s*$/i,
    /\s*\(bonne\)\s*$/i,
  ];
  for (const re of trailingMarkers) {
    if (re.test(out)) {
      marked = true;
      out = out.replace(re, "").trimEnd();
    }
  }
  return { text: out.trim(), marked };
}

function normalizeLetter(letter: string): string {
  return letter.toUpperCase();
}

function parseQcmText(text: string): ParsedQuestion[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");

  const questions: ParsedQuestion[] = [];
  let current: ParsedQuestion | null = null;
  let currentOptions: Record<string, string> = {};
  let pendingExplanation = false;
  let explanationBuffer = "";

  function pushCurrent() {
    if (!current) return;
    if (explanationBuffer.trim()) {
      current.explanation = explanationBuffer.trim();
      explanationBuffer = "";
    }
    pendingExplanation = false;

    const letters = ["A", "B", "C", "D"];
    let correctAnswer = current.correctAnswer;
    if (!correctAnswer) {
      for (const L of letters) {
        const raw = currentOptions[L];
        if (!raw) continue;
        const { marked } = stripInlineMarker(raw);
        if (marked) {
          correctAnswer = L;
          break;
        }
      }
    }
    if (!correctAnswer) {
      correctAnswer = "A";
      current.warnings.push(
        "Réponse correcte non détectée — définie sur A par défaut"
      );
    }

    const cleanedOptions: Record<string, string> = {};
    for (const L of letters) {
      const raw = currentOptions[L] ?? "";
      const { text: clean } = stripInlineMarker(raw);
      cleanedOptions[L] = clean;
    }

    current.optionA = cleanedOptions.A;
    current.optionB = cleanedOptions.B;
    current.optionC = cleanedOptions.C;
    current.optionD = cleanedOptions.D;
    current.correctAnswer = normalizeLetter(correctAnswer);

    const optValues = [
      current.optionA,
      current.optionB,
      current.optionC,
      current.optionD,
    ];
    if (optValues.some((v) => !v || !v.trim())) {
      current.warnings.push("Une ou plusieurs options sont vides");
    }
    const uniqueOpts = new Set(
      optValues.map((v) => v.trim().toLowerCase()).filter(Boolean)
    );
    if (uniqueOpts.size < 4 && optValues.every((v) => v.trim())) {
      current.warnings.push("Options dupliquées détectées");
    }
    if (!current.explanation.trim()) {
      current.warnings.push("Explication manquante");
    }

    questions.push(current);
    current = null;
    currentOptions = {};
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) {
      if (pendingExplanation && explanationBuffer.trim()) {
        if (current) {
          current.explanation = explanationBuffer.trim();
        }
        explanationBuffer = "";
        pendingExplanation = false;
      }
      continue;
    }

    const qMatch = line.match(QUESTION_RE);
    if (qMatch) {
      pushCurrent();
      current = {
        question: qMatch[2].trim(),
        optionA: "",
        optionB: "",
        optionC: "",
        optionD: "",
        correctAnswer: "",
        explanation: "",
        warnings: [],
      };
      currentOptions = {};
      pendingExplanation = false;
      explanationBuffer = "";
      continue;
    }

    const oMatch = line.match(OPTION_RE);
    if (oMatch && current) {
      if (pendingExplanation && explanationBuffer.trim()) {
        current.explanation = explanationBuffer.trim();
        explanationBuffer = "";
        pendingExplanation = false;
      }
      const letter = normalizeLetter(oMatch[1]);
      const text = oMatch[2].trim();
      currentOptions[letter] = text;
      continue;
    }

    const aMatch = line.match(ANSWER_RE);
    if (aMatch && current) {
      current.correctAnswer = normalizeLetter(aMatch[1]);
      continue;
    }

    const eMatch = line.match(EXPL_RE);
    if (eMatch && current) {
      pendingExplanation = true;
      explanationBuffer = eMatch[1].trim();
      continue;
    }

    if (pendingExplanation && current) {
      explanationBuffer += " " + line.trim();
      continue;
    }

    if (
      current &&
      Object.keys(currentOptions).length === 0 &&
      !current.explanation
    ) {
      current.question += " " + line.trim();
      continue;
    }

    if (
      current &&
      Object.keys(currentOptions).length > 0 &&
      !current.explanation
    ) {
      pendingExplanation = true;
      explanationBuffer = line.trim();
      continue;
    }

    if (pendingExplanation && current) {
      explanationBuffer += " " + line.trim();
      continue;
    }
  }

  pushCurrent();

  return questions;
}
