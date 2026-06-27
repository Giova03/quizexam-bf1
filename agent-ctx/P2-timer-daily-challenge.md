# Task P2 — Mode Examen Chronométré Strict + Défis Quotidiens

**Agent:** P2 (Z.ai Code)
**Task:** Implement two features in the QuizExam BF platform:
1. Mode Examen Chronométré Strict (countdown timer for exam sessions)
2. Défis Quotidiens (daily challenge with rotating theme + 2× XP)

## Work Log

- Read `/home/z/my-project/worklog.md` to understand prior context (53 banks, 3100 questions, Next.js 16 + Prisma/PostgreSQL stack, 8 already-shipped feature batches).
- Inspected existing code:
  - `src/components/quiz/session-view.tsx` (target file for Feature 1 + daily-challenge XP detection)
  - `src/lib/types.ts` (`QuizSession` type — no `durationMin` field yet)
  - `src/lib/prefs-store.ts` (has `recordSession(correct,total)` + `addXp(amount)` — but neither was called anywhere → XP never updated on completion)
  - `src/lib/quiz-store.ts` (Zustand store, `startSession(id)` switches view)
  - `src/components/quiz/home-view.tsx` (no StudyReminders/DailyChallengeCard yet)
  - `src/components/quiz/study-reminders.tsx` (existing component, was not rendered in home-view)
  - `src/app/api/sessions/route.ts` + `[id]/route.ts` + `[id]/complete/route.ts` + `[id]/answers/[answerId]/route.ts`
  - `prisma/schema.prisma` — `QuizSession` model has no `durationMin` column. Adding a column would require a DB migration; chose the safer "fetch exam details in the GET endpoint" approach to avoid schema changes during a parallel-agent task.
- Verified dev server was running (PID 1115/1117/1129) and inspected `/tmp/dev.log` (Next.js 16.1.3, port 3000).

### Feature 1 — Mode Examen Chronométré Strict ⏱️

1. **`src/lib/types.ts`** — Added optional `durationMin?: number | null` to the `QuizSession` interface (typed but not stored in DB).
2. **`src/app/api/sessions/[id]/route.ts`** — Modified GET handler: for `sourceType === "exam"`, looks up the related `Exam.durationMin` and includes it in the JSON response. For bank sessions, `durationMin` is `null`. (Backward compatible — existing fields unchanged.)
3. **`src/components/quiz/session-view.tsx`** — Major update:
   - Added imports: `useRef`, `Clock` + `Timer` icons, `usePrefs` (for `recordSession` + `addXp`).
   - Added `timeRemaining: number | null` state (null = no timer active).
   - Added `autoSubmitRef` (boolean ref) + `warnedRef` (Set<number> ref) to prevent duplicate auto-submits and duplicate toasts.
   - Added timer-init `useEffect` keyed on `[session?.id, session?.sourceType, session?.durationMin]`: only starts a 1-second `setInterval` when `sourceType === "exam"` AND `durationMin` is truthy. Cleanup clears the interval on session change/unmount.
   - Added warning-toast `useEffect` keyed on `[timeRemaining]`: fires `toast.warning` at 600 s (10 min) and 300 s (5 min), `toast.error` at 60 s (1 min). Uses `warnedRef` to ensure each threshold fires exactly once.
   - Added auto-submit `useEffect` keyed on `[timeRemaining]`: when `timeRemaining === 0` and `autoSubmitRef.current === false`, sets the guard, shows a "Temps écoulé" toast, and calls `completeSession(true)`. Uses a `completeSessionRef` (kept in sync every render) to avoid stale-closure bugs without re-running the effect on every render.
   - Rendered the timer in the top bar (between the Quitter button and the existing mode badge):
     - Amber badge when ≥ 5 min remaining.
     - Rose badge when < 5 min remaining.
     - Pulsing rose badge when < 1 min remaining.
     - Switches icon from `Clock` → `Timer` under 5 min.
     - Uses `tabular-nums` so digits don't jitter as the seconds tick.
     - `aria-label` includes the formatted time for screen readers.
   - `formatTime(totalSeconds)` helper formats as MM:SS (or HH:MM:SS if ≥ 1 h).
   - **Only shown when `session.sourceType === "exam"`** — bank sessions and daily-challenge sessions show no timer (because the GET endpoint returns `durationMin: null` for them).

### Feature 2 — Défis Quotidiens 📅

4. **`src/app/api/sessions/route.ts`** — Extended `CreateSessionBody` with optional `questionIds?: string[]`. When provided, the POST handler loads those questions directly via `db.question.findMany({ where: { id: { in: questionIds } } })` and preserves the caller's order via a `Map` lookup. Existing `sourceType === "bank"` / `"exam"` paths untouched. This lets the daily-challenge card start a session with a curated set of 10 questions drawn from multiple banks (without needing a new "daily" `sourceType` or a schema migration).
5. **`src/app/api/daily-challenge/route.ts`** (NEW, 191 lines) — GET endpoint:
   - Computes today's date in UTC (`YYYY-MM-DD`).
   - Picks the theme for `getUTCDay()`:
     - 0 = Sunday → Mixte (all banks)
     - 1 = Monday → Culture Générale (keywords: culture, actualite, pays, monde, diplomatie, capitale)
     - 2 = Tuesday → Droit (droit, justice, juridique, ohada)
     - 3 = Wednesday → SVT / Sciences (svt, sciences, physique, chimie, medecine, sante, biologie, geologie)
     - 4 = Thursday → Littérature / Histoire (litterature, histoire, francais, philo, archeologie)
     - 5 = Friday → Sciences Éco / Gestion (economie, sciences-eco, gestion, grh, statistique, finance)
     - 6 = Saturday → Psychotechnique (psycho)
   - Loads all banks, filters by case-insensitive title-contains-keyword match. Falls back to all banks if nothing matched.
   - Loads all questions for the candidate banks, performs a **deterministic** Fisher-Yates shuffle seeded by `hashString("daily-" + today)` via a Mulberry32 PRNG. So every user hitting the API on the same UTC day gets the exact same 10 questions → fair daily leaderboard.
   - Returns `{ date, theme, title: "Défi du jour — {theme} ({date})", questionIds: string[10], questions: [...], bankCount, xpMultiplier: 2, message }`.
   - Empty-bank / empty-question cases return 200 with empty arrays + a helpful `message` (the card then renders `null` — no broken UI).
6. **`src/components/quiz/daily-challenge-card.tsx`** (NEW, 191 lines) — Client component:
   - Fetches `/api/daily-challenge` on mount (with `cache: "no-store"` so it always reflects today's challenge).
   - Checks `localStorage` for `"daily-challenge-completed-YYYY-MM-DD"` to display a "Terminé aujourd'hui" badge. (Local date, not UTC, because the user's "today" is what matters for the once-per-day feel.)
   - Renders an amber/orange gradient card with: theme badge, "2× XP" badge, question count, today's title, message, and a prominent "Commencer le défi" button (or "Refaire le défi" if already completed today).
   - On click: POSTs to `/api/sessions` with `{ title, mode: "immediate", sourceType: "bank", sourceId: "daily-challenge", questionIds }`, then calls `startSession(session.id)` from the quiz store.
   - Shows toast on success ("Défi du jour démarré ! Bonne chance 🎯") and on error.
   - Renders `null` while loading (skeleton) or if the API returned no questions — keeps the home page clean.
7. **`src/components/quiz/home-view.tsx`** — Imported `DailyChallengeCard` + the pre-existing `StudyReminders` component and rendered both between the "Quick actions bar" and the "Banks section", matching the task spec ("after the StudyReminders section, before the Banks section"). The `StudyReminders` component already existed in the codebase but wasn't wired into home-view — wired it in here since the spec implies it should already be on the home page.
8. **`src/components/quiz/session-view.tsx`** — Daily-challenge detection + 2× XP awarding in `completeSession`:
   - Added `isDailyChallengeSession(s)` helper that checks `s.sourceId === "daily-challenge"` OR `s.title.startsWith("Défi du jour")` (belt-and-suspenders).
   - When the completed session is a daily challenge:
     1. Computes `correct` and `total` from the API response.
     2. Calls `recordSession(correct, total)` — this is the existing `usePrefs` action that adds `correct × 10` XP (+50 if perfect), updates the streak, increments `sessionsCompleted`, and may unlock badges. This is the first place in the codebase where `recordSession` is actually called, so XP/streak/badges now actually progress for daily-challenge sessions.
     3. Computes the same bonus amount and calls `addXp(bonus)` — net effect: the player receives **2× the normal XP** for the daily challenge.
     4. Sets `localStorage["daily-challenge-completed-YYYY-MM-DD"] = "1"` so the home card flips to the "Terminé aujourd'hui" / "Refaire le défi" state.
     5. Shows a success toast: "🎯 Défi du jour terminé ! +N XP (bonus 2× appliqué)".
   - For non-daily sessions, behavior is unchanged (no XP tracking added — leaves the existing dashboard XP display behavior untouched to avoid breaking other agents' work).
   - For auto-submitted exam sessions (timer hit 0), shows an info toast: "Examen soumis automatiquement (temps écoulé)."
   - Added `if (submitting) return;` guard at the top of `completeSession` so the timer-expiry auto-submit and a manual click can't race into a double-submit.

### Verification

- `cd /home/z/my-project && bun run lint` → 0 errors, 0 warnings.
- `bunx tsc --noEmit` → 0 errors in my code. (One pre-existing error in `next.config.ts` about the deprecated `eslint` key — unrelated to my changes, and `typescript.ignoreBuildErrors: true` in that same file means the build doesn't block on it.)
- Manually tested via curl:
  - `GET /api/daily-challenge` → 200 with 10 questions, theme="Psychotechnique" (Saturday for date 2026-06-27), bankCount=3, xpMultiplier=2, deterministic title "Défi du jour — Psychotechnique (2026-06-27)".
  - `POST /api/sessions` with `questionIds: [...]` → 200, session created with exactly those 3 questions in the requested order. `sourceType: "bank"`, `sourceId: "daily-challenge"`.
  - `POST /api/sessions` with `sourceType: "exam"` for exam `cmqoa9uio02q8l2046e8qgu5y` (durationMin=30) → 200.
  - `GET /api/sessions/{exam-session-id}` → 200, includes `durationMin: 30` (proving the timer will initialize to 30:00 for exam sessions).
  - `GET /api/sessions/{daily-challenge-session-id}` → 200, `durationMin: null` (proving no timer shows for daily challenges).
- Verified home page renders successfully: `GET / 200` (25 KB, 47 ms).
- Verified no errors in `/tmp/dev.log` after my changes.

## Stage Summary

### Feature 1 — Mode Examen Chronométré Strict ✅
- Countdown timer displayed in the session header for exam sessions only (MM:SS, or HH:MM:SS if ≥ 1 h).
- Color states: amber (≥ 5 min) → rose (< 5 min) → pulsing rose (< 1 min).
- Toast warnings at 10 min, 5 min, 1 min remaining (warning vs error severity).
- Auto-submit on time expiry via `completeSession(true)`, with a ref-guard against double-submit.
- `durationMin` sourced from the related `Exam` row in the GET /api/sessions/[id] handler — no DB schema change required.
- Timer state + warnings reset when a new session loads.

### Feature 2 — Défis Quotidiens ✅
- New API `/api/daily-challenge` returns today's 10 questions, theme rotating by UTC day-of-week, fully deterministic per date (Mulberry32 PRNG seeded by FNV-1a hash of `"daily-YYYY-MM-DD"`).
- New `<DailyChallengeCard />` component on the home page (after StudyReminders, before Banks) — fetches the challenge, displays theme + 2× XP badge + "Commencer le défi" button, checks localStorage for the "completed today" state.
- `/api/sessions` POST extended to accept an optional `questionIds: string[]` — used by the daily challenge to start a session with the curated 10 questions (sentinel `sourceId: "daily-challenge"`).
- `completeSession` in session-view detects daily-challenge sessions (by `sourceId` or title prefix) and:
  - Awards 2× XP via `recordSession` (1×) + `addXp` (1× matching bonus) — this is the first wired-up XP path in the codebase.
  - Sets the `daily-challenge-completed-YYYY-MM-DD` localStorage flag.
  - Shows a celebratory toast.

### Files Modified
- `src/lib/types.ts` (+8 lines: `durationMin?: number | null` on `QuizSession`)
- `src/app/api/sessions/route.ts` (+14 lines: optional `questionIds` branch in POST)
- `src/app/api/sessions/[id]/route.ts` (rewrote GET to add `durationMin` lookup)
- `src/components/quiz/home-view.tsx` (+6 lines: imports + 2 component renders)
- `src/components/quiz/session-view.tsx` (~+190 lines: timer state, 3 effects, JSX badge, daily-challenge XP logic)

### Files Created
- `src/app/api/daily-challenge/route.ts` (191 lines)
- `src/components/quiz/daily-challenge-card.tsx` (191 lines)

### Compatibility Notes
- No Prisma schema changes → no migration needed → safe with parallel subagents.
- All existing API contracts preserved (the `questionIds` field is optional; `durationMin` is additive).
- No existing UI behavior changed for non-exam / non-daily-challenge sessions.
- The pre-existing `study-reminders.tsx` component is now rendered on the home page (was previously orphaned) — this matches the task spec's expectation that the StudyReminders section exists on the home page.
