/**
 * Question Domain — Question lifecycle and quality management.
 *
 * Pure business logic for question status, versioning, and quality scoring.
 */

// ===== Question Status =====

export type QuestionStatus =
  | "DRAFT"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "PUBLISHED"
  | "REPORTED"
  | "CORRECTED"
  | "ARCHIVED"
  | "OUTDATED"
  | "REJECTED";

/**
 * Valid status transitions for a question.
 */
const QUESTION_TRANSITIONS: Record<QuestionStatus, QuestionStatus[]> = {
  DRAFT: ["UNDER_REVIEW", "ARCHIVED"],
  UNDER_REVIEW: ["APPROVED", "REJECTED", "DRAFT"],
  APPROVED: ["PUBLISHED", "ARCHIVED"],
  PUBLISHED: ["REPORTED", "ARCHIVED", "OUTDATED"],
  REPORTED: ["UNDER_REVIEW", "CORRECTED"],
  CORRECTED: ["PUBLISHED", "UNDER_REVIEW"],
  ARCHIVED: ["DRAFT"],
  OUTDATED: ["ARCHIVED", "DRAFT"],
  REJECTED: ["DRAFT"],
};

export function canTransitionQuestion(from: QuestionStatus, to: QuestionStatus): boolean {
  return QUESTION_TRANSITIONS[from]?.includes(to) ?? false;
}

// ===== Quality Scoring =====

export interface QualityScore {
  clarity: number; // 0-100
  spelling: number; // 0-100
  uniqueAnswer: number; // 0-100
  noDuplicate: number; // 0-100
  hasSource: number; // 0-100
  overall: number; // Weighted average
  warnings: string[];
}

/**
 * Calculate quality score for a question.
 * This is a heuristic check, not AI-based.
 */
export function calculateQuality(question: {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
  source?: string;
}): QualityScore {
  const warnings: string[] = [];

  // Clarity: question length should be 15-500 chars
  const qLen = question.question.length;
  const clarity = qLen < 15 ? 50 : qLen > 500 ? 70 : 100;
  if (qLen < 15) warnings.push("Question trop courte");

  // Spelling: basic check (no double spaces, proper capitalization)
  const hasDoubleSpaces = /\s{2,}/.test(question.question);
  const spelling = hasDoubleSpaces ? 70 : 100;
  if (hasDoubleSpaces) warnings.push("Espaces multiples détectés");

  // Unique answer: check if options are distinct
  const options = [question.optionA, question.optionB, question.optionC, question.optionD]
    .map((o) => o.trim().toLowerCase());
  const uniqueOptions = new Set(options).size;
  const uniqueAnswer = uniqueOptions === 4 ? 100 : uniqueOptions === 3 ? 60 : 30;
  if (uniqueOptions < 4) warnings.push("Options dupliquées détectées");

  // No duplicate (always 100 — actual duplicate detection requires DB lookup)
  const noDuplicate = 100;

  // Has source
  const hasSource = question.source && question.source.trim().length > 0 ? 100 : 50;
  if (!question.source) warnings.push("Aucune source spécifiée");

  // Overall (weighted)
  const overall = Math.round(
    clarity * 0.2 +
    spelling * 0.15 +
    uniqueAnswer * 0.3 +
    noDuplicate * 0.15 +
    hasSource * 0.2,
  );

  return { clarity, spelling, uniqueAnswer, noDuplicate, hasSource, overall, warnings };
}

// ===== Duplicate Detection =====

/**
 * Calculate similarity between two question texts (Jaccard on words).
 * Returns 0-1 where 1 = identical.
 */
export function questionSimilarity(text1: string, text2: string): number {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter((w: string) => w.length > 2);
  
  const words1 = new Set(normalize(text1));
  const words2 = new Set(normalize(text2));
  
  if (words1.size === 0 || words2.size === 0) return 0;
  
  const intersection = new Set([...words1].filter((w) => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

/**
 * Check if a question is likely a duplicate of any in the existing set.
 * Returns the best match if similarity > threshold.
 */
export function findDuplicate(
  newQuestion: string,
  existingQuestions: Array<{ id: string; question: string }>,
  threshold: number = 0.85,
): { id: string; similarity: number } | null {
  let bestMatch: { id: string; similarity: number } | null = null;
  
  for (const existing of existingQuestions) {
    const sim = questionSimilarity(newQuestion, existing.question);
    if (sim >= threshold && (!bestMatch || sim > bestMatch.similarity)) {
      bestMatch = { id: existing.id, similarity: sim };
    }
  }
  
  return bestMatch;
}
