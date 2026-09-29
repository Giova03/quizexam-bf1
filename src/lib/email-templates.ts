/**
 * Email templates (V3) — branded HTML for QuizExam BF transactional emails.
 *
 * All emails share a responsive shell (600px card, emerald header, gold CTA,
 * footer with creator contact) and are inlined-style for maximum client
 * compatibility (Gmail strips <style> blocks in some contexts).
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://quizexam-bf.app";

interface ShellOptions {
  /** Main heading in the email body. */
  title: string;
  /** Preheader — hidden preview text shown in the inbox list. */
  preheader?: string;
  /** HTML body (already escaped where needed). */
  bodyHtml: string;
  /** Primary CTA. */
  ctaLabel?: string;
  ctaUrl?: string;
  /** Small line under the CTA. */
  footnote?: string;
}

export function emailShell({
  title,
  preheader,
  bodyHtml,
  ctaLabel,
  ctaUrl,
  footnote,
}: ShellOptions): string {
  const cta = ctaLabel && ctaUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px auto 8px;"><tr><td align="center" bgcolor="#10b981" style="border-radius:12px;">
        <a href="${ctaUrl}" style="display:inline-block;padding:14px 34px;font-family:'Segoe UI',Arial,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;background:#10b981;">${ctaLabel}</a>
      </td></tr></table>`
    : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${preheader ? `<span style="display:none;font-size:1px;color:transparent;">${preheader}</span>` : ""}</head>
<body style="margin:0;padding:0;background-color:#eef5f2;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;">${preheader ?? ""}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eef5f2;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 6px 24px rgba(4,20,15,0.08);">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#04140f 0%,#064e3b 60%,#0f766e 100%);padding:30px 32px;text-align:center;">
          <div style="font-size:15px;font-weight:800;letter-spacing:0.5px;color:#ffffff;">QuizExam <span style="color:#fcd34d;">BF</span></div>
          <div style="margin-top:4px;font-size:11px;color:#a7f3d0;letter-spacing:2px;text-transform:uppercase;">Réussissez vos concours, question par question</div>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:34px 32px 10px;">
          <h1 style="margin:0 0 16px;font-size:21px;line-height:1.3;color:#062b22;text-align:center;">${title}</h1>
          <div style="font-size:15px;line-height:1.65;color:#334155;">${bodyHtml}</div>
          ${cta}
          ${footnote ? `<p style="margin:14px 0 0;text-align:center;font-size:12px;color:#94a3b8;">${footnote}</p>` : ""}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:26px 32px 30px;">
          <div style="border-top:1px solid #e2e8f0;padding-top:18px;text-align:center;font-size:12px;color:#94a3b8;line-height:1.7;">
            QuizExam BF · Ouagadougou, Burkina Faso 🇧🇫<br>
            Créateur : BAMOGO Pingdwendé Giovanni · <a href="mailto:giobamos03@gmail.com" style="color:#059669;text-decoration:none;">giobamos03@gmail.com</a><br>
            <a href="${APP_URL}" style="color:#059669;text-decoration:none;">Ouvrir la plateforme</a>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Confirmation email — sent right after account creation (credentials signup
 * or first Google sign-in). Confirms the account and highlights first steps.
 */
export function welcomeConfirmationEmail(userName: string): {
  subject: string;
  html: string;
  text: string;
} {
  const firstName = userName.trim().split(" ")[0] || "nouveau candidat";

  const subject = "Bienvenue sur QuizExam BF — votre compte est confirmé 🎓";
  const html = emailShell({
    title: `Bienvenue, ${firstName} ! Votre compte est prêt.`,
    preheader: "Votre compte QuizExam BF est actif — lancez votre premier quiz dès maintenant.",
    bodyHtml: `
      <p style="margin:0 0 14px;">Votre compte <strong>QuizExam BF</strong> vient d'être créé et confirmé avec succès. Vous avez maintenant accès à :</p>
      <ul style="margin:0 0 14px;padding-left:20px;">
        <li style="margin-bottom:6px;"><strong>Des dizaines de banques de questions</strong> classées par niveau (BEPC, BAC, Licence, Concours) et par matière ;</li>
        <li style="margin-bottom:6px;"><strong>Des examens blancs chronométrés</strong> dans les conditions réelles du concours ;</li>
        <li style="margin-bottom:6px;"><strong>La correction immédiate</strong> avec explications détaillées pour chaque question ;</li>
        <li style="margin-bottom:6px;"><strong>Un suivi de progression intelligent</strong> : badges, ligues, quêtes et révision espacée ;</li>
        <li><strong>Le mode hors ligne</strong> : révisez sans internet, tout se synchronise à la reconnexion.</li>
      </ul>
      <p style="margin:0;">Pour bien démarrer, nous vous conseillons de lancer votre premier quiz en mode <em>correction immédiate</em> — même 10 minutes par jour font la différence.</p>`,
    ctaLabel: "Commencer maintenant",
    ctaUrl: APP_URL,
    footnote: "Cet email confirme la création de votre compte. Aucune action supplémentaire n'est requise.",
  });

  const text = `Bonjour ${firstName},

Bienvenue sur QuizExam BF — votre compte est confirmé !

Vous avez accès à :
• Des dizaines de banques de questions (BEPC, BAC, Licence, Concours)
• Des examens blancs chronométrés
• La correction immédiate avec explications
• Un suivi de progression : badges, ligues, quêtes
• Le mode hors ligne

Commencez maintenant : ${APP_URL}

Bonne préparation et bonne chance pour vos concours !
L'équipe QuizExam BF 🇧🇫`;

  return { subject, html, text };
}
