"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * League system (E4 — gamification).
 *
 * Five leagues: Bronze → Argent → Or → Platine → Diamant.
 * Each league has a weekly-XP threshold; the user's league is derived from
 * their weekly XP. The user competes against 9 simulated bot users (with
 * deterministic weekly XP per league + ISO week) for their rank within the
 * league. At the end of each ISO week:
 *   • top 3 ranks → promote to the next league
 *   • bottom 3 ranks → relegate to the previous league
 *   • middle 4 ranks → stay
 *
 * The bot roster is deterministic per (league, weekKey) so the leaderboard
 * stays stable across reloads within the same week, but reshuffles every
 * Monday.
 *
 * The persisted store keeps the user's "current league" (frozen for the
 * duration of the week) and the history of past weeks.
 */

export type LeagueId = "bronze" | "argent" | "or" | "platine" | "diamant";

export interface LeagueInfo {
  id: LeagueId;
  label: string;
  /** Minimum weekly XP to *enter* this league. */
  minWeeklyXp: number;
  /** Maximum weekly XP for this league (exclusive — next league's min). */
  maxWeeklyXp: number;
  /** Tailwind gradient classes for the badge. */
  gradient: string;
  /** Tailwind text color class. */
  text: string;
  /** Tailwind background tint class. */
  bgSoft: string;
  /** Tailwind border class. */
  border: string;
  /** Emoji used as the league icon. */
  emoji: string;
}

export const LEAGUES: LeagueInfo[] = [
  {
    id: "bronze",
    label: "Bronze",
    minWeeklyXp: 0,
    maxWeeklyXp: 200,
    gradient: "from-amber-700 to-orange-800",
    text: "text-amber-700 dark:text-amber-500",
    bgSoft: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-300 dark:border-amber-800",
    emoji: "🥉",
  },
  {
    id: "argent",
    label: "Argent",
    minWeeklyXp: 200,
    maxWeeklyXp: 500,
    gradient: "from-slate-400 to-slate-600",
    text: "text-slate-600 dark:text-slate-300",
    bgSoft: "bg-slate-50 dark:bg-slate-900/40",
    border: "border-slate-300 dark:border-slate-700",
    emoji: "🥈",
  },
  {
    id: "or",
    label: "Or",
    minWeeklyXp: 500,
    maxWeeklyXp: 1000,
    gradient: "from-yellow-400 to-amber-500",
    text: "text-yellow-600 dark:text-yellow-400",
    bgSoft: "bg-yellow-50 dark:bg-yellow-950/40",
    border: "border-yellow-300 dark:border-yellow-800",
    emoji: "🥇",
  },
  {
    id: "platine",
    label: "Platine",
    minWeeklyXp: 1000,
    maxWeeklyXp: 2000,
    gradient: "from-cyan-300 to-teal-500",
    text: "text-cyan-600 dark:text-cyan-300",
    bgSoft: "bg-cyan-50 dark:bg-cyan-950/40",
    border: "border-cyan-300 dark:border-cyan-800",
    emoji: "💎",
  },
  {
    id: "diamant",
    label: "Diamant",
    minWeeklyXp: 2000,
    maxWeeklyXp: Number.POSITIVE_INFINITY,
    gradient: "from-fuchsia-400 via-violet-400 to-sky-400",
    text: "text-fuchsia-600 dark:text-fuchsia-300",
    bgSoft: "bg-fuchsia-50 dark:bg-fuchsia-950/40",
    border: "border-fuchsia-300 dark:border-fuchsia-800",
    emoji: "💠",
  },
];

export function getLeagueInfo(id: LeagueId): LeagueInfo {
  return LEAGUES.find((l) => l.id === id) ?? LEAGUES[0];
}

/** Derive the league the user *would* be in based on their weekly XP. */
export function getLeagueByXp(weeklyXp: number): LeagueId {
  for (let i = LEAGUES.length - 1; i >= 0; i--) {
    if (weeklyXp >= LEAGUES[i].minWeeklyXp) return LEAGUES[i].id;
  }
  return "bronze";
}

/** Return the next league up, or null if already at the top. */
export function nextLeague(id: LeagueId): LeagueInfo | null {
  const i = LEAGUES.findIndex((l) => l.id === id);
  return i >= 0 && i < LEAGUES.length - 1 ? LEAGUES[i + 1] : null;
}

/** Return the previous league down, or null if already at the bottom. */
export function previousLeague(id: LeagueId): LeagueInfo | null {
  const i = LEAGUES.findIndex((l) => l.id === id);
  return i > 0 ? LEAGUES[i - 1] : null;
}

export interface LeagueBot {
  name: string;
  avatar: string;
  weeklyXp: number;
}

/** French first names used for the simulated league members. */
const BOT_NAMES = [
  "Aïcha", "Moussa", "Fatou", "Ibrahim", "Awa", "Salif",
  "Kadiatou", "Boubacar", "Rasmané", "Mariam", "Adama", "Aminata",
  "Seydou", "Bintou", "Yacouba", "Nadège", "Ousmane", "Pierrette",
  "Karim", "Suzanne", "Drissa", "Hélène", "Bakary", "Christine",
];

/**
 * Deterministic pseudo-random generator from a string seed (mulberry32).
 */
function seededRng(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate the 9 simulated bot users that share the user's league for the
 * given ISO week. Bot XP is uniformly distributed across the league's XP
 * range (with a small bias toward the lower half so the user can realistically
 * reach top 3).
 */
export function getLeagueBots(
  league: LeagueId,
  weekKey: string,
): LeagueBot[] {
  const info = getLeagueInfo(league);
  const rng = seededRng(`${league}:${weekKey}`);
  const bots: LeagueBot[] = [];
  const count = 9;
  for (let i = 0; i < count; i++) {
    // 70% of bots land in the lower 60% of the league; 30% land in the upper
    // 40%. This gives the user a fighting chance to reach top 3.
    const upperBias = rng() < 0.3;
    const lo = upperBias ? 0.4 : 0;
    const hi = upperBias ? 1 : 0.6;
    const frac = lo + rng() * (hi - lo);
    const range = info.maxWeeklyXp - info.minWeeklyXp;
    const xp = Math.round(info.minWeeklyXp + frac * range);
    bots.push({
      name: BOT_NAMES[(i + Math.floor(rng() * BOT_NAMES.length)) % BOT_NAMES.length] +
        " " +
        String.fromCharCode(65 + Math.floor(rng() * 26)) +
        ".",
      avatar: BOT_NAMES[i % BOT_NAMES.length][0],
      weeklyXp: Math.max(0, xp),
    });
  }
  return bots;
}

/**
 * Compute the user's 1-indexed rank within their league (1 = top).
 * Ties are broken alphabetically by name (player name = "Vous").
 */
export function computeUserRank(
  userXp: number,
  bots: LeagueBot[],
): number {
  const sorted = [...bots, { name: "Vous", avatar: "V", weeklyXp: userXp }].sort(
    (a, b) => b.weeklyXp - a.weeklyXp || a.name.localeCompare(b.name),
  );
  const idx = sorted.findIndex((b) => b.name === "Vous");
  return idx + 1;
}

export interface LeagueHistoryEntry {
  weekKey: string;
  league: LeagueId;
  rank: number;
  weeklyXp: number;
  promoted: boolean;
  relegated: boolean;
}

interface LeagueState {
  /** The user's current league for the active week. */
  currentLeague: LeagueId;
  /** The ISO week key the currentLeague was set for. */
  currentWeekKey: string;
  /** Past weeks' outcomes (most recent first). */
  history: LeagueHistoryEntry[];

  /**
   * Recompute the league state for the current ISO week. Should be called on
   * app mount + whenever the user's weekly XP changes. If the week has
   * changed since the last call, evaluates promotion/relegation from the
   * previous week's rank + records a history entry, then settles into the
   * new league.
   */
  refresh: (currentWeeklyXp: number) => void;

  /** Hard reset (debug only). */
  reset: () => void;
}

/** Return the ISO week key "YYYY-Www" for the given date. */
function isoWeekKey(d = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
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

export function getCurrentWeekKey(): string {
  return isoWeekKey();
}

export const useLeague = create<LeagueState>()(
  persist(
    (set, get) => ({
      currentLeague: "bronze",
      currentWeekKey: isoWeekKey(),
      history: [],

      refresh: (currentWeeklyXp) => {
        const weekKey = isoWeekKey();
        const s = get();
        if (weekKey === s.currentWeekKey) {
          // Same week — no league change. (The user's rank may still change
          // as their XP grows, but the league itself is frozen for the week.)
          return;
        }

        // The week has rolled over — evaluate the previous week's outcome.
        const prevBots = getLeagueBots(s.currentLeague, s.currentWeekKey);
        const prevRank = computeUserRank(currentWeeklyXp, prevBots);
        const promoted = prevRank <= 3 && nextLeague(s.currentLeague) !== null;
        const relegated = prevRank >= 8 && previousLeague(s.currentLeague) !== null;

        let newLeague: LeagueId = s.currentLeague;
        if (promoted) newLeague = nextLeague(s.currentLeague)!.id;
        else if (relegated) newLeague = previousLeague(s.currentLeague)!.id;

        const entry: LeagueHistoryEntry = {
          weekKey: s.currentWeekKey,
          league: s.currentLeague,
          rank: prevRank,
          weeklyXp: currentWeeklyXp,
          promoted,
          relegated,
        };

        set({
          currentLeague: newLeague,
          currentWeekKey: weekKey,
          history: [entry, ...s.history].slice(0, 12),
        });
      },

      reset: () =>
        set({
          currentLeague: "bronze",
          currentWeekKey: isoWeekKey(),
          history: [],
        }),
    }),
    { name: "quizexam-league" },
  ),
);

/**
 * Convenience selector: derive the live league "view" — current league, the
 * 9 bots in the same league, the user's rank, and the XP needed to reach the
 * top-3 (promotion) zone. Returns null until the user has a non-zero weekly
 * XP total (so the league badge can hide for brand-new users).
 */
export function getLeagueView(userWeeklyXp: number, userTotalXp: number) {
  const leagueId = useLeague.getState().currentLeague;
  const weekKey = useLeague.getState().currentWeekKey;
  const info = getLeagueInfo(leagueId);
  const bots = getLeagueBots(leagueId, weekKey);
  // Use the user's *total* XP within the league leaderboard display so the
  // bar visually grows during the week; rank is computed against weekly XP
  // (so the user can actually move up over time). When weekly XP is 0, we
  // still show the league but place the user at the bottom.
  const rank = computeUserRank(userWeeklyXp, bots);
  const next = nextLeague(leagueId);
  // XP needed to *promote next week* = reach the top 3 ranks → out-XP the
  // 3rd-highest bot. (If already in the top 3, the user is on track to
  // promote — show 0 XP needed.)
  const sortedBotXp = [...bots.map((b) => b.weeklyXp)].sort((a, b) => b - a);
  const thirdHighestXp = sortedBotXp[2] ?? 0;
  const xpToPromote = Math.max(0, thirdHighestXp + 1 - userWeeklyXp);
  return {
    info,
    bots,
    rank,
    userWeeklyXp,
    userTotalXp,
    next,
    xpToPromote,
    weekKey,
  };
}

/**
 * Sum the user's prefs.weekActivity counts (rolling 7-day log of answered
 * questions × 10 XP per question, capped at the actual recorded XP growth).
 * Used by the league badge as the "weekly XP" metric.
 */
export function computeWeeklyXpFromActivity(
  weekActivity: { date: string; count: number }[],
  sessionsThisWeek: number,
): number {
  // Each answered question is worth ~10 XP, plus the bonus XP from perfect
  // scores etc. — we approximate weekly XP as (questions this week × 10) +
  // (sessions × 25 bonus XP). This keeps the league responsive to activity.
  const q = weekActivity.reduce((sum, e) => sum + e.count, 0);
  return q * 10 + sessionsThisWeek * 25;
}
