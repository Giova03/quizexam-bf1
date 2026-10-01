import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions d'utilisation — QuizExam BF",
  description:
    "Règles d'usage de la plateforme QuizExam BF : compte, contenu, responsabilité, propriété intellectuelle.",
};

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "1. Objet et acceptation",
    body: [
      "Les présentes Conditions d'utilisation (« les Conditions ») régissent l'accès et l'usage de QuizExam BF, plateforme de révision et de préparation aux examens et concours du Burkina Faso (BEPC, BAC, LICENCE, concours de la fonction publique).",
      "La création d'un compte — par email ou via Google — vaut acceptation pleine et entière des présentes Conditions et de la Politique de confidentialité associée. Si vous n'acceptez pas ces termes, veuillez ne pas utiliser la plateforme.",
    ],
  },
  {
    title: "2. Le compte utilisateur",
    body: [
      "L'inscription est gratuite et nécessite une adresse email valide. Vous vous engagez à fournir des informations exactes et à ne créer qu'un seul compte.",
      "Vos identifiants sont personnels et confidentiels : vous êtes seul responsable de l'activité réalisée depuis votre compte. En cas d'usage suspecté, signalez-le immédiatement à giobamos03@gmail.com.",
      "La connexion par Google lie votre compte Google à votre compte local : votre progression, badges et code de parrainage sont conservés lors de la liaison.",
    ],
  },
  {
    title: "3. Usage autorisé",
    body: [
      "QuizExam BF est réservé à un usage personnel, pédagogique et non commercial : réviser, s'entraîner, passer des examens blancs, créer et partager des banques de questions conformes à la charte de la plateforme.",
      "Il est strictement interdit de : extraire massivement les contenus (scraping automatisé), revendre ou redistribuer les banques de questions, contourner les limites d'usage, dénigrer, tester ou s'introduire dans la sécurité de la plateforme, publier des contenus illégaux, diffamatoires, haineux, sexuels, ou violents.",
      "L'assistant IA est un outil d'aide à l'apprentissage : ses réponses peuvent contenir des erreurs. Elles ne constituent ni un avis officiel, ni un corrigé d'examen garanti.",
    ],
  },
  {
    title: "4. Contenus fournis par les utilisateurs",
    body: [
      "Les banques de questions, articles et messages publiés par les utilisateurs demeurent la propriété de leurs auteurs. En les publiant sur QuizExam BF, vous nous accordez une licence non exclusive, gratuite et mondiale pour les héberger, les afficher et les distribuer dans le cadre du service.",
      "Vous garantissez être titulaire des droits nécessaires sur les contenus que vous publiez et à ne pas copier tels quels des sujets d'examen sous droit d'auteur sans autorisation.",
      "Une modération (signalement + tour de contrôle) est en place. Les contenus contraires aux présentes Conditions peuvent être retirés sans préavis, et le compte suspendu.",
    ],
  },
  {
    title: "5. Propriété intellectuelle de la plateforme",
    body: [
      "La marque QuizExam BF, son design (tour de contrôle, bibliothèque de banques), son code source, ses bases de questions assemblées et l'ensemble des éléments originaux de la plateforme sont la propriété exclusive de son éditeur.",
      "Toute reproduction totale ou partielle sans autorisation écrite préalable est interdite. Les références pédagogiques citées (programmes officiels, notions d'examen) appartiennent à leurs titres respectifs.",
    ],
  },
  {
    title: "6. Disponibilité et limites de responsabilité",
    body: [
      "Nous nous efforçons d'assurer une disponibilité maximale (statuts en direct dans la page de diagnostic), sans garantie d'absence d'interruption : maintenance, force majeure, indisponibilité des prestataires d'hébergement ou de la base de données.",
      "La plateforme est fournie « en l'état ». La responsabilité de l'éditeur ne saurait être engagée pour : un échec à un examen ou concours (la plateforme est un outil d'entraînement, pas un garant de réussite), une perte de données due à un cas de force majeure, une utilisation non conforme des présentes Conditions.",
      "En tout état de cause, la responsabilité de l'éditeur est limitée au montant éventuellement payé par l'utilisateur sur les 12 derniers mois (les fonctionnalités de base étant gratuites).",
    ],
  },
  {
    title: "7. Fonctionnalités payantes",
    body: [
      "Certaines fonctionnalités avancées peuvent être proposées en abonnement, clairement indiquées avant tout paiement, via notre prestataire de paiement agréé FedaPay (Mobile Money et cartes).",
      "Le paiement, le renouvellement et le remboursement obéissent aux conditions du prestataire. Pour toute contestation d'un paiement, contactez giobamos03@gmail.com : chaque cas est traité individuellement et de bonne foi.",
    ],
  },
  {
    title: "8. Suspension et suppression de compte",
    body: [
      "Vous pouvez supprimer votre compte à tout moment par simple email à giobamos03@gmail.com — toutes vos données personnelles sont alors effacées conformément à la Politique de confidentialité.",
      "Nous pouvons suspendre ou supprimer un compte en cas de violation des présentes Conditions (fraude, scraping, contenus interdits, tentative d'intrusion), après information de l'utilisateur sauf urgence de sécurité ou obligation légale.",
    ],
  },
  {
    title: "9. Évolutions du service",
    body: [
      "QuizExam BF évolue en continu (nouvelles banques, nouvelles fonctionnalités, assistant IA amélioré). Certaines évolutions peuvent modifier des fonctionnalités existantes ; les changements majeurs seront annoncés dans la plateforme.",
      "Ces Conditions peuvent être mises à jour ; la version applicable est celle publiée sur cette page à la date de votre utilisation. Une modification substantielle sera notifiée au moins 15 jours à l'avance.",
    ],
  },
  {
    title: "10. Droit applicable",
    body: [
      "Les présentes Conditions sont soumises au droit burkinabè. Tout litige relatif à leur interprétation ou exécution sera soumis à une tentative de résolution amiable, puis, à défaut, aux juridictions compétentes de Ouagadougou, Burkina Faso.",
      "Dernière mise à jour : octobre 2026.",
    ],
  },
];

export default function TermsPage() {
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
          Conditions d&apos;utilisation
        </h1>
        <p className="mt-3 text-base leading-relaxed text-slate-400">
          L&apos;essentiel en clair : QuizExam BF est un outil d&apos;entraînement
          gratuit et honnête. En l&apos;utilisant, vous acceptez les règles
          simples ci-dessous.
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
              href="/privacy"
              className="font-semibold text-slate-400 underline underline-offset-2 hover:text-emerald-400"
            >
              Politique de confidentialité
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}
