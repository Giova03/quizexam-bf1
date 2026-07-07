"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BankIcon } from "./bank-icon";
import { useQuizStore } from "@/lib/quiz-store";
import { getColor, type QuestionBank } from "@/lib/types";
import { toast } from "sonner";
import {
  ArrowLeft,
  Trophy,
  Star,
  Lock,
  Crown,
  Sparkles,
  TreePalm,
  Flame,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";

/**
 * SkillTree — Duolingo-style vertical tree of the user's skills (= banks).
 *
 * Each node represents a bank. Nodes light up (colored) when the user has
 * scored ≥ 50% on that bank, and turn gold when they reach ≥ 80%. Clicking a
 * node opens the bank's detail view (where the user can start a new quiz).
 *
 * Mastery is computed from the user's session history (fetched from
 * /api/sessions on mount). For each bank:
 *   mastery = best session score % (across all sessions on that bank).
 *
 * The tree is grouped by `bank.category` and rendered as a vertical zig-zag
 * of circular nodes connected by dashed lines (Duolingo vibe).
 */

interface SessionAnswer {
  isCorrect: boolean | null;
}
interface SessionSummary {
  id: string;
  title: string;
  sourceType: string;
  sourceId: string;
  score: number;
  totalQuestions: number;
  completedAt: string | null;
  answers?: SessionAnswer[];
}

interface BankMastery {
  attempts: number;
  bestPct: number;
  avgPct: number;
  lastPlayedAt: string | null;
}

function computeMastery(sessions: SessionSummary[]): Map<string, BankMastery> {
  const map = new Map<string, BankMastery>();
  for (const s of sessions) {
    if (s.sourceType !== "bank") continue;
    if (!s.completedAt) continue;
    if (s.sourceId === "daily-challenge") continue;
    const pct =
      s.totalQuestions > 0
        ? Math.round((s.score / s.totalQuestions) * 100)
        : 0;
    const existing = map.get(s.sourceId);
    if (existing) {
      existing.attempts += 1;
      existing.bestPct = Math.max(existing.bestPct, pct);
      existing.avgPct = Math.round(
        (existing.avgPct * (existing.attempts - 1) + pct) / existing.attempts,
      );
      existing.lastPlayedAt =
        !existing.lastPlayedAt || (s.completedAt ?? "") > existing.lastPlayedAt
          ? s.completedAt
          : existing.lastPlayedAt;
    } else {
      map.set(s.sourceId, {
        attempts: 1,
        bestPct: pct,
        avgPct: pct,
        lastPlayedAt: s.completedAt ?? null,
      });
    }
  }
  return map;
}

function masteryTier(pct: number): "gold" | "lit" | "dim" | "locked" {
  if (pct >= 80) return "gold";
  if (pct >= 50) return "lit";
  if (pct > 0) return "dim";
  return "locked";
}

function SkillNode({
  bank,
  mastery,
  index,
  onOpen,
}: {
  bank: QuestionBank;
  mastery: BankMastery | undefined;
  index: number;
  onOpen: (id: string) => void;
}) {
  const color = getColor(bank.color);
  const tier = masteryTier(mastery?.bestPct ?? 0);
  const questionCount = bank._count?.questions ?? 0;

  // Zig-zag horizontal offset based on index within the section.
  const offset = [-1, 0, 1][index % 3];
  const offsetClass =
    offset === -1
      ? "ml-2 sm:ml-8"
      : offset === 1
        ? "ml-auto mr-2 sm:mr-8"
        : "mx-auto";

  const isLocked = tier === "locked";
  const isGold = tier === "gold";

  return (
    <div className={`relative flex w-full justify-center ${offsetClass}`}>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onOpen(bank.id)}
              className="group relative flex flex-col items-center gap-2 outline-none"
              aria-label={`${bank.title} — maîtrise ${mastery?.bestPct ?? 0}%`}
            >
              {/* Glow ring (only when lit/gold) */}
              {!isLocked && (
                <div
                  aria-hidden
                  className={`pointer-events-none absolute -inset-2 rounded-full blur-md transition-opacity group-hover:opacity-100 ${
                    isGold
                      ? "bg-amber-400/40 opacity-70"
                      : "bg-emerald-400/30 opacity-50"
                  }`}
                />
              )}
              {/* Outer ring with mastery progress */}
              <div className="relative h-20 w-20 sm:h-24 sm:w-24">
                <svg
                  viewBox="0 0 100 100"
                  className="absolute inset-0 h-full w-full -rotate-90"
                  aria-hidden
                >
                  <circle
                    cx="50"
                    cy="50"
                    r="46"
                    fill="none"
                    strokeWidth="4"
                    className="stroke-muted"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="46"
                    fill="none"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${(mastery?.bestPct ?? 0) * 2.89} 1000`}
                    className={
                      isGold
                        ? "stroke-amber-400"
                        : isLocked
                          ? "stroke-muted-foreground/30"
                          : "stroke-emerald-500"
                    }
                  />
                </svg>
                {/* Inner circle with icon */}
                <div
                  className={`absolute inset-1.5 flex items-center justify-center rounded-full border-2 transition-all group-hover:scale-105 ${
                    isGold
                      ? "border-amber-400 bg-gradient-to-br from-amber-300 to-yellow-500 text-amber-900 shadow-lg shadow-amber-400/40"
                      : isLocked
                        ? "border-border bg-muted text-muted-foreground"
                        : tier === "lit"
                          ? `${color.border} ${color.bgSoft} ${color.text} shadow-sm`
                          : `${color.border} ${color.bgSoft} ${color.text} opacity-70`
                  }`}
                >
                  {isGold ? (
                    <Crown className="h-8 w-8" />
                  ) : (
                    <BankIcon name={bank.icon} className="h-8 w-8" />
                  )}
                </div>
                {/* Tier badge (gold crown / locked lock) */}
                {isGold && (
                  <div className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-white shadow-md ring-2 ring-background">
                    <Star className="h-3.5 w-3.5 fill-current" />
                  </div>
                )}
                {isLocked && (
                  <div className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-muted-foreground/30 text-foreground/70 shadow-md ring-2 ring-background">
                    <Lock className="h-3.5 w-3.5" />
                  </div>
                )}
                {tier === "lit" && (
                  <div className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md ring-2 ring-background">
                    <Flame className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
              {/* Label + mastery */}
              <div className="max-w-[8rem] text-center">
                <p className="truncate text-xs font-semibold sm:text-sm">
                  {bank.title}
                </p>
                <p
                  className={`text-[10px] tabular-nums ${
                    isGold
                      ? "text-amber-600 dark:text-amber-400"
                      : isLocked
                        ? "text-muted-foreground"
                        : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {isLocked
                    ? `${questionCount} Q · non débuté`
                    : `Maîtrise ${mastery?.bestPct ?? 0}% · ${mastery?.attempts ?? 0} tentative(s)`}
                </p>
              </div>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-1">
              <p className="font-semibold">{bank.title}</p>
              <p className="text-xs text-muted-foreground">{bank.description}</p>
              <div className="flex items-center gap-2 pt-1 text-xs">
                <Badge variant="outline">{questionCount} questions</Badge>
                {!isLocked && (
                  <Badge variant="outline">
                    Meilleur : {mastery?.bestPct ?? 0}%
                  </Badge>
                )}
              </div>
              <p className="pt-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                Cliquez pour lancer un quiz →
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

function SectionConnector() {
  return (
    <div className="pointer-events-none mx-auto my-1 h-8 w-px bg-gradient-to-b from-border to-transparent" />
  );
}

export function SkillTree() {
  const banks = useQuizStore((s) => s.banks);
  const setBanks = useQuizStore((s) => s.setBanks);
  const setLoadingBanks = useQuizStore((s) => s.setLoadingBanks);
  const openBank = useQuizStore((s) => s.openBank);
  const goHome = useQuizStore((s) => s.goHome);

  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBanks = useCallback(async () => {
    if (banks.length > 0) return;
    setLoadingBanks(true);
    try {
      const res = await fetch("/api/banks");
      if (res.ok) setBanks(await res.json());
    } catch (e) {
      console.error("Failed to load banks", e);
    } finally {
      setLoadingBanks(false);
    }
  }, [banks.length, setBanks, setLoadingBanks]);

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/sessions");
      if (res.ok) setSessions(await res.json());
    } catch (e) {
      console.error("Failed to load sessions", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBanks();
    loadSessions();
  }, [loadBanks, loadSessions]);

  const mastery = useMemo(() => computeMastery(sessions), [sessions]);

  // Group banks by category, preserving original order within each category.
  const grouped = useMemo(() => {
    const map = new Map<string, QuestionBank[]>();
    for (const b of banks) {
      const cat = b.category || "Autres";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(b);
    }
    return Array.from(map.entries());
  }, [banks]);

  // Aggregate stats for the header.
  const stats = useMemo(() => {
    let totalBanks = banks.length;
    let startedBanks = 0;
    let litBanks = 0;
    let goldBanks = 0;
    let totalMastery = 0;
    for (const b of banks) {
      const m = mastery.get(b.id);
      if (!m) continue;
      startedBanks++;
      totalMastery += m.bestPct;
      if (m.bestPct >= 80) goldBanks++;
      if (m.bestPct >= 50) litBanks++;
    }
    const avgMastery = totalBanks > 0 ? Math.round(totalMastery / totalBanks) : 0;
    return {
      totalBanks,
      startedBanks,
      litBanks,
      goldBanks,
      avgMastery,
    };
  }, [banks, mastery]);

  function handleOpenBank(id: string) {
    const bank = banks.find((b) => b.id === id);
    if (!bank) return;
    toast.success(`Ouverture de la compétence « ${bank.title} »`);
    openBank(id);
  }

  if (loading && banks.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="flex flex-col items-center gap-6 py-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-24 rounded-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        className="gap-2"
        onClick={goHome}
      >
        <ArrowLeft className="h-4 w-4" />
        Retour à l&apos;accueil
      </Button>

      {/* Header */}
      <Card className="relative overflow-hidden border-emerald-200 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-6 dark:border-emerald-900/40 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-cyan-950/40">
        <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-400/20 blur-2xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-md">
              <TreePalm className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Arbre de compétences</h2>
              <p className="text-xs text-muted-foreground">
                Maîtrisez chaque banque pour la transformer en or 👑
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl bg-card/80 p-2 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Compétences
              </p>
              <p className="text-lg font-bold tabular-nums">
                {stats.startedBanks}/{stats.totalBanks}
              </p>
            </div>
            <div className="rounded-xl bg-card/80 p-2 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Actives
              </p>
              <p className="flex items-center justify-center gap-1 text-lg font-bold tabular-nums text-emerald-600">
                <Flame className="h-3.5 w-3.5" />
                {stats.litBanks}
              </p>
            </div>
            <div className="rounded-xl bg-card/80 p-2 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Or
              </p>
              <p className="flex items-center justify-center gap-1 text-lg font-bold tabular-nums text-amber-500">
                <Crown className="h-3.5 w-3.5" />
                {stats.goldBanks}
              </p>
            </div>
            <div className="rounded-xl bg-card/80 p-2 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Maîtrise moy.
              </p>
              <p className="flex items-center justify-center gap-1 text-lg font-bold tabular-nums">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                {stats.avgMastery}%
              </p>
            </div>
          </div>
        </div>
        {/* Legend */}
        <div className="relative mt-4 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Lock className="h-3 w-3" />
            <span>Non débuté</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full border-2 border-emerald-400 bg-emerald-100 dark:bg-emerald-950/50" />
            <span>En cours (&lt; 50%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Flame className="h-3 w-3 text-emerald-500" />
            <span>Actif (≥ 50%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Crown className="h-3 w-3 text-amber-500" />
            <span>Or (≥ 80%)</span>
          </div>
        </div>
      </Card>

      {/* Empty state */}
      {grouped.length === 0 && (
        <Card className="p-8 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            Aucune compétence disponible pour l&apos;instant. Revenez plus tard !
          </p>
        </Card>
      )}

      {/* Tree sections (one per bank category) */}
      <div className="space-y-6">
        {grouped.map(([category, categoryBanks], gi) => (
          <section key={category} className="space-y-3">
            <div className="flex items-center gap-2 px-2">
              <div className="h-px flex-1 bg-border" />
              <Badge variant="outline" className="gap-1 bg-card">
                <Trophy className="h-3 w-3 text-emerald-500" />
                <span className="font-semibold">{category}</span>
                <span className="text-muted-foreground">
                  · {categoryBanks.length} banque(s)
                </span>
              </Badge>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="relative flex flex-col items-stretch gap-2 py-2">
              {categoryBanks.map((bank, idx) => (
                <div key={bank.id}>
                  <SkillNode
                    bank={bank}
                    mastery={mastery.get(bank.id)}
                    index={idx + (gi % 3)}
                    onOpen={handleOpenBank}
                  />
                  {idx < categoryBanks.length - 1 && <SectionConnector />}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Footer hint */}
      <Card className="border-emerald-200 bg-emerald-50/50 p-4 text-center text-xs text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
        <CheckCircle2 className="mx-auto mb-1 h-4 w-4" />
        Atteignez <strong>80%</strong> sur une banque pour la transformer en
        <Crown className="mx-1 inline h-3 w-3 text-amber-500" />
        compétence dorée. Continuez à réviser pour tout débloquer !
      </Card>
    </div>
  );
}
