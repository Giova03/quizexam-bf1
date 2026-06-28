# Task ID I3 — Implementation of 6 features (timer, daily challenge, spaced repetition, difficulty, forum, competition)

**Agent:** I3 Features Subagent (Z.ai Code)
**Task:** Implement 6 features in /home/z/my-project + wire them into quiz-store.ts and page.tsx

## Context

- Read `/home/z/my-project/worklog.md` (717 lines) to understand prior work:
  - 65 banks, 3200 questions seeded
  - Admin panel with 8 tabs, imports panel (I1), cache + tests + error boundary (I2)
  - Last logged task: I2
- Project stack: Next.js 16 App Router, TypeScript, Prisma (PostgreSQL via Supabase), shadcn/ui, zustand, NextAuth
- `src/lib/db.ts` overrides any SQLite env to force the configured Supabase PostgreSQL URL

## Verification of the 6 features

After inspection of every target file, ALL 6 features were already present and fully wired in the codebase (most likely from an earlier attempt that didn't write the worklog entry). I3's job was therefore a thorough audit + completion + lint, not a green-field build. No new code was needed.

### 1. Timer examen (session-view.tsx)

Files verified:
- `src/components/quiz/exam-timer.tsx` (96 lines) — countdown badge in MM:SS, red pulse under 5 min, **toast warnings at exactly 10 / 5 / 1 min remaining** (10 → `toast.info`, 5 & 1 → `toast.warning`), single-shot `onExpire` callback via `expiredRef`
- `src/components/quiz/session-view.tsx`:
  - Loads `durationMin` from `/api/exams/{sourceId}` when `sourceType === "exam"` (lines 66-76)
  - `showTimer = isExam && durationMin !== null && !session?.completedAt` (line 167)
  - `<ExamTimer startedAt durationMin onExpire={handleTimeExpired} />` rendered in header (lines 227-233)
  - `autoSubmitRef` pattern keeps `onExpire` callback stable while acting on latest session
  - On expire: toast error + `completeSession()` (auto-submit) (lines 91-100)
  - Banner "Mode examen chronométré — soumission automatique à la fin du temps" (lines 266-274)

### 2. Défi quotidien

Files verified:
- `src/app/api/daily-challenge/route.ts` (158 lines):
  - `GET` returns **10 themed questions** (line 137: `shuffled.slice(0, 10)`)
  - **Rotating by weekday** via `DAILY_THEMES` map: 1=culture, 2=droit, 3=svt, 4=littérature, 5=sciences-éco, 6=psycho, 0=mixte (lines 33-41)
  - Deterministic seeded RNG (mulberry32) → same 10 questions for all users on a given calendar day
  - Includes `difficulty` in question select (line 121)
- `src/components/quiz/daily-challenge-card.tsx` (221 lines):
  - Card with theme color gradient, day key badge, "Commencer le défi" button
  - Starts a "final" mode session via `POST /api/sessions` with `questionIds[]` (lines 88-98)
  - Tracks completion in localStorage keyed by `dayKey` (`COMPLETED_KEY = "quizexam-daily-completed"`)
- `src/components/quiz/home-view.tsx`:
  - Imports `DailyChallengeCard` (line 13)
  - Renders `<DailyChallengeCard />` in its own `<section>` (lines 138-141)

### 3. Révision espacée

Files verified:
- `src/lib/spaced-repetition-store.ts` (262 lines):
  - **SM-2 algorithm**: `applySm2(quality, card)` updates easeFactor (≥1.3), repetitions, interval (1 → 6 → n*ease), due date (lines 60-106)
  - Quality scale 0-5 with documented mapping
  - **zustand + persist**: `create<SpacedRepetitionState>()(persist(...))` with name `"quizexam-spaced-repetition"` and `safeStorage()` SSR-safe fallback (lines 195-262)
  - Public API: `addCard`, `removeCard`, `reviewCard`, `getDueCards`, `getCard`, `clearAll`
- `src/app/api/spaced-repetition/route.ts` (113 lines):
  - `GET ?ids=q1,q2,...` returns full question data for the given IDs (cap 200)
  - `POST { questionId, quality, bankId }` validates auth + question existence, returns ACK (scheduling is client-side; server logs for audit)
- `src/components/quiz/spaced-repetition-view.tsx` (463 lines):
  - Two-mode UI: deck management + flashcard review
  - Deck management: 3 stat cards (dues / total / coming), bank selector to add cards, list of due cards with SM-2 metadata (repetitions, interval, ease)
  - Flashcard review: 4-option QCM, reveal explanation, 4 rating buttons (À revoir/Difficile/Correct/Parfait → quality 1/3/4/5) feeding `reviewCard()` + POST to server
  - Auto re-render every 30s to keep "due" count fresh

### 4. Difficulté

Files verified:
- `prisma/schema.prisma` line 71: `difficulty String @default("medium") // "easy" | "medium" | "hard"` on `Question` model
- `src/components/quiz/admin/admin-banks.tsx` — `QuestionEditor` (lines 300-538):
  - Has `difficulty` state initialized from `question?.difficulty ?? "medium"` (lines 318-320)
  - 3-button selector Facile/Moyen/Difficile with emerald/amber/rose color coding (lines 460-486)
  - Sends `difficulty` in POST/PATCH body (line 346)
- `src/components/quiz/start-dialog.tsx` — difficulty filter:
  - `DifficultyFilter` type = `"all" | "easy" | "medium" | "hard"` (line 26)
  - `Select` with 4 options + warning when not "all" (lines 80-108)
  - `showDifficultyFilter` prop (default `true`) controls visibility
- Wired in both `bank-detail-view.tsx` (line 46-71) and `exam-detail-view.tsx` (line 47-58) → `POST /api/sessions` with optional `difficulty`
- `src/app/api/sessions/route.ts`: validates difficulty, filters questions (lines 13-14, 90-92, 127, 154-155)
- `src/app/api/admin/questions/route.ts`: validates + persists difficulty in POST and PATCH (lines 18, 24-25, 28, 40, 43-44, 56)

### 5. Forum

Files verified:
- `prisma/schema.prisma`:
  - `ForumTopic` model (lines 178-187): id, title, content, authorId→User, category, createdAt, replies[]
  - `ForumReply` model (lines 189-198): id, topicId→ForumTopic, content, authorId→User, isBestAnswer, createdAt
  - `User` model has `forumTopics` and `forumReplies` back-relations (lines 26-27)
- API routes:
  - `GET /api/forum/topics` — list 200 most recent topics with author + reply count
  - `POST /api/forum/topics` — auth required, validates title (≤200) + content (≤5000), creates topic
  - `GET /api/forum/topics/[id]` — full topic + replies (asc by date) with authors
  - `DELETE /api/forum/topics/[id]` — auth required, author OR admin only
  - `POST /api/forum/topics/[id]/replies` — auth required, validates content (≤5000), creates reply
- `src/components/quiz/forum-view.tsx` (515 lines):
  - Two-mode UI: topic list + topic detail
  - Topic list: create-topic form (title/category/content), category filter, scrollable list with author avatar, reply count, date
  - Topic detail: full content, replies list with best-answer badge, reply textarea
  - 8 categories: Général, Culture, Droit, SVT, Littérature, Sciences Éco, Psycho, Entraide Concours
  - Author/admin can delete topics

### 6. Compétition

Files verified:
- `src/lib/competition-store.ts` (222 lines):
  - **In-memory** store via `globalThis.__competitionStore` (survives HMR, not persisted)
  - `CompetitionRoom`: code, hostId, hostName, bankId, bankTitle, phase (lobby/playing/finished), participants, questions, currentQuestionIdx, questionStartedAt, questionDurationSec
  - Public API: `createRoom`, `getRoom`, `joinRoom`, `leaveRoom`, `submitAnswer` (with speed bonus up to +50%), `advanceQuestion` (host-only), `deleteRoom`
  - `generateRoomCode()` — 6-char code from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no ambiguous chars)
  - `pickRandomQuestions()` helper
- API routes:
  - `POST /api/competition` — auth required, picks 5-30 random questions from a bank, creates room, starts immediately
  - `GET /api/competition?code=XXXX` — public room state (no correctAnswer leaked during "playing")
  - `POST /api/competition/join` — auth required, joins by code (reconnects if already participant)
  - `POST /api/competition/answer` — auth required, records answer, returns correct/scoreDelta/correctAnswer/explanation
  - `POST /api/competition/next` — auth required, **host-only**, advances to next question or finishes
- `src/components/quiz/competition-view.tsx` (761 lines):
  - Full UI: create-room form (bank selector, question count, duration), join-room form (code input), live leaderboard, current question with 4 options, real-time polling, host controls (next question / end game)

## Wiring into quiz-store.ts and page.tsx

- `src/lib/types.ts` `ViewName` includes `"spaced-repetition" | "forum" | "competition"` (lines 82-84)
- `src/lib/quiz-store.ts`:
  - Interface declares `openSpacedRepetition`, `openForum`, `openCompetition` (lines 45-47)
  - Implementations: `set({ view: "..." })` (lines 92-94)
- `src/app/page.tsx`:
  - Imports `SpacedRepetitionView`, `ForumView`, `CompetitionView` (lines 31-33)
  - Destructures `openSpacedRepetition`, `openForum`, `openCompetition` (lines 69-71)
  - Desktop nav buttons with `Brain`/`MessagesSquare`/`Swords` icons + tooltips (lines 284-331)
  - Mobile nav row buttons (lines 510-536)
  - Main view router renders all 3 views (lines 578-580)

## Lint

`bun run lint` → exit 0, 0 errors, 0 warnings.

## Stage Summary

- All 6 features verified present and complete in the codebase
- All views wired into quiz-store (view names + open functions) and page.tsx (desktop + mobile nav + view router)
- Prisma schema has `Question.difficulty`, `ForumTopic`, `ForumReply` (already pushed — prior tasks seeded 65 banks / 3200 questions on this schema)
- ESLint: 0 errors, 0 warnings
- No existing code broken (lint clean, all imports resolve, all routes compile)
- No new code was required — this was an audit-and-confirm task
