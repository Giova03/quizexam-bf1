/**
 * Start Session Use Case — application layer.
 *
 * Creates a new quiz session:
 * 1. Input validation (required fields, mode vocabulary).
 * 2. Freemium daily-limit check (via the existing subscription-limits lib;
 *    its migration into the infrastructure layer is scheduled for P3).
 * 3. Question pool gathering through the repository (explicit questionIds,
 *    bank, or exam — with optional difficulty filter).
 * 4. Session + answer snapshots creation (single round trip).
 *
 * The result kinds map 1:1 to the legacy route's HTTP responses so the
 * client contract is byte-for-byte identical.
 */

import {
  checkLimit,
  FREE_DAILY_LIMIT,
} from "@/lib/subscription-limits";
import {
  createSessionWithAnswers,
  loadSourceQuestions,
  type SessionWithAnswers,
} from "@/server/infrastructure/repositories/quiz-session-repository";

export interface StartSessionInput {
  title: string;
  mode: string;
  sourceType: string;
  sourceId: string;
  questionIds?: string[];
  difficulty?: string;
}

/** Authenticated actor info (null = anonymous session, as before P2). */
export interface StartSessionActor {
  id: string;
  subscription?: string;
}

export type StartSessionResult =
  | { kind: "ok"; session: SessionWithAnswers }
  | { kind: "missing_fields" }
  | { kind: "invalid_mode" }
  | { kind: "bank_not_found" }
  | { kind: "exam_not_found" }
  | { kind: "no_questions" }
  | { kind: "daily_limit_reached"; usedToday: number; limit: number };

/**
 * Create a session for the given actor (or anonymously when actor is null).
 */
export async function startSession(
  input: StartSessionInput,
  actor: StartSessionActor | null,
): Promise<StartSessionResult> {
  const { title, mode, sourceType, sourceId, questionIds, difficulty } = input;

  if (!title || !mode || !sourceType || !sourceId) {
    return { kind: "missing_fields" };
  }
  if (mode !== "immediate" && mode !== "final") {
    return { kind: "invalid_mode" };
  }
  if (sourceType !== "bank" && sourceType !== "exam") {
    return { kind: "missing_fields" };
  }

  // Freemium daily limit — authenticated users only (anonymous sessions are
  // rate-limited at the IP layer by the public API instead).
  if (actor) {
    const check = await checkLimit(actor.id);
    if (!check.canStartMore) {
      return {
        kind: "daily_limit_reached",
        usedToday: check.usedToday,
        limit: FREE_DAILY_LIMIT,
      };
    }
  }

  // Normalize the difficulty filter — anything other than easy/medium/hard
  // means "no filter". Ignored when questionIds is provided (the caller has
  // already curated the list).
  const diffFilter: "easy" | "medium" | "hard" | null =
    difficulty === "easy" || difficulty === "medium" || difficulty === "hard"
      ? difficulty
      : null;

  const source = await loadSourceQuestions({
    sourceType,
    sourceId,
    questionIds:
      questionIds && questionIds.length > 0 ? questionIds : undefined,
    difficulty: diffFilter,
  });

  if (source.kind === "bank_not_found") return { kind: "bank_not_found" };
  if (source.kind === "exam_not_found") return { kind: "exam_not_found" };
  if (source.questions.length === 0) return { kind: "no_questions" };

  const session = await createSessionWithAnswers({
    title,
    mode,
    sourceType,
    sourceId,
    userId: actor?.id ?? null,
    questions: source.questions,
  });

  return { kind: "ok", session };
}
