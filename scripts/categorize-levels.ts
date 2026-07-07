/**
 * E1 — categorize-levels.ts
 *
 * Reads every bank JSON file in scripts/generated/banks/, assigns an
 * `educationLevel` field to each based on the bank's title/category/subcategory
 * (and bankKey as a fallback signal), and writes the file back in place.
 *
 * Categorization rules (evaluated in order — first match wins):
 *   • "collège", "6e", "5e", "4e", "3e", "BEPC"        → "BEPC"
 *   • "lycée", "lycee", "terminale", "seconde", "première", "BAC" → "BAC"
 *   • "UFR", "licence", "universit"                    → "LICENCE"
 *   • "concours"                                        → "CONCOURS"
 *   • Otherwise                                          → "TOUS"
 *
 * Idempotent: running it twice produces the same files (it overwrites the
 * `educationLevel` field each time). Existing data in the JSON files is
 * preserved except for the `educationLevel` field which is set/updated.
 *
 * Usage:
 *   bun run scripts/categorize-levels.ts
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const BANKS_DIR = join(process.cwd(), "scripts", "generated", "banks");

type EducationLevel = "BEPC" | "BAC" | "LICENCE" | "CONCOURS" | "TOUS";

interface BankJson {
  title?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  bankKey?: string;
  educationLevel?: string;
  [k: string]: unknown;
}

/**
 * Determine the education level for a bank based on its textual fields.
 * The function inspects the title, description, category, subcategory and
 * bankKey fields, concatenates them to a single lowercase haystack, and
 * returns the first matching level per the rules above.
 */
function classifyBank(bank: BankJson): EducationLevel {
  const haystack = [
    bank.title ?? "",
    bank.description ?? "",
    bank.category ?? "",
    bank.subcategory ?? "",
    bank.bankKey ?? "",
  ]
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // strip diacritics so "lycée" matches "lycee"

  // Order matters: "concours" must be checked AFTER BEPC/BAC/LICENCE because a
  // bank titled "Concours BEPC" should be classified as BEPC (more specific),
  // not CONCOURS. We follow the order specified in the task instructions.
  if (
    haystack.includes("college") ||
    /\b(6e|5e|4e|3e)\b/.test(haystack) ||
    haystack.includes("bepc")
  ) {
    return "BEPC";
  }
  if (
    haystack.includes("lycee") ||
    haystack.includes("terminale") ||
    haystack.includes("seconde") ||
    haystack.includes("premiere") ||
    haystack.includes("bac ")
  ) {
    return "BAC";
  }
  if (
    haystack.includes("ufr") ||
    haystack.includes("licence") ||
    haystack.includes("universit")
  ) {
    return "LICENCE";
  }
  if (haystack.includes("concours")) {
    return "CONCOURS";
  }
  return "TOUS";
}

async function main() {
  const files = await readdir(BANKS_DIR);
  const jsonFiles = files.filter((f) => f.endsWith(".json"));

  const summary: Record<EducationLevel, number> = {
    BEPC: 0,
    BAC: 0,
    LICENCE: 0,
    CONCOURS: 0,
    TOUS: 0,
  };

  let updated = 0;
  let skipped = 0;
  const details: Array<{ file: string; level: EducationLevel; title: string }> =
    [];

  for (const file of jsonFiles) {
    const path = join(BANKS_DIR, file);
    const raw = await readFile(path, "utf-8");
    let bank: BankJson;
    try {
      bank = JSON.parse(raw) as BankJson;
    } catch {
      console.warn(`⚠️  Could not parse ${file}, skipping.`);
      skipped++;
      continue;
    }
    const level = classifyBank(bank);
    const previous = (bank.educationLevel ?? "").toUpperCase();
    bank.educationLevel = level;
    // Pretty-print to keep the files readable + diff-friendly.
    await writeFile(path, JSON.stringify(bank, null, 2) + "\n", "utf-8");

    summary[level]++;
    details.push({ file, level, title: bank.title ?? file });
    if (previous !== level) {
      updated++;
    }
  }

  // Print summary
  console.log("\n=== Education Level Categorization (E1) ===");
  console.log(`Banks processed : ${jsonFiles.length}`);
  console.log(`Banks updated   : ${updated}`);
  console.log(`Banks skipped   : ${skipped}`);
  console.log("\n--- Distribution ---");
  (Object.keys(summary) as EducationLevel[]).forEach((lvl) => {
    console.log(`  ${lvl.padEnd(10)} : ${summary[lvl]}`);
  });

  console.log("\n--- Per-bank assignments ---");
  details
    .sort((a, b) => a.level.localeCompare(b.level) || a.title.localeCompare(b.title))
    .forEach((d) => {
      console.log(`  [${d.level.padEnd(8)}] ${d.title}  (${d.file})`);
    });

  console.log("\n✓ Done.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
