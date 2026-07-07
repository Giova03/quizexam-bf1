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
  // Social/community views (added in F6):
  /** Open the study groups view (list, create, join by code). */
  openGroups: () => void;
  /** Open the calendar events view. */
  openEvents: () => void;
  /** Open the blog / articles view. */
  openBlog: () => void;
  /**
   * Open the AI-generated personalised study plan view (added in E2).
   * Lets the user generate, view and track a day-by-day plan.
   */
  openStudyPlan: () => void;
  /**
   * Open the gamification quests view (added in E4) — daily / weekly /
   * special quests with progress + claim reward.
   */
  openQuests: () => void;
  /**
   * Open the Duolingo-style skill tree (added in E4) — vertical tree of
   * banks with mastery lighting (50% lit, 80% gold).
   */
  openSkillTree: () => void;
  /**
   * Open the QuizCoins shop (added in E4) — themes, avatars, boosters,
   * premium preview, custom badges.
   */
  openShop: () => void;
  // Social features (added in E5):
  /** Open the private messaging view (conversations + chat thread). */
  openMessages: () => void;
  /** Open the mentorship view (browse mentors, see your mentor/mentees). */
  openMentorship: () => void;
  /** Open the collaborative wiki view (browse, read, create/edit). */
  openWiki: () => void;
  /** Open the live revision sessions view (upcoming sessions + join). */
  openLiveSessions: () => void;
  // Pedagogy features (added in E6):
  /** Open the official exam simulator (BEPC/BAC/Concours Admin/Santé). */
  openOfficialExam: () => void;
  /** Open the auto-generated study sheet view. */
  openStudySheet: () => void;
  /** Open the 30-day guided study path. */
  openGuidedPath: () => void;
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
  openGroups: () => set({ view: "groups" }),
  openEvents: () => set({ view: "events" }),
  openBlog: () => set({ view: "blog" }),
  openStudyPlan: () => set({ view: "study-plan" }),
  openQuests: () => set({ view: "quests" }),
  openSkillTree: () => set({ view: "skill-tree" }),
  openShop: () => set({ view: "shop" }),
  openMessages: () => set({ view: "messages" }),
  openMentorship: () => set({ view: "mentorship" }),
  openWiki: () => set({ view: "wiki" }),
  openLiveSessions: () => set({ view: "live-sessions" }),
  openOfficialExam: () => set({ view: "official-exam" }),
  openStudySheet: () => set({ view: "study-sheet" }),
  openGuidedPath: () => set({ view: "guided-path" }),
}));

export const pendingStart = {
  sourceType: null as "bank" | "exam" | null,
  sourceId: null as string | null,
  sourceTitle: null as string | null,
  mode: "immediate" as CorrectionMode,
};
