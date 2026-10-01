"use client";

/**
 * Offline manager (added in F5).
 *
 * Lets a user "download" a question bank for offline use. The bank's
 * metadata + its full list of questions are cached as a single JSON
 * blob in localStorage under `qebf-offline-bank:<bankId>`. An index of
 * cached bank IDs is kept under `qebf-offline-index`.
 *
 * Pending sessions (started while offline) are queued in
 * `qebf-offline-pending-sessions` and flushed by `syncOfflineSessions()`
 * once `navigator.onLine` returns true.
 *
 * All functions are SSR-safe (no-op when `window` is undefined) and
 * tolerate quota-exceeded errors by evicting the oldest cached bank.
 */

import type { Question, QuestionBank } from "./types";

const BANK_PREFIX = "qebf-offline-bank:";
const INDEX_KEY = "qebf-offline-index";
const PENDING_KEY = "qebf-offline-pending-sessions";
const ACTIVE_KEY = "qebf-offline-active-session";

export interface CachedBank {
  bank: QuestionBank;
  questions: Question[];
  cachedAt: string;
  sizeBytes: number;
}

export interface OfflinePendingAnswer {
  questionId: string;
  userAnswer: "A" | "B" | "C" | "D" | null;
  answeredAt: string | null;
}

export interface OfflinePendingSession {
  id: string;
  createdAt: string;
  payload: {
    title: string;
    mode: "immediate" | "final";
    sourceType: "bank" | "exam";
    sourceId: string;
    difficulty?: string;
    answers: OfflinePendingAnswer[];
  };
}

/** Legacy shape kept for backward compatibility with old queued entries. */
interface LegacyPendingSession {
  id: string;
  createdAt: string;
  payload: {
    title: string;
    mode: "immediate" | "final";
    sourceType: "bank" | "exam";
    sourceId: string;
    answers: Array<{
      questionId: string;
      userAnswer: string | null;
      isCorrect: boolean | null;
      answeredAt: string | null;
    }>;
  };
}

function safeWindow(): Window | null {
  return typeof window === "undefined" ? null : window;
}

function readIndex(): string[] {
  const w = safeWindow();
  if (!w) return [];
  try {
    const raw = w.localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeIndex(ids: string[]) {
  const w = safeWindow();
  if (!w) return;
  try {
    w.localStorage.setItem(INDEX_KEY, JSON.stringify(ids));
  } catch {
    // ignore quota errors
  }
}

/**
 * Fetch the bank metadata + all its questions from the API and cache them
 * as JSON in localStorage. Updates the index. Returns the cached bank
 * metadata, or null on error.
 *
 * v19 — source switched to `/api/banks/<id>` (which returns the bank WITH
 * its full questions, answer key and explanations included, same payload
 * the bank-detail page already renders publicly). The previous source
 * (`/api/questions`) strips the answer key for students, which made local
 * immediate-correction impossible while offline. Caching the same data the
 * detail page exposes keeps offline revision consistent with online review.
 */
export async function downloadBankForOffline(
  bankId: string
): Promise<CachedBank | null> {
  const w = safeWindow();
  if (!w) return null;
  try {
    // Primary source: the bank-detail endpoint (full questions).
    let bankMeta: (QuestionBank & { questions?: Question[] }) | null = null;
    let questions: Question[] = [];
    try {
      const detailRes = await fetch(`/api/banks/${encodeURIComponent(bankId)}`).then((r) =>
        r.ok ? r.json() : null
      );
      if (detailRes && Array.isArray(detailRes.questions)) {
        bankMeta = detailRes;
        questions = detailRes.questions as Question[];
      }
    } catch {
      // fall through to the legacy two-request path
    }

    // Legacy fallback (banks list + stripped questions) — keeps the cache
    // working if the detail endpoint ever changes shape.
    if (!bankMeta) {
      const [bankRes, qRes] = await Promise.all([
        fetch(`/api/banks`).then((r) => r.json()),
        fetch(`/api/questions?bankId=${encodeURIComponent(bankId)}`).then((r) =>
          r.json()
        ),
      ]);
      bankMeta = Array.isArray(bankRes)
        ? bankRes.find((b: { id: string }) => b.id === bankId) ?? null
        : null;
      questions = (qRes?.questions ?? []) as Question[];
    }
    if (!bankMeta) return null;

    const cached: CachedBank = {
      bank: {
        id: bankMeta.id,
        title: bankMeta.title,
        description: bankMeta.description ?? "",
        category: bankMeta.category ?? "",
        icon: bankMeta.icon ?? "BookOpen",
        color: bankMeta.color ?? "emerald",
        educationLevel: bankMeta.educationLevel ?? "TOUS",
        _count: { questions: questions.length },
      },
      questions,
      cachedAt: new Date().toISOString(),
      sizeBytes: 0, // computed below
    };
    const serialized = JSON.stringify(cached);
    cached.sizeBytes = serialized.length;

    // Try to persist; if quota exceeded, evict oldest and retry once.
    try {
      w.localStorage.setItem(BANK_PREFIX + bankId, serialized);
    } catch {
      evictOldestBank();
      try {
        w.localStorage.setItem(BANK_PREFIX + bankId, serialized);
      } catch {
        return null;
      }
    }

    // Update the index (keep newest first, dedupe).
    const ids = readIndex().filter((id) => id !== bankId);
    ids.unshift(bankId);
    writeIndex(ids);

    return cached;
  } catch (err) {
    console.error("downloadBankForOffline failed:", err);
    return null;
  }
}

export function getOfflineBanks(): CachedBank[] {
  const w = safeWindow();
  if (!w) return [];
  const ids = readIndex();
  const out: CachedBank[] = [];
  for (const id of ids) {
    try {
      const raw = w.localStorage.getItem(BANK_PREFIX + id);
      if (!raw) continue;
      out.push(JSON.parse(raw) as CachedBank);
    } catch {
      // skip corrupted entry
    }
  }
  return out;
}

export function isBankAvailableOffline(bankId: string): boolean {
  const w = safeWindow();
  if (!w) return false;
  return w.localStorage.getItem(BANK_PREFIX + bankId) !== null;
}

export function removeOfflineBank(bankId: string): boolean {
  const w = safeWindow();
  if (!w) return false;
  const key = BANK_PREFIX + bankId;
  if (w.localStorage.getItem(key) === null) return false;
  w.localStorage.removeItem(key);
  writeIndex(readIndex().filter((id) => id !== bankId));
  return true;
}

function evictOldestBank() {
  const w = safeWindow();
  if (!w) return;
  const ids = readIndex();
  if (ids.length === 0) return;
  const oldest = ids[ids.length - 1];
  w.localStorage.removeItem(BANK_PREFIX + oldest);
  writeIndex(ids.filter((id) => id !== oldest));
}

/**
 * Compute the total localStorage usage (in bytes) of all cached banks.
 * Used by the storage-usage indicator in the offline-manager panel.
 */
export function getOfflineStorageBytes(): number {
  return getOfflineBanks().reduce((sum, b) => sum + (b.sizeBytes || 0), 0);
}

/**
 * Queue a session payload for later submission (called when offline).
 * The payload carries the full answer sheet (questionId + chosen letter +
 * timestamp) so the sync can replay a REAL session server-side.
 */
export function queuePendingSession(pending: OfflinePendingSession): void {
  const w = safeWindow();
  if (!w) return;
  try {
    const raw = w.localStorage.getItem(PENDING_KEY);
    const list: OfflinePendingSession[] = raw ? JSON.parse(raw) : [];
    // Replace an earlier entry with the same local id (retry-safe).
    const filtered = list.filter((p) => p.id !== pending.id);
    filtered.push(pending);
    // Cap the queue to the 50 most recent sessions.
    w.localStorage.setItem(
      PENDING_KEY,
      JSON.stringify(filtered.slice(-50))
    );
  } catch {
    // ignore
  }
}

export function getPendingSessions(): OfflinePendingSession[] {
  const w = safeWindow();
  if (!w) return [];
  try {
    const raw = w.localStorage.getItem(PENDING_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function clearPendingSessions(): void {
  const w = safeWindow();
  if (!w) return;
  w.localStorage.removeItem(PENDING_KEY);
}

/* ------------------------------------------------------------------ */
/* v19 — Local quiz engine: play a cached bank without any network      */
/* ------------------------------------------------------------------ */

function offlineId(): string {
  const rnd =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `offline-${Date.now().toString(36)}-${rnd}`;
}

/**
 * Build and persist a local quiz session from a cached bank. The session
 * mirrors the server `/api/sessions` payload (same QuizSession shape) so
 * SessionView / ResultsView can render it without any special casing
 * beyond the `offline-` id prefix.
 */
export function startOfflineQuiz(
  bankId: string,
  mode: "immediate" | "final",
  difficulty?: "all" | "easy" | "medium" | "hard"
): {
  session: import("./types").QuizSession;
  cached: CachedBank;
} | null {
  const w = safeWindow();
  if (!w) return null;
  try {
    const raw = w.localStorage.getItem(BANK_PREFIX + bankId);
    if (!raw) return null;
    const cached = JSON.parse(raw) as CachedBank;
    let questions = cached.questions ?? [];
    if (difficulty && difficulty !== "all") {
      const filtered = questions.filter((q) => q.difficulty === difficulty);
      if (filtered.length > 0) questions = filtered;
    }
    if (questions.length === 0) return null;

    const now = new Date().toISOString();
    const answers = questions.map((q, i) => ({
      id: `oa-${i}-${q.id.slice(0, 8)}`,
      questionId: q.id,
      questionText: q.question,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      correctAnswer: q.correctAnswer ?? "A",
      userAnswer: null as "A" | "B" | "C" | "D" | null,
      explanation: q.explanation ?? "",
      isCorrect: null as boolean | null,
      answeredAt: null as string | null,
      imageUrl: q.imageUrl ?? null,
      audioUrl: q.audioUrl ?? null,
    }));
    const session = {
      id: offlineId(),
      title: cached.bank.title,
      mode,
      sourceType: "bank" as const,
      sourceId: bankId,
      score: 0,
      totalQuestions: answers.length,
      startedAt: now,
      completedAt: null as string | null,
      answers,
    };
    w.localStorage.setItem(ACTIVE_KEY, JSON.stringify(session));
    return { session, cached };
  } catch (err) {
    console.error("startOfflineQuiz failed:", err);
    return null;
  }
}

/**
 * Load the locally started quiz session (kept across reloads while the
 * user works through it offline).
 */
export function loadOfflineActiveSession(): import("./types").QuizSession | null {
  const w = safeWindow();
  if (!w) return null;
  try {
    const raw = w.localStorage.getItem(ACTIVE_KEY);
    return raw ? (JSON.parse(raw) as import("./types").QuizSession) : null;
  } catch {
    return null;
  }
}

/**
 * Record a locally-graded answer, persist, and return the updated session.
 * Correction is computed from the cached answer key (immediate feedback,
 * same behaviour as the online immediate mode).
 */
export function answerOfflineQuiz(
  session: import("./types").QuizSession,
  answerId: string,
  choice: "A" | "B" | "C" | "D"
): import("./types").QuizSession {
  const answers = session.answers.map((a) => {
    if (a.id !== answerId) return a;
    return {
      ...a,
      userAnswer: choice,
      isCorrect: choice === a.correctAnswer,
      answeredAt: new Date().toISOString(),
    };
  });
  const updated = { ...session, answers };
  const w = safeWindow();
  if (w) {
    try {
      w.localStorage.setItem(ACTIVE_KEY, JSON.stringify(updated));
    } catch {
      // ignore quota — session stays in memory for this run
    }
  }
  return updated;
}

/**
 * Finalize the local quiz: compute the score, stamp completedAt, enqueue
 * the full answer sheet for server sync, and clear the active slot.
 */
export function completeOfflineQuiz(
  session: import("./types").QuizSession
): import("./types").QuizSession {
  const score = session.answers.filter((a) => a.isCorrect === true).length;
  const completedAt = new Date().toISOString();
  const completed = { ...session, score, completedAt };
  const w = safeWindow();
  if (w) {
    try {
      w.localStorage.setItem(ACTIVE_KEY, JSON.stringify(completed));
    } catch {
      // ignore
    }
  }
  queuePendingSession({
    id: session.id,
    createdAt: completedAt,
    payload: {
      title: session.title,
      mode: session.mode === "final" ? "final" : "immediate",
      sourceType: "bank",
      sourceId: session.sourceId,
      answers: session.answers.map((a) => ({
        questionId: a.questionId,
        userAnswer: a.userAnswer,
        answeredAt: a.answeredAt,
      })),
    },
  });
  return completed;
}

/** Clear the active local session slot (called after leaving the view). */
export function clearOfflineActiveSession(): void {
  const w = safeWindow();
  if (!w) return;
  w.localStorage.removeItem(ACTIVE_KEY);
}

/**
 * Module-level mutex: the sync is triggered from several components
 * (offline banner hook, settings panel, boot-time replay). Without this
 * lock, two concurrent flushes would POST the same queued session twice.
 */
let syncInFlight: Promise<{ synced: number; failed: number }> | null = null;

/**
 * Attempt to flush all pending offline sessions. For each queued session
 * this replays the REAL server flow:
 *   1. POST /api/sessions                → creates the session (+ answers)
 *   2. PATCH /api/sessions/<id>/answers/<aid> for every answer whose local
 *      userAnswer is non-null (matched by questionId), so isCorrect, score
 *      and stats are recomputed server-side exactly like an online run.
 *   3. POST /api/sessions/<id>/complete  → finalize (XP, streak, badges…).
 *
 * Legacy queued entries without the new answer shape are replayed as a
 * bare session (best-effort, same as v5 behaviour).
 */
export async function syncOfflineSessions(): Promise<{
  synced: number;
  failed: number;
}> {
  if (syncInFlight) return syncInFlight;
  syncInFlight = doSyncOfflineSessions().finally(() => {
    syncInFlight = null;
  });
  return syncInFlight;
}

async function doSyncOfflineSessions(): Promise<{
  synced: number;
  failed: number;
}> {
  const w = safeWindow();
  if (!w || !navigator.onLine) return { synced: 0, failed: 0 };
  const pending = getPendingSessions() as Array<
    OfflinePendingSession | LegacyPendingSession
  >;
  if (pending.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;
  const remaining: Array<OfflinePendingSession | LegacyPendingSession> = [];

  for (const p of pending) {
    try {
      const createRes = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: p.payload.title,
          mode: p.payload.mode,
          sourceType: p.payload.sourceType,
          sourceId: p.payload.sourceId,
        }),
      });
      if (!createRes.ok) {
        failed++;
        remaining.push(p);
        continue;
      }
      const serverSession = (await createRes.json()) as {
        id: string;
        answers?: Array<{ id: string; questionId: string }>;
      };

      // Map local answers onto the freshly created server answers.
      const localAnswers = p.payload.answers ?? [];
      const serverAnswers = serverSession.answers ?? [];
      const byQuestionId = new Map(
        serverAnswers.map((sa) => [sa.questionId, sa.id])
      );
      let allAnswered = true;
      for (const la of localAnswers) {
        if (!la.userAnswer) continue;
        const serverAnswerId = byQuestionId.get(la.questionId);
        if (!serverAnswerId) {
          allAnswered = false;
          continue;
        }
        const patchRes = await fetch(
          `/api/sessions/${serverSession.id}/answers/${serverAnswerId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userAnswer: la.userAnswer }),
          }
        );
        if (!patchRes.ok) allAnswered = false;
      }

      // Complete the session so score/XP are recorded server-side.
      const completeRes = await fetch(
        `/api/sessions/${serverSession.id}/complete`,
        { method: "POST" }
      );
      if (completeRes.ok && allAnswered) {
        synced++;
      } else {
        failed++;
        remaining.push(p);
      }
    } catch {
      failed++;
      remaining.push(p);
    }
  }

  // Persist the unsynced ones for a later retry.
  try {
    w.localStorage.setItem(PENDING_KEY, JSON.stringify(remaining));
  } catch {
    // ignore
  }
  return { synced, failed };
}
