# Task P9 — PWA installable + Accessibilité + Mode Compétition + Générateur QCM IA

**Task ID:** P9
**Agent:** P9 (Z.ai Code)
**Date:** 2026-06-27

## Task
Implement 4 features:
1. PWA installable améliorée (manifest icons/shortcuts, advanced SW with background sync, install-prompt component)
2. Accessibilité renforcée (high contrast, large text, reduce motion, dyslexia font, screen reader hints, font-size slider)
3. Mode Compétition temps réel (polling-based, no WebSocket — 4 API endpoints + CompetitionView component)
4. Génération de questions IA à la demande (admin/contributor endpoint using z-ai-web-dev-sdk + admin tab)

## Work Log

### Read prior context
- Read `/home/z/my-project/worklog.md` (1078 lines through P8) to understand the project structure and previous P1–P8 work.
- Read existing patterns:
  - `/home/z/my-project/src/lib/prefs-store.ts` — zustand + persist store with `highContrast/largeText/reduceMotion` toggles already present (added `fontSize`, `dyslexiaFont`, `screenReaderHints`).
  - `/home/z/my-project/src/components/quiz/preferences-applier.tsx` — toggles `hc-mode/large-text/reduce-motion` classes on `<html>` (standardised on `high-contrast` class name + added `[data-dyslexia]` and `[data-sr-hints]` attributes).
  - `/home/z/my-project/src/app/api/chat/route.ts` + `/api/generate-qcm/route.ts` — ZAI SDK usage pattern (`ZAI.create()` → `zai.chat.completions.create({ messages, thinking: { type: "disabled" } })`).
  - `/home/z/my-project/src/lib/auth.ts` + `/api/admin/banks/route.ts` — admin auth gating via `(session.user as {role?: string}).role !== "ADMIN"` → 403.
  - `/home/z/my-project/src/lib/db.ts` — `globalThis` cache pattern (re-used for the in-memory competition store).
  - `/home/z/my-project/src/app/page.tsx` — desktop/mobile nav button pattern (Tooltip + Button) and view rendering switch.
  - `/home/z/my-project/src/components/quiz/admin-view.tsx` — tab navigation array pattern.

### Feature 1 — PWA installable améliorée

1. **public/manifest.json** (REWRITTEN):
   - Added proper name/description/categories (`education, productivity, utilities`).
   - Added `display: "standalone"`, `display_override`, `orientation`, `scope`, `dir`, `prefer_related_applications`.
   - Added 5 icon entries (192x192, 512x512 in both `any` and `maskable` purpose), all referencing the existing `/logo-quizexam.svg`.
   - Added 3 shortcuts: "Quiz rapide" (`/?action=quiz`), "Tableau de bord" (`/?view=dashboard`), "Forum" (`/?view=forum`), each with a 96x96 icon.

2. **public/sw.js** (REWRITTEN, ~240 lines):
   - Versioned caches: `quizexam-static-v2` + `quizexam-api-v2`.
   - Pre-cache list expanded: `/`, `/manifest.json`, `/logo-quizexam.svg`, `/api/banks`, `/api/exams`.
   - **Cache-first strategy** for static assets (CSS/JS/SVG/PNG/JPG/WOFF2/etc, plus `/_next/static/`).
   - **Network-first with cache fallback** for cacheable API GETs (skips auth/admin/me/competition endpoints to avoid leaking session data or caching live state).
   - **Network-first with cached-shell fallback** for navigation requests.
   - **Background sync**: POST/PATCH/DELETE/PUT mutations to `/api/*` are queued when offline (`queueMutation` stores meta+body in a dedicated cache, registers a `sync` event when supported); `replayQueue` replays them on `online`/`sync` and notifies clients via `postMessage`. Returns `202` with `{queued: true}` so the UI knows to retry later.
   - Lifecycle: `install` pre-caches (fault-tolerant — single asset failures don't break install), `activate` purges old caches.
   - Also honours `prefers-reduced-motion` and provides `GET_CACHE_STATS` + `REPLAY_QUEUE` message handlers.

3. **src/components/quiz/install-prompt.tsx** (NEW, ~145 lines):
   - Listens for `beforeinstallprompt` (Chrome/Edge/Android) and stores the deferred event.
   - Shows a sticky bottom banner with "Installer l'app" + "Plus tard" buttons.
   - "Installer l'app" calls `deferred.prompt()` then awaits `deferred.userChoice` (clears the deferred event after).
   - "Plus tard" stores a 7-day dismissal in `localStorage` (`quizexam-install-dismissed`).
   - On iOS Safari (no `beforeinstallprompt`), shows an iOS-specific hint ("Appuyez sur Partager puis « Sur l'écran d'accueil »") — detected via lazy initial state to avoid setState-in-effect.
   - Suppresses itself when running in standalone mode (already installed) or dismissed recently.
   - Mobile detection: UA-based + viewport width < 768.
   - All initial state computed in lazy initialisers (no setState synchronously in effect body — satisfies the `react-hooks/set-state-in-effect` lint rule).

4. **src/app/page.tsx** (MODIFIED):
   - Imported `CompetitionView`, `InstallPrompt`, and the `Swords` icon.
   - Added `openCompetition` to the destructured store.
   - Added a "Compétition" button in the desktop nav (between Forum and Classement, rose accent) and in the mobile nav row.
   - Added `{view === "competition" && <CompetitionView />}` render.
   - Added `<InstallPrompt />` after `<RealtimeNotification />` so it floats above the chatbot.

### Feature 2 — Accessibilité renforcée

1. **src/lib/prefs-store.ts** (MODIFIED, +12 lines):
   - Added 3 new prefs-state fields: `fontSize: number` (12-24, default 16), `dyslexiaFont: boolean`, `screenReaderHints: boolean`.
   - Added `setFontSize(size)` (clamps 12-24), `toggleDyslexiaFont()`, `toggleScreenReaderHints()` actions.
   - Persists to `localStorage` via the existing zustand `persist` middleware (so preferences survive reloads).

2. **src/app/globals.css** (MODIFIED, +140 lines):
   - Added 4 accessibility mode blocks applied to `<html>`:
     - **`.high-contrast`**: forces pure black/white oklch tokens, `filter: contrast(1.15)`, thicker borders on all elements, underlined links, 3px outline on `:focus-visible`. Has separate light + dark variants.
     - **`.large-text`**: bumps base `font-size` to 18px + scales headings + `.text-xs/sm/base` utility classes.
     - **`.reduce-motion`**: clamps all `animation-duration`/`transition-duration`/`scroll-behavior` to 0.001ms. Also added a `@media (prefers-reduced-motion: reduce)` block that does the same OS-wide.
     - **`[data-dyslexia]`**: applies a slab/serif fallback font stack (`"Comic Sans MS", "Comic Neue", "Lexend", "Verdana", "Tahoma", "Trebuchet MS"`), with letter-spacing 0.03em, word-spacing 0.08em, line-height 1.6 — for body/p/li/span/a/button/input/textarea/label/headings.
     - **`[data-sr-hints]`**: surfaces `.sr-only` content visually (dashed border, muted background, small font) and appends `[aria: ...]` after elements with `aria-label` so authors can audit their SR labels.
   - Added `.scrollbar-thin` scrollbar styling (used by `max-h-96 overflow-y-auto scrollbar-thin` patterns in the new components).

3. **src/components/quiz/accessibility-panel.tsx** (NEW, ~165 lines):
   - Renders 5 toggle rows (high contrast, large text, reduce motion, dyslexia font, screen-reader hints) using shadcn `Switch`.
   - Renders a font-size slider (12-24px, step 1) using shadcn `Slider` with current value badge and min/default/max markers.
   - "Réinitialiser" button appears only when at least one pref is non-default; restores all defaults.
   - All toggles persist to `localStorage` via the prefs-store.

4. **src/components/quiz/preferences-applier.tsx** (MODIFIED):
   - Renamed the high-contrast class from `hc-mode` to `high-contrast` (matches the new CSS) and added application of `fontSize` (inline `style.fontSize` on `<html>` when ≠ 16px), `[data-dyslexia]` and `[data-sr-hints]` attributes.

5. **src/components/quiz/settings-panel.tsx** (MODIFIED):
   - Replaced the inline 3-toggle accessibility card with `<AccessibilityPanel />`.
   - Removed the now-unused `ToggleRow` helper, `Switch`/`Label` imports, and the `highContrast/largeText/reduceMotion` destructures.

### Feature 3 — Mode Compétition temps réel (polling-based)

1. **src/lib/competition-store.ts** (NEW, ~210 lines):
   - In-memory `Map<string, CompetitionRoom>` cached on `globalThis.__competitionRooms` (survives HMR — same pattern as `src/lib/db.ts`).
   - `CompetitionRoom` shape: code, hostId, hostName, bankId, bankTitle, questions[], currentIndex, status ("lobby"|"playing"|"finished"), participants Map, createdAt, lastActivityAt, questionStartedAt, questionTimeLimitSec, finalLeaderboard.
   - `Participant` shape: id, name, score, answeredCount, answers (record of questionIndex → letter), answeredCurrent, joinedAt.
   - Exports: `generateRoomCode()` (6-char, excludes ambiguous chars I/O/1/L), `generateUniqueRoomCode()` (retries on collision), `createRoom()`, `getRoom()` (touches lastActivityAt), `deleteRoom()`, `listRoomCodes()`, `serializeRoom(room, viewerId)` (JSON-safe; strips `correctAnswer`/`explanation` from the current question so clients can't cheat; includes `myAnswer` for the viewer), `pickRandom(arr, n)` (Fisher-Yates partial shuffle).
   - 6-hour TTL on rooms with a 15-minute sweep interval (lazy-started on first room creation).

2. **src/app/api/competition/route.ts** (NEW, ~155 lines):
   - **POST**: auth required (401). Body `{bankId, questionCount?, timeLimitSec?}`. Loads the bank with its questions, picks `min(questionCount, bank.questions.length)` random ones via `pickRandom()`, generates a unique 6-char code, creates the room in `lobby` status with the host as the first participant. Returns `{code, ...serializeRoom(room, hostId)}`.
   - **GET ?code=XXX**: auth required. Returns the serialised room state. Auto-advances the question timer safety-net (marks unanswered participants as having missed the current question if `questionTimeLimitSec` has elapsed — host can still click "Suivant" manually).

3. **src/app/api/competition/join/route.ts** (NEW, ~75 lines):
   - **POST**: auth required. Body `{code, name?}`. Joins an existing room. Rejects joins during `playing`/`finished` (so scoring stays fair). If already a participant, updates the display name. Returns the serialised room state.

4. **src/app/api/competition/answer/route.ts** (NEW, ~95 lines):
   - **POST**: auth required. Body `{code, answer}`. Validates the answer is A/B/C/D. Records it on the participant's `answers[currentIndex]`, marks `answeredCurrent`, increments `answeredCount`. Scores: +10 for correct + speed bonus (up to +5 based on elapsed time vs. `questionTimeLimitSec`). Returns the serialised room + `{isCorrect, correctAnswer, explanation}` for client-side feedback.

5. **src/app/api/competition/next/route.ts** (NEW, ~85 lines):
   - **POST**: auth required + **host-only** (403 otherwise). Body `{code}`.
     - From `lobby`: starts the game (status → `playing`, currentIndex → 0, resets `answeredCurrent`, starts the timer).
     - During `playing`: advances to the next question. If past the last question, sets status → `finished`, freezes `finalLeaderboard`, clears the timer.
     - Resets `answeredCurrent` on every participant for the new question.

6. **src/components/quiz/competition-view.tsx** (NEW, ~545 lines):
   - 4 screens managed by a local `screen` state: `menu` / `lobby` / `playing` / `finished`.
   - **Menu**: 2 cards side-by-side. "Créer un salon" (bank selector, 5-30 question count, 5-120 sec time limit, create button — POSTs to `/api/competition`). "Rejoindre un salon" (6-char code input, optional name, join button — POSTs to `/api/competition/join`). Plus a rules card.
   - **Lobby**: shows the room code (large monospace + copy button), bank title, host name, live participants list (with host crown + "Vous" badge). Host sees a "Lancer la compétition" button; others see a "En attente de l'hôte..." spinner. "Quitter" button to exit.
   - **Playing**: 2-column layout (lg+). Left: question text + 4 answer buttons (A/B/C/D) with color-coded feedback (emerald for correct, rose for wrong, sky for selected, dashed border on the correct answer after feedback). Right: live leaderboard with rank-based avatar colors (gold/silver/bronze), `✓` indicator when each participant has answered, score in monospace. Header: room code + question counter + countdown timer (red badge when ≤5s left) + progress bar. Host sees "Question suivante"/"Voir les résultats" button.
   - **Finished**: gradient header with trophy + winner announcement. Final ranking with medals for top 3. "Nouvelle compétition" button to return to the menu.
   - Polling: 3s in lobby, 1.5s in playing (real-time leaderboard). Clears on unmount or screen change.
   - Countdown timer updated every 500ms based on `questionStartedAt + questionTimeLimitSec`.
   - Answer feedback is shown inline (correct answer + explanation) without revealing the answer to other participants until they answer too.
   - Uses `sonner` toast for error/success feedback.

7. **src/lib/types.ts** + **src/lib/quiz-store.ts** (MODIFIED):
   - Added `"competition"` to `ViewName`.
   - Added `openCompetition: () => void` action and implementation.

### Feature 4 — Génération de questions IA à la demande

1. **src/app/api/generate-questions/route.ts** (NEW, ~230 lines):
   - **POST**: `requirePrivileged()` allows `ADMIN` and `CONTRIBUTOR` roles (403 otherwise).
   - Body `{subject, count, bankId?, addToBank?}`.
   - Validates subject (3-300 chars), clamps count to 5-20.
   - Calls `ZAI.create()` and asks the LLM to generate `count` QCM questions about the given subject (no source text — uses the model's own knowledge). Adapts the prompt to be Burkina-Faso-relevant when pertinent.
   - Reuses the same robust JSON parsing/validation as `/api/generate-qcm`: strips ```` ``` ```` fences, tries direct parse → first `{...}` block → first `[...]` block, validates each question (`correctAnswer` in A-D, 4 distinct options).
   - Retries up to 3 times if fewer than `count` valid questions are produced (with 1.5s backoff between attempts). Dedupes by question text.
   - If `addToBank=true` and `bankId` is set, verifies the bank exists, then inserts the validated questions in a `db.$transaction` (setting `order = existingCount + i`).
   - Returns `{count, requested, subject, bankId, addedToBank, questions}`.
   - Sets `runtime = "nodejs"`, `maxDuration = 60`, `dynamic = "force-dynamic"`.

2. **src/components/quiz/ai-question-generator.tsx** (NEW, ~330 lines):
   - Form: subject input, count input (5-20), bank mode toggle (existing/new), bank selector (existing) or new-bank-title input.
   - "Générer" button POSTs to `/api/generate-questions` with `addToBank: false` (so the user previews before saving).
   - Preview card: lists all generated questions with checkboxes (selected by default). Each preview shows the question, all 4 options (with the correct one highlighted in emerald + a check icon), and the explanation in an amber callout. "Tout sélectionner / désélectionner" toggle.
   - "Ajouter N question(s) à la banque" button:
     - For new-bank mode: first POSTs to `/api/admin/banks` to create the bank (with `icon: "Sparkles"`, `color: "violet"`, `category: "IA Généré"`, description auto-filled from subject).
     - Then POSTs each selected question to `/api/admin/questions` (sequential, with progress tracking).
     - Success toast with count + bank name; resets the form and refreshes the bank list.
   - Loading skeletons for the bank selector, generating spinner on the Générer button, saving spinner on the Ajouter button.
   - Empty state when no questions have been generated yet.

3. **src/components/quiz/admin-view.tsx** (MODIFIED):
   - Imported `AiQuestionGenerator` and `Sparkles` icon.
   - Added a new tab `{id: "ai-generator", label: "Générateur IA", icon: Sparkles}` to the tab array.
   - Added `{activeTab === "ai-generator" && <AiQuestionGenerator />}` render block after the Moderation tab.

## Verification

- **`bun run lint` → 0 errors, 0 warnings** ✓
- **`bunx tsc --noEmit` → 2 errors, both PRE-EXISTING** (`next.config.ts` eslint key, `pdf-upload-dialog.tsx` null type — same 2 noted by P5/P7/P8, NOT introduced by P9) ✓
- No new files added to `prisma/schema.prisma` (competition store is in-memory only — appropriate for a polling-based live mode).

## Stage Summary

- **Feature 1 ✅** (PWA installable): manifest.json enriched with proper icons, shortcuts, colors, categories. SW upgraded to v2 with network-first API strategy, cache-first static strategy, background sync for offline mutations, and navigation fallback to cached shell. New `install-prompt.tsx` component handles `beforeinstallprompt` event + iOS hint banner + 7-day dismissal. Added to `page.tsx`.
- **Feature 2 ✅** (Accessibilité): `prefs-store` extended with `fontSize/dyslexiaFont/screenReaderHints`. `globals.css` gained 5 accessibility-mode CSS blocks (high-contrast, large-text, reduce-motion, dyslexia font, sr-hints) plus a `prefers-reduced-motion` media query and `.scrollbar-thin` styling. New `accessibility-panel.tsx` with 5 toggles + 12-24px font slider + reset button, embedded inside the Settings sheet. `preferences-applier.tsx` updated to apply all new modes to `<html>`.
- **Feature 3 ✅** (Mode Compétition): polling-based live competition mode with in-memory store (cached on `globalThis`), 4 API endpoints (create, status, join, answer, next) with host-only advancement and host auto-detection. `competition-view.tsx` provides menu → lobby → playing → finished flows with real-time leaderboard, per-question timer, color-coded answer feedback, and final ranking. New "Compétition" nav button (desktop + mobile, rose accent) added to `page.tsx`.
- **Feature 4 ✅** (Générateur IA): `/api/generate-questions` allows ADMIN/CONTRIBUTOR to generate QCM on any subject using the same `z-ai-web-dev-sdk` pattern as the chat API, with optional auto-add to a bank. New `ai-question-generator.tsx` UI with subject/count inputs, bank selector (existing/new), preview with checkboxes, and bulk-add button. New "Générateur IA" tab in the admin view.
- **8 new files created**:
  - `public/manifest.json` (rewritten)
  - `public/sw.js` (rewritten)
  - `src/components/quiz/install-prompt.tsx`
  - `src/components/quiz/accessibility-panel.tsx`
  - `src/lib/competition-store.ts`
  - `src/app/api/competition/route.ts`
  - `src/app/api/competition/join/route.ts`
  - `src/app/api/competition/answer/route.ts`
  - `src/app/api/competition/next/route.ts`
  - `src/components/quiz/competition-view.tsx`
  - `src/app/api/generate-questions/route.ts`
  - `src/components/quiz/ai-question-generator.tsx`
- **6 files modified**:
  - `src/lib/prefs-store.ts` (+12 lines: 3 new prefs + 3 new actions)
  - `src/app/globals.css` (+140 lines: accessibility mode CSS)
  - `src/components/quiz/preferences-applier.tsx` (apply new classes/attributes)
  - `src/components/quiz/settings-panel.tsx` (embed `AccessibilityPanel`)
  - `src/lib/types.ts` + `src/lib/quiz-store.ts` (add `competition` view)
  - `src/app/page.tsx` (imports, nav button, view render, install prompt)
  - `src/components/quiz/admin-view.tsx` (new tab + import)
- **0 lint errors, 0 lint warnings, 0 new type errors**
- Work record written to: `/home/z/my-project/agent-ctx/P9-pwa-accessibility-competition-ai.md`
