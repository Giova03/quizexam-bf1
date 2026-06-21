"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  BarChart3,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  Star,
  Trash2,
  Bookmark,
} from "lucide-react";
import { usePrefs } from "@/lib/prefs-store";
import { useFavorites } from "@/lib/favorites-store";
import { useQuizStore } from "@/lib/quiz-store";
import { StatsComparison } from "./stats-comparison";

interface SessionAnswer {
  id: string;
  questionText: string;
  correctAnswer: string;
  userAnswer: string | null;
  isCorrect: boolean | null;
  explanation: string;
}

interface SessionSummary {
  id: string;
  title: string;
  mode: string;
  score: number;
  totalQuestions: number;
  startedAt: string;
  completedAt: string | null;
  sourceType: string;
  answers?: SessionAnswer[];
}

export function DashboardView() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [tab, setTab] = useState("overview");

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
      if (res.ok) {
        const data = await res.json();
        setSessions(Array.isArray(data) ? data : []);
      }
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
            (sum, s) => sum + (s.score / Math.max(1, s.totalQuestions)) * 100,
            0
          ) / totalSessions
        )
      : 0;
  const successRate =
    totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
  const unlockedBadges = badges.filter((b) => b.unlocked);

  // Group sessions by title for per-quiz stats
  const quizGroups: Record<string, SessionSummary[]> = {};
  for (const s of completed) {
    const key = s.title;
    if (!quizGroups[key]) quizGroups[key] = [];
    quizGroups[key].push(s);
  }

  const quizStats = Object.entries(quizGroups).map(([title, sessions]) => {
    const total = sessions.length;
    const avgPct = Math.round(
      sessions.reduce(
        (sum, s) => sum + (s.score / Math.max(1, s.totalQuestions)) * 100,
        0
      ) / total
    );
    const best = Math.max(
      ...sessions.map((s) => (s.score / Math.max(1, s.totalQuestions)) * 100)
    );
    const lastDate = sessions[sessions.length - 1]?.completedAt;
    return { title, total, avgPct, best: Math.round(best), lastDate };
  });

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
      const quizRows = quizStats
        .map(
          (q) => `<tr><td>${q.title}</td><td>${q.total}</td><td>${q.avgPct}%</td><td>${q.best}%</td></tr>`
        )
        .join("");
      win.document.write(
        `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Rapport QuizExam BF — ${dateStr}</title>
        <style>body{font-family:sans-serif;margin:40px;color:#1a1a1a}
        h1{color:#059669}.kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
        .kpi div{border:1px solid #e5e7eb;border-radius:8px;padding:14px;text-align:center}
        .kpi .v{font-size:26px;font-weight:800;color:#10b981}.kpi .l{font-size:11px;color:#666}
        table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px}
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
        <h2>Statistiques par quiz</h2>
        <table><thead><tr><th>Quiz</th><th>Sessions</th><th>Score moyen</th><th>Meilleur score</th></tr></thead><tbody>${
          quizRows || "<tr><td colspan=4>Aucune donnée</td></tr>"
        }</tbody></table>
        <h2>Sessions détaillées</h2>
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
            Suivez votre progression et vos statistiques détaillées
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

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="overview" className="gap-1.5">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Vue d&apos;ensemble</span>
          </TabsTrigger>
          <TabsTrigger value="per-quiz" className="gap-1.5">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Par quiz</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Historique</span>
          </TabsTrigger>
          <TabsTrigger value="favorites" className="gap-1.5">
            <Bookmark className="h-4 w-4" />
            <span className="hidden sm:inline">Favoris</span>
          </TabsTrigger>
        </TabsList>

        {/* === Overview Tab === */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Sessions terminées
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

          {/* Gamification strip */}
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

          {/* Badges */}
          <Card className="p-4">
            <p className="mb-3 text-sm font-semibold">
              Badges ({unlockedBadges.length}/{badges.length})
            </p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
              {badges.map((b) => (
                <div
                  key={b.id}
                  className={`flex flex-col items-center gap-1 rounded-xl border-2 p-2 text-center transition-all ${
                    b.unlocked
                      ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30"
                      : "border-dashed border-border opacity-50 grayscale"
                  }`}
                  title={b.description}
                >
                  <Award
                    className={`h-5 w-5 ${b.unlocked ? "text-amber-500" : "text-muted-foreground"}`}
                  />
                  <span className="text-[9px] font-medium leading-tight">
                    {b.label}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Weekly activity chart */}
          <WeeklyChart sessions={completed} />
        </TabsContent>

        {/* === Per-Quiz Tab === */}
        <TabsContent value="per-quiz" className="space-y-3">
          {quizStats.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              Aucune donnée par quiz pour le moment.
            </Card>
          ) : (
            quizStats
              .sort((a, b) => b.total - a.total)
              .map((q) => (
                <Card key={q.title} className="p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{q.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {q.total} session(s) • Dernière:{" "}
                        {q.lastDate
                          ? new Date(q.lastDate).toLocaleDateString("fr-FR")
                          : "N/A"}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Moyenne</p>
                        <p
                          className={`text-xl font-bold ${
                            q.avgPct >= 50 ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {q.avgPct}%
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Meilleur</p>
                        <p className="text-xl font-bold text-emerald-600">
                          {q.best}%
                        </p>
                      </div>
                    </div>
                  </div>
                  <Progress
                    value={q.avgPct}
                    className="mt-3 h-2"
                  />
                </Card>
              ))
          )}
        </TabsContent>

        {/* === History Tab === */}
        <TabsContent value="history" className="space-y-3">
          {completed
            .sort(
              (a, b) =>
                new Date(b.completedAt ?? b.startedAt).getTime() -
                new Date(a.completedAt ?? a.startedAt).getTime()
            )
            .map((s) => {
              const pct = Math.round(
                (s.score / Math.max(1, s.totalQuestions)) * 100
              );
              const isExpanded = expandedSession === s.id;
              const correctCount = s.answers?.filter((a) => a.isCorrect === true).length ?? s.score;
              const wrongCount = s.answers?.filter((a) => a.isCorrect === false).length ?? 0;
              const skippedCount = s.answers?.filter((a) => a.userAnswer === null).length ?? 0;
              return (
                <Card key={s.id} className="overflow-hidden">
                  <button
                    onClick={() => setExpandedSession(isExpanded ? null : s.id)}
                    className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-muted/40"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{s.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(s.completedAt ?? s.startedAt).toLocaleString(
                          "fr-FR",
                          { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }
                        )}{" "}
                        • <Badge variant="outline" className="text-[10px]">
                          {s.mode === "immediate" ? "Immédiate" : "Finale"}
                        </Badge>
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p
                          className={`text-xl font-bold ${
                            pct >= 50 ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {pct}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {s.score}/{s.totalQuestions}
                        </p>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                  {isExpanded && s.answers && (
                    <div className="border-t bg-muted/20 p-4">
                      <div className="mb-3 flex gap-4 text-xs">
                        <span className="flex items-center gap-1 text-emerald-600">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {correctCount} correctes
                        </span>
                        <span className="flex items-center gap-1 text-rose-600">
                          <XCircle className="h-3.5 w-3.5" />
                          {wrongCount} fausses
                        </span>
                        {skippedCount > 0 && (
                          <span className="text-muted-foreground">
                            {skippedCount} omises
                          </span>
                        )}
                      </div>
                      <div className="max-h-[300px] space-y-2 overflow-y-auto">
                        {s.answers.map((a, idx) => (
                          <div
                            key={a.id}
                            className={`rounded-lg border p-2.5 text-xs ${
                              a.isCorrect === true
                                ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20"
                                : a.isCorrect === false
                                  ? "border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/20"
                                  : "border-border bg-muted/30"
                            }`}
                          >
                            <p className="font-medium">
                              {idx + 1}. {a.questionText}
                            </p>
                            <p className="mt-1 text-muted-foreground">
                              Bonne réponse: {a.correctAnswer}
                              {a.userAnswer && ` • Votre réponse: ${a.userAnswer}`}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
        </TabsContent>

        {/* === Favorites Tab === */}
        <TabsContent value="favorites" className="space-y-3">
          <FavoritesList />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// === Weekly chart component ===
function WeeklyChart({ sessions }: { sessions: SessionSummary[] }) {
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      date: d,
      label: d.toLocaleDateString("fr-FR", { weekday: "short" }),
      count: 0,
      avgPct: 0,
      scores: [] as number[],
    };
  });

  for (const s of sessions) {
    const d = new Date(s.completedAt ?? s.startedAt);
    const dayDiff = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (dayDiff >= 0 && dayDiff < 7) {
      const idx = 6 - dayDiff;
      last7Days[idx].count++;
      const pct = (s.score / Math.max(1, s.totalQuestions)) * 100;
      last7Days[idx].scores.push(pct);
    }
  }

  for (const day of last7Days) {
    if (day.scores.length > 0) {
      day.avgPct = Math.round(day.scores.reduce((a, b) => a + b, 0) / day.scores.length);
    }
  }

  const maxCount = Math.max(1, ...last7Days.map((d) => d.count));

  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-emerald-600" />
          <h3 className="text-sm font-semibold">Activité des 7 derniers jours</h3>
        </div>
        <Badge variant="secondary">{last7Days.reduce((sum, d) => sum + d.count, 0)} sessions</Badge>
      </div>
      <div className="flex h-32 items-end justify-between gap-2">
        {last7Days.map((day, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex w-full flex-1 items-end justify-center">
              <div
                className={`w-full max-w-[40px] rounded-t-md transition-all ${
                  day.count > 0 ? "bg-gradient-to-t from-emerald-500 to-teal-400" : "bg-muted"
                }`}
                style={{ height: `${Math.max(8, (day.count / maxCount) * 100)}%` }}
                title={`${day.count} session(s) · ${day.avgPct}%`}
              />
            </div>
            <span className="text-[10px] text-muted-foreground">{day.label}</span>
            {day.count > 0 && (
              <span className="text-[10px] font-semibold text-emerald-600">{day.avgPct}%</span>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

// === Favorites list component ===
function FavoritesList() {
  const favorites = useFavorites((s) => s.favorites);
  const removeFavorite = useFavorites((s) => s.removeFavorite);
  const clearAll = useFavorites((s) => s.clearAll);
  const openBank = useQuizStore((s) => s.openBank);

  if (favorites.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 p-12 text-center">
        <Bookmark className="h-12 w-12 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          Aucun favori pour le moment. Marquez des questions pendant vos sessions pour les retrouver ici.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {favorites.length} question(s) marquée(s) comme favorite(s)
        </p>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={clearAll}>
          <Trash2 className="h-3.5 w-3.5" />
          Tout effacer
        </Button>
      </div>
      <div className="max-h-[600px] space-y-2 overflow-y-auto">
        {favorites.map((f) => (
          <Card key={f.id} className="p-3 sm:p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="flex-1 break-words text-sm font-medium leading-snug">
                {f.question}
              </p>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => removeFavorite(f.id)}
              >
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              </Button>
            </div>
            <div className="mt-2 flex flex-col gap-1 text-xs">
              <p className="text-muted-foreground">
                <span className="font-semibold text-emerald-600">Bonne réponse:</span> {f.correctAnswer}
              </p>
              <p className="break-words text-muted-foreground">
                <span className="font-semibold text-amber-600">Explication:</span> {f.explanation}
              </p>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 border-t pt-2">
              <Badge variant="outline" className="text-[10px]">
                {f.bankTitle}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={() => openBank(f.bankId)}
              >
                Ouvrir la banque
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
