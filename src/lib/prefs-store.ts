"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Locale } from "./i18n";

export interface Badge {
  id: string;
  label: string;
  description: string;
  icon: string;
  unlocked: boolean;
  /** ISO date string when the badge was unlocked (null if locked). */
  unlockedAt?: string | null;
  /**
   * Optional progress info for badges that can be partially completed.
   * When present, the achievements view shows a progress bar.
   */
  progress?: { current: number; target: number };
  /** Accent color (Tailwind name) used by the achievements view. */
  color?: string;
}

export interface NotificationItem {
  id: string;
  type: "result" | "reminder" | "progress" | "badge" | "info";
  title: string;
  message: string;
  date: string;
  read: boolean;
}

/** Optional context passed to recordSession for richer badge tracking. */
export interface SessionContext {
  /** The bank the session was started from (for polyvalent badge). */
  bankId?: string;
  /** Difficulty filter used to start the session (for master-hard badge). */
  difficulty?: "easy" | "medium" | "hard" | "all";
  /** True if the session was an exam (for exam-complete badge). */
  isExam?: boolean;
  /** True if this was a daily-challenge session (for daily-warrior badge). */
  isDailyChallenge?: boolean;
  /** ISO timestamp when the session started (for speed-run badge). */
  startedAt?: string;
  /** ISO timestamp when the session completed (for speed-run / night-owl / early-bird). */
  completedAt?: string;
}

/** Number of milliseconds in a day — used for the rolling 7-day window. */
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
/** Threshold for the speed-run badge: 50 questions answered in < 15 minutes. */
const SPEED_RUN_QUESTION_THRESHOLD = 50;
const SPEED_RUN_TIME_MS = 15 * 60 * 1000;
/** Threshold for the marathonien badge: 1000 questions in 1 week. */
const MARATHON_THRESHOLD = 1000;
const MARATHON_WINDOW_DAYS = 7;

interface PrefsState {
  locale: Locale;
  setLocale: (l: Locale) => void;
  highContrast: boolean;
  largeText: boolean;
  reduceMotion: boolean;
  toggleHighContrast: () => void;
  toggleLargeText: () => void;
  toggleReduceMotion: () => void;
  // --- Extended accessibility (P9) ---
  /** Base font size in pixels (12-24). Applied to <html> via inline style. */
  fontSize: number;
  setFontSize: (size: number) => void;
  /** Dyslexia-friendly font toggle (applies [data-dyslexia] on <html>). */
  dyslexiaFont: boolean;
  toggleDyslexiaFont: () => void;
  /** Screen-reader hints toggle (applies [data-sr-hints] on <html>). */
  screenReaderHints: boolean;
  toggleScreenReaderHints: () => void;
  xp: number;
  level: number;
  streak: number;
  lastActiveDate: string;
  badges: Badge[];
  sessionsCompleted: number;
  totalCorrect: number;
  totalAnswered: number;
  // --- Extended tracking (P5) ---
  /** Number of times the user scored 100% on a quiz (for perfectionniste). */
  perfectScores: number;
  /** Distinct bank IDs the user has played (for polyvalent). */
  distinctBanks: string[];
  /** Rolling 7-day question count: [{ date: ISO, count }] (for marathonien). */
  weekActivity: { date: string; count: number }[];
  /** Number of social posts authored (for social-butterfly). */
  postsCount: number;
  /** Number of users referred (for parrain-5). Synced from /api/referral. */
  referralsCount: number;
  /** Number of daily challenges completed (for daily-warrior). */
  dailyChallengesCompleted: number;
  /** Best score % on a "hard" difficulty session (for master-hard). */
  hardBestPct: number;
  /** Number of spaced-repetition reviews completed (for revision-master). */
  spacedReviewsCompleted: number;
  /** Whether the user has completed a quiz between 0:00 and 4:00 (night-owl). */
  nightOwlUnlocked: boolean;
  /** Whether the user has completed a quiz between 4:00 and 6:00 (early-bird). */
  earlyBirdUnlocked: boolean;
  addXp: (amount: number) => void;
  recordSession: (correct: number, total: number, ctx?: SessionContext) => void;
  unlockBadge: (id: string) => void;
  /** Sync the local referral count with the server; awards +50 XP per new referral. */
  syncReferrals: (serverCount: number) => void;
  /** Record that the user authored a social post. */
  recordPost: () => void;
  /** Record that the user completed a daily challenge. */
  recordDailyChallenge: () => void;
  /** Record that the user completed a spaced-repetition review. */
  recordSpacedReview: () => void;
  notifications: NotificationItem[];
  addNotification: (n: Omit<NotificationItem, "id" | "date" | "read">) => void;
  markAllRead: () => void;
  unreadCount: () => number;
}

const DEFAULT_BADGES: Badge[] = [
  // --- Existing (8) ---
  { id: "first-quiz", label: "Premier pas", description: "Terminer votre premier quiz", icon: "Footprints", unlocked: false, color: "emerald" },
  { id: "streak-3", label: "Régulier", description: "3 jours consécutifs", icon: "Flame", unlocked: false, color: "amber" },
  { id: "streak-7", label: "Assidu", description: "7 jours consécutifs", icon: "Trophy", unlocked: false, color: "amber" },
  { id: "perfect-score", label: "Sans faute", description: "100% à un quiz", icon: "Star", unlocked: false, color: "rose" },
  { id: "quiz-master-10", label: "Quiz Master", description: "Terminer 10 quiz", icon: "Crown", unlocked: false, color: "violet" },
  { id: "xp-500", label: "Érudit", description: "Atteindre 500 XP", icon: "GraduationCap", unlocked: false, color: "emerald" },
  { id: "exam-complete", label: "Candidat", description: "Terminer un examen blanc", icon: "FileCheck", unlocked: false, color: "sky" },
  { id: "scholar-100", label: "Studieux", description: "Répondre à 100 questions", icon: "BookOpen", unlocked: false, color: "emerald" },
  // --- New (19) — total 27 badges ---
  { id: "speed-run", label: "Speed Runner", description: "50 questions en moins de 15 min", icon: "Zap", unlocked: false, color: "amber" },
  { id: "polyvalent", label: "Polyvalent", description: "Jouer dans 10 banques différentes", icon: "Layers", unlocked: false, color: "teal" },
  { id: "perfectionniste", label: "Perfectionniste", description: "Obtenir 100% à 5 quiz", icon: "Sparkles", unlocked: false, color: "rose" },
  { id: "marathonien", label: "Marathonien", description: "1000 questions en 1 semaine", icon: "Marathon", unlocked: false, color: "amber" },
  { id: "social-butterfly", label: "Papillon Social", description: "Publier 10 messages", icon: "MessageCircle", unlocked: false, color: "sky" },
  { id: "parrain-5", label: "Parrain", description: "Parrainer 5 personnes", icon: "Users", unlocked: false, color: "violet" },
  { id: "daily-warrior", label: "Guerrier Quotidien", description: "30 défis quotidiens", icon: "Swords", unlocked: false, color: "rose" },
  { id: "master-hard", label: "Maître Difficile", description: "80%+ sur un quiz difficile", icon: "Skull", unlocked: false, color: "rose" },
  { id: "revision-master", label: "Maître Réviseur", description: "100 révisions espacées", icon: "Brain", unlocked: false, color: "amber" },
  { id: "streak-30", label: "Habitué", description: "30 jours consécutifs", icon: "Flame", unlocked: false, color: "rose" },
  { id: "streak-100", label: "Légende", description: "100 jours consécutifs", icon: "Crown", unlocked: false, color: "amber" },
  { id: "xp-1000", label: "Savant", description: "Atteindre 1000 XP", icon: "GraduationCap", unlocked: false, color: "teal" },
  { id: "xp-5000", label: "Génie", description: "Atteindre 5000 XP", icon: "Brain", unlocked: false, color: "violet" },
  { id: "quiz-master-50", label: "Champion", description: "Terminer 50 quiz", icon: "Trophy", unlocked: false, color: "sky" },
  { id: "quiz-master-100", label: "Légende des Quiz", description: "Terminer 100 quiz", icon: "Crown", unlocked: false, color: "amber" },
  { id: "scholar-500", label: "Studieux +", description: "Répondre à 500 questions", icon: "BookOpen", unlocked: false, color: "teal" },
  { id: "scholar-1000", label: "Érudit Suprême", description: "Répondre à 1000 questions", icon: "BookOpen", unlocked: false, color: "violet" },
  { id: "night-owl", label: "Hibou de nuit", description: "Quiz entre minuit et 4h", icon: "Moon", unlocked: false, color: "violet" },
  { id: "early-bird", label: "Lève-tôt", description: "Quiz entre 4h et 6h", icon: "Sunrise", unlocked: false, color: "amber" },
];

function levelFromXp(xp: number): number {
  return Math.floor(xp / 100) + 1;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Trim the rolling 7-day activity log to entries from the last 7 days,
 * and merge today's count into a single entry.
 */
function pruneWeekActivity(
  log: { date: string; count: number }[],
  todayIso: string,
  addCount: number
): { date: string; count: number }[] {
  const todayKey = todayIso.slice(0, 10);
  const cutoff = Date.now() - MARATHON_WINDOW_DAYS * ONE_DAY_MS;
  const merged: Record<string, number> = {};
  for (const entry of log) {
    const ts = new Date(entry.date).getTime();
    if (ts >= cutoff) {
      const key = entry.date.slice(0, 10);
      merged[key] = (merged[key] ?? 0) + entry.count;
    }
  }
  merged[todayKey] = (merged[todayKey] ?? 0) + addCount;
  return Object.entries(merged).map(([date, count]) => ({ date, count }));
}

export const usePrefs = create<PrefsState>()(
  persist(
    (set, get) => ({
      locale: "fr",
      setLocale: (l) => set({ locale: l }),
      highContrast: false,
      largeText: false,
      reduceMotion: false,
      toggleHighContrast: () => set((s) => ({ highContrast: !s.highContrast })),
      toggleLargeText: () => set((s) => ({ largeText: !s.largeText })),
      toggleReduceMotion: () => set((s) => ({ reduceMotion: !s.reduceMotion })),
      // Extended accessibility (P9)
      fontSize: 16,
      setFontSize: (size) =>
        set({
          fontSize: Math.min(24, Math.max(12, Math.round(size))),
        }),
      dyslexiaFont: false,
      toggleDyslexiaFont: () => set((s) => ({ dyslexiaFont: !s.dyslexiaFont })),
      screenReaderHints: false,
      toggleScreenReaderHints: () =>
        set((s) => ({ screenReaderHints: !s.screenReaderHints })),
      xp: 0,
      level: 1,
      streak: 0,
      lastActiveDate: "",
      badges: DEFAULT_BADGES,
      sessionsCompleted: 0,
      totalCorrect: 0,
      totalAnswered: 0,
      // Extended tracking (P5)
      perfectScores: 0,
      distinctBanks: [],
      weekActivity: [],
      postsCount: 0,
      referralsCount: 0,
      dailyChallengesCompleted: 0,
      hardBestPct: 0,
      spacedReviewsCompleted: 0,
      nightOwlUnlocked: false,
      earlyBirdUnlocked: false,
      addXp: (amount) => {
        const newXp = get().xp + amount;
        set({ xp: newXp, level: levelFromXp(newXp) });
        if (newXp >= 500) get().unlockBadge("xp-500");
        if (newXp >= 1000) get().unlockBadge("xp-1000");
        if (newXp >= 5000) get().unlockBadge("xp-5000");
      },
      recordSession: (correct, total, ctx) => {
        const today = todayStr();
        const lastDate = get().lastActiveDate;
        let newStreak = get().streak;
        if (lastDate !== today) {
          const yesterday = new Date(Date.now() - ONE_DAY_MS).toISOString().slice(0, 10);
          if (lastDate === yesterday) newStreak += 1;
          else newStreak = 1;
        }
        const newSessions = get().sessionsCompleted + 1;
        const newXp = get().xp + correct * 10 + (correct === total ? 50 : 0);

        // Update distinct banks (polyvalent badge)
        const bankId = ctx?.bankId;
        const prevBanks = get().distinctBanks;
        const newBanks = bankId && !prevBanks.includes(bankId)
          ? [...prevBanks, bankId]
          : prevBanks;

        // Update perfectScores (perfectionniste badge)
        const isPerfect = total > 0 && correct === total;
        const newPerfectScores = get().perfectScores + (isPerfect ? 1 : 0);

        // Update rolling 7-day activity (marathonien badge)
        const completedAt = ctx?.completedAt ?? new Date().toISOString();
        const newWeekActivity = pruneWeekActivity(
          get().weekActivity,
          completedAt,
          total
        );
        const weekTotal = newWeekActivity.reduce((sum, e) => sum + e.count, 0);

        // Speed-run badge: ≥ 50 questions answered in < 15 min
        const startedAt = ctx?.startedAt;
        let speedRunAchieved = false;
        if (startedAt && total >= SPEED_RUN_QUESTION_THRESHOLD) {
          const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();
          if (durationMs > 0 && durationMs < SPEED_RUN_TIME_MS) {
            speedRunAchieved = true;
          }
        }

        // Night-owl / early-bird badges (based on completion hour)
        const hour = new Date(completedAt).getHours();
        const newNightOwl = get().nightOwlUnlocked || (hour >= 0 && hour < 4);
        const newEarlyBird = get().earlyBirdUnlocked || (hour >= 4 && hour < 6);

        // Master-hard badge: 80%+ on a hard-difficulty session
        const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
        const isHardSession = ctx?.difficulty === "hard";
        const newHardBestPct = isHardSession
          ? Math.max(get().hardBestPct, pct)
          : get().hardBestPct;

        set({
          streak: newStreak,
          lastActiveDate: today,
          sessionsCompleted: newSessions,
          totalCorrect: get().totalCorrect + correct,
          totalAnswered: get().totalAnswered + total,
          xp: newXp,
          level: levelFromXp(newXp),
          distinctBanks: newBanks,
          perfectScores: newPerfectScores,
          weekActivity: newWeekActivity,
          nightOwlUnlocked: newNightOwl,
          earlyBirdUnlocked: newEarlyBird,
          hardBestPct: newHardBestPct,
        });

        // --- Badge checks ---
        const totalAnswered = get().totalAnswered;
        if (newSessions === 1) get().unlockBadge("first-quiz");
        if (newStreak >= 3) get().unlockBadge("streak-3");
        if (newStreak >= 7) get().unlockBadge("streak-7");
        if (newStreak >= 30) get().unlockBadge("streak-30");
        if (newStreak >= 100) get().unlockBadge("streak-100");
        if (isPerfect) get().unlockBadge("perfect-score");
        if (newPerfectScores >= 5) get().unlockBadge("perfectionniste");
        if (newSessions >= 10) get().unlockBadge("quiz-master-10");
        if (newSessions >= 50) get().unlockBadge("quiz-master-50");
        if (newSessions >= 100) get().unlockBadge("quiz-master-100");
        if (totalAnswered >= 100) get().unlockBadge("scholar-100");
        if (totalAnswered >= 500) get().unlockBadge("scholar-500");
        if (totalAnswered >= 1000) get().unlockBadge("scholar-1000");
        if (newXp >= 500) get().unlockBadge("xp-500");
        if (newXp >= 1000) get().unlockBadge("xp-1000");
        if (newXp >= 5000) get().unlockBadge("xp-5000");
        if (newBanks.length >= 10) get().unlockBadge("polyvalent");
        if (weekTotal >= MARATHON_THRESHOLD) get().unlockBadge("marathonien");
        if (speedRunAchieved) get().unlockBadge("speed-run");
        if (newNightOwl) get().unlockBadge("night-owl");
        if (newEarlyBird) get().unlockBadge("early-bird");
        if (newHardBestPct >= 80) get().unlockBadge("master-hard");
        if (ctx?.isExam) get().unlockBadge("exam-complete");
        if (ctx?.isDailyChallenge) {
          // Increment daily-challenge counter inline (so the badge check works
          // even if recordDailyChallenge() is not separately called).
          const newDcCount = get().dailyChallengesCompleted + 1;
          set({ dailyChallengesCompleted: newDcCount });
          if (newDcCount >= 30) get().unlockBadge("daily-warrior");
        }
      },
      unlockBadge: (id) => {
        const badges = get().badges;
        const existing = badges.find((b) => b.id === id);
        if (existing && !existing.unlocked) {
          const unlockedAt = new Date().toISOString();
          set({
            badges: badges.map((b) =>
              b.id === id ? { ...b, unlocked: true, unlockedAt } : b
            ),
          });
          get().addNotification({
            type: "badge",
            title: "Badge débloqué !",
            message: `Vous avez débloqué le badge « ${existing.label} »`,
          });
        }
      },
      syncReferrals: (serverCount) => {
        const localCount = get().referralsCount;
        if (serverCount <= localCount) {
          // Ensure the local mirror is at least the server count (no-op if equal).
          if (serverCount !== localCount) {
            set({ referralsCount: serverCount });
          }
          return;
        }
        const newReferrals = serverCount - localCount;
        // Award +50 XP per new referral.
        const newXp = get().xp + newReferrals * 50;
        set({
          referralsCount: serverCount,
          xp: newXp,
          level: levelFromXp(newXp),
        });
        if (serverCount >= 5) get().unlockBadge("parrain-5");
        get().addNotification({
          type: "badge",
          title: "Nouveau parrainage !",
          message: `Vous avez parrainé ${newReferrals} nouvelle(s) personne(s). +${newReferrals * 50} XP`,
        });
      },
      recordPost: () => {
        const newCount = get().postsCount + 1;
        set({ postsCount: newCount });
        if (newCount >= 10) get().unlockBadge("social-butterfly");
      },
      recordDailyChallenge: () => {
        const newCount = get().dailyChallengesCompleted + 1;
        set({ dailyChallengesCompleted: newCount });
        if (newCount >= 30) get().unlockBadge("daily-warrior");
      },
      recordSpacedReview: () => {
        const newCount = get().spacedReviewsCompleted + 1;
        set({ spacedReviewsCompleted: newCount });
        if (newCount >= 100) get().unlockBadge("revision-master");
      },
      notifications: [],
      addNotification: (n) => {
        const item: NotificationItem = { ...n, id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, date: new Date().toISOString(), read: false };
        set((s) => ({ notifications: [item, ...s.notifications].slice(0, 50) }));
      },
      markAllRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
      unreadCount: () => get().notifications.filter((n) => !n.read).length,
    }),
    { name: "quizexam-prefs" }
  )
);

/**
 * Helper exported for the achievements view: compute the live progress for a
 * badge given the current prefs state. Returns null if the badge has no
 * meaningful progress metric.
 */
export function getBadgeProgress(
  badgeId: string,
  state: PrefsState
): { current: number; target: number } | null {
  switch (badgeId) {
    case "streak-3":
      return { current: Math.min(state.streak, 3), target: 3 };
    case "streak-7":
      return { current: Math.min(state.streak, 7), target: 7 };
    case "streak-30":
      return { current: Math.min(state.streak, 30), target: 30 };
    case "streak-100":
      return { current: Math.min(state.streak, 100), target: 100 };
    case "perfect-score":
      return {
        current: Math.min(state.perfectScores, 1),
        target: 1,
      };
    case "perfectionniste":
      return { current: Math.min(state.perfectScores, 5), target: 5 };
    case "quiz-master-10":
      return { current: Math.min(state.sessionsCompleted, 10), target: 10 };
    case "quiz-master-50":
      return { current: Math.min(state.sessionsCompleted, 50), target: 50 };
    case "quiz-master-100":
      return { current: Math.min(state.sessionsCompleted, 100), target: 100 };
    case "scholar-100":
      return { current: Math.min(state.totalAnswered, 100), target: 100 };
    case "scholar-500":
      return { current: Math.min(state.totalAnswered, 500), target: 500 };
    case "scholar-1000":
      return { current: Math.min(state.totalAnswered, 1000), target: 1000 };
    case "xp-500":
      return { current: Math.min(state.xp, 500), target: 500 };
    case "xp-1000":
      return { current: Math.min(state.xp, 1000), target: 1000 };
    case "xp-5000":
      return { current: Math.min(state.xp, 5000), target: 5000 };
    case "polyvalent":
      return { current: Math.min(state.distinctBanks.length, 10), target: 10 };
    case "marathonien": {
      const weekTotal = state.weekActivity.reduce((sum, e) => sum + e.count, 0);
      return { current: Math.min(weekTotal, 1000), target: 1000 };
    }
    case "social-butterfly":
      return { current: Math.min(state.postsCount, 10), target: 10 };
    case "parrain-5":
      return { current: Math.min(state.referralsCount, 5), target: 5 };
    case "daily-warrior":
      return { current: Math.min(state.dailyChallengesCompleted, 30), target: 30 };
    case "master-hard":
      return { current: Math.min(state.hardBestPct, 80), target: 80 };
    case "revision-master":
      return { current: Math.min(state.spacedReviewsCompleted, 100), target: 100 };
    default:
      return null;
  }
}
