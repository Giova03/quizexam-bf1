"use client";

import { useEffect, useCallback, useState, useMemo } from "react";
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
} from "./animated-components";
import { StaggerList, StaggerItem } from "./page-transitions";
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
} from "lucide-react";

export function HomeView() {
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
  } = useQuizStore();

  const [searchOpen, setSearchOpen] = useState(false);
  const [revisionBank, setRevisionBank] = useState<{ id: string; title: string } | null>(null);
  // Education level filter (added in E1). Defaults to "TOUS".
  // The level is also persisted to localStorage so users keep their filter
  // between sessions.
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

  // Pre-compute counts per level (used by the level selector + the questions
  // total for the active level).
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

  // Banks visible for the currently selected level.
  // "TOUS" shows everything; otherwise show banks at that level + TOUS banks.
  const visibleBanks = useMemo(() => {
    if (level === "TOUS") return banks;
    return banks.filter((b) => {
      const lvl = (b.educationLevel ?? "TOUS").toUpperCase();
      return lvl === level || lvl === "TOUS";
    });
  }, [banks, level]);

  // Total questions in the visible banks.
  const visibleQuestions = useMemo(
    () =>
      visibleBanks.reduce(
        (sum, b) => sum + (b._count?.questions ?? 0),
        0,
      ),
    [visibleBanks],
  );

  const totalQuestions = banks.reduce(
    (sum, b) => sum + (b._count?.questions ?? 0),
    0
  );

  return (
    <div className="space-y-10">
      {/* Hero — gradient-mesh + glassmorphism + floating badge */}
      <section className="gradient-mesh relative overflow-hidden rounded-3xl border border-emerald-100/60 p-8 shadow-xl md:p-12 dark:border-emerald-900/40">
        {/* Decorative blurred orbs for depth */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 left-1/4 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.4),transparent_50%)]" />
        <div className="relative z-10 max-w-2xl space-y-4">
          <FloatingBadge icon={<Sparkles className="h-3 w-3" />}>
            Préparation Concours Burkina Faso
          </FloatingBadge>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            <GradientText>Plateforme de Quiz &amp; Examens Blancs</GradientText>
          </h1>
          <p className="text-base text-emerald-950/80 md:text-lg dark:text-emerald-50/80">
            Révisez avec des banques de questions à choix multiples générées à
            partir de vos documents de cours. Choisissez votre niveau, votre
            mode de correction et entraînez-vous comme à l&apos;examen réel.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <div className="glass flex items-center gap-2 rounded-xl px-4 py-2 shadow-sm">
              <BookOpen className="h-5 w-5 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-950 dark:text-emerald-50">
                {banks.length} banques
              </span>
            </div>
            <div className="glass flex items-center gap-2 rounded-xl px-4 py-2 shadow-sm">
              <FileQuestion className="h-5 w-5 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-950 dark:text-emerald-50">
                {totalQuestions} questions
              </span>
            </div>
            <div className="glass flex items-center gap-2 rounded-xl px-4 py-2 shadow-sm">
              <Trophy className="h-5 w-5 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-950 dark:text-emerald-50">
                {exams.length} examens blancs
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Quick actions bar */}
      <section className="flex flex-col gap-3 sm:flex-row">
        <Button variant="outline" className="gap-2 justify-start" onClick={() => setSearchOpen(true)}>
          <Search className="h-4 w-4 text-emerald-600" />
          <span className="flex-1 text-left">Rechercher une question...</span>
          <Badge variant="secondary" className="text-[10px]">Ctrl+K</Badge>
        </Button>
      </section>

      {/* Study reminders */}
      <StudyReminders />

      {/* Banks section */}
      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-emerald-600" />
            <h2 className="text-xl font-semibold">Banques de questions</h2>
          </div>
          <div className="flex items-center gap-2">
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

        {/* Education level selector (added in E1) */}
        <EducationLevelSelector
          value={level}
          onChange={setLevel}
          counts={levelCounts}
        />

        {loadingBanks ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ShimmerSkeleton key={i} className="h-40 rounded-2xl" />
            ))}
          </div>
        ) : visibleBanks.length === 0 ? (
          <Card className="glass p-8 text-center text-muted-foreground">
            Aucune banque de questions pour le niveau{" "}
            <strong>{getEducationLevelMeta(level).label}</strong>. Choisissez un
            autre niveau ou revenez à « Tous ».
          </Card>
        ) : (
          <StaggerList className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                    className="glass card-3d group relative h-full cursor-pointer overflow-hidden p-5 shadow-sm hover:shadow-xl"
                    onClick={() => openBank(bank.id)}
                  >
                    <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${color.gradient}`} />
                    <div className="flex items-start gap-3">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${color.bgSoft} ${color.text} transition-transform group-hover:scale-110`}>
                        <BankIcon name={bank.icon} className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold leading-tight">{bank.title}</h3>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline" className={`${color.border} ${color.text}`}>
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
                    <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{bank.description}</p>
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                        <FileQuestion className="h-4 w-4" />
                        {count} questions
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 gap-1 px-2 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRevisionBank({ id: bank.id, title: bank.title });
                          }}
                        >
                          <Layers3 className="h-3 w-3" />
                          <span className="hidden sm:inline">Réviser</span>
                        </Button>
                        <span className={`flex items-center gap-1 text-sm font-medium ${color.text} transition-transform group-hover:translate-x-0.5`}>
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

      {/* Exams section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-violet-600" />
            <h2 className="text-xl font-semibold">Examens blancs</h2>
          </div>
          <Badge variant="secondary">{exams.length} disponibles</Badge>
        </div>

        {loadingExams ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <ShimmerSkeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        ) : exams.length === 0 ? (
          <Card className="glass p-8 text-center text-muted-foreground">
            Aucun examen blanc disponible pour le moment.
          </Card>
        ) : (
          <StaggerList className="grid gap-4 sm:grid-cols-2">
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
                        <h3 className="font-semibold leading-tight">{exam.title}</h3>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="border-violet-200 text-violet-700 dark:border-violet-800 dark:text-violet-300">
                            <Clock className="mr-1 h-3 w-3" />
                            {exam.durationMin} min
                          </Badge>
                          <Badge variant="outline" className="border-violet-200 text-violet-700 dark:border-violet-800 dark:text-violet-300">
                            {count} questions
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{exam.description}</p>
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
