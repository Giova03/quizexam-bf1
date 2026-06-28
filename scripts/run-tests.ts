/**
<<<<<<< Updated upstream
 * run-tests.ts — minimal test runner.
 *
 * Usage:
 *   bun run scripts/run-tests.ts
 *
 * Imports every `*.test.ts` file under `src/lib/__tests__/`, executes them in
 * turn, and prints a summary at the end. Each test file uses a tiny inline
 * `test`/`expect` framework (no Jest / Vitest dependency) and exits the
 * process with a non-zero code on any failure.
 *
 * Test files are listed explicitly (rather than globbed) so that adding a new
 * one is a conscious choice and the runner stays dependency-free.
 */

// --- Global setup: install a localStorage shim BEFORE any test file loads. ---
// Some modules under test (e.g. `favorites-store.ts`) use Zustand's `persist`
// middleware, which captures `localStorage` at module-load time. On the
// server (Bun), `localStorage` is undefined and persist logs a noisy warning
// on every state change. Installing a minimal in-memory shim up-front keeps
// the test output clean.
class MemStorage {
  private m = new Map<string, string>();
  getItem(k: string) {
    return this.m.has(k) ? (this.m.get(k) as string) : null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, String(v));
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  clear() {
    this.m.clear();
  }
}
if (typeof globalThis.localStorage === "undefined") {
  (globalThis as { localStorage?: Storage }).localStorage =
    new MemStorage() as unknown as Storage;
}

// Also belt-and-suspenders: silence the (harmless) persist warning if it
// still slips through. The Zustand middleware calls `console.error` with a
// message starting with "[zustand persist middleware]" whenever the storage
// is unavailable — we drop just those calls and forward everything else.
const origConsoleError = console.error;
console.error = (...args: unknown[]) => {
  const first = String(args[0] ?? "");
  if (first.includes("[zustand persist middleware]")) return;
  origConsoleError(...args);
};

const TEST_FILES = [
  "../src/lib/__tests__/cache.test.ts",
  "../src/lib/__tests__/spaced-repetition.test.ts",
  "../src/lib/__tests__/favorites-store.test.ts",
];

async function main() {
  console.log("========================================");
  console.log("  QuizExam BF — running unit tests");
  console.log("========================================");

  const startedAt = Date.now();
  let anyFailed = false;

  for (const file of TEST_FILES) {
    console.log(`\n→ ${file}`);
    try {
      await import(file);
    } catch (e) {
      // Top-level import error (e.g. a file that fails to load).
      anyFailed = true;
      console.error(
        `  \u2717 Failed to load ${file}: ${(e as Error).message}`
      );
    }
    // Each test file sets process.exitCode = 1 on failure; capture & reset
    // so subsequent files still run, then propagate the failure at the end.
    if (process.exitCode === 1) {
      anyFailed = true;
      process.exitCode = 0;
    }
  }

  const elapsed = Date.now() - startedAt;
  console.log("\n----------------------------------------");
  console.log(`  Total time: ${elapsed}ms`);
  if (anyFailed) {
    console.log("  Result: FAIL \u2717");
    process.exit(1);
  } else {
    console.log("  Result: PASS \u2713");
=======
 * Lance tous les tests unitaires du projet.
 *
 * Usage : `bun run scripts/run-tests.ts`
 *
 * Aucune dépendance externe (pas de Jest) — utilise un mini-framework
 * inline défini dans src/lib/__tests__/test-framework.ts.
 *
 * Les tests sont des modules TypeScript standard qui s'enregistrent
 * via `test(name, fn)` puis sont exécutés via `runAll()`.
 *
 * Le code de sortie est 0 si tous passent, 1 sinon.
 */
import { runAll } from "../src/lib/__tests__/test-framework";

// Importer les fichiers de test pour qu'ils s'enregistrent
import "../src/lib/__tests__/cache.test";
import "../src/lib/__tests__/sm2.test";
import "../src/lib/__tests__/favorites.test";

async function main() {
  console.log("=============================================");
  console.log("  Tests automatisés QuizExam BF");
  console.log("=============================================");

  const result = await runAll();

  console.log("");
  console.log("---------------------------------------------");
  console.log(
    `Total: ${result.total} | Réussis: ${result.passed} | Échoués: ${result.failed}`
  );
  console.log("---------------------------------------------");

  if (result.failed > 0) {
    process.exit(1);
  } else {
    console.log("\n✅ Tous les tests ont réussi.");
>>>>>>> Stashed changes
    process.exit(0);
  }
}

<<<<<<< Updated upstream
main();
=======
main().catch((err) => {
  console.error("Erreur fatale dans le runner de tests :", err);
  process.exit(1);
});
>>>>>>> Stashed changes
