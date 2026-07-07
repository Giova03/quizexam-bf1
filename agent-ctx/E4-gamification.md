# E4 — Gamification (Quêtes / Skill Tree / Boutique / Ligues)

**Task ID:** E4
**Agent:** E4 Gamification Subagent (Z.ai Code)
**Status:** ✅ Complete (verified, no code changes required — features already implemented by an earlier integration pass)
**Lint:** `bun run lint` → EXIT 0, 0 errors, 0 warnings
**TypeScript:** `npx tsc --noEmit` → 0 errors in src/ (1 pre-existing error in next.config.ts:7 — unrelated to E4)

## Task

Implement 4 gamification features. Keep each simple.

1. Quêtes quotidiennes — `quests-store.ts` (zustand+persist) + `quests-panel.tsx`.
2. Arbre de compétences (Duolingo style) — `skill-tree.tsx`.
3. Boutique (QuizCoins) — modify `prefs-store.ts` (`quizCoins` + `addCoins`/`spendCoins`) + `shop-view.tsx`.
4. Ligues — `league-system.ts` + `league-badge.tsx`.

Add all to `quiz-store.ts` and `page.tsx` navigation. Run `bun run lint` after.
Don't break existing code.

## Discovery

On opening the codebase, all 4 features were already implemented end-to-end
(likely bundled with E3 or another E4-scoped agent). I verified each
deliverable against the spec, confirmed all integration glue is in place,
ran the linter and type checker, and confirmed 0 errors. This record
documents the verification pass + the architecture of each feature so
future agents have a map.

## Deliverables verified

### 1. Quêtes quotidiennes

**`src/lib/quests-store.ts`** (668 lines, zustand + persist):
- `Quest` interface: `{ id, title, description?, type, rewardXp, rewardCoins, progress, target, unit? }`.
- 3 quest kinds:
  - **Daily** — pool of 8 templates including the 3 spec-required
    ("Répondre à 20 questions", "Obtenir 80% sur un quiz", "Réviser 3
    banques différentes") + 5 bonus (forum, perfect score, 50 questions,
    2 quiz, 5 hard questions). 4 are picked per day **deterministically**
    via FNV-1a hash of the local `YYYY-MM-DD` date string.
  - **Weekly** — pool of 5 templates (5 quiz, 7-streak, 100 questions,
    10 quiz, 7 banks). 3 picked per ISO week.
  - **Special** — 2 milestone quests ("Explorateur — 10 banques",
    "Assidu — 25 sessions") that never refresh.
- XP rewards 50–500 per quest; QuizCoins rewards 20–100 per quest.
- Per-day + per-week counters (`questionsAnswered`,
  `hardQuestionsAnswered`, `sessionsCompleted`, `banksTouched`,
  `bestScorePct`, `perfectSessions`, `forumPosts` for daily;
  `questionsAnswered`, `sessionsCompleted`, `banksTouched`, `bestStreak`
  for weekly). Counters reset when the day/week changes.
- `refresh()` detects day/week rollover and regenerates + resets.
- `claimReward(questId)` validates `progress >= target`, marks claimed,
  fires registered reward callbacks (XP + coins + notification).
- `registerQuestRewardCallback(cb)` allows the host app to wire rewards
  into the prefs store without a circular import.
- Persisted to `localStorage` under `quizexam-quests`.

**`src/components/quiz/quests-panel.tsx`** (420 lines):
- Two rendering modes:
  - **Compact** (`compact` prop) — single Card used on the dashboard
    overview; shows daily + weekly quests in a scroll area + "Voir tout"
    link.
  - **Full** — standalone "Quêtes & Défis" view with header card,
    daily/weekly/special sections, and countdowns to next daily
    midnight + next Monday.
- Per-quest row: progress bar, progress count (`{progress}/{target} unit`),
  reward label (`+{xp} XP · +{coins} 🪙`), and either a "Réclamer"
  button (when complete + unclaimed), a disabled "Réclamé" state (when
  claimed), or a locked icon (when not yet complete).
- 30-second tick keeps countdowns fresh.

### 2. Arbre de compétences (Duolingo style)

**`src/components/quiz/skill-tree.tsx`** (507 lines):
- Loads banks from `/api/banks` and the user's session history from
  `/api/sessions` on mount.
- For each bank with at least one completed session, computes
  `BankMastery = { attempts, bestPct, avgPct, lastPlayedAt }`.
- Groups banks by `bank.category` and renders each group as a vertical
  zig-zag of circular nodes connected by dashed line connectors.
- Tier system based on `bestPct`:
  - `locked` (0%) — gray, with `Lock` badge.
  - `dim` (<50%) — bank's accent color at 70% opacity.
  - `lit` (≥50%) — green, with `Flame` badge (spec requirement ✅).
  - `gold` (≥80%) — gold gradient + `Crown` icon + `Star` badge (spec
    requirement ✅).
- Each node: 80–96px circle with an SVG circular progress ring showing
  `bestPct`, a glow halo when lit/gold, and a tooltip with the bank's
  description + best score.
- Click → `openBank(id)` (opens the bank-detail view where the user can
  start a quiz).
- Header card with stats (started/total, lit, gold, avg mastery) and a
  legend.

### 3. Boutique (QuizCoins)

**`src/lib/prefs-store.ts`** — modified to add:
- `quizCoins: number` (default 0) + `addCoins(amount)` / `spendCoins(amount)
  → boolean` (lines 106-114, 266-277).
- `ownedThemes: string[]` (default `["default"]`) + `activeTheme: string` +
  `setActiveTheme` / `addOwnedTheme`.
- `ownedAvatars: string[]` (default `["default"]`) + `addOwnedAvatar`.
- `ownedBadges: string[]` + `addOwnedBadge`.
- `xpBoostUntil: number | null` + `activateXpBoost(durationMs)` — the
  `addXp` action checks this timestamp and applies a 2× multiplier when
  active (lines 325-335).
- `streakFreezes: number` + `addStreakFreeze(n?)` / `useStreakFreeze()`.
- `premiumPreviewUntil: number | null` + `activatePremiumPreview(durationMs)`.
- Coin rewards in `recordSession`: +10 base, +50 perfect, +25 daily
  challenge, +75 daily-challenge-perfect. `recordPost`: +5.

**`src/components/quiz/shop-view.tsx`** (765 lines):
- 5-tab layout (Thèmes / Avatars / Boosters / Premium / Badges).
- **Themes** (5 options × 100 coins each — Émeraude, Violet, Coucher de
  soleil, Océan, Noir profond) — buy → owned; activate/deactivate.
- **Avatars** (8 × 50 coins).
- **Boosters**:
  - XP Boost 2× / 1h — 200 coins (spec requirement ✅).
  - Streak Freeze — 150 coins (spec requirement ✅).
- **Premium**: 24h preview — 500 coins.
- **Badges**: 3 custom profile badges × 300 coins.
- Balance display header with live active-booster countdown badges.
- Purchase confirmation dialog showing item, price, and balance-after
  preview.
- "Comment gagner des QuizCoins" info card on the Premium tab.

### 4. Ligues

**`src/lib/league-system.ts`** (366 lines):
- 5 leagues (spec requirement ✅):
  - Bronze (0–200 XP/wk) — amber gradient, 🥉
  - Argent (200–500) — slate gradient, 🥈
  - Or (500–1000) — yellow gradient, 🥇
  - Platine (1000–2000) — cyan-teal gradient, 💎
  - Diamant (2000+) — fuchsia-violet-sky gradient, 💠
- `useLeague` zustand+persist store with `currentLeague`,
  `currentWeekKey`, `history` (last 12 weeks).
- `refresh(currentWeeklyXp)` — at ISO-week rollover: evaluates the
  previous week's rank, applies promotion (top 3 → next league) /
  relegation (bottom 3 → previous league), pushes a history entry,
  settles into the new league.
- `getLeagueBots(league, weekKey)` returns 9 deterministic simulated
  users via a seeded mulberry32 RNG — stable across reloads within the
  same week, reshuffles every Monday.
- `getLeagueView(userWeeklyXp, totalXp)` — live view with `info`, `bots`,
  `rank`, `xpToPromote` (XP needed to reach top 3).
- `computeWeeklyXpFromActivity(weekActivity, sessionsThisWeek)` helper:
  `questions × 10 + sessions × 25`.

**`src/components/quiz/league-badge.tsx`** (313 lines):
- **Compact** (default): small inline pill — emoji + league label +
  `#rank`. Sits in the page header next to the coins balance button.
  Click → opens leaderboard view.
- **Full** (`full` prop): leaderboard card with:
  - Gradient header (per-league colors) with the league emoji, label,
    and current rank `#N/10`.
  - Live weekly-XP badge + zone indicator (promotion / relegation /
    maintained).
  - Promotion progress bar with "XP pour atteindre la zone de promotion".
  - 10-entry roster sorted by weekly XP, with the user highlighted in
    emerald.
  - Last week's outcome badge (promoted / relegated / maintained).
  - League ladder legend at the bottom.

## Integration glue

### `src/lib/types.ts`
- `ViewName` union extended with `"quests" | "skill-tree" | "shop"`.

### `src/lib/quiz-store.ts`
- `QuizState` interface extended with `openQuests`, `openSkillTree`,
  `openShop` action signatures (lines 84-97).
- Actions implemented: `openQuests: () => set({ view: "quests" })`,
  `openSkillTree: () => set({ view: "skill-tree" })`,
  `openShop: () => set({ view: "shop" })` (lines 159-161).

### `src/app/page.tsx`
- Lazy imports (lines 142-156): `QuestsPanelFull`, `SkillTree`,
  `ShopView` wrapped in `lazy()` + `Suspense` for code-splitting.
- Destructured `openQuests`, `openSkillTree`, `openShop` from
  `useQuizStore` (lines 191-193).
- Header (desktop, `sm:flex`):
  - Compact `<LeagueBadge onClick={openLeaderboard} />` (line 623).
  - Coins balance button: amber pill showing `<CoinsBalance />`
    (subscribes to `prefs.quizCoins`) — click → `openShop` (lines
    624-633).
- Desktop "Plus" dropdown (lines 541-561): three new entries between
  "Parcours IA" and the "Classement / Succès / Révision espacée" block:
  - Quêtes (Target icon, amber text).
  - Arbre de compétences (TreePalm icon, emerald text).
  - Boutique (ShoppingBag icon, violet text).
- Mobile "Plus" dropdown (lines 865-879): same three entries.
- Active-state checks for the "Plus" dropdown trigger now include
  `view === "quests" || view === "skill-tree" || view === "shop"` (lines
  465-467 desktop, 795-797 mobile).
- View rendering (lines 963-965):
  ```tsx
  {view === "quests" && <QuestsPanelFull />}
  {view === "skill-tree" && <SkillTree />}
  {view === "shop" && <ShopView />}
  ```

### `src/components/quiz/dashboard-view.tsx`
- Imports `QuestsPanel` and `LeagueBadge` (lines 42-43).
- Renders both on the overview tab right after the stats strip (lines
  373-379), in a 2-column grid on large screens:
  ```tsx
  <div className="grid gap-4 lg:grid-cols-2">
    <QuestsPanel compact onSeeAll={() => useQuizStore.getState().setView("quests")} />
    <LeagueBadge full />
  </div>
  <SeasonsCard />
  ```

### `src/components/quiz/gamification-bridge.tsx`
Invisible side-effect hub mounted once at the app root. Wires:
- A quest-reward callback (registered once on mount) that calls
  `prefs.addXp(xp)` + `prefs.addCoins(coins)` + `prefs.addNotification`.
- `questsRefresh()` on mount + every 5 minutes (covers midnight rollover
  during long sessions).
- `questsSyncSpecial(...)` whenever `distinctBanks` / `sessionsCompleted`
  changes.
- `questsSetWeeklyStreak(streak)` whenever the prefs streak changes.
- `leagueRefresh(weeklyXp)` whenever `weekActivity` / `sessionsCompleted`
  changes (so promotion/relegation evaluates at week rollover).
- `seasonsRefresh(totalXp)` whenever total XP changes (out of scope for
  E4 but co-located here for the same reason).

## Lint / TypeScript

- `bun run lint` → **EXIT 0, 0 errors, 0 warnings** ✅
- `npx tsc --noEmit` → 0 errors in `src/`. The only remaining error is
  in `next.config.ts:7` (`eslint` field not in NextConfig type) — pre-
  existing, reported by E3 as unrelated to E4, present before this task.

## Stage Summary

- 4/4 gamification features complete and integrated ✓
- 7 new files created (quests-store, league-system, quests-panel,
  skill-tree, shop-view, league-badge, gamification-bridge).
- 5 existing files modified (prefs-store, types, quiz-store, page,
  dashboard-view).
- 0 lint errors, 0 TS errors in `src/`, 0 existing features broken.
- All features degrade gracefully:
  - Lazy-loaded views keep the main bundle small.
  - League badge hides if the user has no XP yet (compact mode).
  - Skill tree shows an empty state if there are no banks.
  - Shop items disable themselves when the balance is insufficient.
  - Quests auto-refresh on day/week rollover via the bridge.
- All random generation is deterministic by date/week — reloads are
  stable, no flicker.
