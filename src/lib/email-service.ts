/**
 * Email service — V3: routes every outgoing message through the Brevo
 * transactional gateway (see src/lib/brevo.ts) while keeping the EmailLog
 * audit trail that admins browse via /api/email/send (GET).
 *
 * Behaviour matrix:
 *  - BREVO_API_KEY set  → real delivery via Brevo; EmailLog row records the
 *    final status ("sent" / "failed_http_*" / "failed_network").
 *  - No key             → EmailLog row status "logged_no_brevo" (dev-friendly:
 *    nothing breaks, messages stay inspectable in the admin history).
 *
 * All functions are best-effort and never throw so callers (signup, forum
 * replies, broadcast…) keep working even when the mail stack is degraded.
 */
import { db } from "@/lib/db";
import { sendBrevoEmail } from "@/lib/brevo";
import { welcomeConfirmationEmail } from "@/lib/email-templates";

export interface SendEmailOptions {
  /** Recipient email address. */
  to: string;
  /** Email subject line. */
  subject: string;
  /** Plain-text body. */
  body: string;
  /** Optional rendered HTML body (used by branded templates). */
  html?: string;
  /** Recipient display name (optional). */
  toName?: string;
  /** Optional type tag stored on the EmailLog row (default "info"). */
  type?: string;
}

/**
 * Low-level email sender. Persists the message in the EmailLog table and
 * logs it to the server console so it shows up in dev.log.
 *
 * Returns the created EmailLog row's id so callers can correlate the send
 * with later delivery events (opens, clicks, bounces…).
 */
export async function sendEmail({
  to,
  subject,
  body,
  html,
  toName,
  type = "info",
}: SendEmailOptions): Promise<{ logId: string; delivered: boolean }> {
  // Basic validation — refuse to send to an empty / whitespace-only address.
  const cleanTo = (to ?? "").trim();
  const cleanSubject = (subject ?? "").trim();
  const cleanBody = (body ?? "").trim();
  if (!cleanTo || !cleanSubject) {
    console.warn("📧 sendEmail: missing to/subject — skipping", { to, subject });
    return { logId: "", delivered: false };
  }

  // 1) Attempt real delivery through Brevo (no-op + explicit status when the
  //    API key is absent). skipLog: we own the EmailLog row here.
  const result = await sendBrevoEmail({
    to: cleanTo,
    toName,
    subject: cleanSubject,
    html,
    text: cleanBody,
    type,
    skipLog: true,
  });

  // 2) Persist the full message in the EmailLog audit trail.
  try {
    const log = await db.emailLog.create({
      data: {
        toEmail: cleanTo,
        subject: cleanSubject,
        body: cleanBody,
        type,
        status: result.delivered ? "sent" : result.provider === "none" ? "logged_no_brevo" : "failed",
      },
    });
    return { logId: log.id, delivered: result.delivered };
  } catch (err) {
    console.error("📧 sendEmail: failed to persist EmailLog", err);
    return { logId: "", delivered: result.delivered };
  }
}

/**
 * Welcome / confirmation email — sent right after a visitor creates their
 * account (credentials signup or first Google sign-in). Uses the branded
 * Brevo-ready HTML template.
 */
export async function sendWelcomeEmail(
  userEmail: string,
  userName: string
): Promise<void> {
  const template = welcomeConfirmationEmail(userName);
  await sendEmail({
    to: userEmail,
    toName: userName,
    subject: template.subject,
    body: template.text,
    html: template.html,
    type: "welcome_confirmation",
  });
}

/**
 * Daily reminder — sent to users who opted-in to email reminders.
 * Encourages them to keep their streak alive.
 */
export async function sendDailyReminder(
  userEmail: string,
  userName: string
): Promise<void> {
  await sendEmail({
    to: userEmail,
    subject: "⏰ Votre quiz du jour vous attend !",
    body: `Bonjour ${userName},

C'est l'heure de votre révision quotidienne sur QuizExam BF ! 📚

Pourquoi ne pas faire un quiz rapide aujourd'hui ?
• Le défi du jour vous attend sur la page d'accueil
• Reprenez vos favoris pour ancrer vos connaissances
• Participez à la compétition hebdomadaire

Rester régulier est la clé du succès — même 10 minutes par jour font une différence !

Accédez à la plateforme : https://quizexam-bf.app

Bonne révision,
L'équipe QuizExam BF`,
    type: "daily_reminder",
  });
}

/**
 * Reply notification — sent to a topic author when someone replies.
 */
export async function sendReplyNotification(
  userEmail: string,
  topicTitle: string,
  replyAuthor: string
): Promise<void> {
  await sendEmail({
    to: userEmail,
    subject: `💬 Nouvelle réponse : ${topicTitle}`,
    body: `Bonjour,

${replyAuthor} a répondu à votre sujet "${topicTitle}" sur le forum QuizExam BF.

Pour lire la réponse et continuer la discussion, rendez-vous sur la plateforme :
https://quizexam-bf.app

À bientôt,
L'équipe QuizExam BF`,
    type: "reply_notification",
  });
}

/**
 * Challenge reminder — sent to users who opted-in to challenge notifications.
 */
export async function sendChallengeReminder(
  userEmail: string,
  challengeTheme: string
): Promise<void> {
  await sendEmail({
    to: userEmail,
    subject: `🎯 Nouveau défi : ${challengeTheme}`,
    body: `Bonjour,

Un nouveau défi quotidien est disponible sur QuizExam BF !

🎯 Thème du jour : ${challengeTheme}

Relevez le défi et gagnez des XP bonus. Les défis sont une excellente façon de tester
vos connaissances sur des thématiques variées.

Connectez-vous dès maintenant : https://quizexam-bf.app

Bonne chance !
L'équipe QuizExam BF`,
    type: "challenge_reminder",
  });
}
