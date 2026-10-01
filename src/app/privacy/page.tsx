import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de confidentialité — QuizExam BF",
  description:
    "Comment QuizExam BF collecte, utilise et protège vos données personnelles.",
};

/* Couleurs alignées sur l'app (Tailwind @theme) — palette sombre/émeraude. */

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "1. Qui nous sommes",
    body: [
      "QuizExam BF (« la plateforme », « nous ») est une application web de préparation aux examens et concours au Burkina Faso : banques de questions, QCM, examens blancs, statistiques de progression et assistant pédagogique intelligent.",
      "Éditeur de la plateforme : Giovanni Bamos — développeur fullstack (ingénieur de travaux en génie logiciel), Ouagadougou, Burkina Faso.",
      "Contact pour toute question relative à vos données : giobamos03@gmail.com",
    ],
  },
  {
    title: "2. Données que nous collectons",
    body: [
      "Données de compte : adresse email, nom d'affichage (pseudonyme ou nom réel selon votre choix), identifiant de compte, rôle (visiteur, contributeur, administrateur) et date d'inscription. Si vous vous connectez via Google, nous recevons également votre identifiant Google et une photo de profil éventuelle.",
      "Données d'apprentissage : réponses aux QCM, résultats de sessions, banques de questions consultées ou créées, favoris, badges, points d'expérience (XP), séries (streaks), classement et historique de progression.",
      "Données techniques : journal de connexion (horodatage), informations de sécurité (empreinte de session), type d'appareil et navigateur, de manière agrégée pour assurer le fonctionnement et la sécurité du service.",
      "Nous ne collectons AUCUNE donnée de paiement bancaire : si des fonctionnalités payantes sont activées, elles sont traitées exclusivement par notre prestataire de paiement agréé (FedaPay), sans que nous voyions vos identifiants bancaires.",
    ],
  },
  {
    title: "3. Finalités de la collecte",
    body: [
      "Fournir le service : créer et sécuriser votre compte, conserver votre progression, personnaliser votre apprentissage, vous permettre de participer aux classes, concours et groupes d'étude.",
      "Communiquer : envoyer les emails essentiels (bienvenue, réinitialisation de mot de passe, alertes de sécurité) et, si vous y avez consenti, des rappels d'étude désactivables à tout moment depuis vos préférences.",
      "Améliorer la plateforme : statistiques globales et anonymisées (banques les plus utilisées, taux de réussite) pour orienter les améliorations. Aucune vente de données, aucune publicité ciblée, aucun profilage publicitaire.",
      "Sécuriser : prévention des abus, détection des comptes frauduleux, protection de la tour de contrôle (espace administrateur).",
    ],
  },
  {
    title: "4. Connexion via Google",
    body: [
      "Le bouton « Continuer avec Google » est fourni par Google Identity Services. Lorsque vous l'utilisez, Google nous transmet uniquement : votre adresse email (vérifiée), votre nom d'affichage et votre identifiant Google.",
      "Nous utilisons ces informations pour créer votre compte ou le relier à un compte existant portant le même email : votre progression, vos badges et votre code de parrainage sont alors conservés.",
      "Google ne partage aucune donnée supplémentaire avec nous et ne reçoit de nous aucune donnée. Vous pouvez révoquer l'accès à tout moment depuis votre compte Google (Paramètres → Sécurité → Applications connectées).",
    ],
  },
  {
    title: "5. Cookies et stockage local",
    body: [
      "Cookie de session (strictement nécessaire) : un cookie chiffré signé nommé __Secure-next-auth.session-token permet de vous maintenir connecté. Il ne contient ni publicité, ni traceur tiers.",
      "Stockage local (localStorage) : vos préférences d'interface (langue : français, anglais ou mooré ; thème clair/sombre) et le cache hors-ligne de vos révisions. Vous pouvez le vider à tout moment depuis les paramètres de votre navigateur.",
      "Nous n'utilisons AUCUN cookie publicitaire et AUCUN tracker tiers (pas de Google Analytics, pas de pixel publicitaire).",
    ],
  },
  {
    title: "6. Sous-traitants et hébergement",
    body: [
      "Hébergement applicatif : Vercel Inc. (réseau mondial d'infrastructure) — base légale : exécution du service.",
      "Base de données : Supabase Inc. (PostgreSQL managé, chiffrement au repos et en transit) — vos données de compte et de progression y sont stockées.",
      "Emails transactionnels : Brevo (Sendinblue SAS, France) — envoi du mail de bienvenue, des liens de réinitialisation de mot de passe et des rappels opt-in.",
      "Connexion Google : Google Ireland Ltd. — uniquement au moment où VOUS choisissez de vous connecter avec Google.",
      "Ces prestataires n'ont pas le droit d'utiliser vos données pour d'autres finalités que l'exécution technique du service.",
    ],
  },
  {
    title: "7. Conservation",
    body: [
      "Données de compte et d'apprentissage : conservées tant que votre compte est actif, et 12 mois après votre dernière activité, puis supprimées automatiquement.",
      "Emails transactionnels (copies techniques chez Brevo) : conservés selon les durées légales et de sécurité applicables, au maximum 12 mois.",
      "Journaux de sécurité : 6 mois maximum.",
    ],
  },
  {
    title: "8. Vos droits",
    body: [
      "Conformément à la loi n°001-2004/AN du 1er avril 2004 portant réglementation de la protection des personnes à l'égard du traitement des données à caractère personnel au Burkina Faso, et à titre de bonnes pratiques avec le RGPD européen, vous disposez des droits suivants :",
      "Accès : obtenir la confirmation que vos données sont traitées et en recevoir une copie (export depuis votre profil).",
      "Rectification : corriger votre nom, email et préférences depuis votre profil.",
      "Suppression : demander la suppression définitive de votre compte et de toutes vos données — un simple email à giobamos03@gmail.com suffit, traité sous 72 heures maximum.",
      "Opposition et retrait de consentement : désactiver les rappels email à tout moment ; révoquer la connexion Google depuis votre compte Google.",
      "Aucune décision automatisée ne vous est opposée : l'assistant IA est un outil pédagogique d'aide, jamais un juge de vos capacités.",
    ],
  },
  {
    title: "9. Sécurité",
    body: [
      "Les mots de passe sont stockés exclusivement sous forme de hachage bcrypt (coût 10) : même nous ne pouvons pas les lire.",
      "Toutes les communications sont chiffrées via HTTPS/TLS (HSTS activé). Les sessions sont signées et chiffrées (JWE).",
      "L'espace administrateur est protégé par contrôle d'accès basé sur les rôles (RBAC) et journalisé (audit log).",
    ],
  },
  {
    title: "10. Mineurs",
    body: [
      "La plateforme est ouverte aux élèves de collège et lycée. Si vous êtes mineur, demandez l'accord d'un parent ou tuteur avant de créer un compte. Un parent peut demander la suppression des données de son enfant à tout moment via giobamos03@gmail.com.",
    ],
  },
  {
    title: "11. Modifications de cette politique",
    body: [
      "Toute évolution significative de cette politique sera notifiée par email aux utilisateurs concernés et affichée dans la plateforme au moins 15 jours avant son entrée en vigueur.",
      "Dernière mise à jour : octobre 2026.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-200">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 transition-colors hover:text-emerald-300"
        >
          ← Retour à QuizExam BF
        </a>
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Politique de confidentialité
        </h1>
        <p className="mt-3 text-base leading-relaxed text-slate-400">
          QuizExam BF prend au sérieux la protection de vos données. Cette page
          explique, en termes simples et honnêtes, ce que nous collectons,
          pourquoi, et comment vous gardez le contrôle.
        </p>
        <div className="mt-10 space-y-8">
          {SECTIONS.map((s) => (
            <section
              key={s.title}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6"
            >
              <h2 className="text-lg font-bold text-emerald-400">{s.title}</h2>
              <div className="mt-3 space-y-3">
                {s.body.map((p, i) => (
                  <p
                    key={i}
                    className="text-sm leading-relaxed text-slate-300 sm:text-[15px]"
                  >
                    {p}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
        <footer className="mt-12 border-t border-slate-800 pt-6 text-center text-xs text-slate-500">
          <p>
            QuizExam BF — plateforme de préparation aux examens et concours du
            Burkina Faso.{" "}
            <a
              href="/terms"
              className="font-semibold text-slate-400 underline underline-offset-2 hover:text-emerald-400"
            >
              Conditions d&apos;utilisation
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}
