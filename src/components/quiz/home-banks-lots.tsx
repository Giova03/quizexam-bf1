"use client";

/**
 * home-banks-lots.tsx (V10) — Le design de la BIBLIOTHÈQUE appliqué à la
 * page d'accueil, en version compacte et adaptée :
 *
 *   1. GROUPÉES PAR SUJET SIMILAIRE — les banques sont regroupées par
 *      matière canonique (Maths, SVT, Droit, Culture générale…) même si
 *      leurs catégories brutes diffèrent (« Maths financières » et
 *      « Mathématiques » tombent dans le même lot).
 *   2. LOTS « TOUR DE CONTRÔLE » — mêmes cartes que la bibliothèque
 *      (bandeau dégradé, médaillon, mini-radar, compteurs animés, barre
 *      de progression, micro-tags cliquables, CTA brillant) avec un
 *      panneau focus plein-flux au clic (AnimatePresence mode="wait").
 *   3. BANQUES À LA UNE — carrousel à DÉFILEMENT AUTOMATIQUE (rAF),
 *      boucle infinie, pause au survol/toucher, dots de progression.
 *   4. RESPONSIVE — 1/2/3 colonnes, carrousel natif tactile.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronRight,
  Compass,
  Crosshair,
  LayoutGrid,
  LibraryBig,
  Pause,
  Play,
  ScanLine,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BankIcon } from "@/components/quiz/bank-icon";
import {
  AnimatedNumber,
  HudChip,
  RadarDish,
  STAGGER_CONTAINER,
  STAGGER_ITEM,
  colorStyle,
  levelBadgeCls,
  toneFor,
  type LotTone,
} from "@/components/quiz/lot-visuals";
import { useQuizStore } from "@/shared/stores/quiz-store";
import { useTranslation } from "@/lib/use-translation";
import type { QuestionBank } from "@/lib/types";

/* ================================================================== */
/* 1. Regroupement par sujet similaire                                 */
/* ================================================================== */

interface SubjectRule {
  subject: string;
  patterns: RegExp[];
}

const SUBJECT_RULES: SubjectRule[] = [
  {
    subject: "Mathématiques",
    patterns: [/math/i, /alg[eè]br/i, /g[eé]om[eé]tr/i, /arithm/i, /calcul/i, /statisti/i, /proportion/i],
  },
  {
    subject: "SVT & Biologie",
    patterns: [/svt/i, /biologi/i, /anatomi/i, /zoologi/i, /botaniq/i, /g[eé]n[eé]tiqu/i, /sciences?\s+naturelles?/i, /[ée]cologi/i],
  },
  {
    subject: "Français & Lettres",
    patterns: [/fran[cç]ais/i, /lettres?/i, /litt[eé]rature/i, /grammaire/i, /orthograph/i, /conjug/i, /r[eé]sum[eé]/i, /dissertation/i, /philosoph/i],
  },
  {
    subject: "Droit & Institutions",
    patterns: [/droit/i, /juridi/i, /constitution/i, /institution/i, /administratif/i, /fiscal/i, /travail\b/i],
  },
  {
    subject: "Histoire-Géographie",
    patterns: [/histor/i, /g[eé]ograph/i, /citoyennet/i, /[ée]ducation\s+civique/i, /civisme/i, /g[eé]opoliti/i],
  },
  {
    subject: "Langues vivantes",
    patterns: [/anglais/i, /english/i, /espagnol/i, /allemand/i, /arabe/i, /italien/i, /allemand/i, /langues?/i],
  },
  {
    subject: "Physique-Chimie",
    patterns: [/physique/i, /chimi/i, /m[eé]canique/i, /[ée]lectricit/i, /optique/i],
  },
  {
    subject: "Informatique & Numérique",
    patterns: [/informati/i, /num[eé]rique/i, /bureauti/i, /internet/i, /r[eé]seaux?/i, /programmation/i, /informatiqu/i],
  },
  {
    subject: "Économie & Gestion",
    patterns: [/[ée]conom/i, /gestion/i, /comptabilit/i, /commerce/i, /financ/i, /comptable/i, /entreprend/i],
  },
  {
    subject: "Logique & Raisonnement",
    patterns: [/logique/i, /raisonn/i, /aptitude/i, /[ée]nigme/i, /syllogisme/i],
  },
  {
    subject: "Culture générale",
    patterns: [/culture/i, /g[eé]n[eé]ral/i, /actualit/i, /connaissances?/i, /arts?/i, /sport/i, /prix nobel/i],
  },
  {
    subject: "Santé & Médecine",
    patterns: [/sant[eé]/i, /m[eé]decine/i, /infirmi/i, /pharmac/i, /hygi[eè]ne/i, /nutrition/i],
  },
  {
    subject: "Concours & Administration",
    patterns: [/concours/i, /administration/i, /fonction\s+publique/i, /[ée]tat\b/i, /douane/i, /imp[oô]ts/i, /tr[eé]sor/i],
  },
];

function titleCase(s: string): string {
  if (!s) return "Autres";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Sujet canonique d'une banque : catégorie d'abord, titre en secours. */
export function subjectOf(bank: Pick<QuestionBank, "category" | "title">): string {
  const cat = (bank.category ?? "").trim();
  const title = (bank.title ?? "").trim();
  for (const rule of SUBJECT_RULES) {
    if (cat && rule.patterns.some((re) => re.test(cat))) return rule.subject;
  }
  for (const rule of SUBJECT_RULES) {
    if (title && rule.patterns.some((re) => re.test(title))) return rule.subject;
  }
  return cat ? titleCase(cat) : "Autres";
}

export function groupBySubject(
  banks: QuestionBank[],
): Array<[string, QuestionBank[]]> {
  const map = new Map<string, QuestionBank[]>();
  for (const b of banks) {
    const subject = subjectOf(b);
    if (!map.has(subject)) map.set(subject, []);
    map.get(subject)!.push(b);
  }
  // Tri : lots les plus fournis d'abord, puis alphabétique.
  return [...map.entries()].sort((a, b) => {
    const qa = a[1].reduce((s, x) => s + (x._count?.questions ?? 0), 0);
    const qb = b[1].reduce((s, x) => s + (x._count?.questions ?? 0), 0);
    if (qb !== qa) return qb - qa;
    return a[0].localeCompare(b[0], "fr");
  });
}

/* ================================================================== */
/* 2. Carrousel « Banques à la une » — défilement automatique          */
/* ================================================================== */

function FeaturedMiniCard({
  bank,
  onOpen,
}: {
  bank: QuestionBank;
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  const style = colorStyle(bank.color);
  const count = bank._count?.questions ?? 0;
  const lvl = (bank.educationLevel ?? "TOUS").toUpperCase();

  return (
    <motion.button
      type="button"
      onClick={onOpen}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      className="group/one relative flex h-full w-[264px] shrink-0 cursor-pointer flex-col overflow-hidden rounded-2xl border bg-card text-left shadow-sm transition-shadow hover:shadow-xl sm:w-[300px]"
      aria-label={bank.title}
    >
      <span
        className={`h-1.5 w-full bg-gradient-to-r ${toneFor(bank.category || bank.title).header}`}
        aria-hidden="true"
      />
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div className="flex items-start gap-3">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${style.chip} transition-transform duration-300 group-hover/one:scale-110`}
          >
            <BankIcon name={bank.icon} className="h-5.5 w-5.5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-sm font-bold leading-snug">
              {bank.title}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${levelBadgeCls(lvl)}`}
              >
                {lvl === "TOUS" ? "Tous" : lvl}
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {count} Q
              </span>
            </div>
          </div>
        </div>
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {bank.description}
        </p>
        <span className="btn-shine mt-auto inline-flex items-center justify-center gap-1.5 self-start rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 px-3 py-1.5 text-[11px] font-bold text-white shadow-md shadow-blue-500/20">
          <Sparkles className="h-3 w-3" />
          {t("banks.cta.start")}
        </span>
      </div>
    </motion.button>
  );
}

export function FeaturedBanksCarousel({
  banks,
  onOpenBank,
}: {
  banks: QuestionBank[];
  onOpenBank: (bankId: string) => void;
}) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [paused, setPaused] = useState(false);
  const [activeDot, setActiveDot] = useState(0);
  const lastDotRef = useRef(0);
  const pausedRef = useRef(false);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  // Défilement automatique : rAF + vitesse constante, boucle infinie sur
  // la moitié du scrollWidth (liste dupliquée). Pause : survol, toucher,
  // bouton, prefers-reduced-motion.
  useEffect(() => {
    if (reduceMotion) return;
    const el = scrollerRef.current;
    if (!el) return;
    let raf = 0;
    let last = performance.now();
    const SPEED = 0.055; // px/ms ≈ 33 px/s — défilement doux

    const tick = (now: number) => {
      const dt = Math.min(48, now - last);
      last = now;
      if (!pausedRef.current) {
        const half = el.scrollWidth / 2;
        if (half > 0) {
          el.scrollLeft += SPEED * dt;
          if (el.scrollLeft >= half) el.scrollLeft -= half;
          const idx = Math.floor(
            (el.scrollLeft / Math.max(1, half)) * banks.length,
          );
          const clamped = Math.min(banks.length - 1, Math.max(0, idx));
          if (clamped !== lastDotRef.current) {
            lastDotRef.current = clamped;
            setActiveDot(clamped);
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [banks.length, reduceMotion]);

  const goTo = useCallback(
    (i: number) => {
      const el = scrollerRef.current;
      if (!el) return;
      const half = el.scrollWidth / 2;
      // largeur moyenne d'une carte + gap
      const card = el.scrollWidth / (banks.length * 2);
      el.scrollTo({ left: i * card, behavior: "smooth" });
      void half;
      setActiveDot(i);
      lastDotRef.current = i;
    },
    [banks.length],
  );

  if (banks.length === 0) return null;

  const items = reduceMotion ? banks : [...banks, ...banks];

  return (
    <section className="space-y-3 sm:space-y-4" aria-label={t("home.featured.title")}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-5 w-5 items-center justify-center">
            <Sparkles className="h-5 w-5 shrink-0 text-amber-500" />
          </span>
          <h2 className="text-lg font-semibold sm:text-xl">
            {t("home.featured.title")}
          </h2>
          <Badge variant="outline" className="hidden gap-1 sm:inline-flex">
            <TrendingUp className="h-3 w-3" />
            {t("home.card.popular")}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {/* Bouton pause/lecture */}
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="flex h-8 w-8 items-center justify-center rounded-full border bg-background text-muted-foreground transition-colors hover:bg-muted"
            aria-label={paused ? t("home.featured.play") : t("home.featured.pause")}
          >
            {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      <div className="relative">
        {/* Masques dégradés gauche/droite */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-background to-transparent sm:w-16"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-background to-transparent sm:w-16"
        />
        <div
          ref={scrollerRef}
          className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 sm:gap-4"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
          aria-live="off"
        >
          {items.map((bank, i) => (
            <div key={`${bank.id}-${i}`} className="snap-start">
              <FeaturedMiniCard
                bank={bank}
                onOpen={() => onOpenBank(bank.id)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Dots de progression */}
      <div className="flex items-center justify-center gap-1.5" role="tablist" aria-label={t("home.featured.title")}>
        {banks.map((b, i) => (
          <button
            key={b.id}
            type="button"
            role="tab"
            aria-selected={i === activeDot}
            aria-label={b.title}
            onClick={() => goTo(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === activeDot
                ? "w-6 bg-gradient-to-r from-blue-600 to-emerald-500"
                : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60"
            }`}
          />
        ))}
      </div>
    </section>
  );
}

/* ================================================================== */
/* 3. Section « Banques par sujet » — lots de la bibliothèque          */
/* ================================================================== */

/** Sous-carte banque — identique au style bibliothèque (micro-tags + CTA). */
function HomeLotBankCard({
  bank,
  onOpen,
}: {
  bank: QuestionBank;
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  const style = colorStyle(bank.color);
  const lvl = (bank.educationLevel ?? "TOUS").toUpperCase();
  const questions = bank._count?.questions ?? 0;

  return (
    <motion.div
      variants={STAGGER_ITEM}
      className="group/card flex h-full cursor-pointer flex-col rounded-2xl border border-border/70 bg-background/60 p-3.5 transition-colors duration-200 hover:border-blue-200 hover:bg-blue-50/40 dark:border-white/5 dark:hover:border-blue-500/30 dark:hover:bg-blue-500/5"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      aria-label={bank.title}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${style.chip} transition-transform duration-300 group-hover/card:scale-110`}
        >
          <BankIcon name={bank.icon} className="h-4.5 w-4.5" />
        </span>
        <h4 className="line-clamp-2 flex-1 text-sm font-semibold leading-snug">
          {bank.title}
        </h4>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${levelBadgeCls(lvl)}`}
        >
          {lvl === "TOUS" ? t("banks.level.TOUS") : lvl}
        </span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
          {questions} {t(questions > 1 ? "banks.unit.questions" : "banks.unit.question")}
        </span>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
        className="btn-shine mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 px-3 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/30"
      >
        <Sparkles className="h-3.5 w-3.5" />
        {t("banks.cta.start")}
      </button>
    </motion.div>
  );
}

/** Lot compact (variante accueil) — même ADN visuel que la bibliothèque. */
function HomeLotCard({
  subject,
  banks,
  tone,
  featured,
  share,
  index,
  onOpen,
}: {
  subject: string;
  banks: QuestionBank[];
  tone: LotTone;
  featured?: boolean;
  share: number;
  index: number;
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  const questions = banks.reduce((s, b) => s + (b._count?.questions ?? 0), 0);
  const firstIcon = banks[0]?.icon ?? "Landmark";
  const levels = Array.from(
    new Set(banks.map((b) => (b.educationLevel ?? "TOUS").toUpperCase())),
  ).slice(0, 3);
  const previewTitles = banks.slice(0, featured ? 4 : 3).map((b) => b.title);

  return (
    <motion.div
      initial={{ opacity: 0, y: 26, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 24, delay: index * 0.06 }}
      className={`group/lot relative ${featured ? "sm:col-span-2" : ""}`}
    >
      {/* Lueur colorée au survol */}
      <span
        aria-hidden="true"
        className={`absolute -inset-3 rounded-[2.4rem] bg-gradient-to-br ${tone.glow} opacity-0 blur-2xl transition-opacity duration-500 group-hover/lot:opacity-40`}
      />
      <motion.button
        type="button"
        onClick={onOpen}
        whileHover={{ scale: 1.025, y: -4 }}
        whileTap={{ scale: 0.985 }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        aria-label={`${t("banks.aria.lot")} — ${subject}`}
        className="relative flex h-full w-full flex-col overflow-hidden rounded-3xl border bg-card text-left shadow-sm transition-shadow duration-300 hover:shadow-xl"
      >
        {/* Bandeau dégradé */}
        <div
          className={`relative overflow-hidden bg-gradient-to-br ${tone.header} ${featured ? "px-5 py-6" : "px-5 py-5"} text-white`}
        >
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-white/25 to-transparent"
            initial={{ x: "-160%" }}
            animate={{ x: "520%" }}
            transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 4.2, ease: "easeInOut" }}
          />
          <span aria-hidden="true" className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/15 blur-2xl" />
          <RadarDish
            className={`absolute -right-5 top-1/2 hidden -translate-y-1/2 opacity-45 sm:block ${featured ? "w-32" : "w-24"}`}
          />
          <div className="relative flex items-center gap-4">
            <motion.span
              className={`flex shrink-0 items-center justify-center rounded-2xl bg-white/20 shadow-inner backdrop-blur-sm ${featured ? "h-16 w-16" : "h-14 w-14"}`}
              whileHover={{ rotate: -8, scale: 1.12 }}
              transition={{ type: "spring", stiffness: 300, damping: 16 }}
              aria-hidden="true"
            >
              <BankIcon name={firstIcon} className={featured ? "h-8 w-8" : "h-7 w-7"} />
            </motion.span>
            <div className="min-w-0 flex-1">
              <HudChip>
                <ScanLine className="h-3 w-3" />
                {t("home.lots.kicker")}
              </HudChip>
              <h3
                className={`mt-1.5 font-display font-extrabold leading-tight tracking-tight ${featured ? "text-xl sm:text-2xl" : "text-lg"}`}
              >
                {subject}
              </h3>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs font-medium text-white/85">
                <span className="inline-flex items-center gap-1">
                  <LayoutGrid className="h-3.5 w-3.5" />
                  {banks.length} {t("banks.stat.banks")}
                </span>
                <span className="inline-flex items-center gap-1">
                  <BookOpen className="h-3.5 w-3.5" />
                  <AnimatedNumber value={questions} /> {t("banks.stat.questions")}
                </span>
              </p>
            </div>
            <motion.span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm"
              whileHover={{ x: 3 }}
            >
              <ChevronRight className="h-4.5 w-4.5" />
            </motion.span>
          </div>
          {/* Barre de progression */}
          <div className="relative mt-4">
            <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-white/80">
              <span>
                {share}% {t("banks.share.of")}
              </span>
              <span className="inline-flex items-center gap-0.5 rounded-full bg-white/15 px-2 py-0.5">
                {t("banks.cta.explore")}
                <ChevronRight className="h-3 w-3" />
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/25">
              <motion.div
                className="h-full rounded-full bg-white/90"
                initial={{ width: 0 }}
                animate={{ width: `${share}%` }}
                transition={{ duration: 1, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        </div>

        {/* Corps : niveaux + aperçu des banques */}
        <div className="flex flex-1 flex-col gap-3 p-4">
          {levels.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {levels.map((lvl) => (
                <span
                  key={lvl}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${levelBadgeCls(lvl)}`}
                >
                  {lvl === "TOUS" ? t("banks.level.TOUS") : lvl}
                </span>
              ))}
            </div>
          )}
          <ul className="space-y-1">
            {previewTitles.map((title) => (
              <li key={title} className="flex items-center gap-2 truncate text-xs text-muted-foreground">
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-r ${tone.bar}`}
                  aria-hidden="true"
                />
                <span className="truncate font-medium text-foreground/80">{title}</span>
              </li>
            ))}
            {banks.length > (featured ? 4 : 3) && (
              <li className="pl-3.5 text-[11px] font-semibold text-blue-600 dark:text-blue-300">
                +{banks.length - (featured ? 4 : 3)} {t("banks.lot.others")}
              </li>
            )}
          </ul>
          <span className="btn-shine mt-1 inline-flex items-center justify-center gap-1.5 self-start rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/25 transition-shadow duration-300 hover:shadow-lg hover:shadow-emerald-500/30">
            <Sparkles className="h-3.5 w-3.5" />
            {t("banks.cta.explore")}
          </span>
        </div>
      </motion.button>
    </motion.div>
  );
}

/** Panneau focus plein-flux (accueil) — même mécanique que la bibliothèque. */
function HomeLotFocusPanel({
  subject,
  banks,
  tone,
  totalQuestions,
  onBack,
  onOpenBank,
}: {
  subject: string;
  banks: QuestionBank[];
  tone: LotTone;
  totalQuestions: number;
  onBack: () => void;
  onOpenBank: (bankId: string) => void;
}) {
  const { t } = useTranslation();
  const questions = banks.reduce((s, b) => s + (b._count?.questions ?? 0), 0);
  const share = Math.max(
    4,
    Math.round((questions / Math.max(1, totalQuestions)) * 100),
  );
  const firstIcon = banks[0]?.icon ?? "Landmark";

  return (
    <motion.section
      initial={{ opacity: 0, y: 26, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.99, transition: { duration: 0.16 } }}
      transition={{ type: "spring", stiffness: 260, damping: 27 }}
      className="relative"
      aria-label={`${t("banks.aria.lot")} — ${subject}`}
    >
      <span
        aria-hidden="true"
        className={`absolute -inset-3 rounded-[2.4rem] bg-gradient-to-br ${tone.glow} opacity-25 blur-2xl`}
      />
      <div className="relative overflow-hidden rounded-3xl border bg-card shadow-xl">
        {/* En-tête HUD */}
        <div className={`relative overflow-hidden bg-gradient-to-br ${tone.header} px-5 py-6 text-white sm:px-7`}>
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.14]"
            style={{
              backgroundImage:
                "radial-gradient(rgba(255,255,255,0.95) 1px, transparent 1.5px)",
              backgroundSize: "20px 20px",
            }}
          />
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-white/25 to-transparent"
            initial={{ x: "-160%" }}
            animate={{ x: "520%" }}
            transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 4.6, ease: "easeInOut" }}
          />
          <RadarDish className="absolute -right-8 top-1/2 hidden w-40 -translate-y-1/2 opacity-50 sm:block" />

          <div className="relative flex flex-wrap items-center gap-x-4 gap-y-3">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 shadow-inner backdrop-blur-sm">
              <BankIcon name={firstIcon} className="h-7 w-7" />
            </span>
            <div className="min-w-0 flex-1">
              <HudChip>
                <ScanLine className="h-3 w-3" />
                {t("banks.focus.scan")}
              </HudChip>
              <h2 className="mt-1.5 truncate font-display text-xl font-extrabold tracking-tight sm:text-2xl">
                {subject}
              </h2>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs font-medium text-white/85">
                <span className="inline-flex items-center gap-1">
                  <LayoutGrid className="h-3.5 w-3.5" />
                  {banks.length} {t("banks.stat.banks")}
                </span>
                <span className="inline-flex items-center gap-1">
                  <BookOpen className="h-3.5 w-3.5" />
                  <AnimatedNumber value={questions} /> {t("banks.stat.questions")}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Crosshair className="h-3.5 w-3.5" />
                  {share}% {t("banks.share.of")}
                </span>
              </p>
            </div>
            <motion.button
              type="button"
              onClick={onBack}
              whileHover={{ x: -3 }}
              whileTap={{ scale: 0.96 }}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-2 text-xs font-bold backdrop-blur-sm transition-colors hover:bg-white/35"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("home.lots.back")}
            </motion.button>
          </div>

          <div className="relative mt-5">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/25">
              <motion.div
                className="h-full rounded-full bg-white/90"
                initial={{ width: 0 }}
                animate={{ width: `${share}%` }}
                transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        </div>

        {/* Banques du sujet */}
        <motion.div
          variants={STAGGER_CONTAINER}
          initial="hidden"
          animate="show"
          className="grid items-stretch gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3"
        >
          {banks.map((bank) => (
            <HomeLotBankCard
              key={bank.id}
              bank={bank}
              onOpen={() => onOpenBank(bank.id)}
            />
          ))}
        </motion.div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 sm:px-5">
          <HudChip tone="slate">
            <Crosshair className="h-3 w-3" />
            {t("banks.focus.hint")}
          </HudChip>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
            {subject}
          </span>
        </div>
      </div>
    </motion.section>
  );
}

/* ------------------------------------------------------------------ */
/* Composant exporté : section banques par sujet                       */
/* ------------------------------------------------------------------ */

export function HomeBanksLots({
  banks,
  loading,
  onOpenLibrary,
}: {
  banks: QuestionBank[];
  loading: boolean;
  onOpenLibrary: () => void;
}) {
  const { t } = useTranslation();
  const openBank = useQuizStore((s) => s.openBank);
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  const groups = useMemo(() => groupBySubject(banks), [banks]);
  const totalQuestions = useMemo(
    () => banks.reduce((sum, b) => sum + (b._count?.questions ?? 0), 0),
    [banks],
  );

  const activeLotData = useMemo(() => {
    if (!activeSubject) return null;
    const entry = groups.find(([s]) => s === activeSubject);
    return entry ? { subject: entry[0], banks: entry[1] } : null;
  }, [activeSubject, groups]);

  const activeTone = activeLotData ? toneFor(activeLotData.subject) : null;

  // Échap ferme le panneau + défilement doux vers la section.
  useEffect(() => {
    if (!activeSubject) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveSubject(null);
    };
    window.addEventListener("keydown", onKey);
    const id = window.setTimeout(() => {
      bodyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(id);
    };
  }, [activeSubject]);

  return (
    <section className="space-y-3 sm:space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <LibraryBig className="h-5 w-5 shrink-0 text-blue-600" />
          <h2 className="text-lg font-semibold sm:text-xl">
            {t("menu.banks")}
          </h2>
          <Badge variant="secondary" className="hidden gap-1 sm:inline-flex">
            {groups.length} {t("banks.stat.lots")}
          </Badge>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="gap-1.5 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-300"
          onClick={onOpenLibrary}
        >
          {t("home.lots.library")}
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div ref={bodyRef} className="scroll-mt-24">
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`overflow-hidden rounded-3xl border bg-card ${i === 0 ? "sm:col-span-2" : ""}`}
              >
                <div className="shimmer h-24 w-full bg-muted" />
                <div className="space-y-3 p-4">
                  <div className="shimmer h-6 w-3/4 rounded bg-muted" />
                  <div className="shimmer h-4 w-1/2 rounded bg-muted" />
                  <div className="shimmer h-2 w-full rounded-full bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : banks.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <Compass className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {t("home.banks.emptyPre")}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            {activeLotData && activeTone ? (
              <HomeLotFocusPanel
                key="home-focus"
                subject={activeLotData.subject}
                banks={activeLotData.banks}
                tone={activeTone}
                totalQuestions={totalQuestions}
                onBack={() => setActiveSubject(null)}
                onOpenBank={openBank}
              />
            ) : (
              <motion.div
                key="home-lots"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14, transition: { duration: 0.16 } }}
                transition={{ duration: 0.32, ease: "easeOut" }}
              >
                <div className="grid items-start gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {groups.map(([subject, subjectBanks], i) => {
                    const share =
                      totalQuestions > 0
                        ? Math.max(
                            4,
                            Math.round(
                              (subjectBanks.reduce(
                                (s, b) => s + (b._count?.questions ?? 0),
                                0,
                              ) /
                                totalQuestions) *
                                100,
                            ),
                          )
                        : 0;
                    return (
                      <HomeLotCard
                        key={subject}
                        subject={subject}
                        banks={subjectBanks}
                        tone={toneFor(subject)}
                        featured={i === 0 && groups.length > 2}
                        share={share}
                        index={i}
                        onOpen={() => setActiveSubject(subject)}
                      />
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Recherche globale (rappel visuel) */}
      {banks.length > 0 && !activeSubject && (
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Search className="h-3.5 w-3.5" />
          {t("home.lots.hint")}
        </p>
      )}
    </section>
  );
}
