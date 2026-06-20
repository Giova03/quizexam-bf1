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
  view: ViewName;
  selectedBankId: string | null;
  selectedExamId: string | null;
  currentSessionId: string | null;
  banks: QuestionBank[];
  exams: Exam[];
  session: QuizSession | null;
  loadingBanks: boolean;
  loadingExams: boolean;
  loadingSession: boolean;

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

  goHome: () => void;
  openBank: (id: string) => void;
  openExam: (id: string) => void;
  startSession: (sessionId: string) => void;
  viewResults: (sessionId: string) => void;
  openDashboard: () => void;
  openAbout: () => void;
  openAdmin: () => void;
  openSocial: () => void;
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
  openBank: (id) => set({ selectedBankId: id, view: "bank-detail" }),
  openExam: (id) => set({ selectedExamId: id, view: "exam-detail" }),
  startSession: (sessionId) =>
    set({ currentSessionId: sessionId, view: "session" }),
  viewResults: (sessionId) =>
    set({ currentSessionId: sessionId, view: "results" }),
  openDashboard: () => set({ view: "dashboard" }),
  openAbout: () => set({ view: "about" }),
  openAdmin: () => set({ view: "admin" }),
  openSocial: () => set({ view: "social" }),
}));

export const pendingStart = {
  sourceType: null as "bank" | "exam" | null,
  sourceId: null as string | null,
  sourceTitle: null as string | null,
  mode: "immediate" as CorrectionMode,
};
