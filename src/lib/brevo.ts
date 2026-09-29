/**
 * Brevo (ex-Sendinblue) transactional email gateway — V3.
 *
 * Uses the Brevo HTTPS API (POST /v3/smtp/email) — no SMTP dependency, works
 * on Vercel serverless out of the box.
 *
 * Activation: the service is a no-op until BREVO_API_KEY is set (plus
 * BREVO_SENDER_EMAIL / BREVO_SENDER_NAME for the sender identity). This lets
 * the owner hand over the keys later without any code change: as soon as the
 * env vars land on Vercel, confirmation emails start flowing automatically.
 *
 * Every attempt (sent, failed, or skipped) is mirrored in the EmailLog table
 * so admins keep a full audit trail via /api/email/send (GET).
 */
import { db } from "@/lib/db";
import { captureError } from "@/lib/observability";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

export interface BrevoEmailOptions {
  /** Recipient email address. */
  to: string;
  /** Recipient display name (optional). */
  toName?: string;
  /** Subject line. */
  subject: string;
  /** Rendered HTML body. */
  html?: string;
  /** Plain-text fallback body. */
  text?: string;
  /** EmailLog type tag (default "info"). */
  type?: string;
  /** Skip the internal EmailLog mirror (used when the caller manages its own log row). */
  skipLog?: boolean;
}

/** True when Brevo is fully configured (API key + sender identity). */
export function isBrevoConfigured(): boolean {
  return Boolean(
    process.env.BREVO_API_KEY &&
      process.env.BREVO_SENDER_EMAIL
  );
}

/**
 * Send an email through Brevo. Returns { delivered, provider }:
 *  - delivered=true  → accepted by Brevo (2xx).
 *  - delivered=false → skipped (no API key), or rejected (API error).
 * Never throws: a mailing failure must not break signup or any caller.
 */
export async function sendBrevoEmail({
  to,
  toName,
  subject,
  html,
  text,
  type = "info",
  skipLog = false,
}: BrevoEmailOptions): Promise<{ delivered: boolean; provider: "brevo" | "none" }> {
  const cleanTo = (to ?? "").trim();
  if (!cleanTo || !subject?.trim()) {
    console.warn("✉️ sendBrevoEmail: missing to/subject — skipping");
    return { delivered: false, provider: "none" };
  }

  const configured = isBrevoConfigured();

  if (!configured) {
    // Keys not provided yet — log only, so nothing is lost silently.
    console.log(
      `✉️ Brevo non configuré — email [${type}] NON envoyé (journalisé seulement) → ${cleanTo}\n   Sujet: ${subject}`
    );
    await persistLog(cleanTo, subject, type, "logged_no_brevo", skipLog);
    return { delivered: false, provider: "none" };
  }

  try {
    const response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY as string,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: process.env.BREVO_SENDER_NAME || "QuizExam BF",
          email: process.env.BREVO_SENDER_EMAIL,
        },
        to: [{ email: cleanTo, name: toName || cleanTo }],
        subject,
        htmlContent: html || undefined,
        textContent: text || undefined,
      }),
      // Emails must never hang a request — hard timeout.
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(
        `✉️ Brevo a refusé l'email [${type}] → ${cleanTo} (HTTP ${response.status}): ${body.slice(0, 300)}`
      );
      captureError(new Error(`Brevo send failed: HTTP ${response.status}`), {
        context: "brevo",
        type,
        to: cleanTo,
      });
      await persistLog(cleanTo, subject, type, `failed_http_${response.status}`, skipLog);
      return { delivered: false, provider: "brevo" };
    }

    await persistLog(cleanTo, subject, type, "sent", skipLog);
    console.log(`✉️ Email [${type}] envoyé via Brevo → ${cleanTo} (sujet: ${subject})`);
    return { delivered: true, provider: "brevo" };
  } catch (error) {
    console.error("✉️ Erreur réseau Brevo:", error);
    captureError(error instanceof Error ? error : new Error(String(error)), {
      context: "brevo",
      type,
      to: cleanTo,
    });
    await persistLog(cleanTo, subject, type, "failed_network", skipLog);
    return { delivered: false, provider: "brevo" };
  }
}

/** Best-effort EmailLog mirror — never throws. */
async function persistLog(
  to: string,
  subject: string,
  type: string,
  status: string,
  skipLog = false
): Promise<void> {
  if (skipLog) return;
  try {
    await db.emailLog.create({
      data: { toEmail: to, subject, body: `[brevo:${status}]`, type, status },
    });
  } catch (error) {
    console.warn("✉️ EmailLog persistence failed (non-blocking):", error);
  }
}
