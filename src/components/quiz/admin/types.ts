/**
 * Shared types for the admin panel sub-components.
 *
 * Extracted from the original monolithic admin-view.tsx so each tab's
 * component file can import the same shapes without creating a circular
 * dependency on admin-view.tsx itself.
 */

export interface AdminStats {
  counts: {
    banks: number;
    questions: number;
    exams: number;
    users: number;
    sessions: number;
    completedSessions: number;
  };
  recentUsers: Array<{
    id: string;
    email: string;
    name: string;
    role: string;
    createdAt: string;
  }>;
  recentSessions: Array<{
    id: string;
    title: string;
    score: number;
    totalQuestions: number;
    completedAt: string;
    user: { name: string | null; email: string | null } | null;
  }>;
  bankStats: Array<{
    id: string;
    title: string;
    category: string;
    subcategory: string;
    _count: { questions: number };
  }>;
}

export interface Question {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  correctAnswer2?: string | null;
  explanation: string;
  order: number;
  difficulty?: string;
  imageUrl?: string | null;
  audioUrl?: string | null;
}
