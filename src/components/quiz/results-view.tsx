"use client";

import { useEffect, useState, useCallback } from "react";
import { useQuizStore } from "@/lib/quiz-store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { QuizSession } from "@/lib/types";
import { CertificateDialog } from "./certificate-dialog";
import {
  Confetti,
  CountUp,
  ProgressRing,
} from "./animated-components";
import { motion, useReducedMotion } from "framer-motion";
import {
  Trophy,
  CheckCircle2,
  XCircle,
  CircleDashed,
  Home,
  RefreshCw,
  Zap,
  Flag,
  Award,
} from "lucide-react";

const OPTION_LETTERS = ["A", "B", "C", "D"] as const;
const CERTIFICATE_THRESHOLD = 80;
const CONFETTI_THRESHOLD = 50;

export function ResultsView() {
  const { currentSessionId, goHome, openBank, openExam, session: storeSession } =
    useQuizStore();
  const [session, setSession] = useState<QuizSession | null>(storeSession);
  const [loading, setLoading] = useState(!storeSession);
  const [certOpen, setCertOpen] = useState(false);

  // E3: confetti burst — fires once on mount when the score is high enough.
  // We use a numeric token (1) instead of a boolean so the Confetti
  // component re-evaluates its effect when this fires.
  const [confettiFire, setConfettiFire] = useState(0);
  const reduceMotion = useReducedMotion();

  const loadSession = useCallback(async () => {
    if (!currentSessionId) return;
    if (storeSession) {
      setSession(storeSession);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${currentSessionId}`);
      if (res.ok) {
        setSession(await res.json());
      }
    } catch (e) {
      console.error("Failed to load session", e);
    } finally {
      setLoading(false);
    }
  }, [currentSessionId, storeSession]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // E3: fire confetti once the session is loaded and the score qualifies.
  // Runs only when we actually have a final percentage (avoids firing 0%
  // confetti while loading). Reduced-motion users skip the confetti.
  useEffect(() => {
    if (!session || reduceMotion) return;
    const total = session.totalQuestions;
    if (total <= 0) return;
    const pct = Math.round((session.score / total) * 100);
    if (pct >= CONFETTI_THRESHOLD) {
      const t = setTimeout(() => setConfettiFire(1), 350);
      return () => clearTimeout(t);
    }
  }, [session, reduceMotion]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!session) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Session introuvable.</p>
        <Button onClick={goHome} className="mt-4">
          Retour à l&apos;accueil
        </Button>
      </Card>
    );
  }

  const answers = session.answers ?? [];
  const correct = answers.filter((a) => a.isCorrect === true).length;
  const wrong = answers.filter((a) => a.isCorrect === false).length;
  const skipped = answers.filter((a) => a.userAnswer === null).length;
  const score = session.score;
  const total = session.totalQuestions;
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
  const isImmediate = session.mode === "immediate";

  const passed = percentage >= 50;
  const gradeColor = passed
    ? "from-emerald-500 to-teal-600"
    : "from-rose-500 to-orange-600";

  const eligibleForCertificate = percentage >= CERTIFICATE_THRESHOLD;

  return (
    <div className="space-y-6">
      {/* Confetti on success */}
      <Confetti fire={confettiFire} count={120} duration={4500} />

      {/* Score hero — glass + progress ring + animated counter.
          FIX2: smaller on mobile (smaller ring, smaller padding, smaller
          text) so it fits on a 390px viewport without horizontal scroll.
          FIX3: tighter mobile padding (p-4) for very small screens. */}
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
      <Card className="glass relative overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br ${gradeColor} opacity-95`} />
        {/* Decorative blurred orbs */}
        <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/20 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 -left-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col items-center gap-4 p-4 text-white sm:gap-6 sm:p-8 md:flex-row md:items-center md:gap-10">
          {/* Progress ring with % in centre */}
          <ProgressRing
            value={percentage / 100}
            size={120}
            strokeWidth={12}
            progressColor="#ffffff"
            trackColor="rgba(255,255,255,0.25)"
            className="shrink-0 sm:size-[160px]"
          >
            <div className="text-center">
              <div className="text-2xl font-bold leading-none sm:text-3xl">
                <CountUp value={percentage} duration={1200} suffix="%" />
              </div>
              <div className="mt-1 text-[10px] font-medium uppercase tracking-wider opacity-80 sm:text-[11px]">
                Score
              </div>
            </div>
          </ProgressRing>

          {/* Trophy + score + message + stats */}
          <div className="flex-1 text-center md:text-left">
            <Trophy className="mx-auto h-8 w-8 sm:h-10 sm:w-10 md:mx-0" />
            <h1 className="mt-2 text-xl font-bold sm:text-2xl md:text-3xl">
              <CountUp value={score} duration={1200} /> / {total}
            </h1>
            <p className="mt-1 text-sm text-white/90 sm:text-base md:text-lg">
              {passed
                ? "Félicitations, vous avez réussi !"
                : "Continuez à vous entraîner !"}
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:mt-4 md:justify-start">
              <div className="flex items-center gap-1.5 rounded-lg bg-white/15 px-2.5 py-1.5 text-xs backdrop-blur sm:px-3 sm:text-sm">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-medium">
                  <CountUp value={correct} /> correctes
                </span>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg bg-white/15 px-2.5 py-1.5 text-xs backdrop-blur sm:px-3 sm:text-sm">
                <XCircle className="h-4 w-4" />
                <span className="font-medium">
                  <CountUp value={wrong} /> fausses
                </span>
              </div>
              {skipped > 0 && (
                <div className="flex items-center gap-1.5 rounded-lg bg-white/15 px-2.5 py-1.5 text-xs backdrop-blur sm:px-3 sm:text-sm">
                  <CircleDashed className="h-4 w-4" />
                  <span className="font-medium">
                    <CountUp value={skipped} /> omises
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
      </motion.div>

      {/* Mode badge + actions — FIX2: actions wrap on mobile, full-width
          buttons with 44px min touch target. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Badge
          variant="outline"
          className={`w-fit ${
            isImmediate
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300"
          }`}
        >
          {isImmediate ? (
            <>
              <Zap className="mr-1 h-3 w-3" />
              Mode correction immédiate
            </>
          ) : (
            <>
              <Flag className="mr-1 h-3 w-3" />
              Mode correction finale
            </>
          )}
        </Badge>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-2">
          {percentage >= 80 && (
            <Button
              variant="outline"
              className="h-11 gap-2 border-amber-300 text-amber-700 hover:bg-amber-50 sm:h-9 dark:border-amber-700 dark:text-amber-300"
              onClick={() => setCertOpen(true)}
            >
              <Award className="h-4 w-4" />
              <span className="truncate">Certificat</span>
            </Button>
          )}
          <Button
            variant="outline"
            className="h-11 gap-2 sm:h-9"
            onClick={() => {
              if (session.sourceType === "bank") {
                openBank(session.sourceId);
              } else {
                openExam(session.sourceId);
              }
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Refaire
          </Button>
          {eligibleForCertificate && (
            <Button
              variant="outline"
              className="h-11 gap-2 border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100 sm:h-9 dark:border-amber-600 dark:bg-amber-950/30 dark:text-amber-300"
              onClick={() => setCertOpen(true)}
            >
              <Award className="h-4 w-4" />
              <span className="truncate">Certificat</span>
            </Button>
          )}
          <Button onClick={goHome} className="h-11 gap-2 sm:h-9">
            <Home className="h-4 w-4" />
            Accueil
          </Button>
        </div>
      </div>

      {/* Progress summary — glass card */}
      <Card className="glass p-5 shadow-sm">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">Répartition des réponses</span>
          <span className="text-muted-foreground">
            {total} questions au total
          </span>
        </div>
        <div className="flex h-3 overflow-hidden rounded-full">
          <div
            className="bg-emerald-500 transition-all duration-700"
            style={{ width: `${(correct / total) * 100}%` }}
          />
          <div
            className="bg-rose-500 transition-all duration-700"
            style={{ width: `${(wrong / total) * 100}%` }}
          />
          <div
            className="bg-muted-foreground/40 transition-all duration-700"
            style={{ width: `${(skipped / total) * 100}%` }}
          />
        </div>
      </Card>

      {/* Detailed review - full responsive, no inner scroll */}
      <Card className="glass overflow-hidden shadow-sm">
        <div className="border-b px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">Correction détaillée</h2>
              <p className="text-sm text-muted-foreground">
                Révision de toutes les {answers.length} questions avec explications
              </p>
            </div>
            <Badge variant="secondary" className="w-fit">
              {answers.length} questions
            </Badge>
          </div>
        </div>
        <div className="divide-y">
          {answers.map((a, idx) => {
            const isCorrect = a.isCorrect === true;
            const isSkipped = a.userAnswer === null;
            return (
              <div key={a.id} className="px-3 py-3 sm:px-6 sm:py-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center self-start rounded-lg text-sm font-bold ${
                      isCorrect
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                        : isSkipped
                          ? "bg-muted text-muted-foreground"
                          : "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    {/* Image (above the question text) — added in F4 */}
                    {a.imageUrl && (
                      <div className="mb-3 overflow-hidden rounded-lg border bg-muted/30">
                        { }
                        <img
                          src={a.imageUrl}
                          alt={`Illustration de la question ${idx + 1}`}
                          className="max-h-64 w-full object-contain"
                          loading="lazy"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </div>
                    )}
                    <p className="break-words font-medium leading-snug">
                      {a.questionText}
                    </p>

                    <div className="mt-3 flex flex-col gap-1.5">
                      {OPTION_LETTERS.map((letter) => {
                        const text =
                          letter === "A"
                            ? a.optionA
                            : letter === "B"
                              ? a.optionB
                              : letter === "C"
                                ? a.optionC
                                : a.optionD;
                        const isRight = a.correctAnswer === letter;
                        const isChosen = a.userAnswer === letter;
                        let cls =
                          "border-border bg-muted/30 text-muted-foreground";
                        if (isRight) {
                          cls =
                            "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30";
                        } else if (isChosen && !isRight) {
                          cls =
                            "border-rose-500 bg-rose-50 dark:bg-rose-950/30";
                        }
                        return (
                          <div
                            key={letter}
                            className={`flex flex-col gap-1 rounded-lg border px-3 py-2 text-sm sm:flex-row sm:items-center sm:gap-2 ${cls}`}
                          >
                            <span className="font-bold">{letter}.</span>
                            <span className="min-w-0 flex-1 break-words">{text}</span>
                            <div className="flex items-center gap-1">
                              {isRight && (
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                              )}
                              {isChosen && !isRight && (
                                <XCircle className="h-4 w-4 shrink-0 text-rose-600" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div
                      className={`mt-3 flex flex-col gap-1 rounded-lg p-3 text-sm sm:flex-row sm:items-start sm:gap-2 ${
                        isCorrect
                          ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
                          : "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
                      }`}
                    >
                      <span className="shrink-0 font-semibold">
                        {isCorrect
                          ? "✓ Correct —"
                          : isSkipped
                            ? "○ Omise —"
                            : "✗ Incorrect —"}
                      </span>
                      <span className="break-words">{a.explanation}</span>
                    </div>

                    {/* Audio (below the explanation) — added in F4 */}
                    {a.audioUrl && (
                      <div className="mt-3 rounded-lg border bg-muted/20 p-2.5">
                        <p className="mb-1 text-[11px] font-semibold text-muted-foreground">
                          🎵 Audio associé
                        </p>
                        <audio controls src={a.audioUrl} className="w-full">
                          Votre navigateur ne prend pas en charge l&apos;élément audio.
                        </audio>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Certificate dialog (Premium-gated) */}
      <CertificateDialog
        open={certOpen}
        onOpenChange={setCertOpen}
        sessionId={session.id}
      />
    </div>
  );
}
