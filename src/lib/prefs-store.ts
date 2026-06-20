"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Locale } from "./i18n";

export interface Badge {
  id: string;
  label: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

export interface NotificationItem {
  id: string;
  type: "result" | "reminder" | "progress" | "badge" | "info";
  title: string;
  message: string;
  date: string;
  read: boolean;
}

interface PrefsState {
  locale: Locale;
  setLocale: (l: Locale) => void;
  highContrast: boolean;
  largeText: boolean;
  reduceMotion: boolean;
  toggleHighContrast: () => void;
  toggleLargeText: () => void;
  toggleReduceMotion: () => void;
  xp: number;
  level: number;
  streak: number;
  lastActiveDate: string;
  badges: Badge[];
  sessionsCompleted: number;
  totalCorrect: number;
  totalAnswered: number;
  addXp: (amount: number) => void;
  recordSession: (correct: number, total: number) => void;
  unlockBadge: (id: string) => void;
  notifications: NotificationItem[];
  addNotification: (n: Omit<NotificationItem, "id" | "date" | "read">) => void;
  markAllRead: () => void;
  unreadCount: () => number;
}

const DEFAULT_BADGES: Badge[] = [
  { id: "first-quiz", label: "Premier pas", description: "Terminer votre premier quiz", icon: "Footprints", unlocked: false },
  { id: "streak-3", label: "Régulier", description: "3 jours consécutifs", icon: "Flame", unlocked: false },
  { id: "streak-7", label: "Assidu", description: "7 jours consécutifs", icon: "Trophy", unlocked: false },
  { id: "perfect-score", label: "Sans faute", description: "100% à un quiz", icon: "Star", unlocked: false },
  { id: "quiz-master-10", label: "Quiz Master", description: "Terminer 10 quiz", icon: "Crown", unlocked: false },
  { id: "xp-500", label: "Érudit", description: "Atteindre 500 XP", icon: "GraduationCap", unlocked: false },
  { id: "exam-complete", label: "Candidat", description: "Terminer un examen blanc", icon: "FileCheck", unlocked: false },
  { id: "scholar-100", label: "Studieux", description: "Répondre à 100 questions", icon: "BookOpen", unlocked: false },
];

function levelFromXp(xp: number): number {
  return Math.floor(xp / 100) + 1;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export const usePrefs = create<PrefsState>()(
  persist(
    (set, get) => ({
      locale: "fr",
      setLocale: (l) => set({ locale: l }),
      highContrast: false,
      largeText: false,
      reduceMotion: false,
      toggleHighContrast: () => set((s) => ({ highContrast: !s.highContrast })),
      toggleLargeText: () => set((s) => ({ largeText: !s.largeText })),
      toggleReduceMotion: () => set((s) => ({ reduceMotion: !s.reduceMotion })),
      xp: 0,
      level: 1,
      streak: 0,
      lastActiveDate: "",
      badges: DEFAULT_BADGES,
      sessionsCompleted: 0,
      totalCorrect: 0,
      totalAnswered: 0,
      addXp: (amount) => {
        const newXp = get().xp + amount;
        set({ xp: newXp, level: levelFromXp(newXp) });
        if (newXp >= 500) get().unlockBadge("xp-500");
      },
      recordSession: (correct, total) => {
        const today = todayStr();
        const lastDate = get().lastActiveDate;
        let newStreak = get().streak;
        if (lastDate !== today) {
          const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
          if (lastDate === yesterday) newStreak += 1;
          else newStreak = 1;
        }
        const newSessions = get().sessionsCompleted + 1;
        const newXp = get().xp + correct * 10 + (correct === total ? 50 : 0);
        set({
          streak: newStreak,
          lastActiveDate: today,
          sessionsCompleted: newSessions,
          totalCorrect: get().totalCorrect + correct,
          totalAnswered: get().totalAnswered + total,
          xp: newXp,
          level: levelFromXp(newXp),
        });
        const b = get().badges;
        if (newSessions === 1) get().unlockBadge("first-quiz");
        if (newStreak >= 3) get().unlockBadge("streak-3");
        if (newStreak >= 7) get().unlockBadge("streak-7");
        if (correct === total && total > 0) get().unlockBadge("perfect-score");
        if (newSessions >= 10) get().unlockBadge("quiz-master-10");
        if (get().totalAnswered >= 100) get().unlockBadge("scholar-100");
      },
      unlockBadge: (id) => {
        const badges = get().badges;
        const existing = badges.find((b) => b.id === id);
        if (existing && !existing.unlocked) {
          set({ badges: badges.map((b) => b.id === id ? { ...b, unlocked: true } : b) });
          const badge = badges.find((b) => b.id === id);
          if (badge) {
            get().addNotification({ type: "badge", title: "Badge débloqué !", message: `Vous avez débloqué le badge « ${badge.label} »` });
          }
        }
      },
      notifications: [],
      addNotification: (n) => {
        const item: NotificationItem = { ...n, id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, date: new Date().toISOString(), read: false };
        set((s) => ({ notifications: [item, ...s.notifications].slice(0, 50) }));
      },
      markAllRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
      unreadCount: () => get().notifications.filter((n) => !n.read).length,
    }),
    { name: "quizexam-prefs" }
  )
);
