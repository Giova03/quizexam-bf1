/**
<<<<<<< Updated upstream
 * In-memory competition store for the polling-based "Mode Compétition".
 *
 * State is held in a module-level Map on `globalThis` so it survives Next.js
 * dev-server HMR reloads (similar to how PrismaClient is cached in src/lib/db.ts).
 *
 * Each room stores: code, host, participants, questions, currentIndex, status,
 * and a per-participant score map. Rooms auto-expire after 6 hours of inactivity
 * to avoid unbounded memory growth in long-running servers.
 */

export type CompetitionStatus = "lobby" | "playing" | "finished";
=======
 * Magasin en mémoire pour le mode compétition (rooms de quiz multi-joueurs).
 *
 * Ce magasin vit uniquement dans le process Node du serveur (Next.js route
 * handlers). Il n'est PAS persisté : redémarrer le serveur vide toutes les
 * rooms. C'est voulu : une compétition est éphémère.
 *
 * On utilise `globalThis` pour survivre au hot-reload en dev.
 */

export type CompetitionPhase = "lobby" | "playing" | "finished";

export interface Participant {
  id: string; // identifiant côté client (localStorage)
  name: string;
  score: number;
  answeredCurrent: boolean;
  lastAnswerCorrect: boolean | null;
  joinedAt: number;
}
>>>>>>> Stashed changes

export interface CompetitionQuestion {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
<<<<<<< Updated upstream
  correctAnswer: string; // "A" | "B" | "C" | "D"
  explanation: string;
}

export interface Participant {
  id: string; // user id (or anonymous slug)
  name: string;
  score: number;
  /** Number of questions answered (so we can tell if they've answered the current one). */
  answeredCount: number;
  /** Per-question answers: { questionIndex: "A" | "B" | "C" | "D" } */
  answers: Record<number, string>;
  /** Whether the participant has answered the CURRENT question. */
  answeredCurrent: boolean;
  joinedAt: number;
}

=======
  correctAnswer: string;
  explanation: string;
}

>>>>>>> Stashed changes
export interface CompetitionRoom {
  code: string;
  hostId: string;
  hostName: string;
  bankId: string;
  bankTitle: string;
<<<<<<< Updated upstream
  questions: CompetitionQuestion[];
  currentIndex: number;
  status: CompetitionStatus;
  participants: Map<string, Participant>; // keyed by participant id
  createdAt: number;
  lastActivityAt: number;
  /** Question start time (epoch ms) — used to compute the per-question timer. */
  questionStartedAt: number | null;
  /** Per-question time limit in seconds. */
  questionTimeLimitSec: number;
  /** Final leaderboard (set when status === "finished"). */
  finalLeaderboard: Participant[] | null;
}

const ROOM_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const SWEEP_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

interface GlobalWithRooms {
  __competitionRooms?: Map<string, CompetitionRoom>;
  __competitionSweepStarted?: boolean;
}

const g = globalThis as unknown as GlobalWithRooms;

function roomsMap(): Map<string, CompetitionRoom> {
  if (!g.__competitionRooms) {
    g.__competitionRooms = new Map();
  }
  return g.__competitionRooms;
}

/** Generate a 6-char uppercase alphanumeric room code (excludes ambiguous chars). */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function generateRoomCode(): string {
  let code = "";
  const bytes = new Uint8Array(6);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
    for (let i = 0; i < 6; i++) {
      code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
    }
  } else {
    for (let i = 0; i < 6; i++) {
      code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
=======
  phase: CompetitionPhase;
  participants: Record<string, Participant>;
  questions: CompetitionQuestion[];
  currentQuestionIdx: number;
  questionStartedAt: number | null;
  questionDurationSec: number;
  createdAt: number;
}

interface CompetitionStore {
  rooms: Record<string, CompetitionRoom>;
  createRoom: (input: {
    code: string;
    hostId: string;
    hostName: string;
    bankId: string;
    bankTitle: string;
    questions: CompetitionQuestion[];
    questionDurationSec?: number;
  }) => CompetitionRoom;
  getRoom: (code: string) => CompetitionRoom | undefined;
  joinRoom: (code: string, participant: { id: string; name: string }) => CompetitionRoom | null;
  leaveRoom: (code: string, participantId: string) => void;
  submitAnswer: (
    code: string,
    participantId: string,
    answer: "A" | "B" | "C" | "D",
    answeredAt?: number
  ) => { correct: boolean; scoreDelta: number } | null;
  advanceQuestion: (code: string, hostId: string) => CompetitionRoom | null;
  deleteRoom: (code: string) => void;
}

function createStore(): CompetitionStore {
  return {
    rooms: {},

    createRoom(input) {
      const room: CompetitionRoom = {
        code: input.code,
        hostId: input.hostId,
        hostName: input.hostName,
        bankId: input.bankId,
        bankTitle: input.bankTitle,
        phase: "lobby",
        participants: {
          [input.hostId]: {
            id: input.hostId,
            name: input.hostName,
            score: 0,
            answeredCurrent: false,
            lastAnswerCorrect: null,
            joinedAt: Date.now(),
          },
        },
        questions: input.questions,
        currentQuestionIdx: 0,
        questionStartedAt: null,
        questionDurationSec: input.questionDurationSec ?? 30,
        createdAt: Date.now(),
      };
      this.rooms[input.code] = room;
      return room;
    },

    getRoom(code) {
      return this.rooms[code.toUpperCase()];
    },

    joinRoom(code, participant) {
      const room = this.getRoom(code);
      if (!room) return null;
      if (room.phase === "finished") return null;
      room.participants[participant.id] = {
        id: participant.id,
        name: participant.name,
        score: 0,
        answeredCurrent: false,
        lastAnswerCorrect: null,
        joinedAt: Date.now(),
      };
      return room;
    },

    leaveRoom(code, participantId) {
      const room = this.getRoom(code);
      if (!room) return;
      delete room.participants[participantId];
      // Si la room est vide, on la supprime
      if (Object.keys(room.participants).length === 0) {
        delete this.rooms[code.toUpperCase()];
      }
    },

    submitAnswer(code, participantId, answer, answeredAt = Date.now()) {
      const room = this.getRoom(code);
      if (!room || room.phase !== "playing") return null;
      const p = room.participants[participantId];
      if (!p || p.answeredCurrent) return null;

      const currentQ = room.questions[room.currentQuestionIdx];
      if (!currentQ) return null;

      const correct = currentQ.correctAnswer === answer;
      // Bonus de vitesse : jusqu'à +50% du score de base selon la rapidité
      const basePoints = 100;
      let scoreDelta = 0;
      if (correct && room.questionStartedAt) {
        const elapsedSec = Math.max(
          0,
          (answeredAt - room.questionStartedAt) / 1000
        );
        const remaining = Math.max(0, room.questionDurationSec - elapsedSec);
        const speedBonus = Math.round((remaining / room.questionDurationSec) * 50);
        scoreDelta = basePoints + speedBonus;
      }
      p.score += scoreDelta;
      p.answeredCurrent = true;
      p.lastAnswerCorrect = correct;
      return { correct, scoreDelta };
    },

    advanceQuestion(code, hostId) {
      const room = this.getRoom(code);
      if (!room) return null;
      if (room.hostId !== hostId) return null;

      const nextIdx = room.currentQuestionIdx + 1;
      if (nextIdx >= room.questions.length) {
        room.phase = "finished";
        room.questionStartedAt = null;
        return room;
      }
      room.currentQuestionIdx = nextIdx;
      room.questionStartedAt = Date.now();
      // Reset participants pour la prochaine question
      for (const p of Object.values(room.participants)) {
        p.answeredCurrent = false;
        p.lastAnswerCorrect = null;
      }
      return room;
    },

    deleteRoom(code) {
      delete this.rooms[code.toUpperCase()];
    },
  };
}

// Singleton qui survit au HMR
const globalForCompetition = globalThis as unknown as {
  __competitionStore?: CompetitionStore;
};

export const competitionStore: CompetitionStore =
  globalForCompetition.__competitionStore ?? createStore();

if (process.env.NODE_ENV !== "production") {
  globalForCompetition.__competitionStore = competitionStore;
}

/**
 * Génère un code de room aléatoire à 6 caractères (majuscules + chiffres,
 * sans caractères ambigus comme O/0, I/1).
 */
export function generateRoomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
>>>>>>> Stashed changes
  }
  return code;
}

<<<<<<< Updated upstream
/** Generate a unique room code (retries on collision). */
export function generateUniqueRoomCode(): string {
  const rooms = roomsMap();
  for (let i = 0; i < 10; i++) {
    const code = generateRoomCode();
    if (!rooms.has(code)) return code;
  }
  // Fallback: append a timestamp suffix.
  return (generateRoomCode() + Date.now().toString(36))
    .slice(0, 6)
    .toUpperCase();
}

export function createRoom(room: CompetitionRoom): void {
  roomsMap().set(room.code, room);
  ensureSweepStarted();
}

export function getRoom(code: string): CompetitionRoom | undefined {
  const room = roomsMap().get(code.toUpperCase());
  if (!room) return undefined;
  // Touch lastActivityAt so the sweep doesn't collect active rooms.
  room.lastActivityAt = Date.now();
  return room;
}

export function deleteRoom(code: string): boolean {
  return roomsMap().delete(code.toUpperCase());
}

export function listRoomCodes(): string[] {
  return Array.from(roomsMap().keys());
}

/** Periodically sweep expired rooms (called lazily on first room creation). */
function ensureSweepStarted() {
  if (g.__competitionSweepStarted) return;
  g.__competitionSweepStarted = true;
  const sweep = () => {
    const rooms = roomsMap();
    const now = Date.now();
    for (const [code, room] of rooms) {
      if (now - room.lastActivityAt > ROOM_TTL_MS) {
        rooms.delete(code);
      }
    }
  };
  sweep();
  if (typeof setInterval === "function") {
    setInterval(sweep, SWEEP_INTERVAL_MS);
  }
}

/** Serialise a room to a plain JSON-safe object (no Maps). */
export function serializeRoom(room: CompetitionRoom, viewerId?: string) {
  const participants = Array.from(room.participants.values()).sort(
    (a, b) => b.score - a.score
  );
  const currentQuestion =
    room.status === "playing" && room.currentIndex < room.questions.length
      ? room.questions[room.currentIndex]
      : null;

  return {
    code: room.code,
    status: room.status,
    bankTitle: room.bankTitle,
    hostId: room.hostId,
    hostName: room.hostName,
    currentIndex: room.currentIndex,
    totalQuestions: room.questions.length,
    questionTimeLimitSec: room.questionTimeLimitSec,
    questionStartedAt: room.questionStartedAt,
    participants: participants.map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      answeredCount: p.answeredCount,
      answeredCurrent: p.answeredCurrent,
      isHost: p.id === room.hostId,
      isMe: !!viewerId && p.id === viewerId,
    })),
    currentQuestion: currentQuestion
      ? {
          id: currentQuestion.id,
          question: currentQuestion.question,
          optionA: currentQuestion.optionA,
          optionB: currentQuestion.optionB,
          optionC: currentQuestion.optionC,
          optionD: currentQuestion.optionD,
          // Don't leak the correct answer until the host advances the question.
          correctAnswer: null,
          explanation: null,
        }
      : null,
    myAnswer:
      viewerId && currentQuestion
        ? room.participants.get(viewerId)?.answers[room.currentIndex] ?? null
        : null,
    finalLeaderboard: room.finalLeaderboard
      ? room.finalLeaderboard.map((p) => ({
          id: p.id,
          name: p.name,
          score: p.score,
          answeredCount: p.answeredCount,
          isHost: p.id === room.hostId,
          isMe: !!viewerId && p.id === viewerId,
        }))
      : null,
    createdAt: room.createdAt,
  };
}

/** Pick `n` random questions from the given array (Fisher-Yates partial shuffle). */
export function pickRandom<T>(arr: T[], n: number): T[] {
  if (n >= arr.length) return [...arr];
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0 && i >= copy.length - n; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(copy.length - n);
=======
/**
 * Helper : sélectionne N questions aléatoires depuis une liste.
 */
export function pickRandomQuestions<T>(
  questions: T[],
  count: number
): T[] {
  const shuffled = [...questions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
>>>>>>> Stashed changes
}
