"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  FileQuestion,
  BookOpen,
  Trophy,
  Activity,
  TrendingUp,
  Star,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import type { AdminStats } from "./types";

/**
 * StatCard — small KPI tile used at the top of the overview tab.
 */
export function StatCard({
  icon: Icon,
  label,
  value,
  color = "emerald",
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  color?: string;
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
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-lg ${
          colorMap[color] ?? colorMap.emerald
        }`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </Card>
  );
}

interface SessionDetail {
  id: string;
  title: string;
  score: number;
  totalQuestions: number;
  completedAt: string | null;
  user: { name: string | null; email: string | null } | null;
}

/**
 * TopPerformersAndAlerts — fetches sessions and renders the top-5 leaderboard
 * plus the low-performance alerts card. Lives at the bottom of the overview
 * tab.
 */
export function TopPerformersAndAlerts() {
  const [sessions, setSessions] = useState<SessionDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/sessions?details=true")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setSessions(Array.isArray(d) ? (d as SessionDetail[]) : []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton className="h-48 rounded-xl" />;

  // Compute top performers (best score%, fall back to 0 if missing data).
  const pct = (s: SessionDetail) =>
    s.totalQuestions > 0 ? Math.round((s.score / s.totalQuestions) * 100) : 0;
  const top = [...sessions]
    .filter((s) => s.completedAt)
    .sort((a, b) => pct(b) - pct(a))
    .slice(0, 5);

  // Low-performance alerts: any completed session with score% < 50%.
  const alerts = sessions
    .filter((s) => s.completedAt && pct(s) < 50)
    .slice(0, 5);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          <h3 className="font-semibold">Top 5 — Meilleurs scores</h3>
        </div>
        {top.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune session terminée pour l&apos;instant.
          </p>
        ) : (
          <ul className="space-y-2">
            {top.map((s, i) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-md border p-2 text-sm"
              >
                <span className="flex items-center gap-2">
                  <Star className="h-3.5 w-3.5 text-amber-500" />
                  <span className="font-medium">
                    {i + 1}. {s.user?.name ?? s.user?.email ?? "Anonyme"}
                  </span>
                </span>
                <Badge variant="outline" className="text-xs">
                  {pct(s)}% · {s.title}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-500" />
          <h3 className="font-semibold">Alertes — Scores faibles (&lt;50%)</h3>
        </div>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune alerte. Tous les apprenants ont un score ≥ 50%.
          </p>
        ) : (
          <ul className="space-y-2">
            {alerts.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-md border border-rose-200 p-2 text-sm dark:border-rose-900"
              >
                <span className="font-medium">
                  {s.user?.name ?? s.user?.email ?? "Anonyme"}
                </span>
                <Badge variant="outline" className="text-xs text-rose-700">
                  {pct(s)}% · {s.title}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export function OverviewTab({ stats }: { stats: AdminStats | null }) {
  const counts = stats?.counts;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          icon={BookOpen}
          label="Banques"
          value={counts?.banks ?? 0}
          color="emerald"
        />
        <StatCard
          icon={FileQuestion}
          label="Questions"
          value={counts?.questions ?? 0}
          color="violet"
        />
        <StatCard
          icon={Trophy}
          label="Examens"
          value={counts?.exams ?? 0}
          color="amber"
        />
        <StatCard
          icon={Users}
          label="Utilisateurs"
          value={counts?.users ?? 0}
          color="sky"
        />
        <StatCard
          icon={Activity}
          label="Sessions"
          value={counts?.sessions ?? 0}
          color="rose"
        />
        <StatCard
          icon={TrendingUp}
          label="Terminées"
          value={counts?.completedSessions ?? 0}
          color="teal"
        />
      </div>
      <TopPerformersAndAlerts />
    </div>
  );
}
