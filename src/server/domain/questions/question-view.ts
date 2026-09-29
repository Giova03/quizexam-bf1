/**
 * Question View — role-based visibility policy (domain).
 *
 * Pure rules deciding which question fields a given actor may see.
 * P0 security rule, now expressed as reusable domain logic instead of
 * inline mapping inside the route:
 *
 * - Staff (ADMIN, EDITOR, REVIEWER, MODERATOR, SUPER_ADMIN) see the full
 *   question, including the answer key and explanation — they manage
 *   content.
 * - Regular users get the question WITHOUT correctAnswer / correctAnswer2 /
 *   explanation unless they are revising a completed session (the revision
 *   path uses session answer snapshots, not this endpoint).
 *
 * Note: the legacy route produced `{ ...q, correctAnswer: undefined }` —
 * JSON.stringify drops undefined keys, so the client contract is "the keys
 * are absent". Omitting the keys here produces the exact same JSON.
 */

export interface QuestionRow {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  correctAnswer2: string | null;
  explanation: string;
  difficulty: string;
}

export type StudentQuestionView = Omit<
  QuestionRow,
  "correctAnswer" | "correctAnswer2" | "explanation"
>;

export type QuestionView = QuestionRow | StudentQuestionView;

/**
 * Fields hidden from non-staff users (answer-key leakage prevention).
 */
const ANSWER_KEY_FIELDS = [
  "correctAnswer",
  "correctAnswer2",
  "explanation",
] as const;

export function questionViewForActor(
  row: QuestionRow,
  isStaff: boolean,
): QuestionView {
  if (isStaff) return row;
  const view = { ...row };
  for (const field of ANSWER_KEY_FIELDS) {
    delete view[field];
  }
  return view as StudentQuestionView;
}
