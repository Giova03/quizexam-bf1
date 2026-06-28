# Task P8 — Analytics avancées + Modération + Gestion des rôles

**Task ID:** P8
**Agent:** P8 (Z.ai Code)
**Date:** 2026-06-27

## Task
Implement 3 features:
1. Dashboard analytics avancé (admin analytics API + admin-analytics component + Analytics tab)
2. Système de modération (Report model + reports APIs + moderation-panel component + Modération tab)
3. Gestion des rôles (expand User.role usage + role PATCH API + role-aware VisitorsStats with dropdown)

## Work Log

### Read prior context
- Read /home/z/my-project/worklog.md (1078 lines through P7) and noted the prior P2–P7 work records in /home/z/my-project/agent-ctx/.
- Read existing prisma/schema.prisma, src/lib/auth.ts, src/lib/db.ts, src/app/api/admin/users/route.ts, src/app/api/admin/stats/route.ts to understand the established patterns (admin auth gating via `(session.user as {role?: string}).role !== "ADMIN"` → 403; `db` from `@/lib/db`; `getServerSession(authOptions)` for auth).
- Read src/components/quiz/admin-view.tsx (2024 lines) to understand the existing tab navigation pattern (array of `{id, label, icon}` rendered as buttons) and the existing `VisitorsStats` component structure (stats cards + scrollable user list).

### Feature 1 — Dashboard analytics avancé

1. **src/app/api/admin/analytics/route.ts** (NEW, ~140 lines):
   - `GET /api/admin/analytics` (admin-only, returns 403 otherwise)
   - **Engagement metrics**: computes `startOfToday`, `startOfWeek` (ISO Monday), `startOfMonth` and runs `db.quizSession.count({where:{startedAt:{gte:...}}})` for each. Also computes `avgSessionsPerUser = round(totalSessions/totalUsers, 2)`.
   - **Most failed questions (top 20)**: pulls all `SessionAnswer` rows where `isCorrect=false`, groups by `questionText` in a `Map` (Postgres/SQLite portable), sorts by `failures` desc, slices to 20.
   - **Activity heatmap (7 days × 24 hours)**: pulls `QuizSession` rows from the last 7 days, builds a 7×24 grid where `heatmap[row][hour]` is the count of sessions started at that hour. Row 0 = oldest (6 days ago), row 6 = today. Uses `Math.floor((startOfToday - dayStart) / 86400000)` to compute the day offset.
   - **Top 10 active users**: `db.user.findMany({select:{..., _count:{select:{sessions:true}}}, orderBy:{sessions:{_count:"desc"}}, take:10})`, filtered to users with `sessionCount > 0`.
   - Returns a single JSON object: `{engagement, failedQuestions, heatmap, topUsers, generatedAt}`.

2. **src/components/quiz/admin-analytics.tsx** (NEW, ~390 lines, `"use client"`):
   - Fetches `/api/admin/analytics` on mount, with loading skeleton + error state + retry button.
   - **KPI cards** (4-card grid, responsive `sm:grid-cols-2 lg:grid-cols-4`):
     - Sessions aujourd'hui (Calendar icon, emerald)
     - Sessions cette semaine (CalendarDays icon, violet)
     - Sessions ce mois (CalendarRange icon, amber)
     - Moy. sessions / utilisateur (Users icon, sky, with sub-line `totalSessions · totalUsers`)
   - **Most failed questions table** (left column on lg, full width on mobile): scrollable list (`max-h-96 overflow-y-auto`), each row shows rank number (rose circle), question text, and a "N échecs" badge. Empty state when no failed answers exist.
   - **Top 10 active users list** (right column on lg): scrollable list with rank-based avatar colors (gold/silver/bronze for top 3, emerald gradient for the rest), name, email, session count badge, and role label.
   - **Activity heatmap** (full-width card at bottom):
     - 7 rows × 24 cols grid with hour labels every 3 hours and French weekday labels (`Lun Mar Mer Jeu Ven Sam Dim` + day-of-month, computed dynamically from the last 7 days).
     - Each cell colored by `getHeatColor(value, max)`: 6 levels from `bg-muted/40` (0) to `bg-emerald-600` (>75% of max).
     - Hover shows a tooltip with the day, hour, and session count.
     - Non-zero cells display the count in white text.
     - Legend below: "Moins actif → Plus actif" color scale + peak activity indicator.
     - Horizontally scrollable on small screens (`overflow-x-auto`, `min-w-[640px]` inner).
   - Refresh button with spinning RefreshCw icon while refreshing.

3. **src/components/quiz/admin-view.tsx** (MODIFIED, +5 lines):
   - Added `BarChart3` (re-used, already imported) for the Analytics tab icon and `ShieldAlert` (new import from lucide-react) for the Modération tab icon.
   - Added 2 new entries to the tab array: `{id:"analytics", label:"Analytics", icon:BarChart3}` and `{id:"moderation", label:"Modération", icon:ShieldAlert}`.
   - Added 2 new conditional render blocks for the new tabs (after the Broadcast tab block): `{activeTab === "analytics" && <AdminAnalytics />}` and `{activeTab === "moderation" && <ModerationPanel />}`.
   - Imported `AdminAnalytics` from `./admin-analytics` and `ModerationPanel` from `./moderation-panel`.

### Feature 2 — Système de modération

1. **prisma/schema.prisma** (MODIFIED, +14 lines):
   - Added new `Report` model:
     ```prisma
     model Report {
       id         String   @id @default(cuid())
       reporterId String?
       reporter   User?    @relation(fields: [reporterId], references: [id], onDelete: SetNull)
       targetType String   // "forum_topic" | "forum_reply" | "post" | "comment" | "user" | "question" | "session" | "other"
       targetId   String
       reason     String
       status     String   @default("pending") // "pending" | "resolved" | "dismissed"
       createdAt  DateTime @default(now())
     }
     ```
   - Added `reports Report[]` back-relation on `User`.
   - Ran `bunx prisma db push --accept-data-loss` with explicit `DIRECT_URL` and `DATABASE_URL` env vars (Supabase PostgreSQL). Schema synced in 7.84s. Prisma client regenerated.
   - Bumped `PRISMA_CACHE_VERSION` in `src/lib/db.ts` from `p6-forum-profile-2025-v3` → `p8-analytics-moderation-roles-2025-v2` so the HMR-cached PrismaClient is replaced with a fresh one that knows about the `report` model.

2. **src/app/api/reports/route.ts** (NEW, ~95 lines):
   - `POST /api/reports` (auth required, returns 401 otherwise):
     - Validates body: `targetType` (must be in ALLOWED_TARGET_TYPES set: forum_topic, forum_reply, post, comment, user, question, session, other), `targetId` (non-empty), `reason` (non-empty, max 1000 chars).
     - Creates a `Report` with `reporterId = session.user.id`, `status = "pending"`.
     - Returns 201 with the created report.
   - `GET /api/reports` (admin-only, returns 403 otherwise):
     - Optional `?status=pending|resolved|dismissed` query filter.
     - Returns all reports ordered by `createdAt desc`, including the reporter's `{id, name, email}`.

3. **src/app/api/reports/[id]/route.ts** (NEW, ~55 lines):
   - `PATCH /api/reports/[id]` (admin-only, returns 403 otherwise):
     - Validates body: `status` (must be "pending" | "resolved" | "dismissed").
     - Returns 404 if report not found.
     - Updates the report status and returns the updated report.

4. **src/components/quiz/moderation-panel.tsx** (NEW, ~290 lines, `"use client"`):
   - Fetches `/api/reports` (with optional `?status=` filter) on mount and when filter changes.
   - **Filter tabs**: All / En attente / Résolu / Ignoré, each showing the count in parentheses. Active tab has emerald highlight.
   - **Reports list**: each report is a Card with:
     - Target-type icon (MessageSquare for forum/post/comment, User for user, HelpCircle for question, FileText for session, Flag default).
     - Status badge (color-coded: amber for pending, emerald for resolved, slate for dismissed).
     - Creation timestamp (French locale).
     - Reason text.
     - Target ID (truncated, monospace).
     - Reporter name/email (or "Utilisateur supprimé" if reporter is null).
     - Action buttons: "Résoudre" (emerald, only if not already resolved), "Ignorer" (outline, only if not already dismissed), "Rouvrir" (ghost, only if not pending).
   - Loading skeletons, empty state (Inbox icon + message), and refreshing button.
   - Local state update on status change (no full reload needed).

5. **src/components/quiz/admin-view.tsx** (MODIFIED — same edit as Feature 1, since both tabs were added together).

### Feature 3 — Gestion des rôles

1. **Expanded role usage**:
   - The `User.role` field already existed as `String @default("VISITOR")`. The task spec asks to expand usage to include "CONTRIBUTOR", "MODERATOR", "EXAMINER" (in addition to "VISITOR", "ADMIN").
   - No schema change needed (the field is a free-form String). The expansion is done at the API + UI level.

2. **src/app/api/admin/users/role/route.ts** (NEW, ~60 lines):
   - `PATCH /api/admin/users/role` (admin-only, returns 403 otherwise):
     - Validates body: `userId` (non-empty), `role` (must be in ALLOWED_ROLES set: VISITOR, CONTRIBUTOR, MODERATOR, EXAMINER, ADMIN).
     - Returns 404 if user not found.
     - Updates the user's role and returns `{id, name, email, role}`.

3. **src/components/quiz/admin-view.tsx** — `VisitorsStats` component (REWRITTEN, ~190 lines replacing the original ~95 lines):
   - Added 4 module-level constants:
     - `ROLE_OPTIONS`: array of `{value, label}` for the 5 roles (VISITOR → Administrateur).
     - `ROLE_BADGE_STYLES`: per-role Tailwind classes for the Badge component (slate/sky/violet/teal/amber).
     - `ROLE_AVATAR_STYLES`: per-role gradient classes for the avatar circle.
     - `ROLE_LABELS_FR`: per-role French labels.
   - **Top stats**: 1 card for total users + 1 wide card showing the role distribution (5 mini-cards in a `sm:grid-cols-5` grid, each with the count + role badge).
   - **User list**: scrollable (`max-h-[500px] overflow-y-auto`), each row shows:
     - Avatar with role-based gradient color.
     - Name + email.
     - Session count + creation date (on separate lines for mobile, inline for desktop).
     - **Role badge** (desktop only, `hidden md:inline-flex`) with role-specific color.
     - **Role change dropdown** (`<select>` element with the 5 role options, emerald focus ring, disabled while updating).
   - `handleRoleChange(userId, newRole)`:
     - PATCHes `/api/admin/users/role` with `{userId, role:newRole}`.
     - Updates local state on success.
     - Shows a success toast with the new role's French label.
     - Shows an error toast on failure.
   - Responsive layout: stacks vertically on mobile (`flex-col`), horizontal on `sm+`.

## Verification

- **`bun run lint` → 0 errors, 0 warnings** ✓
- **`bunx tsc --noEmit` → 2 errors, both PRE-EXISTING** (next.config.ts eslint key, pdf-upload-dialog.tsx null type — same 2 noted by P5 and P7, NOT introduced by P8) ✓
- **`bunx prisma db push` → schema synced to Supabase PostgreSQL in 7.84s, Prisma client regenerated** ✓

### End-to-end curl tests (as admin, all passed):
- **Step 1 — CSRF**: `GET /api/auth/csrf` → 200, returns csrfToken ✓
- **Step 2 — Sign in**: `POST /api/auth/callback/credentials` → 200 ✓
- **Step 3 — Session**: `GET /api/auth/session` → 200, returns `{user:{name:"Administrateur", role:"ADMIN"}}` ✓
- **Step 4 — Analytics**: `GET /api/admin/analytics` → 200 ✓
  - `engagement`: `{sessionsToday:2, sessionsThisWeek:32, sessionsThisMonth:35, avgSessionsPerUser:1.94, totalSessions:35, totalUsers:18}` ✓
  - `failedQuestions`: 20 items, top one is "Quelle est la principale caractéristique de l'approche systémique en travail social ?" with 6 failures ✓
  - `heatmap`: 7 rows × 24 cols ✓
  - `topUsers`: 10 items, top one is "Seraphin Nabooswende Zidouemba" with 10 sessions ✓
- **Step 5 — Reports GET**: `GET /api/reports` → 200, returns `[]` (empty) ✓
- **Step 6 — Reports POST**: `POST /api/reports` with `{targetType:"forum_topic", targetId:"test-p8-target", reason:"P8 test report"}` → 201, returns the created report with `status:"pending"` ✓
- **Step 7 — Admin users**: `GET /api/admin/users` → 200, returns 18 users ✓
- **Step 8 — Role PATCH**: `PATCH /api/admin/users/role` with `{userId, role:"CONTRIBUTOR"}` → 200, returns `{role:"CONTRIBUTOR"}` ✓; restore to VISITOR → 200 ✓
- **Step 9 — Reports PATCH**: `PATCH /api/reports/{id}` with `{status:"resolved"}` → 200, returns the updated report with `status:"resolved"` ✓

### Auth gating tests (without auth):
- `GET /api/admin/analytics` → 403 (admin-only) ✓
- `GET /api/reports` → 403 (admin-only) ✓
- `POST /api/reports` → 401 (auth required) ✓
- `PATCH /api/admin/users/role` → 403 (admin-only) ✓

## Stage Summary

- **Feature 1 ✅** (Analytics avancées): `/api/admin/analytics` returns engagement metrics (sessions today/week/month + avg/user), top 20 most-failed questions (grouped by questionText, isCorrect=false), 7×24 activity heatmap from QuizSession.startedAt, top 10 active users by session count. `admin-analytics.tsx` renders 4 KPI cards + failed-questions list + top-users list + colored 7×24 heatmap with legend. New "Analytics" tab in admin-view.tsx.
- **Feature 2 ✅** (Modération): `Report` Prisma model added (id, reporterId→User, targetType, targetId, reason, status, createdAt) with `db:push` synced. `/api/reports` (POST auth + GET admin) and `/api/reports/[id]` (PATCH admin) APIs. `moderation-panel.tsx` with filter tabs, status-colored badges, and resolve/dismiss/reopen buttons. New "Modération" tab in admin-view.tsx.
- **Feature 3 ✅** (Gestion des rôles): `User.role` field's usage expanded to 5 roles (VISITOR, CONTRIBUTOR, MODERATOR, EXAMINER, ADMIN) at API + UI level. `/api/admin/users/role` PATCH endpoint with strict role validation. VisitorsStats rewritten with role distribution stats card, per-user role badge (color-coded), and inline `<select>` dropdown to change roles (with optimistic local state update + toast feedback).
- **3 new files created** (api/admin/analytics/route.ts, api/reports/route.ts, api/reports/[id]/route.ts, api/admin/users/role/route.ts, components/quiz/admin-analytics.tsx, components/quiz/moderation-panel.tsx — 6 new files total)
- **3 files modified** (prisma/schema.prisma +14 lines, src/lib/db.ts cache-version bump, src/components/quiz/admin-view.tsx with new imports + 2 new tabs + rewritten VisitorsStats)
- **1 DB schema change** (new `Report` model + `reports` back-relation on `User`)
- **0 lint errors, 0 lint warnings, 0 new type errors**
- Work record written to: /home/z/my-project/agent-ctx/P8-analytics-moderation-roles.md
