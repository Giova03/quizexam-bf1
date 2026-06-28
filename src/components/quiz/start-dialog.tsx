"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
<<<<<<< Updated upstream
import { Zap, Flag, CheckCircle2, ListChecks, BarChart3 } from "lucide-react";
=======
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Zap, Flag, CheckCircle2, ListChecks, Gauge } from "lucide-react";
>>>>>>> Stashed changes
import type { CorrectionMode } from "@/lib/types";

export type DifficultyFilter = "all" | "easy" | "medium" | "hard";

interface StartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle: string;
  questionCount: number;
<<<<<<< Updated upstream
  /**
   * Optional difficulty counts — when provided, the dialog shows a difficulty
   * selector and the `onStart` callback receives the chosen difficulty.
   * When omitted, the difficulty selector is hidden and `onStart` is called
   * with "all" (no filtering).
   */
  difficultyCounts?: {
    all: number;
    easy: number;
    medium: number;
    hard: number;
  };
  /** Initial difficulty selection (default "all"). */
  initialDifficulty?: DifficultyFilter;
  onStart: (mode: CorrectionMode, difficulty: DifficultyFilter) => Promise<void>;
}

const DIFFICULTY_OPTIONS: Array<{
  value: DifficultyFilter;
  label: string;
  cls: string;
}> = [
  {
    value: "all",
    label: "Toutes",
    cls:
      "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
  },
  {
    value: "easy",
    label: "Facile",
    cls:
      "border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300",
  },
  {
    value: "medium",
    label: "Moyen",
    cls:
      "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
  },
  {
    value: "hard",
    label: "Difficile",
    cls:
      "border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300",
  },
];
=======
  /** Whether to show the difficulty selector (hidden for exam-less banks). */
  showDifficultyFilter?: boolean;
  onStart: (mode: CorrectionMode, difficulty: DifficultyFilter) => Promise<void>;
}

const DIFFICULTY_LABELS: Record<DifficultyFilter, string> = {
  all: "Toutes les difficultés",
  easy: "Facile uniquement",
  medium: "Moyen uniquement",
  hard: "Difficile uniquement",
};
>>>>>>> Stashed changes

export function StartDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  questionCount,
<<<<<<< Updated upstream
  difficultyCounts,
  initialDifficulty = "all",
  onStart,
}: StartDialogProps) {
  const [mode, setMode] = useState<CorrectionMode>("immediate");
  const [difficulty, setDifficulty] = useState<DifficultyFilter>(
    initialDifficulty
  );
=======
  showDifficultyFilter = true,
  onStart,
}: StartDialogProps) {
  const [mode, setMode] = useState<CorrectionMode>("immediate");
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("all");
>>>>>>> Stashed changes
  const [starting, setStarting] = useState(false);

  // Compute the live question count based on the selected difficulty.
  const liveCount =
    difficultyCounts && difficulty !== "all"
      ? (difficultyCounts[difficulty] ?? 0)
      : questionCount;

  async function handleStart() {
    if (liveCount === 0) return;
    setStarting(true);
    try {
      await onStart(mode, difficulty);
    } finally {
      setStarting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">Démarrer la session</DialogTitle>
          <DialogDescription className="text-base">
            {title} &middot; {liveCount} question{liveCount > 1 ? "s" : ""}
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">{subtitle}</p>

<<<<<<< Updated upstream
        {/* Difficulty selector (only when counts are provided) */}
        {difficultyCounts && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <BarChart3 className="h-4 w-4 text-amber-600" />
              Niveau de difficulté
            </div>
            <p className="text-xs text-muted-foreground">
              Filtrez les questions par difficulté. Sélectionnez « Toutes »
              pour tout inclure.
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {DIFFICULTY_OPTIONS.map((opt) => {
                const count =
                  opt.value === "all"
                    ? difficultyCounts.all
                    : difficultyCounts[opt.value];
                const isSelected = difficulty === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDifficulty(opt.value)}
                    className={`flex flex-col items-center gap-1 rounded-lg border-2 px-2 py-2 text-xs font-medium transition-all hover:scale-[1.02] ${
                      isSelected
                        ? `${opt.cls} ring-2 ring-offset-1`
                        : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60"
                    }`}
                    aria-pressed={isSelected}
                  >
                    <span>{opt.label}</span>
                    <span className="text-[10px] font-normal opacity-70">
                      {count} Q
                    </span>
                  </button>
                );
              })}
            </div>
            {liveCount === 0 && (
              <div className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
                ⚠️ Aucune question pour ce niveau de difficulté. Choisissez une
                autre difficulté.
              </div>
=======
        {showDifficultyFilter && (
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm font-semibold">
              <Gauge className="h-4 w-4 text-emerald-600" />
              Niveau de difficulté
            </Label>
            <Select
              value={difficulty}
              onValueChange={(v) => setDifficulty(v as DifficultyFilter)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(DIFFICULTY_LABELS) as DifficultyFilter[]).map((d) => (
                  <SelectItem key={d} value={d}>
                    {DIFFICULTY_LABELS[d]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {difficulty !== "all" && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                ⚠️ Seules les questions « {DIFFICULTY_LABELS[difficulty]} » seront
                incluses. Le nombre réel de questions peut être inférieur.
              </p>
>>>>>>> Stashed changes
            )}
          </div>
        )}

        <RadioGroup
          value={mode}
          onValueChange={(v) => setMode(v as CorrectionMode)}
          className="gap-3"
        >
          <Label
            htmlFor="mode-immediate"
            className="cursor-pointer"
            aria-label="Mode correction immédiate"
          >
            <Card
              className={`flex gap-3 p-4 transition-all hover:shadow-md ${
                mode === "immediate"
                  ? "border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20"
                  : ""
              }`}
            >
              <RadioGroupItem
                value="immediate"
                id="mode-immediate"
                className="mt-1"
              />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 font-semibold">
                  <Zap className="h-4 w-4 text-emerald-600" />
                  Mode 1 — Correction immédiate
                </div>
                <p className="text-sm text-muted-foreground">
                  La bonne réponse et l&apos;explication s&apos;affichent
                  directement après chaque réponse choisie.
                </p>
              </div>
            </Card>
          </Label>

          <Label
            htmlFor="mode-final"
            className="cursor-pointer"
            aria-label="Mode correction finale"
          >
            <Card
              className={`flex gap-3 p-4 transition-all hover:shadow-md ${
                mode === "final"
                  ? "border-violet-500 ring-2 ring-violet-500/30 bg-violet-50/50 dark:bg-violet-950/20"
                  : ""
              }`}
            >
              <RadioGroupItem
                value="final"
                id="mode-final"
                className="mt-1"
              />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 font-semibold">
                  <Flag className="h-4 w-4 text-violet-600" />
                  Mode 2 — Correction finale
                </div>
                <p className="text-sm text-muted-foreground">
                  Les bonnes réponses et explications sont regroupées et
                  affichées uniquement à la toute fin du quiz.
                </p>
              </div>
            </Card>
          </Label>
        </RadioGroup>

        <div className="flex items-center gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
          <ListChecks className="h-4 w-4 shrink-0" />
          <span>
            <strong>Mode immédiat</strong> : idéal pour l&apos;apprentissage.
            <strong> Mode final</strong> : simule les conditions d&apos;examen
            réel.
          </span>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleStart}
            disabled={starting || liveCount === 0}
            className="gap-2"
          >
            {starting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Création…
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Commencer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
