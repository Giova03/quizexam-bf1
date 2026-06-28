"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  Calendar,
  CalendarDays,
  CalendarRange,
  Users,
  Flame,
  AlertCircle,
  Clock,
  Trophy,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

interface AnalyticsData {
  engagement: {
    sessionsToday: number;
    sessionsThisWeek: number;
    sessionsThisMonth: number;
    avgSessionsPerUser: number;
    totalSessions: number;
    totalUsers: number;
  };
  failedQuestions: Array<{ questionText: string; failures: number }>;
  heatmap: number[][]; // 7 rows x 24 cols
  topUsers: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    sessionCount: number;
  }>;
  generatedAt: string;
}

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

/**
 * Returns the weekday labels for the last 7 days (oldest first, today last).
 * Each label is the abbreviated French weekday + day-of-month.
 */
function getDayLabels(): string[] {
  const labels: string[] = [];
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  for (let i = 6; i >= 0; i--) {
    const d = new Date(startOfToday);
    d.setDate(d.getDate() - i);
    const weekdayIdx = (d.getDay() + 6) % 7; // 0 = Mon
    labels.push(`${DAYS[weekdayIdx]} ${d.getDate()}`);
  }
  return labels;
}

function getHeatColor(value: number, max: number): string {
  if (value === 0) return "bg-muted/40";
  const ratio = max > 0 ? value / max : 0;
  if (ratio > 0.75) return "bg-emerald-600";
  if (ratio > 0.5) return "bg-emerald-500";
  if (ratio > 0.25) return "bg-emerald-400";
  if (ratio > 0.1) return "bg-emerald-300 dark:bg-emerald-700";
  return "bg-emerald-200 dark:bg-emerald-800";
}

function KpiCard({
  icon: Icon,
  label,
  value,
  color,
  sub,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: number | string;
  color: string;
  sub?: string;
}) {
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40",
    violet: "text-violet-600 bg-violet-50 dark:bg-violet-950/40",
    amber: "text-amber-600 bg-amber-50 dark:bg-amber-950/40",
    sky: "text-sky-600 bg-sky-50 dark:bg-sky-950/40",
    rose: "text-rose-600 bg-rose-50 dark:bg-rose-950/40",
    teal: "text-teal-600 bg-teal-50 dark:bg-teal-950/40",
  };
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${
            colorMap[color] ?? colorMap.emerald
          }`}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {sub && <p className="mt-1 text-[10px] text-muted-foreground/70">{sub}</p>}
    </Card>
  );
}

export function AdminAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/analytics");
      if (!res.ok) throw new Error("Erreur de chargement");
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
      toast.error("Impossible de charger les analytics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="flex flex-col items-center gap-3 p-12 text-center">
        <AlertCircle className="h-10 w-10 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          Impossible de charger les données analytics.
        </p>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          Réessayer
        </Button>
      </Card>
    );
  }

  const { engagement, failedQuestions, heatmap, topUsers } = data;
  const dayLabels = getDayLabels();

  // Heatmap max for color scaling
  let heatmapMax = 0;
  for (const row of heatmap) {
    for (const v of row) {
      if (v > heatmapMax) heatmapMax = v;
    }
  }

  // Hour labels (every 3 hours for compactness)
  const hourLabels = Array.from({ length: 24 }, (_, h) => h);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            Analytics avancées
          </h2>
          <p className="text-sm text-muted-foreground">
            Indicateurs d&apos;engagement, questions les plus échouées, activité
            et top contributeurs.
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>

      {/* === KPI Cards === */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Calendar}
          label="Sessions aujourd'hui"
          value={engagement.sessionsToday}
          color="emerald"
        />
        <KpiCard
          icon={CalendarDays}
          label="Sessions cette semaine"
          value={engagement.sessionsThisWeek}
          color="violet"
        />
        <KpiCard
          icon={CalendarRange}
          label="Sessions ce mois"
          value={engagement.sessionsThisMonth}
          color="amber"
        />
        <KpiCard
          icon={Users}
          label="Moy. sessions / utilisateur"
          value={engagement.avgSessionsPerUser}
          color="sky"
          sub={`${engagement.totalSessions} sessions · ${engagement.totalUsers} utilisateurs`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* === Most failed questions === */}
        <Card className="overflow-hidden">
          <div className="border-b px-5 py-4">
            <h3 className="flex items-center gap-2 font-semibold">
              <AlertCircle className="h-4 w-4 text-rose-600" />
              Questions les plus échouées
            </h3>
            <p className="text-sm text-muted-foreground">
              Top 20 des questions avec le plus de mauvaises réponses
            </p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {failedQuestions.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                Aucune réponse incorrecte enregistrée pour le moment.
              </p>
            ) : (
              <div className="divide-y">
                {failedQuestions.map((q, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 px-5 py-3"
                  >
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-100 text-xs font-bold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                      {idx + 1}
                    </span>
                    <p className="min-w-0 flex-1 text-sm leading-relaxed">
                      {q.questionText}
                    </p>
                    <Badge
                      variant="outline"
                      className="shrink-0 border-rose-300 text-rose-700 dark:border-rose-800 dark:text-rose-300"
                    >
                      {q.failures} échec{q.failures > 1 ? "s" : ""}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* === Top active users === */}
        <Card className="overflow-hidden">
          <div className="border-b px-5 py-4">
            <h3 className="flex items-center gap-2 font-semibold">
              <Trophy className="h-4 w-4 text-amber-600" />
              Top 10 utilisateurs actifs
            </h3>
            <p className="text-sm text-muted-foreground">
              Classés par nombre de sessions
            </p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {topUsers.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                Aucune session utilisateur enregistrée.
              </p>
            ) : (
              <div className="divide-y">
                {topUsers.map((u, idx) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 px-5 py-3"
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                        idx === 0
                          ? "bg-gradient-to-br from-amber-400 to-orange-500"
                          : idx === 1
                          ? "bg-gradient-to-br from-slate-400 to-slate-500"
                          : idx === 2
                          ? "bg-gradient-to-br from-orange-400 to-amber-600"
                          : "bg-gradient-to-br from-emerald-500 to-teal-600"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{u.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {u.email}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary" className="font-bold">
                        {u.sessionCount} session{u.sessionCount > 1 ? "s" : ""}
                      </Badge>
                      <p className="mt-1 text-[10px] text-muted-foreground/70">
                        {u.role}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* === Activity heatmap === */}
      <Card className="overflow-hidden">
        <div className="border-b px-5 py-4">
          <h3 className="flex items-center gap-2 font-semibold">
            <Flame className="h-4 w-4 text-orange-600" />
            Heatmap d&apos;activité (7 jours × 24 heures)
          </h3>
          <p className="text-sm text-muted-foreground">
            Chaque cellule représente le nombre de sessions démarrées à cette
            heure. Plus la cellule est foncée, plus l&apos;activité est élevée.
          </p>
        </div>
        <div className="p-5">
          {/* Heatmap grid */}
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              {/* Hour labels header */}
              <div className="mb-1 flex items-center">
                <div className="w-14 shrink-0 text-right pr-2 text-[10px] text-muted-foreground">
                  Heure
                </div>
                <div className="flex flex-1 gap-0.5">
                  {hourLabels.map((h) => (
                    <div
                      key={h}
                      className="flex-1 text-center text-[10px] text-muted-foreground"
                    >
                      {h % 3 === 0 ? `${h}h` : ""}
                    </div>
                  ))}
                </div>
              </div>
              {/* Rows */}
              {heatmap.map((row, dayIdx) => (
                <div key={dayIdx} className="mb-0.5 flex items-center">
                  <div className="w-14 shrink-0 pr-2 text-right text-[10px] font-medium text-muted-foreground">
                    {dayLabels[dayIdx]}
                  </div>
                  <div className="flex flex-1 gap-0.5">
                    {row.map((value, hourIdx) => (
                      <div
                        key={hourIdx}
                        title={`${dayLabels[dayIdx]} à ${hourIdx}h · ${value} session${value > 1 ? "s" : ""}`}
                        className={`group relative h-6 flex-1 cursor-default rounded-sm transition-all hover:ring-2 hover:ring-emerald-400 hover:ring-offset-1 ${getHeatColor(
                          value,
                          heatmapMax
                        )}`}
                      >
                        {value > 0 && (
                          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white">
                            {value}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>Moins actif</span>
              <div className="flex gap-0.5">
                <div className="h-4 w-4 rounded-sm bg-muted/40" />
                <div className="h-4 w-4 rounded-sm bg-emerald-200 dark:bg-emerald-800" />
                <div className="h-4 w-4 rounded-sm bg-emerald-300 dark:bg-emerald-700" />
                <div className="h-4 w-4 rounded-sm bg-emerald-400" />
                <div className="h-4 w-4 rounded-sm bg-emerald-500" />
                <div className="h-4 w-4 rounded-sm bg-emerald-600" />
              </div>
              <span>Plus actif</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Pic d&apos;activité:{" "}
              <span className="font-semibold text-emerald-600">
                {heatmapMax} session{heatmapMax > 1 ? "s" : ""} / heure
              </span>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
