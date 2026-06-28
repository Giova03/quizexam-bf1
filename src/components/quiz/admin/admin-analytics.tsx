"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  CalendarDays,
  TrendingUp,
  AlertTriangle,
  Users2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

interface AnalyticsData {
  sessionsToday: number;
  sessionsWeek: number;
  sessionsMonth: number;
  topFailedQuestions: Array<{
    questionId: string;
    questionText: string;
    correctAnswer: string;
    failedCount: number;
    totalAnswers: number;
    failureRate: number;
  }>;
  heatmap: {
    days: string[];
    hours: number[];
    data: number[][];
  };
  topUsers: Array<{
    userId: string;
    name: string;
    email: string;
    sessions: number;
    avgScore: number;
  }>;
}

const HOUR_LABELS = [
  "0h", "2h", "4h", "6h", "8h", "10h",
  "12h", "14h", "16h", "18h", "20h", "22h",
];

export function AdminAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/analytics");
      if (res.ok) {
        setData(await res.json());
      } else {
        toast.error("Erreur lors du chargement des analytics");
      }
    } catch (e) {
      console.error(e);
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="p-12 text-center text-sm text-muted-foreground">
        Impossible de charger les analytics.
      </Card>
    );
  }

  const maxHeat = Math.max(1, ...data.heatmap.data.flat());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            Analytics avancé
          </h2>
          <p className="text-sm text-muted-foreground">
            Activité en temps réel sur la plateforme.
          </p>
        </div>
        <button
          onClick={load}
          className="rounded-md p-2 text-muted-foreground hover:bg-muted"
          aria-label="Rafraîchir"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Aujourd&apos;hui</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600">
                {data.sessionsToday}
              </p>
              <p className="text-[10px] text-muted-foreground">sessions terminées</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
              <Activity className="h-5 w-5" />
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">7 derniers jours</p>
              <p className="mt-1 text-2xl font-bold text-sky-600">
                {data.sessionsWeek}
              </p>
              <p className="text-[10px] text-muted-foreground">sessions terminées</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950/40">
              <CalendarDays className="h-5 w-5" />
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">30 derniers jours</p>
              <p className="mt-1 text-2xl font-bold text-violet-600">
                {data.sessionsMonth}
              </p>
              <p className="text-[10px] text-muted-foreground">sessions terminées</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950/40">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Top failed questions */}
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <h3 className="text-sm font-semibold">
            Questions les plus ratées
          </h3>
        </div>
        {data.topFailedQuestions.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            Aucune donnée d&apos;erreur disponible.
          </p>
        ) : (
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {data.topFailedQuestions.map((q, i) => (
              <div
                key={q.questionId}
                className="flex items-start gap-3 rounded-lg border p-2.5 text-xs"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 font-medium">{q.questionText}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                    <Badge variant="outline" className="text-[9px]">
                      Bonne: {q.correctAnswer}
                    </Badge>
                    <span>{q.failedCount} erreurs / {q.totalAnswers} réponses</span>
                    <span className="font-bold text-amber-600">
                      {q.failureRate}% échec
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Heatmap 7x24 */}
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-emerald-600" />
          <h3 className="text-sm font-semibold">
            Heatmap d&apos;activité (7 jours × 24 heures)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            {/* Hour labels */}
            <div className="mb-1 flex items-center gap-px pl-10">
              {HOUR_LABELS.map((h, i) => (
                <div
                  key={h}
                  className="flex-1 text-center text-[9px] text-muted-foreground"
                  style={{ gridColumn: `${i * 2 + 1} / span 2` }}
                >
                  {h}
                </div>
              ))}
            </div>
            {/* Day rows */}
            <div className="space-y-px">
              {data.heatmap.data.map((row, dayIdx) => (
                <div key={dayIdx} className="flex items-center gap-px">
                  <div className="w-10 shrink-0 text-right pr-1 text-[10px] font-medium text-muted-foreground">
                    {data.heatmap.days[dayIdx]}
                  </div>
                  {row.map((count, hourIdx) => {
                    const intensity = count / maxHeat;
                    const bg =
                      count === 0
                        ? "bg-muted/40"
                        : intensity > 0.66
                        ? "bg-emerald-600"
                        : intensity > 0.33
                        ? "bg-emerald-400"
                        : intensity > 0.1
                        ? "bg-emerald-300"
                        : "bg-emerald-200 dark:bg-emerald-900";
                    return (
                      <div
                        key={hourIdx}
                        className={`group relative h-5 flex-1 rounded-sm transition-all hover:ring-2 hover:ring-emerald-500 ${bg}`}
                        title={`${data.heatmap.days[dayIdx]} ${hourIdx}h — ${count} session(s)`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
              <span>Moins</span>
              <div className="h-3 w-3 rounded-sm bg-muted/40" />
              <div className="h-3 w-3 rounded-sm bg-emerald-200 dark:bg-emerald-900" />
              <div className="h-3 w-3 rounded-sm bg-emerald-300" />
              <div className="h-3 w-3 rounded-sm bg-emerald-400" />
              <div className="h-3 w-3 rounded-sm bg-emerald-600" />
              <span>Plus</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Top users */}
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <Users2 className="h-4 w-4 text-violet-600" />
          <h3 className="text-sm font-semibold">
            Utilisateurs les plus actifs
          </h3>
        </div>
        {data.topUsers.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            Aucun utilisateur actif pour le moment.
          </p>
        ) : (
          <div className="max-h-72 space-y-1.5 overflow-y-auto">
            {data.topUsers.map((u, i) => (
              <div
                key={u.userId}
                className="flex items-center gap-3 rounded-lg border p-2 text-xs"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 font-bold text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{u.name}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {u.email}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{u.sessions}</p>
                  <p className="text-[10px] text-muted-foreground">sessions</p>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${u.avgScore >= 50 ? "text-emerald-600" : "text-rose-600"}`}>
                    {u.avgScore}
                  </p>
                  <p className="text-[10px] text-muted-foreground">score moy.</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
