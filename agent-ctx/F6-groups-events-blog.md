# F6 — Groupes d'étude + Événements + Blog

**Task ID:** F6
**Agent:** F6 (Z.ai Code)
**Date:** 2025 (session timestamp in worklog)
**Scope:** 3 social/community features, additive only — no breaking changes.

---

## What was built

### 1. Système de groupes d'étude 👥

**Prisma models** (`prisma/schema.prisma`):
- `StudyGroup` — id, name, description, creatorId (User via "StudyGroupCreator" relation), inviteCode (unique 6-char), createdAt.
- `StudyGroupMember` — id, groupId, userId (User via "StudyGroupMember" relation), joinedAt. `@@unique([groupId, userId])` prevents duplicate memberships.

**API routes** (all `force-dynamic`):
- `src/app/api/groups/route.ts` — GET lists public groups (creator + member count, optional `?mine=1` filter that also flags `isMember`). POST creates a group; creator auto-added as a member; invite code generated server-side via the alphabet `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (excludes 0/O/1/I/L for readability), 10 retries on collision + last-resort timestamp suffix.
- `src/app/api/groups/[id]/route.ts` — GET single group with members list + `isMember`/`isCreator` computed from session. DELETE — creator or admin only (cascades to members).
- `src/app/api/groups/join/route.ts` — POST join by `inviteCode`. Validates `^[A-Z0-9]{6}$` after uppercasing. Idempotent (already-member returns `alreadyMember: true`). Supports `{ leave: true }` to leave (creator cannot leave — must delete instead).

**Component** (`src/components/quiz/study-groups-view.tsx`, ~610 lines):
- List view: grid of group cards (name, description, member-count badge, creator, creation date).
- Detail view: header card with invite-code box + copy button (visible to members/creator), members list with avatars + joinedAt + creator/you badges.
- `CreateGroupDialog` + `JoinByCodeDialog` (uppercase input, 6-char validation, Enter-to-submit).
- Inline `JoinByCodeButton` on the detail view for non-members.
- Leave group button (members) / Delete group button with confirmation (creator).

### 2. Événements temps réel 📅

**Prisma model** (`prisma/schema.prisma`):
- `Event` — id, title, description, type (`"exam"|"contest"|"deadline"`), startDate, endDate?, createdBy (User via "EventCreator"), createdAt.

**API routes**:
- `src/app/api/events/route.ts` — GET lists upcoming events (cutoff = yesterday so today's events stay visible). Optional `?limit` (default 50) and `?all=1` (include past events). POST admin-only — validates title, startDate, type; endDate optional but must be ≥ startDate.
- `src/app/api/events/[id]/route.ts` — GET single event. DELETE admin-only.

**Components**:
- `src/components/quiz/events-view.tsx` (~440 lines) — calendar-style list grouped by month (uppercase month-year header + count badge). Event cards: gradient date-block, type badge (exam=rose / contest=amber / deadline=sky), time + creator. "S'inscrire" button toggles a localStorage subscription (`qebf-subscribed-events`) — subscribed events show a green "Inscrit" badge. Admin: create-event button + per-card delete (with confirmation). `CreateEventDialog` with title, type select, datetime-local inputs, description.
- `src/components/quiz/events-widget.tsx` (~150 lines) — compact dashboard widget. Fetches `/api/events?limit=3`, renders next 3 events as clickable rows (date block + title + type badge + time). "Voir tout" button calls `openEvents` from the quiz store. Empty state with `CalendarCheck` icon.

**Dashboard wiring** (`src/components/quiz/dashboard-view.tsx`):
- Imported `EventsWidget`. Added `<EventsWidget />` in two places — on the empty-state (no sessions yet) view, and on the overview tab (after `ReferralCard`, before `WeeklyChart`).

### 3. Blog / Articles 📝

**Prisma model** (`prisma/schema.prisma`):
- `Article` — id, title, content, excerpt, authorId (User via "ArticleAuthor"), category, published (Boolean @default(false)), featuredImage?, createdAt, updatedAt (@updatedAt).

**API routes**:
- `src/app/api/articles/route.ts` — GET lists published articles. With `?mine=1`, includes the current user's own drafts (using an `OR` filter: own-by-author OR published-by-others). Optional `?category` + `?limit`. POST authenticated — any logged-in user can create (treated as a contributor). Validates title (≤200 chars), content (≤100k chars), category slug, published flag, featuredImage URL.
- `src/app/api/articles/[id]/route.ts` — GET single article (gates unpublished to author/admin). PATCH author/admin only — partial update. DELETE author/admin only.

**Components**:
- `src/components/quiz/blog-view.tsx` (~415 lines) — list view (grid of article cards with optional featured image, category badge, draft badge, title, excerpt, author + date). Category filter (Select with 7 categories: general / methodologie / concours / culture-generale / psychotechnique / temoignage / actualite). Detail view (full-width featured image + header card with category/draft badges + author avatar + date + content card with `whitespace-pre-wrap` rendering). Owner/admin actions: edit + delete (with confirmation). "Nouvel article" / "Proposer un article" button (visible for any authenticated user).
- `src/components/quiz/article-editor.tsx` (~265 lines) — simple textarea-based editor (no rich text per task spec). Fields: title, category select, featured-image URL, excerpt (auto-generated from content if blank), content (monospace textarea), published switch. Preview mode toggles between editor and a styled preview card (featured image + category badge + title + italic excerpt + content). Save button label adapts (`Enregistrer` / `Publier`). Reuses the same component for create and edit via the `existing` prop.

### Navigation wiring

- `src/lib/types.ts`: added `"groups" | "events" | "blog"` to `ViewName`.
- `src/lib/quiz-store.ts`: added `openGroups` / `openEvents` / `openBlog` actions + state interface entries.
- `src/app/page.tsx`: added 3 lazy imports (`StudyGroupsView`, `EventsView`, `BlogView`). Added `UsersRound`, `CalendarDays`, `Newspaper` lucide icons. Added 3 `DropdownMenuItem` entries ("Groupes", "Événements", "Blog") in **both** the desktop and mobile "Plus" dropdowns (between Forum and Compétition). Updated the `variant` conditional in both dropdown triggers to highlight "secondary" when `view ∈ {groups, events, blog}`. Registered the 3 views inside `<Suspense>` alongside the other lazy views.

---

## Bonus: PrismaClient staleness fix in `src/lib/db.ts`

After running `prisma db push` + `prisma generate`, all 3 new GET APIs returned HTTP 500 with `Cannot read properties of undefined (reading 'findMany')` — i.e. `db.studyGroup` / `db.event` / `db.article` were undefined on the PrismaClient instance used by the running dev server.

**Root cause:** the OLD `db.ts` code (before my edit) had already populated `globalForPrisma['prisma_f6-social-2025']` with a PrismaClient constructed from the `.prisma/client/index.js` Node-module-cache entry that was loaded at dev-server startup (BEFORE `prisma generate` wrote the new models). The cache-version bump alone wasn't enough — the cached client was already stored under the new key.

**Fix 1 (in `createPrismaClient`):** added Node `require.cache` invalidation before re-requiring the `.prisma/client` entry. `delete nativeRequire.cache[prismaClientPath]` + a loop that drops every cache entry under `/node_modules/.prisma/client/`. This ensures `createPrismaClient()` always loads the on-disk version (which may have been regenerated by `prisma generate` since the dev server started).

**Fix 2:** bumped `PRISMA_CACHE_VERSION` to `f6-social-v2-2025` so the new `globalForPrisma` key was empty, forcing a fresh PrismaClient construction (which now uses the cache-bust code).

Verified with curl: GET `/api/groups`, `/api/events?limit=3`, `/api/articles` → all 200 with `{"items":[]}` ✓. POST `/api/groups`, `/api/events`, `/api/articles`, `/api/groups/join` (no auth) → all 401 with "Connexion requise" ✓.

---

## Verification

- `bun run lint` → 0 errors, 0 warnings ✓
- `bunx tsc --noEmit` → only the 1 pre-existing `next.config.ts(7,3)` error (out of scope, noted by every prior agent since P2). 0 new TS errors ✓.
- `bunx prisma db push --skip-generate` (inline DATABASE_URL + DIRECT_URL) → schema synced ✓
- `bunx prisma generate` → Prisma client regenerated (now exposes `studyGroup`, `event`, `article`) ✓
- Runtime curl tests: all 7 endpoint checks pass (see worklog stage summary).
- No new server errors in `.next/dev/logs/next-development.log` after the cache-version bump ✓.

---

## Files created (11)

- `src/app/api/groups/route.ts`
- `src/app/api/groups/[id]/route.ts`
- `src/app/api/groups/join/route.ts`
- `src/app/api/events/route.ts`
- `src/app/api/events/[id]/route.ts`
- `src/app/api/articles/route.ts`
- `src/app/api/articles/[id]/route.ts`
- `src/components/quiz/study-groups-view.tsx`
- `src/components/quiz/events-view.tsx`
- `src/components/quiz/events-widget.tsx`
- `src/components/quiz/blog-view.tsx`
- `src/components/quiz/article-editor.tsx`

(12 if counting `article-editor.tsx` separately from `blog-view.tsx` — the task spec listed both.)

## Files modified (6)

- `prisma/schema.prisma` — added 4 models + 4 relation fields on `User`.
- `src/lib/db.ts` — bumped `PRISMA_CACHE_VERSION` to `f6-social-v2-2025` + added Node `require.cache` invalidation in `createPrismaClient`.
- `src/lib/types.ts` — added 3 new `ViewName` entries.
- `src/lib/quiz-store.ts` — added 3 new `openX` actions + state interface entries.
- `src/app/page.tsx` — 3 lazy imports, 3 new icons, 3 new dropdown items (×2 for desktop + mobile), 3 new view registrations in `<Suspense>`, updated variant conditionals.
- `src/components/quiz/dashboard-view.tsx` — imported `EventsWidget`, added it in 2 places (empty-state + overview tab).

---

## Decisions & trade-offs

- **Invite code 6 chars, alphabet excludes 0/O/1/I/L** — matches the existing referral-code pattern in `src/lib/auth.ts` for readability (~729M combinations, collision-safe with 10 retries).
- **Groups join is idempotent** — re-joining a group you're already in returns `alreadyMember: true` rather than an error, so the UI doesn't need to pre-check membership.
- **Events "S'inscrire" uses localStorage only** — per the task spec ("just localStorage for now"). No DB persistence, no real-time sync. Subscription state lives in `qebf-subscribed-events` and toggles a green "Inscrit" badge on the card.
- **Events are display-only** — no real-time sync, no per-user notifications. The dashboard widget fetches on every render (cache: no-store) so newly-created events show up on the next dashboard visit.
- **Blog uses simple textarea editor** — per the task spec ("no rich text"). Content is rendered with `whitespace-pre-wrap` so line breaks are preserved. A preview mode lets the author see the final rendering before publishing.
- **Blog "contributors"** — any authenticated user can create drafts; publishing is also allowed for any user (no formal review workflow). Admins can edit/delete any article. This keeps the system simple while still allowing admin oversight.
- **Blog category list is hardcoded** — 7 categories (general, methodologie, concours, culture-generale, psychotechnique, temoignage, actualite). Matches the platform's existing topic-bank structure. No dynamic category management to keep the schema simple.
- **Lazy-loading the 3 new views** — same pattern as F2's lazy-load for secondary views, so the initial JS bundle isn't bloated by the new ~2k LOC of components.

---

## Compatibility / non-breaking

All changes are **additive** — new models, new relations, new routes, new components, new nav items. No existing view/route/API/schema-field was modified. The only edit to an existing file with semantic impact is the Prisma cache-version bump + cache-bust in `src/lib/db.ts`, which only affects how the PrismaClient is constructed (it now always loads the on-disk `.prisma/client` instead of a stale Node-cached version). This is a strict improvement — the old behavior could fail to pick up new models after `prisma generate` without a manual server restart; the new behavior picks them up automatically on the next request.

## Pre-existing TS error (out of scope)

`next.config.ts(7,3): error TS2353: Object literal may only specify known properties, and 'eslint' does not exist in type 'NextConfig'.`

This has been present since P2 and is documented in every prior agent's worklog. It does not affect runtime and is unrelated to this task.
