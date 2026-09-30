import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { db } from "@/lib/db";
import { runSchemaMigration } from "@/lib/db-bootstrap";
import { sendEmail } from "@/lib/email-service";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/forgot-password — V7 "Mot de passe oublié".
 *
 * 1. Cherche le compte par email (réponse identique si le compte n'existe
 *    pas — pas d'énumération d'adresses).
 * 2. Invalide les jetons précédents, puis crée un jeton à usage unique
 *    (validité 1 h). Seule l'empreinte SHA-256 du jeton est stockée.
 * 3. Envoie le lien de réinitialisation par email via Brevo.
 *
 * Échappatoire propriétaire : si l'envoi échoue pour le compte admin de
 * secours, le lien est renvoyé dans la réponse (compte de gestion, repo
 * privé) afin que le propriétaire ne puisse jamais être bloqué.
 */

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 heure

/** Anti-abus en mémoire : max 5 demandes / 15 min par adresse IP+email. */
const attempts = new Map<string, number[]>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function rateLimited(key: string): boolean {
  const now = Date.now();
  const hits = (attempts.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  attempts.set(key, hits);
  if (attempts.size > 500) {
    // hygiène mémoire : purge simple
    for (const [k, v] of attempts) {
      if (!v.some((t) => now - t < WINDOW_MS)) attempts.delete(k);
    }
  }
  return hits.length > MAX_ATTEMPTS;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json().catch(() => ({ email: "" }));
    const cleanEmail = String(email ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json(
        { error: "Adresse email invalide." },
        { status: 400 }
      );
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    if (rateLimited(`${ip}:${cleanEmail}`)) {
      return NextResponse.json(
        { error: "Trop de demandes. Réessayez dans quelques minutes." },
        { status: 429 }
      );
    }

    // Table absente (premier déploiement) ? Auto-réparation idempotente.
    let user = null as null | { id: string; name: string; email: string };
    try {
      const found = await db.user.findUnique({ where: { email: cleanEmail } });
      user = found
        ? { id: found.id, name: found.name, email: found.email }
        : null;
    } catch (error) {
      const msg = (error as { message?: string }).message ?? "";
      if (/does not exist in the current database|P2021/i.test(msg)) {
        await runSchemaMigration();
        const found = await db.user.findUnique({ where: { email: cleanEmail } });
        user = found
          ? { id: found.id, name: found.name, email: found.email }
          : null;
      } else {
        throw error;
      }
    }

    if (!user) {
      // Pas d'énumération : réponse identique, aucun email.
      return NextResponse.json({ ok: true, sent: true });
    }

    // Invalide les anciens jetons du compte, puis crée le nouveau.
    await db.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    const rawToken = randomBytes(32).toString("hex");
    await db.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(rawToken),
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      },
    });

    const origin = new URL(request.url).origin;
    const resetUrl = `${origin}/?reset=${rawToken}`;

    const result = await sendEmail({
      to: user.email,
      toName: user.name,
      subject: "QuizExam BF — Réinitialisation de votre mot de passe",
      type: "password_reset",
      body: `Réinitialisez votre mot de passe (lien valable 1 heure) : ${resetUrl}`,
      html: `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;padding:24px;">
  <table role="presentation" width="100%" style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(15,23,42,.08);">
    <tr><td style="background:linear-gradient(135deg,#1d4ed8,#10b981);padding:26px 28px;color:#fff;font-size:20px;font-weight:bold;">QuizExam <span style="color:#fbbf24;">BF</span>
      <div style="font-size:12px;opacity:.85;font-weight:normal;margin-top:4px;">Réinitialisation de mot de passe</div></td></tr>
    <tr><td style="padding:28px;">
      <h1 style="margin:0 0 12px;font-size:19px;color:#0f172a;">Bonjour ${user.name},</h1>
      <p style="font-size:14px;line-height:1.7;color:#334155;">Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau. Ce lien est <strong>valable 1 heure</strong> et ne peut être utilisé qu'une seule fois.</p>
      <p style="margin:22px 0;"><a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#10b981);color:#fff;font-weight:bold;font-size:14px;padding:12px 26px;border-radius:12px;text-decoration:none;">Choisir un nouveau mot de passe</a></p>
      <p style="font-size:12px;color:#64748b;word-break:break-all;">Si le bouton ne s'affiche pas, copiez ce lien : ${resetUrl}</p>
      <p style="font-size:12px;color:#94a3b8;">Vous n'êtes pas à l'origine de cette demande ? Ignorez simplement cet email — votre mot de passe actuel reste actif.</p>
    </td></tr>
    <tr><td style="padding:14px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;">© 2026 QuizExam BF — BAMOGO Pingdwendé Giovanni · Ouagadougou, Burkina Faso</td></tr>
  </table>
</body></html>`,
    });

    // Échappatoire propriétaire : jamais bloqué même si Brevo refuse.
    const ADMIN_RECOVERY_EMAIL = "giobamos03@gmail.com";
    if (!result.delivered && cleanEmail === ADMIN_RECOVERY_EMAIL) {
      return NextResponse.json({
        ok: true,
        sent: false,
        ownerLink: resetUrl,
        note: "Envoi Brevo échoué — lien direct fourni pour le compte de gestion.",
      });
    }

    return NextResponse.json({ ok: true, sent: result.delivered });
  } catch (error) {
    console.error("forgot-password:", error);
    return NextResponse.json(
      { error: "Erreur serveur. Réessayez dans un instant." },
      { status: 500 }
    );
  }
}
