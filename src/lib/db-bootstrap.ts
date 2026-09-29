/**
 * Bootstrap de schéma — exécuté au démarrage du serveur (instrumentation.ts)
 * et exposé manuellement via /api/admin/db-migrate.
 *
 * Objectif : auto-réparation. Quand un déploiement démarre avec une base qui
 * n'a pas encore reçu les colonnes récentes (ex. User.googleId ajouté par la
 * V3), le DDL idempotent ci-dessous les ajoute automatiquement au premier
 * boot — connexion et inscription fonctionnent immédiatement, sans action
 * manuelle.
 *
 * Garanties :
 * - Idempotent : chaque statement utilise IF NOT EXISTS → relançable à l'infini.
 * - Additif uniquement : aucun DROP, aucun ALTER destructif, aucune donnée
 *   lue ni modifiée.
 * - Best-effort : un échec (base injoignable, droits insuffisants) ne fait
 *   JAMAIS planter le serveur — il est journalisé et l'app démarre normalement.
 */

import { db } from "./db";

export const MIGRATION_STATEMENTS: string[] = [
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleId" TEXT`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "educationLevel" TEXT`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "onboardingDone" BOOLEAN NOT NULL DEFAULT false`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_googleId_key" ON "User"("googleId")`,
  `CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id"        TEXT        NOT NULL,
    "userId"    TEXT        NOT NULL,
    "userEmail" TEXT        NOT NULL,
    "action"    TEXT        NOT NULL,
    "entity"    TEXT        NOT NULL,
    "entityId"  TEXT        NOT NULL,
    "oldValue"  TEXT,
    "newValue"  TEXT,
    "ip"        TEXT,
    "metadata"  TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt")`,
  `CREATE INDEX IF NOT EXISTS "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId")`,
  `CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId")`,
];

const EXPECTED_USER_COLUMNS = ["googleId", "educationLevel", "onboardingDone"] as const;

export type SchemaMigrationResult = {
  ok: boolean;
  applied: string[];
  failed: number;
};

export async function runSchemaMigration(): Promise<SchemaMigrationResult> {
  const applied: string[] = [];
  let failed = 0;
  for (const statement of MIGRATION_STATEMENTS) {
    try {
      await db.$executeRawUnsafe(statement);
      applied.push(statement.split("\n")[0].slice(0, 72));
    } catch (error) {
      failed += 1;
      console.error("[db-bootstrap] statement failed:", (error as Error).name);
    }
  }
  return { ok: failed === 0, applied, failed };
}

export async function readSchemaStatus(): Promise<{
  database: "connected" | "unreachable";
  userColumns: Record<string, boolean>;
  auditLogTable: boolean;
}> {
  try {
    const columns = await db.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'User'`;
    const tables = await db.$queryRaw<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables
      WHERE table_name = 'AuditLog'`;
    const present = new Set(columns.map((c) => c.column_name));
    const userColumns: Record<string, boolean> = {};
    for (const col of EXPECTED_USER_COLUMNS) userColumns[col] = present.has(col);
    return {
      database: "connected",
      userColumns,
      auditLogTable: tables.length > 0,
    };
  } catch {
    return {
      database: "unreachable",
      userColumns: {},
      auditLogTable: false,
    };
  }
}

/**
 * Fire-and-forget appelé par instrumentation.ts au boot : ne bloque jamais le
 * démarrage, ne lève jamais (tout est attrapé et journalisé).
 */
export function ensureDatabaseSchema(): void {
  void (async () => {
    try {
      const result = await runSchemaMigration();
      if (result.ok) {
        console.log(
          `[db-bootstrap] ✓ schéma vérifié/synchronisé (${result.applied.length} statements OK)`,
        );
      } else {
        console.warn(
          `[db-bootstrap] ⚠ schéma partiellement synchronisé (${result.failed} échecs) — " +
            "réessayez via GET /api/admin/db-migrate`,
        );
      }
    } catch (error) {
      console.warn(
        "[db-bootstrap] ⚠ synchronisation de schéma ignorée au boot :",
        error instanceof Error ? error.name : String(error),
      );
    }
  })();
}
