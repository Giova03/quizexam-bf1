"use client";

import { useEffect, useMemo, useState } from "react";
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
 * BanksLibraryView (V6) — refonte UI/UX de la bibliothèque de banques.
 *
 * La logique de données est STRICTEMENT identique à la V3/V4 (même fetch,
 * mêmes filtres niveau/recherche/tri, même openBank du quiz-store) — seule
 * la disposition visuelle change :
 *
 *   1. REGROUPEMENT EN LOTS : les banques ne s'affichent plus à plat. Elles
 *      sont regroupées dynamiquement par catégorie dans des « lots » : une
 *      carte principale par catégorie avec icône moderne, titre, total de
 *      questions et une petite barre de progression (part du contenu).
 *   2. EFFET D'OUVERTURE (concept 2) : au clic, le lot s'agrandit de manière
 *      théâtrale au premier plan via une animation de layout partagé
 *      (framer-motion layoutId), et les banques du lot apparaissent en
 *      cascade rapide (staggered animation).
 *   3. STYLE INTERACTIF « BOOSTER » : zoom léger + lueur colorée diffuse au
 *      survol des lots, sous-cartes très épurées avec micro-tags cliquables
 *      (le tag de niveau applique le filtre de niveau) et bouton de
 *      démarrage brillant (balayage lumineux) au survol.
 */

type SortMode = "popular" | "alpha" | "questions";

/** Local colour styles per QuestionBank.color name (safe fallback = emerald). */
const COLOR_STYLES: Record<string, { chip: string; bar: string }> = {
  emerald: {
    chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    bar: "from-emerald-400 to-teal-500",
  },
  teal: {
    chip: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
    bar: "from-teal-400 to-cyan-500",
  },
  cyan: {
    chip: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300",
    bar: "from-cyan-400 to-sky-500",
  },
  sky: {
    chip: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
    bar: "from-sky-400 to-blue-500",
  },
  amber: {
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    bar: "from-amber-400 to-orange-500",
  },
  orange: {
    chip: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
    bar: "from-orange-400 to-red-500",
  },
  rose: {
    chip: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
    bar: "from-rose-400 to-pink-500",
  },
  violet: {
    chip: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
    bar: "from-violet-400 to-purple-500",
  },
  lime: {
    chip: "bg-lime-100 text-lime-700 dark:bg-lime-500/15 dark:text-lime-300",
    bar: "from-lime-400 to-green-500",
  },
};

function colorStyle(color: string) {
  return COLOR_STYLES[color] ?? COLOR_STYLES.emerald;
}

function levelBadgeCls(level: string) {
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
 * Tonalités couleur des lots — stable par catégorie (hash simple) pour que
 * chaque catégorie garde la même identité visuelle d'une visite à l'autre,
 * quel que soit le tri ou la recherche.
 */
const LOT_TONES: Array<{
  chip: string;
  bar: string;
  glow: string;
  header: string;
}> = [
  {
    chip: "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
    bar: "from-blue-500 to-cyan-400",
    glow: "from-blue-500 to-cyan-400",
    header: "from-blue-600 via-blue-500 to-cyan-500",
  },
  {
    chip: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
    bar: "from-emerald-500 to-teal-400",
    glow: "from-emerald-500 to-teal-400",
    header: "from-emerald-600 via-emerald-500 to-teal-500",
  },
  {
    chip: "bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300",
    bar: "from-orange-500 to-amber-400",
    glow: "from-orange-500 to-amber-400",
    header: "from-orange-600 via-orange-500 to-amber-500",
  },
  {
    chip: "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
    bar: "from-violet-500 to-purple-400",
    glow: "from-violet-500 to-purple-400",
    header: "from-violet-600 via-violet-500 to-purple-500",
  },
  {
    chip: "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300",
    bar: "from-rose-500 to-pink-400",
    glow: "from-rose-500 to-pink-400",
    header: "from-rose-600 via-rose-500 to-pink-500",
  },
  {
    chip: "bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300",
    bar: "from-sky-500 to-blue-400",
    glow: "from-sky-500 to-blue-400",
    header: "from-sky-600 via-sky-500 to-blue-500",
  },
  {
    chip: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
    bar: "from-amber-500 to-orange-400",
    glow: "from-amber-500 to-orange-400",
    header: "from-amber-500 via-amber-400 to-orange-500",
  },
  {
    chip: "bg-cyan-100 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-300",
    bar: "from-cyan-500 to-teal-400",
    glow: "from-cyan-500 to-teal-400",
    header: "from-cyan-600 via-cyan-500 to-teal-500",
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
  /* V6 — lot actuellement ouvert (catégorie) ; null = grille de lots. */
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
      {/* ---------- Hero header (V4 — light aurora band) ---------- */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-emerald-50 pb-10 pt-12 text-slate-800">
        <div
          className="absolute inset-0 bg-grid-light [mask-image:radial-gradient(ellipse_70%_70%_at_50%_30%,black,transparent)]"
          aria-hidden="true"
        />
        <div
          className="aurora-blob h-64 w-64 bg-blue-400/25"
          style={{ top: "-40%", left: "8%" }}
          aria-hidden="true"
        />
        <div
          className="aurora-blob h-56 w-56 bg-orange-300/25"
          style={{ bottom: "-50%", right: "5%", animationDelay: "-7s" }}
          aria-hidden="true"
        />
        <div
          className="aurora-blob h-48 w-48 bg-emerald-300/25"
          style={{ top: "10%", right: "30%", animationDelay: "-11s" }}
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
            className="animate-fade-up mt-3 max-w-2xl text-sm leading-relaxed text-slate-500 sm:text-base"
            style={{ animationDelay: "0.16s" }}
          >
            {t("banks.subtitle")}
          </p>

          <div
            className="animate-fade-up mt-6 flex flex-wrap items-center gap-3"
            style={{ animationDelay: "0.24s" }}
          >
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-1.5 text-sm shadow-sm backdrop-blur-sm">
              <LayoutGrid className="h-4 w-4 text-blue-600" />
              <span className="font-semibold text-slate-900">{banks.length}</span>
              <span className="text-slate-500">{t("banks.stat.banks")}</span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-1.5 text-sm shadow-sm backdrop-blur-sm">
              <BookOpen className="h-4 w-4 text-orange-500" />
              <span className="font-semibold text-slate-900">
                {banks.reduce((s, b) => s + (b._count?.questions ?? 0), 0).toLocaleString("fr-FR")}
              </span>
              <span className="text-slate-500">{t("banks.stat.questions")}</span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-1.5 text-sm shadow-sm backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-emerald-500" />
              <span className="text-slate-500">{t("banks.stat.updated")}</span>
            </div>
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

      {/* ---------- Body : grille de LOTS ---------- */}
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Result summary */}
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
            levelLabel={levelLabel}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map(([category, categoryBanks], i) => (
              <LotCard
                key={category}
                category={category}
                banks={categoryBanks}
                tone={toneFor(category)}
                featured={i === 0 && groups.length > 2}
                share={
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
                    : 0
                }
                onOpen={() => setActiveLot(category)}
                levelLabel={levelLabel}
              />
            ))}
          </div>
        )}
      </div>

      {/* ---------- Lot ouvert (effet d'expansion layoutId) ---------- */}
      <AnimatePresence>
        {activeLotData && activeTone && (
          <>
            {/* Voile de fond */}
            <motion.div
              key="lot-backdrop"
              className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setActiveLot(null)}
              aria-hidden="true"
            />
            {/* Panneau qui s'agrandit depuis la carte cliquée (layoutId partagé) */}
            <motion.div
              key={`lot-panel-${activeLotData.category}`}
              layoutId={`lot-${activeLotData.category}`}
              role="dialog"
              aria-modal="true"
              aria-label={activeLotData.category}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              className="fixed inset-0 z-50 m-auto flex h-fit max-h-[85vh] w-[calc(100%-1.5rem)] max-w-2xl flex-col overflow-hidden rounded-3xl border bg-card shadow-2xl"
            >
              {/* En-tête dégradé du lot ouvert */}
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
                        {activeLotData.banks
                          .reduce((s, b) => s + (b._count?.questions ?? 0), 0)
                          .toLocaleString("fr-FR")}{" "}
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
/* Lot principal (carte collapsed) — zoom + lueur au survol            */
/* ------------------------------------------------------------------ */

function LotCard({
  category,
  banks,
  tone,
  featured,
  share,
  onOpen,
  levelLabel,
}: {
  category: string;
  banks: QuestionBank[];
  tone: (typeof LOT_TONES)[number];
  featured: boolean;
  share: number;
  onOpen: () => void;
  levelLabel: (lvl: string) => string;
}) {
  const { t } = useTranslation();
  const questions = banks.reduce((s, b) => s + (b._count?.questions ?? 0), 0);
  const firstIcon = banks[0]?.icon ?? "Landmark";
  const levels = Array.from(
    new Set(banks.map((b) => (b.educationLevel ?? "TOUS").toUpperCase()))
  ).slice(0, 3);

  return (
    <div className="group relative">
      {/* Lueur colorée diffuse en arrière-plan (survol) */}
      <span
        aria-hidden="true"
        className={`absolute -inset-3 rounded-[2.2rem] bg-gradient-to-br ${tone.glow} opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-30`}
      />
      <motion.button
        layoutId={`lot-${category}`}
        type="button"
        onClick={onOpen}
        whileHover={{ scale: 1.02, y: -3 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        aria-label={`${t("banks.aria.lot")} — ${category}`}
        className={`relative flex flex-col overflow-hidden rounded-3xl border bg-card p-5 text-left shadow-sm transition-colors duration-300 hover:border-transparent ${
          featured ? "sm:col-span-2" : ""
        }`}
      >
        {/* Halo décoratif interne */}
        <span
          aria-hidden="true"
          className={`absolute -right-8 -top-10 h-28 w-28 rounded-full bg-gradient-to-br ${tone.glow} opacity-[0.07] blur-xl transition-opacity duration-500 group-hover:opacity-20`}
        />

        <div
          className={`relative flex gap-4 ${
            featured ? "flex-row items-center" : "flex-col"
          }`}
        >
          <div className={featured ? "flex flex-1 items-start gap-4" : "contents"}>
            <span
              className={`flex shrink-0 items-center justify-center rounded-2xl ${tone.chip} ${
                featured ? "h-14 w-14" : "h-12 w-12"
              }`}
            >
              <BankIcon name={firstIcon} className={featured ? "h-7 w-7" : "h-6 w-6"} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <h3
                  className={`font-display font-bold leading-snug tracking-tight ${
                    featured ? "text-xl" : "text-lg"
                  }`}
                >
                  {category}
                </h3>
                <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
                  {banks.length} {t("banks.stat.banks")}
                </span>
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <BookOpen className="h-3.5 w-3.5" />
                {questions.toLocaleString("fr-FR")} {t("banks.stat.questions")}
              </p>
              {/* Micro-tags de niveaux présents dans le lot */}
              {!featured && levels.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
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
            </div>
          </div>
          {featured && (
            <span
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-background/60 transition-transform duration-300 group-hover:translate-x-1"
            >
              <ChevronRight className="h-4 w-4" />
            </span>
          )}
        </div>

        {/* Petite barre de progression (part du contenu) */}
        <div className="relative mt-4">
          <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <span>
              {share}% {t("banks.share.of")}
            </span>
            <span className="inline-flex items-center gap-0.5 transition-colors group-hover:text-foreground">
              {t("banks.cta.explore")}
              <ChevronRight className="h-3 w-3" />
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className={`h-full rounded-full bg-gradient-to-r ${tone.bar}`}
              initial={{ width: 0 }}
              animate={{ width: `${share}%` }}
              transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>
      </motion.button>
    </div>
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
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${style.chip}`}
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
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Chargement des banques">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className={`rounded-3xl border bg-card p-5 ${i === 0 ? "sm:col-span-2" : ""}`}
        >
          <div className="shimmer h-12 w-12 rounded-2xl bg-muted" />
          <div className="shimmer mt-4 h-6 w-3/4 rounded bg-muted" />
          <div className="shimmer mt-2 h-4 w-1/2 rounded bg-muted" />
          <div className="shimmer mt-5 h-1.5 w-full rounded-full bg-muted" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  hasQuery,
  onReset,
  levelLabel,
}: {
  hasQuery: boolean;
  onReset: () => void;
  levelLabel: (lvl: string) => string;
}) {
  const { t } = useTranslation();
  void levelLabel;
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
