# P7 — Advanced Recharts, Anki CSV Export, Push Notifications

**Task ID:** P7
**Agent:** P7 (Z.ai Code)
**Scope:** Three features:
1. Advanced Recharts charts (LineChart, RadarChart, BarChart, PieChart) in a new "Analyse détaillée" dashboard section
2. Anki CSV export API + button component, integrated into bank-detail-view and dashboard favorites
3. Native browser Push Notifications (Notification API) with toggle, time picker, test button, daily reminder — wired into the settings panel

## Work Log

### Initial state discovery
- Read `/home/z/my-project/worklog.md` (1011 lines) to understand prior context (P1–P6 — 53 banks, 3100 questions, Next.js 16 + Prisma/PostgreSQL stack on Supabase, full feature set already built: timer, daily challenges, spaced repetition, PDF upload + AI QCM, referral program, 27 badges, forum, public profiles).
- Read all 5 prior agent-ctx records (P2/P3/P4/P5/P6) to understand the project state.
- Discovered that a previous incomplete attempt had already created all 3 files for Features 1 & 2:
  - `src/components/quiz/advanced-charts.tsx` (466 lines) — complete LineChart (30-day progression with global-avg reference line), RadarChart (top 8 matières by score), BarChart (7-day question volume), PieChart (4-bucket score distribution), each wrapped in a Card with title/description/icon, using ResponsiveContainer at height 280, with skeleton + empty-state fallbacks, custom themed tooltip, full dark-mode support via CSS variables
  - `src/components/quiz/anki-export-button.tsx` (137 lines) — button with `bankId` (GET) or `favorites` (POST) props, downloads CSV via blob, success toast, disabled state while exporting, mobile/desktop responsive label
  - `src/app/api/export/anki/route.ts` (290 lines) — GET with `?bankId=`, POST with `{ favorites: [...] }` body, semicolon separator, UTF-8 BOM (`\uFEFF`), proper CSV escaping (internal `"` doubled), tags cell with `"bank" "category" "difficulty"` triple-quoted format, slugified filename with date
  - Both integrations already in `dashboard-view.tsx` (AdvancedCharts in overview tab after WeeklyChart + ReferralCard; AnkiExportButton in favorites tab next to "Tout effacer") and `bank-detail-view.tsx` (AnkiExportButton next to "Démarrer le quiz" button with size="lg")
- Verified the 3 existing files compile correctly (`bun run lint` → 0 errors before any P7 work)
- Ran end-to-end curl tests of the Anki API:
  - GET `/api/export/anki?bankId=<real-id>` → 200, 47 KB CSV, BOM present, semicolon-separated, properly escaped ✓
  - GET without bankId → 400 (missing param) ✓
  - GET with nonexistent bankId → 404 ✓
  - POST with empty favorites array → 400 (no favorites) ✓
  - POST with valid favorite payload → 200, returns CSV with both DB-enriched rows and localStorage-snapshot fallback rows ✓

### Feature 3 — Push Notifications (the only new code P7 needed to write)

#### File 1: `src/lib/push-notifications.ts` (NEW, 187 lines)
A client-side utility module (`"use client"` directive at top — needed because it accesses `window`, `Notification`, `localStorage`). Exports:

- `isSupported(): boolean` — SSR-safe check for the Notification API (`typeof window !== "undefined" && "Notification" in window`)
- `getPermission(): NotificationPermission | null` — returns current permission or null if unsupported
- `requestNotificationPermission(): Promise<boolean>` — wraps `Notification.requestPermission()`, resolves to true only if granted, catches errors for old Safari callback form
- `showNotification(title, body?, options?)` — fires `new Notification()` with icon/badge/tag defaults; auto-closes after 8 s; swallows errors (iOS Safari without PWA install throws)
- `getPrefs(): PushPrefs` — reads `{ enabled, reminderTime, lastReminder? }` from `localStorage["quizexam-push-prefs"]`, returns defaults `{ enabled: false, reminderTime: "19:00" }` if missing/corrupt
- `savePrefs(prefs: PushPrefs): void` — persists to localStorage, swallows quota/private-mode errors
- `clearScheduledReminders(): void` — clears all pending setTimeout IDs from the in-memory registry
- `scheduleDailyReminder(time, title?, body?)` — cancels any existing chain, then sets up a self-re-arming setTimeout:
  - Computes delay until next occurrence of `HH:MM` (tomorrow if already passed today)
  - setTimeout fires → shows notification → saves `lastReminder` → recursively re-arms for the next day
  - Uses a module-level `Set<ReturnType<typeof setTimeout>>` so multiple chains can coexist and be cancelled together
  - No-op if unsupported / permission not granted / invalid time format
  - setTimeout delay is well within the ~24.8-day browser cap, so 24h scheduling is safe

`PushPrefs` interface is exported for reuse by the component.

#### File 2: `src/components/quiz/push-notification-settings.tsx` (NEW, 233 lines)
Client component using shadcn/ui `Card`, `Switch`, `Label`, `Button`, plus `toast` from sonner and `Bell`, `BellRing`, `Clock`, `Send`, `AlertTriangle` icons from lucide-react.

State:
- `supported` (bool, initialized true, corrected on mount)
- `prefs` (`PushPrefs`, initialized to defaults)
- `permission` (`NotificationPermission | null`)
- `busy` (bool, disables the switch while awaiting permission)

`useEffect` on mount:
- Reads `isSupported()` and `Notification.permission`
- Reads stored prefs from localStorage
- Re-arms the daily reminder if `enabled` is true AND permission is granted (so the reminder survives page reloads during the same browser session)

Event handlers:
- `handleToggle(enabled)`:
  - If disabling → save `{ ...prefs, enabled: false }`, call `clearScheduledReminders()`, success toast
  - If enabling → call `requestNotificationPermission()`. If denied, error toast + abort. If granted, save `{ ...prefs, enabled: true }`, call `scheduleDailyReminder(reminderTime)`, success toast
- `handleTimeChange(time)` — saves new time, re-arms the reminder if still enabled + permitted
- `handleTest()` — calls `showNotification("QuizExam BF — Test", "Les notifications fonctionnent ! 🎉")`, success toast

UI:
- **Unsupported browser** branch: simple Card with Bell icon and "Votre navigateur ne supporte pas les notifications push."
- **Main branch**: Card with `divide-y` containing:
  1. Toggle row (Bell when off / BellRing when on, "Notifications push" + "Recevez un rappel quotidien pour pratiquer", Switch on the right)
  2. Time picker row (only when enabled) — native `<input type="time">` styled with Tailwind, tabular-nums, emerald focus ring
  3. Test button row (only when enabled) — Send icon, "Tester" outline button, disabled if permission not granted
- Permission-denied warning banner (amber) shown below the Card when `permission === "denied"`, instructing the user to re-enable notifications in browser settings
- All interactive elements have `aria-label` for accessibility, minimum 44px touch targets via p-3 padding

#### File 3: `src/components/quiz/settings-panel.tsx` (MODIFIED)
- Added `Bell` to the lucide-react import list
- Added `import { PushNotificationSettings } from "./push-notification-settings";`
- Inserted a new `<section>` between the Accessibility section and the Badges grid:
  ```tsx
  <Separator />
  <section className="space-y-2.5">
    <div className="flex items-center gap-2 text-sm font-semibold">
      <Bell className="h-4 w-4 text-emerald-600" />
      Notifications push
    </div>
    <PushNotificationSettings />
  </section>
  <Separator />
  ```
- The section header matches the existing pattern (icon + label), and the PushNotificationSettings component renders its own Card-based settings rows.

## Verification
- `bun run lint` → 0 errors, 0 warnings ✓
- `bunx tsc --noEmit` → 2 errors, both PRE-EXISTING (next.config.ts eslint key, pdf-upload-dialog.tsx null type — same 2 errors noted by P5, NOT introduced by P7) ✓
- Dev server log (`/home/z/my-project/.next/dev/logs/next-development.log`) → most recent entry is "✓ Compiled in 536ms"; the only Module-not-found error in the log is the stale one from before the previous attempt created anki-export-button.tsx (file exists now) — no new errors after P7's edits ✓
- `curl http://localhost:3000/` → 200, 30766 bytes (home page renders without errors) ✓
- `curl "/api/export/anki?bankId=<real-id>"` → 200, 47395 bytes, `text/csv; charset=utf-8`, BOM present, semicolon separator, properly escaped quotes ✓
- `curl "/api/export/anki?bankId=<real-id>"` content verified: header `Front;Back;Tags`, real question text in Front, "answer. explanation" in Back, `"""Bank Title"" ""Category"" ""Difficulty"""` in Tags ✓
- `curl -X POST "/api/export/anki"` with `{ favorites: [...] }` → 200, returns CSV with DB-enriched rows + localStorage-snapshot fallback ✓
- `curl "/api/export/anki"` (no bankId) → 400 ✓
- `curl "/api/export/anki?bankId=nonexistent"` → 404 ✓
- `curl -X POST "/api/export/anki"` with `{ favorites: [] }` → 400 ✓
- Push notifications code review:
  - `isSupported()` is SSR-safe (typeof window check) ✓
  - `requestNotificationPermission()` uses promise form with try/catch ✓
  - `showNotification()` checks permission, auto-closes after 8s, swallows errors ✓
  - `scheduleDailyReminder()` validates HH:MM format, self-re-arms, handles next-day wrap ✓
  - `clearScheduledReminders()` clears all pending timeouts ✓
  - `getPrefs()/savePrefs()` are localStorage-backed with sensible defaults ✓
- Push notification UI review:
  - Toggle works for both enabling (asks permission) and disabling (cancels reminders) ✓
  - Test button only shown when enabled, disabled when permission missing ✓
  - Time picker uses native `<input type="time">` (mobile-friendly, accessible) ✓
  - Preferences persist across reloads via localStorage ✓
  - Reminder is re-armed on mount if previously enabled + permission granted ✓
  - Unsupported-browser branch renders a clear message instead of broken UI ✓
  - Permission-denied warning banner guides the user to browser settings ✓

## Files changed summary

| File | Action | Lines |
|------|--------|-------|
| `src/components/quiz/advanced-charts.tsx` | pre-existing (verified) | 466 |
| `src/components/quiz/anki-export-button.tsx` | pre-existing (verified) | 137 |
| `src/app/api/export/anki/route.ts` | pre-existing (verified) | 290 |
| `src/components/quiz/dashboard-view.tsx` | pre-existing integrations (verified) | 691 |
| `src/components/quiz/bank-detail-view.tsx` | pre-existing integration (verified) | 311 |
| `src/lib/push-notifications.ts` | **NEW** | 187 |
| `src/components/quiz/push-notification-settings.tsx` | **NEW** | 233 |
| `src/components/quiz/settings-panel.tsx` | MODIFIED (Bell import + PushNotificationSettings import + new section) | +14 |

**Totals:** 2 new files (420 lines), 1 modified file (+14 lines), 0 lint errors, 0 new type errors, 0 breaking changes.

## Stage Summary
- **Feature 1 ✅ (Recharts avancés)**: 4 advanced charts (LineChart 30-day progression with global-avg reference, RadarChart top-8 matières, BarChart 7-day question volume, PieChart 4-bucket score distribution) in a new "Analyse détaillée" section of the dashboard, each wrapped in a Card with title/description/icon, using ResponsiveContainer at h:280, with skeleton loading states, empty-state messages, custom themed tooltips, full dark-mode support — pre-existing implementation verified and tested
- **Feature 2 ✅ (Export Anki CSV)**: `/api/export/anki` route with GET (bankId) + POST (favorites) entry points, semicolon-separated CSV with UTF-8 BOM, proper escaping, tags cell with bank/category/difficulty; AnkiExportButton component with bankId/favorites props, blob-download flow, success toast; integrated into bank-detail-view (lg button next to "Démarrer le quiz") and dashboard favorites tab — pre-existing implementation verified and end-to-end curl tested with real data
- **Feature 3 ✅ (Notifications Push)**: `push-notifications.ts` lib with `isSupported()`, `requestNotificationPermission()`, `showNotification()`, `scheduleDailyReminder()`, `getPrefs()`, `savePrefs()`, `clearScheduledReminders()` — uses native Notification API (no service worker); `push-notification-settings.tsx` component with enable/disable Switch (asks permission on enable), native `<input type="time">` time picker, Test button, localStorage-backed preferences, self-re-arming setTimeout daily reminder; integrated into `settings-panel.tsx` as a new "Notifications push" section between Accessibility and Badges
- 0 lint errors, 0 new type errors, 0 breaking changes
- Work record written to: `/home/z/my-project/agent-ctx/P7-charts-anki-push.md`
