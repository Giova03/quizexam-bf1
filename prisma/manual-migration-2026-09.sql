-- =============================================================================
-- QuizExam BF — Migration manuelle (plan B) — 2026-09
-- =============================================================================
-- À exécuter UNIQUEMENT si la synchronisation automatique au build échoue.
-- Où : Supabase Dashboard → SQL Editor → New query → coller → Run.
-- Sécurité : 100% idempotent (IF NOT EXISTS partout) — peut être relancé
-- sans risque, n'efface ni ne modifie aucune donnée existante.
--
-- Contenu : colonnes ajoutées par les versions V3/V4 :
--   * User.googleId        (connexion Google — V3)
--   * User.educationLevel  (onboarding niveau — V3)
--   * User.onboardingDone  (onboarding terminé — V3)
--   * AuditLog             (journal d'audit staff — P4, au cas où)
-- =============================================================================

-- 1) Colonnes User (V3 — Google OAuth + onboarding)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "educationLevel" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "onboardingDone" BOOLEAN NOT NULL DEFAULT false;

-- Index unique sur l'identité Google (convention de nommage Prisma)
CREATE UNIQUE INDEX IF NOT EXISTS "User_googleId_key" ON "User"("googleId");

-- 2) Table AuditLog (P4 — journal d'audit staff), au cas où elle manquerait
CREATE TABLE IF NOT EXISTS "AuditLog" (
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
);

CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx"      ON "AuditLog"("createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");
CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx"          ON "AuditLog"("userId");
