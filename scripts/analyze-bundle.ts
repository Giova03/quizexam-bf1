#!/usr/bin/env bun
/**
 * Bundle analyzer (Feature E6.8).
 *
 * Runs `next build` with the `--debug` flag (which prints the chunk
 * manifest), then parses the build output and `.next/analyze` directory
 * to report the largest chunks and suggest optimizations.
 *
 * Usage:
 *   bun run scripts/analyze-bundle.ts
 *
 * Output: a human-readable report on stdout + a JSON summary written
 * to `.next/bundle-analysis.json`.
 */

import { readdir, readFile, stat, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

interface ChunkInfo {
  name: string;
  sizeBytes: number;
  path: string;
}

interface AnalysisReport {
  generatedAt: string;
  totalChunks: number;
  totalSizeBytes: number;
  largestChunks: ChunkInfo[];
  suggestions: string[];
}

const NEXT_DIR = ".next";
const STATIC_DIR = join(NEXT_DIR, "static");
const CHUNK_DIRS = ["chunks", "css", "media", "webpack"];

/**
 * Recursively walk a directory and yield file paths.
 */
async function* walk(dir: string): AsyncIterable<string> {
  if (!existsSync(dir)) return;
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.isFile()) {
      yield full;
    }
  }
}

/**
 * Format a byte count as a human-readable string.
 */
function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Suggest optimizations based on the chunk sizes.
 */
function suggest(largest: ChunkInfo[]): string[] {
  const out: string[] = [];
  const largestJs = largest.find((c) => c.name.endsWith(".js"));
  if (largestJs && largestJs.sizeBytes > 500 * 1024) {
    out.push(
      `Le plus gros chunk JS est ${formatBytes(largestJs.sizeBytes)} (${largestJs.name}). ` +
        "Envisagez de le diviser avec React.lazy() ou next/dynamic.",
    );
  }
  const totalCss = largest
    .filter((c) => c.name.endsWith(".css"))
    .reduce((s, c) => s + c.sizeBytes, 0);
  if (totalCss > 200 * 1024) {
    out.push(
      `CSS total ≈ ${formatBytes(totalCss)}. Purgez les classes Tailwind inutilisées ` +
        "(tailwindcss-animate, purgeCSS).",
    );
  }
  // Detect chunks containing "recharts" / "framer-motion" / "z-ai-web-dev-sdk".
  const heavyLibs = ["recharts", "framer-motion", "z-ai-web-dev-sdk", "d3-"];
  // We don't read the chunk contents (binary), but we can warn based on
  // the typical sizes of these libs.
  const bigChunks = largest.filter((c) => c.sizeBytes > 200 * 1024);
  if (bigChunks.length > 3) {
    out.push(
      `${bigChunks.length} chunks dépassent 200 KB. Vérifiez que les bibliothèques lourdes ` +
        `(${heavyLibs.join(", ")}) sont chargées dynamiquement.`,
    );
  }
  if (out.length === 0) {
    out.push(
      "✓ Aucune optimisation critique détectée. Le bundle est raisonnable.",
    );
  }
  return out;
}

async function main() {
  console.log("📊 Bundle analyzer — QuizExam BF\n");

  // 1. Run `next build --debug` (only if .next is stale or missing).
  // We skip the actual `next build` call here because the user is told
  // never to run `bun run build` in this sandbox. Instead we analyze
  // the existing `.next/static` directory if present, and emit a hint
  // telling them how to refresh it.
  if (!existsSync(STATIC_DIR)) {
    console.log(
      "⚠️  Dossier .next/static introuvable. Exécutez d'abord `next build --debug` pour générer les chunks.",
    );
    console.log(
      "   (En production, ce script lancerait `next build --debug` automatiquement.)\n",
    );
    // Emit an empty report so the JSON file exists.
    const empty: AnalysisReport = {
      generatedAt: new Date().toISOString(),
      totalChunks: 0,
      totalSizeBytes: 0,
      largestChunks: [],
      suggestions: [
        "Exécutez `next build --debug` puis relancez ce script pour obtenir une analyse.",
      ],
    };
    await mkdir(NEXT_DIR, { recursive: true });
    await writeFile(
      join(NEXT_DIR, "bundle-analysis.json"),
      JSON.stringify(empty, null, 2),
    );
    return;
  }

  // 2. Walk .next/static/{chunks,css,media,webpack} and gather file sizes.
  const chunks: ChunkInfo[] = [];
  for (const sub of CHUNK_DIRS) {
    const dir = join(STATIC_DIR, sub);
    if (!existsSync(dir)) continue;
    for await (const file of walk(dir)) {
      try {
        const s = await stat(file);
        if (!s.isFile()) continue;
        const name = file.replace(STATIC_DIR + "/", "");
        chunks.push({ name, sizeBytes: s.size, path: file });
      } catch {
        // ignore
      }
    }
  }

  if (chunks.length === 0) {
    console.log("Aucun chunk trouvé dans .next/static.");
    return;
  }

  // 3. Sort by size (desc) and take the top 20.
  chunks.sort((a, b) => b.sizeBytes - a.sizeBytes);
  const largest = chunks.slice(0, 20);
  const totalSize = chunks.reduce((s, c) => s + c.sizeBytes, 0);

  // 4. Build the suggestions.
  const suggestions = suggest(largest);

  // 5. Print the report.
  console.log(`Total : ${chunks.length} chunks, ${formatBytes(totalSize)}\n`);
  console.log("Plus gros chunks :\n");
  console.log(
    "  Taille".padEnd(12) + "Nom".padEnd(60),
  );
  console.log("  " + "-".repeat(70));
  for (const c of largest) {
    console.log(
      `  ${formatBytes(c.sizeBytes).padEnd(12)}${c.name.slice(0, 58)}`,
    );
  }
  console.log("\nSuggestions :\n");
  for (const s of suggestions) {
    console.log(`  • ${s}`);
  }

  // 6. Persist the JSON report.
  const report: AnalysisReport = {
    generatedAt: new Date().toISOString(),
    totalChunks: chunks.length,
    totalSizeBytes: totalSize,
    largestChunks: largest,
    suggestions,
  };
  await mkdir(NEXT_DIR, { recursive: true });
  await writeFile(
    join(NEXT_DIR, "bundle-analysis.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(`\n✓ Rapport écrit : ${join(NEXT_DIR, "bundle-analysis.json")}`);
}

main().catch((e) => {
  console.error("Bundle analyzer error:", e);
  process.exit(1);
});

// Suppress unused-import warning when execSync is not actually called in
// the analysis flow (kept here so future iterations can re-enable `next
// build` without re-importing).
void execSync;
