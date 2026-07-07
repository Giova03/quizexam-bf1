# Task E5 — Social Features (Messagerie, Mentorat, Wiki, Sessions live)

**Agent**: E5 Social Subagent (Z.ai Code)
**Date**: 2026-07-07
**Scope**: Implement 4 social features without modifying the Prisma schema.

## Summary

4 social features added to the platform, all on top of existing Prisma
models (`Post`, `Article`, `Event`, `User`, `QuizSession`). No schema
changes, no migrations, no new tables.

| # | Feature              | Storage strategy                                                                | API                                              | View                              |
|---|----------------------|---------------------------------------------------------------------------------|--------------------------------------------------|-----------------------------------|
| 1 | Messagerie privée    | `Post.type="message"` + `tags="to:<recipientId>"`                               | `/api/messages`                                  | `messages-view.tsx`               |
| 2 | Mentorat             | `Post.type="mentorship-request"` + `tags="mentor:<id>,status:<state>"`          | `/api/mentorship` (GET/POST/PATCH)               | `mentorship-view.tsx`             |
| 3 | Wiki collaboratif    | `Article.category` prefixed with `wiki-` (e.g. `wiki-general`, `wiki-culture`)  | `/api/wiki` (GET/POST) + `/api/articles/[id]`    | `wiki-view.tsx`                   |
| 4 | Sessions live        | `Event.type="live-session"` + `description=JSON({bankId, hostName})`            | `/api/live-sessions` + `/api/live-sessions/join` | `live-sessions-view.tsx`          |

## Files created (7)

1. `src/app/api/messages/route.ts` (~280 lines)
   - GET `/api/messages` — returns conversation list with last message +
     unread count (heuristic: messages received in the last 24h).
   - GET `/api/messages?with=USERID` — returns the full thread between
     the current user and USERID.
   - POST `/api/messages { toUserId, content }` — sends a private
     message. Validates recipient exists, content non-empty, ≤ 4000
     chars, and that the user isn't messaging themselves.
2. `src/app/api/mentorship/route.ts` (~340 lines)
   - GET `/api/mentorship` — returns `{ mentors, myRequests,
     incomingRequests, myMentor, myMentees }`. Mentors = ADMIN users +
     top 10 non-admin users by XP (computed from `QuizSession`:
     `totalCorrect * 10 + sessionCount * 5`).
   - POST `/api/mentorship { mentorId, message? }` — creates a pending
     request. Refuses duplicates (pending or accepted) to the same
     mentor.
   - PATCH `/api/mentorship { requestId, action: "accept"|"decline" }`
     — lets the mentor accept or decline a pending request addressed
     to them.
3. `src/app/api/wiki/route.ts` (~190 lines)
   - GET `/api/wiki?category=…&mine=1&limit=…` — lists published wiki
     articles (category starts with `wiki-`). With `mine=1`, includes
     the user's own drafts.
   - POST `/api/wiki { title, content, excerpt?, category?, published?,
     featuredImage? }` — creates a wiki article (auth required).
4. `src/app/api/live-sessions/route.ts` (~200 lines)
   - GET `/api/live-sessions?all=1` — lists upcoming live sessions
     (type=`live-session`). Default: hide sessions older than 3h.
   - POST `/api/live-sessions { title, bankId, scheduledAt }` — creates
     a live session (auth required).
5. `src/app/api/live-sessions/join/route.ts` (~90 lines)
   - POST `/api/live-sessions/join { sessionId }` — validates the
     session exists + is a live session, returns the session details +
     the underlying bank so the client can navigate to it.
6. `src/components/quiz/messages-view.tsx` (~550 lines)
   - Auth-gated. Conversation list (left) → thread view (right).
   - Send messages with Enter (Shift+Enter for newline).
   - New conversation dialog with live user search (debounced 300ms,
     uses `/api/users?search=…`).
   - Auto-polls conversations (30s) and the active thread (15s).
   - Auto-scrolls to the latest message.
7. `src/components/quiz/mentorship-view.tsx` (~480 lines)
   - Auth-gated. 3-tab layout: Mentors / Mes demandes / Reçues.
   - Summary cards at the top: "Mon mentor" + "Mes mentorés".
   - Mentor cards show XP, session count, average score, bio,
     establishment, Admin/Expert badges.
   - "Demander" opens a dialog with an optional message.
   - Mentors can accept/refuse incoming requests inline.

8. `src/components/quiz/wiki-view.tsx` (~570 lines)
   - Public read access (list + detail). Create/edit gated to
     authenticated users (treated as contributors — same rule as the
     blog).
   - Category filter dropdown.
   - Grid of cards with cover image, title, excerpt, category badge,
     author avatar, date.
   - Detail view renders the full article with prose styling.
   - Inline `WikiEditor` sub-component (Dialog) for create + edit
     (calls `/api/wiki` for create, `/api/articles/[id]` for PATCH/
     DELETE since wiki articles live in the Article table).
   - Preview toggle in the editor.
9. `src/components/quiz/live-sessions-view.tsx` (~470 lines)
   - Auth-gated. Lists upcoming + live sessions with countdowns.
   - Live badge (animated pulse) when the session is in progress
     (started within the last hour).
   - "Hôte" badge on sessions you created.
   - "Inscrit" badge on sessions you've joined (tracked in
     localStorage).
   - Create dialog with title + bank selector (loads banks from
     `/api/banks`) + datetime-local input (defaults to now + 1h).
   - Join button calls `/api/live-sessions/join` then navigates to the
     bank via `openBank(id)` so the user can start a quiz.

## Files modified (3)

1. `src/lib/types.ts` — added 4 entries to the `ViewName` union:
   `"messages" | "mentorship" | "wiki" | "live-sessions"`.
2. `src/lib/quiz-store.ts` — added 4 actions: `openMessages`,
   `openMentorship`, `openWiki`, `openLiveSessions` (each just
   `set({ view: … })`).
3. `src/app/page.tsx` — 4 changes:
   - Imported 4 new icons: `Mail`, `UserCheck`, `BookOpen`, `Radio`.
   - Lazy-loaded the 4 new views (`MessagesView`, `MentorshipView`,
     `WikiView`, `LiveSessionsView`).
   - Destructured the 4 new `open*` actions from `useQuizStore`.
   - Added 4 entries to both desktop + mobile "Plus" dropdown menus
     (between Blog and Parcours IA): Messagerie (violet), Mentorat
     (emerald), Wiki (emerald), Sessions live (rose).
   - Added the 4 new views to the active-state check on the Plus
     dropdown trigger (desktop + mobile).
   - Rendered the 4 new views inside the existing `<Suspense>` block
     after the E4 gamification views.

## Lint / TS

- `bun run lint` → EXIT 0, 0 errors, 0 warnings.
- `npx tsc --noEmit` → 1 pre-existing error in `next.config.ts:7`
  (`eslint` field not in `NextConfig` type — present before E5,
  reported by every prior agent).

## Notes / design decisions

- **No schema change.** All 4 features reuse existing tables. The
  "type discriminator" + "JSON-encoded metadata in tags/description"
  pattern keeps everything in one row per item.
- **Storage conventions**:
  - Messages: `Post.type="message"`, `tags="to:<recipientId>"`.
  - Mentorship: `Post.type="mentorship-request"`,
    `tags="mentor:<mentorId>,status:<pending|accepted|declined>"`.
  - Wiki: `Article.category` with `wiki-` prefix.
  - Live sessions: `Event.type="live-session"`,
    `description=JSON.stringify({bankId, bankTitle, hostName})`.
- **Mentor discovery** mirrors the leaderboard formula
  (`totalCorrect * 10 + sessionCount * 5`) so XP values are
  consistent across the app.
- **Live session "join" is simulated**: the join endpoint just returns
  the session details + the underlying bank; the client navigates to
  the bank via `openBank(id)`. Joined state is tracked in
  localStorage (key `qebf-joined-live-sessions`) so the user sees
  an "Inscrit" badge on sessions they've joined.
- **Polling**: messages view polls conversations every 30s and the
  active thread every 15s; live sessions view polls every 60s so
  countdowns stay fresh. Both stop polling when the user is
  unauthenticated.
- **Public wiki access**: unauthenticated users can browse and read
  published wiki articles (same rule as the blog). Creating / editing
  requires authentication.
- **All views degrade gracefully**: empty states with icons + helper
  text, loading skeletons, network error toasts.
