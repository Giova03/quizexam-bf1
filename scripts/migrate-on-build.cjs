#!/usr/bin/env node
/**
 * Auto-migration au build (Vercel).
 *
 * Contexte : le déploiement V3/V4 a ajouté des colonnes au schéma Prisma
 * (User.googleId, User.educationLevel, User.onboardingDone) sans que
 * `prisma db push` soit exécuté sur Supabase → toute requête sur User
 * échouait ("The column User.googleId does not exist").
 *
 * Ce script est branché avant `next build` (package.json → "build") :
 *   "build": "node scripts/migrate-on-build.mjs && next build"
 *
 * Comportement :
 * - DATABASE_URL absente  → warning + sortie 0 (le build Next n'a pas besoin
 *   de base ; on ne casse pas un build de preview sans variable DB).
 * - DATABASE_URL présente → `prisma db push --skip-generate` :
 *     * idempotent : si la base est déjà à jour, no-op rapide ;
 *     * additif uniquement : sans --accept-data-loss, Prisma REFUSE tout
 *       changement destructif en non-interactif → échec visible du build
 *       plutôt que perte de données silencieuse ;
 *     * le generate est déjà fait par postinstall.
 *
 * Plan B si le DDL est bloqué (pooler, permissions) :
 * prisma/manual-migration-2026-09.sql est un script SQL idempotent à coller
 * dans Supabase → SQL Editor (voir docs/database-migration.md).
 */

const { spawn } = require("node:child_process");

function log(msg) {
  console.log(`[migrate-on-build] ${msg}`);
}

async function main() {
  const databaseUrl =
    process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL;

  if (!databaseUrl) {
    console.warn(
      "[migrate-on-build] ⚠ DATABASE_URL absente — synchronisation du schéma ignorée " +
        "(le build continue). En production, définissez DATABASE_URL dans Vercel.",
    );
    process.exit(0);
  }

  // Heuristique anti-accident : ne jamais pointer un db push automatique sur
  // une base locale SQLite/MySQL par mégarde.
  if (/^(file:|mysql:)/i.test(databaseUrl)) {
    log(`URL non-Postgres détectée (${databaseUrl.slice(0, 12)}…) — push ignoré.`);
    process.exit(0);
  }

  log("Synchronisation du schéma Prisma (db push, additif uniquement)…");

  const child = spawn(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["prisma", "db", "push", "--skip-generate"],
    { stdio: "inherit", env: process.env },
  );

  child.on("exit", (code) => {
    if (code === 0) {
      log("✓ Base de données synchronisée avec le schéma.");
      process.exit(0);
    }
    // NON BLOQUANT : un échec de push au build (pooler :6543, variables limitées
    // au runtime, base injoignable…) ne doit JAMAIS empêcher le déploiement du
    // code — sinon l'app reste sur l'ancienne version et la panne persiste.
    // Réparation runtime disponible : GET /api/admin/db-migrate (DDL idempotent
    // additif) et prisma/manual-migration-2026-09.sql (Supabase → SQL Editor).
    console.warn(
      "[migrate-on-build] ⚠ Échec de la synchronisation du schéma (code " + code + ") — build continué.\n" +
        "  Causes fréquentes :\n" +
        "  1) DATABASE_URL non exposée au build (variable 'Runtime only' sur Vercel).\n" +
        "  2) URL pooler Supabase (:6543) — préférer l'URL directe (:5432).\n" +
        "  3) Base injoignable (IP restreinte / credentials).\n" +
        "  Réparation à chaud : GET https://<votre-domaine>/api/admin/db-migrate",
    );
    process.exit(0);
  });

  child.on("error", (err) => {
    console.warn(
      "[migrate-on-build] ⚠ Impossible de lancer prisma db push :",
      err.message,
      "— build continué (réparation runtime : /api/admin/db-migrate).",
    );
    process.exit(0);
  });
}

main();
