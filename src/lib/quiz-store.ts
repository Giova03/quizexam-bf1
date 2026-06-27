"use client";

import { create } from "zustand";
import type {
  ViewName,
  CorrectionMode,
  QuestionBank,
  Exam,
  QuizSession,
} from "./types";

/** Difficulty levels supported by the start-dialog. */
export type SessionDifficulty = "easy" | "medium" | "hard" | "all";

interface QuizState {
  view: ViewName;
  selectedBankId: string | null;
  selectedExamId: string | null;
  currentSessionId: string | null;
  /**
   * The difficulty filter the user picked when starting the current session.
   * Used by SessionView to award the master-hard badge (only when difficulty
   * is "hard"). Cleared when the session completes. Defaults to null (= "all").
   */
  currentSessionDifficulty: SessionDifficulty | null;
  /**
   * For the public-profile view: the user whose profile is being displayed.
   * When null (default), the ProfileView shows the current user's own profile.
   */
  profileUserId: string | null;
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
  startSession: (sessionId: string, difficulty?: SessionDifficulty) => void;
  viewResults: (sessionId: string) => void;
  openDashboard: () => void;
  openAbout: () => void;
  openAdmin: () => void;
  openSocial: () => void;
  openLeaderboard: () => void;
  openSpacedRepetition: () => void;
  openAchievements: () => void;
  /** Open the forum view (list of topics). */
  openForum: () => void;
  /** Open the real-time competition mode (create / join rooms, play live quizzes). */
  openCompetition: () => void;
  /**
   * Open the profile view. If `userId` is omitted (or null), shows the
   * current user's own profile; otherwise shows the public profile for
   * the given user id.
   */
  openProfile: (userId?: string | null) => void;
}

export const useQuizStore = create<QuizState>((set) => ({
  view: "home",
  selectedBankId: null,
  selectedExamId: null,
  currentSessionId: null,
  currentSessionDifficulty: null,
  profileUserId: null,
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
      currentSessionDifficulty: null,
      profileUserId: null,
      session: null,
    }),
  openBank: (id) => set({ selectedBankId: id, view: "bank-detail" }),
  openExam: (id) => set({ selectedExamId: id, view: "exam-detail" }),
  startSession: (sessionId, difficulty) =>
    set({
      currentSessionId: sessionId,
      view: "session",
      currentSessionDifficulty: difficulty ?? null,
    }),
  viewResults: (sessionId) =>
    set({ currentSessionId: sessionId, view: "results" }),
  openDashboard: () => set({ view: "dashboard" }),
  openAbout: () => set({ view: "about" }),
  openAdmin: () => set({ view: "admin" }),
  openSocial: () => set({ view: "social" }),
  openLeaderboard: () => set({ view: "leaderboard" }),
  openSpacedRepetition: () => set({ view: "spaced-repetition" }),
  openAchievements: () => set({ view: "achievements" }),
  openForum: () => set({ view: "forum" }),
  openCompetition: () => set({ view: "competition" }),
  openProfile: (userId = null) => set({ view: "profile", profileUserId: userId }),
}));

export const pendingStart = {
  sourceType: null as "bank" | "exam" | null,
  sourceId: null as string | null,
  sourceTitle: null as string | null,
  mode: "immediate" as CorrectionMode,
};
