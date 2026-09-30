"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  MessageCircle,
  Send,
  Bot,
  User,
  Sparkles,
  Loader2,
  Brain,
  MessagesSquare,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Flag,
  Zap,
  Lightbulb,
  Target,
  GraduationCap,
} from "lucide-react";

/* ================================================================== */
/* Types                                                               */
/* ================================================================== */

interface QcmData {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  topic: string;
  difficulty: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  kind: "text" | "qcm";
  content: string;
  qcm?: QcmData;
  /** 0-based index de la question dans la série courante. */
  qIndex?: number;
  qTotal?: number;
}

type ChatMode = "chat" | "qcm";

const QCM_SERIES = 5; // questions par série

const SUGGESTIONS = [
  "Explique-moi la séparation des pouvoirs",
  "Calcule 35 % de 2 400 F, étape par étape",
  "Quelles banques pour préparer le concours de l'ENAM ?",
  "Traduis « bonne chance à ton examen » en anglais",
];

/* ================================================================== */
/* Composant principal                                                 */
/* ================================================================== */

export function Chatbot() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ChatMode>("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      kind: "text",
      content:
        "Bonjour ! 👋 Je suis QuizExam Assistant (GLM). Je réponds à TOUTES vos questions : cours, calculs, culture générale, langues, coaching… Et je peux aussi vous entraîner avec des QCM d'apprentissage adaptés à votre niveau. Comment puis-je vous aider ?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [qcmLoading, setQcmLoading] = useState(false);
  const [qcmDegraded, setQcmDegraded] = useState(false);

  // État de la session QCM (adaptation autonome côté GLM via l'historique).
  const [quizActive, setQuizActive] = useState(false);
  const [quizTopic, setQuizTopic] = useState("");
  const [quizAnswered, setQuizAnswered] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const qcmHistoryRef = useRef<{ role: string; content: string }[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const topicRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, qcmLoading]);

  // Focus input when opening
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  /* ---------------- ---------- Discussion générale ---------- -------- */
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        kind: "text",
        content: trimmed,
      };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setInput("");
      setLoading(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: newMessages
              .filter((m) => m.id !== "welcome")
              .map((m) => ({ role: m.role, content: m.content })),
            mode: "general",
          }),
        });
        const data = await res.json();
        const assistantMsg: ChatMessage = {
          id: `a-${Date.now()}`,
          role: "assistant",
          kind: "text",
          content:
            data.response ||
            data.error ||
            "Réponse indisponible pour le moment.",
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            kind: "text",
            content:
              "Désolé, une erreur est survenue. Vérifiez votre connexion et réessayez. 🙏",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [messages, loading]
  );

  /* ---------------- QCM : récupère la prochaine question ---------------- */
  const fetchNextQcm = useCallback(
    async (
      topic: string,
      qIndex: number,
      history: { role: string; content: string }[]
    ) => {
      setQcmLoading(true);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history, mode: "qcm" }),
        });
        const data = await res.json();
        if (data.qcm?.question && Array.isArray(data.qcm.options)) {
          setQcmDegraded(Boolean(data.degraded));
          const qTotal = QCM_SERIES;
          setMessages((prev) => [
            ...prev,
            {
              id: `qcm-${Date.now()}`,
              role: "assistant",
              kind: "qcm",
              content: "",
              qcm: data.qcm as QcmData,
              qIndex,
              qTotal,
            },
          ]);
        } else {
          throw new Error("QCM invalide");
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            kind: "text",
            content:
              "Impossible de générer une question pour le moment. Réessayez dans un instant. 🙏",
          },
        ]);
      } finally {
        setQcmLoading(false);
      }
    },
    []
  );

  /* ---------------- QCM : démarrage de série ---------------- */
  const startQuiz = useCallback(
    (topic: string) => {
      const t = topic.trim();
      const label = t || "thèmes variés (culture générale BF, maths, français, logique)";
      qcmHistoryRef.current = [
        {
          role: "user",
          content: `Début d'une nouvelle série de ${QCM_SERIES} questions de QCM d'apprentissage. Thème demandé : ${label}. Génère la première question au format JSON.`,
        },
      ];
      setQuizActive(true);
      setQuizTopic(t);
      setQuizAnswered(0);
      setQuizScore(0);
      setMessages((prev) => [
        ...prev,
        {
          id: `u-${Date.now()}`,
          role: "user",
          kind: "text",
          content: t
            ? `Lance un QCM d'apprentissage sur : ${t} 🎯`
            : "Lance un QCM d'apprentissage avec des thèmes variés 🎯",
        },
      ]);
      void fetchNextQcm(t, 0, qcmHistoryRef.current);
    },
    [fetchNextQcm]
  );

  /* ---------------- QCM : réponse du candidat ---------------- */
  const answerQcm = useCallback(
    (msg: ChatMessage, optionIdx: number) => {
      const qcm = msg.qcm;
      if (!qcm || qcmLoading) return;
      const correct = optionIdx === qcm.answerIndex;
      if (correct) setQuizScore((s) => s + 1);
      setQuizAnswered((a) => a + 1);

      // Alimente l'historique GLM pour l'adaptation autonome (difficulté,
      // thème, non-répétition) : la question générée + le résultat du candidat.
      qcmHistoryRef.current.push({
        role: "assistant",
        content: JSON.stringify(qcm),
      });
      qcmHistoryRef.current.push({
        role: "user",
        content: `Ma réponse : « ${qcm.options[optionIdx]} » — ${
          correct ? "CORRECTE ✅" : "INCORRECTE ❌"
        }. La bonne réponse était « ${qcm.options[qcm.answerIndex]} ».${
          correct
            ? " Continue en adaptant la difficulté."
            : " Consolide cette notion avec une question plus accessible sur le même thème."
        }`,
      });
    },
    [qcmLoading]
  );

  /* ---------------- QCM : question suivante ---------------- */
  const nextQcm = useCallback(() => {
    void fetchNextQcm(quizTopic, quizAnswered, qcmHistoryRef.current);
  }, [fetchNextQcm, quizTopic, quizAnswered]);

  /* ---------------- QCM : poursuite après bilan ---------------- */
  const continueQuiz = useCallback(() => {
    setQuizAnswered(0);
    setQuizScore(0);
    qcmHistoryRef.current.push({
      role: "user",
      content: `Nouvelle série de ${QCM_SERIES} questions. Continue en tenant compte de mes performances précédentes.`,
    });
    void fetchNextQcm(quizTopic, 0, qcmHistoryRef.current);
  }, [fetchNextQcm, quizTopic]);

  /* ---------------- QCM : fin de session ---------------- */
  const endQuiz = useCallback(() => {
    setMessages((prev) => [
      ...prev,
      {
        id: `a-${Date.now()}`,
        role: "assistant",
        kind: "text",
        content:
          "Session QCM terminée ! 🎓 Retour en mode discussion — posez-moi n'importe quelle question, ou relancez un QCM quand vous voulez.",
      },
    ]);
    setQuizActive(false);
    setQuizTopic("");
    setQuizAnswered(0);
    setQuizScore(0);
    qcmHistoryRef.current = [];
    setMode("chat");
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void sendMessage(input);
  }

  const answeredTotal = quizAnswered;

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 transition-all hover:scale-110 hover:shadow-xl"
          aria-label="Ouvrir l'assistant IA"
        >
          <MessageCircle className="h-6 w-6" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[9px] font-bold">
            <Sparkles className="h-2.5 w-2.5" />
          </span>
        </button>
      )}

      {/* Chat panel */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
        >
          {/* Header */}
          <SheetHeader className="shrink-0 border-b bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 text-white">
            <SheetTitle className="flex items-center gap-2 text-white">
              <Avatar className="h-9 w-9 border-2 border-white/30">
                <AvatarFallback className="bg-white/20 text-white">
                  <Bot className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-base font-semibold">
                  QuizExam Assistant
                  <span className="flex items-center gap-0.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[9px] font-bold uppercase">
                    <Sparkles className="h-2.5 w-2.5" />
                    GLM
                  </span>
                </span>
                <p className="text-[11px] text-white/80">
                  Répond à tout · Coach QCM autonome
                </p>
              </div>
            </SheetTitle>
          </SheetHeader>

          {/* Mode switcher + progression QCM */}
          <div className="shrink-0 border-b bg-background/95 px-3 py-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setMode("chat")}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                  mode === "chat"
                    ? "bg-emerald-600 text-white shadow-sm shadow-emerald-500/30"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
                aria-pressed={mode === "chat"}
              >
                <MessagesSquare className="h-3.5 w-3.5" />
                Discussion
              </button>
              <button
                type="button"
                onClick={() => setMode("qcm")}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                  mode === "qcm"
                    ? "bg-violet-600 text-white shadow-sm shadow-violet-500/30"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
                aria-pressed={mode === "qcm"}
              >
                <Brain className="h-3.5 w-3.5" />
                QCM d&apos;apprentissage
              </button>
              {quizActive && (
                <span className="ml-auto flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                  <Zap className="h-3 w-3" />
                  Score {quizScore}/{answeredTotal}
                </span>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="min-h-0 flex-1 overflow-hidden bg-muted/30">
            <div
              ref={scrollRef}
              className="h-full overflow-y-auto overflow-x-hidden"
            >
              <div className="space-y-3 p-4">
                {messages.map((msg) =>
                  msg.kind === "qcm" && msg.qcm ? (
                    <QcmCard
                      key={msg.id}
                      message={msg}
                      onAnswer={answerQcm}
                      onNext={nextQcm}
                      onContinue={continueQuiz}
                      onEnd={endQuiz}
                      loading={qcmLoading}
                      degraded={qcmDegraded}
                      score={quizScore}
                      answeredCount={quizAnswered}
                    />
                  ) : (
                    <MessageBubble key={msg.id} message={msg} />
                  )
                )}

                {loading && <ThinkingBubble label="QuizExam réfléchit…" />}
                {qcmLoading && (
                  <ThinkingBubble label="Le coach prépare votre question…" />
                )}

                {/* Suggestions (accueil) */}
                {messages.length <= 1 && !loading && mode === "chat" && (
                  <div className="space-y-2 pt-2">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                      Essayez par exemple :
                    </p>
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => sendMessage(s)}
                        className="block w-full rounded-lg border border-emerald-200 bg-emerald-50/50 px-3 py-2 text-left text-xs text-emerald-800 transition-colors hover:border-emerald-400 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                {/* Lanceur de QCM */}
                {mode === "qcm" && !quizActive && !qcmLoading && (
                  <QcmLauncher onStart={startQuiz} />
                )}
              </div>
            </div>
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="shrink-0 flex items-center gap-2 border-t bg-background p-3"
          >
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                mode === "qcm"
                  ? "Une question hors QCM ? Écrivez-la ici…"
                  : "Posez n'importe quelle question…"
              }
              disabled={loading}
              className="flex-1"
              aria-label="Saisir un message"
            />
            <Button
              type="submit"
              size="icon"
              disabled={loading || !input.trim()}
              className="shrink-0 bg-gradient-to-br from-emerald-500 to-teal-600 text-white hover:opacity-90"
              aria-label="Envoyer"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}

/* ================================================================== */
/* Bulle « en train de réfléchir »                                     */
/* ================================================================== */

function ThinkingBubble({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarFallback className="bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
          <Bot className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-card px-3 py-2.5">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span className="text-xs">{label}</span>
      </div>
    </div>
  );
}

/* ================================================================== */
/* Lanceur de QCM (mode choisi, série non démarrée)                    */
/* ================================================================== */

function QcmLauncher({ onStart }: { onStart: (topic: string) => void }) {
  const [topic, setTopic] = useState("");
  const examples = ["Maths", "Droit constitutionnel", "Culture générale BF", "Anglais", "Logique"];
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-4 dark:border-violet-500/25 dark:from-violet-950/40 dark:via-card dark:to-fuchsia-950/25"
    >
      <p className="flex items-center gap-2 text-sm font-bold text-violet-900 dark:text-violet-200">
        <Target className="h-4 w-4" />
        QCM d&apos;apprentissage autonome
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        Le coach GLM vous pose {QCM_SERIES} questions l&apos;une après l&apos;autre et
        s&apos;adapte en temps réel : difficulté progressive, thèmes variés,
        correction expliquée après chaque réponse. Laissez le champ vide pour
        un mélange équilibré.
      </p>
      <Input
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="Thème (optionnel) — ex : Maths, AES, Anglais…"
        className="mt-3 h-9 border-violet-200 focus-visible:ring-violet-400 dark:border-violet-500/30"
        aria-label="Thème du QCM"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onStart(topic);
          }
        }}
      />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {examples.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => setTopic(ex)}
            className="rounded-full border border-violet-200 bg-white/70 px-2.5 py-0.5 text-[10px] font-semibold text-violet-700 transition-colors hover:bg-violet-100 dark:border-violet-500/30 dark:bg-violet-950/30 dark:text-violet-300"
          >
            {ex}
          </button>
        ))}
      </div>
      <Button
        type="button"
        onClick={() => onStart(topic)}
        className="mt-3 w-full gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md shadow-violet-500/25 hover:opacity-95"
      >
        <GraduationCap className="h-4 w-4" />
        Lancer le QCM ({QCM_SERIES} questions)
      </Button>
    </motion.div>
  );
}

/* ================================================================== */
/* Carte QCM interactive                                               */
/* ================================================================== */

function QcmCard({
  message,
  onAnswer,
  onNext,
  onContinue,
  onEnd,
  loading,
  degraded,
  score,
  answeredCount,
}: {
  message: ChatMessage;
  onAnswer: (msg: ChatMessage, optionIdx: number) => void;
  onNext: () => void;
  onContinue: () => void;
  onEnd: () => void;
  loading: boolean;
  degraded: boolean;
  /** Score et réponses de la série courante (état parent, à jour). */
  score: number;
  answeredCount: number;
}) {
  const qcm = message.qcm!;
  const qIndex = message.qIndex ?? 0;
  const qTotal = message.qTotal ?? 5;
  const isLast = qIndex + 1 >= qTotal;
  const [selected, setSelected] = useState<number | null>(null);
  const answered = selected !== null;
  const isCorrect = answered && selected === qcm.answerIndex;

  const diffCls =
    qcm.difficulty === "facile"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
      : qcm.difficulty === "difficile"
        ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
        : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300";

  const LETTERS = ["A", "B", "C", "D"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-start gap-2"
    >
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarFallback className="bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-300">
          <Brain className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-violet-200/70 bg-card shadow-sm dark:border-violet-500/25">
        {/* Bandeau : progression + thème + difficulté */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-violet-100 bg-violet-50/70 px-3 py-2 dark:border-violet-500/20 dark:bg-violet-950/30">
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-bold text-white">
            <Target className="h-3 w-3" />
            QCM {qIndex + 1}/{qTotal}
          </span>
          <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-950/50 dark:text-violet-200">
            {qcm.topic}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${diffCls}`}>
            {qcm.difficulty}
          </span>
          {degraded && (
            <span
              className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[9px] font-semibold text-muted-foreground"
              title="GLM momentanément indisponible — questions de secours"
            >
              mode secours
            </span>
          )}
        </div>

        {/* Question */}
        <div className="px-3.5 pt-3">
          <p className="text-sm font-semibold leading-snug text-foreground">
            {qcm.question}
          </p>
        </div>

        {/* Options */}
        <div className="mt-3 space-y-1.5 px-3">
          {qcm.options.map((opt, i) => {
            const isAnswer = i === qcm.answerIndex;
            const isSelected = i === selected;
            let optCls =
              "border-border/80 bg-background hover:border-violet-300 hover:bg-violet-50/60 dark:border-white/10 dark:hover:border-violet-500/40 dark:hover:bg-violet-500/10";
            if (answered && isAnswer) {
              optCls =
                "border-emerald-400 bg-emerald-50 dark:border-emerald-500/60 dark:bg-emerald-950/40";
            } else if (answered && isSelected && !isAnswer) {
              optCls =
                "border-rose-400 bg-rose-50 dark:border-rose-500/60 dark:bg-rose-950/40";
            } else if (answered) {
              optCls = "border-border/60 bg-background opacity-60 dark:border-white/5";
            }
            return (
              <button
                key={i}
                type="button"
                disabled={answered || loading}
                onClick={() => {
                  setSelected(i);
                  onAnswer(message, i);
                }}
                className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-xs font-medium transition-all duration-200 disabled:cursor-default ${optCls}`}
                aria-label={`Option ${LETTERS[i]}`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${
                    answered && isAnswer
                      ? "bg-emerald-500 text-white"
                      : answered && isSelected
                        ? "bg-rose-500 text-white"
                        : "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300"
                  }`}
                >
                  {LETTERS[i]}
                </span>
                <span className="min-w-0 flex-1 leading-snug">{opt}</span>
                {answered && isAnswer && (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                )}
                {answered && isSelected && !isAnswer && (
                  <XCircle className="h-4 w-4 shrink-0 text-rose-500" />
                )}
              </button>
            );
          })}
        </div>

        {/* Correction expliquée (après réponse) */}
        <AnimatePresence>
          {answered && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div
                className={`mx-3 mt-3 rounded-xl border p-3 ${
                  isCorrect
                    ? "border-emerald-200 bg-emerald-50/80 dark:border-emerald-500/30 dark:bg-emerald-950/30"
                    : "border-amber-200 bg-amber-50/80 dark:border-amber-500/30 dark:bg-amber-950/25"
                }`}
              >
                <p
                  className={`flex items-center gap-1.5 text-xs font-bold ${
                    isCorrect
                      ? "text-emerald-700 dark:text-emerald-300"
                      : "text-amber-700 dark:text-amber-300"
                  }`}
                >
                  {isCorrect ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" /> Correct, bravo ! 🎉
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4" /> Pas tout à fait — la bonne
                      réponse est : {qcm.options[qcm.answerIndex]}
                    </>
                  )}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {qcm.explanation}
                </p>
              </div>

              {/* Suite : question suivante OU bilan de série */}
              <div className="px-3 pb-3 pt-3">
                {!isLast ? (
                  <Button
                    type="button"
                    onClick={() => {
                      setSelected(null);
                      onNext();
                    }}
                    disabled={loading}
                    className="w-full gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md shadow-violet-500/25 hover:opacity-95"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4" />
                    )}
                    Question suivante
                  </Button>
                ) : (
                  <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-3 dark:border-violet-500/25 dark:from-violet-950/40 dark:to-fuchsia-950/25">
                    <p className="flex items-center gap-1.5 text-sm font-bold text-violet-900 dark:text-violet-200">
                      <GraduationCap className="h-4 w-4" />
                      Série terminée — score : {score}/{answeredCount}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {score === answeredCount
                        ? "Sans faute, bravo ! 🏆 Le coach monte d'un cran sur la prochaine série."
                        : score >= answeredCount / 2
                          ? "Bonne base ! Chaque erreur est une notion à consolider : la prochaine série s'adapte en conséquence."
                          : "Pas de panique : le coach revient aux fondamentaux et consolide les notions ratées. Continuez ! 💪"}
                    </p>
                    <div className="mt-2.5 flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setSelected(null);
                          onContinue();
                        }}
                        disabled={loading}
                        className="flex-1 gap-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:opacity-95"
                      >
                        {loading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5" />
                        )}
                        Continuer (5 de plus)
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={onEnd}
                        className="flex-1 gap-1.5"
                      >
                        <Flag className="h-3.5 w-3.5" />
                        Terminer
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ================================================================== */
/* Bulle de texte classique                                            */
/* ================================================================== */

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div
      className={`flex items-start gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarFallback
          className={
            isUser
              ? "bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-300"
              : "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300"
          }
        >
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>
      {/* Message bubble - max-width to prevent overflow, break-words for long text */}
      <div
        className={`max-w-[75%] break-words rounded-2xl px-3.5 py-2.5 text-sm ${
          isUser
            ? "rounded-br-sm bg-violet-500 text-white"
            : "rounded-bl-sm bg-card text-foreground"
        }`}
      >
        <p className="whitespace-pre-wrap break-words leading-relaxed">
          {message.content}
        </p>
      </div>
    </div>
  );
}
