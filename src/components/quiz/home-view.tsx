"use client";

/**
 * HomeView — FIX5 fresh modern redesign.
 *
 * Sections (top → bottom):
 *   1. Hero — gradient-mesh banner with floating glass stat pills
 *   2. Stats Bar — 3 animated counters (Banques · Questions · Examens)
 *   3. Quick Actions Grid — 4 gradient cards (Examen IA, Tableau de bord,
 *      Classement, Révision espacée)
 *   4. Progress Summary — XP / level / streak / rank + progress bar
 *      (returning users only)
 *   5. Daily Challenge — themed 10-question sprint
 *   6. Featured Banks — top 6 by question count (horizontal snap on mobile)
 *   7. Search bar (Ctrl+K)
 *   8. Study Reminders
 *   9. Banks section — EducationLevelSelector + full grid (filtered by level)
 *  10. Exams section — exam cards
 */

import {
  useEffect,
  useCallback,
  useState,
  useMemo,
} from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { useQuizStore } from "@/lib/quiz-store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BankIcon } from "./bank-icon";
import { getColor } from "@/lib/types";
import { SearchDialog } from "./search-dialog";
import { RevisionDialog } from "./revision-dialog";
import { StudyReminders } from "./study-reminders";
import {
  EducationLevelSelector,
  getEducationLevelMeta,
  type EducationLevel,
} from "./education-level-selector";
import {
  FloatingBadge,
  GradientText,
  ShimmerSkeleton,
  CountUp,
} from "./animated-components";
import { StaggerList, StaggerItem } from "./page-transitions";
import { DailyChallengeCard } from "./daily-challenge-card";
import {
  GraduationCap,
  FileQuestion,
  Clock,
  ArrowRight,
  BookOpen,
  Trophy,
  Sparkles,
  Search,
  Layers3,
  Filter,
  Target,
  LayoutDashboard,
  Crown,
  Repeat,
  Zap,
  Flame,
  TrendingUp,
  Award,
  ChevronRight,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* HomeView                                                            */
/* ------------------------------------------------------------------ */

interface HomeViewProps {
  /** Optional callback to open the custom exam dialog (rendered by page.tsx). */
  onOpenCustomExam?: () => void;
}

export function HomeView({ onOpenCustomExam }: HomeViewProps) {
  const {
    banks,
    exams,
    loadingBanks,
    loadingExams,
    setBanks,
    setExams,
    setLoadingBanks,
    setLoadingExams,
    openBank,
    openExam,
    openDashboard,
    openLeaderboard,
    openSpacedRepetition,
  } = useQuizStore();
  const { data: session } = useSession();

  const [searchOpen, setSearchOpen] = useState(false);
  const [revisionBank, setRevisionBank] = useState<{
    id: string;
    title: string;
  } | null>(null);
  // Education level filter (E1). Defaults to "TOUS".
  const [level, setLevel] = useState<EducationLevel>("TOUS");

  // Load the saved level from localStorage on mount (client-only).
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("home:educationLevel");
      if (
        saved === "BEPC" ||
        saved === "BAC" ||
        saved === "LICENCE" ||
        saved === "CONCOURS" ||
        saved === "TOUS"
      ) {
        setLevel(saved);
      }
    } catch {
      /* ignore — localStorage may be unavailable (SSR/private mode) */
    }
  }, []);

  // Persist the level whenever it changes.
  useEffect(() => {
    try {
      window.localStorage.setItem("home:educationLevel", level);
    } catch {
      /* ignore */
    }
  }, [level]);

  const loadBanks = useCallback(async () => {
    setLoadingBanks(true);
    try {
      // Always fetch the unfiltered list — the level filter is applied
      // client-side so switching tabs is instant and we don't refetch on
      // every change. The server-side `?level=` filter exists for the
      // public API and direct API consumers.
      const res = await fetch("/api/banks");
      if (res.ok) {
        const data = await res.json();
        setBanks(data);
      }
    } catch (e) {
      console.error("Failed to load banks", e);
    } finally {
      setLoadingBanks(false);
    }
  }, [setBanks, setLoadingBanks]);

  const loadExams = useCallback(async () => {
    setLoadingExams(true);
    try {
      const res = await fetch("/api/exams");
      if (res.ok) {
        const data = await res.json();
        setExams(data);
      }
    } catch (e) {
      console.error("Failed to load exams", e);
    } finally {
      setLoadingExams(false);
    }
  }, [setExams, setLoadingExams]);

  useEffect(() => {
    if (banks.length === 0 && !loadingBanks) loadBanks();
    if (exams.length === 0 && !loadingExams) loadExams();
  }, []);

  /* ----- Counts per level (EducationLevelSelector + visible-banks filter) ----- */
  const levelCounts = useMemo(() => {
    const counts: Record<EducationLevel, number> = {
      TOUS: 0,
      BEPC: 0,
      BAC: 0,
      LICENCE: 0,
      CONCOURS: 0,
    };
    for (const b of banks) {
      const lvl = (b.educationLevel ?? "TOUS").toUpperCase() as EducationLevel;
      if (lvl in counts) counts[lvl]++;
      else counts.TOUS++;
    }
    return counts;
  }, [banks]);

  const visibleBanks = useMemo(() => {
    if (level === "TOUS") return banks;
    return banks.filter((b) => {
      const lvl = (b.educationLevel ?? "TOUS").toUpperCase();
      return lvl === level || lvl === "TOUS";
    });
  }, [banks, level]);

  const visibleQuestions = useMemo(
    () =>
      visibleBanks.reduce(
        (sum, b) => sum + (b._count?.questions ?? 0),
        0,
      ),
    [visibleBanks],
  );

  const totalQuestions = useMemo(
    () => banks.reduce((sum, b) => sum + (b._count?.questions ?? 0), 0),
    [banks],
  );

  /* ----- Featured banks (top 6 by question count) ----- */
  const featuredBanks = useMemo(() => {
    return [...banks]
      .filter((b) => (b._count?.questions ?? 0) > 0)
      .sort((a, b) => (b._count?.questions ?? 0) - (a._count?.questions ?? 0))
      .slice(0, 6);
  }, [banks]);

  /* ----- User progress (for the Progress Summary card) ----- */
  const [progress, setProgress] = useState<{
    xp: number;
    level: number;
    rank: number | null;
    totalUsers: number | null;
    avgScore: number;
    sessionsCount: number;
    streak: number;
  } | null>(null);

  useEffect(() => {
    if (!session?.user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/me/stats", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const totalCorrect = data.stats?.totalCorrect ?? 0;
        const sessions = data.stats?.totalSessions ?? 0;
        const xp = totalCorrect * 10 + sessions * 5;
        const level = Math.floor(xp / 500) + 1;
        let streak = 0;
        try {
          const raw = window.localStorage.getItem("qebf-streak");
          if (raw) streak = parseInt(raw, 10) || 0;
        } catch {
          /* ignore */
        }
        setProgress({
          xp,
          level,
          rank: data.stats?.rank ?? null,
          totalUsers: data.stats?.totalUsers ?? null,
          avgScore: data.stats?.avgScore ?? 0,
          sessionsCount: sessions,
          streak,
        });
      } catch {
        /* silent — non-critical */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  /* ----- Quick action cards (4 — Examen IA, Tableau de bord, Classement, Révision espacée) ----- */
  const quickActions = useMemo(
    () => [
      {
        title: "Examen IA personnalisé",
        desc: "Génère un examen sur-mesure avec l'IA",
        icon: Target,
        gradient: "from-violet-500 to-purple-600",
        badge: "IA",
        onClick: () => onOpenCustomExam?.(),
      },
      {
        title: "Mon tableau de bord",
        desc: "Suivez votre progression et statistiques",
        icon: LayoutDashboard,
        gradient: "from-emerald-500 to-teal-600",
        badge: null,
        onClick: openDashboard,
      },
      {
        title: "Classement",
        desc: "Comparez-vous aux autres apprenants",
        icon: Crown,
        gradient: "from-amber-500 to-orange-600",
        badge: "Top",
        onClick: openLeaderboard,
      },
      {
        title: "Révision espacée",
        desc: "Mémorisez sur le long terme (SM-2)",
        icon: Repeat,
        gradient: "from-sky-500 to-cyan-600",
        badge: null,
        onClick: openSpacedRepetition,
      },
    ],
    [onOpenCustomExam, openDashboard, openLeaderboard, openSpacedRepetition],
  );

  /* ----- Stats Bar items — spec: 48 Banques | 3497 Questions | 9 Examens ----- */
  const statsBar = useMemo(
    () => [
      {
        icon: BookOpen,
        label: "Banques",
        value: banks.length,
        gradient: "from-emerald-500 to-teal-600",
        iconBg:
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
      },
      {
        icon: FileQuestion,
        label: "Questions",
        value: totalQuestions,
        gradient: "from-violet-500 to-purple-600",
        iconBg:
          "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
      },
      {
        icon: Trophy,
        label: "Examens",
        value: exams.length,
        gradient: "from-amber-500 to-orange-600",
        iconBg:
          "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
      },
    ],
    [banks.length, totalQuestions, exams.length],
  );

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* ===== Hero — gradient-mesh + glassmorphism + floating badge ===== */}
      <section className="gradient-mesh relative overflow-hidden rounded-3xl border border-emerald-100/60 p-6 shadow-xl sm:p-8 md:p-12 dark:border-emerald-900/40">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 left-1/4 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.4),transparent_50%)]" />
        <div className="relative z-10 max-w-2xl space-y-3 sm:space-y-4">
          <FloatingBadge icon={<Sparkles className="h-3 w-3" />}>
            Préparation Concours Burkina Faso
          </FloatingBadge>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
            <GradientText>Plateforme de Quiz &amp; Examens Blancs</GradientText>
          </h1>
          <p className="text-sm text-emerald-950/80 sm:text-base md:text-lg dark:text-emerald-50/80">
            Révisez avec des banques de questions à choix multiples générées à
            partir de vos documents de cours. Choisissez votre niveau, votre
            mode de correction et entraînez-vous comme à l&apos;examen réel.
          </p>
          <div className="flex flex-wrap gap-2 pt-1 sm:gap-3 sm:pt-2">
            <div className="glass flex items-center gap-2 rounded-xl px-3 py-1.5 shadow-sm sm:px-4 sm:py-2">
              <BookOpen className="h-4 w-4 text-emerald-600 sm:h-5 sm:w-5" />
              <span className="text-xs font-medium text-emerald-950 sm:text-sm dark:text-emerald-50">
                {banks.length} banques
              </span>
            </div>
            <div className="glass flex items-center gap-2 rounded-xl px-3 py-1.5 shadow-sm sm:px-4 sm:py-2">
              <FileQuestion className="h-4 w-4 text-emerald-600 sm:h-5 sm:w-5" />
              <span className="text-xs font-medium text-emerald-950 sm:text-sm dark:text-emerald-50">
                {totalQuestions} questions
              </span>
            </div>
            <div className="glass flex items-center gap-2 rounded-xl px-3 py-1.5 shadow-sm sm:px-4 sm:py-2">
              <Trophy className="h-4 w-4 text-emerald-600 sm:h-5 sm:w-5" />
              <span className="text-xs font-medium text-emerald-950 sm:text-sm dark:text-emerald-50">
                {exams.length} examens blancs
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Stats Bar — 3 animated counters (Banques · Questions · Examens) ===== */}
      <section className="grid grid-cols-3 gap-2 sm:gap-3">
        {statsBar.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.4, ease: "easeOut" }}
              whileHover={{ y: -2 }}
              className="glass-strong relative overflow-hidden rounded-2xl border border-emerald-100/60 p-3 shadow-md sm:p-5 dark:border-emerald-900/40"
            >
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute -right-3 -top-3 h-16 w-16 rounded-full bg-gradient-to-br ${stat.gradient} opacity-10 blur-2xl`}
              />
              <div className="relative flex flex-col items-center gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${stat.iconBg}`}
                >
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0 text-center leading-tight sm:text-left">
                  <p className="text-lg font-extrabold sm:text-2xl">
                    <CountUp value={stat.value} />
                  </p>
                  <p className="text-[10px] font-medium text-muted-foreground sm:text-xs">
                    {stat.label}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </section>

      {/* ===== Quick Actions Grid — 4 gradient cards ===== */}
      <section className="space-y-3 sm:space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 shrink-0 text-emerald-600" />
          <h2 className="text-lg font-semibold sm:text-xl">Actions rapides</h2>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          {quickActions.map((action, i) => {
            const Icon = action.icon;
            return (
              <motion.button
                key={action.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.35 }}
                whileHover={{ y: -3, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={action.onClick}
                className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${action.gradient} p-3 text-left text-white shadow-lg sm:p-5`}
                aria-label={action.title}
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-4 -top-4 opacity-20 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6"
                >
                  <Icon className="h-16 w-16 sm:h-20 sm:w-20" />
                </div>
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 to-transparent"
                />
                <div className="relative z-10 flex h-full flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm sm:h-10 sm:w-10">
                      <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    {action.badge && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-bold backdrop-blur-sm">
                        {action.badge === "IA" && (
                          <Sparkles className="h-3 w-3" />
                        )}
                        {action.badge === "Top" && (
                          <Trophy className="h-3 w-3" />
                        )}
                        {action.badge}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold leading-tight sm:font-bold">
                      {action.title}
                    </p>
                    <p className="mt-0.5 text-[11px] opacity-90 sm:text-xs">
                      {action.desc}
                    </p>
                  </div>
                  <div className="mt-auto flex items-center gap-1 pt-1 text-[11px] font-semibold sm:pt-2 sm:text-xs">
                    Ouvrir
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* ===== Progress Summary Card (returning users only) ===== */}
      {progress && (
        <ProgressSummaryCard progress={progress} onContinue={openDashboard} />
      )}

      {/* ===== Daily Challenge ===== */}
      <DailyChallengeCard />

      {/* ===== Featured Banks Section ===== */}
      {featuredBanks.length > 0 && (
        <section className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 shrink-0 text-amber-500" />
              <h2 className="text-lg font-semibold sm:text-xl">
                Banques à la une
              </h2>
            </div>
            <Badge variant="outline" className="shrink-0 gap-1">
              <TrendingUp className="h-3 w-3" />
              Populaire
            </Badge>
          </div>
          <div className="flex snap-x gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-3 sm:overflow-visible">
            {featuredBanks.map((bank, i) => {
              const color = getColor(bank.color);
              const count = bank._count?.questions ?? 0;
              const lvlMeta = getEducationLevelMeta(
                bank.educationLevel ?? "TOUS",
              );
              const LvlIcon = lvlMeta.icon;
              return (
                <motion.div
                  key={bank.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.35 }}
                  whileHover={{ y: -3 }}
                  className="snap-start"
                >
                  <Card
                    className="glass-strong card-3d group relative h-full min-w-[260px] cursor-pointer overflow-hidden p-5 shadow-md hover:shadow-xl sm:min-w-0"
                    onClick={() => openBank(bank.id)}
                  >
                    <div
                      className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${color.gradient}`}
                    />
                    <div className="absolute right-3 top-3">
                      <Badge className="gap-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-500 hover:to-orange-600">
                        <TrendingUp className="h-3 w-3" />
                        Populaire
                      </Badge>
                    </div>
                    <div className="flex items-start gap-3 pt-2">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${color.bgSoft} ${color.text} transition-transform group-hover:scale-110`}
                      >
                        <BankIcon name={bank.icon} className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 font-bold leading-tight">
                          {bank.title}
                        </h3>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className={`${color.border} ${color.text}`}
                          >
                            {bank.category}
                          </Badge>
                          {(bank.educationLevel ?? "TOUS") !== "TOUS" && (
                            <Badge
                              variant="secondary"
                              className="gap-1"
                              title={`Niveau : ${lvlMeta.label}`}
                            >
                              <LvlIcon className="h-3 w-3" />
                              {lvlMeta.label}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                      {bank.description}
                    </p>
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                        <FileQuestion className="h-4 w-4" />
                        {count} questions
                      </span>
                      <span
                        className={`flex items-center gap-1 text-sm font-medium ${color.text} transition-transform group-hover:translate-x-0.5`}
                      >
                        Explorer
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {/* ===== Quick actions bar (search) ===== */}
      <section className="flex flex-col gap-3 sm:flex-row">
        <Button
          variant="outline"
          className="h-11 justify-start gap-2 sm:h-9"
          onClick={() => setSearchOpen(true)}
        >
          <Search className="h-4 w-4 text-emerald-600" />
          <span className="flex-1 truncate text-left">
            Rechercher une question...
          </span>
          <Badge variant="secondary" className="text-[10px]">
            Ctrl+K
          </Badge>
        </Button>
      </section>

      {/* Study reminders */}
      <StudyReminders />

      {/* ===== Banks section ===== */}
      <section className="space-y-3 sm:space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 shrink-0 text-emerald-600" />
            <h2 className="text-lg font-semibold sm:text-xl">
              Banques de questions
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Filter className="h-3 w-3" />
              {visibleBanks.length} affichées
            </Badge>
            <Badge variant="outline" className="gap-1">
              <FileQuestion className="h-3 w-3" />
              {visibleQuestions} questions
            </Badge>
          </div>
        </div>

        {/* Education level selector (E1) */}
        <EducationLevelSelector
          value={level}
          onChange={setLevel}
          counts={levelCounts}
        />

        {loadingBanks ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ShimmerSkeleton key={i} className="h-40 rounded-2xl" />
            ))}
          </div>
        ) : visibleBanks.length === 0 ? (
          <Card className="glass p-6 text-center text-muted-foreground sm:p-8">
            Aucune banque de questions pour le niveau{" "}
            <strong>{getEducationLevelMeta(level).label}</strong>. Choisissez un
            autre niveau ou revenez à « Tous ».
          </Card>
        ) : (
          <StaggerList className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleBanks.map((bank) => {
              const color = getColor(bank.color);
              const count = bank._count?.questions ?? 0;
              const lvlMeta = getEducationLevelMeta(
                bank.educationLevel ?? "TOUS",
              );
              const LvlIcon = lvlMeta.icon;
              return (
                <StaggerItem key={bank.id} className="h-full">
                  <Card
                    className="glass card-3d group relative h-full cursor-pointer overflow-hidden p-4 shadow-sm hover:shadow-xl sm:p-5"
                    onClick={() => openBank(bank.id)}
                  >
                    <div
                      className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${color.gradient}`}
                    />
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color.bgSoft} ${color.text} transition-transform group-hover:scale-110 sm:h-12 sm:w-12`}
                      >
                        <BankIcon
                          name={bank.icon}
                          className="h-5 w-5 sm:h-6 sm:w-6"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 font-semibold leading-tight">
                          {bank.title}
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className={`${color.border} ${color.text}`}
                          >
                            {bank.category}
                          </Badge>
                          {(bank.educationLevel ?? "TOUS") !== "TOUS" && (
                            <Badge
                              variant="secondary"
                              className="gap-1"
                              title={`Niveau : ${lvlMeta.label}`}
                            >
                              <LvlIcon className="h-3 w-3" />
                              {lvlMeta.label}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                      {bank.description}
                    </p>
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                        <FileQuestion className="h-4 w-4" />
                        {count} questions
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-9 gap-1 px-2 text-xs sm:h-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRevisionBank({
                              id: bank.id,
                              title: bank.title,
                            });
                          }}
                        >
                          <Layers3 className="h-3 w-3" />
                          <span className="hidden sm:inline">Réviser</span>
                        </Button>
                        <span
                          className={`flex items-center gap-1 text-sm font-medium ${color.text} transition-transform group-hover:translate-x-0.5`}
                        >
                          Explorer
                          <ArrowRight className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                  </Card>
                </StaggerItem>
              );
            })}
          </StaggerList>
        )}
      </section>

      {/* ===== Exams section ===== */}
      <section className="space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <GraduationCap className="h-5 w-5 shrink-0 text-violet-600" />
            <h2 className="text-lg font-semibold sm:text-xl">Examens blancs</h2>
          </div>
          <Badge variant="secondary" className="shrink-0">
            {exams.length} disponibles
          </Badge>
        </div>

        {loadingExams ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <ShimmerSkeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        ) : exams.length === 0 ? (
          <Card className="glass p-6 text-center text-sm text-muted-foreground sm:p-8">
            Aucun examen blanc disponible pour le moment. Utilisez l&apos;action
            « Examen IA » ci-dessus pour générer un examen personnalisé.
          </Card>
        ) : (
          <StaggerList className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {exams.map((exam) => {
              const count = exam._count?.examQuestions ?? 0;
              return (
                <StaggerItem key={exam.id} className="h-full">
                  <Card
                    className="glass card-3d group relative h-full cursor-pointer overflow-hidden p-5 shadow-sm hover:shadow-xl"
                    onClick={() => openExam(exam.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700 transition-transform group-hover:scale-110 dark:bg-violet-950/40 dark:text-violet-300">
                        <GraduationCap className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold leading-tight">
                          {exam.title}
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className="border-violet-200 text-violet-700 dark:border-violet-800 dark:text-violet-300"
                          >
                            <Clock className="mr-1 h-3 w-3" />
                            {exam.durationMin} min
                          </Badge>
                          <Badge
                            variant="outline"
                            className="border-violet-200 text-violet-700 dark:border-violet-800 dark:text-violet-300"
                          >
                            {count} questions
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                      {exam.description}
                    </p>
                    <div className="mt-4 flex items-center justify-end">
                      <span className="flex items-center gap-1 text-sm font-medium text-violet-700 transition-transform group-hover:translate-x-0.5 dark:text-violet-300">
                        Démarrer l&apos;examen
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </Card>
                </StaggerItem>
              );
            })}
          </StaggerList>
        )}
      </section>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      <RevisionDialog
        bankId={revisionBank?.id ?? null}
        bankTitle={revisionBank?.title ?? ""}
        open={!!revisionBank}
        onOpenChange={(o) => !o && setRevisionBank(null)}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Progress Summary Card                                               */
/* ------------------------------------------------------------------ */

interface ProgressData {
  xp: number;
  level: number;
  rank: number | null;
  totalUsers: number | null;
  avgScore: number;
  sessionsCount: number;
  streak: number;
}

function ProgressSummaryCard({
  progress,
  onContinue,
}: {
  progress: ProgressData;
  onContinue: () => void;
}) {
  // XP needed for current level = level * 500.
  // XP needed for next level = (level + 1) * 500.
  // Progress to next level = (xp - (level-1)*500) / 500.
  const currentLevelBase = (progress.level - 1) * 500;
  const nextLevelBase = progress.level * 500;
  const xpIntoLevel = progress.xp - currentLevelBase;
  const xpForNext = nextLevelBase - currentLevelBase;
  const pct = Math.max(0, Math.min(100, (xpIntoLevel / xpForNext) * 100));

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-strong relative overflow-hidden rounded-3xl border border-emerald-100/60 p-5 shadow-xl sm:p-6 dark:border-emerald-900/40"
    >
      {/* Decorative orbs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-violet-400/15 blur-3xl"
      />
      <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: title + progress bar */}
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold sm:text-lg">
                Votre progression
              </h2>
              <p className="text-xs text-muted-foreground">
                Reprenez là où vous vous êtes arrêté
              </p>
            </div>
          </div>

          {/* Mini progress bar to next level */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-muted-foreground">
                Niveau {progress.level}
              </span>
              <span className="font-medium text-muted-foreground">
                Niveau {progress.level + 1}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-600"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              {xpIntoLevel} / {xpForNext} XP pour le niveau suivant
            </p>
          </div>
        </div>

        {/* Right: stat pills + CTA */}
        <div className="flex flex-col gap-3 lg:items-end">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex lg:gap-2">
            <Pill
              icon={Zap}
              label="XP"
              value={progress.xp.toLocaleString("fr-FR")}
              color="text-amber-600"
              bg="bg-amber-50 dark:bg-amber-950/40"
            />
            <Pill
              icon={TrendingUp}
              label="Niveau"
              value={String(progress.level)}
              color="text-emerald-600"
              bg="bg-emerald-50 dark:bg-emerald-950/40"
            />
            <Pill
              icon={Flame}
              label="Série"
              value={`${progress.streak} j`}
              color="text-rose-600"
              bg="bg-rose-50 dark:bg-rose-950/40"
            />
            <Pill
              icon={Crown}
              label="Rang"
              value={
                progress.rank && progress.totalUsers
                  ? `${progress.rank}/${progress.totalUsers}`
                  : "—"
              }
              color="text-violet-600"
              bg="bg-violet-50 dark:bg-violet-950/40"
            />
          </div>
          <Button
            onClick={onContinue}
            className="h-11 gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20 hover:opacity-95 sm:h-10"
          >
            Continuer où vous vous êtes arrêté
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </motion.section>
  );
}

function Pill({
  icon: Icon,
  label,
  value,
  color,
  bg,
}: {
  icon: typeof Zap;
  label: string;
  value: string;
  color: string;
  bg: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl ${bg} px-3 py-2 lg:min-w-[88px]`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${color}`} />
      <div className="min-w-0 leading-tight">
        <p className={`text-sm font-bold ${color}`}>{value}</p>
        <p className="truncate text-[10px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

