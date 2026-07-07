"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuizStore } from "@/lib/quiz-store";
import { toast } from "sonner";
import {
  Sparkles,
  TrendingDown,
  TrendingUp,
  Flame,
  ArrowRight,
  RefreshCw,
  Play,
} from "lucide-react";

/**
 * AIRecommendations — personalised recommendations card shown on the
 * dashboard overview tab.
 *
 * Fetches the structured weakness analysis from /api/ai-tutor (GET mode =
 * "analyze") and turns it into actionable cards:
 *
 *   1. "Réviser le module X (taux d'erreur: 60%)" — for each weak area.
 *      Clicking "Commencer" opens the matching bank (so the user can
 *      start a session) OR triggers an adaptive quiz if available.
 *   2. "Continuer le module Y (vous êtes sur une bonne série)" — for
 *      strong areas (encourage continued practice).
 *   3. "Essayez le défi du jour pour gagner 2× XP" — always present as
 *      a third recommendation when the user has any history.
 *
 * Graceful degradation: if the API call fails, the card is hidden
 * (returns null) rather than blocking the dashboard.
 */

interface WeakArea {
  bank: string;
  category: string;
  wrongRate: number;
  total: number;
}
interface StrongArea {
  bank: string;
  category: string;
  successRate: number;
  total: number;
}
interface AnalysisResponse {
  weakAreas: WeakArea[];
  strongAreas: StrongArea[];
  recommendations: string[];
  summary: string;
  tier?: string;
}

interface RecommendationCard {
  id: string;
  variant: "weak" | "strong" | "challenge";
  title: string;
  description: string;
  cta: string;
  /** Optional: bank title used to look up the bankId for the "Commencer" action. */
  bankTitle?: string;
  /** Optional: percentage shown in the badge. */
  pct?: number;
}

export function AIRecommendations() {
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);

  const banks = useQuizStore((s) => s.banks);
  const setBanks = useQuizStore((s) => s.setBanks);
  const openBank = useQuizStore((s) => s.openBank);
  const startSession = useQuizStore((s) => s.startSession);
  const openDashboard = useQuizStore((s) => s.openDashboard);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // GET /api/ai-tutor returns the analyze-mode payload.
      const res = await fetch("/api/ai-tutor", { cache: "no-store" });
      if (res.ok) {
        const json = (await res.json()) as AnalysisResponse;
        setData(json);
      } else {
        setData(null);
      }
    } catch (e) {
      console.error("AIRecommendations load error:", e);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Lazily load banks list if not already cached — needed so we can
  // resolve bank titles → bank IDs when the user clicks "Commencer".
  useEffect(() => {
    if (banks.length === 0) {
      fetch("/api/banks")
        .then((r) => (r.ok ? r.json() : []))
        .then((list: Array<{ id: string; title: string }>) => {
          if (Array.isArray(list) && list.length > 0) {
            setBanks(list as never);
          }
        })
        .catch(() => {});
    }
  }, [banks.length, setBanks]);

  // --- Build the recommendation cards -------------------------------------
  const cards: RecommendationCard[] = [];
  if (data) {
    for (const w of data.weakAreas.slice(0, 2)) {
      cards.push({
        id: `weak-${w.bank}`,
        variant: "weak",
        title: `Réviser « ${w.bank} »`,
        description: `Taux d'erreur : ${w.wrongRate}% sur ${w.total} questions. Refaites une session pour ancrer les notions.`,
        cta: "Commencer la révision",
        bankTitle: w.bank,
        pct: w.wrongRate,
      });
    }
    for (const s of data.strongAreas.slice(0, 1)) {
      cards.push({
        id: `strong-${s.bank}`,
        variant: "strong",
        title: `Continuer « ${s.bank} »`,
        description: `Vous êtes sur une bonne série : ${s.successRate}% de réussite. Maintenez le rythme !`,
        cta: "Continuer",
        bankTitle: s.bank,
        pct: s.successRate,
      });
    }
    // Always suggest the daily challenge as the last card.
    cards.push({
      id: "challenge",
      variant: "challenge",
      title: "Défi du jour",
      description:
        "Essayez le défi du jour pour gagner 2× XP et tester votre polyvalence sur 10 questions.",
      cta: "Relever le défi",
    });
  }

  // --- Action handler -----------------------------------------------------
  async function handleStart(card: RecommendationCard) {
    if (card.variant === "challenge") {
      // Fetch today's challenge and start a session with its question IDs.
      setStarting(card.id);
      try {
        const res = await fetch("/api/daily-challenge", { cache: "no-store" });
        if (!res.ok) throw new Error("challenge fetch failed");
        const challenge = await res.json();
        if (!challenge?.questionIds?.length) {
          toast.error("Aucune question disponible pour le défi du jour.");
          return;
        }
        const startRes = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: challenge.title,
            mode: "immediate",
            sourceType: "bank",
            sourceId: "daily-challenge",
            questionIds: challenge.questionIds,
          }),
        });
        if (startRes.ok) {
          const session = await startRes.json();
          toast.success("Défi du jour démarré ! Bonne chance 🎯");
          startSession(session.id);
        } else {
          const err = await startRes.json().catch(() => ({}));
          toast.error(err?.error ?? "Impossible de démarrer le défi.");
        }
      } catch (e) {
        console.error(e);
        toast.error("Erreur lors du démarrage du défi.");
      } finally {
        setStarting(null);
      }
      return;
    }

    // For weak/strong cards: resolve the bank id from the title and either
    // trigger an adaptive quiz (for weak areas) or just open the bank.
    if (!card.bankTitle) {
      toast.error("Banque introuvable.");
      return;
    }
    const bank = banks.find((b) => b.title === card.bankTitle);
    if (!bank) {
      toast.error(`Banque « ${card.bankTitle} » introuvable.`);
      return;
    }

    if (card.variant === "weak") {
      // Trigger an adaptive quiz (the server will pick the right difficulty).
      setStarting(card.id);
      try {
        const res = await fetch("/api/adaptive-quiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bankId: bank.id, mode: "immediate" }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast.error(err?.error ?? "Quiz adaptatif indisponible.");
          return;
        }
        const data = await res.json();
        toast.success(
          `Quiz adaptatif démarré — niveau ${data.difficulty} 🎯`,
        );
        startSession(data.sessionId, data.difficulty);
      } catch (e) {
        console.error(e);
        toast.error("Erreur lors du démarrage du quiz adaptatif.");
      } finally {
        setStarting(null);
      }
    } else {
      // Strong area → just open the bank detail so the user can pick a
      // harder difficulty manually.
      openBank(bank.id);
    }
  }

  // --- Render -------------------------------------------------------------
  if (loading) {
    return (
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 p-4 text-white">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <h3 className="text-sm font-semibold">
              Recommandations personnalisées
            </h3>
          </div>
        </div>
        <div className="space-y-2 p-4">
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      </Card>
    );
  }

  if (!data || cards.length === 0) {
    // Fail silently — don't block the dashboard.
    return null;
  }

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 p-4 text-white">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <h3 className="text-sm font-semibold">
              D&apos;après votre activité, nous recommandons :
            </h3>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1 px-2 text-xs text-white/80 hover:bg-white/10 hover:text-white"
            onClick={() => {
              load();
              toast.success("Recommandations actualisées.");
            }}
            aria-label="Actualiser les recommandations"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="divide-y">
        {cards.map((card) => {
          const isStarting = starting === card.id;
          const accent =
            card.variant === "weak"
              ? {
                  icon: <TrendingDown className="h-4 w-4" />,
                  bg: "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-300",
                  badge: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
                }
              : card.variant === "strong"
                ? {
                    icon: <TrendingUp className="h-4 w-4" />,
                    bg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300",
                    badge:
                      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
                  }
                : {
                    icon: <Flame className="h-4 w-4" />,
                    bg: "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-300",
                    badge:
                      "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
                  };

          return (
            <div
              key={card.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${accent.bg}`}
                >
                  {accent.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold leading-tight">
                      {card.title}
                    </p>
                    {typeof card.pct === "number" && (
                      <Badge
                        variant="secondary"
                        className={`text-[10px] ${accent.badge}`}
                      >
                        {card.variant === "weak"
                          ? `${card.pct}% d'erreur`
                          : `${card.pct}% de réussite`}
                      </Badge>
                    )}
                    {card.variant === "challenge" && (
                      <Badge
                        variant="secondary"
                        className={`gap-1 text-[10px] ${accent.badge}`}
                      >
                        <Flame className="h-2.5 w-2.5" />
                        2× XP
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {card.description}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => handleStart(card)}
                disabled={isStarting}
                className="shrink-0 gap-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:opacity-90"
              >
                {isStarting ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    <span className="text-xs">Démarrage…</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" />
                    <span className="text-xs">{card.cta}</span>
                    <ArrowRight className="h-3 w-3" />
                  </>
                )}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Optional: link to the full AI Tutor analysis in the dashboard tab */}
      {data.summary && (
        <div className="border-t bg-muted/30 px-4 py-2.5">
          <button
            onClick={() => openDashboard()}
            className="flex w-full items-center justify-between gap-2 text-left text-xs text-muted-foreground hover:text-foreground"
          >
            <span className="line-clamp-1">{data.summary}</span>
            <ArrowRight className="h-3 w-3 shrink-0" />
          </button>
        </div>
      )}
    </Card>
  );
}
