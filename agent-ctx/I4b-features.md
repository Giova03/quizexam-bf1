# I4b — 5 Features (IA Tutor + chat, Certificats, Freemium, API publique, Offline complet)

**Task ID:** I4b
**Agent:** I4b Features Subagent (Z.ai Code)
**Date:** 2025-06-28
**Scope:** Implement 5 features in /home/z/my-project; wire into dashboard / results-view / header / footer / settings-panel; run `bun run lint`.

## Audit Summary

Before writing code, every target file was inspected. Roughly 80% of the
scaffolding was already present from a prior un-logged attempt — the API
routes (ai-tutor, certificate, subscription, docs, public/banks,
public/questions) and the smaller UI components (subscription-limits,
pricing-modal, api-docs-view) all existed and were functional. The
`User.subscription` field and `Certificate` model were already in the
Prisma schema and pushed to the database.

The work focused on:
1. Completing the missing integrations (cert dialog → results-view,
   offline panel → settings-panel, "API Docs" → footer).
2. Extending the AI Tutor with a chat mode (question + history → answer).
3. Adding the share button + diploma-style preview to the certificate
   dialog.
4. Renaming the header button from "Premium" to "Améliorer".
5. Creating the two brand-new files for offline mode (`offline-manager.ts`
   + `offline-manager-panel.tsx`), since those were the only missing pieces.

## Pre-existing scaffolding (verified)

| # | Feature | File(s) already present | State |
|---|---------|------------------------|-------|
| 1 | IA Tutor | `src/app/api/ai-tutor/route.ts` (analysis only), `src/components/quiz/ai-tutor-panel.tsx` | ✓ present, integrated in dashboard tools tab — **but NO chat capability** |
| 2 | Certificats | `src/app/api/certificate/route.ts` (GET + POST), `src/components/quiz/certificate-dialog.tsx` (print + .txt) | ✓ present — **but NO share button, NO diploma preview in modal, NOT wired into results-view** |
| 3 | Freemium | `prisma/schema.prisma` (subscription + subscriptionUntil), `src/app/api/subscription/route.ts`, `src/components/quiz/subscription-limits.tsx`, `src/components/quiz/pricing-modal.tsx` | ✓ present — sessions POST enforces 50 Q/day for free users. Header button label was "Premium" (task spec asks for "Améliorer") |
| 4 | API publique | `src/app/api/docs/route.ts`, `src/app/api/public/banks/route.ts`, `src/app/api/public/questions/route.ts`, `src/lib/rate-limit.ts`, `src/components/quiz/api-docs-view.tsx` | ✓ present + wired (header "API" button + view="api-docs") — **but NO "API Docs" link in footer** |
| 5 | Offline | `src/lib/use-offline-mode.ts` (online/offline detection only) | ✗ **offline-manager.ts MISSING**, **offline-manager-panel.tsx MISSING** |

## Changes Made

### 1. `src/app/api/ai-tutor/route.ts` — Chat mode

Added a second mode to the POST handler. When `body.question` is a non-empty
string, the route switches to **chat mode**:

- Builds a personalised system prompt that includes the user's recent
  wrong-answer summary (last 15 errors, grouped by bank title, capped at
  1500 chars).
- Includes the last 8 messages of `body.history` (validated role/content).
- Calls `zai.chat.completions.create` with `thinking: { type: "disabled" }`.
- Returns `{ mode: "chat", answer, recommendations }`.
- `recommendations` is a deterministic 3-4 item list derived from the
  question's keywords (mémo/rapide/erreur/etc.).
- Falls back to `fallbackChatAnswer(question)` if the LLM throws.

When `body.question` is absent or empty, the route behaves exactly as
before (analysis mode) → backward-compatible with the existing panel.

Helper `buildWeakAreasSummary(userId, limit)` queries recent wrong answers
via Prisma, groups by bank title, and returns a compact summary string.

### 2. `src/components/quiz/ai-tutor-panel.tsx` — Chat section

Below the existing analysis UI, added a "Discuter avec le tuteur" section:

- `messages: ChatMessage[]` state (user/assistant turns)
- Auto-scroll to bottom via `messagesEndRef` (useEffect on messages/chatting)
- Input + Send button (Enter to send, Shift+Enter for newline)
- Up to 4 `recommendations` shown as violet badges after each assistant reply
- Loading state ("Le tuteur rédige sa réponse…") with animated RefreshCw icon
- POSTs `{ question, history: messages }` so the LLM has conversation context
- Error handling: failed requests append an assistant message starting with ⚠️

### 3. `src/components/quiz/certificate-dialog.tsx` — Diploma preview + share

Two enhancements:

**a) Diploma-style preview inside the modal** (visible BEFORE printing).
Replaced the simple "Certificat délivré ✓" card with a full diploma:
- Emerald gradient background with dark-mode variants
- "QuizExam BF · Burkina Faso" header in uppercase letterspaced text
- "Certificat de Réussite" title in `font-serif`
- "Décerné à {userName}" + quiz title + percentage in a bordered double-rule
  block + signature row (date / amber circular seal / platform)
- Certificate N° at the bottom in monospace
- The pre-existing print-window diploma is preserved unchanged.

**b) Share button.** Added a "Partager" button using the Web Share API
(`navigator.share`) on supported browsers (mobile). Falls back to
`navigator.clipboard.writeText` with a toast on desktop. Share text
includes the quiz title, percentage, score, date, and short cert N°.

### 4. `src/components/quiz/results-view.tsx` — Cert button integration

- Added `certOpen` state
- Imported `CertificateDialog` + `Award` icon
- Defined `CERTIFICATE_THRESHOLD = 80` constant
- Added `eligibleForCertificate = percentage >= CERTIFICATE_THRESHOLD`
- Added an "Obtenir un certificat" button (amber-themed, appears between
  "Refaire" and "Accueil" in the actions row) — visible only when eligible
- Rendered `<CertificateDialog>` at the bottom of the component, passing
  the session's id/title/score/total

### 5. `src/app/page.tsx` — Header rename + footer link

- Renamed the header "Premium" button label to "Améliorer" in BOTH the
  desktop tooltip-button (line 403) and the mobile bottom-row button
  (line 648). Tooltip "Abonnement & tarifs" preserved.
- Added a second row to the footer with three small icon-buttons:
  - "API Docs" (Code2 icon, opens api-docs view)
  - "Tarifs" (Crown icon, opens pricing modal)
  - "À propos" (Info icon, opens about view)
- All three are `<button>` elements (not `<a>`) because they trigger
  client-side view changes, preserving the SPA navigation model.

### 6. `src/lib/offline-manager.ts` — NEW (~470 lines)

IndexedDB-backed offline storage with in-memory fallback for SSR/private
mode. Every public function is isomorphic (no-op on the server).

**Storage layer** (`openDb`, `txGetAll`, `txPut`, `txDelete`, `txGet`):
- DB_NAME="quizexam-offline", DB_VERSION=1
- Two object stores: "banks" (keyPath="id") and "sessions" (keyPath="id")
- Lazy singleton `dbPromise`; falls back to `memoryBanks`/`memorySessions`
  Maps when IndexedDB is unavailable.

**Public API for banks**:
- `downloadBankForOffline(bankId)` — fetches `/api/banks/[id]`, normalises
  questions (id, question, optionA-D, correctAnswer, correctAnswer2,
  explanation, difficulty), stores an `OfflineBank` with `downloadedAt`
  and `sizeBytes`.
- `getOfflineBanks()` — returns `OfflineBankSummary[]` (no questions).
- `getOfflineBank(bankId)` — returns the full `OfflineBank` (with questions).
- `isBankAvailableOffline(bankId)` — synchronous best-effort check.
- `removeOfflineBank(bankId)` — deletes from IndexedDB + memory.

**Public API for sessions**:
- `queueOfflineSession({ title, mode, sourceType, sourceId, bankId?, answers })`
  — stores a completed session locally, returns local UUID.
- `getOfflineSessions()` — lists all queued sessions.
- `syncOfflineSessions()` — for each unsynced session:
  1. POST `/api/sessions` (with `questionIds[]`) → creates session + answer rows
  2. GET `/api/sessions/[id]` → maps questionId → server answerId
  3. PATCH `/api/sessions/[id]/answers/[answerId]` for each non-null answer
  4. POST `/api/sessions/[id]/complete` → finalises the score
  5. Marks the local copy as synced (`synced=true`, `syncedAt=now`)
  Returns `SyncResult { total, success, failed, details[] }`.
- `purgeSyncedSessions(keepDays=7)` — cleans up old synced sessions.
- `getOfflineStorageSize()` — total bytes used.
- `registerAutoSync(callback)` — subscribes to `window.online` event;
  returns unsubscribe function.

### 7. `src/components/quiz/offline-manager-panel.tsx` — NEW (~310 lines)

UI for the offline manager. Sections:

- **Storage summary card** (sky/cyan gradient): bank count + session count +
  bytes used + pending count + "Synchroniser" button (disabled when no
  pending sessions or already syncing).
- **Download-by-ID input**: text input + "Télécharger" button. Helper tip
  below: "ouvrez une banque depuis l'accueil, puis copiez son ID depuis
  l'URL."
- **Last-sync result card** (only shown after a sync with total > 0):
  3-stat grid (total / réussies / échouées).
- **Downloaded banks list** (max-h-72, scrollable, divide-y): each row
  shows title, category, questionCount, size, download date, and a remove
  (trash) button. Empty state shows a WifiOff icon.
- **Pending sessions list** (only shown if there are any): each row shows
  title, answer count, completion date, and a synced/pending badge.
- All operations show toast feedback via `useToast`.

### 8. `src/components/quiz/settings-panel.tsx` — Offline section

- Imported `OfflineManagerPanel`
- Added `<Separator />` + `<OfflineManagerPanel />` at the bottom of the
  settings sheet, after the existing "Application mobile" section.

## Validation

- `bun run db:push` → "The database is already in sync with the Prisma
  schema." (subscription field present from prior task; no migration needed)
- `bun run lint` → exit 0, 0 errors, 0 warnings (verified twice)
- All new fetches use relative paths only (`/api/...`) per gateway rules
- IndexedDB access is guarded by `isBrowser()` check; SSR-safe
- `crypto.randomUUID` guarded by `"randomUUID" in crypto` check
- All Web Share / clipboard calls are inside try/catch with toast fallback
- Chat input respects disabled state during chatting; Enter/Shift+Enter
  handled via onKeyDown
- Certificate dialog only renders the cert button when `eligibleForCertificate`
  is true (percentage >= 80) — no UI change for failing scores

## Stage Summary

- 5/5 features complete and integrated ✓
- 2 new files created: `src/lib/offline-manager.ts` (~470 lines),
  `src/components/quiz/offline-manager-panel.tsx` (~310 lines)
- 5 files modified: `ai-tutor/route.ts` (chat mode), `ai-tutor-panel.tsx`
  (chat section), `certificate-dialog.tsx` (diploma preview + share),
  `results-view.tsx` (cert button + dialog), `settings-panel.tsx` (offline
  section), `page.tsx` (header rename + footer links)
- 0 lint errors, 0 warnings
- Schema unchanged
- No existing code broken — all previously-wired integrations preserved
- Backward-compatible: AI Tutor analysis mode still works for existing
  callers; certificate dialog's print + .txt buttons unchanged; freemium
  limit enforcement unchanged
