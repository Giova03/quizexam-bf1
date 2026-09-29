/**
 * Quiz Domain — Pure business logic, no framework dependencies.
 *
 * This module contains the core quiz/session logic:
 * - Scoring rules
 * - Session state machine
 * - Question selection algorithms
 * - Spaced repetition (SM-2)
 *
 * It does NOT import React, Next.js, Prisma, or any infrastructure.
 */

// ===== Types =====

export type SessionMode = "immediate" | "final";
export type SessionStatus = "created" | "in_progress" | "completed" | "abandoned";
export type QuestionDifficulty = "easy" | "medium" | "hard";
export type Answer = "A" | "B" | "C" | "D";

export interface QuestionSnapshot {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: Answer;
  correctAnswer2?: Answer | null;
  explanation: string;
  difficulty: QuestionDifficulty;
}

export interface SessionAnswerEntity {
  id: string;
  questionId: string;
  userAnswer: Answer | null;
  isCorrect: boolean | null;
  answeredAt: Date | null;
}

export interface QuizSessionEntity {
  id: string;
  title: string;
  mode: SessionMode;
  status: SessionStatus;
  sourceType: "bank" | "exam";
  sourceId: string;
  userId: string | null;
  score: number;
  totalQuestions: number;
  startedAt: Date;
  completedAt: Date | null;
  answers: SessionAnswerEntity[];
}

// ===== Scoring =====

/**
 * Calculate the score for a session.
 * A question is correct if:
 * - userAnswer matches correctAnswer (single answer mode)
 * - OR userAnswer matches either correctAnswer or correctAnswer2 (dual answer mode)
 */
export function calculateScore(answers: SessionAnswerEntity[]): number {
  return answers.filter((a) => a.isCorrect === true).length;
}

/**
 * Check if a user's answer is correct for a given question.
 */
export function checkAnswer(
  userAnswer: Answer,
  question: Pick<QuestionSnapshot, "correctAnswer" | "correctAnswer2">,
): boolean {
  if (userAnswer === question.correctAnswer) return true;
  if (question.correctAnswer2 && userAnswer === question.correctAnswer2) return true;
  return false;
}

/**
 * Calculate the percentage score.
 */
export function calculatePercentage(score: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((score / total) * 100);
}

/**
 * Determine if a session is passed (≥ 50%).
 */
export function isPassed(percentage: number): boolean {
  return percentage >= 50;
}

// ===== Session State Machine =====

/**
 * Valid state transitions for a quiz session.
 */
const VALID_TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
  created: ["in_progress"],
  in_progress: ["completed", "abandoned"],
  completed: [], // Terminal state
  abandoned: [], // Terminal state
};

/**
 * Check if a state transition is valid.
 */
export function canTransition(from: SessionStatus, to: SessionStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Derive the session status from persisted fields. The QuizSession table
 * has no `status` column — the state is derived from `completedAt`:
 * a session with a completion timestamp is "completed", anything else is
 * "in_progress" (answering is allowed).
 */
export function deriveSessionStatus(completedAt: Date | null): SessionStatus {
  return completedAt ? "completed" : "in_progress";
}

/**
 * P3 strict state machine rule: an answer may only be recorded while the
 * session is still open ("created" / "in_progress"). Completed and abandoned
 * sessions are frozen — the client sees HTTP 409 via the route mapping.
 */
export function canAcceptAnswer(status: SessionStatus): boolean {
  return status === "created" || status === "in_progress";
}

/**
 * Transition a session to a new state.
 * Throws if the transition is invalid.
 */
export function transitionSession(
  session: Pick<QuizSessionEntity, "status">,
  newStatus: SessionStatus,
): SessionStatus {
  if (!canTransition(session.status, newStatus)) {
    throw new Error(`Transition invalide: ${session.status} → ${newStatus}`);
  }
  return newStatus;
}

// ===== Question Selection =====

/**
 * Shuffle an array using Fisher-Yates (deterministic with optional seed).
 */
export function shuffle<T>(array: T[], seed?: number): T[] {
  const result = [...array];
  let s = seed ?? Date.now();
  const random = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Select N questions from a pool, optionally filtered by difficulty.
 */
export function selectQuestions(
  pool: QuestionSnapshot[],
  count: number,
  difficulty?: QuestionDifficulty,
): QuestionSnapshot[] {
  const filtered = difficulty
    ? pool.filter((q) => q.difficulty === difficulty)
    : pool;
  const source = filtered.length >= count ? filtered : pool; // Fallback to all if not enough
  return shuffle(source).slice(0, Math.min(count, source.length));
}

// ===== Spaced Repetition (SM-2 Algorithm) =====

export interface SpacedCard {
  questionId: string;
  ease: number; // Ease factor (≥ 1.3)
  interval: number; // Days until next review
  repetitions: number; // Number of successful reviews
  nextReview: Date;
  lastReview: Date | null;
}

export type ReviewQuality = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * Apply the SM-2 spaced repetition algorithm.
 *
 * Quality:
 *   0-2: Incorrect (reset)
 *   3:   Correct but difficult
 *   4:   Correct with effort
 *   5:   Perfect
 */
export function applySm2(card: SpacedCard, quality: ReviewQuality): SpacedCard {
  let { ease, interval, repetitions } = card;

  if (quality < 3) {
    // Failed — reset repetitions, interval = 1 day
    repetitions = 0;
    interval = 1;
  } else {
    // Passed
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * ease);
    }
    repetitions += 1;
  }

  // Update ease factor
  ease = ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (ease < 1.3) ease = 1.3;

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  return {
    ...card,
    ease,
    interval,
    repetitions,
    nextReview,
    lastReview: new Date(),
  };
}

/**
 * Get all cards that are due for review.
 */
export function getDueCards(cards: SpacedCard[], now: Date = new Date()): SpacedCard[] {
  return cards.filter((c) => new Date(c.nextReview) <= now);
}

// ===== XP & Gamification =====

/**
 * Calculate XP earned for a completed session.
 */
export function calculateXP(
  correctCount: number,
  totalCount: number,
  isDailyChallenge: boolean = false,
): number {
  const baseXP = correctCount * 10;
  const perfectBonus = correctCount === totalCount && totalCount > 0 ? 50 : 0;
  const dailyMultiplier = isDailyChallenge ? 2 : 1;
  return (baseXP + perfectBonus) * dailyMultiplier;
}

/**
 * Calculate the level from total XP.
 * Level = floor(XP / 100) + 1
 */
export function levelFromXP(xp: number): number {
  return Math.floor(xp / 100) + 1;
}

/**
 * Calculate XP needed to reach the next level.
 */
export function xpToNextLevel(xp: number): number {
  const currentLevel = levelFromXP(xp);
  const currentLevelXP = (currentLevel - 1) * 100;
  const nextLevelXP = currentLevel * 100;
  return nextLevelXP - xp;
}

// ===== Mastery =====

export type MasteryLevel = "discovery" | "learning" | "in_progress" | "mastered" | "maintenance";

/**
 * Determine mastery level from success rate and review count.
 */
export function getMasteryLevel(
  successRate: number,
  reviewCount: number,
): MasteryLevel {
  if (reviewCount === 0) return "discovery";
  if (successRate < 0.3) return "learning";
  if (successRate < 0.6) return "in_progress";
  if (successRate < 0.85) return "mastered";
  return "maintenance";
}
