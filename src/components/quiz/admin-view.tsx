"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  FileQuestion,
  BookOpen,
  Trophy,
  Activity,
  ShieldCheck,
  Database,
  TrendingUp,
} from "lucide-react";

interface AdminStats {
  counts: {
    banks: number;
    questions: number;
    exams: number;
    users: number;
    sessions: number;
    completedSessions: number;
  };
  recentUsers: Array<{
    id: string;
    email: string;
    name: string;
    role: string;
    createdAt: string;
  }>;
  recentSessions: Array<{
    id: string;
    title: string;
    score: number;
    totalQuestions: number;
    completedAt: string;
    user: { name: string | null; email: string | null } | null;
  }>;
  bankStats: Array<{
    id: string;
    title: string;
    category: string;
    _count: { questions: number };
  }>;
}

export function AdminView() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) setStats(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    fetch("/api/admin/init", { method: "POST" }).catch(() => {});
  }, [loadStats]);

  if (loading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );

  const isAdmin =
    (session?.user as { role?: string })?.role === "ADMIN";
  if (!isAdmin)
    return (
      <Card className="flex flex-col items-center gap-3 p-12 text-center">
        <ShieldCheck className="h-12 w-12 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          Accès réservé à l&apos;administrateur.
        </p>
      </Card>
    );

  const c = stats?.counts;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <ShieldCheck className="h-6 w-6 text-amber-600" />
          Panneau d&apos;administration
        </h1>
        <p className="text-muted-foreground">
          Gérez les banques, questions, utilisateurs et statistiques
        </p>
      </div>

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
              Utilisateurs récents
            </h2>
          </div>
          <div className="max-h-[300px] divide-y overflow-y-auto">
            {stats?.recentUsers.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">
                Aucun utilisateur inscrit
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
                <div key={s.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {s.user?.name ?? s.user?.email ?? "Visiteur"}
                    </p>
                  </div>
                  <span className={`text-sm font-bold ${pct >= 50 ? "text-emerald-600" : "text-rose-600"}`}>
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b px-5 py-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <Database className="h-4 w-4 text-emerald-600" />
            Banques de questions
          </h2>
        </div>
        <div className="max-h-[400px] divide-y overflow-y-auto">
          {stats?.bankStats.map((bank) => (
            <div key={bank.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{bank.title}</p>
                <p className="text-xs text-muted-foreground">{bank.category}</p>
              </div>
              <Badge variant="secondary">{bank._count.questions} Q</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function StatCard({
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
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${colorMap[color] ?? colorMap.emerald}`}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </Card>
  );
}
