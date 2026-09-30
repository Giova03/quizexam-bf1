"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  Search,
  LayoutGrid,
  ArrowUpDown,
  LibraryBig,
  BookOpen,
  Sparkles,
  Compass,
  ChevronRight,
  Layers,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BankIcon } from "@/components/quiz/bank-icon";
import {
  EducationLevelSelector,
  type EducationLevel,
} from "@/components/quiz/education-level-selector";
import { useQuizStore } from "@/shared/stores/quiz-store";
import { useTranslation } from "@/lib/use-translation";
import type { QuestionBank } from "@/lib/types";

/**
 * BanksLibraryView (V7) — refonte spectaculaire de la bibliothèque de banques.
 *
 * La logique de données est STRICTEMENT identique à la V3/V4/V6 (même fetch,
 * mêmes filtres niveau/recherche/tri, même openBank du quiz-store, même
 * persistance localStorage) — seule la présentation change :
 *
 *   1. REGROUPEMENT EN LOTS : chaque catégorie devient un grand panneau à
 *      en-tête dégradé, médaillon géant, compteurs animés (count-up) et
 *      double barre de progression. Le premier lot est mis en avant (large).
 *   2. EFFET D'OUVERTURE (concept 2) : le lot s'agrandit théâtralement au
 *      premier plan via layoutId partagé, et ses banques arrivent en
 *      cascade rapide (stagger 45 ms).
 *   3. STYLE « BOOSTER » : zoom + lueur colorée diffuse au survol, balayage
 *      lumineux, sous-cartes épurées avec micro-tags cliquables (le tag de
 *      niveau applique le filtre) et bouton de démarrage brillant.
 *   4. CAS UNE SEULE CATÉGORIE : le lot s'affiche déjà « ouvert » en ligne,
 *      jamais une simple liste plate.
 */

type SortMode = "popular" | "alpha" | "questions";

/* ------------------------------------------------------------------ */
/* Outils visuels                                                      */
/* ------------------------------------------------------------------ */

/** style coloré d'une banque (champ QuestionBank.color). */
function colorStyle(color?: string): { chip: string } {
  switch (color) {
    case "blue":
      return { chip: "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300" };
    case "rose":
      return { chip: "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300" };
    case "violet":
      return { chip: "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300" };
    case "sky":
      return { chip: "bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300" };
    case "amber":
      return { chip: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300" };
    case "cyan":
      return { chip: "bg-cyan-100 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-300" };
    case "orange":
      return { chip: "bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300" };
    default:
      return { chip: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300" };
  }
}

function levelBadgeCls(level: string): string {
  switch (level) {
    case "BEPC":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";
    case "BAC":
      return "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300";
    case "LICENCE":
      return "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300";
    case "CONCOURS":
      return "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300";
    default:
      return "bg-muted text-muted-foreground";
  }
}

/**
 * Tonalités des lots — identité visuelle stable par catégorie (hash).
 * `header` : bandeau dégradé du lot ; `glow` : lueur diffuse au survol ;
 * `bar` : barre de progression ; `medal` : médaillon translucide.
 */
const LOT_TONES: Array<{
  header: string;
  glow: string;
  bar: string;
  chip: string;
}> = [
  {
    header: "from-blue-700 via-blue-600 to-cyan-500",
    glow: "from-blue-600 to-cyan-400",
    bar: "from-blue-500 to-cyan-400",
    chip: "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
  },
  {
    header: "from-emerald-700 via-emerald-600 to-teal-500",
    glow: "from-emerald-600 to-teal-400",
    bar: "from-emerald-500 to-teal-400",
    chip: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  {
    header: "from-orange-600 via-orange-500 to-amber-500",
    glow: "from-orange-500 to-amber-400",
    bar: "from-orange-500 to-amber-400",
    chip: "bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300",
  },
  {
    header: "from-violet-700 via-violet-600 to-purple-500",
    glow: "from-violet-600 to-purple-400",
    bar: "from-violet-500 to-purple-400",
    chip: "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
  },
  {
    header: "from-rose-600 via-rose-500 to-pink-500",
    glow: "from-rose-500 to-pink-400",
    bar: "from-rose-500 to-pink-400",
    chip: "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300",
  },
  {
    header: "from-sky-700 via-sky-600 to-blue-500",
    glow: "from-sky-600 to-blue-400",
    bar: "from-sky-500 to-blue-400",
    chip: "bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300",
  },
  {
    header: "from-amber-500 via-amber-400 to-orange-500",
    glow: "from-amber-500 to-orange-400",
    bar: "from-amber-500 to-orange-400",
    chip: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
  },
  {
    header: "from-cyan-700 via-cyan-600 to-teal-500",
    glow: "from-cyan-600 to-teal-400",
    bar: "from-cyan-500 to-teal-400",
    chip: "bg-cyan-100 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-300",
  },
];

function toneFor(key: string) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return LOT_TONES[h % LOT_TONES.length];
}

/* Cascades rapides à l'intérieur d'un lot ouvert. */
const STAGGER_CONTAINER: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.16 } },
};
const STAGGER_ITEM: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
  },
};

/** Compteur animé (count-up) pour les grands chiffres des lots. */
function AnimatedNumber({
  value,
  duration = 900,
  className,
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setDisplay(Math.round(from + (value - from) * eased));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [value, duration]);
  return (
    <span className={className} aria-label={String(value)}>
      {display.toLocaleString("fr-FR")}
    </span>
  );
}

/* ================================================================== */
/* Composant principal                                                 */
/* ================================================================== */

export function BanksLibraryView() {
  const openBank = useQuizStore((s) => s.openBank);
  const { t } = useTranslation();

  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState<EducationLevel>(() => {
    if (typeof window === "undefined") return "TOUS";
    const saved = window.localStorage.getItem("library:level");
    return saved === "BEPC" || saved === "BAC" || saved === "LICENCE" || saved === "CONCOURS"
      ? (saved as EducationLevel)
      : "TOUS";
  });
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("popular");
  /* V7 — lot actuellement ouvert (catégorie) ; null = grille de lots. */
  const [activeLot, setActiveLot] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // (initial loading state is `true`; setState stays inside async callbacks
    //  to comply with react-hooks/set-state-in-effect)
    fetch("/api/banks")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: QuestionBank[]) => {
        if (!cancelled) setBanks(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setBanks([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem("library:level", level);
  }, [level]);

  /* Lot ouvert : verrouille le scroll de fond + Échap pour fermer. */
  useEffect(() => {
    if (!activeLot) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveLot(null);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [activeLot]);

  /* ---- Level counts (EducationLevelSelector pills) ---- */
  const counts = useMemo(() => {
    const map: Partial<Record<EducationLevel, number>> = {
      TOUS: banks.length,
      BEPC: 0,
      BAC: 0,
      LICENCE: 0,
      CONCOURS: 0,
    };
    for (const b of banks) {
      const lvl = (b.educationLevel ?? "TOUS").toUpperCase();
      if (lvl === "BEPC") map.BEPC = (map.BEPC ?? 0) + 1;
      else if (lvl === "BAC") map.BAC = (map.BAC ?? 0) + 1;
      else if (lvl === "LICENCE") map.LICENCE = (map.LICENCE ?? 0) + 1;
      else if (lvl === "CONCOURS") map.CONCOURS = (map.CONCOURS ?? 0) + 1;
    }
    return map;
  }, [banks]);

  /* ---- Level filter (TOUS wildcard banks visible in every tab) ---- */
  const levelFiltered = useMemo(() => {
    if (level === "TOUS") return banks;
    return banks.filter((b) => {
      const lvl = (b.educationLevel ?? "TOUS").toUpperCase();
      return lvl === "TOUS" || lvl === level;
    });
  }, [banks, level]);

  /* ---- Search + sort ---- */
  const searchFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return levelFiltered;
    return levelFiltered.filter((b) =>
      [b.title, b.description, b.category]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [levelFiltered, query]);

  const sorted = useMemo(() => {
    const arr = [...searchFiltered];
    switch (sort) {
      case "alpha":
        return arr.sort((a, b) => a.title.localeCompare(b.title, "fr"));
      case "questions":
        return arr.sort(
          (a, b) => (b._count?.questions ?? 0) - (a._count?.questions ?? 0)
        );
      default:
        return arr; // "popular" = API order (already curated)
    }
  }, [searchFiltered, sort]);

  /* ---- Group by category (lots) ---- */
  const groups = useMemo(() => {
    const map = new Map<string, QuestionBank[]>();
    for (const b of sorted) {
      const key = b.category?.trim() || "Autres";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    }
    // Sort groups by bank count desc, then by name.
    return [...map.entries()].sort((a, b) => {
      if (b[1].length !== a[1].length) return b[1].length - a[1].length;
      return a[0].localeCompare(b[0], "fr");
    });
  }, [sorted]);

  const totalQuestions = useMemo(
    () => sorted.reduce((sum, b) => sum + (b._count?.questions ?? 0), 0),
    [sorted]
  );

  /* ---- Données du lot ouvert ---- */
  const activeLotData = useMemo(() => {
    if (!activeLot) return null;
    const entry = groups.find(([c]) => c === activeLot);
    return entry ? { category: entry[0], banks: entry[1] } : null;
  }, [activeLot, groups]);

  const activeTone = activeLotData ? toneFor(activeLotData.category) : null;

  const levelLabel = (lvl: string) => {
    if (lvl === "TOUS") return t("banks.level.TOUS");
    if (lvl === "LICENCE") return t("banks.level.LICENCE");
    if (lvl === "CONCOURS") return t("banks.level.CONCOURS");
    return lvl;
  };

  const sortOptions: { value: SortMode; label: string }[] = [
    { value: "popular", label: t("banks.sort.popular") },
    { value: "alpha", label: t("banks.sort.alpha") },
    { value: "questions", label: t("banks.sort.questions") },
  ];

  return (
    <div className="-mx-4 -mt-8">
      {/* ---------- Hero header (compact V7 — les lots sont la vedette) ---------- */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-emerald-50 pb-8 pt-10 text-slate-800">
        <div
          className="absolute inset-0 bg-grid-light"
          aria-hidden="true"
        />
        <div
          className="aurora-blob h-56 w-56 bg-blue-400/25"
          style={{ top: "-40%", left: "8%" }}
          aria-hidden="true"
        />
        <div
          className="aurora-blob h-48 w-48 bg-orange-300/25"
          style={{ bottom: "-50%", right: "5%", animationDelay: "-7s" }}
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-6xl px-4">
          <div className="animate-fade-up flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
            <LibraryBig className="h-4 w-4" />
            {t("banks.kicker")}
          </div>
          <h1
            className="animate-fade-up mt-2 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
            style={{ animationDelay: "0.08s" }}
          >
            {t("banks.title.pre")}{" "}
            <span className="text-gradient-brand">{t("banks.title.hl")}</span>
          </h1>
          <p
            className="animate-fade-up mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 sm:text-base"
            style={{ animationDelay: "0.16s" }}
          >
            {t("banks.subtitle")}
          </p>

          <div
            className="animate-fade-up mt-5 flex flex-wrap items-center gap-2.5"
            style={{ animationDelay: "0.24s" }}
          >
            <span className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-1.5 text-sm shadow-sm backdrop-blur-sm">
              <Layers className="h-4 w-4 text-blue-600" />
              <span className="font-bold text-slate-900">{groups.length}</span>
              <span className="text-slate-500">{t("banks.stat.lots")}</span>
            </span>
            <span className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-1.5 text-sm shadow-sm backdrop-blur-sm">
              <LayoutGrid className="h-4 w-4 text-emerald-600" />
              <span className="font-bold text-slate-900">{banks.length}</span>
              <span className="text-slate-500">{t("banks.stat.banks")}</span>
            </span>
            <span className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-1.5 text-sm shadow-sm backdrop-blur-sm">
              <BookOpen className="h-4 w-4 text-orange-500" />
              <span className="font-bold text-slate-900">
                {banks.reduce((s, b) => s + (b._count?.questions ?? 0), 0).toLocaleString("fr-FR")}
              </span>
              <span className="text-slate-500">{t("banks.stat.questions")}</span>
            </span>
            <span className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs shadow-sm backdrop-blur-sm">
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="font-medium text-slate-500">{t("banks.stat.updated")}</span>
            </span>
          </div>
        </div>
      </div>

      {/* ---------- Sticky toolbar ---------- */}
      <div className="sticky top-[4.5rem] z-30 border-b border-blue-100/60 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <EducationLevelSelector
            value={level}
            onChange={setLevel}
            counts={counts}
            className="no-scrollbar overflow-x-auto"
          />
          <div className="flex items-center gap-2">
            <div className="relative flex-1 lg:w-64">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t("banks.search.placeholder")}
                className="h-9 pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label={t("banks.search.placeholder")}
              />
            </div>
            <div className="flex items-center gap-1 rounded-lg border p-1">
              {sortOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSort(opt.value)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    sort === opt.value
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Body : grille de LOTS spectaculaires ---------- */}
      <div className="mx-auto max-w-6xl px-4 py-8">
        {!loading && (
          <p className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowUpDown className="h-3.5 w-3.5" />
            {sorted.length}{" "}
            {t(sorted.length > 1 ? "banks.unit.banks" : "banks.unit.bank")} ·{" "}
            {totalQuestions.toLocaleString("fr-FR")}{" "}
            {t(totalQuestions > 1 ? "banks.unit.questions" : "banks.unit.question")}
            {level !== "TOUS" &&
              ` · ${t("banks.level.word")} ${levelLabel(level).toLowerCase()}`}
            {query && ` · « ${query} »`}
          </p>
        )}

        {loading ? (
          <LibrarySkeleton />
        ) : sorted.length === 0 ? (
          <EmptyState
            hasQuery={Boolean(query.trim()) || level !== "TOUS"}
            onReset={() => {
              setQuery("");
              setLevel("TOUS");
            }}
          />
        ) : (
          <div className="grid items-start gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map(([category, categoryBanks], i) => {
              // FIX CHEVAUCHEMENT : le lot ouvert est masqué proprement
              // (visibility, layout préservé) pendant que son panneau est
              // ouvert — aucun double rendu du même contenu à l'écran.
              const hiddenWhileOpen = activeLot === category;
              const share =
                totalQuestions > 0
                  ? Math.max(
                      4,
                      Math.round(
                        (categoryBanks.reduce(
                          (s, b) => s + (b._count?.questions ?? 0),
                          0
                        ) /
                          totalQuestions) *
                          100
                      )
                    )
                  : 0;
              /* CAS UNE SEULE CATÉGORIE : le lot est rendu déjà « ouvert »
                 en ligne (jamais une liste plate en dessous d'un lot seul). */
              if (groups.length === 1) {
                return (
                  <LotCard
                    key={category}
                    category={category}
                    banks={categoryBanks}
                    tone={toneFor(category)}
                    featured
                    share={share}
                    index={i}
                    inlineBanks
                    onOpenBank={openBank}
                    onTagLevel={(lvl) => setLevel(lvl as EducationLevel)}
                    levelLabel={levelLabel}
                  />
                );
              }
              return (
                <LotCard
                  key={category}
                  category={category}
                  banks={categoryBanks}
                  tone={toneFor(category)}
                  featured={i === 0 && groups.length > 2}
                  share={share}
                  index={i}
                  hidden={hiddenWhileOpen}
                  onOpen={() => setActiveLot(category)}
                  levelLabel={levelLabel}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* ---------- Lot ouvert (expansion modale déterminée) ----------
          FIX CHEVAUCHEMENT : l'ancien layoutId partagé carte/panneau montait
          DEUX éléments avec le même layoutId simultanément (la carte restait
          rendue dans la grille) → Framer Motion croisait les deux rendus et
          empilait texte + boutons sur plusieurs couches. On utilise désormais
          une entrée/sortie déterminée (ressort scale + fade) : zéro doublon,
          même sensation d'expansion théâtrale. */}
      <AnimatePresence>
        {activeLotData && activeTone && (
          <>
            {/* Voile de fond */}
            <motion.div
              key="lot-backdrop"
              className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setActiveLot(null)}
              aria-hidden="true"
            />
            {/* Panneau agrandi (modal centré, ressort d'ouverture) */}
            <motion.div
              key={`lot-panel-${activeLotData.category}`}
              role="dialog"
              aria-modal="true"
              aria-label={activeLotData.category}
              initial={{ opacity: 0, scale: 0.9, y: 34 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 18, transition: { duration: 0.16 } }}
              transition={{ type: "spring", stiffness: 340, damping: 30 }}
              className="fixed inset-0 z-50 m-auto flex h-fit max-h-[85vh] w-[calc(100%-1.5rem)] max-w-2xl flex-col overflow-hidden rounded-3xl border bg-card shadow-2xl"
            >
              {/* En-tête dégradé */}
              <div
                className={`relative overflow-hidden bg-gradient-to-br ${activeTone.header} p-5 text-white`}
              >
                <span
                  aria-hidden="true"
                  className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/15 blur-2xl"
                />
                <span
                  aria-hidden="true"
                  className="absolute -bottom-12 -left-8 h-28 w-28 rounded-full bg-white/10 blur-xl"
                />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                      <BankIcon
                        name={activeLotData.banks[0]?.icon ?? "Landmark"}
                        className="h-6 w-6"
                      />
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate font-display text-lg font-bold leading-tight">
                        {activeLotData.category}
                      </h2>
                      <p className="mt-0.5 text-xs font-medium text-white/85">
                        {activeLotData.banks.length} {t("banks.stat.banks")} ·{" "}
                        <AnimatedNumber
                          value={activeLotData.banks.reduce(
                            (s, b) => s + (b._count?.questions ?? 0),
                            0
                          )}
                        />{" "}
                        {t("banks.stat.questions")}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveLot(null)}
                    aria-label={t("banks.cta.close")}
                    className="rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {/* Barre de progression (part du contenu) */}
                <div className="relative mt-4">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-white/80">
                    {Math.max(
                      4,
                      Math.round(
                        (activeLotData.banks.reduce(
                          (s, b) => s + (b._count?.questions ?? 0),
                          0
                        ) /
                          Math.max(1, totalQuestions)) *
                          100
                      )
                    )}
                    % {t("banks.share.of")}
                  </p>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/25">
                    <motion.div
                      className="h-full rounded-full bg-white"
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.max(
                          4,
                          Math.round(
                            (activeLotData.banks.reduce(
                              (s, b) => s + (b._count?.questions ?? 0),
                              0
                            ) /
                              Math.max(1, totalQuestions)) *
                              100
                          )
                        )}%`,
                      }}
                      transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
                    />
                  </div>
                </div>
              </div>

              {/* Banques du lot — cascade rapide (staggered) */}
              <motion.div
                variants={STAGGER_CONTAINER}
                initial="hidden"
                animate="show"
                className="grid flex-1 gap-3 overflow-y-auto p-4 sm:grid-cols-2"
              >
                {activeLotData.banks.map((bank) => (
                  <LotBankCard
                    key={bank.id}
                    bank={bank}
                    onOpen={() => openBank(bank.id)}
                    onTagLevel={(lvl) => {
                      setLevel(lvl as EducationLevel);
                      setActiveLot(null);
                    }}
                    levelLabel={levelLabel}
                  />
                ))}
                {activeLotData.banks.length === 0 && (
                  <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
                    {t("banks.lot.empty")}
                  </p>
                )}
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Lot principal (carte collapsed V7) — bandeau dégradé, médaillon     */
/* géant, compteurs animés, glow + zoom au survol, shine sweep.        */
/* `inlineBanks` : rend le lot déjà ouvert (cas une seule catégorie).  */
/* ------------------------------------------------------------------ */

function LotCard({
  category,
  banks,
  tone,
  featured,
  share,
  index = 0,
  inlineBanks = false,
  hidden = false,
  onOpen,
  onOpenBank,
  onTagLevel,
  levelLabel,
}: {
  category: string;
  banks: QuestionBank[];
  tone: (typeof LOT_TONES)[number];
  featured?: boolean;
  share: number;
  index?: number;
  inlineBanks?: boolean;
  /** FIX — masque la carte (visibility) pendant que son panneau est ouvert. */
  hidden?: boolean;
  onOpen?: () => void;
  onOpenBank?: (bankId: string) => void;
  onTagLevel?: (lvl: string) => void;
  levelLabel: (lvl: string) => string;
}) {
  const { t } = useTranslation();
  const questions = banks.reduce((s, b) => s + (b._count?.questions ?? 0), 0);
  const firstIcon = banks[0]?.icon ?? "Landmark";
  const levels = Array.from(
    new Set(banks.map((b) => (b.educationLevel ?? "TOUS").toUpperCase()))
  ).slice(0, 3);
  const previewTitles = banks.slice(0, featured ? 4 : 3).map((b) => b.title);

  const header = (
    <div
      className={`relative overflow-hidden bg-gradient-to-br ${tone.header} ${
        featured ? "px-5 py-6" : "px-5 py-5"
      } text-white`}
    >
      {/* Balayage lumineux périodique */}
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-white/25 to-transparent"
        initial={{ x: "-160%" }}
        animate={{ x: "520%" }}
        transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 4.2, ease: "easeInOut" }}
      />
      <span
        aria-hidden="true"
        className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/15 blur-2xl"
      />
      <span
        aria-hidden="true"
        className="absolute -bottom-14 -left-10 h-28 w-28 rounded-full bg-white/10 blur-xl"
      />
      <div className="relative flex items-center gap-4">
        {/* Médaillon géant */}
        <motion.span
          className={`flex shrink-0 items-center justify-center rounded-2xl bg-white/20 shadow-inner backdrop-blur-sm ${
            featured ? "h-16 w-16" : "h-14 w-14"
          }`}
          whileHover={{ rotate: -8, scale: 1.12 }}
          transition={{ type: "spring", stiffness: 300, damping: 16 }}
          aria-hidden="true"
        >
          <BankIcon name={firstIcon} className={featured ? "h-8 w-8" : "h-7 w-7"} />
        </motion.span>
        <div className="min-w-0 flex-1">
          <h3
            className={`font-display font-extrabold leading-tight tracking-tight ${
              featured ? "text-xl sm:text-2xl" : "text-lg"
            }`}
          >
            {category}
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
        {!inlineBanks && (
          <motion.span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm"
            whileHover={{ x: 3 }}
          >
            <ChevronRight className="h-4.5 w-4.5" />
          </motion.span>
        )}
      </div>
      {/* Double barre de progression (part du contenu) */}
      <div className="relative mt-4">
        <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-white/80">
          <span>
            {share}% {t("banks.share.of")}
          </span>
          {!inlineBanks && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-white/15 px-2 py-0.5">
              {t("banks.cta.explore")}
              <ChevronRight className="h-3 w-3" />
            </span>
          )}
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
  );

  const body = (
    <>
      {/* Micro-tags de niveaux présents dans le lot */}
      {levels.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {levels.map((lvl) => (
            <span
              key={lvl}
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${levelBadgeCls(lvl)}`}
            >
              {levelLabel(lvl)}
            </span>
          ))}
        </div>
      )}
      {/* Aperçu des banques du lot */}
      <ul className="space-y-1">
        {previewTitles.map((title) => (
          <li
            key={title}
            className="flex items-center gap-2 truncate text-xs text-muted-foreground"
          >
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
      {!inlineBanks && (
        <span className="btn-shine mt-1 inline-flex items-center justify-center gap-1.5 self-start rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/25 transition-shadow duration-300 hover:shadow-lg hover:shadow-emerald-500/30">
          <Sparkles className="h-3.5 w-3.5" />
          {t("banks.cta.explore")}
        </span>
      )}
    </>
  );

  /* --- Variante en ligne (une seule catégorie) : panneau ouvert --- */
  if (inlineBanks && onOpenBank && onTagLevel) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
        className={`group/lot relative sm:col-span-2 lg:col-span-3 ${featured ? "rounded-3xl" : "rounded-3xl"}`}
        aria-label={`${t("banks.aria.lot")} — ${category}`}
      >
        <span
          aria-hidden="true"
          className={`absolute -inset-3 rounded-[2.4rem] bg-gradient-to-br ${tone.glow} opacity-20 blur-2xl`}
        />
        <div className="relative overflow-hidden rounded-3xl border bg-card shadow-xl">
          {header}
          <motion.div
            variants={STAGGER_CONTAINER}
            initial="hidden"
            animate="show"
            className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {banks.map((bank) => (
              <LotBankCard
                key={bank.id}
                bank={bank}
                onOpen={() => onOpenBank(bank.id)}
                onTagLevel={onTagLevel}
                levelLabel={levelLabel}
              />
            ))}
            {banks.length === 0 && (
              <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
                {t("banks.lot.empty")}
              </p>
            )}
          </motion.div>
        </div>
      </motion.section>
    );
  }

  /* --- Variante carte (grille de lots) --- */
  return (
    <motion.div
      initial={{ opacity: 0, y: 26, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 24, delay: index * 0.06 }}
      className={`group/lot relative ${featured ? "sm:col-span-2" : ""} ${hidden ? "invisible" : ""}`}
      aria-hidden={hidden || undefined}
    >
      {/* Lueur colorée diffuse en arrière-plan (survol) */}
      <span
        aria-hidden="true"
        className={`absolute -inset-3 rounded-[2.4rem] bg-gradient-to-br ${tone.glow} opacity-0 blur-2xl transition-opacity duration-500 group-hover/lot:opacity-40`}
      />
      {/* FIX CHEVAUCHEMENT : plus de layoutId ici (il était dupliqué avec
          le panneau ouvert) — la carte reste une simple carte animée. */}
      <motion.button
        type="button"
        onClick={onOpen}
        whileHover={{ scale: 1.025, y: -4 }}
        whileTap={{ scale: 0.985 }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        aria-label={`${t("banks.aria.lot")} — ${category}`}
        className="relative flex w-full flex-col overflow-hidden rounded-3xl border bg-card text-left shadow-sm transition-shadow duration-300 hover:shadow-xl"
      >
        {header}
        <div className="flex flex-1 flex-col gap-3 p-4">{body}</div>
      </motion.button>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Sous-carte banque (dans un lot ouvert) — épurée, micro-tags, CTA    */
/* ------------------------------------------------------------------ */

function LotBankCard({
  bank,
  onOpen,
  onTagLevel,
  levelLabel,
}: {
  bank: QuestionBank;
  onOpen: () => void;
  onTagLevel: (lvl: string) => void;
  levelLabel: (lvl: string) => string;
}) {
  const { t } = useTranslation();
  const style = colorStyle(bank.color);
  const lvl = (bank.educationLevel ?? "TOUS").toUpperCase();
  const questions = bank._count?.questions ?? 0;

  return (
    <motion.div
      variants={STAGGER_ITEM}
      className="group/card flex cursor-pointer flex-col rounded-2xl border border-border/70 bg-background/60 p-3.5 transition-colors duration-200 hover:border-blue-200 hover:bg-blue-50/40 dark:border-white/5 dark:hover:border-blue-500/30 dark:hover:bg-blue-500/5"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      aria-label={`${t("banks.aria.card")} — ${bank.title}`}
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

      {/* Micro-tags cliquables : le tag de niveau applique le filtre */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTagLevel(lvl);
          }}
          title={t("banks.level.word") + " " + levelLabel(lvl)}
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${levelBadgeCls(lvl)}`}
        >
          {levelLabel(lvl)}
        </button>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
          {questions}{" "}
          {t(questions > 1 ? "banks.unit.questions" : "banks.unit.question")}
        </span>
      </div>

      {/* Bouton de démarrage brillant au survol (balayage lumineux) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
        className="btn-shine mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 px-3 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <Sparkles className="h-3.5 w-3.5" />
        {t("banks.cta.start")}
      </button>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* States                                                              */
/* ------------------------------------------------------------------ */

function LibrarySkeleton() {
  const { t } = useTranslation();
  return (
    <div
      className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
      aria-busy="true"
      aria-label={t("common.loading")}
    >
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
  );
}

function EmptyState({
  hasQuery,
  onReset,
}: {
  hasQuery: boolean;
  onReset: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        {hasQuery ? (
          <Search className="h-8 w-8 text-muted-foreground" />
        ) : (
          <Compass className="h-8 w-8 text-muted-foreground" />
        )}
      </div>
      <h3 className="mt-5 font-display text-lg font-semibold">
        {hasQuery ? t("banks.empty.title.query") : t("banks.empty.title")}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {hasQuery ? t("banks.empty.desc.query") : t("banks.empty.desc")}
      </p>
      {hasQuery && (
        <Button variant="outline" size="sm" className="mt-5" onClick={onReset}>
          {t("banks.empty.reset")}
        </Button>
      )}
    </div>
  );
}
