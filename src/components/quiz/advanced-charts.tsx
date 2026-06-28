"use client";

<<<<<<< Updated upstream
import { useEffect, useMemo, useState } from "react";
import {
=======
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
>>>>>>> Stashed changes
  LineChart,
  Line,
  XAxis,
  YAxis,
<<<<<<< Updated upstream
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
=======
  Tooltip,
  CartesianGrid,
>>>>>>> Stashed changes
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
<<<<<<< Updated upstream
import { format, subDays, isSameDay, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Radar as RadarIcon, BarChart3, PieChart as PieIcon, TrendingUp } from "lucide-react";

// ============================================================================
// Types — mirror the lightweight session shape used by the dashboard
// ============================================================================
interface SessionAnswerLite {
  id: string;
  isCorrect: boolean | null;
  userAnswer: string | null;
}

interface SessionLite {
  id: string;
  title: string;
  mode: string;
  score: number;
  totalQuestions: number;
  startedAt: string;
  completedAt: string | null;
  sourceType: string;
  answers?: SessionAnswerLite[];
}

interface StatsComparison {
  comparison: {
    globalAvgScore: number;
    diff: number;
    status: string;
  };
}

// ============================================================================
// Chart palette — derived from COLOR_CLASSES in types.ts for consistency
// ============================================================================
const CHART_COLORS = {
  emerald: "#10b981",
  violet: "#8b5cf6",
  amber: "#f59e0b",
  sky: "#0ea5e9",
  rose: "#f43f5e",
  cyan: "#06b6d4",
  teal: "#14b8a6",
};

// Score-distribution buckets
const SCORE_BUCKETS = [
  { key: "excellent", label: "Excellent (>80%)", color: CHART_COLORS.emerald, min: 80, max: 101 },
  { key: "bon", label: "Bon (60-80%)", color: CHART_COLORS.sky, min: 60, max: 80 },
  { key: "moyen", label: "Moyen (40-60%)", color: CHART_COLORS.amber, min: 40, max: 60 },
  { key: "faible", label: "Faible (<40%)", color: CHART_COLORS.rose, min: 0, max: 40 },
];

// ============================================================================
// Tooltip helpers
// ============================================================================
function pctOfSession(s: SessionLite): number {
  return (s.score / Math.max(1, s.totalQuestions)) * 100;
}

// ============================================================================
// Custom tooltip — themed to match the card background
// ============================================================================
function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; color?: string; payload?: Record<string, unknown> }>;
  label?: string | number;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      {label !== undefined && (
        <p className="mb-1 font-semibold text-foreground">{String(label)}</p>
      )}
      {payload.map((entry, i) => (
        <p key={i} className="flex items-center gap-1.5 text-muted-foreground">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span>{entry.name}:</span>
          <span className="font-medium text-foreground">
            {typeof entry.value === "number" ? entry.value : entry.value}
          </span>
        </p>
      ))}
    </div>
  );
}

// ============================================================================
// Main component
// ============================================================================
export function AdvancedCharts({ sessions }: { sessions: SessionLite[] }) {
  const [stats, setStats] = useState<StatsComparison | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Fetch comparison data (global avg score) for the LineChart reference line
  useEffect(() => {
    let cancelled = false;
    fetch("/api/me/stats", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) setStats(d);
      })
      .catch(() => {
        if (!cancelled) setStats(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingStats(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const completed = useMemo(
    () => sessions.filter((s) => s.completedAt),
    [sessions]
  );

  // ----- LineChart data: avg score per day for the last 30 days -----
  const lineData = useMemo(() => {
    const today = new Date();
    const days = Array.from({ length: 30 }, (_, i) => {
      const d = subDays(today, 29 - i);
      return {
        date: d,
        label: format(d, "dd/MM", { locale: fr }),
        isoDate: format(d, "yyyy-MM-dd"),
        scores: [] as number[],
        avg: 0 as number,
      };
    });

    for (const s of completed) {
      const d = parseISO(s.completedAt ?? s.startedAt);
      const day = days.find((x) => isSameDay(x.date, d));
      if (day) day.scores.push(pctOfSession(s));
    }

    return days.map((day) => ({
      label: day.label,
      avg:
        day.scores.length > 0
          ? Math.round(day.scores.reduce((a, b) => a + b, 0) / day.scores.length)
          : 0,
      hasData: day.scores.length > 0,
      globalAvg: stats?.comparison?.globalAvgScore ?? 0,
    }));
  }, [completed, stats]);

  // ----- RadarChart data: avg score per session title (matière) -----
  const radarData = useMemo(() => {
    const groups: Record<string, number[]> = {};
    for (const s of completed) {
      const key = s.title || "Sans titre";
      if (!groups[key]) groups[key] = [];
      groups[key].push(pctOfSession(s));
    }
    // Take the top 8 by session count, so the radar stays readable
    return Object.entries(groups)
      .map(([title, scores]) => ({
        subject:
          title.length > 18 ? title.slice(0, 17) + "…" : title,
        score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        sessions: scores.length,
      }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 8);
  }, [completed]);

  // ----- BarChart data: questions answered per day for the last 7 days -----
  const barData = useMemo(() => {
    const today = new Date();
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(today, 6 - i);
      return {
        date: d,
        label: format(d, "EEE", { locale: fr }),
=======
import {
  TrendingUp,
  Radar as RadarIcon,
  BarChart3,
  PieChart as PieIcon,
} from "lucide-react";

export interface AdvancedChartsProps {
  sessions: Array<{
    id: string;
    title: string;
    score: number;
    totalQuestions: number;
    completedAt: string | null;
    startedAt: string;
    sourceType: string;
  }>;
}

const PIE_COLORS = ["#10b981", "#f43f5e", "#94a3b8"];

/**
 * Four advanced Recharts visualisations for the dashboard.
 * Each chart degrades gracefully when there is not enough data.
 */
export function AdvancedCharts({ sessions }: AdvancedChartsProps) {
  // 30-day progression (avg score per day)
  const lineData = useMemo(() => {
    const days: Array<{
      date: string;
      label: string;
      scores: number[];
    }> = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      days.push({
        date: iso,
        label: d.toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
        }),
        scores: [],
      });
    }
    const dayMap = new Map(days.map((d) => [d.date, d]));
    for (const s of sessions) {
      if (!s.completedAt) continue;
      const iso = new Date(s.completedAt).toISOString().slice(0, 10);
      const day = dayMap.get(iso);
      if (day) {
        const pct = (s.score / Math.max(1, s.totalQuestions)) * 100;
        day.scores.push(pct);
      }
    }
    return days.map((d) => ({
      label: d.label,
      score:
        d.scores.length > 0
          ? Math.round(
              d.scores.reduce((a, b) => a + b, 0) / d.scores.length
            )
          : null,
      count: d.scores.length,
    }));
  }, [sessions]);

  // Skills by category (radar) — avg score per source title (top 6)
  const radarData = useMemo(() => {
    const groups = new Map<
      string,
      { scores: number[]; count: number }
    >();
    for (const s of sessions) {
      if (!s.completedAt) continue;
      const key = s.title.length > 24
        ? s.title.slice(0, 22) + "…"
        : s.title;
      if (!groups.has(key)) groups.set(key, { scores: [], count: 0 });
      const g = groups.get(key)!;
      g.scores.push((s.score / Math.max(1, s.totalQuestions)) * 100);
      g.count++;
    }
    return Array.from(groups.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 6)
      .map(([key, g]) => ({
        category: key,
        score: Math.round(g.scores.reduce((a, b) => a + b, 0) / g.scores.length),
      }));
  }, [sessions]);

  // 7-day activity bar chart
  const barData = useMemo(() => {
    const out = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
        label: d.toLocaleDateString("fr-FR", { weekday: "short" }),
        sessions: 0,
>>>>>>> Stashed changes
        questions: 0,
      };
    });
    for (const s of sessions) {
<<<<<<< Updated upstream
      const d = parseISO(s.completedAt ?? s.startedAt);
      const day = days.find((x) => isSameDay(x.date, d));
      if (day) {
        // Count actually-answered questions when available; fall back to totalQuestions
        if (s.answers && s.answers.length > 0) {
          day.questions += s.answers.filter(
            (a) => a.userAnswer !== null && a.userAnswer !== undefined
          ).length;
        } else {
          day.questions += s.totalQuestions;
        }
      }
    }
    return days;
  }, [sessions]);

  // ----- PieChart data: score distribution -----
  const pieData = useMemo(() => {
    const counts = SCORE_BUCKETS.map((b) => ({ ...b, count: 0 }));
    for (const s of completed) {
      const pct = pctOfSession(s);
      const bucket = counts.find((b) => pct >= b.min && pct < b.max);
      if (bucket) bucket.count++;
    }
    return counts
      .filter((b) => b.count > 0)
      .map((b) => ({ name: b.label, value: b.count, color: b.color }));
  }, [completed]);

  const hasLineData = lineData.some((d) => d.hasData);
  const hasRadarData = radarData.length > 0;
  const hasBarData = barData.some((d) => d.questions > 0);
  const hasPieData = pieData.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-emerald-600" />
        <div>
          <h2 className="text-lg font-bold tracking-tight">Analyse détaillée</h2>
          <p className="text-xs text-muted-foreground">
            Graphiques avancés de progression et de répartition
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* === LineChart — 30-day progression === */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-600" />
              <CardTitle>Progression du score moyen sur 30 jours</CardTitle>
            </div>
            <CardDescription>
              Évolution jour par jour de votre score moyen (en %). La ligne
              pointillée représente la moyenne globale des utilisateurs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Skeleton className="h-[280px] w-full rounded-lg" />
            ) : !hasLineData ? (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                Pas encore de sessions terminées sur les 30 derniers jours.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart
                  data={lineData}
                  margin={{ top: 8, right: 16, left: -12, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    interval={3}
                    stroke="var(--border)"
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    stroke="var(--border)"
                    unit="%"
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="avg"
                    name="Score moyen"
                    stroke={CHART_COLORS.emerald}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: CHART_COLORS.emerald, strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                    connectNulls
                  />
                  {stats?.comparison?.globalAvgScore !== undefined &&
                    stats.comparison.globalAvgScore > 0 && (
                      <Line
                        type="monotone"
                        dataKey="globalAvg"
                        name="Moyenne globale"
                        stroke={CHART_COLORS.amber}
                        strokeWidth={1.5}
                        strokeDasharray="6 4"
                        dot={false}
                        connectNulls
                      />
                    )}
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* === RadarChart — Skills per matière === */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <RadarIcon className="h-4 w-4 text-violet-600" />
              <CardTitle>Compétences par matière</CardTitle>
            </div>
            <CardDescription>
              Score moyen (en %) pour chaque matière pratiquée.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!hasRadarData ? (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                Pas encore assez de données.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData} outerRadius="70%">
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    stroke="var(--border)"
                  />
                  <PolarRadiusAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    stroke="var(--border)"
                    tickFormatter={(v: number) => `${v}%`}
                  />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke={CHART_COLORS.violet}
                    fill={CHART_COLORS.violet}
                    fillOpacity={0.45}
                  />
                  <Tooltip content={<ChartTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* === BarChart — Questions answered per day (7 days) === */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-sky-600" />
              <CardTitle>Questions répondues (7 derniers jours)</CardTitle>
            </div>
            <CardDescription>
              Volume de questions traitées chaque jour de la semaine.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!hasBarData ? (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                Aucune question répondue sur les 7 derniers jours.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={barData}
                  margin={{ top: 8, right: 16, left: -12, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    stroke="var(--border)"
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    stroke="var(--border)"
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
                  <Bar
                    dataKey="questions"
                    name="Questions"
                    fill={CHART_COLORS.sky}
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* === PieChart — Score distribution === */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-amber-600" />
              <CardTitle>Répartition des scores</CardTitle>
            </div>
            <CardDescription>
              Distribution de vos sessions selon 4 niveaux de performance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!hasPieData ? (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                Aucune session terminée à analyser.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={45}
                    paddingAngle={2}
                    label={(entry) => `${entry.name} (${entry.value})`}
                    labelLine={false}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={32}
                    wrapperStyle={{ fontSize: 11 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
=======
      if (!s.completedAt) continue;
      const d = new Date(s.completedAt);
      const dayDiff = Math.floor(
        (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (dayDiff >= 0 && dayDiff < 7) {
        const idx = 6 - dayDiff;
        out[idx].sessions += 1;
        out[idx].questions += s.totalQuestions;
      }
    }
    return out;
  }, [sessions]);

  // Score distribution pie chart
  const pieData = useMemo(() => {
    let excellent = 0;
    let pass = 0;
    let fail = 0;
    for (const s of sessions) {
      if (!s.completedAt) continue;
      const pct = (s.score / Math.max(1, s.totalQuestions)) * 100;
      if (pct >= 80) excellent++;
      else if (pct >= 50) pass++;
      else fail++;
    }
    return [
      { name: "Excellent (≥80%)", value: excellent },
      { name: "Réussi (50-79%)", value: pass },
      { name: "Échec (<50%)", value: fail },
    ];
  }, [sessions]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* 30-day progression line chart */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-semibold">
              Progression sur 30 jours
            </h3>
          </div>
          <Badge variant="secondary" className="text-[10px]">
            score moyen / jour
          </Badge>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={lineData}
              margin={{ top: 5, right: 5, bottom: 5, left: -20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                interval={4}
                stroke="#9ca3af"
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10 }}
                stroke="#9ca3af"
              />
              <Tooltip
                formatter={(v: number) => (v == null ? "—" : `${v}%`)}
                labelStyle={{ fontSize: 12 }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 3, fill: "#10b981" }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Skills radar */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RadarIcon className="h-4 w-4 text-violet-600" />
            <h3 className="text-sm font-semibold">Compétences par catégorie</h3>
          </div>
          <Badge variant="secondary" className="text-[10px]">
            top 6
          </Badge>
        </div>
        {radarData.length === 0 ? (
          <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
            Pas assez de données
          </div>
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius={75}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis
                  dataKey="category"
                  tick={{ fontSize: 9 }}
                  stroke="#9ca3af"
                />
                <PolarRadiusAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 9 }}
                  stroke="#9ca3af"
                />
                <Radar
                  name="Score moyen"
                  dataKey="score"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.4}
                />
                <Tooltip formatter={(v: number) => `${v}%`} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* 7-day activity bar chart */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-sky-600" />
            <h3 className="text-sm font-semibold">Activité des 7 derniers jours</h3>
          </div>
          <Badge variant="secondary" className="text-[10px]">
            sessions / questions
          </Badge>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={barData}
              margin={{ top: 5, right: 5, bottom: 5, left: -20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar
                dataKey="sessions"
                name="Sessions"
                fill="#0ea5e9"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="questions"
                name="Questions"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Score distribution pie chart */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PieIcon className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-semibold">Distribution des scores</h3>
          </div>
          <Badge variant="secondary" className="text-[10px]">
            par tranche
          </Badge>
        </div>
        {pieData.every((p) => p.value === 0) ? (
          <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
            Pas encore de sessions terminées
          </div>
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  label={({ name, value }) =>
                    value > 0 ? `${name}: ${value}` : ""
                  }
                  labelLine={false}
                >
                  {pieData.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={PIE_COLORS[idx % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
>>>>>>> Stashed changes
    </div>
  );
}
