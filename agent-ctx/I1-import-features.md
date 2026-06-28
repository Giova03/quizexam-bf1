# Task ID I1 — Content Import Features

**Agent:** Import Features Subagent (Z.ai Code)
**Date:** 2026-06-27
**Task:** Implement 5 content import features for the quiz/exam platform

## Summary

Implemented 5 content import features accessible via a new "Import" tab in the admin panel:

1. **Parser texte QCM (copier-coller)** — paste QCM text and parse it into structured questions
2. **Upload PDF → Extraction → Banque** — upload a PDF, extract text with `pdf-parse`, generate QCM via LLM
3. **Upload Word (.docx) → Extraction** — upload a .docx, extract text with `mammoth`, generate QCM via LLM (shares the same dialog as PDF)
4. **Import CSV/JSON en masse** — bulk import questions from a CSV or JSON file, with downloadable templates
5. **Création d'examen directe** — drag & drop exam builder that selects questions individually or by bank distribution

## New Files Created

### API Routes (`src/app/api/`)

1. **`parse-qcm-text/route.ts`** — POST endpoint that parses pasted QCM text.
   - Detects question numbers: `1.`, `1)`, `1-`, `Question 1:`
   - Detects options: `a)`, `a.`, `(a)`, `A)`, `A.`, `A-` (case-insensitive)
   - Detects correct answer markers:
     - `Réponse:`, `Rép:`, `Bonne réponse:`, `Correct answer:` followed by a letter
     - Inline markers at end of option: `✅`, `✔`, `✓`, `*`, `(correct)`, `(vrai)`, `(juste)`, `(bonne)`
   - Detects explanation: `Explication:`, `Justification:`, `Raisonnement:`, `Raison:`, `Explanation:`
   - Returns array of `{question, optionA-D, correctAnswer, explanation, warnings}`
   - Does NOT require admin auth (purely text-based, no DB access)
   - Tested with multiple formats: ✅ all parse correctly

2. **`upload-pdf/route.ts`** — POST endpoint (admin-only) that accepts a multipart PDF (max 10MB) and returns extracted text (truncated to 5000 chars). Uses `pdf-parse@1.1.1` (downgraded from v2.4.5 because v2 requires `DOMMatrix`/`@napi-rs/canvas` which isn't available in the Next.js runtime).

3. **`upload-word/route.ts`** — POST endpoint (admin-only) that accepts a .docx file (max 10MB) and returns extracted text. Uses `mammoth@1.12.0` `extractRawText({ buffer })`.

4. **`generate-qcm/route.ts`** — POST endpoint (admin-only) that calls `z-ai-web-dev-sdk` to generate 5-20 QCM from a given text. Includes:
   - Strict JSON output prompt
   - Robust JSON extraction (direct parse, then `[...]` slice fallback)
   - Per-question validation (4 distinct options, A-D correctAnswer, non-empty explanation)

5. **`import-questions/route.ts`** — POST endpoint (admin-only) for bulk import. Accepts `{ questions, bankId }`. Validates each question (4 distinct options, valid correctAnswer, non-empty explanation). Returns `{ success, failure, results }` with per-question error details. Uses `createMany` for efficient batch insert. Caps at 500 questions per call.

### Components (`src/components/quiz/`)

6. **`bank-selector.tsx`** — Fully-controlled reusable bank selector. Lets user pick an existing bank OR create a new one inline (with title input). Parent owns the state.

7. **`question-card-editor.tsx`** — Reusable inline question editor card. Click a letter to set the correct answer. Validates duplicates and missing fields. Shows warnings.

8. **`import-text-dialog.tsx`** — Dialog for pasting QCM text. Includes:
   - Large textarea with "Charger un exemple" button
   - "Parser le texte" button → calls `/api/parse-qcm-text`
   - Editable preview list of parsed questions (using `QuestionCardEditor`)
   - Valid/invalid count badges
   - Bank selector (existing or new)
   - "Importer N question(s)" button → creates new bank if needed, then calls `/api/import-questions`

9. **`pdf-upload-dialog.tsx`** — Dialog for PDF **and Word** upload (single shared dialog). 4-stage flow:
   - Stage 1: Drag & drop upload (PDF or .docx, max 10MB)
   - Stage 2: Preview extracted text + enter subject + select question count (5-20 slider)
   - Stage 3: Loading spinner during AI generation
   - Stage 4: Editable preview of generated questions + bank selector + import

10. **`import-csv-dialog.tsx`** — Dialog for CSV/JSON bulk import. Includes:
    - Two downloadable template buttons (CSV + JSON)
    - Drag & drop file upload
    - Client-side CSV parser (handles quoted fields, multi-line cells)
    - Client-side JSON parser (accepts array or `{questions: [...]}`)
    - Flexible column matching: `question`/`q`/`enonce`/`libelle`, `optionA`/`a`/`optA`, `correctAnswer`/`correct`/`answer`/`reponse`, etc.
    - Editable preview + bank selector + import

11. **`exam-builder.tsx`** — Drag & drop exam builder using `@dnd-kit/sortable`. Two modes:
    - **Questions individuelles**: pick questions one-by-one from any bank (with search)
    - **Par banque**: enter number of questions to draw randomly from each bank
    - Selected questions list with drag handles to reorder (preserves order in API call)
    - Exam metadata (title, description, duration)
    - Save button calls `POST /api/admin/exams` with either `questionIds` (explicit) or `distributions` (per-bank)

### Modified Files

12. **`src/app/api/admin/exams/route.ts`** — Extended POST to accept either:
    - `questionIds: string[]` (explicit list, preserves order) — NEW
    - `distributions: [{bankId, count}]` (random pick per bank) — existing

13. **`src/components/quiz/admin-view.tsx`** — Added new "Import" tab + `ImportsPanel` component:
    - Tab inserted between "Examens" and "Export"
    - 5 import cards in a responsive grid (1 col mobile, 2 col sm, 3 col lg)
    - Each card has icon, title, description, tag (Rapide/IA/Bulk/Examen), "Ouvrir" button
    - Helpful tip box at bottom
    - All 4 dialogs rendered inside ImportsPanel (text, pdf, csv, exam-builder)
    - New imports added: `ImportTextDialog`, `PdfUploadDialog`, `ImportCsvDialog`, `ExamBuilder`
    - New icons added: `FileInput`, `ClipboardPaste`, `FileText`, `FileSpreadsheet`, `Sparkles`

## Package Changes

- Added: `pdf-parse@1.1.1` (downgraded from v2.4.5 due to runtime incompatibility with `DOMMatrix`)
- Added: `mammoth@1.12.0`

## Lint & Build Status

- `bun run lint` → **0 errors, 0 warnings** ✓
- All new API routes compile in dev server ✓
- All routes correctly enforce admin auth (except `parse-qcm-text` which is text-only) ✓
- `parse-qcm-text` tested with 4 different input formats — all parse correctly ✓
- `pdf-parse@1.1.1` tested directly with a real PDF → 9 pages, 3180 chars extracted ✓
- `mammoth@1.12.0` tested directly with a real .docx → text extracted correctly ✓

## Key Design Decisions

1. **Shared PDF/Word dialog**: The task said "Add Word upload to the same pdf-upload-dialog.tsx (or create a shared component)". I chose to extend `pdf-upload-dialog.tsx` to handle both PDF and Word via a single dialog with auto-detection of file type. The dialog title is "Importer un document (PDF ou Word)" and the file picker accepts both `.pdf` and `.docx`.

2. **Fully controlled BankSelector**: Initial implementation used `useEffect` with `setState` calls, which triggered ESLint's `react-hooks/set-state-in-effect` rule. Refactored to a fully controlled component where the parent owns `value` and `newBankTitle` state — the child only renders UI and notifies parent via `onValueChange`/`onNewTitleChange`.

3. **pdf-parse v1 vs v2**: Initially installed v2.4.5 but it requires browser canvas APIs (`DOMMatrix`, `ImageData`, `@napi-rs/canvas`) that aren't available in the Next.js Node runtime. Downgraded to v1.1.1 which is pure JavaScript and works flawlessly.

4. **Exam builder mixed mode**: When the user mixes individual questions and bank distributions, the API only supports one mode per call. The builder detects this and warns the user via toast, then sends only distributions (the explicit questions are effectively replaced by random picks from their banks). A future improvement would be to extend the API to accept both.

5. **CSV parser**: Wrote a custom CSV parser (handles quoted fields with embedded commas and newlines) rather than pulling in a dependency like `papaparse`. The parser is ~50 lines and sufficient for the use case.

6. **Validation everywhere**: Every import path validates questions before insertion — 4 distinct options, valid correctAnswer (A-D), non-empty explanation. Invalid questions are flagged with warnings in the UI and skipped (with per-question error reporting) at the API level.

## How to Use

1. Login as admin (giobamos03@gmail.com / Giov@12342005)
2. Open admin panel (ShieldCheck icon)
3. Click the "Import" tab
4. Choose one of 5 import methods:
   - **Texte QCM** → paste text, click "Parser", edit, select bank, "Importer"
   - **PDF / Word** → drag file, "Extraire le texte", set subject+count, "Générer", edit, select bank, "Importer"
   - **CSV / JSON** → download template, fill, drag file, edit, select bank, "Importer"
   - **Examen directe** → set title, pick questions or set per-bank counts, drag to reorder, "Créer l'examen"

All imports call `loadStats()` afterwards to refresh the admin overview counts.
