"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Seasonal trophies system (E4 — gamification).
 *
 * Monthly seasons: each calendar month is a "season". At the end of the
 * month, the top-3 users (by season XP) receive a gold/silver/bronze trophy.
 *
 * Since this is a local-only client (no central leaderboard), we:
 *   1. Track the user's "season XP" — the XP they earned during the current
 *      season (month). We approximate this by reading the prefs.weekActivity
 *      log + recording season-start XP snapshots.
 *   2. Simulate 19 other "players" per season (deterministic by season key)
 *      so the user has a relative rank.
 *   3. On season rollover, evaluate the user's trophy and add it to the
 *      history.
 *
 * Trophies are persisted in localStorage and surfaced in the UI.
 */

export type TrophyTier = "gold" | "silver" | "bronze";

export interface Trophy {
  /** "YYYY-MM" — the month this trophy was earned. */
  seasonKey: string;
  /** Human-readable season name (e.g. "Saison Janvier 2025"). */
  seasonName: string;
  tier: TrophyTier;
  /** The user's rank within the season (1, 2, or 3). */
  rank: number;
  /** XP earned during the season. */
  xp: number;
  /** ISO timestamp the trophy was awarded. */
  awardedAt: string;
}

export interface SeasonInfo {
  /** "YYYY-MM" — the current season key. */
  seasonKey: string;
  /** Human-readable season name. */
  seasonName: string;
  /** Date the season started (1st of the month at 00:00 local). */
  startedAt: Date;
  /** Date the season ends (1st of next month at 00:00 local). */
  endsAt: Date;
}

interface SimulatedPlayer {
  name: string;
  xp: number;
}

interface SeasonsState {
  /** "YYYY-MM" of the season currently being tracked. */
  currentSeasonKey: string;
  /** XP the user had at the start of the current season (snapshot). */
  seasonStartXp: number;
  /** Past trophies (most recent first). */
  trophies: Trophy[];

  /**
   * Recompute the season state for the current month. If the month has
   * rolled over since the last call, evaluate the previous season's trophy
   * (if any), award it, then snapshot the new season's starting XP.
   *
   * @param currentTotalXp The user's current total XP (from prefs.xp).
   */
  refresh: (currentTotalXp: number) => void;

  /** Hard reset (debug only). */
  reset: () => void;
}

const MONTH_NAMES_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function currentSeasonKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function seasonNameFromKey(key: string): string {
  const [y, m] = key.split("-").map(Number);
  if (!y || !m) return `Saison ${key}`;
  return `Saison ${MONTH_NAMES_FR[m - 1]} ${y}`;
}

/** Return the start (1st of month 00:00 local) and end (1st of next month) of the given season key. */
function seasonRange(key: string): { startedAt: Date; endsAt: Date } {
  const [y, m] = key.split("-").map(Number);
  const startedAt = new Date(y, m - 1, 1, 0, 0, 0, 0);
  const endsAt = new Date(y, m, 1, 0, 0, 0, 0);
  return { startedAt, endsAt };
}

export function getCurrentSeason(): SeasonInfo {
  const key = currentSeasonKey();
  const { startedAt, endsAt } = seasonRange(key);
  return {
    seasonKey: key,
    seasonName: seasonNameFromKey(key),
    startedAt,
    endsAt,
  };
}

/**
 * Milliseconds remaining until the current season ends.
 */
export function getSeasonCountdownMs(): number {
  const { endsAt } = seasonRange(currentSeasonKey());
  return Math.max(0, endsAt.getTime() - Date.now());
}

/**
 * Deterministic pseudo-random generator (mulberry32) from a string seed.
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

const SEASON_PLAYER_NAMES = [
  "Aïcha", "Moussa", "Fatou", "Ibrahim", "Awa", "Salif",
  "Kadiatou", "Boubacar", "Rasmané", "Mariam", "Adama", "Aminata",
  "Seydou", "Bintou", "Yacouba", "Nadège", "Ousmane", "Pierrette",
  "Karim", "Suzanne", "Drissa", "Hélène", "Bakary", "Christine",
];

/**
 * Generate 19 simulated opponent players for the given season. Each player's
 * XP is distributed across a wide range so the user has a fighting chance to
 * reach top 3 with consistent activity.
 */
export function getSeasonPlayers(seasonKey: string): SimulatedPlayer[] {
  const rng = seededRng(seasonKey);
  const players: SimulatedPlayer[] = [];
  const count = 19;
  for (let i = 0; i < count; i++) {
    // Most players land in the 200-2000 XP range; a few "whales" reach 3000+.
    const whale = rng() < 0.15;
    const xp = whale
      ? Math.round(1500 + rng() * 2500)
      : Math.round(50 + rng() * 1800);
    players.push({
      name:
        SEASON_PLAYER_NAMES[
          (i + Math.floor(rng() * SEASON_PLAYER_NAMES.length)) %
            SEASON_PLAYER_NAMES.length
        ] +
        " " +
        String.fromCharCode(65 + Math.floor(rng() * 26)) +
        ".",
      xp,
    });
  }
  return players;
}

/**
 * Compute the user's rank (1-indexed) within the current season given the
 * XP they earned this season.
 */
export function computeSeasonRank(
  userSeasonXp: number,
  players: SimulatedPlayer[],
): number {
  const all = [
    ...players.map((p) => ({ name: p.name, xp: p.xp })),
    { name: "Vous", xp: userSeasonXp },
  ];
  all.sort((a, b) => b.xp - a.xp || a.name.localeCompare(b.name));
  return all.findIndex((p) => p.name === "Vous") + 1;
}

/**
 * Determine which trophy tier (if any) the user earned this season.
 */
export function rankToTier(rank: number): TrophyTier | null {
  if (rank === 1) return "gold";
  if (rank === 2) return "silver";
  if (rank === 3) return "bronze";
  return null;
}

export const useSeasons = create<SeasonsState>()(
  persist(
    (set, get) => ({
      currentSeasonKey: currentSeasonKey(),
      seasonStartXp: 0,
      trophies: [],

      refresh: (currentTotalXp) => {
        const key = currentSeasonKey();
        const s = get();

        // First-ever call: snapshot the current XP as the season baseline so
        // seasonXp grows from 0 forward. (Without this, seasonXp would be
        // inflated by all the user's lifetime XP on the first render.)
        if (s.trophies.length === 0 && s.seasonStartXp === 0 && s.currentSeasonKey === key) {
          set({ seasonStartXp: currentTotalXp });
          return;
        }

        if (key === s.currentSeasonKey) {
          return; // Same season — no change.
        }

        // Season rolled over — evaluate previous season.
        const seasonXp = Math.max(0, currentTotalXp - s.seasonStartXp);
        const players = getSeasonPlayers(s.currentSeasonKey);
        const rank = computeSeasonRank(seasonXp, players);
        const tier = rankToTier(rank);
        const newTrophies: Trophy[] = [...s.trophies];
        if (tier) {
          newTrophies.unshift({
            seasonKey: s.currentSeasonKey,
            seasonName: seasonNameFromKey(s.currentSeasonKey),
            tier,
            rank,
            xp: seasonXp,
            awardedAt: new Date().toISOString(),
          });
        }
        set({
          currentSeasonKey: key,
          seasonStartXp: currentTotalXp,
          trophies: newTrophies.slice(0, 24),
        });
      },

      reset: () =>
        set({
          currentSeasonKey: currentSeasonKey(),
          seasonStartXp: 0,
          trophies: [],
        }),
    }),
    { name: "quizexam-seasons" },
  ),
);

/**
 * Convenience view: derive the live "season view" — current season info,
 * the user's season XP, rank, and tier. Returns null before the season
 * snapshot is established (i.e. on first ever mount, when seasonStartXp is
 * uninitialized — we lazily set it on the first refresh call).
 */
export function getSeasonView(
  seasonStartXp: number,
  userTotalXp: number,
  hasSnapshot: boolean,
) {
  const season = getCurrentSeason();
  const seasonXp = Math.max(0, userTotalXp - seasonStartXp);
  const players = getSeasonPlayers(season.seasonKey);
  const rank = computeSeasonRank(seasonXp, players);
  const tier = rankToTier(rank);
  const countdownMs = getSeasonCountdownMs();
  return {
    season,
    seasonXp,
    players,
    rank,
    tier,
    countdownMs,
    hasSnapshot,
  };
}

/** Tier metadata for rendering. */
export const TIER_META: Record<
  TrophyTier,
  { label: string; emoji: string; gradient: string; text: string; border: string }
> = {
  gold: {
    label: "Or",
    emoji: "🏆",
    gradient: "from-yellow-400 to-amber-500",
    text: "text-yellow-600 dark:text-yellow-400",
    border: "border-yellow-400 dark:border-yellow-600",
  },
  silver: {
    label: "Argent",
    emoji: "🥈",
    gradient: "from-slate-300 to-slate-500",
    text: "text-slate-600 dark:text-slate-300",
    border: "border-slate-400 dark:border-slate-600",
  },
  bronze: {
    label: "Bronze",
    emoji: "🥉",
    gradient: "from-amber-600 to-orange-700",
    text: "text-amber-700 dark:text-amber-500",
    border: "border-amber-600 dark:border-amber-700",
  },
};
