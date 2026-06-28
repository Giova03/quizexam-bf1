"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useSpacedRepetition } from "@/lib/spaced-repetition-store";
import { useQuizStore } from "@/lib/quiz-store";
import { usePrefs } from "@/lib/prefs-store";
import { toast } from "sonner";
import {
  ArrowLeft,
  RefreshCw,
  Eye,
  EyeOff,
  RotateCcw,
  Brain,
  Calendar,
  CheckCircle2,
  Layers,
  Sparkles,
  TrendingUp,
  XCircle,
  ThumbsUp,
  ThumbsDown,
  Minus,
} from "lucide-react";

interface DueQuestion {
  id: string;
  bankId: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  correctAnswer2?: string | null;
  explanation: string;
  difficulty?: string;
  bank?: {
    id: string;
    title: string;
    color: string;
    icon: string;
  };
}

const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

/**
 * Mapping from user-facing rating buttons to SM-2 quality values:
 *   Again → 0  (forgot completely)
 *   Hard  → 3
 *   Good  → 4
 *   Easy  → 5
 */
const QUALITY_AGAIN = 0;
const QUALITY_HARD = 3;
const QUALITY_GOOD = 4;
const QUALITY_EASY = 5;

export function SpacedRepetitionView() {
  const {
    cards,
    addCard,
    reviewCard,
    getDueCards,
    getStats,
  } = useSpacedRepetition();
  const goHome = useQuizStore((s) => s.goHome);
  const recordSpacedReview = usePrefs((s) => s.recordSpacedReview);

  // Local React state — refreshed from the store on every render.
  const [dueQuestions, setDueQuestions] = useState<DueQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [sessionReviewed, setSessionReviewed] = useState(0);

  // Pull all tracked card IDs (so we can offer a "add all from bank" fallback
  // when no cards are tracked yet).
  const trackedIds = useMemo(() => Object.keys(cards), [cards]);
  const stats = getStats();
  const dueCards = getDueCards();

  // Load due questions from the API: we ask the server for the full question
  // data for every card whose nextReview is in the past.
  const loadDue = useCallback(async () => {
    setLoading(true);
    try {
      const ids = dueCards.map((c) => c.questionId);
      if (ids.length === 0) {
        setDueQuestions([]);
        setCurrentIdx(0);
        setSessionReviewed(0);
        setRevealed(false);
        return;
      }
      const res = await fetch(
        `/api/spaced-repetition?ids=${encodeURIComponent(ids.join(","))}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const data = await res.json();
        setDueQuestions(data.questions ?? []);
        setCurrentIdx(0);
        setSessionReviewed(0);
        setRevealed(false);
      } else {
        toast.error("Impossible de charger les cartes à réviser");
      }
    } catch (e) {
      console.error("Failed to load due questions", e);
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }, [dueCards.length]);

  useEffect(() => {
    loadDue();
  }, [trackedIds.length]);

  const currentQuestion = dueQuestions[currentIdx];
  const sessionTotal = dueQuestions.length;
  const progress =
    sessionTotal > 0
      ? Math.round(((currentIdx + (revealed ? 0.5 : 0)) / sessionTotal) * 100)
      : 0;

  function handleRate(quality: number) {
    if (!currentQuestion) return;
    reviewCard(currentQuestion.id, quality);
    setSessionReviewed((n) => n + 1);
    // Track in prefs-store (awards revision-master badge at 100 reviews).
    recordSpacedReview();

    // Advance to the next card, or finish the session.
    if (currentIdx + 1 < sessionTotal) {
      setCurrentIdx((i) => i + 1);
      setRevealed(false);
    } else {
      // Session complete — reload due list (should now be empty or smaller).
      const labels: Record<number, string> = {
        0: "À revoir 🔁",
        3: "Difficile 💪",
        4: "Bien 👍",
        5: "Facile ⭐",
      };
      toast.success(
        `Révision terminée ! ${sessionReviewed + 1} carte(s) révisée(s). ` +
          `Dernière note: ${labels[quality] ?? quality}.`
      );
      setTimeout(() => {
        loadDue();
      }, 600);
    }
  }

  function skipCurrent() {
    if (currentIdx + 1 < sessionTotal) {
      setCurrentIdx((i) => i + 1);
      setRevealed(false);
    }
  }

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        className="gap-2"
        onClick={() => goHome()}
      >
        <ArrowLeft className="h-4 w-4" />
        Retour à l&apos;accueil
      </Button>

      {/* Header */}
      <Card className="overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-amber-500 to-orange-600" />
        <div className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                <Brain className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Révision espacée
                </h1>
                <p className="mt-1 text-muted-foreground">
                  Algorithme SM-2 (type Anki). Révisez les cartes dues
                  aujourd&apos;hui, notez votre rappel, et la fréquence
                  s&apos;ajuste automatiquement.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={loadDue}
            >
              <RefreshCw className="h-4 w-4" />
              Actualiser
            </Button>
          </div>

          {/* Stats row */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              icon={<Layers className="h-4 w-4" />}
              label="Cartes suivies"
              value={stats.totalCards}
              tint="text-violet-600"
              bg="bg-violet-50 dark:bg-violet-950/40"
            />
            <StatCard
              icon={<Calendar className="h-4 w-4" />}
              label="À réviser aujourd&apos;hui"
              value={stats.dueToday}
              tint="text-amber-600"
              bg="bg-amber-50 dark:bg-amber-950/40"
            />
            <StatCard
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="Révisées aujourd&apos;hui"
              value={stats.reviewedToday}
              tint="text-emerald-600"
              bg="bg-emerald-50 dark:bg-emerald-950/40"
            />
            <StatCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="Easiness moyen"
              value={stats.averageEase}
              tint="text-sky-600"
              bg="bg-sky-50 dark:bg-sky-950/40"
            />
          </div>
        </div>
      </Card>

      {/* Body — depends on state */}
      {loading ? (
        <Card className="p-6">
          <Skeleton className="mb-4 h-8 w-3/4" />
          <Skeleton className="mb-2 h-16 w-full" />
          <Skeleton className="mb-2 h-12 w-full" />
          <Skeleton className="mb-2 h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </Card>
      ) : dueQuestions.length === 0 ? (
        <EmptyState onSeedSample={addCard} />
      ) : (
        <>
          {/* Progress bar */}
          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between gap-2 text-sm">
              <span className="font-medium">
                Carte {currentIdx + 1} / {sessionTotal}
              </span>
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3 w-3" />
                {progress}%
              </Badge>
            </div>
            <Progress value={progress} className="h-2" />
          </Card>

          {/* Flashcard */}
          {currentQuestion && (
            <Card className="overflow-hidden">
              <div className="border-b bg-muted/30 px-6 py-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge
                    variant="outline"
                    className="gap-1 border-amber-200 text-amber-700 dark:border-amber-800 dark:text-amber-300"
                  >
                    <Brain className="h-3 w-3" />
                    Flashcard
                  </Badge>
                  {currentQuestion.bank && (
                    <span className="truncate text-xs text-muted-foreground">
                      {currentQuestion.bank.title}
                    </span>
                  )}
                  {currentQuestion.difficulty && (
                    <DifficultyBadge difficulty={currentQuestion.difficulty} />
                  )}
                </div>
              </div>

              <div className="p-6">
                {/* Question */}
                <p className="break-words text-lg font-semibold leading-snug">
                  {currentQuestion.question}
                </p>

                <p className="mt-2 text-sm text-muted-foreground">
                  {revealed
                    ? "Comparez votre réponse avec la solution ci-dessous, puis notez la qualité de votre rappel."
                    : "Réfléchissez à la réponse, puis révélez la solution."}
                </p>

                {/* Options (revealed) */}
                <div className="mt-4 space-y-2">
                  {OPTION_LETTERS.map((letter) => {
                    const text =
                      letter === "A"
                        ? currentQuestion.optionA
                        : letter === "B"
                          ? currentQuestion.optionB
                          : letter === "C"
                            ? currentQuestion.optionC
                            : currentQuestion.optionD;
                    const isRight = currentQuestion.correctAnswer === letter;
                    const isRight2 =
                      currentQuestion.correctAnswer2 === letter;
                    let cls =
                      "border-border bg-muted/30 text-muted-foreground";
                    if (revealed && (isRight || isRight2)) {
                      cls =
                        "border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100";
                    }
                    return (
                      <div
                        key={letter}
                        className={`flex items-center gap-2 rounded-lg border p-3 text-sm transition-all ${cls}`}
                      >
                        <span className="font-bold">{letter}.</span>
                        <span className="min-w-0 flex-1 break-words">
                          {text}
                        </span>
                        {revealed && (isRight || isRight2) && (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation */}
                {revealed && (
                  <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                    <span className="font-semibold">Explication : </span>
                    <span className="break-words">
                      {currentQuestion.explanation}
                    </span>
                  </div>
                )}
              </div>

              {/* Footer — reveal or rate */}
              <div className="border-t bg-muted/20 p-4">
                {!revealed ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5"
                      onClick={skipCurrent}
                    >
                      Passer cette carte
                    </Button>
                    <Button
                      className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white"
                      onClick={() => setRevealed(true)}
                    >
                      <Eye className="h-4 w-4" />
                      Révéler la réponse
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-center text-xs text-muted-foreground">
                      Comment jugez-vous votre rappel ? L&apos;intervalle
                      s&apos;ajuste en fonction.
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <RateButton
                        quality={QUALITY_AGAIN}
                        label="À revoir"
                        sub="< 1 j"
                        icon={<XCircle className="h-4 w-4" />}
                        className="border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300"
                        onClick={handleRate}
                      />
                      <RateButton
                        quality={QUALITY_HARD}
                        label="Difficile"
                        sub="difficile"
                        icon={<ThumbsDown className="h-4 w-4" />}
                        className="border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
                        onClick={handleRate}
                      />
                      <RateButton
                        quality={QUALITY_GOOD}
                        label="Bien"
                        sub="correct"
                        icon={<ThumbsUp className="h-4 w-4" />}
                        className="border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                        onClick={handleRate}
                      />
                      <RateButton
                        quality={QUALITY_EASY}
                        label="Facile"
                        sub="aisé"
                        icon={<Sparkles className="h-4 w-4" />}
                        className="border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-300"
                        onClick={handleRate}
                      />
                    </div>
                    <div className="flex justify-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={() => setRevealed(false)}
                      >
                        <EyeOff className="h-3 w-3" />
                        Cacher la réponse
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Session end hint */}
          {currentIdx + 1 === sessionTotal && revealed && (
            <Card className="border-dashed bg-amber-50/50 p-4 text-center dark:bg-amber-950/20">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Dernière carte de la session — notez votre rappel pour terminer.
              </p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ===== Sub-components =====

function StatCard({
  icon,
  label,
  value,
  tint,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tint: string;
  bg: string;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-xl ${bg} p-3`}>
      <div className={`shrink-0 ${tint}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-lg font-bold leading-tight">{value}</p>
        <p className="truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const map: Record<
    string,
    { label: string; cls: string; icon: React.ReactNode }
  > = {
    easy: {
      label: "Facile",
      cls: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300",
      icon: <Sparkles className="h-3 w-3" />,
    },
    medium: {
      label: "Moyen",
      cls: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300",
      icon: <Minus className="h-3 w-3" />,
    },
    hard: {
      label: "Difficile",
      cls: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300",
      icon: <Brain className="h-3 w-3" />,
    },
  };
  const cfg = map[difficulty] ?? map.medium;
  return (
    <Badge variant="outline" className={`gap-1 ${cfg.cls}`}>
      {cfg.icon}
      {cfg.label}
    </Badge>
  );
}

function RateButton({
  quality,
  label,
  sub,
  icon,
  className,
  onClick,
}: {
  quality: number;
  label: string;
  sub: string;
  icon: React.ReactNode;
  className: string;
  onClick: (q: number) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(quality)}
      className={`flex flex-col items-center gap-1 rounded-lg border px-3 py-3 text-sm font-medium transition-all hover:scale-[1.02] active:scale-95 ${className}`}
    >
      <div className="flex items-center gap-1.5">
        {icon}
        <span>{label}</span>
      </div>
      <span className="text-[10px] font-normal opacity-70">{sub}</span>
    </button>
  );
}

function EmptyState({
  onSeedSample,
}: {
  onSeedSample: (questionId: string, bankId: string) => void;
}) {
  const [seeding, setSeeding] = useState(false);
  const [banks, setBanks] = useState<
    Array<{ id: string; title: string; _count?: { questions: number } }>
  >([]);

  useEffect(() => {
    fetch("/api/banks")
      .then((r) => r.json())
      .then((data) => setBanks(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  async function seedFromBank(bankId: string) {
    setSeeding(true);
    try {
      const res = await fetch(`/api/banks/${bankId}`);
      if (!res.ok) throw new Error("bank fetch failed");
      const data = await res.json();
      const questions: Array<{ id: string }> = data.questions ?? [];
      // Seed up to 20 sample cards from this bank for quick onboarding.
      const sample = questions.slice(0, 20);
      sample.forEach((q) => onSeedSample(q.id, bankId));
      toast.success(
        `${sample.length} carte(s) ajoutée(s) à votre boîte de révision`
      );
    } catch (e) {
      console.error(e);
      toast.error("Échec de l'initialisation");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <Card className="p-8 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
        <RotateCcw className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-semibold">Aucune carte à réviser</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Votre boîte de révision est vide. Sélectionnez une banque pour ajouter
        rapidement 20 cartes d&apos;exemple, ou ajoutez des cartes
        individuellement depuis la page de détail d&apos;une banque.
      </p>

      {banks.length > 0 && (
        <div className="mx-auto mt-6 max-w-md space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Démarrage rapide — ajouter 20 cartes depuis :
          </p>
          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {banks.slice(0, 10).map((b) => (
              <Button
                key={b.id}
                variant="outline"
                size="sm"
                className="w-full justify-between gap-2"
                disabled={seeding}
                onClick={() => seedFromBank(b.id)}
              >
                <span className="truncate">{b.title}</span>
                <Badge variant="secondary" className="text-[10px]">
                  {b._count?.questions ?? 0} Q
                </Badge>
              </Button>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
