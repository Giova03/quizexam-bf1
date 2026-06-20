"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BankIcon } from "./bank-icon";
import { getColor } from "@/lib/types";
import { Sparkles, CheckSquare, Zap, Flag, Loader2, BookOpen } from "lucide-react";
import type { CorrectionMode } from "@/lib/types";
import { toast } from "sonner";

interface Bank {
  id: string;
  title: string;
  category: string;
  subcategory: string;
  icon: string;
  color: string;
  _count: { questions: number };
}

interface CustomExamDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (sessionId: string) => void;
}

export function CustomExamDialog({
  open,
  onOpenChange,
  onCreated,
}: CustomExamDialogProps) {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBankIds, setSelectedBankIds] = useState<string[]>([]);
  const [mode, setMode] = useState<CorrectionMode>("immediate");
  const [questionCount, setQuestionCount] = useState(20);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) {
      fetch("/api/banks")
        .then((r) => (r.ok ? r.json() : []))
        .then((d) => {
          setBanks(Array.isArray(d) ? d : []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [open]);

  // Group banks by category
  const categories = [
    { key: "Culture Générale", label: "🌍 Culture Générale" },
    { key: "Psychotechnique", label: "🧠 Psychotechnique" },
    { key: "Secondaire", label: "🎓 Secondaire" },
    { key: "Universitaire", label: "🏛️ Universitaire" },
    { key: "Concours", label: "🏆 Concours" },
  ];

  const totalAvailable = banks
    .filter((b) => selectedBankIds.includes(b.id))
    .reduce((sum, b) => sum + b._count.questions, 0);

  function toggleBank(id: string) {
    setSelectedBankIds((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  }

  function selectAllInCategory(cat: string) {
    const catBanks = banks.filter((b) => b.category === cat);
    const allSelected = catBanks.every((b) => selectedBankIds.includes(b.id));
    if (allSelected) {
      // Deselect all in category
      setSelectedBankIds((prev) =>
        prev.filter((id) => !catBanks.some((b) => b.id === id))
      );
    } else {
      // Select all in category
      const newIds = catBanks.map((b) => b.id);
      setSelectedBankIds((prev) =>
        [...new Set([...prev, ...newIds])]
      );
    }
  }

  async function handleCreate() {
    if (selectedBankIds.length === 0) {
      toast.error("Sélectionnez au moins un module");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/custom-exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankIds: selectedBankIds,
          questionCount,
          mode,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        // Navigate first, then close dialog
        onCreated(data.id);
        onOpenChange(false);
      } else {
        toast.error(data.error || "Échec de la création");
        setCreating(false);
      }
    } catch (e) {
      console.error("Custom exam error:", e);
      toast.error("Erreur de connexion. Vérifiez votre réseau.");
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-violet-600" />
            Examen personnalisé
          </DialogTitle>
          <DialogDescription>
            Sélectionnez vos modules et l&apos;IA crée un examen blanc sur
            mesure en mélangeant les questions aléatoirement.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
          </div>
        ) : (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
            {/* Step 1: Select modules */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                  <CheckSquare className="h-4 w-4 text-emerald-600" />
                  1. Choisissez vos modules
                </h3>
                {selectedBankIds.length > 0 && (
                  <Badge variant="secondary">
                    {selectedBankIds.length} sélectionné(s) · {totalAvailable} Q
                  </Badge>
                )}
              </div>

              {categories.map((cat) => {
                const catBanks = banks.filter(
                  (b) => b.category === cat.key
                );
                if (catBanks.length === 0) return null;
                return (
                  <div key={cat.key} className="space-y-1.5">
                    <button
                      onClick={() => selectAllInCategory(cat.key)}
                      className="text-xs font-medium text-violet-600 hover:text-violet-800 dark:text-violet-400"
                    >
                      {catBanks.every((b) =>
                        selectedBankIds.includes(b.id)
                      )
                        ? `Tout désélectionner (${cat.label})`
                        : `Tout sélectionner (${cat.label})`}
                    </button>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {catBanks.map((bank) => {
                        const color = getColor(bank.color);
                        const isSelected = selectedBankIds.includes(
                          bank.id
                        );
                        return (
                          <label
                            key={bank.id}
                            className={`flex cursor-pointer items-center gap-2.5 rounded-lg border-2 p-2.5 transition-all ${
                              isSelected
                                ? `${color.border} ${color.bgSoft}`
                                : "border-border hover:border-emerald-300"
                            }`}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleBank(bank.id)}
                            />
                            <div
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${color.bgSoft} ${color.text}`}
                            >
                              <BankIcon
                                name={bank.icon}
                                className="h-4 w-4"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-medium">
                                {bank.title}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {bank._count.questions} Q
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </section>

            {/* Step 2: Number of questions */}
            <section className="space-y-2">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                <BookOpen className="h-4 w-4 text-sky-600" />
                2. Nombre de questions
              </h3>
              <div className="flex items-center gap-4 px-1">
                <Slider
                  value={[questionCount]}
                  onValueChange={(v) => setQuestionCount(v[0])}
                  min={5}
                  max={Math.min(50, totalAvailable || 50)}
                  step={5}
                  className="flex-1"
                />
                <Badge
                  variant="outline"
                  className="min-w-[50px] justify-center text-sm font-bold"
                >
                  {questionCount}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {totalAvailable > 0 &&
                  `Disponible: ${totalAvailable} questions dans les modules sélectionnés`}
              </p>
            </section>

            {/* Step 3: Correction mode */}
            <section className="space-y-2">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                <Flag className="h-4 w-4 text-amber-600" />
                3. Mode de correction
              </h3>
              <RadioGroup
                value={mode}
                onValueChange={(v) => setMode(v as CorrectionMode)}
                className="grid gap-2 sm:grid-cols-2"
              >
                <Label
                  htmlFor="custom-immediate"
                  className="cursor-pointer"
                >
                  <Card
                    className={`flex gap-2 p-3 transition-all ${
                      mode === "immediate"
                        ? "border-emerald-500 ring-2 ring-emerald-500/30"
                        : ""
                    }`}
                  >
                    <RadioGroupItem
                      value="immediate"
                      id="custom-immediate"
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className="flex items-center gap-1 text-sm font-semibold">
                        <Zap className="h-3.5 w-3.5 text-emerald-600" />
                        Correction immédiate
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Feedback après chaque réponse
                      </p>
                    </div>
                  </Card>
                </Label>
                <Label htmlFor="custom-final" className="cursor-pointer">
                  <Card
                    className={`flex gap-2 p-3 transition-all ${
                      mode === "final"
                        ? "border-violet-500 ring-2 ring-violet-500/30"
                        : ""
                    }`}
                  >
                    <RadioGroupItem
                      value="final"
                      id="custom-final"
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className="flex items-center gap-1 text-sm font-semibold">
                        <Flag className="h-3.5 w-3.5 text-violet-600" />
                        Correction finale
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Correction regroupée à la fin
                      </p>
                    </div>
                  </Card>
                </Label>
              </RadioGroup>
            </section>
          </div>
        )}

        <DialogFooter className="gap-2 border-t pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button
            onClick={handleCreate}
            disabled={
              creating || selectedBankIds.length === 0
            }
            className="gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white"
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Créer mon examen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
