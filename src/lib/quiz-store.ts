"use client";

import { create } from "zustand";
import type {
  ViewName,
  CorrectionMode,
  QuestionBank,
  Exam,
  QuizSession,
} from "./types";

interface QuizState {
  // Navigation
  view: ViewName;
  selectedBankId: string | null;
  selectedExamId: string | null;
  currentSessionId: string | null;

  // Cached data
  banks: QuestionBank[];
  exams: Exam[];
  session: QuizSession | null;

  // Loading flags
  loadingBanks: boolean;
  loadingExams: boolean;
  loadingSession: boolean;

  // Actions
  setView: (view: ViewName) => void;
  selectBank: (id: string) => void;
  selectExam: (id: string) => void;
  setSessionId: (id: string | null) => void;
  setBanks: (banks: QuestionBank[]) => void;
  setExams: (exams: Exam[]) => void;
  setSession: (session: QuizSession | null) => void;
  setLoadingBanks: (v: boolean) => void;
  setLoadingExams: (v: boolean) => void;
  setLoadingSession: (v: boolean) => void;

  // Navigation helpers
  goHome: () => void;
  openBank: (id: string) => void;
  openExam: (id: string) => void;
  startSession: (sessionId: string) => void;
  viewResults: (sessionId: string) => void;
}

export const useQuizStore = create<QuizState>((set) => ({
  view: "home",
  selectedBankId: null,
  selectedExamId: null,
  currentSessionId: null,
  banks: [],
  exams: [],
  session: null,
  loadingBanks: false,
  loadingExams: false,
  loadingSession: false,

  setView: (view) => set({ view }),
  selectBank: (id) => set({ selectedBankId: id }),
  selectExam: (id) => set({ selectedExamId: id }),
  setSessionId: (id) => set({ currentSessionId: id }),
  setBanks: (banks) => set({ banks }),
  setExams: (exams) => set({ exams }),
  setSession: (session) => set({ session }),
  setLoadingBanks: (v) => set({ loadingBanks: v }),
  setLoadingExams: (v) => set({ loadingExams: v }),
  setLoadingSession: (v) => set({ loadingSession: v }),

  goHome: () =>
    set({
      view: "home",
      selectedBankId: null,
      selectedExamId: null,
      currentSessionId: null,
      session: null,
    }),
  openBank: (id) =>
    set({ selectedBankId: id, view: "bank-detail" }),
  openExam: (id) =>
    set({ selectedExamId: id, view: "exam-detail" }),
  startSession: (sessionId) =>
    set({ currentSessionId: sessionId, view: "session" }),
  viewResults: (sessionId) =>
    set({ currentSessionId: sessionId, view: "results" }),
}));

// Standalone helper to fetch with the chosen correction mode stored for the
// start-dialog flow. Kept outside the store to avoid re-renders.
export const pendingStart = {
  sourceType: null as "bank" | "exam" | null,
  sourceId: null as string | null,
  sourceTitle: null as string | null,
  mode: "immediate" as CorrectionMode,
};
