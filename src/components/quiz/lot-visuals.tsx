"use client";

/**
 * lot-visuals.tsx — briques visuelles partagées du design « tour de
 * contrôle / bibliothèque en lots » (V7-V10).
 *
 * Utilisées par BanksLibraryView ET par la page d'accueil (section
 * « Banques par sujet ») pour garantir une identité visuelle unique :
 *  - LOT_TONES / toneFor : identité chromatique par catégorie (hash stable)
 *  - RadarDish : mini-radar décoratif (anneaux + faisceau rotatif + blips)
 *  - HudChip : étiquette coin façon salle de contrôle
 *  - AnimatedNumber : compteur animé (easeOutCubic)
 *  - STAGGER_CONTAINER / STAGGER_ITEM : cascades framer-motion
 *  - colorStyle / levelBadgeCls : chips colorées banques & niveaux
 */

import { useEffect, useRef, useState } from "react";
import { motion, type Variants } from "framer-motion";

/* ------------------------------------------------------------------ */
/* Tonalités des lots                                                  */
/* ------------------------------------------------------------------ */

export interface LotTone {
  header: string;
  glow: string;
  bar: string;
  chip: string;
}

export const LOT_TONES: LotTone[] = [
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

/** Tonalité stable pour une clé (hash 31 — identique à la bibliothèque). */
export function toneFor(key: string): LotTone {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return LOT_TONES[h % LOT_TONES.length];
}

/** Style coloré d'une banque (champ QuestionBank.color). */
export function colorStyle(color?: string): { chip: string } {
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

export function levelBadgeCls(level: string): string {
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

/* ------------------------------------------------------------------ */
/* Cascades framer-motion                                              */
/* ------------------------------------------------------------------ */

export const STAGGER_CONTAINER: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.16 } },
};

export const STAGGER_ITEM: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
  },
};

/* ------------------------------------------------------------------ */
/* Mini-radar décoratif (« tour de contrôle »)                         */
/* ------------------------------------------------------------------ */

export function RadarDish({ className = "" }: { className?: string }) {
  const blips = [
    { x: "30%", y: "34%", delay: 0 },
    { x: "64%", y: "26%", delay: 0.9 },
    { x: "56%", y: "66%", delay: 1.7 },
  ];
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none relative block aspect-square overflow-hidden rounded-full border border-white/25 ${className}`}
    >
      <span className="absolute inset-[18%] rounded-full border border-white/15" />
      <span className="absolute inset-[36%] rounded-full border border-white/10" />
      <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/10" />
      <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-white/10" />
      {/* Faisceau rotatif */}
      <motion.span
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0deg, transparent 290deg, rgba(255,255,255,0.38) 350deg, transparent 360deg)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "linear" }}
      />
      {/* Blips ping */}
      {blips.map((b, i) => (
        <motion.span
          key={i}
          className="absolute h-1.5 w-1.5 rounded-full bg-white"
          style={{ left: b.x, top: b.y }}
          animate={{ opacity: [0, 1, 0], scale: [0.6, 1.15, 0.6] }}
          transition={{
            duration: 1.4,
            repeat: Infinity,
            delay: b.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* HUD                                                                 */
/* ------------------------------------------------------------------ */

/** Placage HUD : étiquette coin façon salle de contrôle. */
export function HudChip({
  children,
  tone = "white",
}: {
  children: React.ReactNode;
  tone?: "white" | "slate";
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.22em] ${
        tone === "white"
          ? "border border-white/25 bg-white/10 text-white/85"
          : "border border-slate-200 bg-slate-950/5 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400"
      }`}
    >
      {children}
    </span>
  );
}

/** Compteur animé (count-up) pour les grands chiffres des lots. */
export function AnimatedNumber({
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
