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
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Zap,
  Flag,
  CheckCircle2,
  ListChecks,
  BarChart3,
  GraduationCap,
} from "lucide-react";
import type { CorrectionMode } from "@/lib/types";
import {
  getEducationLevelMeta,
  type EducationLevel,
} from "./education-level-selector";

export type DifficultyFilter = "all" | "easy" | "medium" | "hard";

interface StartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle: string;
  questionCount: number;
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

  /**
   * Education level of the bank being started (added in E1).
   * When provided, a level badge is shown next to the title. If the bank is
   * tagged "TOUS" (applies to every level), no badge is shown.
   */
  educationLevel?: string;

  /**
   * Optional per-level counts for questions inside the bank (added in E1).
   * When provided AND `educationLevel !== "TOUS"`, an in-bank level filter is
   * shown so the user can choose to play only the questions tagged with a
   * specific level (useful when a bank aggregates multiple levels).
   *
   * The "all" key counts every question in the bank. The other keys count
   * only questions explicitly tagged with that level.
   */
  educationLevelCounts?: Partial<Record<EducationLevel, number>>;

  /**
   * Initial education-level-in-bank selection (default "all").
   * Only meaningful when `educationLevelCounts` is provided.
   */
  initialEducationLevelInBank?: EducationLevel | "all";

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

export function StartDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  questionCount,
  difficultyCounts,
  initialDifficulty = "all",
  educationLevel,
  educationLevelCounts,
  initialEducationLevelInBank = "all",
  onStart,
}: StartDialogProps) {
  const [mode, setMode] = useState<CorrectionMode>("immediate");
  const [difficulty, setDifficulty] = useState<DifficultyFilter>(
    initialDifficulty
  );
  const [levelInBank, setLevelInBank] = useState<EducationLevel | "all">(
    initialEducationLevelInBank,
  );
  const [starting, setStarting] = useState(false);

  // Compute the live question count based on the selected difficulty.
  // When the in-bank level filter is active (and not "all"), we further
  // restrict the count to questions tagged with that level — combining both
  // filters so the user sees exactly what will be played.
  const liveCount = (() => {
    let count =
      difficultyCounts && difficulty !== "all"
        ? (difficultyCounts[difficulty] ?? 0)
        : questionCount;
    if (educationLevelCounts && levelInBank !== "all") {
      const levelCount = educationLevelCounts[levelInBank] ?? 0;
      // The two filters (difficulty + level) compound: we cap by the smaller
      // of the two because we don't have a per-(difficulty × level) matrix.
      // This is a conservative estimate — the actual session will use the
      // server-side filter which IS precise.
      count = Math.min(count, levelCount);
    }
    return count;
  })();

  // Resolve metadata for the bank's education level badge.
  const bankLevelMeta = getEducationLevelMeta(educationLevel ?? "TOUS");
  const BankLevelIcon = bankLevelMeta.icon;
  const showBankLevelBadge =
    !!educationLevel && educationLevel.toUpperCase() !== "TOUS";

  // Show the in-bank level filter only when per-level counts were provided
  // AND the bank actually has questions tagged with a specific level (i.e. at
  // least one level count > 0 and different from the "all" count).
  const showInBankLevelFilter =
    !!educationLevelCounts &&
    Object.keys(educationLevelCounts).length > 0 &&
    (Object.keys(educationLevelCounts) as Array<EducationLevel | "all">).some(
      (k) => k !== "all" && (educationLevelCounts[k] ?? 0) > 0,
    );

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
          <DialogTitle className="flex flex-wrap items-center gap-2 text-xl">
            Démarrer la session
            {showBankLevelBadge && (
              <Badge
                variant="secondary"
                className="gap-1 text-xs"
                title={`Niveau de la banque : ${bankLevelMeta.label}`}
              >
                <BankLevelIcon className="h-3 w-3" />
                {bankLevelMeta.label}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-base">
            {title} &middot; {liveCount} question{liveCount > 1 ? "s" : ""}
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">{subtitle}</p>

        {/* In-bank education-level filter (added in E1) */}
        {showInBankLevelFilter && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <GraduationCap className="h-4 w-4 text-emerald-600" />
              Filtrer par niveau (dans la banque)
            </div>
            <p className="text-xs text-muted-foreground">
              Cette banque contient des questions de plusieurs niveaux.
              Choisissez « Tous » pour tout inclure ou un niveau spécifique.
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setLevelInBank("all")}
                className={`flex items-center gap-1.5 rounded-lg border-2 px-2.5 py-1.5 text-xs font-medium transition-all hover:scale-[1.02] ${
                  levelInBank === "all"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-offset-1 dark:bg-emerald-950/30 dark:text-emerald-300"
                    : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60"
                }`}
                aria-pressed={levelInBank === "all"}
              >
                <span>Tous</span>
                <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-[10px] font-normal">
                  {questionCount}
                </span>
              </button>
              {(["BEPC", "BAC", "LICENCE", "CONCOURS"] as EducationLevel[]).map(
                (lvl) => {
                  const c = educationLevelCounts?.[lvl] ?? 0;
                  if (c === 0) return null;
                  const meta = getEducationLevelMeta(lvl);
                  const Icon = meta.icon;
                  const isSelected = levelInBank === lvl;
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setLevelInBank(lvl)}
                      className={`flex items-center gap-1.5 rounded-lg border-2 px-2.5 py-1.5 text-xs font-medium transition-all hover:scale-[1.02] ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-offset-1 dark:bg-emerald-950/30 dark:text-emerald-300"
                          : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60"
                      }`}
                      aria-pressed={isSelected}
                    >
                      <Icon className="h-3 w-3" />
                      <span>{meta.label}</span>
                      <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-[10px] font-normal">
                        {c}
                      </span>
                    </button>
                  );
                },
              )}
            </div>
          </div>
        )}

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
