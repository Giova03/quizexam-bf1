# Task F1 — Bugfix + Admin Split

**Agent**: F1 (Z.ai Code)
**Task**: Fix critical bugs (TS error in pdf-upload-dialog.tsx, broken competition API) + split monolithic admin-view.tsx (2177 lines → 9 files).

## Work Log

- Read `/home/z/my-project/worklog.md` (1190 lines through P9) and all 8 prior agent-ctx records (P2–P9) to understand the project state and the two pre-existing TS errors noted by every prior agent.
- Verified the exact TS errors via `bunx tsc --noEmit`:
  - `next.config.ts(7,3): error TS2353` — pre-existing, out of scope (not mentioned by task).
  - `pdf-upload-dialog.tsx(360,7): error TS2322: Type 'string | null' is not assignable to type 'string'.` — IN scope, fixed.

### 1. Fixed `pdf-upload-dialog.tsx` TS error

- Root cause: `let bankId = "";` was typed `string`, but `createNewBank()` returns `Promise<string | null>`. The assignment `bankId = await createNewBank()` therefore failed TS strict null checks.
- Fix: changed `let bankId = "";` to `let bankId: string | null = null;`. The existing `if (!bankId) return;` checks already narrow the type to `string` for the rest of the function — no other call sites needed changes.
- Also hardened the `generate()` function (per task description):
  - Added explicit null/empty/non-string check on `pdfText` that shows the requested error `"Impossible d'extraire le texte du PDF"`.
  - Assigned `pdfText` to a local `const safeText: string` before sending to `/api/generate-qcm` so the API always receives a guaranteed string (never null/undefined).
  - Kept the existing `length < 30` guard but with the same French error message for consistency.

### 2. Fixed competition API returning HTML

- Root cause: `/home/z/my-project/src/app/api/competition/route.ts` did NOT exist. The directory `/api/competition/` only had `join/route.ts`, `answer/route.ts`, `next/route.ts`. So both `POST /api/competition` and `GET /api/competition?code=XXX` fell through to Next.js's default 404 HTML page.
- Fix: created `/home/z/my-project/src/app/api/competition/route.ts` (~190 lines) with:
  - **POST handler** (auth required): parses JSON body `{ bankId, questionCount?, timeLimitSec?, action? }` (accepts `action: "create"` for backwards compat with the task's curl test). Validates bankId, clamps questionCount to [1,50] (default 10) and timeLimitSec to [5,300] (default 30). Loads the bank + questions from DB via `db.questionBank.findUnique`, picks `questionCount` random questions via `pickRandom`, generates a unique 6-char code via `generateUniqueRoomCode`, creates a `CompetitionRoom` in "lobby" status with the host as the first participant. Returns `serializeRoom(room, user.id)` as JSON.
  - **GET handler** (auth required): parses `?code=XXX`, looks up the room via `getRoom`, includes an auto-advance safety-net (if `questionTimeLimitSec + 2s` has elapsed during "playing" status, advances to the next question or finishes the game) so polling clients aren't stuck if the host's advance request was lost. Returns the serialized room as JSON.
  - All error paths return `NextResponse.json({error: ...}, {status: ...})` — never HTML.
- Verified `competition-store.ts` (216 lines) is correct — `createRoom`, `getRoom`, `generateUniqueRoomCode`, `pickRandom`, `serializeRoom` all work as expected. No changes needed.
- End-to-end curl test (logged in as admin):
  - `POST /api/competition -d '{"action":"create","bankId":"test"}'` → 404 JSON `{"error":"Banque introuvable"}` ✓ (previously returned HTML 404)
  - `POST /api/competition -d '{"bankId":"<real-id>","questionCount":5,"timeLimitSec":15}'` → 200 JSON `{"code":"34BS56","status":"lobby","bankTitle":"...","participants":[...],"totalQuestions":5,...}` ✓
  - `GET /api/competition?code=34BS56` → 200 JSON room state ✓
  - Unauthenticated POST → 401 JSON `{"error":"Authentification requise"}` ✓

### 3. Split `admin-view.tsx` (2177 lines → 242 lines + 9 sub-component files + types file)

Created `/home/z/my-project/src/components/quiz/admin/` directory with:

| File | Lines | Exports |
|------|-------|---------|
| `types.ts` | 62 | `AdminStats`, `Question`, `BankWithCount` interfaces (shared shapes extracted from the original monolith to avoid circular imports on admin-view.tsx) |
| `admin-overview.tsx` | 284 | `StatCard`, `TopPerformersAndAlerts`, `OverviewTab` (6 KPI cards + recent users + recent sessions + top performers/alerts) |
| `admin-visitors.tsx` | 366 | `VisitorsStats`, `ProgressTracker`, `ROLE_OPTIONS`, `ROLE_BADGE_STYLES`, `ROLE_AVATAR_STYLES`, `ROLE_LABELS_FR` (VisitorsStats + role management; ProgressTracker moved here since it's conceptually visitor analytics and wasn't listed as its own file) |
| `admin-banks.tsx` | 246 | `BanksTab` (PDF upload callout + bank list), `NewBankDialog` |
| `admin-bank-dialog.tsx` | 511 | `BankQuestionsDialog` (search/list/edit/delete), `QuestionEditor` (create/edit form with live preview + difficulty selector) |
| `admin-sessions.tsx` | 94 | `SessionsList` (scrollable sessions table with score/mode/timestamps) |
| `admin-exams.tsx` | 307 | `ExamsManager` (list + delete), `NewExamDialog` (per-bank question distribution picker) |
| `admin-exports.tsx` | 120 | `ExportsPanel` (3 CSV export cards: users/sessions/banks) |
| `admin-broadcast.tsx` | 117 | `BroadcastPanel` (email-broadcast form, kept `open`/`onOpenChange` props for API compat) |
| `admin-moderation.tsx` | 11 | Re-exports `ModerationPanel` from `@/components/quiz/moderation-panel` (already implemented in P8; just wrapped for organisational consistency) |

Then rewrote `/home/z/my-project/src/components/quiz/admin-view.tsx` (2177 → 242 lines, well under the 300-line target):
- Keeps the `AdminView()` main component with button-based tab navigation (NOT Radix Tabs — preserved the original `<button>`-based tabs for max reliability).
- Imports all sub-components from `./admin/*`.
- Manages the 5 pieces of cross-tab dialog state (`selectedBank`, `newBankOpen`, `newExamOpen`, `broadcastOpen`, `pdfUploadOpen`).
- Renders the active tab's content by delegating to the appropriate sub-component.
- Renders all 4 cross-tab dialogs at the bottom (BankQuestionsDialog, NewBankDialog, NewExamDialog, PdfUploadDialog).
- All 11 tabs still work: overview, visitors, progress, banks, sessions, exams, exports, broadcast, analytics, moderation, ai-generator.

## Verification

- `bun run lint` → **0 errors, 0 warnings** ✓
- `bunx tsc --noEmit` → **only 1 error remaining**: `next.config.ts(7,3)` (pre-existing, out of scope — documented as pre-existing by P5/P7/P8/P9; the original pdf-upload-dialog.tsx(360,7) error is now FIXED) ✓
- Home page returns HTTP 200 with the new `src_components_quiz_admin_*._.js` chunk loaded ✓
- Admin chunk (`/_next/static/chunks/src_components_quiz_admin_8e792b98._.js`) returns HTTP 200 ✓
- Admin APIs all still work (stats, users, sessions, exams, export) ✓
- Competition API now returns JSON for all paths (POST create, GET status, error cases) ✓
- Auth-gated endpoints correctly return 401 JSON when unauthenticated ✓

## Files Touched

- **Modified**: `src/components/quiz/pdf-upload-dialog.tsx` (TS error fix + defensive null checks in `generate()` and `saveSelectedToBank()`)
- **Modified**: `src/components/quiz/admin-view.tsx` (rewrote 2177 → 242 lines as a thin shell that imports from `./admin/*`)
- **Created**: `src/app/api/competition/route.ts` (~190 lines, POST + GET handlers)
- **Created**: `src/components/quiz/admin/types.ts` (62 lines, shared interfaces)
- **Created**: `src/components/quiz/admin/admin-overview.tsx` (284 lines)
- **Created**: `src/components/quiz/admin/admin-visitors.tsx` (366 lines)
- **Created**: `src/components/quiz/admin/admin-banks.tsx` (246 lines)
- **Created**: `src/components/quiz/admin/admin-bank-dialog.tsx` (511 lines)
- **Created**: `src/components/quiz/admin/admin-sessions.tsx` (94 lines)
- **Created**: `src/components/quiz/admin/admin-exams.tsx` (307 lines)
- **Created**: `src/components/quiz/admin/admin-exports.tsx` (120 lines)
- **Created**: `src/components/quiz/admin/admin-broadcast.tsx` (117 lines)
- **Created**: `src/components/quiz/admin/admin-moderation.tsx` (11 lines, re-export wrapper)

**Total**: 2 modified + 11 created = 13 files. 0 lint errors. 0 new TS errors (1 pre-existing out of scope).

## Stage Summary

- ✅ Task 1: pdf-upload-dialog.tsx TS error fixed (bankId properly typed as `string | null`, defensive null checks added in `generate()` with the requested `"Impossible d'extraire le texte du PDF"` error message, generate-qcm API guaranteed to receive a string).
- ✅ Task 2: competition API created (was missing entirely — both POST and GET now return JSON; auto-advance safety-net added for polling clients; tested end-to-end with real admin auth).
- ✅ Task 3: admin-view.tsx split into 9 sub-component files + 1 shared types file in `src/components/quiz/admin/`. Main `admin-view.tsx` is now 242 lines (under the 300-line target). All 11 tabs preserved with button-based navigation. All existing functionality intact (no breaking changes).
