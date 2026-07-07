"use client";

import { useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  useLeague,
  getLeagueView,
  LEAGUES,
  getLeagueInfo,
  type LeagueInfo,
} from "@/lib/league-system";
import { usePrefs } from "@/lib/prefs-store";
import {
  Trophy,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  Minus,
  Crown,
  Users,
  Sparkles,
} from "lucide-react";

/**
 * LeagueBadge — shows the user's current league + rank + XP needed to
 * promote. Two rendering modes:
 *   • compact (default): a small inline badge — for the header / dashboard
 *     top stats row.
 *   • full: a leaderboard-style card with the simulated league roster + the
 *     user's position highlighted.
 *
 * The league is recomputed on mount + whenever the user's prefs.weekActivity
 * changes (driven by GamificationBridge).
 */

interface LeagueBadgeProps {
  /** Compact inline badge (default) or full leaderboard card. */
  full?: boolean;
  /** Optional click handler (compact mode). */
  onClick?: () => void;
}

function RankIcon({ rank }: { rank: number }) {
  if (rank <= 3) return <Crown className="h-3 w-3 text-amber-500" />;
  if (rank >= 8) return <ArrowDown className="h-3 w-3 text-rose-500" />;
  return <Minus className="h-3 w-3 text-muted-foreground" />;
}

function LeagueEmoji({ league, className }: { league: LeagueInfo; className?: string }) {
  return <span className={className} aria-hidden>{league.emoji}</span>;
}

export function LeagueBadge({ full = false, onClick }: LeagueBadgeProps) {
  // Subscribe to league store so we re-render when currentLeague changes.
  const currentLeague = useLeague((s) => s.currentLeague);
  const currentWeekKey = useLeague((s) => s.currentWeekKey);
  const history = useLeague((s) => s.history);

  // Subscribe to prefs so we re-render when XP / activity changes.
  const weekActivity = usePrefs((s) => s.weekActivity);
  const sessionsCompleted = usePrefs((s) => s.sessionsCompleted);
  const totalXp = usePrefs((s) => s.xp);

  // Compute the user's weekly XP from prefs.
  const weeklyXp = useMemo(() => {
    const q = weekActivity.reduce((sum, e) => sum + e.count, 0);
    return q * 10 + sessionsCompleted * 25;
  }, [weekActivity, sessionsCompleted]);

  const view = useMemo(
    () => getLeagueView(weeklyXp, totalXp),
    [weeklyXp, totalXp, currentLeague, currentWeekKey],
  );

  if (!view) return null;
  const info = view.info;

  if (!full) {
    return (
      <button
        onClick={onClick}
        className={`group inline-flex items-center gap-1.5 rounded-full border ${info.border} ${info.bgSoft} ${info.text} px-3 py-1 text-xs font-semibold transition-all hover:scale-105`}
        aria-label={`Ligue : ${info.label}, rang ${view.rank}`}
      >
        <LeagueEmoji league={info} className="text-sm" />
        <span>{info.label}</span>
        <span className="rounded-full bg-foreground/10 px-1.5 py-0.5 text-[10px] tabular-nums">
          #{view.rank}
        </span>
      </button>
    );
  }

  // Full mode — leaderboard card
  const sortedRoster = [
    ...view.bots.map((b) => ({ name: b.name, avatar: b.avatar, xp: b.weeklyXp, isUser: false })),
    { name: "Vous", avatar: "V", xp: view.userWeeklyXp, isUser: true },
  ].sort((a, b) => b.xp - a.xp || a.name.localeCompare(b.name));

  const promoteZone = view.rank <= 3;
  const relegateZone = view.rank >= 8;
  const next = view.next;

  const lastEntry = history[0];

  return (
    <Card className={`relative overflow-hidden border-2 ${info.border}`}>
      {/* Gradient header */}
      <div className={`relative bg-gradient-to-br ${info.gradient} p-5 text-white`}>
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-2xl backdrop-blur">
              <LeagueEmoji league={info} />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider opacity-80">
                Ligue actuelle
              </p>
              <h3 className="text-xl font-bold">{info.label}</h3>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wider opacity-80">Rang</p>
            <p className="text-2xl font-bold tabular-nums">#{view.rank}</p>
            <p className="text-[11px] opacity-80">sur 10</p>
          </div>
        </div>
        <div className="relative mt-3 flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 backdrop-blur">
            <TrendingUp className="h-3 w-3" />
            <span className="font-semibold tabular-nums">{view.userWeeklyXp} XP cette semaine</span>
          </div>
          {promoteZone ? (
            <div className="flex items-center gap-1 rounded-full bg-emerald-500/90 px-2 py-0.5 backdrop-blur">
              <ArrowUp className="h-3 w-3" />
              <span className="font-semibold">Zone de promotion</span>
            </div>
          ) : relegateZone ? (
            <div className="flex items-center gap-1 rounded-full bg-rose-500/90 px-2 py-0.5 backdrop-blur">
              <ArrowDown className="h-3 w-3" />
              <span className="font-semibold">Zone de relégation</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 backdrop-blur">
              <Minus className="h-3 w-3" />
              <span className="font-semibold">Maintenu</span>
            </div>
          )}
        </div>
      </div>

      {/* Body: promotion progress + roster */}
      <div className="space-y-4 p-5">
        {next ? (
          <div>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                XP pour atteindre la zone de promotion
              </span>
              <span className="font-semibold tabular-nums">
                {view.xpToPromote > 0 ? `+${view.xpToPromote} XP` : "Atteinte ✓"}
              </span>
            </div>
            <Progress
              value={Math.max(0, Math.min(100, 100 - (view.xpToPromote / Math.max(1, view.userWeeklyXp + view.xpToPromote)) * 100))}
              className="h-2"
            />
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Fin de semaine : top 3 → <span className={`font-semibold ${next.text}`}>{next.emoji} {next.label}</span>
              {relegateZone && getLeagueInfo(currentLeague) && (
                <>
                  {" "}·{" "}
                  <span className="text-rose-600 dark:text-rose-400">
                    bas 3 → relégation
                  </span>
                </>
              )}
            </p>
          </div>
        ) : (
          <div className="rounded-lg bg-fuchsia-50 p-3 text-xs text-fuchsia-700 dark:bg-fuchsia-950/30 dark:text-fuchsia-300">
            <Crown className="mr-1 inline h-3 w-3" />
            Vous êtes dans la ligue la plus élevée — défendez votre rang !
          </div>
        )}

        {/* Roster */}
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Users className="h-3 w-3" />
            Classement de la ligue · semaine {view.weekKey}
          </div>
          <div className="custom-scroll max-h-72 overflow-y-auto pr-1">
            <ol className="space-y-1">
              {sortedRoster.map((entry, i) => {
                const rank = i + 1;
                const isTop3 = rank <= 3;
                const isBottom3 = rank >= 8;
                return (
                  <li
                    key={`${entry.name}-${i}`}
                    className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                      entry.isUser
                        ? "bg-emerald-50 ring-1 ring-emerald-300 dark:bg-emerald-950/40 dark:ring-emerald-700"
                        : ""
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold tabular-nums ${
                        isTop3
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                          : isBottom3
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {rank}
                    </span>
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${info.gradient} text-xs font-bold text-white`}
                    >
                      {entry.avatar}
                    </span>
                    <span className={`flex-1 truncate ${entry.isUser ? "font-semibold" : ""}`}>
                      {entry.name}
                      {entry.isUser && (
                        <Badge className="ml-1.5 bg-emerald-500 text-white hover:bg-emerald-500">
                          Vous
                        </Badge>
                      )}
                    </span>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                      {entry.xp} XP
                    </span>
                    <span className="shrink-0">
                      <RankIcon rank={rank} />
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        {/* Last week outcome */}
        {lastEntry && (
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Trophy className="h-3 w-3" />
              <span className="font-semibold">Semaine {lastEntry.weekKey}</span>
            </div>
            <p className="mt-1">
              Ligue <span className="font-semibold">{getLeagueInfo(lastEntry.league).label}</span>{" "}
              · rang #{lastEntry.rank} · {lastEntry.weeklyXp} XP{" "}
              {lastEntry.promoted && (
                <Badge className="ml-1 gap-1 bg-emerald-500 text-white hover:bg-emerald-500">
                  <ArrowUp className="h-3 w-3" /> Promu
                </Badge>
              )}
              {lastEntry.relegated && (
                <Badge className="ml-1 gap-1 bg-rose-500 text-white hover:bg-rose-500">
                  <ArrowDown className="h-3 w-3" /> Relégué
                </Badge>
              )}
              {!lastEntry.promoted && !lastEntry.relegated && (
                <Badge variant="outline" className="ml-1 gap-1">
                  <Minus className="h-3 w-3" /> Maintenu
                </Badge>
              )}
            </p>
          </div>
        )}

        {/* League ladder */}
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Échelle des ligues
          </p>
          <div className="flex flex-wrap gap-1">
            {LEAGUES.map((l) => (
              <Badge
                key={l.id}
                variant="outline"
                className={`gap-1 ${l.id === currentLeague ? `${l.border} ${l.bgSoft} ${l.text}` : "opacity-60"}`}
              >
                <span>{l.emoji}</span>
                {l.label}
                <span className="opacity-70">· ≥ {l.minWeeklyXp} XP/sem</span>
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

/** Convenience hook: refresh the league store on mount. */
export function useLeagueRefreshOnMount() {
  const refresh = useLeague((s) => s.refresh);
  const weekActivity = usePrefs((s) => s.weekActivity);
  const sessionsCompleted = usePrefs((s) => s.sessionsCompleted);
  useEffect(() => {
    const q = weekActivity.reduce((sum, e) => sum + e.count, 0);
    const weeklyXp = q * 10 + sessionsCompleted * 25;
    refresh(weeklyXp);
  }, [refresh, weekActivity, sessionsCompleted]);
}
