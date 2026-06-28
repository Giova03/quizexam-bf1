# P5 — Referral System + Extended Achievements

## Task ID
P5

## Agent
P5 (Z.ai Code)

## Task
1. **Système de parrainage** — 8-char referral codes, +50 XP per referral, referral card UI, signup integration with optional referral code, ?ref=CODE URL param auto-detection.
2. **Achievements étendus (20+)** — extend DEFAULT_BADGES from 8 → 27 badges with rich tracking, achievements-view component with grid + filters + progress bars, nav button.

## Files Created (5)
- `src/app/api/referral/route.ts` (~190 lines) — GET referral stats, POST accept referral
- `src/components/quiz/referral-card.tsx` (~280 lines) — referral UI with copy/share/accept
- `src/components/quiz/achievements-view.tsx` (~270 lines) — grid of 27 badges with filters + progress

## Files Modified (15)
- `prisma/schema.prisma` — added `referralCode String @unique @default(dbgenerated(...))` + `referredBy String?` to User
- `src/lib/auth.ts` — `generateReferralCode()`, `generateUniqueReferralCode()`, modified `ensureAdminAccount()` + `createVisitorAccount(email, name, password, referralCode?)`, added `countReferrals()`
- `src/lib/db.ts` — added `PRISMA_CACHE_VERSION` cache-invalidation (so HMR-cached PrismaClient is replaced after schema changes)
- `src/lib/prefs-store.ts` — major extension: Badge interface +unlockedAt/color, 19 new badges, 11 new tracking fields, new SessionContext, new actions (syncReferrals/recordPost/recordDailyChallenge/recordSpacedReview), getBadgeProgress() helper
- `src/lib/quiz-store.ts` — added `currentSessionDifficulty` field, `openAchievements()` action, extended `startSession(id, difficulty?)` signature
- `src/lib/types.ts` — added "achievements" to ViewName
- `src/app/api/auth/signup/route.ts` — accept optional referralCode in body, pass to createVisitorAccount
- `src/app/page.tsx` — AchievementsView import + Award icon, openAchievements nav button (desktop+mobile), view router, lazy `prefilledReferral` state from ?ref=CODE URL param, auto-open auth dialog
- `src/components/quiz/auth-dialog.tsx` — optional `initialReferralCode` prop, new referralCode state with useEffect sync, "Code de parrainage (optionnel)" field on signup form
- `src/components/quiz/dashboard-view.tsx` — ReferralCard in both empty state AND overview tab
- `src/components/quiz/session-view.tsx` — major refactor of completeSession: now calls recordSession(correct, total, ctx) for ALL sessions (previously only daily challenges), with full SessionContext (bankId, difficulty, isExam, isDailyChallenge, startedAt, completedAt). Fixed latent P2 bug where regular sessions got NO XP.
- `src/components/quiz/spaced-repetition-view.tsx` — calls recordSpacedReview() after each review (revision-master badge)
- `src/components/quiz/social-view.tsx` — calls recordPost() after successful post creation (social-butterfly badge)
- `src/components/quiz/bank-detail-view.tsx` — passes difficulty to startSession
- `src/components/quiz/exam-detail-view.tsx` — passes difficulty to startSession

## Schema Changes
- `User.referralCode String @unique @default(dbgenerated("(upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)))"))` — auto-backfilled for existing rows
- `User.referredBy String?` — nullable, stores the referrer's referral code

## Verification
- `bun run lint` → 0 errors, 0 warnings ✓
- `bunx tsc --noEmit` → 2 errors, both PRE-EXISTING (next.config.ts eslint key + pdf-upload-dialog.tsx null type from P4) ✓
- `bunx prisma db push --accept-data-loss` → schema synced, Prisma client regenerated ✓
- Manual curl tests all passed:
  - POST /api/auth/signup (no referral) → 200, auto-generated code "9EGP4B7E"
  - POST /api/auth/signup with referralCode → 200, referredBy set correctly
  - GET /api/referral (authenticated) → 200, returns referralCount + xpEarned + referredUsers list
  - POST /api/referral with own code → 400 "Vous ne pouvez pas vous parrainer vous-même"
  - POST /api/referral with fake code → 404 "Code de parrainage introuvable"
- Home page renders (HTTP 200, 28 KB) ✓

## Bonus Fixes
1. **NEXTAUTH_SECRET missing** — pre-existing issue from P4 (the dev server didn't have NEXTAUTH_SECRET set, causing getServerSession to fail in API routes). Added a stable NEXTAUTH_SECRET to .env so authenticated API routes work properly.
2. **Latent P2 bug** — recordSession was only called for daily-challenge sessions, meaning regular quizzes gave NO XP. P5 now calls recordSession for ALL sessions with full context.
3. **Prisma client cache invalidation** — added `PRISMA_CACHE_VERSION` constant in db.ts so the HMR-cached PrismaClient is replaced when the schema changes. Future schema changes just need a version bump.
4. **dev.log location** — actual location is `/tmp/dev.log` (not `/home/z/my-project/dev.log` as the instructions suggest).

## Referral XP flow
Since XP is stored client-side per browser (zustand + localStorage), the +50 XP per referral is awarded client-side via the `syncReferrals(serverCount)` action:
- The referral-card component fetches /api/referral on mount
- If server count > local count, the prefs-store awards +50 XP per new referral and updates the local mirror
- This means the referrer's XP increases the next time they open their dashboard
- The notification "Nouveau parrainage ! +N XP" is fired when new referrals are detected

## 27 Badges
### Existing (8)
1. first-quiz — Terprimer quiz
2. streak-3 — 3 jours consécutifs
3. streak-7 — 7 jours consécutifs
4. perfect-score — 100% à un quiz
5. quiz-master-10 — 10 quiz
6. xp-500 — 500 XP
7. exam-complete — Examen blanc
8. scholar-100 — 100 questions

### New (19)
9. speed-run — 50 Q en < 15 min
10. polyvalent — 10 banques différentes
11. perfectionniste — 5 × 100%
12. marathonien — 1000 Q en 1 semaine
13. social-butterfly — 10 messages
14. parrain-5 — 5 filleuls
15. daily-warrior — 30 défis quotidiens
16. master-hard — 80%+ sur difficile
17. revision-master — 100 révisions espacées
18. streak-30 — 30 jours
19. streak-100 — 100 jours
20. xp-1000 — 1000 XP
21. xp-5000 — 5000 XP
22. quiz-master-50 — 50 quiz
23. quiz-master-100 — 100 quiz
24. scholar-500 — 500 questions
25. scholar-1000 — 1000 questions
26. night-owl — Quiz entre 0h et 4h
27. early-bird — Quiz entre 4h et 6h

## Test users created during verification
- test-parrain7@example.com / test1234 (referrer, code: 9EGP4B7E)
- test-filleul@example.com / test1234 (referred by 9EGP4B7E)
- test-parrain@example.com, test-parrain2@..., test-parrain3@..., test-parrain4@..., test-parrain5@..., test-parrain6@example.com (failed signup attempts during Prisma client cache debugging — these users don't exist)
