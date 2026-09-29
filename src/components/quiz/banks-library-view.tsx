"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  LayoutGrid,
  ArrowUpDown,
  LibraryBig,
  BookOpen,
  Sparkles,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BankIcon } from "@/components/quiz/bank-icon";
import {
  EducationLevelSelector,
  type EducationLevel,
} from "@/components/quiz/education-level-selector";
import { useQuizStore } from "@/shared/stores/quiz-store";
import type { QuestionBank } from "@/lib/types";

/**
 * BanksLibraryView (V3) — deep reorganisation of the question banks UI.
 *
 * Replaces the flat bank grid that used to live inside HomeView with a
 * dedicated, fully-organised library:
 *   1. Hero header with live totals (banks, questions).
 *   2. Sticky toolbar: education-level pills + instant search + sort.
 *   3. Banks grouped by category, each group rendered as its own section.
 *   4. Rich cards (icon chip, level badge, question count) with staggered
 *      reveal animations and a clear "Réviser" call-to-action.
 *
 * Data source: GET /api/banks (application-layer use case, TOUS wildcard
 * banks are included in every level filter — same semantics as HomeView).
 */

type SortMode = "popular" | "alpha" | "questions";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "popular", label: "Recommandées" },
  { value: "alpha", label: "A → Z" },
  { value: "questions", label: "Plus de questions" },
];

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
      return "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300";
    case "LICENCE":
      return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";
    case "CONCOURS":
      return "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300";
    default:
      return "bg-muted text-muted-foreground";
  }
}

const LEVEL_LABEL: Record<string, string> = {
  TOUS: "Tous niveaux",
  BEPC: "BEPC",
  BAC: "BAC",
  LICENCE: "Licence",
  CONCOURS: "Concours",
};

export function BanksLibraryView() {
  const openBank = useQuizStore((s) => s.openBank);

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

  /* ---- Group by category ---- */
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

  return (
    <div className="-mx-4 -mt-8">
      {/* ---------- Hero header (dark premium band) ---------- */}
      <div className="relative overflow-hidden bg-[#04140f] pb-10 pt-12 text-emerald-50">
        <div className="absolute inset-0 bg-grid-dark" aria-hidden="true" />
        <div
          className="aurora-blob h-64 w-64 bg-emerald-500/25"
          style={{ top: "-40%", left: "8%" }}
          aria-hidden="true"
        />
        <div
          className="aurora-blob h-56 w-56 bg-amber-400/15"
          style={{ bottom: "-50%", right: "5%", animationDelay: "-7s" }}
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-6xl px-4">
          <div className="animate-fade-up flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
            <LibraryBig className="h-4 w-4" />
            Bibliothèque
          </div>
          <h1
            className="animate-fade-up mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl"
            style={{ animationDelay: "0.08s" }}
          >
            Banques de <span className="text-gradient-mint">questions</span>
          </h1>
          <p
            className="animate-fade-up mt-3 max-w-2xl text-sm leading-relaxed text-emerald-100/70 sm:text-base"
            style={{ animationDelay: "0.16s" }}
          >
            Tout le contenu de la plateforme, organisé par niveau et par
            matière. Choisissez votre niveau, cherchez une banque et lancez
            votre révision en un clic.
          </p>

          <div
            className="animate-fade-up mt-6 flex flex-wrap items-center gap-3"
            style={{ animationDelay: "0.24s" }}
          >
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm">
              <LayoutGrid className="h-4 w-4 text-emerald-400" />
              <span className="font-semibold">{banks.length}</span>
              <span className="text-emerald-100/60">banques</span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm">
              <BookOpen className="h-4 w-4 text-amber-400" />
              <span className="font-semibold">
                {banks.reduce((s, b) => s + (b._count?.questions ?? 0), 0).toLocaleString("fr-FR")}
              </span>
              <span className="text-emerald-100/60">questions</span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm">
              <Sparkles className="h-4 w-4 text-cyan-400" />
              <span className="text-emerald-100/60">Mise à jour continue</span>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Sticky toolbar ---------- */}
      <div className="sticky top-16 z-30 border-b bg-background/90 backdrop-blur-xl">
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
                placeholder="Rechercher une banque…"
                className="h-9 pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Rechercher une banque"
              />
            </div>
            <div className="flex items-center gap-1 rounded-lg border p-1">
              {SORT_OPTIONS.map((opt) => (
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

      {/* ---------- Body ---------- */}
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Result summary */}
        {!loading && (
          <p className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowUpDown className="h-3.5 w-3.5" />
            {sorted.length} banque{sorted.length > 1 ? "s" : ""} ·{" "}
            {totalQuestions.toLocaleString("fr-FR")} question
            {totalQuestions > 1 ? "s" : ""}
            {level !== "TOUS" && ` · niveau ${LEVEL_LABEL[level] ?? level}`}
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
          <div className="space-y-12">
            {groups.map(([category, categoryBanks]) => (
              <section key={category} aria-label={category}>
                <div className="mb-5 flex items-center gap-3">
                  <h2 className="font-display text-xl font-bold tracking-tight">
                    {category}
                  </h2>
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                    {categoryBanks.length}
                  </span>
                  <div
                    className="h-px flex-1 bg-gradient-to-r from-border to-transparent"
                    aria-hidden="true"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {categoryBanks.map((bank, i) => (
                    <BankCard
                      key={bank.id}
                      bank={bank}
                      index={i}
                      onOpen={() => openBank(bank.id)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Cards & states                                                       */
/* ------------------------------------------------------------------ */

function BankCard({
  bank,
  index,
  onOpen,
}: {
  bank: QuestionBank;
  index: number;
  onOpen: () => void;
}) {
  const style = colorStyle(bank.color);
  const lvl = (bank.educationLevel ?? "TOUS").toUpperCase();
  const questions = bank._count?.questions ?? 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{
        duration: 0.45,
        delay: Math.min(index % 6, 5) * 0.06,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="card-glow group flex cursor-pointer flex-col overflow-hidden rounded-2xl border bg-card"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      aria-label={`Ouvrir la banque ${bank.title}`}
    >
      <div className={`h-1 bg-gradient-to-r ${style.bar}`} aria-hidden="true" />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${style.chip}`}
          >
            <BankIcon name={bank.icon} className="h-6 w-6" />
          </span>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${levelBadgeCls(lvl)}`}
          >
            {LEVEL_LABEL[lvl] ?? lvl}
          </span>
        </div>

        <h3 className="mt-4 font-display text-base font-semibold leading-snug line-clamp-2">
          {bank.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 flex-1 text-sm leading-relaxed text-muted-foreground">
          {bank.description}
        </p>

        <div className="mt-4 flex items-center justify-between border-t pt-4">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5" />
            {questions} question{questions > 1 ? "s" : ""}
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            Réviser
            <Sparkles className="h-3 w-3" />
          </span>
        </div>
      </div>
    </motion.article>
  );
}

function LibrarySkeleton() {
  return (
    <div className="space-y-12" aria-busy="true" aria-label="Chargement des banques">
      {[0, 1].map((section) => (
        <div key={section} className="space-y-5">
          <div className="shimmer h-6 w-44 rounded-md bg-muted" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border bg-card p-5"
              >
                <div className="shimmer h-12 w-12 rounded-xl bg-muted" />
                <div className="shimmer mt-4 h-5 w-3/4 rounded bg-muted" />
                <div className="shimmer mt-2 h-4 w-full rounded bg-muted" />
                <div className="shimmer mt-1 h-4 w-2/3 rounded bg-muted" />
                <div className="shimmer mt-5 h-8 w-full rounded-lg bg-muted" />
              </div>
            ))}
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
        {hasQuery ? "Aucune banque trouvée" : "Aucune banque disponible"}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {hasQuery
          ? "Essayez un autre mot-clé ou un autre niveau — de nouvelles banques sont ajoutées régulièrement."
          : "Le contenu arrive bientôt. Revenez un peu plus tard."}
      </p>
      {hasQuery && (
        <Button variant="outline" size="sm" className="mt-5" onClick={onReset}>
          Réinitialiser les filtres
        </Button>
      )}
    </div>
  );
}
