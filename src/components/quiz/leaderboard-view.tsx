"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Medal, Crown, Star } from "lucide-react";

interface LeaderboardEntry {
  id: string;
  name: string;
  email: string;
  role: string;
  sessionCount: number;
  avgPct: number;
  bestScore: number;
  totalCorrect: number;
  totalQ: number;
  xp: number;
}

export function LeaderboardView() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setEntries(Array.isArray(d) ? d : []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 p-12 text-center">
        <Trophy className="h-12 w-12 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          Aucun classement disponible. Soyez le premier à terminer un quiz !
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <Trophy className="h-5 w-5 text-amber-500" />
            Classement général
          </h2>
          <p className="text-sm text-muted-foreground">
            Les meilleurs visiteurs basés sur l&apos;XP gagnée
          </p>
        </div>
      </div>

      {/* Podium for top 3 */}
      {entries.length >= 3 && (
        <div className="grid gap-3 sm:grid-cols-3">
          {[1, 0, 2].map((idx) => {
            const e = entries[idx];
            if (!e) return null;
            const place = idx + 1;
            const colors = {
              1: "from-amber-400 to-yellow-500",
              2: "from-slate-300 to-slate-400",
              3: "from-orange-400 to-amber-600",
            };
            const icons = { 1: Crown, 2: Medal, 3: Trophy };
            const Icon = icons[place as 1 | 2 | 3];
            return (
              <Card
                key={e.id}
                className={`relative overflow-hidden p-4 text-center ${
                  place === 1 ? "order-2 sm:scale-105" : "order-1"
                }`}
              >
                <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${colors[place as 1 | 2 | 3]}`} />
                <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${colors[place as 1 | 2 | 3]} text-white`}>
                  <Icon className="h-6 w-6" />
                </div>
                <p className="mt-2 truncate text-sm font-bold">{e.name}</p>
                <p className="text-xs text-muted-foreground">{e.xp} XP</p>
                <div className="mt-2 flex justify-center gap-2 text-xs">
                  <Badge variant="secondary" className="text-[10px]">{e.avgPct}% moy</Badge>
                  <Badge variant="outline" className="text-[10px]">{e.sessionCount} sess.</Badge>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Full ranking */}
      <Card className="overflow-hidden">
        <div className="divide-y">
          {entries.map((e, idx) => (
            <div
              key={e.id}
              className="flex items-center gap-3 px-4 py-3 sm:px-5"
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  idx === 0
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                    : idx === 1
                      ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      : idx === 2
                        ? "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300"
                        : "bg-muted text-muted-foreground"
                }`}
              >
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {e.name}
                  {e.role === "ADMIN" && (
                    <Badge variant="outline" className="ml-2 border-amber-300 text-[9px] text-amber-700">ADMIN</Badge>
                  )}
                </p>
                <p className="truncate text-xs text-muted-foreground">{e.email}</p>
              </div>
              <div className="flex items-center gap-3 text-right">
                <div>
                  <p className="flex items-center gap-1 text-sm font-bold text-amber-600">
                    <Star className="h-3 w-3 fill-amber-400" />
                    {e.xp}
                  </p>
                  <p className="text-[10px] text-muted-foreground">XP</p>
                </div>
                <div className="hidden sm:block">
                  <p className={`text-sm font-bold ${e.avgPct >= 50 ? "text-emerald-600" : "text-rose-600"}`}>{e.avgPct}%</p>
                  <p className="text-[10px] text-muted-foreground">{e.sessionCount} sess.</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
