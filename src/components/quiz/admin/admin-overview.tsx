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
} from "lucide-react";
import type { AdminStats } from "./types";

/**
 * StatCard — small KPI tile used at the top of the overview tab.
 */
export function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  color: string;
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
        <Icon className="h-4.5 w-4.5" />
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </Card>
  );
}

/**
 * TopPerformersAndAlerts — fetches sessions and renders the top-5 leaderboard
 * plus the low-performance alerts card. Lives at the bottom of the overview
 * tab.
 */
export function TopPerformersAndAlerts() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/sessions?details=true")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setSessions(Array.isArray(d) ? d : []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton className="h-48 rounded-xl" />;

  // Compute top performers

}


export function OverviewTab({ stats }: { stats: any }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard icon={() => null} label="Banques" value={stats?.counts?.banks ?? 0} />
        <StatCard icon={() => null} label="Questions" value={stats?.counts?.questions ?? 0} />
        <StatCard icon={() => null} label="Examens" value={stats?.counts?.exams ?? 0} />
        <StatCard icon={() => null} label="Utilisateurs" value={stats?.counts?.users ?? 0} />
        <StatCard icon={() => null} label="Sessions" value={stats?.counts?.sessions ?? 0} />
        <StatCard icon={() => null} label="Terminées" value={stats?.counts?.completedSessions ?? 0} />
      </div>
      <TopPerformersAndAlerts />
    </div>
  );
}
