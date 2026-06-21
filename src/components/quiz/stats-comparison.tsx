"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
  Download,
  Target,
  Award,
  Gauge,
} from "lucide-react";
import { toast } from "sonner";

interface StatsData {
  user: { name: string; email: string; role: string; createdAt: string };
  stats: {
    totalSessions: number;
    avgScore: number;
    bestScore: number;
    totalCorrect: number;
    totalQuestions: number;
    recentSessions: number;
    rank: number;
    totalUsers: number;
    percentile: number;
  };
  comparison: {
    globalAvgScore: number;
    diff: number;
    status: string;
  };
  last30Days: Array<{ date: string; score: number; total: number; pct: number; title: string }>;
}

export function StatsComparison() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetch("/api/me/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/me/export");
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `mes-resultats-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Résultats exportés en CSV");
      } else {
        toast.error("Erreur lors de l'export");
      }
    } catch (e) {
      toast.error("Erreur");
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return <Skeleton className="h-48 rounded-xl" />;
  }

  if (!data) return null;

  const { stats, comparison } = data;
  const StatusIcon =
    comparison.status === "above" ? TrendingUp :
    comparison.status === "below" ? TrendingDown : Minus;
  const statusColor =
    comparison.status === "above" ? "text-emerald-600" :
    comparison.status === "below" ? "text-rose-600" : "text-muted-foreground";

  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-violet-600" />
          <h3 className="text-sm font-semibold">Comparaison & Performance</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={exporting}
          onClick={handleExport}
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Exporter mes résultats</span>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Rank */}
        <div className="rounded-lg border p-3 text-center">
          <Trophy className="mx-auto h-5 w-5 text-amber-500" />
          <p className="mt-1 text-lg font-bold">
            #{stats.rank || "-"}
            <span className="text-xs font-normal text-muted-foreground">/{stats.totalUsers}</span>
          </p>
          <p className="text-[10px] text-muted-foreground">Classement</p>
        </div>

        {/* Percentile */}
        <div className="rounded-lg border p-3 text-center">
          <Award className="mx-auto h-5 w-5 text-violet-500" />
          <p className="mt-1 text-lg font-bold">{stats.percentile || 0}%</p>
          <p className="text-[10px] text-muted-foreground">Percentile</p>
        </div>

        {/* Best score */}
        <div className="rounded-lg border p-3 text-center">
          <Target className="mx-auto h-5 w-5 text-emerald-500" />
          <p className="mt-1 text-lg font-bold">{stats.bestScore}%</p>
          <p className="text-[10px] text-muted-foreground">Meilleur score</p>
        </div>

        {/* Comparison */}
        <div className="rounded-lg border p-3 text-center">
          <StatusIcon className={`mx-auto h-5 w-5 ${statusColor}`} />
          <p className={`mt-1 text-lg font-bold ${statusColor}`}>
            {comparison.diff > 0 ? "+" : ""}{comparison.diff}%
          </p>
          <p className="text-[10px] text-muted-foreground">vs moyenne ({comparison.globalAvgScore}%)</p>
        </div>
      </div>

      {/* Progress over last 30 days */}
      {data.last30Days.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Progression sur 30 jours ({data.last30Days.length} sessions)
          </p>
          <div className="flex h-20 items-end gap-1">
            {data.last30Days
              .slice(0, 30)
              .reverse()
              .map((s, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-t-sm transition-all ${
                    s.pct >= 50 ? "bg-emerald-400" : "bg-rose-400"
                  }`}
                  style={{ height: `${Math.max(10, s.pct)}%` }}
                  title={`${s.title}: ${s.pct}%`}
                />
              ))}
          </div>
        </div>
      )}
    </Card>
  );
}
