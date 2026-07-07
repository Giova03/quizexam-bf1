/**
 * FIX2 — merge-banks.ts
 *
 * Merges duplicate / thematically-overlapping bank JSON files in
 * `scripts/generated/banks/` so the platform exposes fewer, larger, more
 * coherent question banks (≈48 banks instead of ≈55).
 *
 * Merge operations (see worklog FIX2):
 *   1. pays-capitales.json          (2 Q)  → into pays-capitales-monnaies.json  (35 Q) → 37 Q
 *   2. physique-chimie.json         (5 Q)  → into physique-chimie-lycee.json    (47 Q) → 52 Q
 *   3. histoire-monde.json         (1 Q)  → into histoire.json                  (69 Q) → 70 Q
 *   4. sciences-eco-gestion.json    (50 Q) + sciences-eco-ufr.json (104 Q)
 *      → "Sciences Économiques et de Gestion (UFR)"  (154 Q) — keep sciences-eco-ufr.json, delete both originals + sciences-eco-modules.json (empty)
 *   5. culture-bf-2025.json         (35 Q) → into culture-bf.json               (167 Q) → 202 Q
 *   6. svt-6e-termd.json            (73 Q) + svt-lycee.json (69 Q)
 *      → "SVT - Collège et Lycée"   (142 Q) — new file svt-college-lycee.json, delete both originals
 *   7. litterature-africaine.json   (24 Q) → into litterature-ufr.json          (115 Q) → 139 Q
 *      Also delete litterature.json (empty stub with same title as litterature-ufr).
 *
 * The script is IDEMPOTENT: re-running it after a successful run is a no-op
 * (the source files have already been deleted). It prints a clear summary at
 * the end and exits with code 0 on success.
 *
 * Usage:
 *   bun run scripts/merge-banks.ts
 */
import { readFile, writeFile, readdir, rm, access } from "node:fs/promises";
import { join } from "node:path";
import { constants as fsConstants } from "node:fs";

const BANKS_DIR = join(process.cwd(), "scripts", "generated", "banks");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface SeedQuestion {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
  difficulty?: string;
  [k: string]: unknown;
}

interface BankJson {
  bankKey?: string;
  title?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  icon?: string;
  color?: string;
  level?: string;
  educationLevel?: string;
  subject?: string;
  questions?: SeedQuestion[];
  [k: string]: unknown;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function readBank(filename: string): Promise<BankJson | null> {
  const p = join(BANKS_DIR, filename);
  if (!(await fileExists(p))) return null;
  try {
    const raw = await readFile(p, "utf-8");
    return JSON.parse(raw) as BankJson;
  } catch (e) {
    console.error(`  ⚠ Could not parse ${filename}:`, e);
    return null;
  }
}

async function writeBank(filename: string, bank: BankJson): Promise<void> {
  const p = join(BANKS_DIR, filename);
  await writeFile(p, JSON.stringify(bank, null, 2) + "\n", "utf-8");
}

async function deleteBank(filename: string): Promise<boolean> {
  const p = join(BANKS_DIR, filename);
  if (!(await fileExists(p))) return false;
  await rm(p);
  return true;
}

function countQuestions(bank: BankJson | null): number {
  return Array.isArray(bank?.questions) ? bank!.questions!.length : 0;
}

/**
 * Append `source.questions` to `target.questions`. Filters out malformed
 * questions (missing required fields) and de-duplicates by question text
 * (case-insensitive) so we don't end up with two identical questions if the
 * two banks happened to overlap.
 */
function mergeQuestions(target: BankJson, source: BankJson): { added: number; skippedDup: number; skippedBad: number } {
  const existing = new Set(
    (target.questions ?? []).map((q) => (q.question ?? "").toLowerCase().trim()),
  );
  let added = 0;
  let skippedDup = 0;
  let skippedBad = 0;
  for (const q of source.questions ?? []) {
    if (
      !q.question ||
      !q.optionA ||
      !q.optionB ||
      !q.optionC ||
      !q.optionD ||
      !q.correctAnswer ||
      !q.explanation
    ) {
      skippedBad++;
      continue;
    }
    const key = q.question.toLowerCase().trim();
    if (existing.has(key)) {
      skippedDup++;
      continue;
    }
    existing.add(key);
    target.questions!.push(q);
    added++;
  }
  return { added, skippedDup, skippedBad };
}

// ---------------------------------------------------------------------------
// Merge operations
// ---------------------------------------------------------------------------

/**
 * Operation 1: merge pays-capitales.json (2 Q) into pays-capitales-monnaies.json (35 Q).
 * Keep the larger bank's metadata; just append the questions.
 */
async function op1_paysCapitales(): Promise<string> {
  const target = await readBank("pays-capitales-monnaies.json");
  const source = await readBank("pays-capitales.json");
  if (!target) return "SKIP (target missing)";
  if (!source) return "SKIP (source already merged)";
  const beforeT = countQuestions(target);
  const beforeS = countQuestions(source);
  const { added, skippedDup, skippedBad } = mergeQuestions(target, source);
  await writeBank("pays-capitales-monnaies.json", target);
  await deleteBank("pays-capitales.json");
  return `OK — ${beforeT}+${beforeS} → ${countQuestions(target)} (added ${added}, dup ${skippedDup}, bad ${skippedBad}) — deleted pays-capitales.json`;
}

/**
 * Operation 2: merge physique-chimie.json (5 Q) into physique-chimie-lycee.json (47 Q).
 */
async function op2_physiqueChimie(): Promise<string> {
  const target = await readBank("physique-chimie-lycee.json");
  const source = await readBank("physique-chimie.json");
  if (!target) return "SKIP (target missing)";
  if (!source) return "SKIP (source already merged)";
  const beforeT = countQuestions(target);
  const beforeS = countQuestions(source);
  const { added, skippedDup, skippedBad } = mergeQuestions(target, source);
  await writeBank("physique-chimie-lycee.json", target);
  await deleteBank("physique-chimie.json");
  return `OK — ${beforeT}+${beforeS} → ${countQuestions(target)} (added ${added}, dup ${skippedDup}, bad ${skippedBad}) — deleted physique-chimie.json`;
}

/**
 * Operation 3: merge histoire-monde.json (1 Q) into histoire.json (69 Q).
 */
async function op3_histoire(): Promise<string> {
  const target = await readBank("histoire.json");
  const source = await readBank("histoire-monde.json");
  if (!target) return "SKIP (target missing)";
  if (!source) return "SKIP (source already merged)";
  const beforeT = countQuestions(target);
  const beforeS = countQuestions(source);
  const { added, skippedDup, skippedBad } = mergeQuestions(target, source);
  await writeBank("histoire.json", target);
  await deleteBank("histoire-monde.json");
  return `OK — ${beforeT}+${beforeS} → ${countQuestions(target)} (added ${added}, dup ${skippedDup}, bad ${skippedBad}) — deleted histoire-monde.json`;
}

/**
 * Operation 4: merge sciences-eco-gestion.json (50 Q) + sciences-eco-ufr.json (104 Q)
 * → "Sciences Économiques et de Gestion (UFR)" (154 Q). Keep sciences-eco-ufr.json
 * (rename its title + bankKey), delete the other two (gestion + modules-empty).
 */
async function op4_sciencesEco(): Promise<string> {
  const a = await readBank("sciences-eco-gestion.json");
  const b = await readBank("sciences-eco-ufr.json");
  if (!b) return "SKIP (sciences-eco-ufr.json missing)";
  const beforeB = countQuestions(b);
  const beforeA = countQuestions(a);
  if (a) {
    const { added, skippedDup, skippedBad } = mergeQuestions(b, a);
    await writeBank("sciences-eco-ufr.json", b);
    const detail = `(added ${added}, dup ${skippedDup}, bad ${skippedBad})`;
    await deleteBank("sciences-eco-gestion.json");
    await deleteBank("sciences-eco-modules.json"); // empty stub
    // Update title + bankKey to reflect the merge.
    const updated = await readBank("sciences-eco-ufr.json");
    if (updated) {
      updated.title = "Sciences Économiques et de Gestion (UFR)";
      updated.bankKey = "sciences-eco-ufr";
      updated.description =
        "Microéconomie, macroéconomie, comptabilité, marketing, finance, GRH, fiscalité, entrepreneuriat — modules UFR.";
      await writeBank("sciences-eco-ufr.json", updated);
    }
    return `OK — ${beforeB}+${beforeA} → ${countQuestions(b)} ${detail} — deleted sciences-eco-gestion.json + sciences-eco-modules.json`;
  }
  // Source already merged — just ensure the empty stub is gone + title is set.
  await deleteBank("sciences-eco-modules.json");
  b.title = "Sciences Économiques et de Gestion (UFR)";
  b.bankKey = "sciences-eco-ufr";
  await writeBank("sciences-eco-ufr.json", b);
  return `OK (idempotent) — ${beforeB} Q — ensured sciences-eco-modules.json is gone`;
}

/**
 * Operation 5: merge culture-bf-2025.json (35 Q) into culture-bf.json (167 Q) → 202 Q.
 */
async function op5_cultureBf(): Promise<string> {
  const target = await readBank("culture-bf.json");
  const source = await readBank("culture-bf-2025.json");
  if (!target) return "SKIP (target missing)";
  if (!source) return "SKIP (source already merged)";
  const beforeT = countQuestions(target);
  const beforeS = countQuestions(source);
  const { added, skippedDup, skippedBad } = mergeQuestions(target, source);
  await writeBank("culture-bf.json", target);
  await deleteBank("culture-bf-2025.json");
  return `OK — ${beforeT}+${beforeS} → ${countQuestions(target)} (added ${added}, dup ${skippedDup}, bad ${skippedBad}) — deleted culture-bf-2025.json`;
}

/**
 * Operation 6: merge svt-6e-termd.json (73 Q) + svt-lycee.json (69 Q)
 * → new "SVT - Collège et Lycée" (142 Q) in svt-college-lycee.json.
 * Delete both originals.
 */
async function op6_svt(): Promise<string> {
  const a = await readBank("svt-6e-termd.json");
  const b = await readBank("svt-lycee.json");
  // If both sources are gone but the merged file exists, this is idempotent.
  const merged = await readBank("svt-college-lycee.json");
  if (!a && !b) {
    if (merged) return `OK (idempotent) — ${countQuestions(merged)} Q in svt-college-lycee.json`;
    return "SKIP (both sources missing)";
  }
  // Build the merged bank. Start from the "lycée" file's metadata (more generic
  // title), then append 6e→Terminale D's questions first (broader scope), then
  // the lycée questions.
  const beforeA = countQuestions(a);
  const beforeB = countQuestions(b);
  const newBank: BankJson = {
    bankKey: "svt-college-lycee",
    title: "SVT - Collège et Lycée",
    description:
      "Biologie, géologie, écologie — du collège (6e) à Terminale D. Cellule, reproduction, génétique, immunologie, géologie, écologie, nutrition, santé.",
    category: "Secondaire",
    subcategory: "SVT",
    icon: b?.icon ?? a?.icon ?? "Dna",
    color: b?.color ?? a?.color ?? "rose",
    level: "BAC",
    educationLevel: "BAC",
    subject:
      "SVT collège et lycée: cellule, reproduction, génétique, immunologie, géologie, écologie, nutrition, santé.",
    questions: [],
  };
  // Merge a (6e→Terminale D) first, then b (lycée).
  if (a) mergeQuestions(newBank, a);
  if (b) mergeQuestions(newBank, b);
  await writeBank("svt-college-lycee.json", newBank);
  await deleteBank("svt-6e-termd.json");
  await deleteBank("svt-lycee.json");
  return `OK — ${beforeA}+${beforeB} → ${countQuestions(newBank)} — deleted svt-6e-termd.json + svt-lycee.json — wrote svt-college-lycee.json`;
}

/**
 * Operation 7: merge litterature-africaine.json (24 Q) into litterature-ufr.json (115 Q) → 139 Q.
 * Also delete the empty litterature.json stub (same title as litterature-ufr).
 */
async function op7_litterature(): Promise<string> {
  const target = await readBank("litterature-ufr.json");
  const source = await readBank("litterature-africaine.json");
  if (!target) return "SKIP (target missing)";
  const beforeT = countQuestions(target);
  let detail = "(no source)";
  if (source) {
    const beforeS = countQuestions(source);
    const { added, skippedDup, skippedBad } = mergeQuestions(target, source);
    detail = `+${beforeS} (added ${added}, dup ${skippedDup}, bad ${skippedBad})`;
    await writeBank("litterature-ufr.json", target);
    await deleteBank("litterature-africaine.json");
  }
  // Always remove the empty litterature.json stub (it has the same title as
  // litterature-ufr and would shadow it during seed).
  const deletedEmpty = await deleteBank("litterature.json");
  return `OK — ${beforeT}${detail} → ${countQuestions(target)} — deleted litterature-africaine.json${deletedEmpty ? " + litterature.json (empty stub)" : ""}`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("============================================================");
  console.log("FIX2 — merge-banks.ts");
  console.log("============================================================");
  console.log(`Banks dir: ${BANKS_DIR}\n`);

  // Snapshot before
  const before = (await readdir(BANKS_DIR)).filter(
    (f) => f.endsWith(".json") && f !== "summary.json",
  );
  console.log(`Before: ${before.length} bank files\n`);

  console.log("Running merge operations…");
  const ops = [
    ["Op 1 — Pays/Capitales", op1_paysCapitales()],
    ["Op 2 — Physique-Chimie", op2_physiqueChimie()],
    ["Op 3 — Histoire", op3_histoire()],
    ["Op 4 — Sciences Éco", op4_sciencesEco()],
    ["Op 5 — Culture BF", op5_cultureBf()],
    ["Op 6 — SVT", op6_svt()],
    ["Op 7 — Littérature", op7_litterature()],
  ] as const;
  for (const [label, p] of ops) {
    const res = await p;
    console.log(`  ${label}: ${res}`);
  }

  // Snapshot after
  const after = (await readdir(BANKS_DIR)).filter(
    (f) => f.endsWith(".json") && f !== "summary.json",
  );
  console.log(`\nAfter: ${after.length} bank files`);
  console.log(`Removed: ${before.length - after.length} file(s)\n`);

  // Count questions per file + total — also validate every file parses as JSON.
  let totalQ = 0;
  let nonEmptyCount = 0;
  let parseErrors = 0;
  for (const f of after) {
    const bank = await readBank(f);
    if (!bank) {
      parseErrors++;
      continue;
    }
    const n = countQuestions(bank);
    if (n > 0) {
      nonEmptyCount++;
      totalQ += n;
    }
  }
  console.log("============================================================");
  console.log("SUMMARY");
  console.log("============================================================");
  console.log(`  Total bank files: ${after.length}`);
  console.log(`  Non-empty banks : ${nonEmptyCount}`);
  console.log(`  Total questions : ${totalQ}`);
  console.log(`  Parse errors    : ${parseErrors}`);
  console.log("");
  if (parseErrors > 0) {
    console.error("✗ Some files failed to parse — see above.");
    process.exit(1);
  }
  console.log("✓ All bank files are valid JSON.");
  console.log("✓ Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
