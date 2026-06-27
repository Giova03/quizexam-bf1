/**
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

export interface CompetitionQuestion {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
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

export interface CompetitionRoom {
  code: string;
  hostId: string;
  hostName: string;
  bankId: string;
  bankTitle: string;
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
  }
  return code;
}

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
}
