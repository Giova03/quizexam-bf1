"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { useQuizStore } from "@/lib/quiz-store";
import {
  GraduationCap,
  Clock,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Send,
  FileText,
  Loader2,
} from "lucide-react";

/**
 * OfficialExamView — "Mode examen blanc officiel" (Feature E6.1).
 *
 * Lets the user simulate a real Burkina Faso exam (BEPC, BAC, Concours
 * Admin, Concours Santé):
 *   - 50 questions shuffled across banks matching the exam level
 *   - Strict timer (60-120 min depending on exam type)
 *   - Mode "final" (no feedback during the exam)
 *   - Detailed correction at the end (correct answer + explanation)
 *
 * Implementation notes:
 *   - Uses the existing session API: POST /api/sessions with mode="final",
 *     sourceType="bank", and a curated `questionIds` array of 50 ids
 *     gathered from banks whose `educationLevel` matches the exam type.
 *   - PATCH /api/sessions/[id]/answers/[answerId] is called whenever the
 *     user changes their answer, but NO correctness info is shown until
 *     the user submits.
 *   - POST /api/sessions/[id]/complete is called on submit (or auto-submit
 *     when the timer reaches 0).
 *   - The detailed correction is rendered inline using the completed
 *     session's answers (correctAnswer / userAnswer / explanation).
 */

type ExamType = "BEPC" | "BAC" | "CONCOURS_ADMIN" | "CONCOURS_SANTE";

interface ExamTypeConfig {
  id: ExamType;
  label: string;
  description: string;
  /** Exam duration in minutes (60–120). */
  durationMin: number;
  /** Education level used to filter banks (matches QuestionBank.educationLevel). */
  educationLevel: string;
  /** Optional keywords used to prefer banks whose title matches. */
  preferKeywords?: string[];
  /** Accent color (Tailwind). */
  color: string;
  icon: typeof GraduationCap;
}

const EXAM_TYPES: ExamTypeConfig[] = [
  {
    id: "BEPC",
    label: "BEPC",
    description: "Brevet d'Études du Premier Cycle — niveau collège",
    durationMin: 60,
    educationLevel: "BEPC",
    color: "emerald",
    icon: GraduationCap,
  },
  {
    id: "BAC",
    label: "Baccalauréat",
    description: "BAC — niveau lycée, toutes séries",
    durationMin: 120,
    educationLevel: "BAC",
    color: "violet",
    icon: GraduationCap,
  },
  {
    id: "CONCOURS_ADMIN",
    label: "Concours Admin",
    description: "Concours de la fonction publique & administration",
    durationMin: 90,
    educationLevel: "CONCOURS",
    preferKeywords: ["admin", "fonction", "culture", "concours"],
    color: "amber",
    icon: GraduationCap,
  },
  {
    id: "CONCOURS_SANTE",
    label: "Concours Santé",
    description: "Concours santé, médecine & paramédical",
    durationMin: 120,
    educationLevel: "CONCOURS",
    preferKeywords: ["sante", "medecine", "soin", "action-sociale"],
    color: "rose",
    icon: GraduationCap,
  },
];

const TARGET_QUESTION_COUNT = 50;

interface QuestionLite {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: "A" | "B" | "C" | "D";
  explanation: string;
  imageUrl?: string | null;
  audioUrl?: string | null;
}

interface BankLite {
  id: string;
  title: string;
  questions?: QuestionLite[];
  _count?: { questions: number };
}

interface SessionAnswer {
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
  imageUrl?: string | null;
  audioUrl?: string | null;
}

interface QuizSession {
  id: string;
  title: string;
  mode: string;
  score: number;
  totalQuestions: number;
  startedAt: string;
  completedAt: string | null;
  sourceType: string;
  sourceId: string;
  answers: SessionAnswer[];
}

type Stage = "select" | "preparing" | "exam" | "submitting" | "results";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function OfficialExamView() {
  const goHome = useQuizStore((s) => s.goHome);
  const [stage, setStage] = useState<Stage>("select");
  const [selectedType, setSelectedType] = useState<ExamTypeConfig | null>(null);
  const [session, setSession] = useState<QuizSession | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, "A" | "B" | "C" | "D">>({});
  const [error, setError] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const startedAtRef = useRef<number>(Date.now());
  const submittedRef = useRef(false);

  // === Stage 1: Prepare the exam (gather 50 questions, create a session) ===
  const startExam = useCallback(async (cfg: ExamTypeConfig) => {
    setStage("preparing");
    setError(null);
    setSelectedType(cfg);
    try {
      // Fetch all banks (optionally filtered by education level).
      const banksRes = await fetch(`/api/banks?level=${cfg.educationLevel}`);
      if (!banksRes.ok) throw new Error("Impossible de charger les banques.");
      const banks: BankLite[] = await banksRes.json();
      if (!banks.length) throw new Error("Aucune banque trouvée pour ce niveau.");

      // Prefer banks whose title contains a preferred keyword, fallback to all.
      const preferred = cfg.preferKeywords?.length
        ? banks.filter((b) =>
            cfg.preferKeywords!.some((kw) =>
              b.title.toLowerCase().includes(kw.toLowerCase()),
            ),
          )
        : [];
      const pool = preferred.length > 0 ? preferred : banks;

      // Fetch each bank's questions (until we gather ≥ 50).
      const gathered: Array<{ id: string; bankId: string }> = [];
      for (const bank of pool) {
        if (gathered.length >= TARGET_QUESTION_COUNT) break;
        try {
          const r = await fetch(`/api/banks/${bank.id}`);
          if (!r.ok) continue;
          const data = await r.json();
          const qs: QuestionLite[] = data.questions ?? [];
          for (const q of qs) {
            gathered.push({ id: q.id, bankId: bank.id });
            if (gathered.length >= TARGET_QUESTION_COUNT) break;
          }
        } catch {
          // skip this bank on error
        }
      }
      if (gathered.length < 5) {
        throw new Error(
          "Pas assez de questions disponibles pour ce niveau. Réessayez avec un autre type d'examen.",
        );
      }

      // Shuffle and take 50.
      const shuffled = shuffle(gathered).slice(0, TARGET_QUESTION_COUNT);
      const sourceBankId = shuffled[0]!.bankId;

      // Create the session (mode="final" → no feedback during the exam).
      const createRes = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Examen blanc — ${cfg.label}`,
          mode: "final",
          sourceType: "bank",
          sourceId: sourceBankId,
          questionIds: shuffled.map((q) => q.id),
        }),
      });
      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string })?.error ??
            "Échec de la création de la session.",
        );
      }
      const created: QuizSession = await createRes.json();

      // Initialize the local answer map (null = no answer yet).
      const init: Record<string, "A" | "B" | "C" | "D"> = {};
      for (const a of created.answers) {
        if (a.userAnswer) init[a.id] = a.userAnswer;
      }
      setSession(created);
      setAnswers(init);
      setCurrentIdx(0);
      startedAtRef.current = Date.now();
      setRemainingSeconds(cfg.durationMin * 60);
      setStage("exam");
      toast.success(`Examen démarré — ${cfg.durationMin} min`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue.";
      setError(msg);
      setStage("select");
    }
  }, []);

  // === Stage 2: Answer a question (PATCH /api/sessions/[id]/answers/[aid]) ===
  const answerQuestion = useCallback(
    async (answerId: string, choice: "A" | "B" | "C" | "D") => {
      if (!session) return;
      // Optimistically update the local state.
      setAnswers((prev) => ({ ...prev, [answerId]: choice }));
      try {
        const res = await fetch(
          `/api/sessions/${session.id}/answers/${answerId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userAnswer: choice }),
          },
        );
        if (!res.ok) throw new Error("Erreur d'enregistrement.");
        // We deliberately DO NOT read the response — no correctness feedback.
      } catch {
        // Revert silently; the user can re-select.
        setAnswers((prev) => {
          const next = { ...prev };
          delete next[answerId];
          return next;
        });
        toast.error("Réponse non enregistrée — réessayez.");
      }
    },
    [session],
  );

  // === Stage 3: Submit the exam (POST /api/sessions/[id]/complete) ===
  const submitExam = useCallback(
    async (auto = false) => {
      if (!session) return;
      setStage("submitting");
      try {
        const res = await fetch(`/api/sessions/${session.id}/complete`, {
          method: "POST",
        });
        if (!res.ok) throw new Error("Échec de la finalisation.");
        const completed: QuizSession = await res.json();
        setSession(completed);
        setStage("results");
        if (auto) {
          toast.info("Temps écoulé — examen soumis automatiquement.");
        } else {
          toast.success("Examen soumis !");
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erreur inconnue.";
        setError(msg);
        setStage("exam");
      }
    },
    [session],
  );

  // === Timer (strict, 1s tick) ===
  // NOTE: declared AFTER submitExam so the dependency array can reference it
  // without a "used before declaration" TS error.
  useEffect(() => {
    if (stage !== "exam" || !selectedType) return;
    const tick = () => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          // Auto-submit when time runs out.
          if (!submittedRef.current && session) {
            submittedRef.current = true;
            submitExam(true);
          }
          return 0;
        }
        return prev - 1;
      });
    };
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [stage, selectedType, session, submitExam]);

  // === Stage 0: Exam-type selector ===
  if (stage === "select") {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" className="gap-2" onClick={goHome}>
          <ArrowLeft className="h-4 w-4" />
          Retour à l&apos;accueil
        </Button>
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Mode examen blanc officiel</h1>
              <p className="text-sm text-muted-foreground">
                Simulez les conditions réelles d&apos;un examen : 50 questions,
                temps limité, correction à la fin.
              </p>
            </div>
          </div>
        </Card>

        {error && (
          <Card className="border-rose-300 bg-rose-50 p-4 text-rose-700 dark:border-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          </Card>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {EXAM_TYPES.map((cfg) => {
            const Icon = cfg.icon;
            return (
              <Card
                key={cfg.id}
                className="card-3d cursor-pointer p-5 transition-all hover:border-violet-300 hover:shadow-lg"
                onClick={() => startExam(cfg)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") startExam(cfg);
                }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-${cfg.color}-50 text-${cfg.color}-600 dark:bg-${cfg.color}-950/30 dark:text-${cfg.color}-300`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-bold">{cfg.label}</h3>
                    <p className="text-sm text-muted-foreground">
                      {cfg.description}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="outline" className="gap-1">
                        <Clock className="h-3 w-3" />
                        {cfg.durationMin} min
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <FileText className="h-3 w-3" />
                        50 questions
                      </Badge>
                      <Badge variant="secondary">Mode final</Badge>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // === Stage: Preparing (loading) ===
  if (stage === "preparing") {
    return (
      <div className="space-y-6">
        <Card className="p-8 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-violet-500" />
          <p className="mt-3 text-sm text-muted-foreground">
            Préparation de votre examen blanc — tirage aléatoire de 50 questions…
          </p>
        </Card>
      </div>
    );
  }

  if (!session || !selectedType) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        Session introuvable.
      </Card>
    );
  }

  // === Stage: Submitting ===
  if (stage === "submitting") {
    return (
      <Card className="p-8 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-500" />
        <p className="mt-3 text-sm text-muted-foreground">
          Calcul de votre score…
        </p>
      </Card>
    );
  }

  // === Stage: Results (detailed correction) ===
  if (stage === "results" && session.completedAt) {
    const total = session.answers.length;
    const correct = session.answers.filter((a) => a.isCorrect === true).length;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    const passed = pct >= 50;
    return (
      <div className="space-y-6">
        <Card
          className={`p-6 text-center ${
            passed
              ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30"
              : "border-rose-300 bg-rose-50 dark:border-rose-700 dark:bg-rose-950/30"
          }`}
        >
          <div className="flex flex-col items-center gap-2">
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-full ${
                passed
                  ? "bg-emerald-500 text-white"
                  : "bg-rose-500 text-white"
              }`}
            >
              <GraduationCap className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold">
              {passed ? "Examen réussi !" : "Examen à reprendre"}
            </h2>
            <p className="text-lg">
              Score : <span className="font-bold">{correct}/{total}</span> ({pct}%)
            </p>
            <p className="text-xs text-muted-foreground">
              {selectedType.label} · {selectedType.durationMin} min
            </p>
          </div>
        </Card>

        <div className="space-y-3">
          <h3 className="text-lg font-bold">Correction détaillée</h3>
          {session.answers.map((a, i) => {
            const isCorrect = a.isCorrect === true;
            return (
              <Card
                key={a.id}
                className={`correct p-4 ${
                  isCorrect
                    ? "border-emerald-200 dark:border-emerald-800"
                    : "border-rose-200 dark:border-rose-800"
                }`}
              >
                <div className="mb-2 flex items-start gap-2">
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isCorrect
                        ? "correct bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        : "wrong bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                    }`}
                  >
                    {isCorrect ? "✓" : "✗"}
                  </span>
                  <p className="flex-1 font-medium">
                    {i + 1}. {a.questionText}
                  </p>
                </div>
                <div className="space-y-1 text-sm">
                  {(["A", "B", "C", "D"] as const).map((letter) => {
                    const text =
                      letter === "A"
                        ? a.optionA
                        : letter === "B"
                          ? a.optionB
                          : letter === "C"
                            ? a.optionC
                            : a.optionD;
                    const isUserAnswer = a.userAnswer === letter;
                    const isRightAnswer = a.correctAnswer === letter;
                    return (
                      <div
                        key={letter}
                        className={`flex items-center gap-2 rounded px-2 py-1 ${
                          isRightAnswer
                            ? "correct bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : isUserAnswer
                              ? "wrong bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                              : "text-muted-foreground"
                        }`}
                      >
                        <span className="font-bold">{letter}.</span>
                        <span className="flex-1">{text}</span>
                        {isRightAnswer && (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        )}
                        {isUserAnswer && !isRightAnswer && (
                          <XCircle className="h-4 w-4 text-rose-600" />
                        )}
                      </div>
                    );
                  })}
                </div>
                {a.explanation && (
                  <div className="mt-2 rounded-lg bg-muted/50 p-3 text-xs">
                    <span className="font-semibold">Explication : </span>
                    {a.explanation}
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        <div className="flex gap-2">
          <Button onClick={goHome} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Retour à l&apos;accueil
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setStage("select");
              setSelectedType(null);
              setSession(null);
              setAnswers({});
              submittedRef.current = false;
            }}
            className="gap-2"
          >
            Nouvel examen
          </Button>
        </div>
      </div>
    );
  }

  // === Stage: Exam in progress ===
  const total = session.answers.length;
  const answeredCount = session.answers.filter(
    (a) => answers[a.id] !== undefined,
  ).length;
  const progress = Math.round((answeredCount / total) * 100);
  const current = session.answers[currentIdx] ?? session.answers[0]!;
  const selected = answers[current.id];
  const isCritical = remainingSeconds <= 300; // < 5 min

  return (
    <div className="space-y-4">
      {/* Top bar — title + timer + progress */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold">
              {session.title}
            </h1>
            <p className="text-xs text-muted-foreground">
              Question {currentIdx + 1} sur {total} · {answeredCount} répondue(s)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={`gap-1 font-mono text-base ${
                isCritical
                  ? "animate-pulse border-rose-400 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                  : "border-violet-300 bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
              }`}
            >
              <Clock className="h-4 w-4" />
              {formatClock(remainingSeconds)}
            </Badge>
            <Button
              size="sm"
              className="gap-2 bg-rose-600 hover:bg-rose-700"
              onClick={() => {
                if (
                  confirm(
                    "Êtes-vous sûr de vouloir terminer l'examen ? Vous ne pourrez plus modifier vos réponses.",
                  )
                ) {
                  if (!submittedRef.current) {
                    submittedRef.current = true;
                    submitExam(false);
                  }
                }
              }}
            >
              <Send className="h-4 w-4" />
              Terminer
            </Button>
          </div>
        </div>
        <div className="mt-3">
          <Progress value={progress} className="h-1.5" />
        </div>
      </Card>

      {/* Question grid — clickable, highlights answered + current */}
      <Card className="p-3">
        <div className="flex flex-wrap gap-1.5">
          {session.answers.map((a, i) => {
            const isAnswered = answers[a.id] !== undefined;
            const isCurrent = i === currentIdx;
            return (
              <button
                key={a.id}
                onClick={() => setCurrentIdx(i)}
                className={`flex h-8 w-8 items-center justify-center rounded-md border text-xs font-semibold transition-all ${
                  isCurrent
                    ? "border-violet-500 bg-violet-500 text-white"
                    : isAnswered
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                      : "border-border bg-card text-muted-foreground hover:bg-muted"
                }`}
                aria-label={`Question ${i + 1}${isAnswered ? " (répondue)" : ""}`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Current question */}
      <Card className="p-6">
        <p className="mb-4 text-lg font-medium">{current.questionText}</p>
        <RadioGroup
          value={selected ?? ""}
          onValueChange={(v) => {
            if (v === "A" || v === "B" || v === "C" || v === "D") {
              answerQuestion(current.id, v);
            }
          }}
          className="space-y-2"
        >
          {(["A", "B", "C", "D"] as const).map((letter) => {
            const text =
              letter === "A"
                ? current.optionA
                : letter === "B"
                  ? current.optionB
                  : letter === "C"
                    ? current.optionC
                    : current.optionD;
            return (
              <label
                key={letter}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 transition-all hover:border-violet-300 hover:bg-violet-50/50 dark:hover:bg-violet-950/20 ${
                  selected === letter
                    ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30"
                    : "border-border"
                }`}
              >
                <RadioGroupItem value={letter} id={`q-${current.id}-${letter}`} />
                <span className="font-bold text-violet-600 dark:text-violet-400">
                  {letter}.
                </span>
                <span className="flex-1 text-sm">{text}</span>
              </label>
            );
          })}
        </RadioGroup>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={currentIdx === 0}
          onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
        >
          <ArrowLeft className="h-4 w-4" />
          Précédent
        </Button>
        <span className="text-xs text-muted-foreground">
          {currentIdx + 1} / {total}
        </span>
        {currentIdx < total - 1 ? (
          <Button
            size="sm"
            className="gap-2"
            onClick={() => setCurrentIdx((i) => Math.min(total - 1, i + 1))}
          >
            Suivant
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="sm"
            className="gap-2 bg-rose-600 hover:bg-rose-700"
            onClick={() => {
              if (
                confirm(
                  "Terminer l'examen ? Vous ne pourrez plus modifier vos réponses.",
                )
              ) {
                if (!submittedRef.current) {
                  submittedRef.current = true;
                  submitExam(false);
                }
              }
            }}
          >
            <Send className="h-4 w-4" />
            Terminer
          </Button>
        )}
      </div>

      {error && (
        <Card className="border-rose-300 bg-rose-50 p-4 text-rose-700 dark:border-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        </Card>
      )}
    </div>
  );
}
