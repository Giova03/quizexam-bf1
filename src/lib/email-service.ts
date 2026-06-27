/**
 * Email service — thin logging wrapper that mimics a real SMTP gateway.
 *
 * In production you would swap `deliverEmail` for an actual provider call
 * (Resend, Postmark, SendGrid, etc.). For now we persist every outgoing
 * message in the EmailLog table so admins can audit them via /api/email/send
 * (GET) and the broadcast history.
 *
 * The functions exposed here are intentionally small and side-effectful
 * (they write to the DB) so callers can `await sendWelcomeEmail(...)` from
 * either API routes or server actions.
 */
import { db } from "@/lib/db";

export interface SendEmailOptions {
  /** Recipient email address. */
  to: string;
  /** Email subject line. */
  subject: string;
  /** Plain-text body. */
  body: string;
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

  try {
    const log = await db.emailLog.create({
      data: {
        toEmail: cleanTo,
        subject: cleanSubject,
        body: cleanBody,
        type,
        status: "sent",
      },
    });
    console.log(
      `📧 Email [${type}] → ${cleanTo}\n   Sujet: ${cleanSubject}\n   Aperçu: ${cleanBody.slice(0, 120)}${cleanBody.length > 120 ? "…" : ""}`
    );
    return { logId: log.id, delivered: true };
  } catch (err) {
    console.error("📧 sendEmail: failed to persist EmailLog", err);
    return { logId: "", delivered: false };
  }
}

/**
 * Welcome email — sent right after a visitor creates their account.
 */
export async function sendWelcomeEmail(
  userEmail: string,
  userName: string
): Promise<void> {
  await sendEmail({
    to: userEmail,
    subject: "Bienvenue sur QuizExam BF 🎓",
    body: `Bonjour ${userName},

Bienvenue sur QuizExam BF — votre plateforme de préparation aux concours du Burkina Faso !

Vous avez désormais accès à :
• Des dizaines de banques de questions (culture générale, droit, sciences, langues…)
• Des examens blancs complets de 50 questions
• Un mode correction immédiate pour apprendre en temps réel
• Un suivi de progression, badges et classements
• Le forum communautaire pour échanger entre candidats

Pour bien démarrer :
1. Connectez-vous avec votre email et mot de passe
2. Visitez la section "Banques" pour explorer les matières
3. Lancez votre premier quiz en mode immédiate
4. Consultez votre tableau de bord pour suivre votre progression

Bonne préparation et bonne chance pour vos concours !
L'équipe QuizExam BF 🇧🇫`,
    type: "welcome",
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
