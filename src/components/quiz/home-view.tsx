"use client";

import { useEffect, useCallback } from "react";
import { useQuizStore } from "@/lib/quiz-store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BankIcon } from "./bank-icon";
import { getColor } from "@/lib/types";
import {
  GraduationCap,
  FileQuestion,
  Clock,
  Layers,
  ArrowRight,
  BookOpen,
  Trophy,
  Sparkles,
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

  const loadBanks = useCallback(async () => {
    setLoadingBanks(true);
    try {
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

  const totalQuestions = banks.reduce(
    (sum, b) => sum + (b._count?.questions ?? 0),
    0
  );

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 p-8 text-white shadow-lg md:p-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
        <div className="relative z-10 max-w-2xl space-y-4">
          <Badge className="border-white/30 bg-white/15 text-white backdrop-blur">
            <Sparkles className="mr-1 h-3 w-3" />
            Préparation Concours Burkina Faso
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Plateforme de Quiz &amp; Examens Blancs
          </h1>
          <p className="text-base text-white/90 md:text-lg">
            Révisez avec des banques de questions à choix multiples générées à
            partir de vos documents de cours. Choisissez votre mode de
            correction et entraînez-vous comme à l&apos;examen réel.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <div className="flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2 backdrop-blur">
              <Layers className="h-5 w-5" />
              <span className="text-sm font-medium">
                {banks.length} banques
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2 backdrop-blur">
              <FileQuestion className="h-5 w-5" />
              <span className="text-sm font-medium">
                {totalQuestions} questions
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2 backdrop-blur">
              <Trophy className="h-5 w-5" />
              <span className="text-sm font-medium">
                {exams.length} examens blancs
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Banks section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-emerald-600" />
            <h2 className="text-xl font-semibold">Banques de questions</h2>
          </div>
          <Badge variant="secondary">{banks.length} disponibles</Badge>
        </div>

        {loadingBanks ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : banks.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            Aucune banque de questions disponible pour le moment.
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {banks.map((bank) => {
              const color = getColor(bank.color);
              const count = bank._count?.questions ?? 0;
              return (
                <Card
                  key={bank.id}
                  className="group relative cursor-pointer overflow-hidden p-5 transition-all hover:-translate-y-1 hover:shadow-lg"
                  onClick={() => openBank(bank.id)}
                >
                  <div
                    className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${color.gradient}`}
                  />
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${color.bgSoft} ${color.text}`}
                    >
                      <BankIcon name={bank.icon} className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold leading-tight">
                        {bank.title}
                      </h3>
                      <Badge
                        variant="outline"
                        className={`mt-1 ${color.border} ${color.text}`}
                      >
                        {bank.category}
                      </Badge>
                    </div>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                    {bank.description}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
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
              );
            })}
          </div>
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
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : exams.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            Aucun examen blanc disponible pour le moment.
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {exams.map((exam) => {
              const count = exam._count?.examQuestions ?? 0;
              return (
                <Card
                  key={exam.id}
                  className="group cursor-pointer overflow-hidden p-5 transition-all hover:-translate-y-1 hover:shadow-lg"
                  onClick={() => openExam(exam.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                      <GraduationCap className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold leading-tight">
                        {exam.title}
                      </h3>
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
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
