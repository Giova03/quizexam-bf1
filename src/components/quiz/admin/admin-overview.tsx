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
<<<<<<< Updated upstream
import type { AdminStats } from "./types";

/**
 * StatCard — small KPI tile used at the top of the overview tab.
=======
import type { AdminStats, StatColor } from "./types";

interface AdminOverviewProps {
  stats: AdminStats | null;
}

/**
 * StatCard — petit carte de statistique avec icône colorée.
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
  color: string;
=======
  color: StatColor | string;
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
 * TopPerformersAndAlerts — fetches sessions and renders the top-5 leaderboard
 * plus the low-performance alerts card. Lives at the bottom of the overview
 * tab.
=======
 * AdminOverview — onglet "Vue d'ensemble" du panneau admin.
 * Affiche les cartes de statistiques + visiteurs/sessions récents
 * + top 5 + alertes performance.
 */
export function AdminOverview({ stats }: AdminOverviewProps) {
  const c = stats?.counts;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard icon={BookOpen} label="Banques" value={c?.banks ?? 0} color="emerald" />
        <StatCard icon={FileQuestion} label="Questions" value={c?.questions ?? 0} color="violet" />
        <StatCard icon={Trophy} label="Examens" value={c?.exams ?? 0} color="amber" />
        <StatCard icon={Users} label="Utilisateurs" value={c?.users ?? 0} color="sky" />
        <StatCard icon={Activity} label="Sessions" value={c?.sessions ?? 0} color="rose" />
        <StatCard icon={TrendingUp} label="Terminées" value={c?.completedSessions ?? 0} color="teal" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="border-b px-5 py-4">
            <h2 className="flex items-center gap-2 font-semibold">
              <Users className="h-4 w-4 text-sky-600" />
              Visiteurs récents
            </h2>
          </div>
          <div className="max-h-[300px] divide-y overflow-y-auto">
            {stats?.recentUsers.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">
                Aucun visiteur inscrit
              </p>
            )}
            {stats?.recentUsers.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-5 py-3">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ${
                    u.role === "ADMIN"
                      ? "bg-gradient-to-br from-amber-500 to-orange-600"
                      : "bg-gradient-to-br from-emerald-500 to-teal-600"
                  }`}
                >
                  {(u.name ?? u.email).charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{u.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {u.email}
                  </p>
                </div>
                {u.role === "ADMIN" && (
                  <Badge variant="outline" className="border-amber-300 text-amber-700">
                    ADMIN
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {new Date(u.createdAt).toLocaleDateString("fr-FR")}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b px-5 py-4">
            <h2 className="flex items-center gap-2 font-semibold">
              <Activity className="h-4 w-4 text-rose-600" />
              Sessions récentes
            </h2>
          </div>
          <div className="max-h-[300px] divide-y overflow-y-auto">
            {stats?.recentSessions.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">
                Aucune session terminée
              </p>
            )}
            {stats?.recentSessions.map((s) => {
              const pct = Math.round(
                (s.score / Math.max(1, s.totalQuestions)) * 100
              );
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 px-5 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {s.user?.name ?? s.user?.email ?? "Visiteur"}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-bold ${
                      pct >= 50 ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <TopPerformersAndAlerts />
    </div>
  );
}

/**
 * TopPerformersAndAlerts — composant affichant le top 5 des visiteurs
 * et les alertes de performance (< 50%).
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
  // Compute top performers
=======
>>>>>>> Stashed changes
  const userMap: Record<string, { name: string; email: string; sessions: any[] }> = {};
  for (const s of sessions) {
    const uid = s.user?.id ?? "anon";
    if (!userMap[uid]) {
      userMap[uid] = { name: s.user?.name ?? "Visiteur", email: s.user?.email ?? "N/A", sessions: [] };
    }
    if (s.completedAt) userMap[uid].sessions.push(s);
  }

  const users = Object.entries(userMap).map(([id, data]) => {
    const completed = data.sessions;
    const avgPct = completed.length > 0
      ? Math.round(completed.reduce((sum, s) => sum + (s.score / Math.max(1, s.totalQuestions)) * 100, 0) / completed.length)
      : 0;
    return { id, ...data, sessionCount: completed.length, avgPct };
  });

  const topPerformers = [...users]
    .filter((u) => u.sessionCount >= 1)
    .sort((a, b) => b.avgPct - a.avgPct)
    .slice(0, 5);

  const lowPerformers = [...users]
    .filter((u) => u.sessionCount >= 2 && u.avgPct < 50)
    .sort((a, b) => a.avgPct - b.avgPct)
    .slice(0, 5);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="overflow-hidden">
        <div className="border-b px-5 py-4">
          <h3 className="flex items-center gap-2 font-semibold">
            <Star className="h-4 w-4 text-amber-500" />
            Top 5 visiteurs
          </h3>
          <p className="text-xs text-muted-foreground">Meilleurs scores moyens</p>
        </div>
        <div className="divide-y">
          {topPerformers.length === 0 && (
            <p className="p-4 text-center text-sm text-muted-foreground">
              Pas encore de données
            </p>
          )}
          {topPerformers.map((u, i) => (
            <div key={u.id} className="flex items-center gap-3 px-5 py-3">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                i === 0 ? "bg-amber-100 text-amber-700" :
                i === 1 ? "bg-slate-100 text-slate-700" :
                i === 2 ? "bg-orange-100 text-orange-700" :
                "bg-muted text-muted-foreground"
              }`}>
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{u.name}</p>
                <p className="truncate text-[10px] text-muted-foreground">{u.email}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-emerald-600">{u.avgPct}%</p>
                <p className="text-[10px] text-muted-foreground">{u.sessionCount} sess.</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b px-5 py-4">
          <h3 className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4 text-rose-500" />
            Alertes performance
          </h3>
          <p className="text-xs text-muted-foreground">Visiteurs avec score moyen &lt; 50%</p>
        </div>
        <div className="divide-y">
          {lowPerformers.length === 0 && (
            <p className="p-4 text-center text-sm text-muted-foreground">
              Aucune alerte - tous les visiteurs performent bien !
            </p>
          )}
          {lowPerformers.map((u) => (
            <div key={u.id} className="flex items-center gap-3 px-5 py-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700">
                <AlertTriangle className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{u.name}</p>
                <p className="truncate text-[10px] text-muted-foreground">{u.email}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-rose-600">{u.avgPct}%</p>
                <p className="text-[10px] text-muted-foreground">{u.sessionCount} sess.</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
<<<<<<< Updated upstream

/**
 * OverviewTab — renders the 6 KPI cards + recent users + recent sessions +
 * top performers/alerts. Receives the already-fetched stats from the parent.
 */
export function OverviewTab({ stats }: { stats: AdminStats | null }) {
  const c = stats?.counts;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard icon={BookOpen} label="Banques" value={c?.banks ?? 0} color="emerald" />
        <StatCard icon={FileQuestion} label="Questions" value={c?.questions ?? 0} color="violet" />
        <StatCard icon={Trophy} label="Examens" value={c?.exams ?? 0} color="amber" />
        <StatCard icon={Users} label="Utilisateurs" value={c?.users ?? 0} color="sky" />
        <StatCard icon={Activity} label="Sessions" value={c?.sessions ?? 0} color="rose" />
        <StatCard icon={TrendingUp} label="Terminées" value={c?.completedSessions ?? 0} color="teal" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="border-b px-5 py-4">
            <h2 className="flex items-center gap-2 font-semibold">
              <Users className="h-4 w-4 text-sky-600" />
              Visiteurs récents
            </h2>
          </div>
          <div className="max-h-[300px] divide-y overflow-y-auto">
            {stats?.recentUsers.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">
                Aucun visiteur inscrit
              </p>
            )}
            {stats?.recentUsers.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-5 py-3">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ${
                    u.role === "ADMIN"
                      ? "bg-gradient-to-br from-amber-500 to-orange-600"
                      : "bg-gradient-to-br from-emerald-500 to-teal-600"
                  }`}
                >
                  {(u.name ?? u.email).charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{u.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {u.email}
                  </p>
                </div>
                {u.role === "ADMIN" && (
                  <Badge variant="outline" className="border-amber-300 text-amber-700">
                    ADMIN
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {new Date(u.createdAt).toLocaleDateString("fr-FR")}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b px-5 py-4">
            <h2 className="flex items-center gap-2 font-semibold">
              <Activity className="h-4 w-4 text-rose-600" />
              Sessions récentes
            </h2>
          </div>
          <div className="max-h-[300px] divide-y overflow-y-auto">
            {stats?.recentSessions.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">
                Aucune session terminée
              </p>
            )}
            {stats?.recentSessions.map((s) => {
              const pct = Math.round(
                (s.score / Math.max(1, s.totalQuestions)) * 100
              );
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 px-5 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {s.user?.name ?? s.user?.email ?? "Visiteur"}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-bold ${
                      pct >= 50 ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Top performers + alerts */}
      <TopPerformersAndAlerts />
    </div>
  );
}
=======
>>>>>>> Stashed changes
