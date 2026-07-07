"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useQuizStore } from "@/lib/quiz-store";
import { toast } from "sonner";
import {
  CalendarDays,
  Sparkles,
  CheckCircle2,
  Clock,
  ListChecks,
  Play,
  RefreshCw,
  Trash2,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

/**
 * StudyPlanView — full-page view for the AI-generated personalised study
 * plan.
 *
 * Features:
 *   - A form to (re)generate a plan: target exam, days until exam, current
 *     level.
 *   - Day-by-day breakdown: each day is a card with focus, banks,
 *     duration, and exercises. A check-circle toggles "done" state.
 *   - Visual timeline: a horizontal progress bar at the top showing how
 *     many days are completed.
 *   - The plan is persisted to localStorage so the user keeps it between
 *     sessions. A "Régénérer" button calls the API again, and a "Effacer"
 *     button removes the saved plan.
 *
 * The view is added to the global view router via quiz-store.ts
 * (openStudyPlan) and rendered by page.tsx.
 */

interface PlanDay {
  day: number;
  focus: string;
  banks: string[];
  duration: number;
  exercises: string[];
}

interface StudyPlanResponse {
  plan: PlanDay[];
  summary: string;
  generatedAt: string;
  source: "ai" | "fallback";
}

const STORAGE_KEY = "study-plan:v1";
const COMPLETED_KEY = "study-plan:completed-days:v1";

const TARGET_EXAMS = [
  "Concours Administration",
  "Concours Justice",
  "Concours Santé & Social",
  "Concours Économie & Finance",
  "Concours Éducation & Formation",
  "Concours Informatique",
  "BEPC",
  "BAC",
  "Licence",
];

const LEVELS: Array<{ value: string; label: string }> = [
  { value: "BEPC", label: "BEPC" },
  { value: "BAC", label: "BAC" },
  { value: "LICENCE", label: "Licence" },
  { value: "CONCOURS", label: "Concours" },
  { value: "TOUS", label: "Tous niveaux" },
];

export function StudyPlanView() {
  const goHome = useQuizStore((s) => s.goHome);
  const openBank = useQuizStore((s) => s.openBank);
  const banks = useQuizStore((s) => s.banks);

  const [plan, setPlan] = useState<StudyPlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Form state.
  const [targetExam, setTargetExam] = useState<string>(TARGET_EXAMS[0]);
  const [daysUntil, setDaysUntil] = useState<number>(7);
  const [currentLevel, setCurrentLevel] = useState<string>("CONCOURS");

  // Completed days set (persisted to localStorage).
  const [completedDays, setCompletedDays] = useState<Set<number>>(new Set());

  // --- Load saved plan + completed days on mount -------------------------
  const loadFromStorage = useCallback(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StudyPlanResponse;
        if (parsed && Array.isArray(parsed.plan)) {
          setPlan(parsed);
        }
      }
      const rawDone = window.localStorage.getItem(COMPLETED_KEY);
      if (rawDone) {
        const arr = JSON.parse(rawDone) as number[];
        if (Array.isArray(arr)) setCompletedDays(new Set(arr));
      }
    } catch {
      // ignore (corrupted localStorage)
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  // --- Persist completed days whenever they change ------------------------
  useEffect(() => {
    try {
      window.localStorage.setItem(
        COMPLETED_KEY,
        JSON.stringify(Array.from(completedDays)),
      );
    } catch {
      // ignore
    }
  }, [completedDays]);

  // --- Generate (or regenerate) the plan via the API ----------------------
  const generate = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/study-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetExam,
          daysUntil,
          currentLevel,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.error ?? "Échec de la génération du plan.");
        return;
      }
      const data = (await res.json()) as StudyPlanResponse;
      setPlan(data);
      setCompletedDays(new Set()); // reset progress when a new plan is generated
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        // ignore
      }
      toast.success(
        data.source === "ai"
          ? "Plan généré par IA ✓"
          : "Plan de secours généré (IA momentanément indisponible).",
      );
    } catch (e) {
      console.error("study-plan generation error:", e);
      toast.error("Erreur réseau.");
    } finally {
      setGenerating(false);
    }
  }, [targetExam, daysUntil, currentLevel]);

  // --- Toggle a day as completed ------------------------------------------
  function toggleDay(day: number) {
    setCompletedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  function clearPlan() {
    setPlan(null);
    setCompletedDays(new Set());
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(COMPLETED_KEY);
    } catch {
      // ignore
    }
    toast.success("Plan effacé.");
  }

  // --- Resolve a bank title → bank id (so users can open the bank) -------
  const bankTitleToId = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of banks) {
      map.set(b.title.toLowerCase(), b.id);
    }
    return map;
  }, [banks]);

  // --- Derived stats -----------------------------------------------------
  const totalDays = plan?.plan.length ?? 0;
  const doneCount = completedDays.size;
  const progressPct =
    totalDays > 0 ? Math.round((doneCount / totalDays) * 100) : 0;
  const totalMinutes =
    plan?.plan.reduce((acc, d) => acc + d.duration, 0) ?? 0;

  // --- Loading state -----------------------------------------------------
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={goHome}
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
            Accueil
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <CalendarDays className="h-6 w-6 text-violet-600" />
              Parcours personnalisé IA
            </h1>
            <p className="text-sm text-muted-foreground">
              Plan de révision sur-mesure généré à partir de votre
              historique.
            </p>
          </div>
        </div>
        {plan && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={clearPlan}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Effacer le plan
          </Button>
        )}
      </div>

      {/* Generator form */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 p-4 text-white">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <h3 className="text-sm font-semibold">
              {plan ? "Régénérer le plan" : "Générer mon plan"}
            </h3>
          </div>
          <p className="mt-1 text-xs text-white/80">
            Plus votre historique est riche, plus le plan sera pertinent.
          </p>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="targetExam" className="text-xs">
              Examen cible
            </Label>
            <Select value={targetExam} onValueChange={setTargetExam}>
              <SelectTrigger id="targetExam" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TARGET_EXAMS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="daysUntil" className="text-xs">
              Jours avant l&apos;examen
            </Label>
            <Input
              id="daysUntil"
              type="number"
              min={1}
              max={60}
              value={daysUntil}
              onChange={(e) =>
                setDaysUntil(
                  Math.max(
                    1,
                    Math.min(60, parseInt(e.target.value || "1", 10) || 1),
                  ),
                )
              }
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="currentLevel" className="text-xs">
              Niveau actuel
            </Label>
            <Select value={currentLevel} onValueChange={setCurrentLevel}>
              <SelectTrigger id="currentLevel" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEVELS.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-3 flex justify-end">
            <Button
              onClick={generate}
              disabled={generating}
              className="gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:opacity-90"
            >
              {generating ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Génération…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {plan ? "Régénérer le plan" : "Générer mon plan"}
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Existing plan + timeline */}
      {plan ? (
        <>
          {/* Summary + progress */}
          <Card className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="secondary"
                    className={
                      plan.source === "ai"
                        ? "gap-1 bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300"
                        : "gap-1 bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                    }
                  >
                    {plan.source === "ai" ? (
                      <Sparkles className="h-3 w-3" />
                    ) : (
                      <AlertTriangle className="h-3 w-3" />
                    )}
                    {plan.source === "ai"
                      ? "Généré par IA"
                      : "Plan de secours"}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {totalDays} jour(s)
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Clock className="h-3 w-3" />
                    {Math.round(totalMinutes / 60)}h {totalMinutes % 60}min
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {doneCount}/{totalDays} fait(s)
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {plan.summary}
                </p>
              </div>
              <div className="w-full sm:w-48">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Progression</span>
                  <span className="font-semibold text-violet-600">
                    {progressPct}%
                  </span>
                </div>
                <Progress value={progressPct} className="h-2" />
              </div>
            </div>
          </Card>

          {/* Visual timeline (compact horizontal) */}
          <Card className="p-4">
            <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
              Chronologie
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {plan.plan.map((d) => {
                const done = completedDays.has(d.day);
                return (
                  <button
                    key={d.day}
                    onClick={() => toggleDay(d.day)}
                    title={`Jour ${d.day} — ${d.focus}`}
                    className={`flex h-9 min-w-9 shrink-0 items-center justify-center rounded-lg border-2 px-2 text-xs font-medium transition-all ${
                      done
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                        : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60"
                    }`}
                    aria-pressed={done}
                    aria-label={`Jour ${d.day}: ${d.focus}`}
                  >
                    {done ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <span>J{d.day}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Day-by-day breakdown */}
          <div className="space-y-3">
            {plan.plan.map((d) => {
              const done = completedDays.has(d.day);
              return (
                <Card
                  key={d.day}
                  className={`overflow-hidden transition-all ${
                    done
                      ? "border-emerald-300 bg-emerald-50/40 dark:border-emerald-800/60 dark:bg-emerald-950/20"
                      : ""
                  }`}
                >
                  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
                    {/* Day number / done toggle */}
                    <button
                      onClick={() => toggleDay(d.day)}
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 font-bold transition-all ${
                        done
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-300"
                      }`}
                      aria-pressed={done}
                      aria-label={`Marquer le jour ${d.day} comme ${done ? "à faire" : "terminé"}`}
                    >
                      {done ? (
                        <CheckCircle2 className="h-6 w-6" />
                      ) : (
                        <span>{d.day}</span>
                      )}
                    </button>

                    {/* Day content */}
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold leading-tight">
                            Jour {d.day} — {d.focus}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <Badge variant="outline" className="gap-1 text-[10px]">
                              <Clock className="h-2.5 w-2.5" />
                              {d.duration} min
                            </Badge>
                            {d.banks.map((b, i) => {
                              const bankId = bankTitleToId.get(b.toLowerCase());
                              return (
                                <Badge
                                  key={`${b}-${i}`}
                                  variant="secondary"
                                  className="gap-1 text-[10px]"
                                >
                                  {bankId ? (
                                    <button
                                      onClick={() => bankId && openBank(bankId)}
                                      className="hover:underline"
                                    >
                                      {b}
                                    </button>
                                  ) : (
                                    <span>{b}</span>
                                  )}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                        {done && (
                          <Badge className="gap-1 bg-emerald-500 text-white hover:bg-emerald-500">
                            <CheckCircle2 className="h-3 w-3" />
                            Terminé
                          </Badge>
                        )}
                      </div>

                      {d.exercises.length > 0 && (
                        <div className="rounded-lg bg-muted/40 p-2.5">
                          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            <ListChecks className="h-3 w-3" />
                            Exercices
                          </div>
                          <ul className="space-y-1">
                            {d.exercises.map((ex, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-1.5 text-xs text-muted-foreground"
                              >
                                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-violet-400" />
                                <span>{ex}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Footer actions */}
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={generate}
              disabled={generating}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Régénérer
            </Button>
          </div>
        </>
      ) : (
        // Empty state
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-300">
            <Play className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-semibold">
            Aucun plan de révision pour le moment
          </h3>
          <p className="max-w-md text-sm text-muted-foreground">
            Choisissez votre examen cible, le nombre de jours avant
            l&apos;épreuve et votre niveau, puis cliquez sur « Générer mon
            plan ». L&apos;IA crée un parcours personnalisé basé sur vos
            zones de faiblesse et points forts.
          </p>
          <Button
            onClick={generate}
            disabled={generating}
            className="gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:opacity-90"
          >
            {generating ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Génération…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Générer mon plan
              </>
            )}
          </Button>
        </Card>
      )}
    </div>
  );
}
