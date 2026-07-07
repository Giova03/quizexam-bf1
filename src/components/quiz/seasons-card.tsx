"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  useSeasons,
  getSeasonView,
  TIER_META,
  type TrophyTier,
} from "@/lib/seasons";
import { usePrefs } from "@/lib/prefs-store";
import { Trophy, CalendarClock, Crown, Medal, Award, Hourglass } from "lucide-react";

/**
 * SeasonsCard — dashboard widget showing the current monthly season:
 *   • season name + countdown to season end
 *   • user's current rank within the season (vs. 19 simulated players)
 *   • projected trophy tier (gold/silver/bronze if rank ≤ 3)
 *   • past trophies (last 6)
 *
 * Backed by the persisted seasons store (localStorage). The GamificationBridge
 * calls `useSeasons.refresh(totalXp)` on mount + whenever the user's total XP
 * changes, which snapshots the season baseline XP and (on month rollover)
 * awards trophies.
 */

function msToHuman(ms: number): string {
  if (ms <= 0) return "terminé";
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  if (days > 0) return `${days}j ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

const TIER_ICON: Record<TrophyTier, typeof Crown> = {
  gold: Crown,
  silver: Medal,
  bronze: Award,
};

/** Re-render every minute so the countdown stays fresh. */
function useTick(intervalMs: number) {
  const [, setN] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setN((x) => x + 1), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
}

export function SeasonsCard() {
  const seasonStartXp = useSeasons((s) => s.seasonStartXp);
  const trophies = useSeasons((s) => s.trophies);
  const currentSeasonKey = useSeasons((s) => s.currentSeasonKey);
  const totalXp = usePrefs((s) => s.xp);

  useTick(60_000);

  const view = useMemo(
    () => getSeasonView(seasonStartXp, totalXp, currentSeasonKey !== ""),
    [seasonStartXp, totalXp, currentSeasonKey],
  );

  const { season, seasonXp, rank, tier, countdownMs } = view;
  const totalPlayers = 20; // 19 simulated bots + the user.
  const rankPct = Math.max(
    0,
    Math.min(100, ((totalPlayers - rank + 1) / totalPlayers) * 100),
  );

  return (
    <Card className="relative overflow-hidden border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 via-violet-50 to-sky-50 p-5 dark:border-fuchsia-900/40 dark:from-fuchsia-950/30 dark:via-violet-950/30 dark:to-sky-950/30">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-fuchsia-400/20 blur-2xl"
      />
      <div className="relative flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-fuchsia-500 text-white">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold">{season.seasonName}</h3>
            <p className="text-[11px] text-muted-foreground">
              Saison mensuelle · classement sur {totalPlayers} joueurs
            </p>
          </div>
        </div>
        <Badge variant="outline" className="gap-1 bg-card/70 tabular-nums">
          <CalendarClock className="h-3 w-3 text-fuchsia-600" />
          {msToHuman(countdownMs)}
        </Badge>
      </div>

      <div className="relative mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-card/80 p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Votre rang
          </p>
          <p className="flex items-baseline gap-1 text-2xl font-bold tabular-nums">
            #{rank}
            <span className="text-xs font-normal text-muted-foreground">
              /{totalPlayers}
            </span>
          </p>
          <Progress value={rankPct} className="mt-2 h-1.5" />
        </div>
        <div className="rounded-xl bg-card/80 p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            XP cette saison
          </p>
          <p className="text-2xl font-bold tabular-nums">{seasonXp}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {tier ? (
              <span className="flex items-center gap-1">
                Trophée projeté :
                <span className="font-semibold">
                  {TIER_META[tier].emoji} {TIER_META[tier].label}
                </span>
              </span>
            ) : (
              <span>Top 3 requis pour un trophée</span>
            )}
          </p>
        </div>
      </div>

      {/* Past trophies */}
      {trophies.length > 0 && (
        <div className="relative mt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Trophées passés
          </p>
          <div className="custom-scroll flex max-h-24 gap-2 overflow-y-auto pr-1">
            {trophies.slice(0, 6).map((t, i) => {
              const meta = TIER_META[t.tier];
              const Icon = TIER_ICON[t.tier];
              return (
                <div
                  key={`${t.seasonKey}-${i}`}
                  className={`flex shrink-0 items-center gap-2 rounded-lg border ${meta.border} bg-card/80 px-2.5 py-1.5`}
                  title={`${t.seasonName} — rang #${t.rank} · ${t.xp} XP`}
                >
                  <Icon className={`h-4 w-4 ${meta.text}`} />
                  <div className="leading-tight">
                    <p className="text-[11px] font-semibold">
                      {t.seasonName.replace("Saison ", "")}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      #{t.rank} · {t.xp} XP
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="relative mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Hourglass className="h-3 w-3" />
        <span>
          Les trophées sont décernés aux 3 meilleurs joueurs à la fin de
          chaque mois.
        </span>
      </div>
    </Card>
  );
}
