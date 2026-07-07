"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Quests store (E4 — gamification).
 *
 * Holds three kinds of quests:
 *   • daily   — refresh every local midnight (deterministic by date).
 *   • weekly  — refresh every Monday (deterministic by ISO week).
 *   • special — one-time milestone quests that never refresh.
 *
 * Progress is tracked via per-day / per-week counters maintained inside this
 * store; counters are reset when the day/week changes. Reward claiming is an
 * explicit user action — the user clicks "Réclamer" on a completed quest to
 * receive the XP + QuizCoins reward.
 *
 * The store is persisted to localStorage so progress survives reloads.
 */

export type QuestType = "daily" | "weekly" | "special";

export interface Quest {
  /** Stable unique id (used as the claim key). */
  id: string;
  /** Human-readable title shown in the UI. */
  title: string;
  /** Optional 1-line description. */
  description?: string;
  /** Quest kind. */
  type: QuestType;
  /** XP awarded when claimed. */
  rewardXp: number;
  /** QuizCoins awarded when claimed. */
  rewardCoins: number;
  /** Current progress value (0..target). Updated on every relevant action. */
  progress: number;
  /** Target value to reach for completion. */
  target: number;
  /** Unit suffix shown next to the progress bar (e.g. "questions", "quiz"). */
  unit?: string;
}

interface QuestTemplate {
  id: string;
  title: string;
  description?: string;
  rewardXp: number;
  rewardCoins: number;
  target: number;
  unit?: string;
  /** Which evaluator to use to compute the live progress value. */
  eval:
    | "questions"
    | "sessions"
    | "banks"
    | "pct80"
    | "perfect"
    | "hardQ"
    | "forum"
    | "streak"
    | "allBanks"
    | "totalSessions";
}

// --- Daily quest pool (8 templates — 4 picked deterministically per day) ---
const DAILY_POOL: QuestTemplate[] = [
  {
    id: "daily-20q",
    title: "Répondre à 20 questions",
    description: "Répondez à 20 questions aujourd'hui.",
    rewardXp: 50,
    rewardCoins: 20,
    target: 20,
    unit: "questions",
    eval: "questions",
  },
  {
    id: "daily-80pct",
    title: "Obtenir 80% sur un quiz",
    description: "Terminez un quiz avec un score ≥ 80%.",
    rewardXp: 100,
    rewardCoins: 30,
    target: 1,
    unit: "quiz",
    eval: "pct80",
  },
  {
    id: "daily-3banks",
    title: "Réviser 3 banques différentes",
    description: "Lancez un quiz dans 3 banques distinctes.",
    rewardXp: 75,
    rewardCoins: 25,
    target: 3,
    unit: "banques",
    eval: "banks",
  },
  {
    id: "daily-forum",
    title: "Aider sur le forum",
    description: "Publiez au moins un message sur le forum.",
    rewardXp: 50,
    rewardCoins: 20,
    target: 1,
    unit: "post",
    eval: "forum",
  },
  {
    id: "daily-perfect",
    title: "Obtenir un score parfait",
    description: "Réussissez 100% sur un quiz aujourd'hui.",
    rewardXp: 120,
    rewardCoins: 40,
    target: 1,
    unit: "quiz",
    eval: "perfect",
  },
  {
    id: "daily-50q",
    title: "Répondre à 50 questions",
    description: "Atteignez 50 questions répondues aujourd'hui.",
    rewardXp: 100,
    rewardCoins: 30,
    target: 50,
    unit: "questions",
    eval: "questions",
  },
  {
    id: "daily-2quiz",
    title: "Compléter 2 quiz",
    description: "Terminez 2 quiz aujourd'hui.",
    rewardXp: 60,
    rewardCoins: 20,
    target: 2,
    unit: "quiz",
    eval: "sessions",
  },
  {
    id: "daily-5q-hard",
    title: "5 questions difficiles",
    description: "Répondez à 5 questions de niveau difficile.",
    rewardXp: 80,
    rewardCoins: 25,
    target: 5,
    unit: "questions",
    eval: "hardQ",
  },
];

// --- Weekly quest pool (5 templates — 3 picked deterministically per week) ---
const WEEKLY_POOL: QuestTemplate[] = [
  {
    id: "weekly-5quiz",
    title: "Compléter 5 quiz",
    description: "Terminez 5 quiz cette semaine.",
    rewardXp: 200,
    rewardCoins: 50,
    target: 5,
    unit: "quiz",
    eval: "sessions",
  },
  {
    id: "weekly-7streak",
    title: "7 jours de série",
    description: "Maintenez une série de 7 jours consécutifs.",
    rewardXp: 500,
    rewardCoins: 100,
    target: 7,
    unit: "jours",
    eval: "streak",
  },
  {
    id: "weekly-100q",
    title: "100 questions répondues",
    description: "Répondez à 100 questions cette semaine.",
    rewardXp: 300,
    rewardCoins: 75,
    target: 100,
    unit: "questions",
    eval: "questions",
  },
  {
    id: "weekly-10quiz",
    title: "Compléter 10 quiz",
    description: "Terminez 10 quiz cette semaine.",
    rewardXp: 400,
    rewardCoins: 100,
    target: 10,
    unit: "quiz",
    eval: "sessions",
  },
  {
    id: "weekly-7banks",
    title: "Réviser 7 banques",
    description: "Lancez un quiz dans 7 banques distinctes.",
    rewardXp: 350,
    rewardCoins: 90,
    target: 7,
    unit: "banques",
    eval: "banks",
  },
];

// --- Special quests: one-time milestone quests (auto-evaluate from prefs) ---
const SPECIAL_QUESTS: QuestTemplate[] = [
  {
    id: "special-10banks",
    title: "Explorateur — 10 banques",
    description: "Jouez dans 10 banques différentes (au total).",
    rewardXp: 300,
    rewardCoins: 80,
    target: 10,
    unit: "banques",
    eval: "allBanks",
  },
  {
    id: "special-25sessions",
    title: "Assidu — 25 sessions",
    description: "Terminez 25 sessions au total.",
    rewardXp: 400,
    rewardCoins: 100,
    target: 25,
    unit: "sessions",
    eval: "totalSessions",
  },
];

interface DailyCounters {
  questionsAnswered: number;
  hardQuestionsAnswered: number;
  sessionsCompleted: number;
  banksTouched: string[];
  bestScorePct: number;
  perfectSessions: number;
  forumPosts: number;
}

interface WeeklyCounters {
  questionsAnswered: number;
  sessionsCompleted: number;
  banksTouched: string[];
  bestStreak: number;
}

interface QuestsState {
  /** "YYYY-MM-DD" — the local date the current daily quests were generated for. */
  dailyDate: string;
  /** ISO week key "YYYY-Www" the weekly quests were generated for. */
  weeklyKey: string;
  /** Generated daily quest ids (selected deterministically from the pool). */
  dailyQuestIds: string[];
  /** Generated weekly quest ids (selected deterministically from the pool). */
  weeklyQuestIds: string[];
  /** IDs of quests that have been claimed. Cleared on refresh. */
  claimedIds: string[];
  /** Daily counters — reset when dailyDate changes. */
  dailyCounters: DailyCounters;
  /** Weekly counters — reset when weeklyKey changes. */
  weeklyCounters: WeeklyCounters;

  /** Recompute the date keys + regenerate quests + reset stale counters. */
  refresh: () => void;
  /**
   * Record a completed session into the quest counters.
   * Called by the same place that calls prefs.recordSession().
   */
  recordSession: (params: {
    correct: number;
    total: number;
    bankId?: string;
    isDailyChallenge?: boolean;
    isHard?: boolean;
  }) => void;
  /** Record a forum post. */
  recordForumPost: () => void;
  /** Update the weekly streak counter with the user's current streak. */
  setWeeklyStreak: (streak: number) => void;
  /** Claim the reward for a completed quest. Returns true on success. */
  claimReward: (questId: string) => void;
  /**
   * Sync special quests with the latest prefs state (called by the panel on
   * mount + whenever the prefs change). Special quests don't have counters —
   * their progress is derived from prefs.
   */
  syncSpecialQuests: (prefs: {
    distinctBanksCount: number;
    sessionsCompleted: number;
  }) => void;
  /** Latest computed special-quest progress (kept in state for the UI). */
  specialProgress: Record<string, number>;

  // --- Selectors ---
  getDailyQuests: () => Quest[];
  getWeeklyQuests: () => Quest[];
  getSpecialQuests: () => Quest[];
}

/** Return local "YYYY-MM-DD". */
function localDateStr(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Return the ISO week key "YYYY-Www" for the given date. */
function isoWeekKey(d = new Date()): string {
  // ISO weeks start on Monday. Compute the Thursday of this week to
  // determine the ISO year.
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7; // 0 = Monday
  date.setUTCDate(date.getUTCDate() - dayNum + 3); // Thursday
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((date.getTime() - firstThursday.getTime()) / 86400000 -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7,
    );
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/**
 * Deterministic hash from a string → 32-bit integer (FNV-1a).
 * Used to pick the daily/weekly quest subset deterministically by date.
 */
function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Pick `count` items from `pool` deterministically based on `seed`.
 * Returns a new array of templates (preserving pool order for stability).
 */
function pickDeterministic<T extends { id: string }>(
  pool: T[],
  count: number,
  seed: string,
): T[] {
  const h = hashStr(seed);
  // Build a list of indices sorted by their hash under the seeded RNG, then
  // take the first `count`. This guarantees the same seed always yields the
  // same selection.
  const ranked = pool
    .map((item, i) => ({ item, i, k: hashStr(`${seed}:${item.id}:${i}`) ^ h }))
    .sort((a, b) => a.k - b.k);
  // Take the first `count` but return them in original pool order so the UI
  // stays stable.
  const chosen = ranked.slice(0, Math.min(count, pool.length));
  return chosen.sort((a, b) => a.i - b.i).map((c) => c.item);
}

function templateToQuest(t: QuestTemplate, progress: number): Quest {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    type:
      t.id.startsWith("daily")
        ? "daily"
        : t.id.startsWith("weekly")
          ? "weekly"
          : "special",
    rewardXp: t.rewardXp,
    rewardCoins: t.rewardCoins,
    progress,
    target: t.target,
    unit: t.unit,
  };
}

/**
 * Evaluate a template's live progress against the current counters / prefs.
 */
function evalTemplate(
  t: QuestTemplate,
  daily: DailyCounters,
  weekly: WeeklyCounters,
  specialProgress: Record<string, number>,
): number {
  switch (t.eval) {
    case "questions":
      return t.id.startsWith("weekly")
        ? Math.min(weekly.questionsAnswered, t.target)
        : Math.min(daily.questionsAnswered, t.target);
    case "sessions":
      return t.id.startsWith("weekly")
        ? Math.min(weekly.sessionsCompleted, t.target)
        : Math.min(daily.sessionsCompleted, t.target);
    case "banks":
      return t.id.startsWith("weekly")
        ? Math.min(weekly.banksTouched.length, t.target)
        : Math.min(daily.banksTouched.length, t.target);
    case "pct80":
      return daily.bestScorePct >= 80 ? 1 : 0;
    case "perfect":
      return Math.min(daily.perfectSessions, t.target);
    case "hardQ":
      return Math.min(daily.hardQuestionsAnswered, t.target);
    case "forum":
      return Math.min(daily.forumPosts, t.target);
    case "streak":
      return Math.min(weekly.bestStreak, t.target);
    case "allBanks":
      return Math.min(specialProgress["allBanks"] ?? 0, t.target);
    case "totalSessions":
      return Math.min(specialProgress["totalSessions"] ?? 0, t.target);
    default:
      return 0;
  }
}

const TEMPLATE_MAP: Record<string, QuestTemplate> = Object.fromEntries(
  [...DAILY_POOL, ...WEEKLY_POOL, ...SPECIAL_QUESTS].map((t) => [t.id, t]),
);

function freshDailyCounters(): DailyCounters {
  return {
    questionsAnswered: 0,
    hardQuestionsAnswered: 0,
    sessionsCompleted: 0,
    banksTouched: [],
    bestScorePct: 0,
    perfectSessions: 0,
    forumPosts: 0,
  };
}

function freshWeeklyCounters(): WeeklyCounters {
  return {
    questionsAnswered: 0,
    sessionsCompleted: 0,
    banksTouched: [],
    bestStreak: 0,
  };
}

export const useQuests = create<QuestsState>()(
  persist(
    (set, get) => ({
      dailyDate: localDateStr(),
      weeklyKey: isoWeekKey(),
      dailyQuestIds: pickDeterministic(DAILY_POOL, 4, localDateStr()).map(
        (t) => t.id,
      ),
      weeklyQuestIds: pickDeterministic(
        WEEKLY_POOL,
        3,
        isoWeekKey(),
      ).map((t) => t.id),
      claimedIds: [],
      dailyCounters: freshDailyCounters(),
      weeklyCounters: freshWeeklyCounters(),
      specialProgress: {},

      refresh: () => {
        const today = localDateStr();
        const week = isoWeekKey();
        const s = get();
        const updates: Partial<QuestsState> = {};
        if (today !== s.dailyDate) {
          updates.dailyDate = today;
          updates.dailyQuestIds = pickDeterministic(DAILY_POOL, 4, today).map(
            (t) => t.id,
          );
          updates.dailyCounters = freshDailyCounters();
        }
        if (week !== s.weeklyKey) {
          updates.weeklyKey = week;
          updates.weeklyQuestIds = pickDeterministic(WEEKLY_POOL, 3, week).map(
            (t) => t.id,
          );
          updates.weeklyCounters = freshWeeklyCounters();
        }
        // Drop claimed ids belonging to quests no longer in the active set.
        const active = new Set([
          ...(updates.dailyQuestIds ?? s.dailyQuestIds),
          ...(updates.weeklyQuestIds ?? s.weeklyQuestIds),
          ...SPECIAL_QUESTS.map((t) => t.id),
        ]);
        const kept = s.claimedIds.filter((id) => active.has(id));
        if (kept.length !== s.claimedIds.length) updates.claimedIds = kept;
        if (Object.keys(updates).length > 0) set(updates);
      },

      recordSession: ({ correct, total, bankId, isHard }) => {
        // Always refresh first to make sure we're not writing to stale counters.
        get().refresh();
        const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
        const isPerfect = total > 0 && correct === total;
        set((s) => ({
          dailyCounters: {
            ...s.dailyCounters,
            questionsAnswered: s.dailyCounters.questionsAnswered + total,
            hardQuestionsAnswered:
              s.dailyCounters.hardQuestionsAnswered + (isHard ? total : 0),
            sessionsCompleted: s.dailyCounters.sessionsCompleted + 1,
            banksTouched:
              bankId && !s.dailyCounters.banksTouched.includes(bankId)
                ? [...s.dailyCounters.banksTouched, bankId]
                : s.dailyCounters.banksTouched,
            bestScorePct: Math.max(s.dailyCounters.bestScorePct, pct),
            perfectSessions:
              s.dailyCounters.perfectSessions + (isPerfect ? 1 : 0),
          },
          weeklyCounters: {
            ...s.weeklyCounters,
            questionsAnswered: s.weeklyCounters.questionsAnswered + total,
            sessionsCompleted: s.weeklyCounters.sessionsCompleted + 1,
            banksTouched:
              bankId && !s.weeklyCounters.banksTouched.includes(bankId)
                ? [...s.weeklyCounters.banksTouched, bankId]
                : s.weeklyCounters.banksTouched,
          },
        }));
      },

      recordForumPost: () => {
        get().refresh();
        set((s) => ({
          dailyCounters: {
            ...s.dailyCounters,
            forumPosts: s.dailyCounters.forumPosts + 1,
          },
        }));
      },

      setWeeklyStreak: (streak) => {
        set((s) => ({
          weeklyCounters: {
            ...s.weeklyCounters,
            bestStreak: Math.max(s.weeklyCounters.bestStreak, streak),
          },
        }));
      },

      claimReward: (questId) => {
        const s = get();
        if (s.claimedIds.includes(questId)) return;
        const t = TEMPLATE_MAP[questId];
        if (!t) return;
        const progress = evalTemplate(
          t,
          s.dailyCounters,
          s.weeklyCounters,
          s.specialProgress,
        );
        if (progress < t.target) return;
        set({ claimedIds: [...s.claimedIds, questId] });
        // Award the rewards via the prefs store (imported lazily to avoid a
        // circular import — prefs-store doesn't import quests-store).
        // We delegate to a callback so the prefs store can apply XP + coins.
        questRewardCallbacks.forEach((cb) => cb(t.rewardXp, t.rewardCoins, t.title));
      },

      syncSpecialQuests: (prefs) => {
        set((s) => ({
          specialProgress: {
            ...s.specialProgress,
            allBanks: prefs.distinctBanksCount,
            totalSessions: prefs.sessionsCompleted,
          },
        }));
      },

      getDailyQuests: () => {
        const s = get();
        return s.dailyQuestIds.map((id) => {
          const t = TEMPLATE_MAP[id];
          if (!t) return null;
          const progress = evalTemplate(
            t,
            s.dailyCounters,
            s.weeklyCounters,
            s.specialProgress,
          );
          return templateToQuest(t, progress);
        }).filter((q): q is Quest => q !== null);
      },
      getWeeklyQuests: () => {
        const s = get();
        return s.weeklyQuestIds.map((id) => {
          const t = TEMPLATE_MAP[id];
          if (!t) return null;
          const progress = evalTemplate(
            t,
            s.dailyCounters,
            s.weeklyCounters,
            s.specialProgress,
          );
          return templateToQuest(t, progress);
        }).filter((q): q is Quest => q !== null);
      },
      getSpecialQuests: () => {
        const s = get();
        return SPECIAL_QUESTS.map((t) => {
          const progress = evalTemplate(
            t,
            s.dailyCounters,
            s.weeklyCounters,
            s.specialProgress,
          );
          return templateToQuest(t, progress);
        });
      },
    }),
    {
      name: "quizexam-quests",
      // Only persist the counter + claim data; quest ids are recomputed on
      // mount by the consumer calling refresh() (which keeps them in sync with
      // the date).
      partialize: (s) => ({
        dailyDate: s.dailyDate,
        weeklyKey: s.weeklyKey,
        dailyQuestIds: s.dailyQuestIds,
        weeklyQuestIds: s.weeklyQuestIds,
        claimedIds: s.claimedIds,
        dailyCounters: s.dailyCounters,
        weeklyCounters: s.weeklyCounters,
        specialProgress: s.specialProgress,
      }),
    },
  ),
);

/**
 * Reward callbacks registered by the host app. When a quest is claimed, each
 * registered callback is invoked with (xp, coins, title). The host typically
 * registers a single callback that wires the reward into the prefs store.
 */
const questRewardCallbacks: Array<(xp: number, coins: number, title: string) => void> = [];

export function registerQuestRewardCallback(
  cb: (xp: number, coins: number, title: string) => void,
): () => void {
  questRewardCallbacks.push(cb);
  return () => {
    const i = questRewardCallbacks.indexOf(cb);
    if (i >= 0) questRewardCallbacks.splice(i, 1);
  };
}

/** Reset all quest data — used only by the shop dev "reset" / debug tools. */
export function resetQuests() {
  useQuests.setState({
    dailyDate: localDateStr(),
    weeklyKey: isoWeekKey(),
    dailyQuestIds: pickDeterministic(DAILY_POOL, 4, localDateStr()).map(
      (t) => t.id,
    ),
    weeklyQuestIds: pickDeterministic(WEEKLY_POOL, 3, isoWeekKey()).map(
      (t) => t.id,
    ),
    claimedIds: [],
    dailyCounters: freshDailyCounters(),
    weeklyCounters: freshWeeklyCounters(),
    specialProgress: {},
  });
}
