"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import {
  GraduationCap,
  BookOpenCheck,
  Timer,
  Zap,
  Bot,
  Trophy,
  WifiOff,
  ArrowRight,
  Sparkles,
  School,
  Building2,
  Layers,
  Target,
  CheckCircle2,
  ChevronDown,
  Star,
  Users,
  LibraryBig,
  FileCheck2,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoogleButton } from "@/components/quiz/google-button";

/**
 * LandingView (V3) — public marketing homepage shown to unauthenticated
 * visitors. Replaces the old plain login card with a full animated product
 * page: hero, live stats, feature grid, how-it-works, education levels,
 * testimonials, FAQ and a final conversion CTA.
 *
 * "Créer mon compte" / "Se connecter" open the shared AuthDialog via the
 * onAuthOpen callback owned by page.tsx. Google sign-in is handled by the
 * reusable GoogleButton (hidden when the provider is not configured).
 */

interface LandingViewProps {
  /** Opens the AuthDialog. `mode` pre-selects the login/signup tab. */
  onAuthOpen: (mode?: "login" | "signup") => void;
}

/* ------------------------------------------------------------------ */
/* Animation helpers                                                    */
/* ------------------------------------------------------------------ */

const fadeUp = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] as const },
};

/** Animated counter that runs when scrolled into view. */
function AnimatedNumber({
  value,
  suffix = "",
  duration = 1400,
}: {
  value: number;
  suffix?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration]);

  return (
    <span ref={ref}>
      {display.toLocaleString("fr-FR")}
      {suffix}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Content data                                                         */
/* ------------------------------------------------------------------ */

const FEATURES = [
  {
    icon: LibraryBig,
    title: "Banques de questions organisées",
    description:
      "Des centaines de QCM classés par niveau (BEPC, BAC, Licence, Concours), par matière et par thème. Trouvez la bonne question en deux clics.",
    accent: "from-emerald-500/20 to-teal-500/10 text-emerald-300",
  },
  {
    icon: Timer,
    title: "Examens blancs chronométrés",
    description:
      "Reproduisez les conditions réelles du concours : durée, nombre de questions, gestion du stress. Résultats détaillés à la fin.",
    accent: "from-amber-500/20 to-orange-500/10 text-amber-300",
  },
  {
    icon: Zap,
    title: "Correction immédiate",
    description:
      "Chaque réponse est expliquée instantanément. Vous comprenez vos erreurs au moment où elles se produisent — c'est là qu'on progresse.",
    accent: "from-cyan-500/20 to-sky-500/10 text-cyan-300",
  },
  {
    icon: Bot,
    title: "Tuteur IA & examens sur mesure",
    description:
      "Générez des examens personnalisés sur vos points faibles et posez vos questions à l'IA, disponible 24 h/24, même sans professeur à côté.",
    accent: "from-violet-500/20 to-purple-500/10 text-violet-300",
  },
  {
    icon: Trophy,
    title: "Défis, badges & classements",
    description:
      "XP, ligues, quêtes quotidiennes et compétitions hebdomadaires : la régularité devient un jeu, et le jeu devient la réussite.",
    accent: "from-rose-500/20 to-pink-500/10 text-rose-300",
  },
  {
    icon: WifiOff,
    title: "Fonctionne hors connexion",
    description:
      "Révisez sans internet — vos sessions se synchronisent automatiquement dès que la connexion revient. Parfait pour tout le Burkina.",
    accent: "from-teal-500/20 to-emerald-500/10 text-teal-300",
  },
];

const STEPS = [
  {
    number: "01",
    title: "Créez votre compte",
    description:
      "Inscription gratuite en 30 secondes — email ou Google. Choisissez votre niveau, vos matières et votre rythme d'apprentissage.",
    icon: Users,
  },
  {
    number: "02",
    title: "Révisez & testez-vous",
    description:
      "Entraînez-vous sur les banques de questions ou lancez un examen blanc complet. Correction immédiate, explications détaillées.",
    icon: BookOpenCheck,
  },
  {
    number: "03",
    title: "Suivez votre progression",
    description:
      "Tableau de bord, statistiques par thème, révision espacée : la plateforme identifie vos faiblesses et vous y ramène au bon moment.",
    icon: FileCheck2,
  },
];

const LEVELS = [
  {
    id: "BEPC",
    label: "BEPC",
    hint: "Collège — 3e",
    icon: School,
    gradient: "from-emerald-400 to-teal-500",
    subjects: ["Mathématiques", "Français", "SVT", "Histoire-Géo", "Anglais"],
  },
  {
    id: "BAC",
    label: "Baccalauréat",
    hint: "Lycée — Terminale",
    icon: GraduationCap,
    gradient: "from-cyan-400 to-sky-500",
    subjects: ["Maths", "Physique-Chimie", "Philosophie", "SVT", "Lettres"],
  },
  {
    id: "LICENCE",
    label: "Licence",
    hint: "Enseignement supérieur",
    icon: Building2,
    gradient: "from-amber-400 to-orange-500",
    subjects: ["Droit", "Économie", "Gestion", "Sciences", "Lettres"],
  },
  {
    id: "CONCOURS",
    label: "Concours",
    hint: "ENA, Douanes, Police…",
    icon: Target,
    gradient: "from-rose-400 to-pink-500",
    subjects: ["Culture générale", "Logique", "Droit", "Dossiers", "Oral"],
  },
];

const TESTIMONIALS = [
  {
    name: "Aïcha K.",
    role: "Candidat ENA 2025",
    text: "J'ai révisé 40 minutes par jour pendant 3 mois. Les examens blancs m'ont habitué au chrono du vrai concours — j'ai été admissible.",
  },
  {
    name: "Boureima S.",
    role: "Terminale D, Ouagadougou",
    text: "La correction immédiate change tout : je comprends mes erreurs tout de suite, pas trois jours après comme en classe.",
  },
  {
    name: "Fatimata O.",
    role: "Étudiante en Droit",
    text: "Même avec le réseau instable, je révisais hors ligne dans le bus. Tout se synchronisait automatiquement. Bravo !",
  },
  {
    name: "Issouf T.",
    role: "Concours Douanes",
    text: "Le classement m'a motivé à rester régulier. Je suis passé de la ligue Bronze à Or en 5 semaines.",
  },
  {
    name: "Mariam Z.",
    role: "Préparation BAC A",
    text: "Le tuteur IA m'a créé un examen ciblé sur mes points faibles en philosophie. Résultat : +4 points au Bac blanc.",
  },
  {
    name: "Karim D.",
    role: "BEPC, Bobo-Dioulasso",
    text: "Simple, clair, en français. Mes parents ont vu mes badges et maintenant toute la famille me suit pour m'encourager.",
  },
];

const FAQ = [
  {
    q: "La plateforme est-elle gratuite ?",
    a: "Oui. La création de compte, les banques de questions et les quiz quotidiens sont gratuits. Un pass Premium débloque les examens illimités, le tuteur IA et les certificats — mais l'essentiel reste accessible sans payer.",
  },
  {
    q: "Puis-je réviser sans connexion internet ?",
    a: "Oui. QuizExam BF fonctionne hors ligne : vos sessions sont enregistrées localement puis synchronisées automatiquement au retour du réseau. Conçu pour les réalités de la connectivité au Burkina Faso.",
  },
  {
    q: "Comment se connecter avec Google ?",
    a: "Cliquez sur « Continuer avec Google ». Si vous avez déjà un compte avec le même email, il est automatiquement retrouvé et relié — vous ne perdez ni votre progression, ni vos badges.",
  },
  {
    q: "Les questions correspondent-elles aux programmes officiels ?",
    a: "Les banques couvrent les programmes du BEPC, du BAC, de la Licence et les épreuves de culture générale des grands concours (ENA, Douanes, Police…), avec des mises à jour régulières.",
  },
];

/* ------------------------------------------------------------------ */
/* Landing view                                                         */
/* ------------------------------------------------------------------ */

export function LandingView({ onAuthOpen }: LandingViewProps) {
  return (
    <div className="min-h-screen overflow-x-clip bg-[#04140f] text-emerald-50">
      <LandingNav onAuthOpen={onAuthOpen} />
      <HeroSection onAuthOpen={onAuthOpen} />
      <StatsSection />
      <FeaturesSection />
      <HowItWorksSection />
      <LevelsSection />
      <TestimonialsSection />
      <FaqSection />
      <FinalCtaSection onAuthOpen={onAuthOpen} />
      <LandingFooter />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sections                                                             */
/* ------------------------------------------------------------------ */

function LandingNav({ onAuthOpen }: { onAuthOpen: LandingViewProps["onAuthOpen"] }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-white/10 bg-[#04140f]/85 backdrop-blur-xl"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <a href="#" className="flex items-center gap-2.5">
          <img
            src="/logo-quizexam.svg"
            alt="Logo QuizExam BF"
            className="h-10 w-10 rounded-xl shadow-lg shadow-emerald-500/20"
            width={40}
            height={40}
          />
          <span className="font-display text-lg font-bold tracking-tight">
            QuizExam <span className="text-gradient-mint">BF</span>
          </span>
        </a>

        <nav className="hidden items-center gap-6 text-sm text-emerald-100/80 md:flex" aria-label="Navigation principale">
          <a href="#features" className="transition-colors hover:text-white">Fonctionnalités</a>
          <a href="#levels" className="transition-colors hover:text-white">Niveaux</a>
          <a href="#testimonials" className="transition-colors hover:text-white">Témoignages</a>
          <a href="#faq" className="transition-colors hover:text-white">FAQ</a>
        </nav>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-emerald-100 hover:bg-white/10 hover:text-white"
            onClick={() => onAuthOpen("login")}
          >
            Se connecter
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30 transition-transform hover:-translate-y-0.5"
            onClick={() => onAuthOpen("signup")}
          >
            Créer mon compte
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}

function HeroSection({ onAuthOpen }: { onAuthOpen: LandingViewProps["onAuthOpen"] }) {
  return (
    <section className="relative overflow-hidden pb-24 pt-32 md:pt-40">
      {/* Aurora background */}
      <div className="absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-grid-dark" />
        <div
          className="aurora-blob h-96 w-96 bg-emerald-500/25"
          style={{ top: "-10%", left: "5%" }}
        />
        <div
          className="aurora-blob h-80 w-80 bg-amber-400/15"
          style={{ top: "20%", right: "0%", animationDelay: "-5s" }}
        />
        <div
          className="aurora-blob h-72 w-72 bg-teal-400/20"
          style={{ bottom: "-15%", left: "35%", animationDelay: "-9s" }}
        />
      </div>

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Copy */}
        <div className="text-center lg:text-left">
          <div className="animate-fade-up mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-300">
            <Sparkles className="h-3.5 w-3.5" />
            Nouvelle version 2025 · pensée pour le Burkina
          </div>

          <h1
            className="animate-fade-up font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl xl:text-6xl"
            style={{ animationDelay: "0.08s" }}
          >
            Réussissez vos examens,{" "}
            <span className="text-gradient-mint">question par question</span>
          </h1>

          <p
            className="animate-fade-up mx-auto mt-6 max-w-xl text-base leading-relaxed text-emerald-100/70 sm:text-lg lg:mx-0"
            style={{ animationDelay: "0.16s" }}
          >
            QuizExam BF est la plateforme de préparation aux BEPC, BAC, licences
            et grands concours du Burkina Faso. Des milliers de questions
            corrigées, des examens blancs chronométrés et un suivi intelligent
            — <strong className="font-semibold text-emerald-200">gratuit pour commencer</strong>.
          </p>

          <div
            className="animate-fade-up mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center lg:justify-start"
            style={{ animationDelay: "0.24s" }}
          >
            <Button
              size="lg"
              className="animate-ticker-glow h-12 gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 px-7 text-base font-semibold text-white transition-transform hover:-translate-y-0.5"
              onClick={() => onAuthOpen("signup")}
            >
              Créer mon compte gratuitement
              <ArrowRight className="h-5 w-5" />
            </Button>
            <GoogleButton className="h-12 sm:w-auto" onRedirectStart={() => {}} />
          </div>

          <ul
            className="animate-fade-up mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-emerald-100/60 lg:justify-start"
            style={{ animationDelay: "0.32s" }}
          >
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Inscription gratuite
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Sans engagement
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Mode hors ligne
            </li>
          </ul>
        </div>

        {/* Floating mockup card */}
        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div className="animate-float-slow relative rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-emerald-950/60 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-emerald-300/70">Tableau de bord</p>
                <p className="font-display text-lg font-semibold">Ma progression</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-lg font-bold text-white">
                A
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <HeroStat label="Questions" value={128} icon={BookOpenCheck} tone="emerald" />
              <HeroStat label="Précision" value={87} suffix="%" icon={Target} tone="amber" />
              <HeroStat label="Série" value={12} suffix=" j" icon={Flame} tone="rose" />
            </div>

            <div className="mt-5 space-y-3 rounded-2xl bg-black/20 p-4">
              <HeroBar label="Mathématiques" pct={86} from="from-emerald-400" to="to-teal-400" />
              <HeroBar label="Culture générale" pct={72} from="from-amber-400" to="to-orange-400" />
              <HeroBar label="Français" pct={64} from="from-cyan-400" to="to-sky-400" />
            </div>

            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 to-orange-400 text-white">
                <Trophy className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-amber-200">Ligue Or · Top 8 de la semaine</p>
                <p className="text-xs text-amber-100/60">+320 XP cette semaine</p>
              </div>
            </div>
          </div>

          {/* Floating chips */}
          <div className="animate-float absolute -left-4 top-8 hidden rounded-xl border border-white/10 bg-[#062b22]/90 px-3.5 py-2.5 shadow-xl backdrop-blur sm:block">
            <p className="flex items-center gap-2 text-xs font-semibold text-emerald-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Réponse correcte +10 XP
            </p>
          </div>
          <div
            className="animate-float absolute -right-3 bottom-10 hidden rounded-xl border border-white/10 bg-[#062b22]/90 px-3.5 py-2.5 shadow-xl backdrop-blur sm:block"
            style={{ animationDelay: "-1.6s" }}
          >
            <p className="flex items-center gap-2 text-xs font-semibold text-amber-200">
              <Timer className="h-4 w-4 text-amber-300" />
              Examen blanc : 50 Q · 60 min
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroStat({
  label,
  value,
  suffix = "",
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  suffix?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "emerald" | "amber" | "rose";
}) {
  const tones = {
    emerald: "text-emerald-300",
    amber: "text-amber-300",
    rose: "text-rose-300",
  } as const;
  return (
    <div className="rounded-2xl bg-white/[0.06] p-3 text-center">
      <Icon className={`mx-auto h-4 w-4 ${tones[tone]}`} />
      <p className="mt-1 font-display text-xl font-bold">
        <AnimatedNumber value={value} suffix={suffix} duration={1800} />
      </p>
      <p className="text-[11px] text-emerald-100/60">{label}</p>
    </div>
  );
}

function HeroBar({
  label,
  pct,
  from,
  to,
}: {
  label: string;
  pct: number;
  from: string;
  to: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-emerald-100/80">{label}</span>
        <span className="font-semibold text-emerald-300">{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${from} ${to}`}
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}

function StatsSection() {
  return (
    <section className="relative border-y border-white/10 bg-white/[0.03]">
      <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-white/5 px-4 py-10 sm:grid-cols-4">
        <StatBadge icon={LibraryBig} value={40} suffix="+" label="Banques de questions" />
        <StatBadge icon={BookOpenCheck} value={5000} suffix="+" label="Questions corrigées" />
        <StatBadge icon={Users} value={1200} suffix="+" label="Candidats accompagnés" />
        <StatBadge icon={Star} value={96} suffix="%" label="Satisfaction" />
      </div>
    </section>
  );
}

function StatBadge({
  icon: Icon,
  value,
  suffix,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  suffix: string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 px-4 py-3 text-center">
      <Icon className="mb-1 h-5 w-5 text-emerald-400" />
      <p className="font-display text-2xl font-bold text-white sm:text-3xl">
        <AnimatedNumber value={value} suffix={suffix} />
      </p>
      <p className="text-xs text-emerald-100/60 sm:text-sm">{label}</p>
    </div>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="relative py-24">
      <div className="mx-auto max-w-6xl px-4">
        <motion.div {...fadeUp} className="mx-auto mb-14 max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
            Fonctionnalités
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Tout ce qu&apos;il faut pour{" "}
            <span className="text-gradient-mint">décrocher son concours</span>
          </h2>
          <p className="mt-4 text-emerald-100/60">
            Une plateforme complète, pensée pour les candidats burkinabè :
            contenu local, mode hors ligne et motivation quotidienne.
          </p>
        </motion.div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, delay: (i % 3) * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="card-glow group rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm"
            >
              <div
                className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.accent}`}
              >
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-white">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-emerald-100/60">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section className="relative py-24">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-950/40 to-transparent" aria-hidden="true" />
      <div className="relative mx-auto max-w-6xl px-4">
        <motion.div {...fadeUp} className="mx-auto mb-14 max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
            Comment ça marche
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Trois étapes vers la <span className="text-gradient-gold">réussite</span>
          </h2>
        </motion.div>

        <div className="relative grid gap-8 md:grid-cols-3">
          {/* Connector line (desktop) */}
          <div
            className="absolute left-[16%] right-[16%] top-12 hidden h-px bg-gradient-to-r from-emerald-500/10 via-emerald-400/40 to-emerald-500/10 md:block"
            aria-hidden="true"
          />
          {STEPS.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="relative flex flex-col items-center text-center"
            >
              <div className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-emerald-400/20 bg-[#062b22] shadow-xl shadow-emerald-950/50">
                <step.icon className="h-9 w-9 text-emerald-300" />
                <span className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 font-display text-xs font-bold text-white shadow-lg">
                  {step.number}
                </span>
              </div>
              <h3 className="mt-5 font-display text-lg font-semibold text-white">{step.title}</h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-emerald-100/60">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LevelsSection() {
  return (
    <section id="levels" className="relative py-24">
      <div className="mx-auto max-w-6xl px-4">
        <motion.div {...fadeUp} className="mx-auto mb-14 max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
            Tous les niveaux
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Du BEPC aux <span className="text-gradient-mint">grands concours</span>
          </h2>
          <p className="mt-4 text-emerald-100/60">
            Chaque niveau a ses banques dédiées : sélectionnez le vôtre et la
            plateforme s&apos;adapte à votre objectif.
          </p>
        </motion.div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {LEVELS.map((level, i) => (
            <motion.div
              key={level.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="card-glow relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-6"
            >
              <div
                className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${level.gradient}`}
                aria-hidden="true"
              />
              <div
                className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${level.gradient} text-white shadow-lg`}
              >
                <level.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display text-xl font-bold text-white">{level.label}</h3>
              <p className="text-xs uppercase tracking-wider text-emerald-100/50">{level.hint}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {level.subjects.slice(0, 4).map((subject) => (
                  <span
                    key={subject}
                    className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-emerald-100/70"
                  >
                    {subject}
                  </span>
                ))}
                {level.subjects.length > 4 && (
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-emerald-100/70">
                    +{level.subjects.length - 4}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  const doubled = [...TESTIMONIALS, ...TESTIMONIALS];
  return (
    <section id="testimonials" className="relative overflow-hidden py-24">
      <div className="mx-auto max-w-6xl px-4">
        <motion.div {...fadeUp} className="mx-auto mb-12 max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
            Témoignages
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ils révisent déjà <span className="text-gradient-gold">avec nous</span>
          </h2>
        </motion.div>
      </div>

      <div
        className="relative"
        style={{
          maskImage:
            "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
        }}
      >
        <div className="animate-marquee gap-5 px-4">
          {doubled.map((t, i) => (
            <figure
              key={`${t.name}-${i}`}
              className="w-[320px] shrink-0 rounded-2xl border border-white/10 bg-white/[0.04] p-6"
              aria-hidden={i >= TESTIMONIALS.length}
            >
              <div className="flex gap-0.5" aria-label="5 étoiles sur 5">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <blockquote className="mt-3 text-sm leading-relaxed text-emerald-100/80">
                « {t.text} »
              </blockquote>
              <figcaption className="mt-4 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-sm font-bold text-white">
                  {t.name.charAt(0)}
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{t.name}</p>
                  <p className="text-xs text-emerald-100/50">{t.role}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section id="faq" className="relative py-24">
      <div className="mx-auto max-w-3xl px-4">
        <motion.div {...fadeUp} className="mb-12 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
            FAQ
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Questions fréquentes
          </h2>
        </motion.div>

        <div className="space-y-3">
          {FAQ.map((item, i) => (
            <motion.details
              key={item.q}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.07 }}
              className="group rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 open:border-emerald-400/30"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-display text-base font-semibold text-white [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronDown className="h-4 w-4 shrink-0 text-emerald-400 transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-emerald-100/60">{item.a}</p>
            </motion.details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCtaSection({ onAuthOpen }: { onAuthOpen: LandingViewProps["onAuthOpen"] }) {
  return (
    <section className="relative py-24">
      <div className="mx-auto max-w-5xl px-4">
        <motion.div
          {...fadeUp}
          className="relative overflow-hidden rounded-[2rem] border border-emerald-400/20 bg-gradient-to-br from-emerald-900/60 via-[#062b22] to-teal-900/40 px-6 py-14 text-center sm:px-14"
        >
          <div className="absolute inset-0 bg-grid-dark opacity-60" aria-hidden="true" />
          <div
            className="aurora-blob h-64 w-64 bg-emerald-400/20"
            style={{ top: "-30%", left: "10%" }}
            aria-hidden="true"
          />
          <div
            className="aurora-blob h-56 w-56 bg-amber-300/15"
            style={{ bottom: "-25%", right: "5%", animationDelay: "-6s" }}
            aria-hidden="true"
          />

          <div className="relative">
            <div className="mx-auto mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-xl shadow-emerald-500/30">
              <GraduationCap className="h-7 w-7 text-white" />
            </div>
            <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Votre concours commence{" "}
              <span className="text-gradient-gold">aujourd&apos;hui</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-emerald-100/70">
              Rejoignez les centaines de candidats qui révisent chaque jour sur
              QuizExam BF. Créez votre compte gratuit et faites votre premier
              quiz en moins de deux minutes.
            </p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Button
                size="lg"
                className="h-12 gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 px-8 text-base font-semibold text-white shadow-xl shadow-emerald-500/30 transition-transform hover:-translate-y-0.5"
                onClick={() => onAuthOpen("signup")}
              >
                Créer mon compte gratuitement
                <ArrowRight className="h-5 w-5" />
              </Button>
              <GoogleButton className="h-12 sm:w-auto" />
            </div>
            <p className="mt-5 text-xs text-emerald-100/40">
              Gratuit · Sans carte bancaire · Annulable à tout moment
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="border-t border-white/10 bg-black/20">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo-quizexam.svg"
              alt=""
              className="h-8 w-8 rounded-lg"
              width={32}
              height={32}
            />
            <div>
              <p className="font-display text-sm font-bold text-white">QuizExam BF</p>
              <p className="text-xs text-emerald-100/50">
                La préparation aux concours, accessible à tous.
              </p>
            </div>
          </div>
          <div className="text-center text-xs text-emerald-100/50 sm:text-right">
            <p className="font-medium text-emerald-100/70">
              BAMOGO Pingdwendé Giovanni — Créateur
            </p>
            <p>
              <a href="mailto:giobamos03@gmail.com" className="transition-colors hover:text-emerald-300">
                giobamos03@gmail.com
              </a>{" "}
              · Ouagadougou, Burkina Faso 🇧🇫
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
