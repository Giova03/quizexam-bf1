"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Trophy,
  Clock,
  Target,
  TrendingUp,
  FileDown,
  Activity,
  CalendarDays,
  Award,
  Flame,
  Zap,
} from "lucide-react";
import { usePrefs } from "@/lib/prefs-store";

interface SessionSummary {
  id: string;
  title: string;
  mode: string;
  score: number;
  totalQuestions: number;
  startedAt: string;
  completedAt: string | null;
}

export function DashboardView() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const xp = usePrefs((s) => s.xp);
  const level = usePrefs((s) => s.level);
  const streak = usePrefs((s) => s.streak);
  const badges = usePrefs((s) => s.badges);
  const totalCorrect = usePrefs((s) => s.totalCorrect);
  const totalAnswered = usePrefs((s) => s.totalAnswered);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sessions");
      if (res.ok) setSessions(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const completed = sessions.filter((s) => s.completedAt);
  const totalSessions = completed.length;
  const avgScore =
    totalSessions > 0
      ? Math.round(
          completed.reduce(
            (sum, s) =>
              sum + (s.score / Math.max(1, s.totalQuestions)) * 100,
            0
          ) / totalSessions
        )
      : 0;
  const successRate =
    totalAnswered > 0
      ? Math.round((totalCorrect / totalAnswered) * 100)
      : 0;
  const recent = [...completed]
    .sort(
      (a, b) =>
        new Date(b.completedAt ?? b.startedAt).getTime() -
        new Date(a.completedAt ?? a.startedAt).getTime()
    )
    .slice(0, 8);
  const unlockedBadges = badges.filter((b) => b.unlocked);

  async function exportPdf() {
    setExporting(true);
    try {
      const win = window.open("", "_blank");
      if (!win) return;
      const dateStr = new Date().toLocaleDateString("fr-FR");
      const rows = completed
        .map(
          (s, i) => `<tr><td>${i + 1}</td><td>${s.title}</td><td>${
            s.mode === "immediate" ? "Immédiate" : "Finale"
          }</td><td>${s.score}/${s.totalQuestions}</td><td>${Math.round(
            (s.score / Math.max(1, s.totalQuestions)) * 100
          )}%</td><td>${new Date(
            s.completedAt ?? s.startedAt
          ).toLocaleDateString("fr-FR")}</td></tr>`
        )
        .join("");
      win.document.write(
        `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Rapport QuizExam BF — ${dateStr}</title>
        <style>body{font-family:sans-serif;margin:40px;color:#1a1a1a}
        h1{color:#059669}.kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
        .kpi div{border:1px solid #e5e7eb;border-radius:8px;padding:14px;text-align:center}
        .kpi .v{font-size:26px;font-weight:800;color:#10b981}.kpi .l{font-size:11px;color:#666}
        table{width:100%;border-collapse:collapse;font-size:13px}
        th{background:#f0fdf4;color:#065f46;text-align:left;padding:8px;border-bottom:2px solid #10b981}
        td{padding:8px;border-bottom:1px solid #e5e7eb}
        .footer{margin-top:40px;border-top:1px solid #e5e7eb;padding-top:12px;font-size:11px;color:#888;text-align:center}
        </style></head><body>
        <h1>QuizExam BF — Rapport de progression (${dateStr})</h1>
        <div class="kpi">
        <div><div class="v">${totalSessions}</div><div class="l">Sessions</div></div>
        <div><div class="v">${avgScore}%</div><div class="l">Score moyen</div></div>
        <div><div class="v">${totalAnswered}</div><div class="l">Questions</div></div>
        <div><div class="v">${successRate}%</div><div class="l">Réussite</div></div>
        </div>
        <table><thead><tr><th>#</th><th>Quiz</th><th>Mode</th><th>Score</th><th>%</th><th>Date</th></tr></thead><tbody>${
          rows || "<tr><td colspan=6>Aucune session</td></tr>"
        }</tbody></table>
        <div class="footer">QuizExam BF — BAMOGO Pingdwendé Giovanni</div>
        <script>window.onload=()=>setTimeout(()=>window.print(),400)</script>
        </body></html>`
      );
      win.document.close();
    } finally {
      setExporting(false);
    }
  }

  if (loading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );

  if (totalSessions === 0)
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <Activity className="h-12 w-12 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Aucune session terminée. Commencez un quiz pour voir vos
            statistiques.
          </p>
        </Card>
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tableau de bord analytique</h1>
          <p className="text-muted-foreground">
            Suivez votre progression et vos statistiques
          </p>
        </div>
        <Button
          onClick={exportPdf}
          disabled={exporting}
          className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
        >
          <FileDown className="h-4 w-4" />
          Exporter en PDF
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Sessions totales
              </p>
              <p className="mt-1 text-3xl font-bold">{totalSessions}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
              <Activity className="h-5 w-5" />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Score moyen
              </p>
              <p className="mt-1 text-3xl font-bold">{avgScore}%</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/40">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Questions répondues
              </p>
              <p className="mt-1 text-3xl font-bold">{totalAnswered}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/40">
              <Target className="h-5 w-5" />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Taux de réussite
              </p>
              <p className="mt-1 text-3xl font-bold">{successRate}%</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40">
              <Trophy className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="grid gap-0 sm:grid-cols-4">
          <div className="flex items-center gap-3 border-b p-4 sm:border-b-0 sm:border-r">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-bold">{xp} XP</p>
              <p className="text-xs text-muted-foreground">Niveau {level}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 border-b p-4 sm:border-b-0 sm:border-r">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-500 dark:bg-orange-950/40">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-bold">{streak} jours</p>
              <p className="text-xs text-muted-foreground">Série actuelle</p>
            </div>
          </div>
          <div className="flex items-center gap-3 border-b p-4 sm:border-b-0 sm:border-r">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-500 dark:bg-violet-950/40">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-bold">
                {unlockedBadges.length}/{badges.length}
              </p>
              <p className="text-xs text-muted-foreground">Badges</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-bold">{totalCorrect}</p>
              <p className="text-xs text-muted-foreground">Bonnes réponses</p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b px-5 py-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <Clock className="h-4 w-4" />
            Sessions récentes
          </h2>
        </div>
        <div className="divide-y">
          {recent.map((s) => {
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
                  <p className="text-xs text-muted-foreground">
                    {new Date(
                      s.completedAt ?? s.startedAt
                    ).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    ·{" "}
                    <Badge variant="outline" className="text-[10px]">
                      {s.mode === "immediate" ? "Immédiate" : "Finale"}
                    </Badge>
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-lg font-bold ${
                      pct >= 50 ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {pct}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.score}/{s.totalQuestions}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
