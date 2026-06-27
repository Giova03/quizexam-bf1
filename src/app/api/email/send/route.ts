import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendEmail } from "@/lib/email-service";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/email/send
 *
 * Admin-only endpoint that sends a custom email to a specific user (or any
 * email address). The body is persisted to the EmailLog table by
 * `sendEmail()` and also logged to the server console for dev visibility.
 *
 * Body: { to: string, subject: string, body: string, type?: string }
 *
 * The endpoint also supports a GET variant that returns the current user's
 * recent EmailLog rows (kept for backwards compatibility with the existing
 * notifications panel UI).
 */
async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return null;
  }
  return session;
}

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé (admin requis)" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const to = typeof body.to === "string" ? body.to.trim() : "";
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const bodyText = typeof body.body === "string" ? body.body : "";
    const type = typeof body.type === "string" && body.type.trim() ? body.type.trim() : "info";

    if (!to || !subject || !bodyText.trim()) {
      return NextResponse.json(
        { error: "Champs 'to', 'subject' et 'body' sont requis" },
        { status: 400 }
      );
    }

    // Basic email-format sanity check (not RFC-perfect but catches obvious typos).
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return NextResponse.json(
        { error: "Adresse email destinataire invalide" },
        { status: 400 }
      );
    }

    const { logId, delivered } = await sendEmail({
      to,
      subject,
      body: bodyText,
      type,
    });

    if (!delivered) {
      return NextResponse.json(
        { error: "Échec de l'envoi de l'email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Email envoyé à ${to}`,
      logId,
    });
  } catch (error) {
    console.error("email/send error:", error);
    return NextResponse.json({ error: "Erreur lors de l'envoi" }, { status: 500 });
  }
}

/**
 * GET /api/email/send
 *
 * Returns the current user's recent EmailLog rows (sent to their own email).
 * Used by the notifications panel UI. Available to any authenticated user.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ emails: [] });
    const userEmail = (session.user as { email?: string }).email ?? "";
    if (!userEmail) return NextResponse.json({ emails: [] });

    const logs = await db.emailLog.findMany({
      where: { toEmail: userEmail },
      orderBy: { sentAt: "desc" },
      take: 20,
    });
    return NextResponse.json({ emails: logs });
  } catch {
    return NextResponse.json({ emails: [] });
  }
}
