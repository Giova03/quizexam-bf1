import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cacheGet, cacheSet } from "@/lib/cache";
import {
  rateLimitCheck,
  getClientKey,
  rateLimitHeaders,
} from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * GET /api/public/stats — V15 « Tour de contrôle publique ».
 *
 * Aggregate, leak-free platform counters for the public landing page's
 * control-tower panel. Mirrors the admin /api/admin/stats counts but:
 *   - NO PII (no users list, no sessions detail, no emails) — only counts;
 *   - cached 60 s in memory (spares Supabase on landing-page traffic);
 *   - rate-limited like the other /api/public/* endpoints;
 *   - cold-start safe: a 4 s DB timeout degrades gracefully to
 *     `available: false` instead of hanging the hero panel.
 */
export async function GET(request: Request) {
  // --- Rate limit ---
  const key = getClientKey(request);
  const rl = rateLimitCheck(key);
  const headers = rateLimitHeaders(rl);
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: "Trop de requêtes. Réessayez dans quelques secondes.",
        code: "RATE_LIMITED",
      },
      { status: 429, headers }
    );
  }

  // --- In-memory cache (60 s) ---
  const CACHE_KEY = "public:stats";
  const cached = cacheGet<{
    banks: number;
    questions: number;
    exams: number;
    users: number;
    sessions: number;
    completedSessions: number;
    ts: number;
  }>(CACHE_KEY);
  if (cached) {
    return NextResponse.json({ ...cached, available: true }, { headers });
  }

  // --- Cold-start guard: degrade instead of hanging the landing ---
  const DB_TIMEOUT_MS = 4_000;
  try {
    const counts = await Promise.race([
      Promise.all([
        db.questionBank.count(),
        db.question.count(),
        db.exam.count(),
        db.user.count(),
        db.quizSession.count(),
        db.quizSession.count({ where: { completedAt: { not: null } } }),
      ]),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("stats timeout")), DB_TIMEOUT_MS)
      ),
    ]);
    const [banks, questions, exams, users, sessions, completedSessions] = counts;
    const payload = {
      banks,
      questions,
      exams,
      users,
      sessions,
      completedSessions,
      ts: Date.now(),
    };
    cacheSet(CACHE_KEY, payload, 60_000);
    return NextResponse.json({ ...payload, available: true }, { headers });
  } catch {
    // DB asleep or unreachable — the landing shows its graceful fallback.
    return NextResponse.json(
      { banks: 0, questions: 0, exams: 0, users: 0, sessions: 0, completedSessions: 0, ts: Date.now(), available: false },
      { headers }
    );
  }
}
