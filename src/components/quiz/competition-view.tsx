"use client";

import { useEffect, useState, useCallback, useRef } from "react";
<<<<<<< Updated upstream
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
=======
import { useSession } from "next-auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
>>>>>>> Stashed changes
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
<<<<<<< Updated upstream
import { toast } from "sonner";
import {
  Trophy,
  Swords,
  Plus,
  LogIn,
  Users,
  Play,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
  Home,
  RotateCcw,
  Crown,
  Medal,
  Loader2,
} from "lucide-react";

interface ParticipantPublic {
  id: string;
  name: string;
  score: number;
  answeredCount: number;
  answeredCurrent: boolean;
  isHost: boolean;
  isMe: boolean;
}

interface CurrentQuestionPublic {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: null;
  explanation: null;
=======
import { useQuizStore } from "@/lib/quiz-store";
import {
  Trophy,
  Users,
  Crown,
  Play,
  ArrowRight,
  ArrowLeft,
  Timer,
  CheckCircle2,
  XCircle,
  LogIn,
  Plus,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

interface Participant {
  id: string;
  name: string;
  score: number;
  answeredCurrent?: boolean;
  lastAnswerCorrect?: boolean | null;
>>>>>>> Stashed changes
}

interface RoomState {
  code: string;
<<<<<<< Updated upstream
  status: "lobby" | "playing" | "finished";
  bankTitle: string;
  hostId: string;
  hostName: string;
  currentIndex: number;
  totalQuestions: number;
  questionTimeLimitSec: number;
  questionStartedAt: number | null;
  participants: ParticipantPublic[];
  currentQuestion: CurrentQuestionPublic | null;
  myAnswer: string | null;
  finalLeaderboard: ParticipantPublic[] | null;
  createdAt: number;
}

interface AnswerResponse extends RoomState {
  isCorrect?: boolean;
  correctAnswer?: string;
  explanation?: string;
}

interface Bank {
  id: string;
  title: string;
  _count?: { questions: number };
}

type Screen = "menu" | "lobby" | "playing" | "finished";

const POLL_INTERVAL_LOBBY = 3000;
const POLL_INTERVAL_PLAYING = 1500;
const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

export function CompetitionView() {
  const { data: session } = useSession();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const [screen, setScreen] = useState<Screen>("menu");
  const [room, setRoom] = useState<RoomState | null>(null);
  const [loading, setLoading] = useState(false);
  // Create-room form state
  const [banks, setBanks] = useState<Bank[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [timeLimitSec, setTimeLimitSec] = useState<number>(20);
  // Join-room form state
  const [joinCode, setJoinCode] = useState("");
  const [joinName, setJoinName] = useState("");
  // Game state
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerFeedback, setAnswerFeedback] = useState<{
    isCorrect: boolean;
    correctAnswer: string;
    explanation: string;
  } | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load banks for the create-room form.
  useEffect(() => {
    fetch("/api/banks")
      .then((r) => (r.ok ? r.json() : []))
      .then((b: Bank[]) => {
        setBanks(b);
        if (b.length > 0 && !selectedBankId) {
          // Pick a bank with the most questions by default.
          const sorted = [...b].sort(
            (a, b) => (b._count?.questions ?? 0) - (a._count?.questions ?? 0)
          );
          setSelectedBankId(sorted[0].id);
        }
      })
      .catch(() => {});
  }, []);

  // Polling effect — fetches the room state on an interval based on the
  // current screen.
  const refreshRoom = useCallback(
    async (code: string, silent = false) => {
      try {
        const res = await fetch(`/api/competition?code=${encodeURIComponent(code)}`);
        if (!res.ok) {
          if (!silent) {
            const err = await res.json().catch(() => ({}));
            toast.error(err.error || "Salon introuvable");
          }
          return;
        }
        const data: RoomState = await res.json();
        setRoom(data);
        if (data.status === "lobby") {
          setScreen("lobby");
        } else if (data.status === "playing") {
          setScreen("playing");
        } else if (data.status === "finished") {
          setScreen("finished");
        }
      } catch {
        /* network error — keep current state */
      }
    },
    []
  );

  useEffect(() => {
    if (!room || screen === "menu" || screen === "finished") {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }
    const interval = screen === "lobby" ? POLL_INTERVAL_LOBBY : POLL_INTERVAL_PLAYING;
    pollingRef.current = setInterval(() => {
      refreshRoom(room.code, true);
    }, interval);
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [room?.code, screen, refreshRoom, room]);

  // Countdown timer for the current question.
  useEffect(() => {
    if (screen !== "playing" || !room?.questionStartedAt) {
      setTimeLeft(0);
      return;
    }
    const compute = () => {
      if (!room.questionStartedAt) return 0;
      const elapsed = Math.floor((Date.now() - room.questionStartedAt) / 1000);
      return Math.max(0, room.questionTimeLimitSec - elapsed);
    };
    setTimeLeft(compute());
    const id = setInterval(() => {
      const left = compute();
      setTimeLeft(left);
      if (left === 0) {
        clearInterval(id);
      }
    }, 500);
    return () => clearInterval(id);
  }, [screen, room?.questionStartedAt, room?.questionTimeLimitSec, room?.currentIndex, room]);

  // Reset answer feedback when the question changes.
  useEffect(() => {
    setSelectedAnswer(null);
    setAnswerFeedback(null);
  }, [room?.currentIndex, room?.status]);

  const handleCreate = async () => {
    if (!selectedBankId) {
      toast.error("Sélectionnez une banque de questions");
      return;
    }
    setLoading(true);
=======
  phase: "lobby" | "playing" | "finished";
  bankTitle: string;
  hostName: string;
  currentQuestionIdx: number;
  totalQuestions: number;
  questionDurationSec: number;
  questionStartedAt: number | null;
  isHost?: boolean;
  hostId?: string;
  currentQuestion?: {
    id: string;
    question: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
  } | null;
  participants?: Participant[];
}

export function CompetitionView() {
  const { data: session } = useSession();
  const { banks, goHome } = useQuizStore();
  const [mode, setMode] = useState<"menu" | "create" | "join" | "playing">("menu");
  const [joinCode, setJoinCode] = useState("");
  const [selectedBankId, setSelectedBankId] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [durationSec, setDurationSec] = useState(30);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  const [room, setRoom] = useState<RoomState | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    correctAnswer: string;
    explanation: string;
  } | null>(null);
  const [remainingSec, setRemainingSec] = useState<number>(0);

  // Polling de l'état de la room
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const fetchRoom = useCallback(async (code: string) => {
    try {
      const res = await fetch(`/api/competition?code=${encodeURIComponent(code)}`);
      if (!res.ok) {
        return null;
      }
      const data: RoomState = await res.json();
      setRoom((prev) => {
        // Si l'index de question a changé, on reset l'état de réponse
        if (prev && prev.currentQuestionIdx !== data.currentQuestionIdx) {
          setSelectedAnswer(null);
          setFeedback(null);
        }
        return data;
      });
      return data;
    } catch {
      return null;
    }
  }, []);

  const startPolling = useCallback(
    (code: string) => {
      stopPoll();
      pollRef.current = setInterval(() => {
        fetchRoom(code);
      }, 2000);
    },
    [fetchRoom, stopPoll]
  );

  useEffect(() => {
    return () => stopPoll();
  }, [stopPoll]);

  // Countdown timer
  useEffect(() => {
    if (!room || room.phase !== "playing" || !room.questionStartedAt) {
      return;
    }
    function tick() {
      if (!room || !room.questionStartedAt) return;
      const elapsed = (Date.now() - room.questionStartedAt) / 1000;
      const remaining = Math.max(0, room.questionDurationSec - elapsed);
      setRemainingSec(Math.ceil(remaining));
      if (remaining <= 0 && !feedback) {
        // Temps écoulé : on force la soumission d'une réponse vide pour
        // marquer la question comme répondue (incorrecte)
        // (le serveur ignore la réponse si déjà répondue)
      }
    }
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [room, feedback]);

  async function createRoom() {
    if (!selectedBankId) {
      toast.error("Choisissez une banque");
      return;
    }
    setCreating(true);
>>>>>>> Stashed changes
    try {
      const res = await fetch("/api/competition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankId: selectedBankId,
          questionCount,
<<<<<<< Updated upstream
          timeLimitSec,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erreur lors de la création");
        return;
      }
      setRoom(data);
      setScreen("lobby");
      toast.success(`Salon ${data.code} créé !`);
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) {
      toast.error("Entrez un code de salon");
      return;
    }
    setLoading(true);
=======
          durationSec,
        }),
      });
      if (res.ok) {
        const data: RoomState = await res.json();
        setRoom(data);
        setMode("playing");
        startPolling(data.code);
        toast.success(`Room créée : ${data.code}`);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Échec de création");
      }
    } finally {
      setCreating(false);
    }
  }

  async function joinRoom() {
    if (!joinCode.trim()) {
      toast.error("Entrez un code");
      return;
    }
    setJoining(true);
>>>>>>> Stashed changes
    try {
      const res = await fetch("/api/competition/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
<<<<<<< Updated upstream
        body: JSON.stringify({ code: joinCode.trim(), name: joinName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erreur lors de la rejoindre");
        return;
      }
      setRoom(data);
      if (data.status === "lobby") setScreen("lobby");
      else if (data.status === "playing") setScreen("playing");
      else setScreen("finished");
      toast.success(`Rejoint le salon ${data.code}`);
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = async () => {
    if (!room) return;
    setLoading(true);
    try {
      const res = await fetch("/api/competition/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: room.code }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erreur");
        return;
      }
      setRoom(data);
      if (data.status === "playing") setScreen("playing");
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (!room) return;
    setLoading(true);
    try {
      const res = await fetch("/api/competition/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: room.code }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erreur");
        return;
      }
      setRoom(data);
      if (data.status === "finished") setScreen("finished");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = async (answer: string) => {
    if (!room || selectedAnswer || answerFeedback) return;
    setSelectedAnswer(answer);
=======
        body: JSON.stringify({ code: joinCode.trim() }),
      });
      if (res.ok) {
        const data: RoomState = await res.json();
        setRoom(data);
        setMode("playing");
        startPolling(data.code);
        toast.success(`Rejoint : ${data.code}`);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Échec");
      }
    } finally {
      setJoining(false);
    }
  }

  async function submitAnswer(letter: string) {
    if (!room || selectedAnswer) return;
    setSelectedAnswer(letter);
>>>>>>> Stashed changes
    try {
      const res = await fetch("/api/competition/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
<<<<<<< Updated upstream
        body: JSON.stringify({ code: room.code, answer }),
      });
      const data: AnswerResponse = await res.json();
      if (!res.ok) {
        toast.error((data as { error?: string }).error || "Erreur");
        setSelectedAnswer(null);
        return;
      }
      setAnswerFeedback({
        isCorrect: !!data.isCorrect,
        correctAnswer: data.correctAnswer ?? "",
        explanation: data.explanation ?? "",
      });
      // Refresh room state from the server (so the leaderboard updates).
      setRoom(data);
    } catch {
      toast.error("Erreur réseau");
      setSelectedAnswer(null);
    }
  };

  const handleExit = () => {
    setRoom(null);
    setScreen("menu");
    setSelectedAnswer(null);
    setAnswerFeedback(null);
  };

  const copyCode = () => {
    if (!room) return;
    navigator.clipboard
      .writeText(room.code)
      .then(() => toast.success("Code copié !"))
      .catch(() => {});
  };

  const isHost = !!room && !!userId && room.hostId === userId;
  const me = room?.participants.find((p) => p.isMe);

  // === Render ===
  if (screen === "menu") {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="text-center">
          <h1 className="flex items-center justify-center gap-2 text-3xl font-bold">
            <Swords className="h-7 w-7 text-rose-500" />
            Mode Compétition
          </h1>
          <p className="mt-2 text-muted-foreground">
            Affrontez d&apos;autres joueurs en temps réel sur des quiz à 10 questions.
            Le plus rapide et le plus précis gagne !
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Create room */}
          <Card className="space-y-4 p-6">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white">
                <Plus className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold">Créer un salon</h2>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="bank-select">Banque de questions</Label>
                <Select value={selectedBankId} onValueChange={setSelectedBankId}>
                  <SelectTrigger id="bank-select" className="w-full">
                    <SelectValue placeholder="Choisir une banque..." />
                  </SelectTrigger>
                  <SelectContent>
                    {banks.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.title} ({b._count?.questions ?? 0} Q)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="qcount">Questions (5-30)</Label>
                  <Input
                    id="qcount"
                    type="number"
                    min={5}
                    max={30}
                    value={questionCount}
                    onChange={(e) =>
                      setQuestionCount(
                        Math.min(30, Math.max(5, Number(e.target.value) || 5))
                      )
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tlimit">Temps / question (s)</Label>
                  <Input
                    id="tlimit"
                    type="number"
                    min={5}
                    max={120}
                    value={timeLimitSec}
                    onChange={(e) =>
                      setTimeLimitSec(
                        Math.min(120, Math.max(5, Number(e.target.value) || 5))
                      )
                    }
                  />
                </div>
              </div>
              <Button
                onClick={handleCreate}
                disabled={loading || !selectedBankId}
                className="w-full gap-2 bg-gradient-to-r from-rose-500 to-pink-600 text-white"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Créer le salon
              </Button>
            </div>
          </Card>

          {/* Join room */}
          <Card className="space-y-4 p-6">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 text-white">
                <LogIn className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold">Rejoindre un salon</h2>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="code-input">Code du salon (6 caractères)</Label>
                <Input
                  id="code-input"
                  placeholder="ABC123"
                  maxLength={6}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="text-center text-lg font-mono tracking-widest"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name-input">Votre nom (optionnel)</Label>
                <Input
                  id="name-input"
                  placeholder="Votre pseudonyme"
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                />
              </div>
              <Button
                onClick={handleJoin}
                disabled={loading || joinCode.length < 4}
                className="w-full gap-2 bg-gradient-to-r from-sky-500 to-cyan-600 text-white"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                Rejoindre
              </Button>
            </div>
          </Card>
        </div>

        {/* Rules */}
        <Card className="bg-muted/30 p-5">
          <h3 className="mb-2 text-sm font-semibold">Règles du jeu</h3>
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li>• 10 points par bonne réponse + bonus de vitesse (max +5).</li>
            <li>• L&apos;hôte lance la partie et avance les questions.</li>
            <li>• Une fois qu&apos;un participant a répondu, il ne peut plus changer.</li>
            <li>• Le classement se met à jour en temps réel pendant la partie.</li>
          </ul>
        </Card>
      </div>
    );
  }

  if (!room) {
    return <Skeleton className="h-64 w-full" />;
  }

  // === Lobby screen ===
  if (screen === "lobby") {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 p-6 text-center text-white">
            <p className="text-sm uppercase tracking-widest text-white/80">
              Salon de compétition
            </p>
            <div className="mt-2 flex items-center justify-center gap-3">
              <span className="font-mono text-5xl font-bold tracking-widest">
                {room.code}
              </span>
              <Button
                size="icon"
                variant="ghost"
                onClick={copyCode}
                className="h-10 w-10 bg-white/20 text-white hover:bg-white/30"
                aria-label="Copier le code"
              >
                <Copy className="h-5 w-5" />
              </Button>
            </div>
            <p className="mt-2 text-sm text-white/80">
              Partagez ce code avec les autres joueurs pour les inviter.
            </p>
          </div>
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Banque</p>
                <p className="font-semibold">{room.bankTitle}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Hôte</p>
                <p className="font-semibold">{room.hostName}</p>
              </div>
            </div>
            <Separator className="my-4" />
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Users className="h-4 w-4 text-emerald-600" />
              Participants ({room.participants.length})
            </div>
            <div className="mt-3 max-h-64 space-y-2 overflow-y-auto scrollbar-thin">
              {room.participants.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 rounded-lg border p-2.5 ${
                    p.isMe
                      ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30"
                      : "border-border bg-muted/30"
                  }`}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-bold text-white">
                    {p.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="flex-1 text-sm font-medium">{p.name}</span>
                  {p.isHost && (
                    <Badge variant="outline" className="border-amber-300 text-amber-700">
                      <Crown className="mr-1 h-3 w-3" /> Hôte
                    </Badge>
                  )}
                  {p.isMe && (
                    <Badge variant="outline" className="border-emerald-300 text-emerald-700">
                      Vous
                    </Badge>
                  )}
                </div>
              ))}
              {room.participants.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Aucun participant. Invitez vos amis !
                </p>
              )}
            </div>
            <div className="mt-5 flex gap-2">
              {isHost ? (
                <Button
                  onClick={handleStartGame}
                  disabled={loading || room.participants.length === 0}
                  className="flex-1 gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Lancer la compétition
                </Button>
              ) : (
                <div className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  En attente de l&apos;hôte...
                </div>
              )}
              <Button variant="outline" onClick={handleExit} className="gap-2">
                <Home className="h-4 w-4" />
                Quitter
              </Button>
            </div>
          </div>
        </Card>
=======
        body: JSON.stringify({ code: room.code, answer: letter }),
      });
      if (res.ok) {
        const data = await res.json();
        setFeedback({
          correct: data.correct,
          correctAnswer: data.correctAnswer,
          explanation: data.explanation,
        });
        // Refresh room state to get updated scores
        fetchRoom(room.code);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function nextQuestion() {
    if (!room) return;
    try {
      const res = await fetch("/api/competition/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: room.code }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.phase === "finished") {
          setRoom((prev) => (prev ? { ...prev, phase: "finished", participants: data.participants } : prev));
        } else {
          fetchRoom(room.code);
        }
        setSelectedAnswer(null);
        setFeedback(null);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Action refusée");
      }
    } catch (e) {
      console.error(e);
    }
  }

  function exitRoom() {
    stopPoll();
    setRoom(null);
    setMode("menu");
    setSelectedAnswer(null);
    setFeedback(null);
  }

  // ---------- Menu ----------
  if (mode === "menu") {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" className="gap-2" onClick={goHome}>
          <ArrowLeft className="h-4 w-4" />
          Retour à l&apos;accueil
        </Button>

        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Trophy className="h-6 w-6 text-amber-500" />
            Mode compétition
          </h1>
          <p className="mt-1 text-muted-foreground">
            Affrontez d&apos;autres joueurs en temps réel sur des questions
            aléatoires. Le plus rapide et le plus précis gagne !
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="cursor-pointer p-6 transition-all hover:-translate-y-1 hover:shadow-lg" onClick={() => setMode("create")}>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                <Plus className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">Créer une room</h3>
                <p className="text-sm text-muted-foreground">
                  Choisissez une banque et invitez vos amis avec le code.
                </p>
              </div>
            </div>
          </Card>

          <Card className="cursor-pointer p-6 transition-all hover:-translate-y-1 hover:shadow-lg" onClick={() => setMode("join")}>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <LogIn className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">Rejoindre une room</h3>
                <p className="text-sm text-muted-foreground">
                  Entrez le code à 6 caractères partagé par l&apos;hôte.
                </p>
              </div>
            </div>
          </Card>
        </div>
>>>>>>> Stashed changes
      </div>
    );
  }

<<<<<<< Updated upstream
  // === Playing screen ===
  if (screen === "playing" && room.currentQuestion) {
    const q = room.currentQuestion;
    const answeredCount = room.participants.filter((p) => p.answeredCurrent).length;
    const progress =
      room.totalQuestions > 0
        ? Math.round((room.currentIndex / room.totalQuestions) * 100)
        : 0;
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        {/* Header: code + question counter + timer */}
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline" className="font-mono text-base">
            {room.code}
          </Badge>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">
              Question {room.currentIndex + 1} / {room.totalQuestions}
            </span>
            <Badge
              variant={timeLeft <= 5 ? "destructive" : "secondary"}
              className="gap-1 font-mono"
            >
              <Clock className="h-3 w-3" />
              {timeLeft}s
            </Badge>
          </div>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* Question + answer options */}
          <Card className="space-y-4 p-5 lg:col-span-2">
            <h2 className="text-lg font-semibold leading-snug">{q.question}</h2>
            <div className="grid gap-2.5">
              {OPTION_LETTERS.map((letter) => {
                const text =
                  letter === "A"
                    ? q.optionA
                    : letter === "B"
                    ? q.optionB
                    : letter === "C"
                    ? q.optionC
                    : q.optionD;
                const isSelected = selectedAnswer === letter;
                const isCorrectFeedback =
                  answerFeedback && answerFeedback.correctAnswer === letter;
                const isWrongFeedback =
                  answerFeedback &&
                  isSelected &&
                  !answerFeedback.isCorrect;
                return (
                  <button
                    key={letter}
                    onClick={() => handleAnswer(letter)}
                    disabled={!!selectedAnswer}
                    className={`flex items-center gap-3 rounded-xl border-2 p-3.5 text-left text-sm transition-all ${
                      isCorrectFeedback
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40"
                        : isWrongFeedback
                        ? "border-rose-500 bg-rose-50 dark:bg-rose-950/40"
                        : isSelected
                        ? "border-sky-500 bg-sky-50 dark:bg-sky-950/40"
                        : selectedAnswer
                        ? "border-border opacity-50"
                        : "border-border hover:border-emerald-300 hover:bg-muted/50"
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        isCorrectFeedback
                          ? "bg-emerald-500 text-white"
                          : isWrongFeedback
                          ? "bg-rose-500 text-white"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {isCorrectFeedback ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : isWrongFeedback ? (
                        <XCircle className="h-4 w-4" />
                      ) : (
                        letter
                      )}
                    </span>
                    <span className="flex-1">{text}</span>
                  </button>
                );
              })}
            </div>

            {/* Feedback panel */}
            {answerFeedback && (
              <div
                className={`rounded-lg border p-3 text-sm ${
                  answerFeedback.isCorrect
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"
                    : "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-100"
                }`}
              >
                <p className="flex items-center gap-2 font-semibold">
                  {answerFeedback.isCorrect ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Bonne réponse ! (+{selectedAnswer === answerFeedback.correctAnswer ? 10 : 0} pts)
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4" />
                      Mauvaise réponse
                    </>
                  )}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Bonne réponse : {answerFeedback.correctAnswer}.{" "}
                  {answerFeedback.explanation}
                </p>
              </div>
            )}

            {/* Host controls */}
            {isHost && (
              <div className="flex items-center gap-2 border-t pt-3">
                <Button
                  onClick={handleNext}
                  disabled={loading}
                  className="ml-auto gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  {room.currentIndex + 1 >= room.totalQuestions
                    ? "Voir les résultats"
                    : "Question suivante"}
                </Button>
              </div>
            )}
            {!isHost && !answerFeedback && (
              <p className="text-center text-xs text-muted-foreground">
                En attente de la question suivante...
              </p>
            )}
          </Card>

          {/* Live leaderboard */}
          <Card className="p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Trophy className="h-4 w-4 text-amber-600" />
              Classement live
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              {answeredCount} / {room.participants.length} ont répondu
            </p>
            <div className="max-h-80 space-y-1.5 overflow-y-auto scrollbar-thin">
              {[...room.participants]
                .sort((a, b) => b.score - a.score)
                .map((p, i) => (
                  <div
                    key={p.id}
                    className={`flex items-center gap-2 rounded-md border p-2 text-sm ${
                      p.isMe
                        ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30"
                        : "border-border bg-muted/30"
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        i === 0
                          ? "bg-amber-400 text-amber-900"
                          : i === 1
                          ? "bg-slate-300 text-slate-800"
                          : i === 2
                          ? "bg-orange-400 text-orange-900"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="flex-1 truncate">{p.name}</span>
                    {p.answeredCurrent && (
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    )}
                    <span className="font-mono text-xs font-bold tabular-nums">
                      {p.score}
                    </span>
                  </div>
                ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // === Finished screen ===
  if (screen === "finished" && room) {
    const leaderboard =
      room.finalLeaderboard ?? room.participants;
    const sorted = [...leaderboard].sort((a, b) => b.score - a.score);
    const winner = sorted[0];
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-6 text-center text-white">
            <Trophy className="mx-auto h-12 w-12" />
            <h2 className="mt-2 text-2xl font-bold">Compétition terminée !</h2>
            {winner && (
              <p className="mt-1 text-white/90">
                Vainqueur : <span className="font-bold">{winner.name}</span> avec{" "}
                {winner.score} pts
              </p>
            )}
          </div>
          <div className="p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Trophy className="h-4 w-4 text-amber-600" />
              Classement final
            </div>
            <div className="space-y-2">
              {sorted.map((p, i) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 rounded-lg border p-3 ${
                    i === 0
                      ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30"
                      : p.isMe
                      ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30"
                      : "border-border bg-muted/30"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                      i === 0
                        ? "bg-amber-400 text-amber-900"
                        : i === 1
                        ? "bg-slate-300 text-slate-800"
                        : i === 2
                        ? "bg-orange-400 text-orange-900"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {i === 0 ? (
                      <Crown className="h-4 w-4" />
                    ) : i === 1 ? (
                      <Medal className="h-4 w-4" />
                    ) : i === 2 ? (
                      <Medal className="h-4 w-4" />
                    ) : (
                      i + 1
                    )}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">
                      {p.name}
                      {p.isMe && (
                        <span className="ml-2 text-xs text-emerald-600">(Vous)</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p.answeredCount} questions répondues
                    </p>
                  </div>
                  <span className="font-mono text-lg font-bold tabular-nums">
                    {p.score}
                  </span>
                </div>
              ))}
            </div>
            <Button
              onClick={handleExit}
              className="mt-5 w-full gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
            >
              <RotateCcw className="h-4 w-4" />
              Nouvelle compétition
=======
  // ---------- Create ----------
  if (mode === "create") {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" className="gap-2" onClick={() => setMode("menu")}>
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>

        <div>
          <h1 className="text-2xl font-bold">Créer une room</h1>
          <p className="text-sm text-muted-foreground">
            Configurez votre compétition puis partagez le code.
          </p>
        </div>

        <Card className="space-y-4 p-5">
          <div>
            <Label>Banque de questions</Label>
            <Select value={selectedBankId} onValueChange={setSelectedBankId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir une banque" />
              </SelectTrigger>
              <SelectContent>
                {banks.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.title} ({b._count?.questions ?? 0} Q)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Nombre de questions : {questionCount}</Label>
              <input
                type="range"
                min={5}
                max={30}
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="mt-2 w-full accent-amber-500"
              />
            </div>
            <div>
              <Label>Temps par question : {durationSec}s</Label>
              <input
                type="range"
                min={10}
                max={60}
                step={5}
                value={durationSec}
                onChange={(e) => setDurationSec(Number(e.target.value))}
                className="mt-2 w-full accent-amber-500"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={createRoom}
              disabled={creating || !selectedBankId}
              className="gap-1.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white"
            >
              {creating ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Lancer la compétition
>>>>>>> Stashed changes
            </Button>
          </div>
        </Card>
      </div>
    );
  }

<<<<<<< Updated upstream
  return null;
=======
  // ---------- Join ----------
  if (mode === "join") {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" className="gap-2" onClick={() => setMode("menu")}>
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>

        <div>
          <h1 className="text-2xl font-bold">Rejoindre une room</h1>
          <p className="text-sm text-muted-foreground">
            Saisissez le code à 6 caractères fourni par l&apos;hôte.
          </p>
        </div>

        <Card className="space-y-4 p-5">
          <div>
            <Label>Code de la room</Label>
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ABCDEF"
              maxLength={6}
              className="font-mono text-2xl tracking-widest uppercase"
            />
          </div>
          <div className="flex justify-end">
            <Button
              onClick={joinRoom}
              disabled={joining || joinCode.length < 6}
              className="gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
            >
              {joining ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              Rejoindre
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ---------- Playing / Lobby / Finished ----------
  if (!room) {
    return <Skeleton className="h-64 rounded-xl" />;
  }

  // Finished
  if (room.phase === "finished") {
    const sorted = (room.participants ?? []).slice().sort((a, b) => b.score - a.score);
    const winner = sorted[0];
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" className="gap-2" onClick={exitRoom}>
          <ArrowLeft className="h-4 w-4" />
          Quitter
        </Button>

        <Card className="overflow-hidden p-6 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-lg">
            <Crown className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold">Compétition terminée !</h1>
          <p className="mt-1 text-muted-foreground">
            {winner ? `Vainqueur : ${winner.name} avec ${winner.score} points` : "Aucun participant"}
          </p>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b px-5 py-4">
            <h2 className="flex items-center gap-2 font-semibold">
              <Trophy className="h-4 w-4 text-amber-500" />
              Classement final
            </h2>
          </div>
          <div className="divide-y">
            {sorted.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    i === 0
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                      : i === 1
                        ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        : i === 2
                          ? "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300"
                          : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </span>
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-muted text-xs">
                    {p.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <p className="flex-1 truncate font-medium">{p.name}</p>
                <Badge variant="secondary" className="font-mono">
                  {p.score} pts
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        <div className="flex justify-center gap-2">
          <Button variant="outline" onClick={exitRoom} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Retour au menu
          </Button>
          <Button onClick={() => setMode("create")} className="gap-1.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white">
            <RefreshCw className="h-4 w-4" />
            Nouvelle room
          </Button>
        </div>
      </div>
    );
  }

  // Lobby
  if (room.phase === "lobby") {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" className="gap-2" onClick={exitRoom}>
          <ArrowLeft className="h-4 w-4" />
          Quitter
        </Button>
        <Card className="p-6 text-center">
          <h1 className="text-2xl font-bold">Salle d&apos;attente</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Code de la room :
          </p>
          <p className="mx-auto my-3 w-fit rounded-lg bg-muted px-6 py-3 font-mono text-3xl font-bold tracking-widest">
            {room.code}
          </p>
          <p className="text-sm text-muted-foreground">
            Partagez ce code avec vos amis pour qu&apos;ils rejoignent.
          </p>
        </Card>
        <Card className="overflow-hidden">
          <div className="border-b px-5 py-4">
            <h2 className="flex items-center gap-2 font-semibold">
              <Users className="h-4 w-4" />
              Participants ({room.participants?.length ?? 0})
            </h2>
          </div>
          <div className="divide-y">
            {(room.participants ?? []).map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-muted text-xs">
                    {p.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <p className="flex-1 truncate font-medium">{p.name}</p>
                {p.id === room.hostId && (
                  <Badge className="gap-1">
                    <Crown className="h-3 w-3" />
                    Hôte
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  // Playing
  const q = room.currentQuestion;
  const progress =
    room.totalQuestions > 0
      ? ((room.currentQuestionIdx + 1) / room.totalQuestions) * 100
      : 0;
  const isHost = room.isHost;
  const answeredCount = (room.participants ?? []).filter((p) => p.answeredCurrent).length;
  const totalCount = (room.participants ?? []).length;
  const isCritical = remainingSec <= 5;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" className="gap-2" onClick={exitRoom}>
            <ArrowLeft className="h-4 w-4" />
            Quitter
          </Button>
          <h1 className="mt-1 text-lg font-bold">
            Room {room.code} · {room.bankTitle}
          </h1>
          <p className="text-xs text-muted-foreground">
            Question {room.currentQuestionIdx + 1} sur {room.totalQuestions}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={`font-mono ${
              isCritical
                ? "animate-pulse border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
            }`}
          >
            <Timer className="mr-1 h-3 w-3" />
            {remainingSec}s
          </Badge>
          <Badge variant="secondary">
            {answeredCount}/{totalCount} ont répondu
          </Badge>
        </div>
      </div>

      <Progress value={progress} className="h-2" />

      {/* Question */}
      {q ? (
        <Card className="overflow-hidden p-4 sm:p-6">
          <h2 className="mb-4 text-base font-semibold leading-snug sm:text-lg">
            {q.question}
          </h2>
          <div className="space-y-3">
            {OPTION_LETTERS.map((letter) => {
              const text =
                letter === "A"
                  ? q.optionA
                  : letter === "B"
                    ? q.optionB
                    : letter === "C"
                      ? q.optionC
                      : q.optionD;
              const isSelected = selectedAnswer === letter;
              const isCorrect = feedback?.correctAnswer === letter;

              let cls =
                "border-border hover:border-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-950/20";
              if (feedback) {
                if (isCorrect) {
                  cls = "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30";
                } else if (isSelected && !isCorrect) {
                  cls = "border-rose-500 bg-rose-50 dark:bg-rose-950/30";
                } else {
                  cls = "border-border opacity-60";
                }
              } else if (isSelected) {
                cls = "border-amber-500 bg-amber-50 dark:bg-amber-950/30";
              }

              return (
                <button
                  key={letter}
                  onClick={() => submitAnswer(letter)}
                  disabled={!!selectedAnswer}
                  className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-all disabled:cursor-not-allowed ${cls}`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                      feedback && isCorrect
                        ? "bg-emerald-500 text-white"
                        : feedback && isSelected && !isCorrect
                          ? "bg-rose-500 text-white"
                          : isSelected
                            ? "bg-amber-500 text-white"
                            : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {letter}
                  </span>
                  <span className="flex-1 font-medium">{text}</span>
                  {feedback && isCorrect && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                  {feedback && isSelected && !isCorrect && <XCircle className="h-5 w-5 text-rose-600" />}
                </button>
              );
            })}
          </div>

          {feedback && (
            <div
              className={`mt-4 rounded-xl border p-3 text-sm ${
                feedback.correct
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
                  : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                {feedback.correct ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Bonne réponse !
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    Mauvaise réponse
                  </>
                )}
              </div>
              <p className="mt-1 text-muted-foreground">{feedback.explanation}</p>
            </div>
          )}

          {isHost && feedback && (
            <div className="mt-4 flex justify-end">
              <Button
                onClick={nextQuestion}
                className="gap-1.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white"
              >
                Question suivante
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
          {!isHost && feedback && (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              En attente de l&apos;hôte pour la question suivante…
            </p>
          )}
        </Card>
      ) : (
        <Card className="p-8 text-center text-muted-foreground">
          Chargement de la question…
        </Card>
      )}

      {/* Live leaderboard */}
      <Card className="overflow-hidden">
        <div className="border-b px-5 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Trophy className="h-4 w-4 text-amber-500" />
            Classement en direct
          </h2>
        </div>
        <div className="divide-y">
          {(room.participants ?? [])
            .slice()
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 px-5 py-2 text-sm">
                <span className="w-5 text-center font-bold text-muted-foreground">
                  {i + 1}
                </span>
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-muted text-[10px]">
                    {p.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <p className="flex-1 truncate">{p.name}</p>
                <span className="font-mono text-xs">{p.score} pts</span>
              </div>
            ))}
        </div>
      </Card>
    </div>
  );
>>>>>>> Stashed changes
}
