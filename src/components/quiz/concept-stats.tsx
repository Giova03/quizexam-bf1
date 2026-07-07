"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from "recharts";
import { useQuizStore } from "@/lib/quiz-store";
import { Grid3x3, Radar as RadarIcon, TrendingUp, AlertTriangle } from "lucide-react";

/**
 * ConceptStats — "Statistiques par concept" (Feature E6.4).
 *
 * Shows the user's mastery of each bank category as a heatmap + a radar
 * chart. Helps identify which concepts need work.
 *
 * - Heatmap: 5x5 grid (one cell per category) coloured by mastery %
 *   (red <40%, amber 40-70%, green ≥70%).
 * - Radar chart: one axis per category, value = mastery %.
 * - List of concepts that need work (sorted by mastery asc).
 *
 * Data source: the user's sessions (fetched from /api/sessions) — we
 * compute per-category success rate from the SessionAnswer rows.
 */

interface SessionAnswer {
  isCorrect: boolean | null;
  userAnswer: string | null;
}
interface SessionSummary {
  id: string;
  title: string;
  sourceType: string;
  sourceId: string;
  answers?: SessionAnswer[];
}

interface BankLite {
  id: string;
  title: string;
  category: string;
}

interface ConceptStat {
  category: string;
  bankCount: number;
  total: number;
  correct: number;
  mastery: number; // 0-100
}

const MASTERY_BUCKETS: Array<{
  min: number;
  label: string;
  bg: string;
  text: string;
}> = [
  { min: 70, label: "Maîtrisé", bg: "bg-emerald-500", text: "text-white" },
  { min: 40, label: "À renforcer", bg: "bg-amber-500", text: "text-white" },
  { min: 0, label: "Faible", bg: "bg-rose-500", text: "text-white" },
];

function getMasteryBucket(pct: number) {
  return MASTERY_BUCKETS.find((b) => pct >= b.min) ?? MASTERY_BUCKETS[2]!;
}

export function ConceptStats() {
  const openBankList = useQuizStore((s) => s.setView);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [banks, setBanks] = useState<BankLite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [sessRes, banksRes] = await Promise.all([
          fetch("/api/sessions"),
          fetch("/api/banks"),
        ]);
        const sessData = sessRes.ok ? await sessRes.json() : [];
        const banksData = banksRes.ok ? await banksRes.json() : [];
        if (!alive) return;
        setSessions(Array.isArray(sessData) ? sessData : []);
        setBanks(Array.isArray(banksData) ? banksData : []);
      } catch {
        // ignore
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const stats = useMemo<ConceptStat[]>(() => {
    // Map bankId → category.
    const bankCat = new Map<string, string>();
    for (const b of banks) bankCat.set(b.id, b.category || "Autre");
    // Aggregate correct/total per category.
    const acc = new Map<
      string,
      { total: number; correct: number; bankIds: Set<string> }
    >();
    for (const s of sessions) {
      if (s.sourceType !== "bank") continue;
      const cat = bankCat.get(s.sourceId) ?? "Autre";
      const cur =
        acc.get(cat) ?? { total: 0, correct: 0, bankIds: new Set<string>() };
      cur.bankIds.add(s.sourceId);
      for (const a of s.answers ?? []) {
        if (a.userAnswer === null) continue; // skip unanswered
        cur.total++;
        if (a.isCorrect === true) cur.correct++;
      }
      acc.set(cat, cur);
    }
    // Also include categories with banks but no sessions yet (mastery 0).
    const allCats = new Set<string>();
    for (const b of banks) allCats.add(b.category || "Autre");
    for (const cat of allCats) {
      if (!acc.has(cat)) {
        acc.set(cat, { total: 0, correct: 0, bankIds: new Set<string>() });
      }
    }
    return Array.from(acc.entries())
      .map(([category, v]) => ({
        category,
        bankCount: v.bankIds.size,
        total: v.total,
        correct: v.correct,
        mastery: v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0,
      }))
      .sort((a, b) => a.mastery - b.mastery);
  }, [sessions, banks]);

  if (loading) {
    return (
      <Card className="p-6">
        <Skeleton className="mb-3 h-6 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </Card>
    );
  }

  if (stats.length === 0) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        Aucune donnée disponible. Faites un quiz pour voir vos statistiques par
        concept.
      </Card>
    );
  }

  const radarData = stats.map((s) => ({
    category:
      s.category.length > 18 ? s.category.slice(0, 18) + "…" : s.category,
    mastery: s.mastery,
  }));

  // Concepts to work on: mastery < 50% AND total ≥ 3.
  const needWork = stats.filter((s) => s.mastery < 50 && s.total >= 3);
  const overallMastery =
    stats.reduce((sum, s) => sum + s.mastery, 0) / stats.length;

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
            <RadarIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold">Statistiques par concept</h3>
            <p className="text-xs text-muted-foreground">
              Maîtrise moyenne : {Math.round(overallMastery)}%
            </p>
          </div>
        </div>
        <Badge variant="outline" className="gap-1">
          <Grid3x3 className="h-3 w-3" />
          {stats.length} catégories
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Radar chart */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Carte radar — maîtrise par catégorie
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="currentColor" strokeOpacity={0.15} />
                <PolarAngleAxis
                  dataKey="category"
                  tick={{ fill: "currentColor", fontSize: 10, opacity: 0.7 }}
                />
                <PolarRadiusAxis
                  domain={[0, 100]}
                  tick={{ fill: "currentColor", fontSize: 9, opacity: 0.5 }}
                  tickCount={5}
                />
                <Radar
                  name="Maîtrise"
                  dataKey="mastery"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.4}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(15, 23, 42, 0.95)",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [`${v}%`, "Maîtrise"]}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Heatmap grid */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Heatmap — maîtrise par concept
          </p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {stats.map((s) => {
              const bucket = getMasteryBucket(s.mastery);
              return (
                <div
                  key={s.category}
                  className={`rounded-lg p-2 ${bucket.bg} ${bucket.text}`}
                  title={`${s.category}: ${s.mastery}% (${s.correct}/${s.total})`}
                >
                  <p className="truncate text-[10px] font-semibold leading-tight">
                    {s.category}
                  </p>
                  <p className="text-base font-bold tabular-nums">
                    {s.mastery}%
                  </p>
                  <p className="text-[9px] opacity-80">
                    {s.total > 0 ? `${s.correct}/${s.total}` : "—"}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm bg-rose-500" /> Faible
              &lt;40%
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" /> À
              renforcer 40-70%
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />{" "}
              Maîtrisé ≥70%
            </span>
          </div>
        </div>
      </div>

      {/* Concepts that need work */}
      {needWork.length > 0 && (
        <div className="mt-5 border-t pt-4">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-rose-700 dark:text-rose-300">
            <AlertTriangle className="h-4 w-4" />
            Concepts à travailler en priorité
          </p>
          <div className="flex flex-wrap gap-2">
            {needWork.map((s) => (
              <Button
                key={s.category}
                size="sm"
                variant="outline"
                className="gap-1.5 border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-950/30"
                onClick={() => openBankList("bank-list")}
              >
                <TrendingUp className="h-3 w-3" />
                {s.category} ({s.mastery}%)
              </Button>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
