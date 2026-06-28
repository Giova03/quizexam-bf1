"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Trash2, AlertTriangle } from "lucide-react";

export interface EditableQuestion {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string; // "A" | "B" | "C" | "D"
  explanation: string;
  warnings?: string[];
}

interface Props {
  index: number;
  q: EditableQuestion;
  onChange: (q: EditableQuestion) => void;
  onRemove?: () => void;
}

const LETTERS = ["A", "B", "C", "D"] as const;

export function QuestionCardEditor({ index, q, onChange, onRemove }: Props) {
  function set<K extends keyof EditableQuestion>(
    k: K,
    v: EditableQuestion[K]
  ) {
    onChange({ ...q, [k]: v });
  }

  const options: Record<string, string> = {
    A: q.optionA,
    B: q.optionB,
    C: q.optionC,
    D: q.optionD,
  };

  const hasDupes =
    new Set(
      LETTERS.map((L) => options[L].trim().toLowerCase()).filter(Boolean)
    ).size < 4 &&
    LETTERS.every((L) => options[L].trim());

  const allValid =
    q.question.trim() &&
    LETTERS.every((L) => options[L].trim()) &&
    q.explanation.trim() &&
    !hasDupes;

  return (
    <div className="rounded-xl border bg-card p-3 transition-colors hover:border-emerald-300">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
            {index + 1}
          </span>
          {allValid ? (
            <Badge variant="outline" className="border-emerald-300 text-emerald-700">
              <CheckCircle2 className="mr-1 h-3 w-3" /> OK
            </Badge>
          ) : (
            <Badge variant="outline" className="border-amber-300 text-amber-700">
              <AlertTriangle className="mr-1 h-3 w-3" /> À vérifier
            </Badge>
          )}
        </div>
        {onRemove && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-rose-600 hover:bg-rose-50"
            onClick={onRemove}
            title="Retirer cette question"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <div>
          <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Question
          </Label>
          <Textarea
            value={q.question}
            onChange={(e) => set("question", e.target.value)}
            rows={2}
            className="mt-0.5 resize-none text-sm"
            placeholder="Libellé de la question..."
          />
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Options (cliquez sur la lettre pour la réponse correcte)
          </Label>
          {LETTERS.map((L) => (
            <div key={L} className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => set("correctAnswer", L)}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold transition-all ${
                  q.correctAnswer === L
                    ? "bg-emerald-500 text-white ring-2 ring-emerald-300"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
                title="Définir comme réponse correcte"
              >
                {q.correctAnswer === L ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  L
                )}
              </button>
              <Input
                value={options[L]}
                onChange={(e) => set(`option${L}` as any, e.target.value)}
                className="h-8 flex-1 text-sm"
                placeholder={`Option ${L}`}
              />
            </div>
          ))}
        </div>

        {hasDupes && (
          <p className="text-[11px] text-rose-600">
            ⚠️ Les 4 options doivent être différentes
          </p>
        )}

        <div>
          <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Explication
          </Label>
          <Textarea
            value={q.explanation}
            onChange={(e) => set("explanation", e.target.value)}
            rows={2}
            className="mt-0.5 resize-none text-sm"
            placeholder="Explication de la réponse correcte..."
          />
        </div>

        {q.warnings && q.warnings.length > 0 && (
          <div className="rounded-lg bg-amber-50 p-2 text-[11px] text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            {q.warnings.map((w, i) => (
              <p key={i}>• {w}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
