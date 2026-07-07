# E2 — Adaptive AI Features

**Task ID**: E2
**Agent**: E2 Adaptive AI Subagent (Z.ai Code)
**Date**: 2025

## Task

Implement 6 adaptive AI features:
1. IA Adaptative — auto-adjustable difficulty quiz
2. Chatbot contextuel amélioré
3. Analyse de faiblesses par concept
4. Parcours personnalisé généré par IA
5. Recommandation de révision
6. Prédiction de réussite

## Work Log

### 1. IA Adaptative — `/api/adaptive-quiz` (POST)
- **File**: `src/app/api/adaptive-quiz/route.ts` (~290 lines, new)
- **Body**: `{ bankId: string, userId?: string, mode?: "immediate" | "final" }`
- **Behaviour**:
  - Resolves the current user from the NextAuth session (falls back to `body.userId` if the caller is server-side).
  - Fetches the user's last 20 completed sessions on this specific bank (matched via `sourceType = "bank"` AND `sourceId = bankId`).
  - Computes the average score % across those sessions.
  - **Difficulty rules**:
    - No history → "medium" (first attempt, evaluate level)
    - Score < 40% → "easy"
    - Score 40-70% → "medium"
    - Score > 70% → "hard"
  - Buckets the bank's questions by `difficulty` field, shuffles the target bucket, and backfills from adjacent tiers if the bucket has fewer than 10 questions.
  - Creates a brand-new `QuizSession` (consistent with `/api/sessions` POST) with snapshots of the 10 picked questions.
  - Returns `{ sessionId, difficulty, mode, score, totalQuestions, questions, bank, analysis, reason }` — the `reason` field is a human-readable explanation ("Votre score moyen sur X est de Y% — …").
- **Client usage**: triggered from `<AIRecommendations />` when the user clicks "Commencer la révision" on a weak-area card. Calls `startSession(sessionId, difficulty)`.

### 2. Chatbot contextuel amélioré — `/api/chat` (POST, modified)
- **File**: `src/app/api/chat/route.ts` (~445 lines, was ~125)
- **Enhancements**:
  - Resolves the authenticated user via `getServerSession`. For signed-in users, fetches the last 10 completed sessions with their answers and builds a compact `[Contexte utilisateur]` block (sessions count, average score, 7-day activity, top 3 weak banks with their wrong rates). For anonymous visitors, falls back to a banks-count summary (preserved from the previous behaviour).
  - The system prompt now explicitly instructs the AI to use the personalized context to give tailored advice.
  - Fixed the `ChatMessage` role typing so `messages: conversation` is assignable to `ChatMessage[]` (typed the `conversation` array as `Array<{ role: "system" | "user" | "assistant"; content: string }>` instead of inferring `string`).
  - The `getFallbackResponse` function now takes an optional context object `{ avgPct, total, weakBanks, recentCount }` and produces personalized fallbacks for:
    - "quelles sont mes faiblesses ?" / "faible" / "mes erreurs" → lists weak banks with their wrong rates.
    - "comment va mon progression ?" / "progression" / "évolution" → reports total sessions, avg score, 7-day activity, and encourages regularity.
    - "que dois-je réviser ?" / "réviser" / "révision" → prioritizes weak banks in the recommendation list.
    - "explique moi [concept]" / "c'est quoi" / "qu'est-ce que" → scripted answers for AES, FESPACO, droit constitutionnel; otherwise points to the AI Tutor.
    - "donne moi un conseil" / "astuce" / "recommandation" → personalized advice based on the average score band (< 40, < 70, ≥ 70).
  - All existing scripted answers (president, AES, FESPACO, regions, concours, mode, banques, conseil, merci) are preserved.

### 3. Analyse de faiblesses par concept — `/api/ai-tutor` (modified)
- **File**: `src/app/api/ai-tutor/route.ts` (~400 lines, was ~240)
- **New analyze mode**: `POST { mode: "analyze" }` (and convenience `GET /api/ai-tutor`) returns a structured payload `{ weakAreas, strongAreas, recommendations, summary, tier }` without calling the LLM — it's pure arithmetic on the user's session history.
  - Aggregates per-bank success/wrong/skipped counts from the last 50 completed sessions.
  - A "weak area" = bank with wrong rate ≥ 30% on ≥ 5 answered questions.
  - A "strong area" = bank with success rate ≥ 70% on ≥ 5 answered questions.
  - Recommendations are generated from the top weak + strong areas:
    1. Worst weak area → "Vous ratez X% des questions en « Y » — révisez ce module en priorité"
    2. Second weak area → "Travaillez aussi « Y » (X% d'erreur)"
    3. Top strong area → "Vos meilleures performances sont en « Y » — essayez des questions plus difficiles"
    4. Daily challenge reminder.
    5. Spaced-repetition reminder for the worst weak area.
  - The `summary` field is a human-readable 1-2 sentence overview.
- **Backward compatibility**: the existing chat mode (default, Premium-gated) is preserved exactly. The `analyze` mode is triggered when `body.mode === "analyze"` AND no `question` is supplied (or `question === "analyze"`). The `GET` method is a convenience wrapper that always runs the analyze path. **Crucially, the analyze mode is available to ALL users (no Premium gate) because it doesn't call the LLM**.

### 4. Parcours personnalisé généré par IA — `/api/study-plan` (POST, new) + `study-plan-view.tsx`
- **API file**: `src/app/api/study-plan/route.ts` (~330 lines, new)
- **Body**: `{ targetExam?: string, daysUntil?: number (1-60), currentLevel?: "BEPC"|"BAC"|"LICENCE"|"CONCOURS"|"TOUS" }`
- **Behaviour**:
  - Fetches the user's last 30 completed sessions + bank list.
  - Derives weak banks (wrong rate ≥ 30%), strong banks (success rate ≥ 70%), average score, and total session count.
  - Builds a French prompt asking the LLM for a JSON array of `{ day, focus, banks, duration, exercises }` objects, mentioning the user's actual weak/strong banks by name.
  - Resilient JSON parsing: tries direct parse, first `{...}` block, first `[...]` block. Each entry is validated + normalized via `sanitize()`.
  - **Graceful degradation**: if the LLM call fails (SDK unavailable, timeout, malformed JSON), `buildFallbackPlan()` generates a deterministic plan from the user's weak banks first, then strong banks, then unexplored banks, with a "défi + révision espacée" day every 5th day. The `source` field in the response tells the client whether the plan came from the AI or the fallback.
  - If the LLM returns fewer days than requested, the fallback pads the remaining days. If it returns more, the response is truncated. Days are renumbered 1..N before returning.
  - Returns `{ plan, summary, generatedAt, source }`.
- **Component file**: `src/components/quiz/study-plan-view.tsx` (~430 lines, new)
  - Full-page view registered in `quiz-store.ts` (`openStudyPlan`) and lazy-loaded in `page.tsx`.
  - **Generator form**: target exam (select), days until exam (number, 1-60), current level (select). Clicking "Générer mon plan" POSTs to `/api/study-plan`.
  - **Visual timeline**: a horizontally-scrollable row of pill buttons for each day (J1, J2, …). Clicking a pill toggles its done state. Done days show a green check-circle.
  - **Day-by-day breakdown**: each day is a Card with:
    - A clickable day-number circle (toggle done state, green when done).
    - The focus text + duration badge + bank badges (clickable → opens the bank via `openBank(bankId)`).
    - A list of exercises in a muted box.
  - **Progress tracking**: persisted to `localStorage` under `study-plan:v1` (the plan itself) and `study-plan:completed-days:v1` (the set of completed day numbers). Resets when a new plan is generated.
  - **Empty state**: when no plan exists, shows a hero card explaining the feature with a "Générer mon plan" CTA.
  - **Header actions**: "Effacer le plan" (clears localStorage) and "Régénérer" (calls the API again).

### 5. Recommandation de révision — `ai-recommendations.tsx`
- **File**: `src/components/quiz/ai-recommendations.tsx` (~330 lines, new)
- **Mounted on**: the dashboard overview tab (after `<EventsWidget />`) and on the empty-state dashboard (so users see at least the daily-challenge recommendation from day 1).
- **Behaviour**:
  - Fetches `GET /api/ai-tutor` (analyze mode) on mount.
  - Builds up to 3 recommendation cards:
    1. **Weak areas** (top 2): "Réviser « X »" with a red badge "60% d'erreur" and a "Commencer la révision" button → triggers `POST /api/adaptive-quiz` for that bank, then `startSession(sessionId, difficulty)`. The toast shows the picked difficulty ("Quiz adaptatif démarré — niveau medium 🎯").
    2. **Strong areas** (top 1): "Continuer « Y »" with a green badge "80% de réussite" and a "Continuer" button → opens the bank detail view via `openBank(bankId)` so the user can pick a harder difficulty manually.
    3. **Daily challenge** (always present when there's history): "Défi du jour" with an amber "2× XP" badge and a "Relever le défi" button → fetches `/api/daily-challenge`, creates a session via `/api/sessions` POST with the curated question IDs, and calls `startSession(sessionId)`.
  - Card header has a refresh button to re-run the analysis.
  - Card footer shows the human-readable `summary` from the API as a clickable link to the dashboard.
  - **Graceful degradation**: if the API call fails, the card is hidden (returns `null`) so the dashboard isn't blocked.
  - Lazily loads the banks list (via `useQuizStore`) so it can resolve bank titles to IDs for the "Commencer" actions.

### 6. Prédiction de réussite — `/api/predict-success` (GET, new) + `predict-success-card.tsx`
- **API file**: `src/app/api/predict-success/route.ts` (~310 lines, new)
- **Behaviour**:
  - Fetches the user's last 100 completed sessions + the bank catalogue.
  - Computes the baseline probability as the user's overall average score.
  - Applies signed factor adjustments:
    - **Trend** (last 7d vs previous 7d): ±15 pts max (only when ≥ 4 sessions).
    - **Streak** (active days in last 14d): +15 if ≥ 7 days; -10 if ≤ 2 days.
    - **Polyvalence** (distinct banks): +10 if ≥ 5 banks; -5 if < 3 banks.
    - **Weak areas**: -5 per weak area (capped at -25).
    - **Strong areas**: +3 per strong area (capped at +10).
    - **Volume**: +5 if ≥ 20 sessions; -3 if < 5 sessions.
  - Clamps the final probability to [5, 95].
  - Computes a **confidence** score (0-95) based on session count: 0 if no sessions, 25-45 if < 5, 50-80 if < 15, 80-95 if ≥ 15.
  - Returns `{ probability, confidence, factors: [{factor, impact}], analysis, stats }` where `analysis` is a human-readable summary mentioning the trend, average score, and top weak banks.
- **Component file**: `src/components/quiz/predict-success-card.tsx` (~270 lines, new)
  - Mounted on the dashboard overview tab (after `<AIRecommendations />`).
  - Shows:
    - A big colored circle with the probability % (green ≥ 70, amber 40-70, red < 40).
    - The confidence badge (low/medium/high) + total sessions count.
    - The human-readable analysis paragraph.
    - A confidence progress bar.
    - The list of factors with signed impact badges (green +, red -, grey 0).
    - A 3-column stats grid (avg score, banks explored, 7-day trend).
  - Refresh button in the header to re-fetch the prediction.
  - Graceful degradation: hidden if the API fails.

## Integration

### `src/lib/types.ts`
- Added `"study-plan"` to the `ViewName` union type.

### `src/lib/quiz-store.ts`
- Added `openStudyPlan: () => void` to the `QuizState` interface.
- Implemented `openStudyPlan: () => set({ view: "study-plan" })` in the store.

### `src/app/page.tsx`
- Lazy-imported `StudyPlanView` (alongside `BlogView`).
- Destructured `openStudyPlan` from `useQuizStore`.
- Added a "Parcours IA" entry to both the desktop and mobile "Plus" dropdown menus (with a violet accent + `Sparkles` icon, between "Blog" and "Compétition").
- Added `view === "study-plan"` to the dropdown-active checks.
- Rendered `<StudyPlanView />` inside the lazy `<Suspense>` block.

### `src/components/quiz/dashboard-view.tsx`
- Imported `<AIRecommendations />` and `<PredictSuccess />`.
- Added both components to the overview tab, between `<EventsWidget />` and the weekly chart.
- Also added `<AIRecommendations />` to the empty-state branch (so users with 0 sessions still see the daily-challenge recommendation).

## Verification

- `bun run lint` → **EXIT 0, 0 errors, 0 warnings** (verified twice).
- `npx tsc --noEmit` → 0 errors in `src/` (the only remaining error is pre-existing in `next.config.ts:7` — `eslint` field not in `NextConfig` type, unrelated to this task and present before E2).

## Files Created (5)
1. `src/app/api/adaptive-quiz/route.ts` (~290 lines)
2. `src/app/api/study-plan/route.ts` (~330 lines)
3. `src/app/api/predict-success/route.ts` (~310 lines)
4. `src/components/quiz/ai-recommendations.tsx` (~330 lines)
5. `src/components/quiz/study-plan-view.tsx` (~430 lines)
6. `src/components/quiz/predict-success-card.tsx` (~270 lines)

## Files Modified (5)
1. `src/app/api/chat/route.ts` — added personalized context + new fallback responses + ChatMessage typing fix.
2. `src/app/api/ai-tutor/route.ts` — added analyze mode (POST + GET) with structured weak/strong-areas payload.
3. `src/lib/types.ts` — added `"study-plan"` to ViewName.
4. `src/lib/quiz-store.ts` — added `openStudyPlan` action.
5. `src/app/page.tsx` — lazy-loaded StudyPlanView, added nav entry, added view to dropdown active-state checks.
6. `src/components/quiz/dashboard-view.tsx` — integrated AIRecommendations + PredictSuccess.

## Key Technical Decisions

- **Adaptive quiz creates a real session** (not just a question list): this keeps the adaptive path consistent with the rest of the platform — the client can call `startSession(sessionId, difficulty)` directly, the session shows up in the user's history, and the existing answer/complete endpoints work unchanged.
- **Analyze mode is free for all users** (no Premium gate): because the analyze path is pure arithmetic on the user's session history (no LLM call), it's available to free users. The chat mode stays Premium-gated as before. This lets every user see their weak areas + recommendations on the dashboard.
- **Study plan graceful degradation**: when the LLM fails, `buildFallbackPlan()` generates a deterministic plan from the user's weak banks first (every 5th day is a "défi + révision espacée" day). The `source: "ai" | "fallback"` field lets the UI tell the user which path was used (badge in the plan header).
- **Predict-success factors are signed and capped**: each factor has a signed impact (positive helps, negative hurts) and is capped to a reasonable range so no single factor dominates. The final probability is clamped to [5, 95] to avoid false certainty.
- **localStorage persistence for the study plan**: the plan + completed-days set are stored in localStorage so the user keeps them between sessions. The keys are namespaced with a version suffix (`study-plan:v1`, `study-plan:completed-days:v1`) so future schema changes can invalidate cleanly.
- **AIRecommendations always shows the daily challenge card**: even when the user has no history, the daily challenge recommendation is present (it's the one recommendation that doesn't require any user data). This gives new users a clear first action.
- **Bank-title → bank-id resolution in AIRecommendations**: the recommendations API returns bank titles (because that's what's stored on QuizSession.title), but the "Commencer" action needs a bank id. The component lazily loads the banks list (via `useQuizStore`) and builds a lowercase-title → id map for the lookup.

## No Existing Code Broken

- All previously-wired integrations are preserved:
  - `/api/chat` still returns `{ response, role }` with the same shape — only the system prompt + fallback function were enriched.
  - `/api/ai-tutor` POST chat mode is unchanged (same auth, same Premium gate, same response shape `{ answer, recommendations, weakAreas, tier }`). Only added a new branch for `mode: "analyze"` + a new `GET` handler.
  - Dashboard existing tabs (overview, per-quiz, history, favorites, ai-tutor) and components (WeeklyChart, AdvancedCharts, ReferralCard, EventsWidget, AITutorPanel) are untouched.
  - All existing API routes are unchanged.
  - No schema change required (the new features use existing tables: `QuizSession`, `SessionAnswer`, `QuestionBank`, `Question`).
