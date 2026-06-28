# F2 — Lazy Loading + Memory Cache + Error Boundary + Tests

**Task ID:** F2
**Agent:** F2 (Z.ai Code)
**Task:** 4 improvements — (1) Lazy-load secondary views, (2) In-memory cache for banks/exams APIs, (3) Error boundary + global-error.tsx, (4) Basic automated tests (cache, SM-2 algorithm, favorites store)

## Work Log

- Read `worklog.md` through F1 (1258 lines) to understand the project state, then read the 4 files that needed modification: `page.tsx`, `api/banks/route.ts`, `api/exams/route.ts`, plus the supporting `admin/banks/route.ts`, `admin/exams/route.ts`, `admin/questions/route.ts`, `favorites-store.ts`, `spaced-repetition-store.ts`. Confirmed the 1 pre-existing TS error in `next.config.ts(7,3)` (documented by every prior agent F1/P5/P7/P8/P9 — out of scope).

### Feature 1 — Lazy Loading ⚡

- Modified `/home/z/my-project/src/app/page.tsx`:
  - Added `lazy`, `Suspense` to the React import line.
  - Removed direct (eager) imports of `AboutView`, `AdminView`, `LeaderboardView`, `SpacedRepetitionView`, `AchievementsView`, `ForumView`, `ProfileView`, `CompetitionView` (8 views).
  - Added 8 `lazy(() => import(...).then(m => ({ default: m.XXX })))` declarations (named-export → default-export adapter pattern).
  - Added a `ViewSkeleton` helper component that renders `<Skeleton className="h-64 w-full rounded-xl" />` (uses the existing `@/components/ui/skeleton`).
  - In `<main>`, kept the 7 eager views (`HomeView`, `BankDetailView`, `ExamDetailView`, `SessionView`, `ResultsView`, `DashboardView`, `SocialView`) as direct `{view === "..." && <X />}` renders — main user flow stays eager.
  - Wrapped the 8 lazy views in a single `<Suspense fallback={<ViewSkeleton />}>` block.
  - Wrapped ALL view renders (eager + lazy) in `<ErrorBoundary>` so any render-time error in any view is caught.
  - Re-ordered the `Tooltip` + `lucide-react` import blocks ABOVE the lazy declarations (imports must be at the top of the module — initial draft had them after the function declarations by mistake, which would have caused a syntax error).

- Verified via `curl` that the 8 secondary views now have their own chunk files in `.next/dev/static/chunks/`:
  - `src_components_quiz_about-view_tsx_*.js` (240B pointer + lazy-loaded real chunk)
  - `src_components_quiz_admin-view_tsx_*.js` (401KB)
  - `src_components_quiz_achievements-view_tsx_*.js`
  - `src_components_quiz_competition-view_tsx_*.js` (152KB)
  - `src_components_quiz_forum-view_tsx_*.js` (166KB)
  - `src_components_quiz_leaderboard-view_tsx_*.js`
  - `src_components_quiz_profile-view_tsx_*.js`
  - `src_components_quiz_spaced-repetition-view_tsx_*.js`
  - All return HTTP 200 when fetched directly.

### Feature 2 — Cache mémoire des banques 🚀

- Created `/home/z/my-project/src/lib/cache.ts` (~110 lines):
  - Simple in-memory TTL cache stored on `globalThis.__quizexamCache` (survives HMR — same pattern as `src/lib/db.ts` for the Prisma client).
  - Public API: `cacheGet<T>(key)`, `cacheSet(key, value, ttlMs?)`, `cacheInvalidate(key)`, `cacheClear()`, `cacheStats()`.
  - Default TTL: 5 minutes (`DEFAULT_TTL_MS = 5 * 60 * 1000`).
  - Lazy eviction on read (expired entries are dropped when `cacheGet` is called).
  - Pass `ttlMs = 0` or negative to disable expiry for an entry.
  - `CACHE_KEYS` const exports well-known keys (`banksList = "banks:list"`, `examsList = "exams:list"`) so producers and consumers stay in sync.

- Modified `/home/z/my-project/src/app/api/banks/route.ts`:
  - GET now checks `cacheGet(CACHE_KEYS.banksList)` first; returns cached value if present.
  - On cache miss, queries Prisma as before, then `cacheSet(CACHE_KEYS.banksList, banks)` (default 5min TTL).
  - All error paths still return JSON (no behaviour change).

- Modified `/home/z/my-project/src/app/api/exams/route.ts`:
  - Same pattern: `cacheGet(CACHE_KEYS.examsList)` → fallback to Prisma → `cacheSet(...)`.

- Added cache invalidation to admin mutation routes:
  - `api/admin/banks/route.ts`: `cacheInvalidate(CACHE_KEYS.banksList)` after `db.questionBank.create/update/delete` (POST, PATCH, DELETE).
  - `api/admin/exams/route.ts`: `cacheInvalidate(CACHE_KEYS.examsList)` after `db.exam.create/delete` (POST, DELETE).
  - `api/admin/questions/route.ts`: `cacheInvalidate(CACHE_KEYS.banksList)` after `db.question.create/update/delete` (POST, PATCH, DELETE). Reason: the cached banks list includes per-bank `_count.questions`, so any add/remove of a question changes the cached payload. PATCH doesn't change the count but changes the bank's contents (in case future endpoints inline questions), so it's invalidated defensively.

- Verified end-to-end via `curl`:
  - First `GET /api/banks` → 200, 18105 bytes (cache miss, populates cache).
  - Second `GET /api/banks` → 200, 18105 bytes (cache hit, same payload).
  - `GET /api/exams` → 200, 2469 bytes (cache miss → hit).
  - Payloads identical between cache miss and hit (no data corruption).

### Feature 3 — Error Boundary 📊

- Created `/home/z/my-project/src/components/quiz/error-boundary.tsx` (~110 lines):
  - React class component `ErrorBoundary` (function components cannot implement `getDerivedStateFromError` / `componentDidCatch`).
  - Props: `children`, optional `fallback`.
  - State: `{ hasError, error }`.
  - `getDerivedStateFromError(error)` updates state to render the fallback.
  - `componentError(error, info)` logs to `console.error` with a `[ErrorBoundary]` prefix and a comment showing the future Sentry integration point: `// Future: Sentry.captureException(error, { contexts: { react: info } })`.
  - Default fallback UI: rose-themed card with `AlertTriangle` icon, error message, and a "Recharger" button (calls `window.location.reload()`).
  - Uses `role="alert"` for screen readers and existing `Button` + `lucide-react` components.

- Created `/home/z/my-project/src/app/global-error.tsx` (~70 lines):
  - Next.js App Router global error boundary (replaces root layout on uncaught error — must include its own `<html>` and `<body>`).
  - Accepts `{ error, reset }` props.
  - `useEffect` logs the error to `console.error` with `[GlobalError]` prefix.
  - Shows error message + optional digest + "Réessayer" button (calls `reset()`) + secondary "ou recharger la page" link.
  - Uses inline styles (no Tailwind classes from layout, since the layout is bypassed).

- Wrapped the main content of `page.tsx` in `<ErrorBoundary>` (see Feature 1 above).

- Verified the `ErrorBoundary` and `error-boundary` symbols appear in the page chunk, and `global-error.tsx` has its own chunk file (`src_app_global-error_tsx_1cf6b850._.js`, served with HTTP 200).

### Feature 4 — Tests automatisés basiques 🧪

Created 3 test files using a tiny inline assert-based framework (no Jest/Vitest dependency):

- `/home/z/my-project/src/lib/__tests__/cache.test.ts` (~145 lines, 14 tests):
  - `cacheGet returns null for a missing key` ✓
  - `cacheSet/cacheGet roundtrip returns the same value` (object) ✓
  - `cacheSet with a string value roundtrips` ✓
  - `cacheSet with a number value roundtrips` ✓
  - `cacheSet with an array value roundtrips` ✓
  - `cacheInvalidate removes a single key` ✓
  - `cacheInvalidate on a missing key is a no-op` ✓
  - `cacheClear removes every key` ✓
  - `TTL expiry: a short-TTL entry is present synchronously after set` ✓
  - `TTL expiry: a short-TTL entry becomes null after waiting > TTL` (20ms TTL, wait 60ms) ✓
  - `TTL expiry: lazy eviction drops the expired entry from the cache map` ✓
  - `CACHE_KEYS exports the expected well-known keys` ✓
  - `cacheSet overwrites a prior value for the same key` ✓
  - `cacheStats reports the correct number of live entries` ✓

- `/home/z/my-project/src/lib/__tests__/spaced-repetition.test.ts` (~205 lines, 15 tests):
  - `quality 5 on a fresh card sets interval=1 and repetitions=1` (ease 2.5→2.6) ✓
  - `quality 4 on a fresh card sets interval=1 and repetitions=1` (ease 2.5→2.5) ✓
  - `quality 3 on a fresh card still increments repetitions` (q>=3 is success) ✓
  - `quality 5 on reps=1 sets interval=6 (SM-2 second-step rule)` (ease 2.6→2.7) ✓
  - `quality 5 on reps>=2 multiplies interval by ease` (round(6*2.7)=16) ✓
  - `quality 0 (blackout) resets repetitions to 0 and interval to 1` ✓
  - `quality 2 (incorrect) resets repetitions to 0 and interval to 1` ✓
  - `quality 1 (wrong but familiar) resets repetitions to 0 and interval to 1` ✓
  - `quality 3-5 always increases the interval compared to a reset card` ✓
  - `quality 0-2 always produces repetitions=0 and interval=1` (parametrised over 3 starting states × 3 qualities) ✓
  - `ease never drops below 1.3 (SM-2 floor)` (20 consecutive q=0 lapses) ✓
  - `quality above 5 is clamped to 5` (q=10 behaves as q=5) ✓
  - `quality below 0 is clamped to 0` (q=-5 behaves as q=0) ✓
  - `applySm2 does not mutate the input card` ✓
  - `nextReview is advanced by the new interval (in days)` ✓

- `/home/z/my-project/src/lib/__tests__/favorites-store.test.ts` (~190 lines, 10 tests):
  - `toggleFavorite adds a question that is not yet favorited` ✓
  - `isFavorite returns false for a question that was never added` ✓
  - `isFavorite returns true after toggleFavorite adds the question` ✓
  - `toggleFavorite removes the question if it is already favorited` ✓
  - `toggleFavorite preserves other favorites when removing one` ✓
  - `toggleFavorite on the same id twice returns to the original state` ✓
  - `removeFavorite deletes only the targeted question` ✓
  - `removeFavorite on a missing id is a no-op` ✓
  - `clearAll empties the favorites array` ✓
  - `favorites are stored newest-first (unshift)` ✓
  - Important implementation note: tests re-read `useFavorites.getState()` after each mutation rather than holding a destructured `favorites` array, because Zustand `set()` creates a NEW array reference each time (the local variable would go stale).

- Created `/home/z/my-project/scripts/run-tests.ts` (~80 lines):
  - Installs a `localStorage` shim on `globalThis` BEFORE importing any test file. This is required because `favorites-store.ts` uses Zustand's `persist` middleware, which captures `localStorage` at module-load time. Without the shim, the middleware prints a noisy "Unable to update item" warning on every state change. ES module imports are hoisted, so the shim cannot live inside the test file itself — it must be installed before the dynamic `await import(file)` call in the runner.
  - Also installs a `console.error` filter as a belt-and-suspenders measure to drop any persist warnings that slip through.
  - Iterates over the 3 test files (explicit list — not globbed), `await import()`s each, captures `process.exitCode === 1` as a failure flag, resets it, and continues so all files always run.
  - Prints a header, per-file results (each file's own summary is printed by the file itself), and a final `Result: PASS ✓` / `Result: FAIL ✗` summary with elapsed time.
  - Exits with code 0 on success, 1 on any failure.

- All 39 tests pass: `bun run scripts/run-tests.ts` → `Result: PASS ✓`.

### Verification

- `bun run lint` → 0 errors, 0 warnings ✓
- `bunx tsc --noEmit` → only 1 error: `next.config.ts(7,3)` (pre-existing, out of scope — documented as pre-existing by F1/P5/P7/P8/P9). No new TS errors introduced. ✓
- `bun run scripts/run-tests.ts` → 39 passed, 0 failed ✓
- `curl http://localhost:3000/` → 200 (home page still renders correctly with new ErrorBoundary + lazy splits) ✓
- `curl http://localhost:3000/api/banks` → 200, 18105 bytes, same payload on cache miss and cache hit ✓
- `curl http://localhost:3000/api/exams` → 200, 2469 bytes, same payload on cache miss and cache hit ✓
- 8 lazy-loaded view chunks all return HTTP 200 when fetched directly from `/_next/static/chunks/` ✓
- `ErrorBoundary` symbol present in the page chunk ✓
- `global-error.tsx` chunk present and served ✓

## Stage Summary

- ✅ Feature 1 (Lazy Loading): 8 secondary views (`AboutView`, `AdminView`, `LeaderboardView`, `SpacedRepetitionView`, `AchievementsView`, `ForumView`, `ProfileView`, `CompetitionView`) now lazy-loaded via `React.lazy()` + `Suspense` with a `<Skeleton className="h-64 w-full rounded-xl" />` fallback. Main user flow (HomeView, SessionView, ResultsView, DashboardView, BankDetailView, ExamDetailView, SocialView) stays eager. Initial page chunk no longer bundles the 8 secondary views' code — each is a separate JS file fetched on first navigation.
- ✅ Feature 2 (Cache mémoire): `src/lib/cache.ts` provides a TTL-based in-memory cache (5min default TTL, globalThis-cached to survive HMR). `GET /api/banks` and `GET /api/exams` now read from cache first. Mutations in `api/admin/banks`, `api/admin/exams`, `api/admin/questions` invalidate the appropriate cache key.
- ✅ Feature 3 (Error Boundary): `src/components/quiz/error-boundary.tsx` is a React class component with `getDerivedStateFromError` + `componentDidCatch`, a default rose-themed fallback card with "Recharger" button, and a placeholder for future Sentry integration. `src/app/global-error.tsx` handles uncaught root errors with `<html>`/`<body>` (required for Next.js global error). Main content of `page.tsx` wrapped in `<ErrorBoundary>`.
- ✅ Feature 4 (Tests): 3 test files (39 tests total) using a tiny inline `test`/`expect` framework — no Jest/Vitest dependency. `scripts/run-tests.ts` runs all tests with a clean summary; installs a localStorage shim + console.error filter so Zustand persist warnings don't clutter the output.
- 8 new files created: `src/lib/cache.ts`, `src/components/quiz/error-boundary.tsx`, `src/app/global-error.tsx`, `src/lib/__tests__/cache.test.ts`, `src/lib/__tests__/spaced-repetition.test.ts`, `src/lib/__tests__/favorites-store.test.ts`, `scripts/run-tests.ts`. (Plus the 4 modified files: `page.tsx`, `api/banks/route.ts`, `api/exams/route.ts`, plus 3 admin routes: `admin/banks/route.ts`, `admin/exams/route.ts`, `admin/questions/route.ts`.)
- 0 lint errors, 0 lint warnings, 0 new TS errors (1 pre-existing in `next.config.ts` — out of scope).
- All 39 tests pass.
- Work record written to: `/home/z/my-project/agent-ctx/F2-lazy-cache-errorbound-tests.md`
