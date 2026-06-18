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
import { Zap, Flag, CheckCircle2, ListChecks } from "lucide-react";
import type { CorrectionMode } from "@/lib/types";

interface StartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle: string;
  questionCount: number;
  onStart: (mode: CorrectionMode) => Promise<void>;
}

export function StartDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  questionCount,
  onStart,
}: StartDialogProps) {
  const [mode, setMode] = useState<CorrectionMode>("immediate");
  const [starting, setStarting] = useState(false);

  async function handleStart() {
    setStarting(true);
    try {
      await onStart(mode);
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
            {title} &middot; {questionCount} questions
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">{subtitle}</p>

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
            disabled={starting}
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
