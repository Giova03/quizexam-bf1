/**
 * GET/POST /api/admin/db-migrate — réparation de schéma auto-service.
 *
 * Contexte : les déploiements Vercel n'exposent pas toujours DATABASE_URL au
 * BUILD (variables "Runtime only"), donc `prisma db push` au build peut être
 * sauté → la base de production peut manquer de colonnes récentes
 * (ex. User.googleId) et casser connexion + inscription.
 * L'auto-réparation au boot (instrumentation.ts + db-bootstrap) couvre le cas
 * standard ; cet endpoint permet de forcer la réparation à chaud et de
 * vérifier l'état (page /setup).
 *
 * Actions :
 * - GET ?action=migrate (défaut) — exécute le DDL 100% idempotent et additif.
 *   Aucune lecture ni modification de données utilisateur : sûr à appeler.
 * - GET ?action=status — présence des colonnes/tables attendues
 *   (INFORMATION_SCHEMA, métadonnées seulement).
 * - POST { action: "reset-admin", token, email?, newPassword? } — réinitialise
 *   le mot de passe d'un compte admin. EXIGE un token secret :
 *     * ADMIN_MIGRATE_TOKEN (variable d'environnement Vercel), ou
 *     * SHA-256 hexadécimal de NEXTAUTH_SECRET (si défini ≠ fallback public).
 *   Sans token valide → 403. Chaque usage est journalisé dans AuditLog.
 *
 * La réponse ne divulgue jamais de détails internes (messages Prisma bruts,
 * noms d'hôtes…). Cache-Control: no-store.
 */

import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import {
  readSchemaStatus,
  runSchemaMigration,
} from "@/lib/db-bootstrap";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// auth.ts P2 : fallback public → jamais utilisé pour dériver un token.
const FALLBACK_SECRET_MARKER = "quizexam-bf-fallback-secret-2025-aZ7xK9";

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function constantTimeEquals(a: string, b: string): boolean {
  const ha = sha256(a);
  const hb = sha256(b);
  return timingSafeEqual(Buffer.from(ha, "hex"), Buffer.from(hb, "hex"));
}

function isTokenValid(token: unknown): boolean {
  if (typeof token !== "string" || token.length === 0) return false;
  const adminToken = process.env.ADMIN_MIGRATE_TOKEN;
  if (adminToken && constantTimeEquals(token, adminToken)) return true;
  const nextAuthSecret = process.env.NEXTAUTH_SECRET;
  if (nextAuthSecret && nextAuthSecret !== FALLBACK_SECRET_MARKER) {
    return constantTimeEquals(token, sha256(nextAuthSecret));
  }
  return false;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action") ?? "migrate";

  if (action === "status") {
    return NextResponse.json(await readSchemaStatus(), {
      headers: { "Cache-Control": "no-store" },
    });
  }

  if (action === "migrate") {
    const result = await runSchemaMigration();
    const status = await readSchemaStatus();
    return NextResponse.json(
      { action: "migrate", ...result, status },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { error: "Action inconnue. Actions disponibles : migrate, status." },
    { status: 400, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  let body: { action?: string; token?: string; email?: string; newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corps JSON invalide." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const action = body.action ?? "reset-admin";

  if (action === "migrate" || action === "status") {
    // Idempotent/inoffensif : traité comme en GET (voir route GET).
    const result =
      action === "migrate"
        ? { action, ...(await runSchemaMigration()), status: await readSchemaStatus() }
        : { action, ...(await readSchemaStatus()) };
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  }

  if (action !== "reset-admin") {
    return NextResponse.json(
      { error: "Action inconnue. Actions disponibles : migrate, status, reset-admin." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!isTokenValid(body.token)) {
    return NextResponse.json(
      {
        error:
          "Token requis. Définissez ADMIN_MIGRATE_TOKEN dans Vercel (ou NEXTAUTH_SECRET) puis retransmettez-le dans le champ token.",
      },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  const email = (body.email || process.env.ADMIN_EMAIL || "giobamos03@gmail.com")
    .trim()
    .toLowerCase();
  const newPassword = body.newPassword || "QuizExam@2026-BF";

  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "Le nouveau mot de passe doit faire au moins 8 caractères." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const hash = await bcrypt.hash(newPassword, 10);
    const user = await db.user.upsert({
      where: { email },
      update: { passwordHash: hash, role: "ADMIN" },
      create: {
        email,
        name: "Administrateur",
        passwordHash: hash,
        role: "ADMIN",
      },
    });

    // Journalisation best-effort (jamais bloquante).
    try {
      await db.auditLog.create({
        data: {
          userId: user.id,
          userEmail: email,
          action: "bootstrap.reset-admin-password",
          entity: "User",
          entityId: user.id,
          metadata: JSON.stringify({ via: "/api/admin/db-migrate" }),
        },
      });
    } catch {
      /* l'audit ne doit jamais faire échouer la requête */
    }

    return NextResponse.json(
      { ok: true, action: "reset-admin", email, message: "Mot de passe réinitialisé, rôle ADMIN confirmé." },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[db-migrate] reset-admin failed:", (error as Error).name);
    return NextResponse.json(
      {
        error:
          "Échec de la réinitialisation (base injoignable ou schéma non migré). Appelez d'abord ?action=migrate.",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
