/**
 * Instrumentation Next.js — point d'entrée au démarrage du serveur.
 *
 * Rôle : auto-réparation de la base. Si DATABASE_URL est présente, on
 * synchronise le schéma (DDL idempotent additif) au premier boot. Ainsi,
 * ajouter la variable manquante sur un projet Vercel + Redeploy suffit :
 * connexion et inscription remarchent immédiatement, sans intervention.
 *
 * - Ne s'exécute que dans le runtime Node.js (pas l'edge).
 * - Best-effort strict : un échec est journalisé et n'empêche jamais le
 *   démarrage. Réparation manuelle possible via /api/admin/db-migrate et
 *   diagnostic utilisateur via /setup.
 */

export async function register() {
  // Ne s'exécute que côté serveur Node (pas edge, pas browser).
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Sans URL de base, il n'y a rien à faire — /setup guidera la configuration.
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) return;

  const { ensureDatabaseSchema } = await import("@/lib/db-bootstrap");
  ensureDatabaseSchema();
}
