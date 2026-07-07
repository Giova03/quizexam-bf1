"use client";

import { useMemo, useCallback } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useQuizStore } from "@/lib/quiz-store";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Circle,
  Flame,
  Trophy,
  Target,
  Brain,
  Zap,
  RotateCcw,
} from "lucide-react";

/**
 * GuidedPath — "Parcours guidé 30 jours" (Feature E6.3).
 *
 * A 30-day structured program:
 *   - Days 1-10: Foundations (easy questions)
 *   - Days 11-20: Intermediate (medium questions)
 *   - Days 21-30: Exam practice (hard + timed)
 *
 * Progress tracking is in localStorage (key: "qebf-guided-path").
 * Each day has a checklist of 3 tasks (complete a quiz, reach a target
 * score, complete a daily challenge). The user ticks them off.
 *
 * Clicking a day opens the relevant bank-list view so the user can pick
 * a bank and start a quiz at the right difficulty.
 */

const STORAGE_KEY = "qebf-guided-path";

interface GuidedPathState {
  /** Map of "day-taskIndex" → done. */
  done: Record<string, boolean>;
  toggleTask: (day: number, taskIdx: number) => void;
  reset: () => void;
}

/**
 * Persisted store (zustand + localStorage) — survives reloads and
 * avoids the setState-in-effect lint rule entirely (zustand handles
 * the hydration internally).
 */
const useGuidedPathStore = create<GuidedPathState>()(
  persist(
    (set) => ({
      done: {},
      toggleTask: (day, taskIdx) =>
        set((s) => {
          const key = `${day}-${taskIdx}`;
          const next = { ...s.done, [key]: !s.done[key] };
          return { done: next };
        }),
      reset: () => set({ done: {} }),
    }),
    { name: STORAGE_KEY },
  ),
);

type Phase = "foundations" | "intermediate" | "exam";

interface DayPlan {
  day: number;
  phase: Phase;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  tasks: string[];
  /** Optional XP reward for completing the day. */
  xpReward: number;
}

interface ProgressState {
  /** Set of "day-taskIndex" keys that are checked off. */
  done: Record<string, boolean>;
  /** Days fully completed (all tasks ticked). */
  completedDays: number[];
}

const PHASES: Record<
  Phase,
  { label: string; description: string; color: string; icon: typeof Target }
> = {
  foundations: {
    label: "Fondations",
    description: "Maîtrisez les bases avec des questions faciles",
    color: "emerald",
    icon: Target,
  },
  intermediate: {
    label: "Intermédiaire",
    description: "Renforcez vos acquis avec des questions moyennes",
    color: "amber",
    icon: Brain,
  },
  exam: {
    label: "Préparation Examen",
    description: "Conditions réelles — questions difficiles + chrono",
    color: "rose",
    icon: Trophy,
  },
};

function buildDayPlan(day: number): DayPlan {
  let phase: Phase;
  let difficulty: "easy" | "medium" | "hard";
  if (day <= 10) {
    phase = "foundations";
    difficulty = "easy";
  } else if (day <= 20) {
    phase = "intermediate";
    difficulty = "medium";
  } else {
    phase = "exam";
    difficulty = "hard";
  }

  const titles: Record<Phase, string[]> = {
    foundations: [
      "Découverte — Premiers pas",
      "Vocabulaire & notions essentielles",
      "Calcul mental & logique de base",
      "Lecture compréhension",
      "Culture générale — Bases",
      "Méthodologie — Bien répondre à un QCM",
      "Récapitulatif & quiz mixte",
      "Repérage des pièges fréquents",
      "Travail sur les notions faibles",
      "Mini-exam blanc (20 questions)",
    ],
    intermediate: [
      "Approfondissement — Niveau moyen",
      "Croisement de notions",
      "Vitesse — 20 questions en 15 min",
      "Étude de cas concrets",
      "Révision espacée — Jour 1-10",
      "Quiz thématique difficile",
      "Analyse des erreurs",
      "Renforcement zones faibles",
      "Quiz chronométré 30 questions",
      "Bilan mi-parcours",
    ],
    exam: [
      "Examen blanc — Conditions réelles",
      "Quiz chronométré — 40 questions",
      "Travail sur les questions ratées",
      "Examen blanc — Thématique 1",
      "Révision espacée — Toutes zones",
      "Examen blanc — Thématique 2",
      "Quiz difficulté maximale",
      "Examen blanc complet — 50 Q",
      "Dernière révision — Points clés",
      "Examen final — 50 questions chrono",
    ],
  };

  const idx = day <= 10 ? day - 1 : day <= 20 ? day - 11 : day - 21;
  const title = titles[phase][idx] ?? `Jour ${day}`;

  const tasks: string[] = [
    `Faire 1 quiz en difficulté « ${difficulty === "easy" ? "Facile" : difficulty === "medium" ? "Moyen" : "Difficile"} »`,
    "Atteindre au moins 60% de réussite",
    "Lire les explications de chaque erreur",
  ];
  if (phase === "exam") {
    tasks[0] = "Faire 1 quiz chronométré (difficulté Difficile)";
    tasks.push("Respecter le temps imparti (≤ 1 min/question)");
  }
  if (day % 5 === 0) {
    tasks.push("Faire le défi quotidien");
  }

  const xpReward = phase === "foundations" ? 30 : phase === "intermediate" ? 50 : 80;

  return { day, phase, title, difficulty, tasks, xpReward };
}

const ALL_DAYS: DayPlan[] = Array.from({ length: 30 }, (_, i) =>
  buildDayPlan(i + 1),
);

export function GuidedPath() {
  const goHome = useQuizStore((s) => s.goHome);
  const openBankList = useQuizStore((s) => s.setView);
  // Persistent store (zustand + localStorage) — handles hydration without
  // any setState-in-effect.
  const done = useGuidedPathStore((s) => s.done);
  const toggleTaskStore = useGuidedPathStore((s) => s.toggleTask);
  const resetStore = useGuidedPathStore((s) => s.reset);

  const completedDays = useMemo(
    () =>
      ALL_DAYS.filter((day) =>
        day.tasks.every((_, i) => done[`${day.day}-${i}`]),
      ).map((d) => d.day),
    [done],
  );

  const toggleTask = useCallback(
    (day: number, taskIdx: number) => toggleTaskStore(day, taskIdx),
    [toggleTaskStore],
  );

  const resetPath = () => {
    if (
      !confirm(
        "Réinitialiser tout le parcours ? Vos progression sera perdue.",
      )
    )
      return;
    resetStore();
    toast.success("Parcours réinitialisé.");
  };

  const completedCount = completedDays.length;
  const totalXp = completedDays.reduce(
    (sum, day) => sum + (ALL_DAYS[day - 1]?.xpReward ?? 0),
    0,
  );
  const globalProgress = Math.round((completedCount / 30) * 100);

  // Find the current day (first non-completed).
  const currentDay =
    ALL_DAYS.find((d) => !completedDays.includes(d.day))?.day ?? 30;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="gap-2" onClick={goHome}>
          <ArrowLeft className="h-4 w-4" />
          Retour à l&apos;accueil
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={resetPath}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Réinitialiser
        </Button>
      </div>

      {/* Hero — title + overall progress */}
      <Card className="overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500" />
        <div className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                <CalendarDays className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Parcours guidé 30 jours</h1>
                <p className="text-sm text-muted-foreground">
                  Un programme structuré pour bien vous préparer.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className="gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <CheckCircle2 className="h-3 w-3" />
                {completedCount}/30 jours
              </Badge>
              <Badge className="gap-1 bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                <Zap className="h-3 w-3" />
                {totalXp} XP gagnés
              </Badge>
              <Badge className="gap-1 bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                <Flame className="h-3 w-3" />
                Jour courant : {currentDay}
              </Badge>
            </div>
          </div>
          <div className="mt-4">
            <Progress value={globalProgress} className="h-2" />
            <p className="mt-1 text-right text-xs text-muted-foreground">
              {globalProgress}% du parcours complété
            </p>
          </div>
        </div>
      </Card>

      {/* Phase sections */}
      {(["foundations", "intermediate", "exam"] as Phase[]).map((phase) => {
        const phaseInfo = PHASES[phase];
        const Icon = phaseInfo.icon;
        const phaseDays = ALL_DAYS.filter((d) => d.phase === phase);
        const phaseCompleted = phaseDays.filter((d) =>
          completedDays.includes(d.day),
        ).length;
        return (
          <div key={phase} className="space-y-3">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg bg-${phaseInfo.color}-100 text-${phaseInfo.color}-700 dark:bg-${phaseInfo.color}-950/40 dark:text-${phaseInfo.color}-300`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold">
                  {phase === "foundations"
                    ? "Jours 1-10"
                    : phase === "intermediate"
                      ? "Jours 11-20"
                      : "Jours 21-30"}
                  {" · "}
                  {phaseInfo.label}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {phaseInfo.description} · {phaseCompleted}/{phaseDays.length}{" "}
                  jours
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {phaseDays.map((day) => {
                const isCompleted = completedDays.includes(day.day);
                const isCurrent = day.day === currentDay;
                return (
                  <Card
                    key={day.day}
                    className={`p-4 transition-all ${
                      isCompleted
                        ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20"
                        : isCurrent
                          ? "border-violet-400 ring-2 ring-violet-200 dark:ring-violet-900"
                          : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            isCompleted
                              ? "bg-emerald-500 text-white"
                              : isCurrent
                                ? "bg-violet-500 text-white"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            day.day
                          )}
                        </div>
                        <div>
                          <p className="font-semibold leading-tight">
                            Jour {day.day} — {day.title}
                          </p>
                          <Badge
                            variant="outline"
                            className="mt-1 gap-1 text-[10px]"
                          >
                            {day.difficulty === "easy"
                              ? "Facile"
                              : day.difficulty === "medium"
                                ? "Moyen"
                                : "Difficile"}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className="ml-1 gap-1 text-[10px]"
                          >
                            <Zap className="h-2.5 w-2.5" />+{day.xpReward} XP
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <ul className="mt-3 space-y-1.5">
                      {day.tasks.map((task, i) => {
                        const key = `${day.day}-${i}`;
                        const isDone = !!done[key];
                        return (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-sm"
                          >
                            <Checkbox
                              checked={isDone}
                              onCheckedChange={() => toggleTask(day.day, i)}
                              className="mt-0.5"
                            />
                            <span
                              className={
                                isDone
                                  ? "text-muted-foreground line-through"
                                  : ""
                              }
                            >
                              {task}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                    {!isCompleted && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3 w-full gap-2"
                        onClick={() => openBankList("bank-list")}
                      >
                        <Circle className="h-3.5 w-3.5" />
                        Commencer ce jour
                      </Button>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      {completedCount === 30 && (
        <Card className="border-amber-300 bg-amber-50 p-6 text-center dark:border-amber-700 dark:bg-amber-950/30">
          <Trophy className="mx-auto h-12 w-12 text-amber-500" />
          <h2 className="mt-2 text-xl font-bold">Parcours terminé ! 🎉</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Vous avez complété les 30 jours. Vous êtes prêt pour votre examen.
          </p>
        </Card>
      )}
    </div>
  );
}
