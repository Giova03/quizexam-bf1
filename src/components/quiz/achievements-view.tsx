"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePrefs, getBadgeProgress, type Badge as BadgeType } from "@/lib/prefs-store";
import { useQuizStore } from "@/lib/quiz-store";
import {
  Trophy,
  Lock,
  ArrowLeft,
  Award,
  CheckCircle2,
  CalendarDays,
  Sparkles,
} from "lucide-react";
import * as LucideIcons from "lucide-react";

/** Accent color classes used to render unlocked badges. */
const COLOR_STYLES: Record<
  string,
  { bg: string; text: string; border: string; ring: string }
> = {
  emerald: {
    bg: "bg-emerald-100 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-300 dark:border-emerald-800",
    ring: "ring-emerald-400",
  },
  amber: {
    bg: "bg-amber-100 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-300 dark:border-amber-800",
    ring: "ring-amber-400",
  },
  rose: {
    bg: "bg-rose-100 dark:bg-rose-950/40",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-300 dark:border-rose-800",
    ring: "ring-rose-400",
  },
  violet: {
    bg: "bg-violet-100 dark:bg-violet-950/40",
    text: "text-violet-700 dark:text-violet-300",
    border: "border-violet-300 dark:border-violet-800",
    ring: "ring-violet-400",
  },
  sky: {
    bg: "bg-sky-100 dark:bg-sky-950/40",
    text: "text-sky-700 dark:text-sky-300",
    border: "border-sky-300 dark:border-sky-800",
    ring: "ring-sky-400",
  },
  teal: {
    bg: "bg-teal-100 dark:bg-teal-950/40",
    text: "text-teal-700 dark:text-teal-300",
    border: "border-teal-300 dark:border-teal-800",
    ring: "ring-teal-400",
  },
};

function getColor(name?: string) {
  return (name && COLOR_STYLES[name]) || COLOR_STYLES.emerald;
}

/** Resolve a lucide icon by name. Falls back to Award if not found. */
function Icon({ name, className }: { name: string; className?: string }) {
  const IconCmp =
    (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name] ??
    LucideIcons.Award;
  return <IconCmp className={className} />;
}

type FilterValue = "all" | "unlocked" | "locked";

export function AchievementsView() {
  const goHome = useQuizStore((s) => s.goHome);
  const badges = usePrefs((s) => s.badges);
  const prefs = usePrefs();
  const [filter, setFilter] = useState<FilterValue>("all");

  // Compute live progress for each badge (so progress bars reflect the
  // current state, not just the unlocked/locked status).
  const badgesWithProgress = useMemo(() => {
    return badges.map((b: BadgeType) => {
      const progress = getBadgeProgress(b.id, prefs);
      return { ...b, progress };
    });
  }, [badges, prefs]);

  const filtered = useMemo(() => {
    if (filter === "unlocked") return badgesWithProgress.filter((b) => b.unlocked);
    if (filter === "locked") return badgesWithProgress.filter((b) => !b.unlocked);
    return badgesWithProgress;
  }, [badgesWithProgress, filter]);

  const unlockedCount = badges.filter((b) => b.unlocked).length;
  const totalCount = badges.length;
  const overallPct =
    totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        className="gap-2"
        onClick={() => goHome()}
      >
        <ArrowLeft className="h-4 w-4" />
        Retour à l&apos;accueil
      </Button>

      {/* Header */}
      <Card className="overflow-hidden border-amber-200 dark:border-amber-800">
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-6 text-white">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
              <Trophy className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold">Succès &amp; Badges</h1>
              <p className="mt-1 text-sm text-white/90">
                Débloquez {totalCount} badges en progressant sur la plateforme.
                Chaque succès marque une étape de votre apprentissage.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge className="border-white/30 bg-white/20 text-white">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  {unlockedCount} / {totalCount} débloqués
                </Badge>
                <Badge className="border-white/30 bg-white/20 text-white">
                  <Sparkles className="mr-1 h-3 w-3" />
                  {overallPct}% complété
                </Badge>
              </div>
              <div className="mt-3">
                <Progress
                  value={overallPct}
                  className="h-2 bg-white/20 [&>div]:bg-white"
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Filter tabs */}
      <Tabs
        value={filter}
        onValueChange={(v) => setFilter(v as FilterValue)}
      >
        <TabsList className="grid w-full grid-cols-3 sm:max-w-md">
          <TabsTrigger value="all">Tous ({totalCount})</TabsTrigger>
          <TabsTrigger value="unlocked">
            Débloqués ({unlockedCount})
          </TabsTrigger>
          <TabsTrigger value="locked">
            Verrouillés ({totalCount - unlockedCount})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Badges grid */}
      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <Award className="h-12 w-12 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            {filter === "unlocked"
              ? "Aucun badge débloqué pour le moment. Continuez à jouer !"
              : "Tous les badges sont déjà débloqués. Bravo !"}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((badge) => {
            const color = getColor(badge.color);
            const pct =
              badge.progress && badge.progress.target > 0
                ? Math.min(
                    100,
                    Math.round(
                      (badge.progress.current / badge.progress.target) * 100
                    )
                  )
                : 0;
            return (
              <Card
                key={badge.id}
                className={`relative flex flex-col gap-3 p-5 transition-all ${
                  badge.unlocked
                    ? `${color.border} ${color.bg}`
                    : "border-border bg-muted/30 opacity-70 grayscale"
                }`}
              >
                {/* Icon + status */}
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                      badge.unlocked
                        ? `${color.bg} ${color.text}`
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {badge.unlocked ? (
                      <Icon name={badge.icon} className="h-6 w-6" />
                    ) : (
                      <Lock className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3
                      className={`font-bold leading-tight ${
                        badge.unlocked ? color.text : "text-foreground"
                      }`}
                    >
                      {badge.label}
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {badge.description}
                    </p>
                  </div>
                  {badge.unlocked && (
                    <CheckCircle2
                      className={`h-5 w-5 shrink-0 ${color.text}`}
                    />
                  )}
                </div>

                {/* Progress bar (if applicable) */}
                {badge.progress && !badge.unlocked && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground">
                      <span>
                        {badge.progress.current} / {badge.progress.target}
                      </span>
                      <span>{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </div>
                )}

                {/* Unlock date (if unlocked) */}
                {badge.unlocked && badge.unlockedAt && (
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <CalendarDays className="h-3 w-3" />
                    <span>
                      Débloqué le{" "}
                      {new Date(badge.unlockedAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
