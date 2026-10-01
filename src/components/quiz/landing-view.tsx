"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useInView,
  useScroll,
  useSpring,
  AnimatePresence,
} from "framer-motion";
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
  Menu,
  X,
  PenLine,
  Calculator,
  Globe2,
  Microscope,
  Scale,
  Languages,
  Landmark,
  BrainCircuit,
  Atom,
  BookOpen,
  Signal,
  Activity,
} from "lucide-react";
import { RadarDish } from "./lot-visuals";
import { Button } from "@/components/ui/button";
import { GoogleButton } from "@/components/quiz/google-button";
import { useTranslation } from "@/lib/use-translation";
import { LanguageSwitcher } from "@/components/quiz/language-switcher";

/**
 * LandingView (V4 « Aurora Light 2026 ») — public marketing homepage shown to
 * unauthenticated visitors.
 *
 * Design language: crisp white base energised with blue / green / orange,
 * generous animations (scroll progress bar, rotating hero keywords, aurora
 * blobs, spotlight cards, marquees, animated counters, staggered reveals).
 *
 * The nav is rebuilt as a floating glass pill bar with a sliding hover
 * indicator and a full-screen animated mobile menu.
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

/** Rotating keyword with a vertical slide animation (hero headline). */
function WordRotator({ words, className }: { words: string[]; className?: string }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % words.length), 2400);
    return () => clearInterval(id);
  }, [words.length]);

  return (
    <span
      className={`relative inline-block overflow-hidden align-bottom ${className ?? ""}`}
      aria-live="polite"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={words[index]}
          initial={{ y: "105%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-105%", opacity: 0 }}
          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          className="inline-block text-gradient-brand"
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** Gradient scroll-progress bar pinned to the top of the viewport. */
function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 28,
    mass: 0.4,
  });
  return (
    <motion.div
      className="scroll-progress"
      style={{ scaleX }}
      aria-hidden="true"
    />
  );
}

/** Spotlight mouse-follow handler — feeds --mx/--my CSS vars. */
function handleSpotlight(e: React.MouseEvent<HTMLElement>) {
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
  el.style.setProperty("--my", `${e.clientY - rect.top}px`);
}

/* ------------------------------------------------------------------ */
/* Content data                                                         */
/* ------------------------------------------------------------------ */

// V5 — les mots tournants du hero viennent de t("land.hero.words").

type Translate = (k: string) => string;

function getFeatures(t: Translate) {
  return [
    {
      icon: LibraryBig,
      title: t("land.f1.title"),
      description: t("land.f1.desc"),
      tone: "blue" as const,
      big: true,
    },
    {
      icon: Timer,
      title: t("land.f2.title"),
      description: t("land.f2.desc"),
      tone: "orange" as const,
    },
    {
      icon: Zap,
      title: t("land.f3.title"),
      description: t("land.f3.desc"),
      tone: "emerald" as const,
    },
    {
      icon: Bot,
      title: t("land.f4.title"),
      description: t("land.f4.desc"),
      tone: "violet" as const,
    },
    {
      icon: Trophy,
      title: t("land.f5.title"),
      description: t("land.f5.desc"),
      tone: "rose" as const,
    },
    {
      icon: WifiOff,
      title: t("land.f6.title"),
      description: t("land.f6.desc"),
      tone: "sky" as const,
      big: true,
    },
  ];
}

const TONES: Record<string, { chip: string; ring: string; glow: string }> = {
  blue: {
    chip: "bg-blue-100 text-blue-600",
    ring: "group-hover:border-blue-300",
    glow: "bg-blue-500",
  },
  orange: {
    chip: "bg-orange-100 text-orange-600",
    ring: "group-hover:border-orange-300",
    glow: "bg-orange-500",
  },
  emerald: {
    chip: "bg-emerald-100 text-emerald-600",
    ring: "group-hover:border-emerald-300",
    glow: "bg-emerald-500",
  },
  violet: {
    chip: "bg-violet-100 text-violet-600",
    ring: "group-hover:border-violet-300",
    glow: "bg-violet-500",
  },
  rose: {
    chip: "bg-rose-100 text-rose-600",
    ring: "group-hover:border-rose-300",
    glow: "bg-rose-500",
  },
  sky: {
    chip: "bg-sky-100 text-sky-600",
    ring: "group-hover:border-sky-300",
    glow: "bg-sky-500",
  },
};

function getSteps(t: Translate) {
  return [
    {
      number: "01",
      title: t("land.steps.s1.title"),
      description: t("land.steps.s1.desc"),
      icon: Users,
      tone: "blue" as const,
    },
    {
      number: "02",
      title: t("land.steps.s2.title"),
      description: t("land.steps.s2.desc"),
      icon: BookOpenCheck,
      tone: "emerald" as const,
    },
    {
      number: "03",
      title: t("land.steps.s3.title"),
      description: t("land.steps.s3.desc"),
      icon: FileCheck2,
      tone: "orange" as const,
    },
  ];
}

const STEP_TONES: Record<string, string> = {
  blue: "from-blue-500 to-sky-400",
  emerald: "from-emerald-500 to-teal-400",
  orange: "from-orange-500 to-amber-400",
};

function getLevels(t: Translate) {
  return [
    {
      id: "BEPC",
      label: "BEPC",
      hint: t("land.levels.bepc.hint"),
      icon: School,
      gradient: "from-emerald-500 to-teal-400",
      topBar: "from-emerald-400 to-teal-400",
      subjects: [t("subject.math"), t("subject.french"), t("subject.svt"), t("subject.histgeo"), t("subject.english")],
    },
    {
      id: "BAC",
      label: "Baccalauréat",
      hint: t("land.levels.bac.hint"),
      icon: GraduationCap,
      gradient: "from-blue-500 to-sky-400",
      topBar: "from-blue-400 to-sky-400",
      subjects: [t("subject.maths"), t("subject.physics"), t("subject.philosophy"), t("subject.svt"), t("subject.letters")],
    },
    {
      id: "LICENCE",
      label: "Licence",
      hint: t("land.levels.licence.hint"),
      icon: Building2,
      gradient: "from-orange-500 to-amber-400",
      topBar: "from-orange-400 to-amber-400",
      subjects: [t("subject.law"), t("subject.economics"), t("subject.management"), t("subject.sciences"), t("subject.letters")],
    },
    {
      id: "CONCOURS",
      label: "Concours",
      hint: t("land.levels.concours.hint"),
      icon: Target,
      gradient: "from-violet-500 to-fuchsia-400",
      topBar: "from-violet-400 to-fuchsia-400",
      subjects: [t("subject.cultureGen"), t("subject.logic"), t("subject.law"), t("subject.dossiers"), t("subject.oral")],
    },
  ];
}

function getSubjectsMarquee(t: Translate) {
  return [
    { icon: Calculator, label: t("subject.math") },
    { icon: BookOpen, label: t("subject.french") },
    { icon: Atom, label: t("subject.physics") },
    { icon: Microscope, label: t("subject.svt") },
    { icon: Globe2, label: t("subject.histgeo") },
    { icon: Languages, label: t("subject.english") },
    { icon: Scale, label: t("subject.law") },
    { icon: Landmark, label: t("subject.cultureGen") },
    { icon: BrainCircuit, label: t("subject.logic") },
    { icon: PenLine, label: t("subject.philosophy") },
  ];
}

function getTestimonials(t: Translate) {
  return [
    { name: "Aïcha K.", role: t("land.t1.role"), text: t("land.t1.text"), tone: "blue" as const },
    { name: "Boureima S.", role: t("land.t2.role"), text: t("land.t2.text"), tone: "emerald" as const },
    { name: "Fatimata O.", role: t("land.t3.role"), text: t("land.t3.text"), tone: "orange" as const },
    { name: "Issouf T.", role: t("land.t4.role"), text: t("land.t4.text"), tone: "violet" as const },
    { name: "Mariam Z.", role: t("land.t5.role"), text: t("land.t5.text"), tone: "sky" as const },
    { name: "Karim D.", role: t("land.t6.role"), text: t("land.t6.text"), tone: "rose" as const },
  ];
}

const AVATAR_TONES: Record<string, string> = {
  blue: "from-blue-500 to-sky-400",
  emerald: "from-emerald-500 to-teal-400",
  orange: "from-orange-500 to-amber-400",
  violet: "from-violet-500 to-fuchsia-400",
  sky: "from-sky-500 to-cyan-400",
  rose: "from-rose-500 to-pink-400",
};

function getFaq(t: Translate) {
  return [
    { q: t("land.faq.q1"), a: t("land.faq.a1") },
    { q: t("land.faq.q2"), a: t("land.faq.a2") },
    { q: t("land.faq.q3"), a: t("land.faq.a3") },
    { q: t("land.faq.q4"), a: t("land.faq.a4") },
  ];
}

function getNavLinks(t: Translate) {
  return [
    { href: "#tower", label: t("land.tower.nav") },
    { href: "#features", label: t("land.nav.features") },
    { href: "#levels", label: t("land.nav.levels") },
    { href: "#testimonials", label: t("land.nav.testimonials") },
    { href: "#faq", label: t("land.nav.faq") },
  ];
}

function scrollToHash(hash: string) {
  const el = document.querySelector(hash);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ------------------------------------------------------------------ */
/* Landing view                                                         */
/* ------------------------------------------------------------------ */

export function LandingView({ onAuthOpen }: LandingViewProps) {
  return (
    <div className="min-h-screen overflow-x-clip bg-white text-slate-800">
      <ScrollProgress />
      <LandingNav onAuthOpen={onAuthOpen} />
      <HeroSection onAuthOpen={onAuthOpen} />
      <SubjectsMarquee />
      <ControlTowerSection onAuthOpen={onAuthOpen} />
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
/* Navigation — floating glass pill bar + animated mobile overlay        */
/* ------------------------------------------------------------------ */

function LandingNav({ onAuthOpen }: { onAuthOpen: LandingViewProps["onAuthOpen"] }) {
  const [scrolled, setScrolled] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useTranslation();
  const NAV_LINKS = getNavLinks(t);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll while the mobile overlay is open.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      <motion.header
        initial={{ y: -70, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "border-b border-blue-100/80 bg-white/85 shadow-[0_8px_30px_-12px_rgba(37,99,235,0.15)] backdrop-blur-xl"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <a href="#" className="group flex items-center gap-2.5" aria-label={t("land.brand.aria")}>
            <span className="relative">
              <img
                src="/logo-quizexam.svg"
                alt=""
                className="h-10 w-10 rounded-xl shadow-lg shadow-blue-500/20 transition-transform duration-500 group-hover:rotate-[10deg] group-hover:scale-105"
                width={40}
                height={40}
              />
              <span className="absolute -right-1 -top-1 flex h-3 w-3" aria-hidden="true">
                <span className="animate-ping-soft absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
                <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
              </span>
            </span>
            <span className="font-display text-lg font-bold tracking-tight text-slate-900">
              QuizExam <span className="text-gradient-brand">BF</span>
            </span>
          </a>

          {/* Desktop — floating pill nav with sliding hover indicator */}
          <nav
            className="hidden items-center gap-1 rounded-full border border-slate-200/80 bg-white/70 p-1 shadow-sm backdrop-blur-md md:flex"
            aria-label={t("land.nav.aria")}
            onMouseLeave={() => setHovered(null)}
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onMouseEnter={() => setHovered(link.href)}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToHash(link.href);
                }}
                className="relative rounded-full px-4 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
              >
                {hovered === link.href && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-full bg-blue-50 ring-1 ring-blue-100"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    aria-hidden="true"
                  />
                )}
                <span className="relative z-10">{link.label}</span>
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-600 hover:bg-blue-50 hover:text-blue-700"
              onClick={() => onAuthOpen("login")}
            >
              {t("land.nav.login")}
            </Button>
            <Button
              size="sm"
              className="btn-shine animate-gradient-x hidden gap-1.5 bg-gradient-to-r from-blue-600 via-sky-500 to-emerald-500 text-white shadow-lg shadow-blue-500/30 transition-transform hover:-translate-y-0.5 sm:inline-flex"
              onClick={() => onAuthOpen("signup")}
            >
              {t("land.nav.signup")}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label={t("land.menu.open")}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Mobile — full-screen animated overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[70] flex flex-col overflow-y-auto bg-white"
            role="dialog"
            aria-modal="true"
            aria-label={t("land.menu.aria")}
          >
            <div className="dot-grid-light pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
            <div
              className="aurora-blob h-72 w-72 bg-blue-400/20"
              style={{ top: "-8%", right: "-10%" }}
              aria-hidden="true"
            />
            <div
              className="aurora-blob h-64 w-64 bg-emerald-400/20"
              style={{ bottom: "10%", left: "-12%", animationDelay: "-6s" }}
              aria-hidden="true"
            />
            <div
              className="aurora-blob h-56 w-56 bg-orange-300/25"
              style={{ bottom: "-10%", right: "20%", animationDelay: "-10s" }}
              aria-hidden="true"
            />

            <div className="relative flex h-16 items-center justify-between px-4">
              <span className="flex items-center gap-2.5">
                <img
                  src="/logo-quizexam.svg"
                  alt=""
                  className="h-10 w-10 rounded-xl"
                  width={40}
                  height={40}
                />
                <span className="font-display text-lg font-bold text-slate-900">
                  QuizExam <span className="text-gradient-brand">BF</span>
                </span>
              </span>
              <button
                onClick={() => setMobileOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50"
                aria-label={t("land.menu.close")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="relative flex flex-1 flex-col justify-center gap-1 px-8" aria-label="Menu mobile">
              {NAV_LINKS.map((link, i) => (
                <motion.a
                  key={link.href}
                  href={link.href}
                  initial={{ opacity: 0, x: -28 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 + i * 0.07, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  onClick={(e) => {
                    e.preventDefault();
                    setMobileOpen(false);
                    setTimeout(() => scrollToHash(link.href), 60);
                  }}
                  className="group flex items-center justify-between border-b border-slate-100 py-4 font-display text-2xl font-bold text-slate-800 transition-colors hover:text-blue-600"
                >
                  {link.label}
                  <ArrowRight className="h-5 w-5 text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-blue-500" />
                </motion.a>
              ))}

              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="mt-8 flex flex-col gap-3"
              >
                <Button
                  size="lg"
                  className="h-12 animate-gradient-x gap-2 bg-gradient-to-r from-blue-600 via-sky-500 to-emerald-500 text-base font-semibold text-white shadow-xl shadow-blue-500/25"
                  onClick={() => {
                    setMobileOpen(false);
                    onAuthOpen("signup");
                  }}
                >
                  {t("land.menu.signup")}
                  <ArrowRight className="h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12"
                  onClick={() => {
                    setMobileOpen(false);
                    onAuthOpen("login");
                  }}
                >
                  {t("land.nav.login")}
                </Button>
                <div className="flex justify-center">
                  <LanguageSwitcher />
                </div>
                <p className="mt-2 text-center text-xs text-slate-400">
                  {t("land.menu.trust")}
                </p>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                 */
/* ------------------------------------------------------------------ */

function HeroSection({ onAuthOpen }: { onAuthOpen: LandingViewProps["onAuthOpen"] }) {
  const { t } = useTranslation();
  const HERO_WORDS = t("land.hero.words").split(",");
  return (
    <section className="relative overflow-hidden pb-20 pt-28 md:pt-36">
      {/* Aurora background — soft blue / green / orange on white */}
      <div className="absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-grid-light [mask-image:radial-gradient(ellipse_75%_65%_at_50%_35%,black,transparent)]" />
        <div
          className="aurora-blob h-96 w-96 bg-blue-400/25"
          style={{ top: "-12%", left: "2%" }}
        />
        <div
          className="aurora-blob h-80 w-80 bg-orange-300/25"
          style={{ top: "16%", right: "-4%", animationDelay: "-5s" }}
        />
        <div
          className="aurora-blob h-72 w-72 bg-emerald-300/25"
          style={{ bottom: "-16%", left: "36%", animationDelay: "-9s" }}
        />
      </div>

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Copy */}
        <div className="text-center lg:text-left">
          <div className="animate-fade-up mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-blue-50/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-blue-700 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-orange-500" />
            {t("land.hero.badge")}
          </div>

          <h1
            className="animate-fade-up font-display text-4xl font-bold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl xl:text-6xl"
            style={{ animationDelay: "0.08s" }}
          >
            {t("land.hero.titlePre")}{" "}
            <WordRotator words={HERO_WORDS} className="h-[1.12em]" />
            <br className="hidden sm:block" /> {t("land.hero.titlePost")}
          </h1>

          <p
            className="animate-fade-up mx-auto mt-6 max-w-xl text-base leading-relaxed text-slate-500 sm:text-lg lg:mx-0"
            style={{ animationDelay: "0.16s" }}
          >
            {t("land.hero.subtitle")}{" "}
            <strong className="font-semibold text-slate-700">
              {t("land.hero.subtitleStrong")}
            </strong>
            .
          </p>

          <div
            className="animate-fade-up mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center lg:justify-start"
            style={{ animationDelay: "0.24s" }}
          >
            <Button
              size="lg"
              className="btn-shine animate-gradient-x animate-ticker-glow h-12 gap-2 bg-gradient-to-r from-blue-600 via-sky-500 to-emerald-500 px-7 text-base font-semibold text-white transition-transform hover:-translate-y-0.5"
              onClick={() => onAuthOpen("signup")}
            >
              {t("land.hero.cta")}
              <ArrowRight className="h-5 w-5" />
            </Button>
            <GoogleButton className="h-12 sm:w-auto" onRedirectStart={() => {}} />
          </div>

          <ul
            className="animate-fade-up mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-slate-500 lg:justify-start"
            style={{ animationDelay: "0.32s" }}
          >
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              {t("land.hero.trust1")}
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-blue-500" />
              {t("land.hero.trust2")}
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-orange-500" />
              {t("land.hero.trust3")}
            </li>
          </ul>
        </div>

        {/* Floating mockup card */}
        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div className="animate-float-slow relative rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-2xl shadow-blue-900/10 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400">{t("land.hero.dashTitle")}</p>
                <p className="font-display text-lg font-semibold text-slate-900">{t("land.hero.dashProgress")}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 text-lg font-bold text-white shadow-md">
                A
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <HeroStat label={t("land.hero.statQuestions")} value={128} icon={BookOpenCheck} tone="blue" />
              <HeroStat label={t("land.hero.statAccuracy")} value={87} suffix="%" icon={Target} tone="emerald" />
              <HeroStat label={t("land.hero.statStreak")} value={12} suffix={t("land.hero.streakUnit")} icon={Flame} tone="orange" />
            </div>

            <div className="mt-5 space-y-3 rounded-2xl bg-slate-50 p-4">
              <HeroBar label={t("subject.math")} pct={86} from="from-blue-500" to="to-sky-400" />
              <HeroBar label={t("subject.cultureGen")} pct={72} from="from-orange-400" to="to-amber-400" />
              <HeroBar label={t("subject.french")} pct={64} from="from-emerald-500" to="to-teal-400" />
            </div>

            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-orange-200/70 bg-orange-50/80 p-3.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-400 text-white shadow-md">
                <Trophy className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-orange-700">{t("land.hero.leagueLine")}</p>
                <p className="text-xs text-orange-600/70">{t("land.hero.leagueXp")}</p>
              </div>
            </div>
          </div>

          {/* Floating chips */}
          <div className="animate-float absolute -left-4 top-8 hidden rounded-xl border border-emerald-200 bg-white/95 px-3.5 py-2.5 shadow-xl shadow-emerald-600/10 backdrop-blur sm:block">
            <p className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              {t("land.hero.chipCorrect")}
            </p>
          </div>
          <div
            className="animate-float absolute -right-3 top-1/3 hidden rounded-xl border border-blue-200 bg-white/95 px-3.5 py-2.5 shadow-xl shadow-blue-600/10 backdrop-blur sm:block"
            style={{ animationDelay: "-1.6s" }}
          >
            <p className="flex items-center gap-2 text-xs font-semibold text-blue-700">
              <Layers className="h-4 w-4 text-blue-500" />
              {t("land.hero.chipMock")}
            </p>
          </div>
          <div
            className="animate-bob absolute -bottom-4 right-8 hidden rounded-xl border border-orange-200 bg-white/95 px-3.5 py-2.5 shadow-xl shadow-orange-600/10 backdrop-blur sm:block"
          >
            <p className="flex items-center gap-2 text-xs font-semibold text-orange-600">
              <Flame className="h-4 w-4 text-orange-500" />
              {t("land.hero.chipStreak")}
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
  tone: "blue" | "emerald" | "orange";
}) {
  const tones = {
    blue: "text-blue-600",
    emerald: "text-emerald-600",
    orange: "text-orange-600",
  } as const;
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-3 text-center shadow-sm">
      <Icon className={`mx-auto h-4 w-4 ${tones[tone]}`} />
      <p className="mt-1 font-display text-xl font-bold text-slate-900">
        <AnimatedNumber value={value} suffix={suffix} duration={1800} />
      </p>
      <p className="text-[11px] text-slate-400">{label}</p>
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
        <span className="text-slate-600">{label}</span>
        <span className="font-semibold text-slate-800">{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200/80">
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

/* ------------------------------------------------------------------ */
/* Subjects marquee                                                     */
/* ------------------------------------------------------------------ */

function SubjectsMarquee() {
  const { t } = useTranslation();
  const marquee = getSubjectsMarquee(t);
  const doubled = [...marquee, ...marquee];
  return (
    <section
      className="relative border-y border-slate-100 bg-slate-50/60 py-5"
      aria-label={t("land.subjects.aria")}
    >
      <div
        className="relative"
        style={{
          maskImage:
            "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
        }}
      >
        <div className="animate-marquee items-center gap-3 px-4">
          {doubled.map((subject, i) => (
            <span
              key={`${subject.label}-${i}`}
              aria-hidden={i >= marquee.length}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm"
            >
              <subject.icon className="h-4 w-4 text-blue-500" />
              {subject.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Stats                                                                */
/* ------------------------------------------------------------------ */

/**
 * V15 — LiveStats shape served by /api/public/stats (aggregate only, no PII).
 * `available: false` means the DB is asleep (cold start) — the panel then
 * falls back to the marketing values so the section never looks broken.
 */
interface TowerStats {
  banks: number;
  questions: number;
  exams: number;
  users: number;
  sessions: number;
  completedSessions: number;
  available: boolean;
}

const TOWER_FALLBACK: TowerStats = {
  banks: 40,
  questions: 5000,
  exams: 12,
  users: 1200,
  sessions: 3400,
  completedSessions: 2100,
  available: false,
};

/**
 * V15 — ControlTowerSection : « semblant de la tour de contrôle » admin,
 * reproduit sur la page d'accueil public pour la moderniser.
 *
 * Reprend l'identité visuelle de la salle de contrôle (AdminControlTower de
 * page.tsx) : écran radar (anneaux + faisceau rotatif + blips), trame de
 * points, scanlines CRT, équerres HUD, bandeau mono « LIVE », télémétrie
 * azimut/élévation qui tourne — mais alimentée par de VRAIES données
 * agrégées de la plateforme via /api/public/stats (cache 60 s, sans PII,
 * repli gracieux si la base est en cold start).
 */
function ControlTowerSection({ onAuthOpen }: { onAuthOpen: LandingViewProps["onAuthOpen"] }) {
  const { t } = useTranslation();
  const [stats, setStats] = useState<TowerStats>(TOWER_FALLBACK);
  const [telemetry, setTelemetry] = useState({ az: 214.6, el: 42.1 });

  // Télémétrie animée — même cadence que la tour de contrôle admin (900 ms).
  useEffect(() => {
    const id = window.setInterval(() => {
      setTelemetry((prev) => ({
        az: (prev.az + 7.3 + Math.random() * 5) % 360,
        el: 30 + Math.random() * 55,
      }));
    }, 900);
    return () => window.clearInterval(id);
  }, []);

  // Stats réelles : chargement immédiat puis rafraîchissement toutes les 45 s.
  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetch("/api/public/stats")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!cancelled && d && typeof d.banks === "number") setStats(d as TowerStats);
        })
        .catch(() => {
          /* repli silencieux sur les valeurs marketing */
        });
    load();
    const id = window.setInterval(load, 45_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const kpis = [
    { icon: LibraryBig, value: stats.banks, fallback: 40, suffix: "+", label: t("land.tower.banks"), tone: "text-emerald-300 bg-emerald-400/10 ring-emerald-400/20" },
    { icon: BookOpenCheck, value: stats.questions, fallback: 5000, suffix: "+", label: t("land.tower.questions"), tone: "text-sky-300 bg-sky-400/10 ring-sky-400/20" },
    { icon: Users, value: stats.users, fallback: 1200, suffix: "+", label: t("land.tower.users"), tone: "text-orange-300 bg-orange-400/10 ring-orange-400/20" },
    { icon: Trophy, value: stats.completedSessions, fallback: 2100, suffix: "+", label: t("land.tower.sessions"), tone: "text-violet-300 bg-violet-400/10 ring-violet-400/20" },
  ];

  return (
    <section id="tower" className="relative scroll-mt-20 py-14">
      <div className="mx-auto max-w-6xl px-4">
        <motion.div
          {...fadeUp}
          className="relative overflow-hidden rounded-[2rem] bg-slate-950 shadow-2xl shadow-emerald-900/20 ring-1 ring-slate-900"
        >
          {/* Trame de fond (grille de points) — même motif que l'admin */}
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.13]"
            style={{
              backgroundImage:
                "radial-gradient(rgba(52,211,153,0.9) 1px, transparent 1.5px)",
              backgroundSize: "22px 22px",
            }}
          />
          {/* Scanlines CRT subtiles */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, rgba(52,211,153,0.7) 0px, rgba(52,211,153,0.7) 1px, transparent 1px, transparent 4px)",
            }}
          />
          {/* Halo d'ambiance */}
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-500/15 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
          {/* Équerres HUD aux quatre coins — signature de la tour */}
          {["left-3 top-3 border-l-2 border-t-2", "right-3 top-3 border-r-2 border-t-2", "bottom-3 left-3 border-b-2 border-l-2", "bottom-3 right-3 border-b-2 border-r-2"].map(
            (pos) => (
              <span
                key={pos}
                aria-hidden="true"
                className={`absolute h-6 w-6 rounded-[3px] border-emerald-400/40 ${pos}`}
              />
            ),
          )}

          <div className="relative grid gap-8 p-6 sm:p-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-10">
            {/* ===== Colonne gauche : HUD + KPI live ===== */}
            <div>
              {/* Bandeau HUD — LIVE */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-300">
                  <Signal className="h-3.5 w-3.5" />
                  {t("land.tower.hud")}
                </span>
                <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-rose-400">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute h-full w-full animate-ping rounded-full bg-rose-500 opacity-70" />
                    <span className="relative h-1.5 w-1.5 rounded-full bg-rose-500" />
                  </span>
                  {t("land.tower.live")}
                </span>
              </div>

              <h2 className="mt-5 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {t("land.tower.title")}
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
                {t("land.tower.subtitle")}
              </p>

              {/* Statut nominal — ligne pulsante comme dans l'admin */}
              <p className="mt-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-emerald-400/70">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                {t("land.tower.status")}
              </p>

              {/* KPI live — compteurs animés sur données réelles */}
              <div className="mt-7 grid grid-cols-2 gap-3">
                {kpis.map((kpi, i) => (
                  <motion.div
                    key={kpi.label}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.5, delay: 0.1 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm transition-colors hover:border-emerald-400/30 hover:bg-white/[0.07]"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ring-1 ${kpi.tone}`}>
                        <kpi.icon className="h-4 w-4" />
                      </span>
                      <Activity className="h-3.5 w-3.5 text-emerald-400/50" aria-hidden="true" />
                    </div>
                    <p className="mt-3 font-display text-2xl font-bold text-white sm:text-3xl">
                      <AnimatedNumber value={kpi.value || kpi.fallback} suffix={kpi.suffix} />
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-slate-400 sm:text-xs">
                      {kpi.label}
                    </p>
                  </motion.div>
                ))}
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Button
                  onClick={() => onAuthOpen("signup")}
                  className="h-12 gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 px-6 text-sm font-semibold text-white shadow-lg shadow-emerald-900/40 transition-transform hover:scale-[1.03]"
                >
                  {t("land.tower.cta")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <button
                  type="button"
                  onClick={() => scrollToHash("#features")}
                  className="text-sm font-semibold text-slate-300 underline-offset-4 transition-colors hover:text-emerald-300 hover:underline"
                >
                  {t("land.tower.more")}
                </button>
              </div>
            </div>

            {/* ===== Colonne droite : écran radar + télémétrie ===== */}
            <div className="relative mx-auto flex w-full max-w-sm flex-col items-center">
              <div className="relative w-full max-w-[300px]">
                <RadarDish className="w-full text-emerald-300" />
                {/* Noyau central pulsant — comme l'écran admin */}
                <span className="pointer-events-none absolute left-1/2 top-1/2 flex h-3 w-3 -translate-x-1/2 -translate-y-1/2">
                  <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.9)]" />
                </span>
              </div>
              {/* Télémétrie mono — azimut/élévation + source */}
              <div className="mt-5 w-full rounded-xl border border-white/10 bg-black/30 p-3 font-mono text-[10px] leading-relaxed tracking-[0.14em] text-emerald-300/80 backdrop-blur-sm" aria-live="off">
                <div className="flex items-center justify-between">
                  <span>AZ {telemetry.az.toFixed(1)}°</span>
                  <span>EL {telemetry.el.toFixed(1)}°</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-emerald-400/50">
                  <span>SRC {stats.available ? "DB-LIVE" : "CACHE"}</span>
                  <span className="text-emerald-400/80">SIGNAL ■■■■□</span>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-emerald-900/50">
                  <motion.div
                    className="h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-emerald-400 to-transparent"
                    animate={{ x: ["-120%", "340%"] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
                  />
                </div>
                <p className="mt-2 text-emerald-400/60">{t("land.tower.scan")}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Features — bento grid with spotlight cards                           */
/* ------------------------------------------------------------------ */

function FeaturesSection() {
  const { t } = useTranslation();
  const FEATURES = getFeatures(t);
  return (
    <section id="features" className="relative scroll-mt-20 py-24">
      <div className="mx-auto max-w-6xl px-4">
        <motion.div {...fadeUp} className="mx-auto mb-14 max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
            {t("land.nav.features")}
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {t("land.features.titlePre")}{" "}
            <span className="text-gradient-brand">{t("land.features.titleHighlight")}</span>
          </h2>
          <p className="mt-4 text-slate-500">
            {t("land.features.subtitle")}
          </p>
        </motion.div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => {
            const tone = TONES[feature.tone];
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.55, delay: (i % 3) * 0.1, ease: [0.22, 1, 0.36, 1] }}
                onMouseMove={handleSpotlight}
                className={`spotlight-card group rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-900/8 ${tone.ring} ${
                  feature.big ? "sm:col-span-2" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${tone.chip} shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6`}
                  >
                    <feature.icon className="h-6 w-6" />
                  </span>
                  <span
                    className={`h-2 w-2 rounded-full ${tone.glow} opacity-40 transition-opacity group-hover:opacity-100`}
                    aria-hidden="true"
                  />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-slate-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* How it works                                                         */
/* ------------------------------------------------------------------ */

function HowItWorksSection() {
  const { t } = useTranslation();
  const STEPS = getSteps(t);
  return (
    <section className="relative py-24">
      <div
        className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-50/50 to-transparent"
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-6xl px-4">
        <motion.div {...fadeUp} className="mx-auto mb-14 max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-600">
            {t("land.steps.title")}
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {t("land.steps.h2Pre")} <span className="text-gradient-sun">{t("land.steps.h2Highlight")}</span>
          </h2>
        </motion.div>

        <div className="relative grid gap-8 md:grid-cols-3">
          {/* Animated connector line (desktop) */}
          <div className="absolute left-[16%] right-[16%] top-12 hidden md:block" aria-hidden="true">
            <div className="h-1 w-full overflow-hidden rounded-full bg-slate-200/70">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-emerald-500 to-orange-500"
                initial={{ width: "0%" }}
                whileInView={{ width: "100%" }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
              />
            </div>
          </div>
          {STEPS.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="relative flex flex-col items-center text-center"
            >
              <div className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-xl shadow-blue-900/5 transition-transform duration-300 hover:scale-105">
                <step.icon className="h-9 w-9 text-slate-700" />
                <span
                  className={`absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br ${STEP_TONES[step.tone]} font-display text-xs font-bold text-white shadow-lg`}
                >
                  {step.number}
                </span>
              </div>
              <h3 className="mt-5 font-display text-lg font-semibold text-slate-900">{step.title}</h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-500">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Levels                                                               */
/* ------------------------------------------------------------------ */

function LevelsSection() {
  const { t } = useTranslation();
  const LEVELS = getLevels(t);
  return (
    <section id="levels" className="relative scroll-mt-20 py-24">
      <div className="mx-auto max-w-6xl px-4">
        <motion.div {...fadeUp} className="mx-auto mb-14 max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
            {t("land.levels.title")}
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {t("land.levels.h2Pre")} <span className="text-gradient-brand">{t("land.levels.h2Highlight")}</span>
          </h2>
          <p className="mt-4 text-slate-500">
            {t("land.levels.desc")}
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
              className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-blue-900/8"
            >
              <div
                className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${level.topBar}`}
                aria-hidden="true"
              />
              <div
                className={`absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br ${level.gradient} opacity-10 blur-2xl transition-opacity duration-300 group-hover:opacity-25`}
                aria-hidden="true"
              />
              <div
                className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${level.gradient} text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6`}
              >
                <level.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display text-xl font-bold text-slate-900">{level.label}</h3>
              <p className="text-xs uppercase tracking-wider text-slate-400">{level.hint}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {level.subjects.slice(0, 4).map((subject) => (
                  <span
                    key={subject}
                    className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600"
                  >
                    {subject}
                  </span>
                ))}
                {level.subjects.length > 4 && (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600">
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

/* ------------------------------------------------------------------ */
/* Testimonials                                                         */
/* ------------------------------------------------------------------ */

function TestimonialsSection() {
  const { t } = useTranslation();
  const TESTIMONIALS = getTestimonials(t);
  const doubled = [...TESTIMONIALS, ...TESTIMONIALS];
  return (
    <section id="testimonials" className="relative scroll-mt-20 overflow-hidden py-24">
      <div className="mx-auto max-w-6xl px-4">
        <motion.div {...fadeUp} className="mx-auto mb-12 max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-600">
            {t("land.nav.testimonials")}
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {t("land.testimonials.h2Pre")} <span className="text-gradient-sun">{t("land.testimonials.h2Highlight")}</span>
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
          {doubled.map((tm, i) => (
            <figure
              key={`${tm.name}-${i}`}
              className="w-[320px] shrink-0 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm transition-shadow hover:shadow-lg"
              aria-hidden={i >= TESTIMONIALS.length}
            >
              <div className="flex gap-0.5" aria-label={t("land.stars.aria")}>
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <blockquote className="mt-3 text-sm leading-relaxed text-slate-600">
                « {tm.text} »
              </blockquote>
              <figcaption className="mt-4 flex items-center gap-3">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${AVATAR_TONES[tm.tone]} text-sm font-bold text-white`}
                  aria-hidden="true"
                >
                  {tm.name.charAt(0)}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{tm.name}</p>
                  <p className="text-xs text-slate-400">{tm.role}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* FAQ                                                                  */
/* ------------------------------------------------------------------ */

function FaqSection() {
  const { t } = useTranslation();
  const FAQ = getFaq(t);
  return (
    <section id="faq" className="relative scroll-mt-20 py-24">
      <div className="mx-auto max-w-3xl px-4">
        <motion.div {...fadeUp} className="mb-12 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
            FAQ
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {t("land.faq.title")}
          </h2>
        </motion.div>

        <div className="space-y-3">
          {FAQ.map((item, i) => (
            <motion.details
              key={item.q}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.07 }}
              className="group rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm transition-colors open:border-blue-200"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-display text-base font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
                {item.q}
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 transition-colors group-open:bg-blue-100">
                  <ChevronDown className="h-4 w-4 text-blue-600 transition-transform group-open:rotate-180" />
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-500">{item.a}</p>
            </motion.details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Final CTA                                                            */
/* ------------------------------------------------------------------ */

function FinalCtaSection({ onAuthOpen }: { onAuthOpen: LandingViewProps["onAuthOpen"] }) {
  const { t } = useTranslation();
  return (
    <section className="relative py-24">
      <div className="mx-auto max-w-5xl px-4">
        <motion.div
          {...fadeUp}
          className="animate-gradient-x relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-blue-700 via-blue-600 to-emerald-500 px-6 py-14 text-center shadow-2xl shadow-blue-700/30 sm:px-14"
        >
          <div className="dot-grid-light absolute inset-0 opacity-20" aria-hidden="true" />
          <div
            className="aurora-blob h-64 w-64 bg-white/25"
            style={{ top: "-30%", left: "10%" }}
            aria-hidden="true"
          />
          <div
            className="aurora-blob h-56 w-56 bg-orange-400/30"
            style={{ bottom: "-25%", right: "5%", animationDelay: "-6s" }}
            aria-hidden="true"
          />
          <div
            className="animate-spin-slow absolute -right-16 -top-16 h-48 w-48 rounded-full border-[3px] border-dashed border-white/25"
            aria-hidden="true"
          />

          <div className="relative">
            <div className="mx-auto mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 shadow-xl backdrop-blur-sm">
              <GraduationCap className="h-7 w-7 text-white" />
            </div>
            <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {t("land.cta.h2Pre")}{" "}
              <span className="text-gradient-gold">{t("land.cta.h2Highlight")}</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-blue-50/90">
              {t("land.cta.subtitle")}
            </p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Button
                size="lg"
                className="btn-shine h-12 gap-2 bg-gradient-to-r from-orange-500 to-amber-400 px-8 text-base font-semibold text-white shadow-xl shadow-orange-600/30 transition-transform hover:-translate-y-0.5"
                onClick={() => onAuthOpen("signup")}
              >
                {t("land.cta.button")}
                <ArrowRight className="h-5 w-5" />
              </Button>
              <GoogleButton className="h-12 sm:w-auto" />
            </div>
            <p className="mt-5 text-xs text-blue-100/70">
              {t("land.cta.note2")}
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Footer                                                               */
/* ------------------------------------------------------------------ */

function LandingFooter() {
  const { t } = useTranslation();
  const NAV_LINKS = getNavLinks(t);
  return (
    <footer className="border-t border-slate-100 bg-slate-50/60">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo-quizexam.svg"
              alt=""
              className="h-10 w-10 rounded-xl shadow-md shadow-blue-500/15"
              width={40}
              height={40}
            />
            <div>
              <p className="font-display text-sm font-bold text-slate-900">
                QuizExam <span className="text-gradient-brand">BF</span>
              </p>
              <p className="text-xs text-slate-400">
                {t("land.footer.sub")}
              </p>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500" aria-label={t("land.footerLinks.aria")}>
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToHash(link.href);
                }}
                className="transition-colors hover:text-blue-600"
              >
                {link.label}
              </a>
            ))}
            {/* V13 — pages légales (exigées par l'écran de consentement OAuth Google) */}
            <a href="/terms" className="font-medium transition-colors hover:text-blue-600">
              {t("legal.terms")}
            </a>
            <a href="/privacy" className="font-medium transition-colors hover:text-blue-600">
              {t("legal.privacy")}
            </a>
          </nav>

          <div className="text-left text-xs text-slate-400 md:text-right">
            <p className="font-medium text-slate-500">
              {t("land.footer.rights")}
            </p>
            <p className="mt-1">
              BAMOGO Pingdwendé Giovanni — {t("land.footer.creator")} ·{" "}
              <a
                href="mailto:giobamos03@gmail.com"
                className="transition-colors hover:text-blue-600"
              >
                giobamos03@gmail.com
              </a>
            </p>
            <p className="mt-1">Ouagadougou, Burkina Faso 🇧🇫</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
