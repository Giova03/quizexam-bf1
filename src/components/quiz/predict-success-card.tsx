"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Target,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Minus,
  Activity,
} from "lucide-react";

/**
 * PredictSuccess — dashboard card that shows the user's predicted exam
 * success probability, with a factor breakdown.
 *
 * Fetches GET /api/predict-success and renders:
 *   - A big percentage with a colored ring/bar (red < 40, amber < 70, green ≥ 70)
 *   - A confidence badge (low/medium/high)
 *   - A list of factors with signed impact badges (green = +, red = -)
 *   - The human-readable analysis paragraph
 *
 * Graceful degradation: if the API fails, the card is hidden.
 */

interface FactorBreakdown {
  factor: string;
  impact: number;
}

interface PredictionResponse {
  probability: number;
  confidence: number;
  factors: FactorBreakdown[];
  analysis: string;
  stats: {
    totalSessions: number;
    avgScore: number;
    recentTrend: number;
    activeDays: number;
    distinctBanks: number;
    weakAreaCount: number;
    strongAreaCount: number;
  };
}

function getProbabilityColor(p: number): {
  text: string;
  bg: string;
  bar: string;
  ring: string;
} {
  if (p >= 70) {
    return {
      text: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      bar: "bg-emerald-500",
      ring: "text-emerald-500",
    };
  }
  if (p >= 40) {
    return {
      text: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/30",
      bar: "bg-amber-500",
      ring: "text-amber-500",
    };
  }
  return {
    text: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-950/30",
    bar: "bg-rose-500",
    ring: "text-rose-500",
  };
}

function getConfidenceLabel(c: number): {
  label: string;
  variant: "secondary" | "outline" | "default";
} {
  if (c >= 70) return { label: "Confiance élevée", variant: "default" };
  if (c >= 40) return { label: "Confiance moyenne", variant: "secondary" };
  return { label: "Confiance faible", variant: "outline" };
}

export function PredictSuccess() {
  const [data, setData] = useState<PredictionResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/predict-success", { cache: "no-store" });
      if (res.ok) {
        const json = (await res.json()) as PredictionResponse;
        setData(json);
      } else {
        setData(null);
      }
    } catch (e) {
      console.error("PredictSuccess load error:", e);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-emerald-600 to-teal-600 p-4 text-white">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <h3 className="text-sm font-semibold">
              Prédiction de réussite
            </h3>
          </div>
        </div>
        <div className="space-y-2 p-4">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </Card>
    );
  }

  if (!data) return null;

  const colors = getProbabilityColor(data.probability);
  const conf = getConfidenceLabel(data.confidence);

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-br from-emerald-600 to-teal-600 p-4 text-white">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <h3 className="text-sm font-semibold">
              Prédiction de réussite
            </h3>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1 px-2 text-xs text-white/80 hover:bg-white/10 hover:text-white"
            onClick={() => {
              load();
              toast.success("Prédiction actualisée.");
            }}
            aria-label="Actualiser la prédiction"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {/* Big percentage + confidence */}
        <div className="flex items-center gap-4">
          <div
            className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full ${colors.bg} ${colors.text}`}
          >
            <div className="text-center">
              <div className="text-2xl font-bold leading-none">
                {data.probability}%
              </div>
              <div className="text-[10px] font-medium uppercase opacity-70">
                réussite
              </div>
            </div>
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant={conf.variant} className="text-[10px]">
                {conf.label}
              </Badge>
              {data.stats.totalSessions > 0 && (
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <Activity className="h-2.5 w-2.5" />
                  {data.stats.totalSessions} sessions
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.analysis}
            </p>
          </div>
        </div>

        {/* Confidence bar */}
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Confiance du modèle</span>
            <span className="font-medium">{data.confidence}%</span>
          </div>
          <Progress value={data.confidence} className="h-1.5" />
        </div>

        {/* Factor breakdown */}
        {data.factors.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground">
              Facteurs déterminants
            </p>
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {data.factors.map((f, i) => {
                const isPositive = f.impact > 0;
                const isNegative = f.impact < 0;
                const Icon = isPositive
                  ? TrendingUp
                  : isNegative
                    ? TrendingDown
                    : Minus;
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-2 rounded-md bg-muted/30 px-2.5 py-1.5"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Icon
                        className={`h-3.5 w-3.5 shrink-0 ${
                          isPositive
                            ? "text-emerald-600"
                            : isNegative
                              ? "text-rose-600"
                              : "text-muted-foreground"
                        }`}
                      />
                      <span className="truncate text-xs text-muted-foreground">
                        {f.factor}
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className={`shrink-0 text-[10px] font-semibold ${
                        isPositive
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                          : isNegative
                            ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300"
                            : "border-border bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      {isPositive ? "+" : ""}
                      {f.impact}%
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2 border-t pt-3 text-center">
          <div>
            <p className="text-xs text-muted-foreground">Score moyen</p>
            <p className="text-sm font-bold">{data.stats.avgScore}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Banques</p>
            <p className="text-sm font-bold">{data.stats.distinctBanks}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tendance 7j</p>
            <p
              className={`text-sm font-bold ${
                data.stats.recentTrend > 0
                  ? "text-emerald-600"
                  : data.stats.recentTrend < 0
                    ? "text-rose-600"
                    : ""
              }`}
            >
              {data.stats.recentTrend > 0 ? "+" : ""}
              {data.stats.recentTrend} pts
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
