// Shared types for the quiz platform

export type CorrectionMode = "immediate" | "final";

export type SourceType = "bank" | "exam";

export interface Question {
  id: string;
  bankId: string;
  order: number;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: "A" | "B" | "C" | "D";
  explanation: string;
}

export interface QuestionBank {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  _count?: { questions: number };
  questions?: Question[];
}

export interface Exam {
  id: string;
  title: string;
  description: string;
  durationMin: number;
  createdAt: string;
  _count?: { examQuestions: number };
  examQuestions?: Array<{ id: string; order: number; question: Question }>;
}

export interface SessionAnswer {
  id: string;
  questionId: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: "A" | "B" | "C" | "D";
  userAnswer: "A" | "B" | "C" | "D" | null;
  explanation: string;
  isCorrect: boolean | null;
  answeredAt: string | null;
}

export interface QuizSession {
  id: string;
  title: string;
  mode: CorrectionMode;
  sourceType: SourceType;
  sourceId: string;
  score: number;
  totalQuestions: number;
  startedAt: string;
  completedAt: string | null;
  answers: SessionAnswer[];
}

export type ViewName =
  | "home"
  | "bank-list"
  | "bank-detail"
  | "exam-list"
  | "exam-detail"
  | "session"
  | "results"
  | "dashboard"
  | "about"
  | "admin"
  | "social"
  | "leaderboard";

// Color mapping helper for bank/exam accent colors
export const COLOR_CLASSES: Record<
  string,
  {
    bg: string;
    bgSoft: string;
    text: string;
    border: string;
    ring: string;
    gradient: string;
  }
> = {
  emerald: {
    bg: "bg-emerald-500",
    bgSoft: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
    ring: "ring-emerald-500",
    gradient: "from-emerald-500 to-teal-600",
  },
  violet: {
    bg: "bg-violet-500",
    bgSoft: "bg-violet-50 dark:bg-violet-950/40",
    text: "text-violet-700 dark:text-violet-300",
    border: "border-violet-200 dark:border-violet-800",
    ring: "ring-violet-500",
    gradient: "from-violet-500 to-purple-600",
  },
  amber: {
    bg: "bg-amber-500",
    bgSoft: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
    ring: "ring-amber-500",
    gradient: "from-amber-500 to-orange-600",
  },
  sky: {
    bg: "bg-sky-500",
    bgSoft: "bg-sky-50 dark:bg-sky-950/40",
    text: "text-sky-700 dark:text-sky-300",
    border: "border-sky-200 dark:border-sky-800",
    ring: "ring-sky-500",
    gradient: "from-sky-500 to-cyan-600",
  },
  rose: {
    bg: "bg-rose-500",
    bgSoft: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-200 dark:border-rose-800",
    ring: "ring-rose-500",
    gradient: "from-rose-500 to-pink-600",
  },
  cyan: {
    bg: "bg-cyan-500",
    bgSoft: "bg-cyan-50 dark:bg-cyan-950/40",
    text: "text-cyan-700 dark:text-cyan-300",
    border: "border-cyan-200 dark:border-cyan-800",
    ring: "ring-cyan-500",
    gradient: "from-cyan-500 to-teal-600",
  },
  teal: {
    bg: "bg-teal-500",
    bgSoft: "bg-teal-50 dark:bg-teal-950/40",
    text: "text-teal-700 dark:text-teal-300",
    border: "border-teal-200 dark:border-teal-800",
    ring: "ring-teal-500",
    gradient: "from-teal-500 to-emerald-600",
  },
};

export function getColor(name: string) {
  return COLOR_CLASSES[name] ?? COLOR_CLASSES.emerald;
}
