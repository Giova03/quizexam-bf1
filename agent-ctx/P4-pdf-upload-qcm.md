# Task P4 — PDF Upload & Automatic QCM Generation

**Agent:** P4 (Z.ai Code)
**Task:** Implement PDF upload → automatic QCM generation from PDF, integrated into the admin panel.

## Work Log

### Context
- Read `/home/z/my-project/worklog.md` (763 lines) to understand prior work:
  - Next.js 16 + Prisma + NextAuth v4 + z-ai-web-dev-sdk platform
  - 53 banks, 3100+ questions, admin panel with 8 tabs (overview/visitors/progress/banks/sessions/exams/export/broadcast)
  - P2 added daily challenges + countdown timer; P3 added SM-2 spaced repetition + question difficulty
  - Admin API pattern: `requireAdmin()` helper using `getServerSession(authOptions)` + role check
- Inspected existing files: `src/app/api/admin/questions/route.ts`, `src/app/api/admin/banks/route.ts`, `src/app/api/chat/route.ts`, `src/lib/auth.ts`, `src/components/quiz/admin-view.tsx` (1978 lines), `scripts/gen-complex-bank.ts`

### Files Created

1. **`src/app/api/upload-pdf/route.ts`** (~165 lines)
   - POST handler accepting multipart/form-data with a `file` field
   - Admin-only via `requireAdmin()` helper (same pattern as other admin routes)
   - Validates: file is a PDF, ≤10 MB, non-empty
   - Extracts text via `pdf-parse` v1 (`pdf-parse/lib/pdf-parse.js` — bypasses the package's debug-mode test-file load that breaks Next.js/Bun module resolution)
   - Normalizes whitespace (collapses spaces, caps newlines, strips form-feed)
   - Returns `{ fileName, fileSize, totalChars, truncated, text }` with text truncated to 5000 chars for the LLM
   - Graceful errors: 413 (too large), 422 (corrupt PDF / no text / too short), 400 (invalid request)

2. **`src/app/api/generate-qcm/route.ts`** (~205 lines)
   - POST handler accepting `{ text, count, subject }` JSON
   - Admin-only via `requireAdmin()`
   - Clamps `count` to 5–20 range (default 10)
   - Truncates text to 5000 chars
   - Uses `ZAI.create()` + `zai.chat.completions.create()` (same SDK pattern as `/api/chat` and `scripts/gen-complex-bank.ts`)
   - Prompt matches the task spec format: `"Génère {count} questions QCM à choix multiples basées sur ce texte: {text}. Format JSON: {questions: [...]}"`
   - Adds extra requirements to the prompt: 4 distinct options, valid A–D correctAnswer, short explanation, strict JSON
   - Resilient parsing: strips markdown fences, tries direct JSON.parse → first `{...}` block → first `[...]` block
   - Validates each question: all fields non-empty strings, correctAnswer ∈ A–D, 4 distinct options (case-insensitive)
   - Dedupes by first 120 chars of question text
   - Up to 3 retry attempts to reach `count` valid questions; 1.5 s backoff between attempts
   - Returns `{ count, requested, subject, questions[] }` or 422 if no valid questions

3. **`src/components/quiz/pdf-upload-dialog.tsx`** (~640 lines)
   - 3-step wizard dialog: **upload → configure → generated**
   - Stepper UI (1/2/3 with active/done states)
   - **Step 1 (upload):** Drag & drop zone + "Choisir un fichier" button; hidden `<input type="file" accept="application/pdf">`; loading spinner during extraction; warning note about scanned-PDF limitation
   - **Step 2 (configure):** Text preview (ScrollArea, max-h-40), badges for fileName/totalChars/truncated, optional subject/title Input, question count Slider (5–20, default 10) with live count badge
   - **Step 3 (generated):** Toolbar with selected/generated count + select all/deselect all; questions list (ScrollArea, max-h-[40vh]) with each question as a Checkbox + card showing question text + 4 options (correct one highlighted in emerald) + explanation in amber; inline editor (Textarea + 4 Inputs + correct-answer letter buttons) for editing any question; remove button per question
   - Bank selector at the bottom: toggle between "Banque existante" (Select dropdown loaded from `/api/banks`) and "Nouvelle banque" (title Input + category Select); "Ajouter {N} à la banque" button
   - Save flow: validates all selected questions (4 distinct options, valid correctAnswer) → optionally creates new bank via `/api/admin/banks` POST → loops over questions calling `/api/admin/questions` POST for each → toast on success/failure/partial → closes dialog on success and calls `onSaved` callback
   - All state reset when dialog closes
   - Uses sonner `toast` for all notifications
   - All shadcn/ui components (Dialog, Button, Input, Label, Textarea, Badge, Slider, Checkbox, ScrollArea, Select)

### Files Modified

4. **`src/components/quiz/admin-view.tsx`** (1978 → 2025 lines)
   - Added `FileText` to lucide-react imports
   - Added `import { PdfUploadDialog } from "@/components/quiz/pdf-upload-dialog"`
   - Added `pdfUploadOpen` state
   - Added "Upload PDF" outline button (emerald-themed) in the admin header next to "Nouvelle banque" — only visible to admins (header is inside the `isAdmin` check)
   - Added a gradient CTA card at the top of the "Banques & QCM" tab promoting the PDF upload feature with a "Upload PDF" button
   - Rendered `<PdfUploadDialog>` at the bottom of the AdminView with `onSaved={() => loadStats()}` so the bank/question counts refresh after a save

### Package Installed

- `pdf-parse@1.1.1` (initially tried `pdf-parse@2.4.5` but v2 uses `pdfjs-dist` which requires `@napi-rs/canvas` + `DOMMatrix` polyfills that aren't available in this Bun/Next.js environment; downgraded to v1 which is a pure-JS implementation)

### Verification

- `bun run lint` → 0 errors, 0 warnings ✓
- Both new API routes compile and return 403 for non-admin (correct auth gating) ✓
- Home page renders (200), Banks API works (200) — no regressions ✓
- **Standalone test of pdf-parse extraction:** extracted 3178 chars from a 704 KB real PDF (`DOC-20250626-WA0058.pdf`) in <1 s ✓
- **Standalone test of LLM QCM generation:** ZAI SDK returned a fenced JSON response with 5 valid questions from the extracted text ✓
- **Standalone test of parse() function:** correctly strips ```json fences and validates each question (4 distinct options, A–D correctAnswer, non-empty fields) ✓
- **Agent Browser end-to-end UI test:**
  - Logged in as admin (giobamos03@gmail.com / Giov@12342005) ✓
  - Opened admin panel via the "Admin" nav button ✓
  - "Upload PDF" button visible in admin header (next to "Nouvelle banque") ✓
  - All 8 admin tabs visible ✓
  - Clicking "Upload PDF" opens the dialog with title "Générer des QCM depuis un PDF" ✓
  - Dialog shows 3-step stepper (1. PDF → 2. Options → 3. Questions) ✓
  - Drag & drop zone + "Choisir un fichier" button visible ✓
  - Hidden `<input type="file" accept="application/pdf">` present ✓
  - Warning note about scanned PDFs visible ✓

### Known Pre-existing Issue (NOT introduced by this task)

The dev server in this sandbox does not have `NEXTAUTH_SECRET` set, so `getServerSession(authOptions)` throws `JWEDecryptionFailed` when called inside API route handlers — the session token is signed/encrypted by a different in-memory secret instance than the one used to create it. This affects **all** admin API routes (e.g. `/api/admin/stats`, `/api/admin/users`, `/api/admin/banks`), not just the new ones. The client-side `useSession()` from `next-auth/react` still works (it uses the session from the SessionProvider, not `getServerSession`), so the admin UI renders and the `isAdmin` check on the client passes. The standalone tests confirm the upload-pdf extraction logic and the generate-qcm LLM logic both work correctly; the only blocker for a full browser-based end-to-end test is this pre-existing auth-secret issue. Fix would be to set `NEXTAUTH_SECRET` in the dev server env — outside the scope of this task.

## Stage Summary

- 3 new files created (`upload-pdf/route.ts`, `generate-qcm/route.ts`, `pdf-upload-dialog.tsx`)
- 1 file modified (`admin-view.tsx`): added FileText icon import, PdfUploadDialog import, `pdfUploadOpen` state, "Upload PDF" header button, CTA card in Banks tab, dialog render
- 1 package added (`pdf-parse@1.1.1`)
- 0 lint errors, 0 lint warnings
- 0 breaking changes to existing code
- The "Upload PDF" feature is fully wired: admins can drag-drop a PDF → see extracted text → choose count/subject → AI generates QCM → review/edit/select → save to existing or new bank
- Work record written to: `/home/z/my-project/agent-ctx/P4-pdf-upload-qcm.md`
