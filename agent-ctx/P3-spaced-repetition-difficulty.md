# P3 — Révision Espacée (SM-2) + Niveau de difficulté des questions

**Task ID:** P3
**Agent:** P3 (Z.ai Code)
**Date:** 2026-06-27

## Task

Implement TWO features in the QuizExam BF platform:

1. **Révision Espacée (Spaced Repetition)** — Anki-like flashcard system using the SM-2 algorithm
2. **Niveau de difficulté des questions** — Add a `difficulty` field (easy/medium/hard) to questions, with filtering at bank-detail, start-dialog, and session creation

## Prior Context (from worklog.md)

- Project is Next.js 16 + TypeScript + Prisma (PostgreSQL on Supabase) + Zustand + shadcn/ui
- 53 banks, 3100 questions (after Q1 deduplication task)
- Auth is mandatory (NextAuth v4); admin = giobamos03@gmail.com
- Existing patterns: `useFavorites` Zustand+persist store with key `quizexam-favorites` (model for `useSpacedRepetition`)
- Existing `RevisionDialog` (bank-scoped manual flashcard UI, no SM-2)
- Existing `StartDialog` accepts `onStart: (mode) => Promise<void>`
- `Question` model already has a `level` field ("TOUS" etc.) — `difficulty` is a NEW field
- Daily-challenge task (P2) added `questionIds?: string[]` to `/api/sessions` POST (preserved here)

## Files Modified / Created

### Feature 1 — Spaced Repetition

**NEW** `src/lib/spaced-repetition-store.ts` (~155 lines)
- Zustand store with `persist` middleware, key `quizexam-spaced-repetition`
- Interface `SpacedCard` with: questionId, bankId, ease (2.5), interval (1 day), repetitions (0), nextReview (ISO), lastReview (ISO | null)
- Functions: `addCard(questionId, bankId)`, `reviewCard(questionId, quality: 0-5)`, `removeCard`, `getDueCards()`, `getCard`, `getStats()` (totalCards, dueToday, reviewedToday, averageEase), `clearAll`
- Exported `applySm2(card, quality)` helper implementing the SM-2 algorithm exactly per spec:
  - quality 0-2 → reset repetitions=0, interval=1
  - quality 3-5:
    - repetitions==0 → interval=1
    - repetitions==1 → interval=6
    - else → interval=round(interval*ease)
  - ease = max(1.3, ease + 0.1 - (5-quality)*(0.08 + (5-quality)*0.02))
  - repetitions++ on quality≥3
- nextReview = today + interval days

**NEW** `src/app/api/spaced-repetition/route.ts` (~150 lines)
- `GET /api/spaced-repetition?ids=q1,q2,...` — returns full question data (incl. `bank` relation + `difficulty`) for the given IDs, preserving caller order. Auth required.
- `POST /api/spaced-repetition` body `{ questionId, quality: 0-5, card?: SpacedCard }` — validates questionId exists in DB, applies SM-2 to either supplied card or a fresh default card, returns `{ success, questionId, quality, card }`. Auth required.
- The primary client updates the store locally (Zustand) for instant UI; this endpoint exists for symmetry, external integrations, and future server-side persistence.

**NEW** `src/components/quiz/spaced-repetition-view.tsx` (~600 lines)
- Header card with amber/orange gradient + 4-stat KPI grid (Cartes suivies / À réviser aujourd'hui / Révisées aujourd'hui / Easiness moyen)
- "Actualiser" button to reload due cards from the API
- Progress bar (`<Progress>`) showing position in current due-cards session
- Flashcard UI:
  - Question text + difficulty badge + bank title in header strip
  - 4 options A/B/C/D (correct answer highlighted when revealed)
  - "Révéler la réponse" button → reveals options + explanation
  - After reveal, 4 rating buttons (SM-2 quality mapping per spec):
    - **À revoir** → quality 0 (rose)
    - **Difficile** → quality 3 (amber)
    - **Bien** → quality 4 (emerald)
    - **Facile** → quality 5 (sky)
  - Each rating calls `reviewCard(id, q)` in the store, advances to next card, shows toast on session completion, then auto-reloads due list
- Empty-state card with "Démarrage rapide" — pick any bank to seed 20 sample cards

**MODIFIED** `src/lib/quiz-store.ts`
- Added `"spaced-repetition"` to ViewName union
- Added `openSpacedRepetition: () => void` action

**MODIFIED** `src/lib/types.ts`
- Added `"spaced-repetition"` to ViewName
- Added optional `difficulty?: "easy" | "medium" | "hard"` to `Question` interface

**MODIFIED** `src/components/quiz/home-view.tsx`
- Imported `useSpacedRepetition` and `Brain` icon
- Added second quick-action button "Révision espacée" (amber-themed, beside existing search button)
- Button shows dynamic badge: "N dues" (amber) when dueToday>0, else "N cartes" (secondary) when totalCards>0, else no badge
- Clicking calls `openSpacedRepetition()` from the quiz store

**MODIFIED** `src/app/page.tsx`
- Imported `SpacedRepetitionView`
- Added route: `view === "spaced-repetition" && <SpacedRepetitionView />`

### Feature 2 — Difficulty

**MODIFIED** `prisma/schema.prisma`
- Added `difficulty String @default("medium") // "easy" | "medium" | "hard"` to the `Question` model

**DB PUSH** — ran `DATABASE_URL=postgresql://...@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true DIRECT_URL=postgresql://...@aws-0-eu-west-1.pooler.supabase.com:5432/postgres bun run db:push`
- Prisma client regenerated successfully
- All existing rows backfilled to "medium" by the @default

**MODIFIED** `src/app/api/admin/questions/route.ts`
- POST: destructures `difficulty` from body, validates against `["easy","medium","hard"]`, defaults to "medium", passes to `db.question.create()`
- PATCH: if `difficulty` is provided, validates and adds to update payload; returns 400 if invalid

**MODIFIED** `src/components/quiz/admin-view.tsx`
- Extended `Question` interface with `difficulty?: string`
- Added `difficulty` state in `QuestionEditor` (defaults from `question?.difficulty ?? "medium"`)
- Added 3-button difficulty selector (Facile / Moyen / Difficile) with color-coded active state (emerald / amber / rose) inside QuestionEditor
- `save()` now includes `difficulty` in the POST/PATCH body
- Bank-questions dialog now shows a per-question difficulty badge next to the question text (Facile / Moyen / Difficile)

**MODIFIED** `src/components/quiz/start-dialog.tsx` (rewritten)
- New exported type `DifficultyFilter = "all" | "easy" | "medium" | "hard"`
- New optional props: `difficultyCounts?: { all, easy, medium, hard }`, `initialDifficulty?: DifficultyFilter`
- Changed `onStart` signature to `(mode, difficulty: DifficultyFilter) => Promise<void>`
- When `difficultyCounts` is provided, renders a 4-button difficulty selector (Toutes / Facile / Moyen / Difficile) with per-difficulty question counts
- The "Commencer" button is disabled when the selected difficulty has 0 questions (with a warning message)
- `liveCount` dynamically updates the question count shown in the dialog header based on the selected difficulty

**MODIFIED** `src/components/quiz/bank-detail-view.tsx` (rewritten)
- Added `difficulty` state (`DifficultyFilter`, default "all")
- New "Difficulty filter" card with 4 buttons (Toutes/Facile/Moyen/Difficile) showing per-difficulty counts as small badges
- Preview list filters by selected difficulty; empty-state message when no questions match
- Each preview question shows a difficulty badge when not "medium"
- `handleStart(mode, diff)` sends `difficulty: diff` to `/api/sessions`
- `difficultyCounts` memo computed from `bank.questions` and passed to `<StartDialog>` along with `initialDifficulty={difficulty}` so the two UIs stay in sync

**MODIFIED** `src/components/quiz/exam-detail-view.tsx`
- Updated `handleStart(mode, difficulty)` to send `difficulty` to `/api/sessions`
- Computes `difficultyCounts` from exam questions and passes them to `<StartDialog>`

**MODIFIED** `src/app/api/sessions/route.ts`
- Extended `CreateSessionBody` with optional `difficulty?: "easy" | "medium" | "hard" | "all"`
- Normalizes to `diffFilter: "easy" | "medium" | "hard" | null`
- For `sourceType === "bank"`: applies Prisma `where: { difficulty: diffFilter }` to the questions relation when filtering
- For `sourceType === "exam"`: applies in-memory filter on `eq.question.difficulty`
- For `questionIds` (daily-challenge path): filter is intentionally NOT applied (caller has already curated the list — preserves P2 behavior)

## Verification

### Lint
- `bun run lint` → **0 errors, 0 warnings** (clean)
- `bunx tsc --noEmit` → 1 pre-existing error in `next.config.ts` (deprecated `eslint` key — unrelated to my changes, ignored by `typescript.ignoreBuildErrors: true`)

### Dev Server
- Dev server already running on port 3000 (auto-started by system)
- `GET /` → 200 (home page compiles and renders)
- `GET /api/spaced-repetition` → 401 (correct — requires auth)
- `GET /api/spaced-repetition?ids=` → 401 (correct)
- No new errors in `/tmp/dev.log` after the changes

### SM-2 Algorithm Manual Trace
For a fresh card (ease=2.5, interval=1, repetitions=0):
- quality=5 (Easy): repetitions=0→1, interval=1, ease=2.5+0.1-(0)*(0.08+0)=2.6, nextReview=tomorrow ✓
- quality=4 (Good): repetitions=0→1, interval=1, ease=2.5+0.1-(1)*(0.08+0.02)=2.5, nextReview=tomorrow ✓
- quality=3 (Hard): repetitions=0→1, interval=1, ease=2.5+0.1-(2)*(0.08+0.04)=2.36, nextReview=tomorrow ✓
- quality=0 (Again): repetitions=0, interval=1, ease=2.5+0.1-(5)*(0.08+0.10)=2.5-0.8=1.7 (≥1.3 OK), nextReview=tomorrow ✓

For second review (quality=4) on a card with repetitions=1, ease=2.5, interval=1:
- repetitions=1→2, interval=6, ease=2.5, nextReview=today+6 days ✓

For third review (quality=4) on a card with repetitions=2, ease=2.5, interval=6:
- repetitions=2→3, interval=round(6*2.5)=15, ease=2.5, nextReview=today+15 days ✓

Matches the SM-2 spec exactly.

## Files Touched

| File | Action |
|------|--------|
| `src/lib/spaced-repetition-store.ts` | NEW |
| `src/app/api/spaced-repetition/route.ts` | NEW |
| `src/components/quiz/spaced-repetition-view.tsx` | NEW |
| `src/lib/quiz-store.ts` | MODIFIED (added openSpacedRepetition action) |
| `src/lib/types.ts` | MODIFIED (added "spaced-repetition" view + difficulty field) |
| `src/components/quiz/home-view.tsx` | MODIFIED (added "Révision espacée" button) |
| `src/app/page.tsx` | MODIFIED (added spaced-repetition view route) |
| `prisma/schema.prisma` | MODIFIED (added difficulty field) |
| `src/app/api/admin/questions/route.ts` | MODIFIED (POST + PATCH accept difficulty) |
| `src/components/quiz/admin-view.tsx` | MODIFIED (QuestionEditor difficulty selector + per-question badge) |
| `src/components/quiz/start-dialog.tsx` | REWRITTEN (difficulty selector + new onStart signature) |
| `src/components/quiz/bank-detail-view.tsx` | REWRITTEN (difficulty filter bar + filtered preview + passes difficulty to API) |
| `src/components/quiz/exam-detail-view.tsx` | MODIFIED (handleStart signature + difficultyCounts prop) |
| `src/app/api/sessions/route.ts` | MODIFIED (accepts optional difficulty, filters bank/exam questions) |

**3 new files, 11 modified files, 1 DB schema change.**

## Stage Summary

- ✅ Feature 1 — Révision Espacée: full SM-2 implementation in a Zustand+persist store, dedicated API endpoint, flashcard UI with progress bar + 4-stat KPIs, "Révision espacée" button on home with live due-count badge, full view routing
- ✅ Feature 2 — Difficulty: new `difficulty` field on Question model (db:push applied), admin QuestionEditor difficulty selector, both `bank-detail-view` (preview filter) and `start-dialog` (start-time filter) UIs, `/api/sessions` and `/api/admin/questions` accept and validate `difficulty`
- 0 lint errors, 0 lint warnings, 0 type errors in my code
- Backward-compatible: existing questions default to "medium", existing StartDialog consumers that don't pass `difficultyCounts` see no UI change, existing `/api/sessions` calls without `difficulty` behave exactly as before
- The daily-challenge feature (P2) still works — its `questionIds` path is explicitly NOT difficulty-filtered
