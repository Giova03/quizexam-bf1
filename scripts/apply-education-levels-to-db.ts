/**
 * E1 — apply-education-levels-to-db.ts
 *
 * One-time backfill: reads every bank JSON file in scripts/generated/banks/
 * (already categorised by categorize-levels.ts) and updates the corresponding
 * QuestionBank row in the database with the `educationLevel` value.
 *
 * Matching is done by **title** (case-insensitive, trimmed) because the
 * seed scripts (seed-direct.ts) do NOT persist the `bankKey` field — so we
 * have nothing more reliable to match on.
 *
 * This is a NON-DESTRUCTIVE operation: it only updates the new
 * `educationLevel` column (which `prisma db push` already added with a default
 * of "TOUS"). No existing user data (questions, sessions, answers, users,
 * forum topics, etc.) is touched.
 *
 * Usage:
 *   bun run scripts/apply-education-levels-to-db.ts
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const BANKS_DIR = join(process.cwd(), "scripts", "generated", "banks");

interface BankJson {
  title?: string;
  educationLevel?: string;
}

async function main() {
  const files = await readdir(BANKS_DIR);
  const jsonFiles = files.filter((f) => f.endsWith(".json"));

  const allBanks = await db.questionBank.findMany({
    select: { id: true, title: true, educationLevel: true },
  });
  // Map: normalised title → bank row. Build a Map keyed on a normalized title
  // (lowercased + trimmed + diacritics stripped) so we can match banks from
  // JSON files even when there are minor formatting differences.
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const byTitle = new Map<string, { id: string; title: string }>();
  for (const b of allBanks) {
    byTitle.set(normalize(b.title), { id: b.id, title: b.title });
  }

  let matched = 0;
  let unmatched = 0;
  let skipped = 0;
  const unmatchedTitles: string[] = [];

  for (const file of jsonFiles) {
    const raw = await readFile(join(BANKS_DIR, file), "utf-8");
    let bank: BankJson;
    try {
      bank = JSON.parse(raw) as BankJson;
    } catch {
      continue;
    }
    const level = (bank.educationLevel ?? "TOUS").toUpperCase();
    const key = normalize(bank.title ?? "");
    const row = byTitle.get(key);
    if (!row) {
      unmatched++;
      unmatchedTitles.push(`${file} → "${bank.title ?? "(no title)"}"`);
      continue;
    }
    // Skip if already at the same level (idempotent).
    const existing = allBanks.find((b) => b.id === row.id);
    if (existing && existing.educationLevel === level) {
      skipped++;
      continue;
    }
    await db.questionBank.update({
      where: { id: row.id },
      data: { educationLevel: level },
    });
    matched++;
    console.log(`  ✓ [${level.padEnd(8)}] ${row.title}`);
  }

  // Also: for every Question that belongs to a bank, default its
  // educationLevel to the bank's level. The Prisma default is "TOUS" but
  // for a single-level bank it makes sense to inherit the bank's level so the
  // start-dialog level filter inside a bank works out-of-the-box.
  const banksWithLevel = await db.questionBank.findMany({
    where: { NOT: { educationLevel: "TOUS" } },
    select: { id: true, educationLevel: true },
  });
  let questionUpdated = 0;
  for (const b of banksWithLevel) {
    // Update only questions still at "TOUS" so we don't overwrite per-question
    // overrides that may have been set later by the admin.
    const res = await db.question.updateMany({
      where: { bankId: b.id, educationLevel: "TOUS" },
      data: { educationLevel: b.educationLevel },
    });
    questionUpdated += res.count;
  }

  console.log("\n=== Apply Education Levels to DB (E1) ===");
  console.log(`Banks matched  : ${matched}`);
  console.log(`Banks skipped  : ${skipped} (already at correct level)`);
  console.log(`Banks unmatched: ${unmatched}`);
  if (unmatched > 0) {
    console.log("\nUnmatched bank titles (JSON files with no DB row):");
    unmatchedTitles.forEach((t) => console.log(`  - ${t}`));
  }
  console.log(`\nQuestions updated (inherited bank level): ${questionUpdated}`);
  console.log("✓ Done.");
}

main()
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
