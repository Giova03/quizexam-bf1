# Task E1 — Education level separation & content organization

**Agent:** E1 Subagent (Z.ai Code)
**Date:** 2025-04-15
**Task:** Implement education level separation (BEPC / BAC / Licence / Concours) across the schema, API, and UI without resetting the database.

## Scope (7 deliverables + 1 bonus)

| # | Deliverable                                                                                              | Status |
|---|----------------------------------------------------------------------------------------------------------|--------|
| 1 | Add `educationLevel` / `tags` / `chapter` / `subject` to `prisma/schema.prisma`                          | ✓      |
| 2 | `bunx prisma db push` (data-preserving, no `--force-reset`)                                              | ✓      |
| 3 | `scripts/categorize-levels.ts` — categorize the 66 bank JSON files by education level                    | ✓      |
| 4 | `GET /api/banks?level=BEPC|BAC|LICENCE|CONCOURS` — server-side filter                                     | ✓      |
| 5 | `src/components/quiz/education-level-selector.tsx` — segmented control component                          | ✓      |
| 6 | `src/components/quiz/home-view.tsx` — integrate selector + filter banks client-side                       | ✓      |
| 7 | `src/components/quiz/admin/admin-banks.tsx` — add level selector to NewBankDialog                         | ✓      |
| 8 | `src/components/quiz/start-dialog.tsx` — show bank-level badge + in-bank level filter                     | ✓      |
| 9 | Bonus: `scripts/apply-education-levels-to-db.ts` — backfill existing DB rows from the categorised JSON    | ✓      |

## Work log

### 1. Prisma schema (`prisma/schema.prisma`)
- Added `educationLevel String @default("TOUS")` to **QuestionBank** (alongside
  the existing `level` field which keeps its difficulty-level semantics).
- Added `educationLevel String @default("TOUS")` to **Question**.
- Added `tags String @default("")` (comma-separated) to **Question**.
- Added `chapter String?` to **Question**.
- Added `subject String?` to **Question**.
- Ran `bunx prisma db push`. Result: *"Your database is now in sync with your
  Prisma schema."* — 5 new columns added with defaults; no existing data was
  reset, no row was deleted.

### 2. `scripts/categorize-levels.ts` (NEW, ~125 lines)
- Reads all 66 `*.json` bank files in `scripts/generated/banks/`.
- Assigns `educationLevel` based on bank title/category/subcategory/bankKey
  (diacritics stripped, lower-cased). Rules evaluated in order:
  1. `college` | `6e|5e|4e|3e` | `bepc` → **BEPC**
  2. `lycee` | `terminale` | `seconde` | `premiere` | `bac ` → **BAC**
  3. `ufr` | `licence` | `universit` → **LICENCE**
  4. `concours` → **CONCOURS**
  5. otherwise → **TOUS**
- Writes the files back in place (pretty-printed) and prints a summary.
- **Idempotent** — re-running reports 0 banks updated.
- Distribution after the run:
  - BEPC: 3, BAC: 4, LICENCE: 26, CONCOURS: 11, TOUS: 22

### 3. `scripts/apply-education-levels-to-db.ts` (NEW, BONUS, ~110 lines)
- One-time backfill that **does NOT** reset the database.
- Reads every categorised JSON file, matches the bank in the DB by normalised
  title (lower-cased + diacritics stripped) and updates ONLY the new
  `educationLevel` column on the `QuestionBank` row.
- Also propagates each bank's level to its `Question` rows that are still at
  the default "TOUS" (so the start-dialog in-bank level filter works
  out-of-the-box for single-level banks).
- Result on first run: **38 banks updated, 19 skipped (already at the right
  level), 9 unmatched (titles differ from DB), 2650 questions inherited bank
  level**. Second run: 0 updated → confirmed idempotent.

### 4. `GET /api/banks?level=...` (`src/app/api/banks/route.ts`)
- Added `?level=BEPC|BAC|LICENCE|CONCOURS` query param support.
- For specific levels, returns banks with `educationLevel = level` **OR**
  `educationLevel = "TOUS"` (so "TOUS" banks appear under every filter).
- Level is validated against a `VALID_LEVELS` set built from the new exported
  `EDUCATION_LEVELS` constant in `src/lib/cache.ts`.
- Cache key now includes the level (`banks:list:level=BEPC` etc.) so different
  filters don't shadow each other.

### 5. Cache helper (`src/lib/cache.ts`)
- Exported `EDUCATION_LEVELS = ["TOUS", "BEPC", "BAC", "LICENCE", "CONCOURS"]`.
- New `invalidateBanksListCache()` helper that drops the base key + every
  per-level variant. Used by all mutation endpoints
  (`/api/admin/banks`, `/api/admin/questions`, `/api/import-questions`,
  `/api/banks` POST).

### 6. `src/components/quiz/education-level-selector.tsx` (NEW, ~280 lines)
- Two layout variants: `"pills"` (horizontal sliding bar) and `"cards"`
  (5-column grid).
- Each tab shows: icon, label, hint (Collège/Lycée/Université/Examens), count.
- Effective count for specific levels = banks at that level + TOUS banks
  (matches what the API actually returns).
- Exports:
  - `EducationLevelSelector` (the component)
  - `EducationLevel` (union type)
  - `EDUCATION_LEVEL_OPTIONS` (used by the admin dialog + start dialog)
  - `getEducationLevelMeta(level)` → `{ label, icon, badgeCls }` (used by
    every level badge across the app)
- Smooth transitions, full keyboard accessibility (`role="tablist"`,
  `aria-selected`, `aria-pressed`), responsive (horizontal scroll on mobile).
- Color system: emerald=TOUS, sky=BEPC, violet=BAC, amber=LICENCE,
  rose=CONCOURS.

### 7. `src/components/quiz/home-view.tsx`
- Renders `<EducationLevelSelector>` above the banks grid.
- Loads ALL banks once on mount, applies the level filter **client-side** so
  switching tabs is instant (no refetch).
- The selected level is persisted to `localStorage` (`home:educationLevel`)
  so users keep their filter between sessions.
- Header bar now shows two badges: "X affichées" + "Y questions" (both update
  live with the filter).
- Each bank card now displays a small level badge (when not "TOUS") using
  `getEducationLevelMeta`.
- Empty state: friendly message telling the user to switch levels.

### 8. `src/components/quiz/admin/admin-banks.tsx`
- `NewBankDialog` now has an **education level selector** (5-icon grid) with
  inline help text. Selection is sent to `POST /api/admin/banks` as
  `educationLevel`.
- The admin banks list (`BanksTab`) now shows a level badge next to each
  bank's title (when not "TOUS") so admins can see at a glance which level
  each bank is tagged with.

### 9. `src/components/quiz/start-dialog.tsx`
- New optional props:
  - `educationLevel?: string` → bank's level (shown as a badge in the dialog
    title when not "TOUS").
  - `educationLevelCounts?: Partial<Record<EducationLevel, number>>` → per-level
    question counts inside the bank.
  - `initialEducationLevelInBank?: EducationLevel | "all"` → initial selection.
- When `educationLevelCounts` is provided AND at least one non-TOUS level has
  questions, an **in-bank level filter** is rendered above the difficulty
  filter, letting the user play only questions tagged with a specific level.
- The live question count compounds both filters (conservatively — uses the
  min of the two counts because we don't have a per-(difficulty × level)
  matrix client-side).
- `bank-detail-view.tsx` now computes `educationLevelCounts` from the loaded
  questions and passes it + `bank.educationLevel` to the StartDialog.

### 10. Type updates
- `src/lib/types.ts`: `QuestionBank.educationLevel?` and `Question.educationLevel?`
  / `tags?` / `chapter?` / `subject?` added.
- `src/components/quiz/admin/types.ts`: `Question.educationLevel?` / `tags?` /
  `chapter?` / `subject?`, `BankWithCount.educationLevel?`,
  `AdminStats.bankStats[].educationLevel?` added.

## API routes touched

| Route                            | Change                                                         |
|----------------------------------|----------------------------------------------------------------|
| `GET /api/banks`                 | + `?level=` filter, per-level cache key                        |
| `POST /api/banks`                | uses `invalidateBanksListCache()`                              |
| `POST /api/admin/banks`          | + `educationLevel` field in create + cache helper              |
| `PATCH /api/admin/banks`         | + `educationLevel` field in update + cache helper              |
| `DELETE /api/admin/banks`        | uses `invalidateBanksListCache()`                              |
| `POST /api/admin/questions`      | + `educationLevel`/`tags`/`chapter`/`subject` + cache helper   |
| `PATCH /api/admin/questions`     | + same 4 new fields + cache helper                             |
| `DELETE /api/admin/questions`    | uses `invalidateBanksListCache()`                              |
| `POST /api/import-questions`     | uses `invalidateBanksListCache()` (was hard-coded `banks:list`)|

## Verification

- `bunx prisma db push` ✓ — 5 columns added, 0 rows lost.
- `bun run scripts/categorize-levels.ts` ✓ — 66 banks categorised.
- `bun run scripts/apply-education-levels-to-db.ts` ✓ — 38 banks + 2650
  questions backfilled.
- `bun run lint` → exit 0, 0 errors, 0 warnings.
- `npx tsc --noEmit` → 0 errors in `src/`.
- Backward compatibility: every new prop is optional; every existing call site
  (`exam-detail-view.tsx`, etc.) keeps working unchanged.

## Key technical decisions

- **Two scripts, not one**: `categorize-levels.ts` writes to the JSON files
  (per the task spec); `apply-education-levels-to-db.ts` writes to the DB
  (bonus) so the level filter actually works end-to-end without re-seeding.
  Both are idempotent.
- **`educationLevel` ≠ `level`**: the existing `level` column on QuestionBank
  is preserved untouched (it was previously used as a difficulty/audience
  marker, default "TOUS"). The new `educationLevel` column is a separate,
  semantically clearer field with the same vocabulary
  ("BEPC" | "BAC" | "LICENCE" | "CONCOURS" | "TOUS").
- **Client-side filter on the home view**: we fetch ALL banks once and filter
  in `useMemo`. This gives instant tab switching and avoids hammering the API
  on every click. The server-side `?level=` filter exists for the public API
  and direct API consumers.
- **TOUS as a wildcard**: a bank tagged "TOUS" applies to every level, so it
  shows up under BEPC, BAC, LICENCE and CONCOURS filters alike. This matches
  the semantics of the existing `level: "TOUS"` field and lets legacy banks
  remain visible without manual re-tagging.
- **`localStorage` persistence**: the home-view level filter survives page
  reloads so a BEPC student always lands on BEPC banks. Wrapped in try/catch
  for SSR/private-mode safety.
- **Conservative in-bank level filter**: when both a difficulty filter and an
  in-bank level filter are active, the live count uses `Math.min(difficultyCount,
  levelCount)` because we don't have a per-(difficulty × level) matrix
  client-side. The server-side session creation is precise.

Stage Summary
- 9/9 deliverables complete and integrated ✓
- 2 new scripts (categorize-levels.ts, apply-education-levels-to-db.ts)
- 1 new component (education-level-selector.tsx)
- 7 modified files: schema.prisma, src/lib/cache.ts, src/lib/types.ts,
  src/app/api/banks/route.ts, src/app/api/admin/banks/route.ts,
  src/app/api/admin/questions/route.ts, src/app/api/import-questions/route.ts,
  src/components/quiz/home-view.tsx, src/components/quiz/start-dialog.tsx,
  src/components/quiz/bank-detail-view.tsx, src/components/quiz/admin/types.ts,
  src/components/quiz/admin/admin-banks.tsx
- 0 lint errors, 0 TypeScript errors, 0 existing features broken
- Database NOT reset — only new columns + new field values added
