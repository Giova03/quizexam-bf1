"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          mode: "immediate",
          sourceType: "bank",
          // The daily challenge has no single backing bank — use a stable
          // sentinel so the sessions API can store it without breaking the
          // NOT NULL constraint on sourceId.
          sourceId: "daily-challenge",
          questionIds: data.questionIds,
        }),
      });
      if (res.ok) {
        const session = await res.json();
        toast.success("Défi du jour démarré ! Bonne chance 🎯");
        startSession(session.id);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.error ?? "Impossible de démarrer le défi.");
      }
    } catch (e) {
      console.error("Failed to start daily challenge", e);
      toast.error("Erreur lors du démarrage du défi.");
    } finally {
      setStarting(false);
    }
  }

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
            </p>
          </div>
        </div>
      </Card>
    </section>
  );
}
