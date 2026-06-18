"use client";

import { useQuizStore } from "@/lib/quiz-store";
import { HomeView } from "@/components/quiz/home-view";
import { BankDetailView } from "@/components/quiz/bank-detail-view";
import { ExamDetailView } from "@/components/quiz/exam-detail-view";
import { SessionView } from "@/components/quiz/session-view";
import { ResultsView } from "@/components/quiz/results-view";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  House,
} from "lucide-react";

export default function Home() {
  const { view, goHome } = useQuizStore();

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <button
            onClick={goHome}
            className="flex items-center gap-2 font-bold transition-opacity hover:opacity-80"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
              <GraduationCap className="h-5 w-5" />
            </span>
            <span className="hidden sm:inline">QuizExam BF</span>
          </button>

          {view !== "home" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={goHome}
              className="gap-2"
            >
              <House className="h-4 w-4" />
              Accueil
            </Button>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {view === "home" && <HomeView />}
        {view === "bank-detail" && <BankDetailView />}
        {view === "exam-detail" && <ExamDetailView />}
        {view === "session" && <SessionView />}
        {view === "results" && <ResultsView />}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t bg-background">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex flex-col items-center justify-between gap-2 text-sm text-muted-foreground sm:flex-row">
            <p>
              Plateforme de Quiz &amp; Examens Blancs — Préparation Concours
              Burkina Faso
            </p>
            <p className="text-xs">
              Questions générées à partir de vos documents de cours
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
