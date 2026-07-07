# Task E6 — Pedagogy + Technique + Accessibility (10 features)

**Agent:** E6 (Z.ai Code)
**Date:** 2025
**Scope:** Implement 10 features across 3 categories (Pedagogy 4, Technique 4, Accessibility 2) without modifying the Prisma schema.

---

## Summary

All 10 features complete and integrated. 0 lint errors. 0 TS errors in src/ (only the pre-existing `next.config.ts:7` `eslint` field error remains, reported by every prior agent).

| # | Feature | Files created | Files modified |
|---|---------|---------------|----------------|
| 1 | Mode examen blanc officiel | `src/components/quiz/official-exam-view.tsx` | `types.ts`, `quiz-store.ts`, `page.tsx` |
| 2 | Fiches de révision auto-générées | `src/app/api/study-sheet/route.ts`, `src/components/quiz/study-sheet-view.tsx` | `types.ts`, `quiz-store.ts`, `page.tsx` |
| 3 | Parcours guidé 30 jours | `src/components/quiz/guided-path.tsx` | `types.ts`, `quiz-store.ts`, `page.tsx` |
| 4 | Statistiques par concept | `src/components/quiz/concept-stats.tsx` | `dashboard-view.tsx` |
| 5 | Code splitting complet | — | `src/app/page.tsx` |
| 6 | Error monitoring (Sentry-like) | `src/lib/error-tracking.ts` | `admin-view.tsx`, `page.tsx` |
| 7 | API rate limiting | `src/lib/api-rate-limit.ts` | `api/sessions/route.ts`, `api/chat/route.ts`, `api/search/route.ts` |
| 8 | Bundle analyzer | `scripts/analyze-bundle.ts` | — |
| 9 | Lecteur d'écran complet | `src/lib/screen-reader.ts`, `src/components/quiz/sr-announcer.tsx` | `page.tsx` |
| 10 | Mode daltonisme | — | `globals.css`, `prefs-store.ts`, `preferences-applier.tsx`, `accessibility-panel.tsx` |

**Total:** 10 new files created, 10 existing files modified.

---

## PEDAGOGY (4 features)

### 1. Mode examen blanc officiel — `src/components/quiz/official-exam-view.tsx`

- 4 exam types: **BEPC** (60 min), **BAC** (120 min), **Concours Admin** (90 min), **Concours Santé** (120 min).
- For each type, the view fetches all banks matching the exam's `educationLevel` (BEPC / BAC / CONCOURS), prefers banks whose title contains a keyword (`admin`, `sante`, `medecine`, etc.), then fetches each bank's questions until 50 are gathered.
- The 50 questions are shuffled and passed as `questionIds` to `POST /api/sessions` with `mode: "final"` (the existing session API) — `sourceType: "bank"`, `sourceId: <first bank's id>`.
- **Strict timer** (1-second tick) shown in the header — turns red and pulses when < 5 min remain. Auto-submits when the timer reaches 0 (guarded by a `submittedRef` so it never fires twice).
- **No feedback during the exam** (mode "final" — the answer PATCH endpoint updates the DB but the view deliberately does NOT read the response).
- Question grid (50 numbered buttons) lets the user jump to any question; answered questions turn green.
- **Detailed correction at the end**: after `POST /api/sessions/[id]/complete`, the view renders every question with the correct answer highlighted, the user's wrong choice crossed out, and the explanation.

### 2. Fiches de révision auto-générées

- **API**: `GET /api/study-sheet?bankId=X` (auth required).
  - Loads the user's wrong answers (`isCorrect: false`) for sessions on the given bank.
  - Enriches each answer with the original Question's `chapter` / `subject` (so the sheet can group by chapter).
  - Tries the LLM (`z-ai-web-dev-sdk`) with a strict-JSON prompt to produce `{ chapters: [{ title, keyPoints, commonMistakes }] }`.
  - Fallback: deterministic sheet built from the wrong-answer explanations, grouped by chapter.
  - Returns `{ bankId, bankTitle, chapters, source: "ai" | "fallback", generatedAt }`.
- **View**: `src/components/quiz/study-sheet-view.tsx`.
  - Bank selector (dropdown of all banks).
  - Renders the sheet as a list of chapter cards (key points + common mistakes side-by-side).
  - **Print button** + **Download as PDF** button — both call `window.print()`. The `.no-print` CSS class hides non-essential UI when printing.
  - Refresh button to regenerate the sheet after new quizzes.
  - Empty state when the user has no wrong answers yet.

### 3. Parcours guidé 30 jours — `src/components/quiz/guided-path.tsx`

- 30-day structured program split into 3 phases:
  - **Days 1-10 — Foundations** (easy questions).
  - **Days 11-20 — Intermediate** (medium questions).
  - **Days 21-30 — Exam practice** (hard + timed — tasks include "respect the time limit (≤ 1 min/question)").
- Each day has 3-5 concrete tasks (e.g. "Faire 1 quiz en difficulté Facile", "Atteindre au moins 60% de réussite", "Faire le défi quotidien" every 5 days).
- **Progress tracking in localStorage** via a zustand+persist store (`useGuidedPathStore` — avoids the `set-state-in-effect` lint rule). Only the per-task checkbox map is stored; `completedDays` is derived with `useMemo`.
- Hero card shows the overall progress bar, completed-day count, total XP earned, and the current day.
- Each phase is rendered as a section with its days; the current day is highlighted with a violet ring, completed days with an emerald border.
- Reset button (with confirmation) clears all progress.

### 4. Statistiques par concept — `src/components/quiz/concept-stats.tsx`

- Added to the dashboard's "overview" tab (after `AdvancedCharts`).
- Loads the user's sessions + all banks, then aggregates per-category mastery:
  - Maps each bank's `category` to the user's correct/total counts on that bank.
  - Categories with banks but no sessions get mastery = 0%.
- **Heatmap**: grid of category cells coloured by mastery (red < 40%, amber 40-70%, green ≥ 70%). Each cell shows the category name, mastery %, and correct/total counts.
- **Radar chart** (recharts): one axis per category, value = mastery %.
- **Concepts to work on**: list of categories with mastery < 50% AND ≥ 3 attempts — clickable buttons that open the bank-list view.

---

## TECHNIQUE (4 features)

### 5. Code splitting complet — `src/app/page.tsx`

- ALL views are now wrapped in `React.lazy()` (previously only secondary views were lazy; the main user-flow views — Home, BankDetail, ExamDetail, Session, Results, Dashboard, Social — were eagerly imported).
- Each lazy import resolves the named export via `.then((m) => ({ default: m.X }))`.
- Single `<Suspense fallback={<ViewSkeleton />}>` wraps all view rendering.
- **Shimmer skeleton fallback** (`ViewSkeleton`): a small composite of a shimmer bar + two skeleton cards (more polished than the previous single grey box).
- The three new E6 views (OfficialExamView, StudySheetView, GuidedPath) are also lazy-loaded.

### 6. Error monitoring (Sentry-like) — `src/lib/error-tracking.ts`

- `captureError(error, context?, severity?)` — logs to console + persists to localStorage (`qebf-tracked-errors`, LRU 100 entries).
- Each tracked error stores: id, timestamp, name, message, stack (truncated 2 KB), URL, context, severity.
- Helpers: `getStoredErrors()`, `getErrorCount()`, `getRecentErrorCount(minutes)`, `clearStoredErrors()`.
- `installGlobalErrorTracker()` — registers `window.onerror` + `unhandledrejection` listeners (idempotent). Installed once on app mount in `page.tsx`.
- **Admin badge**: the admin view's title shows a rose "X erreur(s)" badge when `getRecentErrorCount(60) > 0`. Clicking it opens a new "Erreurs" tab (added to the TABS array) that lists every stored error with severity, timestamp, URL, context, and stack trace. Includes a "Vider le journal" button.
- Designed to be wired up to Sentry later: replace the `captureError` body with `Sentry.captureException(error, { extra: context, level: severity })`.

### 7. API rate limiting — `src/lib/api-rate-limit.ts`

- `applyUserRateLimit(request, options?)` — **100 requests per minute per authenticated user**.
- Bucket key: `user:<userId>` for authenticated requests, `ip:<ip>` for anonymous (reuses the existing in-memory `rate-limit.ts` module so all throttling lives in one place).
- Returns a pre-built 429 response (JSON `{ error, code: "RATE_LIMITED", retryAfter }` + `Retry-After` / `X-RateLimit-*` headers) when the limit is exceeded.
- **Applied to**:
  - `GET` + `POST /api/sessions` (added at the top of each handler).
  - `POST /api/chat` (added at the top of the handler).
  - `GET /api/search` (renamed the local `limit` variable to `takeLimit` to avoid colliding with the rate-limit result).

### 8. Bundle analyzer — `scripts/analyze-bundle.ts`

- Run with `bun run scripts/analyze-bundle.ts`.
- Walks `.next/static/{chunks,css,media,webpack}` and gathers file sizes.
- Prints a table of the top 20 largest chunks (size + name).
- Suggests optimizations:
  - React.lazy / next/dynamic for chunks > 500 KB.
  - PurgeCSS for CSS totals > 200 KB.
  - Warns when > 3 chunks exceed 200 KB (likely recharts / framer-motion / z-ai-web-dev-sdk).
- Writes a JSON summary to `.next/bundle-analysis.json`.
- If `.next/static` is missing, emits a friendly message telling the user to run `next build --debug` first (since the sandbox rules forbid running `bun run build`).

---

## ACCESSIBILITÉ (2 features)

### 9. Lecteur d'écran complet

- **`src/lib/screen-reader.ts`**:
  - `announce(message, level?)` — generic announcement (polite by default, assertive for errors).
  - `announcePageChange(viewName)` — looks up a human-readable label for the view (`VIEW_LABELS` map covers all 30+ views, including the 3 new E6 views) and announces "Navigation vers : <label>."
  - `announceScore(correct, total)` — announced with `assertive` level after a quiz completes ("Quiz terminé. Score : 7 sur 10, soit 70 pour cent. Examen réussi.").
  - `announceError(message)` — `assertive` announcement of an error message.
  - Tiny in-memory event emitter (no React state) so the helpers can be called from anywhere.
- **`src/components/quiz/sr-announcer.tsx`**:
  - Two invisible `<div>`s with `aria-live="polite"` and `aria-live="assertive"`.
  - Subscribes to the emitter; updates the matching div's text content (with a 50 ms clear-then-set dance so duplicate messages still trigger an announcement).
  - Auto-clears after 1.5 s.
  - Mounted once at the app root in `page.tsx`.
- `page.tsx` calls `announcePageChange(view)` in a `useEffect([view])` so every navigation is announced.

### 10. Mode daltonisme

- **`src/app/globals.css`** — added 3 colour-blind palettes:
  ```css
  .cb-deuteranopia .correct, .cb-protanopia .correct { color: #1a73e8; background: #e8f0fe; }
  .cb-deuteranopia .wrong,   .cb-protanopia .wrong   { color: #d93025; background: #fce8e6; }
  .cb-tritanopia .correct { color: #0f766e; background: #ccfbf1; }
  .cb-tritanopia .wrong   { color: #7c3aed; background: #ede9fe; }
  ```
  Plus a 4 px left border on `.correct`/`.wrong` so colour isn't the only signal.
- **`src/lib/prefs-store.ts`** — added `colorBlindMode: "none" | "deuteranopia" | "protanopia" | "tritanopia"` + `setColorBlindMode`.
- **`src/components/quiz/preferences-applier.tsx`** — toggles the `cb-<mode>` class on `<html>`.
- **`src/components/quiz/accessibility-panel.tsx`** — new "Mode daltonisme" card with a `<Select>` for the 4 options + a live preview ("Exemple correct" / "Exemple faux" swatches that reflect the current palette).
- The reset button now also clears the colour-blind mode.
- **`@media print`** rules added to `globals.css` so the study-sheet print button (`Feature 2`) produces a clean PDF (header/footer/non-essential UI hidden).

---

## Integration

### `src/lib/types.ts`
- Added `"official-exam" | "study-sheet" | "guided-path"` to the `ViewName` union.

### `src/lib/quiz-store.ts`
- Added 3 actions: `openOfficialExam()`, `openStudySheet()`, `openGuidedPath()` (each just `set({ view: … })`).

### `src/app/page.tsx`
- Imported 3 new icons (`FileText`, `CalendarCheck` — `GraduationCap` was already imported).
- Lazy-loaded 3 new views (`OfficialExamView`, `StudySheetView`, `GuidedPath`).
- Destructured the 3 new `open*` actions from `useQuizStore`.
- Added 3 entries to BOTH desktop + mobile "Plus" dropdown menus:
  - Examen blanc officiel (violet, `GraduationCap`)
  - Fiches de révision (emerald, `FileText`)
  - Parcours 30 jours (amber, `CalendarCheck`)
- Added the 3 new views to the active-state check on the "Plus" dropdown trigger (desktop + mobile).
- Rendered the 3 new views inside the `<Suspense>` block after the E5 social views.
- Installed `installGlobalErrorTracker()` on mount.
- Mounted `<SrAnnouncer />` once at the app root.
- Calls `announcePageChange(view)` on every view change.

---

## LINT / TS

- `bun run lint` → **EXIT 0**, 0 errors, 0 warnings.
- `npx tsc --noEmit` → 1 pre-existing error in `next.config.ts:7` (`eslint` field not in `NextConfig` type — present before E6 and reported by every prior agent). 0 errors in `src/`.

---

## Files

### Created (10)
1. `src/components/quiz/official-exam-view.tsx` (~770 lines)
2. `src/app/api/study-sheet/route.ts` (~270 lines)
3. `src/components/quiz/study-sheet-view.tsx` (~270 lines)
4. `src/components/quiz/guided-path.tsx` (~440 lines)
5. `src/components/quiz/concept-stats.tsx` (~230 lines)
6. `src/lib/error-tracking.ts` (~190 lines)
7. `src/lib/api-rate-limit.ts` (~95 lines)
8. `scripts/analyze-bundle.ts` (~165 lines)
9. `src/lib/screen-reader.ts` (~110 lines)
10. `src/components/quiz/sr-announcer.tsx` (~65 lines)

### Modified (10)
1. `src/lib/types.ts` — 3 new ViewName entries.
2. `src/lib/quiz-store.ts` — 3 new actions.
3. `src/app/page.tsx` — code splitting, 3 new lazy views, 3 new dropdown entries, error tracker + SrAnnouncer wiring, view-change announcements.
4. `src/components/quiz/dashboard-view.tsx` — added `<ConceptStats />` to the overview tab.
5. `src/components/quiz/admin-view.tsx` — error badge + new "Erreurs" tab.
6. `src/app/api/sessions/route.ts` — `applyUserRateLimit` in GET + POST.
7. `src/app/api/chat/route.ts` — `applyUserRateLimit` in POST.
8. `src/app/api/search/route.ts` — `applyUserRateLimit` in GET (renamed local `limit` → `takeLimit`).
9. `src/app/globals.css` — colour-blind palettes + print styles.
10. `src/lib/prefs-store.ts` — `colorBlindMode` + `setColorBlindMode`.
11. `src/components/quiz/preferences-applier.tsx` — apply `cb-<mode>` class.
12. `src/components/quiz/accessibility-panel.tsx` — colour-blind mode selector + live preview.

(Note: 12 files modified because `prefs-store.ts` + `preferences-applier.tsx` + `accessibility-panel.tsx` were all needed for the colour-blind feature.)

---

## Notes / Design decisions

- **No Prisma schema change** — all 10 features reuse existing models (`QuizSession`, `SessionAnswer`, `QuestionBank`, `Question`, `User`) or localStorage (`qebf-guided-path`, `qebf-tracked-errors`).
- The official-exam view reuses the existing `POST /api/sessions` API with `mode: "final"` and a curated `questionIds` array — no new endpoint needed.
- The study-sheet API falls back gracefully when the LLM is unavailable (deterministic sheet built from wrong-answer explanations grouped by chapter).
- The guided-path component uses a zustand+persist store instead of `useState`+`useEffect` to avoid the `react-hooks/set-state-in-effect` lint rule (the codebase already uses this pattern in `seasons.ts`, `spaced-repetition-store.ts`, etc.).
- The rate limiter reuses the existing in-memory `rate-limit.ts` module so all throttling (public + per-user) lives in a single store — no new global state.
- The error tracker is intentionally client-side only (localStorage). It's structured so swapping the `captureError` body for `Sentry.captureException` is a one-line change.
- The colour-blind palettes use blue (correct) + red (wrong) for deuteranopia/protanopia (both hues visible), and teal + purple for tritanopia. A 4 px left border ensures the signal isn't colour-only.
