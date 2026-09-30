import { NextResponse } from "next/server";
import { createHash } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { runSchemaMigration } from "@/lib/db-bootstrap";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/reset-password — consomme un jeton "mot de passe oublié".
 *
 * Corps : { token: string, password: string }
 *  - le jeton brut (URL ?reset=…) est haché SHA-256 puis comparé à la base ;
 *  - il doit être inutilisé et non expiré (validité 1 h) ;
 *  - le mot de passe est mis à jour (bcrypt coût 10) et TOUS les jetons du
 *    compte sont invalidés (y compris les sessions "mot de passe oublié").
 *
 * La réponse ne fait aucune différence entre un jeton invalide, expiré ou
 * déjà utilisé : { error: "Lien invalide ou expiré" } — pas d'information
 * exploitable pour un attaquant.
 */

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json().catch(() => ({}));
    const cleanToken = String(token ?? "").trim();
    const cleanPassword = String(password ?? "");

    if (!cleanToken) {
      return NextResponse.json({ error: "Lien invalide ou expiré." }, { status: 400 });
    }
    if (cleanPassword.length < 6) {
      return NextResponse.json(
        { error: "Mot de passe min. 6 caractères." },
        { status: 400 }
      );
    }

    // Table absente (premier déploiement) ? Auto-réparation idempotente.
    let record: { id: string; userId: string } | null = null;
    try {
      record = await db.passwordResetToken.findUnique({
        where: { tokenHash: sha256(cleanToken) },
        select: { id: true, userId: true },
      });
    } catch (error) {
      const msg = (error as { message?: string }).message ?? "";
      if (/does not exist in the current database|P2021/i.test(msg)) {
        await runSchemaMigration();
        record = await db.passwordResetToken.findUnique({
          where: { tokenHash: sha256(cleanToken) },
          select: { id: true, userId: true },
        });
      } else {
        throw error;
      }
    }

    if (!record) {
      return NextResponse.json({ error: "Lien invalide ou expiré." }, { status: 400 });
    }

    const full = await db.passwordResetToken.findUnique({ where: { id: record.id } });
    if (
      !full ||
      full.usedAt ||
      full.expiresAt.getTime() < Date.now()
    ) {
      return NextResponse.json({ error: "Lien invalide ou expiré." }, { status: 400 });
    }

    const hash = await bcrypt.hash(cleanPassword, 10);
    await db.$transaction([
      db.user.update({
        where: { id: record.userId },
        data: { passwordHash: hash },
      }),
      db.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      // Sécurité : plus AUCUN autre jeton actif pour ce compte.
      db.passwordResetToken.updateMany({
        where: { userId: record.userId, id: { not: record.id }, usedAt: null },
        data: { usedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("reset-password:", error);
    return NextResponse.json(
      { error: "Erreur serveur. Réessayez dans un instant." },
      { status: 500 }
    );
  }
}
