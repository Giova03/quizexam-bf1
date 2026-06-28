"use client";

<<<<<<< Updated upstream
import { useEffect, useState, useCallback } from "react";
=======
import { useEffect, useState } from "react";
>>>>>>> Stashed changes
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
<<<<<<< Updated upstream
import { useQuizStore } from "@/lib/quiz-store";
import { toast } from "sonner";
import {
  CalendarClock,
  Sparkles,
  Flame,
  CheckCircle2,
  Play,
  RefreshCw,
} from "lucide-react";

interface DailyChallengeData {
  date: string;
  theme: string;
  title: string;
  questionIds: string[];
  bankCount: number;
  xpMultiplier: number;
  message?: string;
}

const STORAGE_PREFIX = "daily-challenge-completed-";

function todayDateStr(): string {
  // Local date YYYY-MM-DD (matches the localStorage key convention requested
  // by the spec — the API uses UTC, but the "completed today" flag is purely
  // client-side so local time is what matters to the user).
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function DailyChallengeCard() {
  const startSession = useQuizStore((s) => s.startSession);
  const [data, setData] = useState<DailyChallengeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [completedToday, setCompletedToday] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/daily-challenge", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setData(null);
      }
    } catch (e) {
      console.error("Failed to load daily challenge", e);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    // Check localStorage for "daily-challenge-completed-YYYY-MM-DD"
    try {
      const flag = window.localStorage.getItem(STORAGE_PREFIX + todayDateStr());
      setCompletedToday(flag === "1");
    } catch {
      // ignore (e.g. SSR / privacy mode)
    }
  }, []);

  async function handleStart() {
    if (!data || data.questionIds.length === 0) {
      toast.error("Aucune question disponible pour le défi du jour.");
      return;
    }
    setStarting(true);
    try {
=======
import { CalendarDays, Flame, Trophy, CheckCircle2, Play } from "lucide-react";
import { toast } from "sonner";
import { useQuizStore } from "@/lib/quiz-store";

interface DailyChallengeData {
  dayKey: string;
  theme: {
    code: string;
    label: string;
    color: string;
    icon: string;
  };
  questions: Array<{
    id: string;
    bankId: string;
    question: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctAnswer: string;
    explanation: string;
    difficulty: string;
  }>;
  message?: string;
}

const COMPLETED_KEY = "quizexam-daily-completed";

function readCompletedMap(): Record<string, { score: number; total: number }> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(COMPLETED_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeCompletedMap(map: Record<string, { score: number; total: number }>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(COMPLETED_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota errors */
  }
}

export function DailyChallengeCard() {
  const [data, setData] = useState<DailyChallengeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState<{ score: number; total: number } | null>(null);
  const [starting, setStarting] = useState(false);
  const startSession = useQuizStore((s) => s.startSession);

  useEffect(() => {
    fetch("/api/daily-challenge")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setData(d);
          const map = readCompletedMap();
          if (d.dayKey && map[d.dayKey]) {
            setCompleted(map[d.dayKey]);
          }
        }
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  async function startChallenge() {
    if (!data || data.questions.length === 0) return;
    setStarting(true);
    try {
      // Create an exam-mode session from the daily questions by using a
      // custom-exam-style payload: we POST to /api/sessions with sourceType
      // "exam" pointing at no exam — but the API needs a real source. Instead,
      // we use the first bank as the sourceType="bank" to avoid creating a
      // dedicated exam entity.
      const firstQuestion = data.questions[0];
>>>>>>> Stashed changes
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
<<<<<<< Updated upstream
          title: data.title,
          mode: "immediate",
          sourceType: "bank",
          // The daily challenge has no single backing bank — use a stable
          // sentinel so the sessions API can store it without breaking the
          // NOT NULL constraint on sourceId.
          sourceId: "daily-challenge",
          questionIds: data.questionIds,
=======
          title: `Défi quotidien — ${data.theme.label}`,
          mode: "final",
          sourceType: "bank",
          sourceId: firstQuestion.bankId,
          questionIds: data.questions.map((q) => q.id),
>>>>>>> Stashed changes
        }),
      });
      if (res.ok) {
        const session = await res.json();
<<<<<<< Updated upstream
        toast.success("Défi du jour démarré ! Bonne chance 🎯");
        startSession(session.id);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.error ?? "Impossible de démarrer le défi.");
      }
    } catch (e) {
      console.error("Failed to start daily challenge", e);
      toast.error("Erreur lors du démarrage du défi.");
=======
        toast.success("Défi quotidien démarré !");
        startSession(session.id);
      } else {
        toast.error("Impossible de démarrer le défi.");
      }
    } catch (e) {
      console.error("Failed to start daily challenge", e);
      toast.error("Erreur réseau.");
>>>>>>> Stashed changes
    } finally {
      setStarting(false);
    }
  }

<<<<<<< Updated upstream
  if (loading) {
    return (
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-amber-600" />
          <h2 className="text-xl font-semibold">Défi du jour</h2>
        </div>
        <Skeleton className="h-36 rounded-xl" />
      </section>
    );
  }

  if (!data || data.questionIds.length === 0) {
    // Fail silently — don't block the home page if the challenge isn't ready.
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-5 w-5 text-amber-600" />
        <h2 className="text-xl font-semibold">Défi du jour</h2>
        <Badge variant="secondary" className="gap-1">
          <Flame className="h-3 w-3" />
          2× XP
        </Badge>
      </div>

      <Card className="relative overflow-hidden border-2 border-amber-200 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 p-5 dark:border-amber-800/60 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-amber-950/40">
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-amber-400/20 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="gap-1 bg-amber-500 text-white hover:bg-amber-500">
                <Sparkles className="h-3 w-3" />
                {data.theme}
              </Badge>
              <Badge variant="outline" className="border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300">
                {data.questionIds.length} questions
              </Badge>
              {completedToday && (
                <Badge className="gap-1 bg-emerald-500 text-white hover:bg-emerald-500">
                  <CheckCircle2 className="h-3 w-3" />
                  Terminé aujourd&apos;hui
                </Badge>
              )}
            </div>
            <h3 className="text-lg font-bold leading-tight text-amber-900 dark:text-amber-100">
              {data.title}
            </h3>
            <p className="text-sm text-amber-800/90 dark:text-amber-200/80">
              {data.message ??
                "10 questions sélectionnées pour vous aujourd'hui. Tous les joueurs auront les mêmes !"}
            </p>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <Button
              onClick={handleStart}
              disabled={starting}
              className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-90"
            >
              {starting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Démarrage…
                </>
              ) : completedToday ? (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Refaire le défi
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Commencer le défi
                </>
              )}
            </Button>
            <p className="text-xs text-amber-700/80 dark:text-amber-300/70">
              Récompense : ×{data.xpMultiplier} XP
=======
  // Expose a global hook so results-view can mark today's challenge as done.
  // This avoids wiring a full store for a localStorage-only feature.
  useEffect(() => {
    (window as unknown as { __markDailyComplete?: (score: number, total: number) => void }).__markDailyComplete = (score: number, total: number) => {
      if (!data?.dayKey) return;
      const map = readCompletedMap();
      map[data.dayKey] = { score, total };
      writeCompletedMap(map);
      setCompleted({ score, total });
      toast.success(`Défi terminé : ${score}/${total} ✓`);
    };
  }, [data?.dayKey]);

  if (loading) {
    return <Skeleton className="h-40 rounded-xl" />;
  }

  if (!data) {
    // Silently skip — daily challenge is a bonus, not critical
    return null;
  }

  if (data.questions.length === 0) {
    return (
      <Card className="overflow-hidden p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <CalendarDays className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold">Défi quotidien</h3>
            <p className="text-sm text-muted-foreground">
              {data.message ?? "Aucune question disponible aujourd'hui."}
>>>>>>> Stashed changes
            </p>
          </div>
        </div>
      </Card>
<<<<<<< Updated upstream
    </section>
=======
    );
  }

  const colorClass =
    data.theme.color === "amber"
      ? "from-amber-500 to-orange-600"
      : data.theme.color === "violet"
        ? "from-violet-500 to-purple-600"
        : data.theme.color === "emerald"
          ? "from-emerald-500 to-teal-600"
          : data.theme.color === "rose"
            ? "from-rose-500 to-pink-600"
            : data.theme.color === "sky"
              ? "from-sky-500 to-cyan-600"
              : data.theme.color === "cyan"
                ? "from-cyan-500 to-teal-600"
                : "from-teal-500 to-emerald-600";

  return (
    <Card className="group relative overflow-hidden p-5">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${colorClass}`} />
      <div className="flex items-start gap-3">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${colorClass} text-white shadow-sm`}>
          <Flame className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold leading-tight">Défi quotidien</h3>
            <Badge variant="secondary" className="text-[10px]">
              <CalendarDays className="mr-1 h-3 w-3" />
              {data.dayKey}
            </Badge>
          </div>
          <p className="mt-0.5 text-sm font-medium text-muted-foreground">
            Thème du jour : <span className="text-foreground">{data.theme.label}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            10 questions — même défi pour tous les joueurs aujourd&apos;hui.
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        {completed ? (
          <Badge className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="h-3 w-3" />
            Terminé : {completed.score}/{completed.total}
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1">
            <Trophy className="h-3 w-3" />
            À relever
          </Badge>
        )}
        <Button
          size="sm"
          className={`gap-1.5 bg-gradient-to-r ${colorClass} text-white hover:opacity-90`}
          onClick={startChallenge}
          disabled={starting || completed !== null}
        >
          {starting ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
          {completed ? "Déjà terminé" : "Commencer le défi"}
        </Button>
      </div>
    </Card>
>>>>>>> Stashed changes
  );
}
