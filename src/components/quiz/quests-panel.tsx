"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ScrollArea,
} from "@/components/ui/scroll-area";
import {
  useQuests,
  type Quest,
} from "@/lib/quests-store";
import {
  Sparkles,
  CalendarDays,
  CalendarClock,
  Clock,
  Gift,
  CheckCircle2,
  Lock,
  Flame,
  Star,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";

/**
 * QuestsPanel — shows the user's active daily / weekly / special quests.
 *
 * Used:
 *   • On the dashboard (compactCard prop → renders a self-contained Card).
 *   • As a standalone full-page view via openQuests() (renders a taller
 *     layout with sections + countdown header).
 *
 * Features:
 *   • Live progress bars per quest (re-evaluated every 30s + on every
 *     store mutation).
 *   • "Réclamer" button when progress >= target; turns into a "Réclamé"
 *     disabled state after claiming.
 *   • Countdown to the next daily refresh (local midnight) and the next
 *     weekly refresh (next Monday 00:00 local).
 */

function msToHhMm(ms: number): string {
  if (ms <= 0) return "00:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 24) {
    const d = Math.floor(h / 24);
    return `${d}j ${h % 24}h`;
  }
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function nextMidnightMs(): number {
  const now = new Date();
  const next = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    0,
  );
  return next.getTime() - now.getTime();
}

function nextMondayMs(): number {
  const now = new Date();
  const day = now.getDay(); // 0=Sun..6=Sat
  const daysUntilMonday = ((8 - day) % 7) || 7; // 1..7
  const next = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + daysUntilMonday,
    0,
    0,
    0,
    0,
  );
  return next.getTime() - now.getTime();
}

function QuestRow({
  quest,
  claimed,
  onClaim,
}: {
  quest: Quest;
  claimed: boolean;
  onClaim: (id: string) => void;
}) {
  const pct = Math.min(100, Math.round((quest.progress / quest.target) * 100));
  const isComplete = quest.progress >= quest.target;
  const rewardLabel = `+${quest.rewardXp} XP · +${quest.rewardCoins} 🪙`;

  return (
    <div
      className={`relative overflow-hidden rounded-xl border p-3 transition-all ${
        claimed
          ? "border-emerald-300 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/30"
          : isComplete
            ? "border-amber-300 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/30"
            : "border-border bg-card"
      }`}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold">{quest.title}</p>
            {claimed && (
              <Badge className="shrink-0 gap-1 bg-emerald-500 text-white hover:bg-emerald-500">
                <CheckCircle2 className="h-3 w-3" />
                Réclamé
              </Badge>
            )}
          </div>
          {quest.description && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {quest.description}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <Progress value={pct} className="h-1.5 flex-1" />
            <span className="shrink-0 text-[11px] font-medium tabular-nums text-muted-foreground">
              {Math.min(quest.progress, quest.target)}/{quest.target}
              {quest.unit ? ` ${quest.unit}` : ""}
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
            <Gift className="h-3 w-3" />
            <span className="font-medium">{rewardLabel}</span>
          </div>
        </div>
        <div className="shrink-0">
          {claimed ? (
            <Button
              size="sm"
              variant="ghost"
              disabled
              className="gap-1 text-emerald-600"
            >
              <CheckCircle2 className="h-4 w-4" />
            </Button>
          ) : isComplete ? (
            <Button
              size="sm"
              onClick={() => onClaim(quest.id)}
              className="gap-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-90"
            >
              <Gift className="h-3.5 w-3.5" />
              Réclamer
            </Button>
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Lock className="h-4 w-4" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  countdown,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  countdown?: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-bold">{title}</h3>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      {countdown && (
        <Badge variant="outline" className="gap-1 tabular-nums">
          <Clock className="h-3 w-3" />
          {countdown}
        </Badge>
      )}
    </div>
  );
}

interface QuestsPanelProps {
  /**
   * Compact mode renders a single Card (used on the dashboard overview).
   * Full mode renders the panel as a tall, scrollable layout (used as a
   * standalone view via the "Quêtes" nav entry).
   */
  compact?: boolean;
  /**
   * Optional callback when the user clicks a "Voir tout" link in compact
   * mode (typically opens the full quests view).
   */
  onSeeAll?: () => void;
}

export function QuestsPanel({ compact = false, onSeeAll }: QuestsPanelProps) {
  const dailyQuests = useQuests((s) => s.getDailyQuests()) ?? [];
  const weeklyQuests = useQuests((s) => s.getWeeklyQuests()) ?? [];
  const specialQuests = useQuests((s) => s.getSpecialQuests()) ?? [];
  const claimedIds = useQuests((s) => s.claimedIds);
  const claimReward = useQuests((s) => s.claimReward);

  // Tick every 30s so the countdown + progress stays fresh.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  // Force a re-render of the daily/weekly/special lists whenever the
  // underlying counters change. The selectors above already re-run on each
  // state mutation, but the tick above also drives countdown refreshes.
  void now;

  const dailyCountdown = useMemo(() => msToHhMm(nextMidnightMs()), [now]);
  const weeklyCountdown = useMemo(() => msToHhMm(nextMondayMs()), [now]);

  // Count completed-yet-unclaimed quests (drives the badge).
  const claimableCount = [...dailyQuests, ...weeklyQuests, ...specialQuests]
    .filter((q) => q.progress >= q.target && !claimedIds.includes(q.id))
    .length;

  function handleClaim(questId: string) {
    const quest = [...dailyQuests, ...weeklyQuests, ...specialQuests].find(
      (q) => q.id === questId,
    );
    claimReward(questId);
    if (quest) {
      toast.success(`Quête complétée : ${quest.title}`, {
        description: `+${quest.rewardXp} XP · +${quest.rewardCoins} QuizCoins`,
      });
    }
  }

  if (compact) {
    return (
      <Card className="p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Quêtes</h3>
              <p className="text-[11px] text-muted-foreground">
                Réclamez vos récompenses
              </p>
            </div>
          </div>
          {claimableCount > 0 && (
            <Badge className="gap-1 bg-amber-500 text-white hover:bg-amber-500">
              <Gift className="h-3 w-3" />
              {claimableCount} à réclamer
            </Badge>
          )}
        </div>

        <ScrollArea className="custom-scroll max-h-72 pr-2">
          <div className="mt-3 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Quotidiennes · reset dans {dailyCountdown}
            </p>
            {dailyQuests.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Aucune quête du jour.
              </p>
            ) : (
              dailyQuests.map((q) => (
                <QuestRow
                  key={q.id}
                  quest={q}
                  claimed={claimedIds.includes(q.id)}
                  onClaim={handleClaim}
                />
              ))
            )}
            <p className="pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Hebdomadaires · reset dans {weeklyCountdown}
            </p>
            {weeklyQuests.map((q) => (
              <QuestRow
                key={q.id}
                quest={q}
                claimed={claimedIds.includes(q.id)}
                onClaim={handleClaim}
              />
            ))}
          </div>
        </ScrollArea>

        {onSeeAll && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 w-full text-emerald-600 hover:text-emerald-700"
            onClick={onSeeAll}
          >
            Voir toutes les quêtes →
          </Button>
        )}
      </Card>
    );
  }

  // Full mode
  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="relative overflow-hidden border-amber-200 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-6 dark:border-amber-800/60 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-amber-950/40">
        <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-400/20 blur-2xl" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Quêtes & Défis</h2>
              <p className="text-xs text-muted-foreground">
                Complétez des quêtes pour gagner XP et QuizCoins.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1.5 bg-card/70 tabular-nums">
              <CalendarClock className="h-3.5 w-3.5 text-amber-600" />
              Reset quotidien · {dailyCountdown}
            </Badge>
            <Badge variant="outline" className="gap-1.5 bg-card/70 tabular-nums">
              <CalendarDays className="h-3.5 w-3.5 text-emerald-600" />
              Reset hebdo · {weeklyCountdown}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Daily quests */}
      <section className="space-y-3">
        <SectionHeader
          icon={<Flame className="h-4 w-4" />}
          title="Quêtes quotidiennes"
          subtitle="Réinitialisées chaque minuit (heure locale)"
          countdown={dailyCountdown}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          {dailyQuests.map((q) => (
            <QuestRow
              key={q.id}
              quest={q}
              claimed={claimedIds.includes(q.id)}
              onClaim={handleClaim}
            />
          ))}
        </div>
      </section>

      {/* Weekly quests */}
      <section className="space-y-3">
        <SectionHeader
          icon={<Star className="h-4 w-4" />}
          title="Quêtes hebdomadaires"
          subtitle="Réinitialisées chaque lundi"
          countdown={weeklyCountdown}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          {weeklyQuests.map((q) => (
            <QuestRow
              key={q.id}
              quest={q}
              claimed={claimedIds.includes(q.id)}
              onClaim={handleClaim}
            />
          ))}
        </div>
      </section>

      {/* Special quests */}
      <section className="space-y-3">
        <SectionHeader
          icon={<Trophy className="h-4 w-4" />}
          title="Quêtes spéciales"
          subtitle="Objectifs uniques — pas de réinitialisation"
        />
        <div className="grid gap-2 sm:grid-cols-2">
          {specialQuests.map((q) => (
            <QuestRow
              key={q.id}
              quest={q}
              claimed={claimedIds.includes(q.id)}
              onClaim={handleClaim}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
