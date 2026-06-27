# Task F5 — 5 advanced features (AI tutor, certificates, offline mode, freemium, public API)

**Task ID:** F5
**Agent:** F5 (Z.ai Code)
**Scope:** Implement 5 advanced features for the QuizExam BF platform — each kept simple and focused, no existing code broken.

## Features delivered

### 1. IA Tutor personnalisé 🤖
- `src/app/api/ai-tutor/route.ts` (~190 lines): POST handler. Reads `{ userId, question, userHistory }` from the body (or auto-fetches the user's 5 most recent sessions from DB if `userHistory` is omitted). Builds a "weak-areas" summary by grouping wrong/skipped answers by bank title, picking top 3 banks. Calls `ZAI.create().chat.completions.create` with a French system prompt and the weak-areas context. Returns `{ answer, recommendations, weakAreas, tier }`. Premium-gated (returns 403 `PREMIUM_REQUIRED` for free users via `getUserTier`).
- `src/components/quiz/ai-tutor-panel.tsx` (~390 lines): Embedded as a 5th dashboard tab ("Tuteur IA", Bot icon). Three sub-sections:
  1. **Weak areas analysis** — derived client-side from `/api/me/stats` + `/api/sessions`, shows top 5 banks with most wrong answers as horizontal bars (amber→rose gradient).
  2. **Personalized recommendations** — returned by the AI tutor API, rendered as a numbered list.
  3. **Chat interface** — Textarea + Send button, supports Enter to send (Shift+Enter for newline), shows user/assistant messages with avatars, "Le tuteur réfléchit…" spinner, suggestion chips when empty. Auto-scrolls to bottom on new messages. If the user is free-tier, shows a "Premium" badge and refuses to send (toast).
- Added `<AITutorPanel />` import + new `<TabsTrigger value="ai-tutor">` + `<TabsContent>` in `dashboard-view.tsx`. TabsList grid changed from 4 → 5 columns.

### 2. Certificats de réussite 📜
- `src/app/api/certificate/route.ts` (~200 lines):
  - **GET** `?sessionId=X`: Returns `{ certificateId, userName, quizTitle, score, total, percentage, date, sessionId, issuer }`. Premium-gated. The certificate ID is `QEBF-<8-hex>-<6-hex>` derived from FNV-1a hashing of `sessionId + score` + `completedAt`. Session must be completed; user must own it (or be anonymous).
  - **POST** `{ sessionId }`: Same payload + enforces score ≥ 80% (returns 400 `SCORE_TOO_LOW` otherwise). Premium-gated.
- `src/components/quiz/certificate-dialog.tsx` (~280 lines): Dialog with a diploma-style preview card (amber/emerald gradient, double-border, 🏆 seal, certificate ID in mono). Three actions:
  - **Imprimer** — opens a fresh window with print-only HTML+CSS for an A4-landscape diploma and calls `window.print()` after 300ms. No PDF library.
  - **Partager** — uses `navigator.share` when available, falls back to clipboard copy of `/?cert=<certificateId>`.
  - When the API returns `PREMIUM_REQUIRED`, the dialog shows a Crown icon + upgrade message instead of the diploma.
- Added an "Obtenir un certificat" button in `results-view.tsx` action row, shown only when `percentage >= 80`. Wired `<CertificateDialog open={certOpen} sessionId={session.id} />`.

### 3. Mode hors ligne complet 📱
- `src/lib/offline-manager.ts` (~210 lines): Client-side offline cache for question banks. Functions:
  - `downloadBankForOffline(bankId)`: fetches `/api/banks` + `/api/questions?bankId=`, persists both as a single JSON blob under `qebf-offline-bank:<id>` in localStorage, updates the index under `qebf-offline-index`. Quota-exceeded → evicts oldest cached bank + retries once.
  - `getOfflineBanks()`, `isBankAvailableOffline(bankId)`, `removeOfflineBank(bankId)`, `getOfflineStorageBytes()`.
  - Pending-session queue: `queuePendingSession()`, `getPendingSessions()`, `clearPendingSessions()`, `syncOfflineSessions()` — replays offline sessions by POSTing to `/api/sessions` once `navigator.onLine` returns true. Returns `{ synced, failed }`.
  - All functions are SSR-safe (no-op when `window` is undefined).
- `src/components/quiz/offline-manager-panel.tsx` (~280 lines): Embedded as a new "Mode hors ligne" section in `settings-panel.tsx` (WifiOff icon, between Email preferences and Badges). Surface:
  - Status row (En ligne / Hors ligne badge, pending count, plan tier badge).
  - Storage usage card (KB used / 5 MB soft budget, Progress bar).
  - Sync button (calls `syncOfflineSessions()`, toast feedback).
  - Cached banks list (max-h-48 scroll, remove button per bank).
  - Download list of all banks (max-h-64 scroll, "Télécharger" button or "Hors ligne" badge, disabled when at free-tier limit of 1 bank).
- Added `<OfflineManagerPanel />` import + section to `settings-panel.tsx`.

### 4. Système freemium 💰
- `prisma/schema.prisma`: added `subscription String @default("free")` to the `User` model (values: "free" | "premium" | "admin"). Comment block explains the gating rules.
- `bunx prisma db push --skip-generate` + `bunx prisma generate` — schema synced, client regenerated. Bumped `PRISMA_CACHE_VERSION` in `src/lib/db.ts` to `'f5-subscription-2025'` so the dev server picks up the new client.
- `src/lib/subscription-limits.ts` (~140 lines):
  - `FREE_DAILY_LIMIT = 50`, `FREE_LIMIT` (no PDF, no AI tutor, no certificates, 1 offline bank), `PREMIUM_LIMIT` (unlimited everything), `PLAN_FEATURES` (UI strings).
  - `getUserTier(userId)` — raw SQL `SELECT subscription FROM "User" WHERE id = ...` (bypasses the HMR-cached Prisma client). Returns `"free"` if missing/unknown.
  - `countQuestionsToday(userId)` — raw SQL `SUM("totalQuestions")` for sessions started today (UTC). Returns 0 on error.
  - `checkLimit(userId)` — full `LimitCheck` (tier, isPremium, usedToday, remaining, limit, canStartMore).
- `src/app/api/subscription/route.ts` (~120 lines):
  - **GET**: returns `{ tier, isPremium, usedToday, remaining, limit, canStartMore, features, planFeatures }`.
  - **POST** `{ tier?: "premium" | "free" }`: mock upgrade — raw SQL `UPDATE "User" SET subscription = ... WHERE id = ...`. No real payment processor. Default tier = "premium".
- Session creation API (`src/app/api/sessions/route.ts`): added the freemium limit check. After gathering questions (so we know the real count that would be added), before creating the session, calls `checkLimit(userId)`. If `!canStartMore`, returns 402 with `{ error, code: "DAILY_LIMIT_REACHED", usedToday, limit, upgradeUrl }`. Premium/admin bypass.
- `bank-detail-view.tsx` + `exam-detail-view.tsx`: added a 402 branch in `handleStart` that surfaces a `toast.error(data.error)` prompting upgrade. Imported `toast` from `sonner`. The daily-challenge-card already had a generic error toast path that handles this gracefully.
- `src/components/quiz/pricing-modal.tsx` (~270 lines): Dialog with a free-vs-premium comparison grid, current-quota progress card for free users, "Passer à Premium" button (amber→orange gradient) that POSTs `/api/subscription` + refetches state on success, "Revenir en Free" link when already premium. Surfaces "Mode démo — aucun paiement réel" footer note.
- Header: added an "Améliorer" button (Crown icon, amber→orange gradient, tooltip) next to the UserMenuButton in `page.tsx`, shown only for authenticated non-admin users. Wired `<PricingModal open={pricingOpen} />`.

### 5. API publique 🔌
- `src/lib/rate-limit.ts` (~95 lines): In-memory IP-based rate limiter. `rateLimitCheck(key, max=30, windowMs=60_000)` returns `{ allowed, limit, remaining, reset }`. Sliding-window (prunes expired hits lazily). State attached to `globalThis` so it survives HMR. `getClientKey(request)` extracts the IP from `x-forwarded-for` / `x-real-ip` (falls back to `"anon"`). `rateLimitHeaders()` builds `X-RateLimit-Limit/Remaining/Reset` headers.
- `src/app/api/docs/route.ts` (~135 lines): GET returns full API documentation as JSON — name, version, baseUrl, authentication policy, rate-limit policy, mock API key (`QEBF-DEMO-KEY`), and a list of 13 endpoints with method/auth/description/params/example request+response.
- `src/app/api/public/banks/route.ts` (~70 lines): GET — public, rate-limited list of banks. Returns `{ banks: [{ id, title, description, category, questionsCount }], rateLimit: { limit, remaining, reset } }`. Reuses the in-memory cache from `src/lib/cache.ts` (`CACHE_KEYS.banksList`). On rate-limit exceeded: 429 with `X-RateLimit-*` headers.
- `src/app/api/public/questions/route.ts` (~75 lines): GET `?bankId=X` — public, rate-limited list of questions for a bank. Returns `{ bankId, questions: [{ id, question, options: { A, B, C, D } }], count, rateLimit }`. **Intentionally omits** `correctAnswer`, `correctAnswer2`, and `explanation` so external integrators can build quizzes without leaking the answer key. Hard cap of 100 questions per response.
- `src/components/quiz/api-docs-view.tsx` (~265 lines): Dialog-based API documentation viewer. Fetches `/api/docs` on open. Renders:
  - Meta cards (Base URL, Version).
  - Authentication + Rate-limit policy cards.
  - Mock API key card (amber theme) with copy-to-clipboard button.
  - Full endpoints list (13 items) — each with method badge (green GET / amber POST), path (mono), auth badge, description, params list, example request/response in `<pre>` blocks.
- Added "API Docs" link button (Code2 icon) in the footer of `page.tsx`, between the phone link and the end. Wired `<ApiDocsView open={apiDocsOpen} />`.

## Files created
1. `src/app/api/ai-tutor/route.ts`
2. `src/components/quiz/ai-tutor-panel.tsx`
3. `src/app/api/certificate/route.ts`
4. `src/components/quiz/certificate-dialog.tsx`
5. `src/lib/offline-manager.ts`
6. `src/components/quiz/offline-manager-panel.tsx`
7. `src/lib/subscription-limits.ts`
8. `src/app/api/subscription/route.ts`
9. `src/components/quiz/pricing-modal.tsx`
10. `src/lib/rate-limit.ts`
11. `src/app/api/docs/route.ts`
12. `src/app/api/public/banks/route.ts`
13. `src/app/api/public/questions/route.ts`
14. `src/components/quiz/api-docs-view.tsx`

## Files modified
1. `prisma/schema.prisma` — added `subscription String @default("free")` on User.
2. `src/lib/db.ts` — bumped `PRISMA_CACHE_VERSION` to `'f5-subscription-2025'`.
3. `src/app/api/sessions/route.ts` — freemium daily-limit check (returns 402 `DAILY_LIMIT_REACHED`).
4. `src/components/quiz/bank-detail-view.tsx` — 402 toast branch + `sonner` import.
5. `src/components/quiz/exam-detail-view.tsx` — 402 toast branch + `sonner` import.
6. `src/components/quiz/results-view.tsx` — "Obtenir un certificat" button (≥80%) + `<CertificateDialog>`.
7. `src/components/quiz/dashboard-view.tsx` — new "Tuteur IA" tab + Bot icon import + `<AITutorPanel>`.
8. `src/components/quiz/settings-panel.tsx` — new "Mode hors ligne" section + WifiOff icon import + `<OfflineManagerPanel>`.
9. `src/app/page.tsx` — Crown + Code2 icon imports, `PricingModal` + `ApiDocsView` imports, `pricingOpen` + `apiDocsOpen` state, "Améliorer" header button (non-admin authed), "API Docs" footer link button, mounted both dialogs.

## Verification
- `bun run lint` → 0 errors, 0 warnings ✓ (fixed 2 `react-hooks/set-state-in-effect` errors during dev: deferred `setLoading(true)` and cleanup `setData(null)` etc. inside `setTimeout` callbacks in `api-docs-view.tsx` and `certificate-dialog.tsx`).
- `bunx tsc --noEmit` → only the 1 pre-existing `next.config.ts(7,3)` error (out of scope, noted by every prior agent since P2). 0 new TS errors ✓.
- `bunx prisma db push --skip-generate` (with inline `DATABASE_URL` + `DIRECT_URL`) → "Your database is now in sync with your Prisma schema" ✓.
- `bunx prisma generate` → Prisma client regenerated to pick up the new `subscription` column ✓.
- End-to-end curl tests (all from the host):
  - `GET /api/docs` → 200 JSON with 13 endpoints ✓
  - `GET /api/public/banks` → 200, returns public bank list with `rateLimit` metadata + `X-RateLimit-*` headers ✓
  - `GET /api/public/questions?bankId=...` → 200, returns questions WITHOUT correct answers ✓
  - `GET /api/public/questions` (no bankId) → 400 ✓
  - `GET /api/subscription` (unauth) → 401 ✓
  - `POST /api/subscription` (unauth) → 401 ✓
  - `GET /api/certificate` (no sessionId) → 400 ✓
  - `POST /api/ai-tutor` (unauth) → 401 ✓
  - Rate-limit hammer: 32 sequential requests to `/api/public/banks` → 26×200 then 6×429 ✓ (correctly enforces the 30/min/IP limit after the 4 requests already consumed in earlier curls).
  - `GET /` → 200 (page renders, splash + login flow + new header button + footer link) ✓.

## Design notes
- **Freemium check placement**: in `/api/sessions` POST, after gathering questions but BEFORE creating the session — so a rejected request leaves no DB rows behind. The check is skipped for anonymous sessions (no `userId`), which matches the original auth flow (sessions can be created without login).
- **Premium gating via raw SQL**: the `subscription` column is read/written via `db.$queryRaw` / `db.$executeRaw` so we don't depend on the dev server's HMR-cached Prisma client knowing about the new column. Same pattern F4 used for `emailPreferences`.
- **Certificate ID**: deterministic FNV-1a hash of `sessionId + score` + `completedAt` — same session always produces the same ID, but different sessions produce different IDs. Format: `QEBF-XXXXXXXX-XXXXXX` (8+6 hex chars).
- **Public API answer-key safety**: `/api/public/questions` selects only `id, question, optionA-D` from Prisma — `correctAnswer`, `correctAnswer2`, and `explanation` are explicitly NOT selected, so the answer key can never leak to external integrators.
- **Rate limiter**: in-memory, sliding-window, attached to `globalThis` so it survives HMR. Not Redis-backed (intentional, per task spec). Counter resets on server restart — fine for public data.
- **AI Tutor fallback**: if `ZAI.create()` throws or returns empty, the route falls back to a generic message listing the user's weak areas — so the UI still works if the AI provider is down.
- **Offline manager**: SSR-safe (all functions no-op when `window` is undefined). Quota-exceeded → evicts oldest cached bank + retries once. Pending sessions are persisted to localStorage and replayed when `navigator.onLine` returns true.
- **No existing code broken**: only additive changes to existing files (new imports, new state, new tab/section/button). All existing views, routes, and APIs continue to work. Verified with `bunx tsc --noEmit` (0 new errors) and the dev server's HTTP 200 on `/`.

## Work record
- This file: `/home/z/my-project/agent-ctx/F5-ai-tutor-certificates-offline-freemium-public-api.md`
- Appended summary to `/home/z/my-project/worklog.md` (Task ID F5 section).
