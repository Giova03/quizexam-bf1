"use client";

import { useMemo } from "react";
import {
  Layers,
  GraduationCap,
  School,
  Building2,
  Trophy,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * EducationLevelSelector (added in E1)
 *
 * A segmented control / pill-bar that lets the user filter the banks list by
 * education level: Tous | BEPC | BAC | Licence | Concours.
 *
 * Each tab shows the count of banks available for that level. Counts include
 * "TOUS" banks (which apply to every level) so the number reflects what the
 * user will actually see when they click the tab.
 *
 * Visually it's a horizontal pill bar with a smooth "active pill" highlight
 * that slides between tabs (CSS transition on `transform`). On mobile it
 * becomes a horizontally scrollable row.
 *
 * Purely controlled: emits `onChange(level)` when the user clicks a tab. The
 * parent owns the `value` state.
 */

export type EducationLevel = "TOUS" | "BEPC" | "BAC" | "LICENCE" | "CONCOURS";

interface LevelOption {
  value: EducationLevel;
  label: string;
  /** Short description shown under the label on wider screens. */
  hint: string;
  icon: LucideIcon;
  /** Tailwind classes for the active pill (background + text). */
  activeCls: string;
  /** Tailwind classes for the icon's colour when the tab is active. */
  iconActiveCls: string;
}

const LEVEL_OPTIONS: LevelOption[] = [
  {
    value: "TOUS",
    label: "Tous",
    hint: "Tous niveaux",
    icon: Layers,
    activeCls:
      "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20",
    iconActiveCls: "text-white",
  },
  {
    value: "BEPC",
    label: "BEPC",
    hint: "Collège",
    icon: School,
    activeCls:
      "bg-gradient-to-r from-sky-500 to-cyan-600 text-white shadow-md shadow-sky-500/20",
    iconActiveCls: "text-white",
  },
  {
    value: "BAC",
    label: "BAC",
    hint: "Lycée",
    icon: BookOpen,
    activeCls:
      "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md shadow-violet-500/20",
    iconActiveCls: "text-white",
  },
  {
    value: "LICENCE",
    label: "Licence",
    hint: "Université",
    icon: Building2,
    activeCls:
      "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/20",
    iconActiveCls: "text-white",
  },
  {
    value: "CONCOURS",
    label: "Concours",
    hint: "Examens",
    icon: Trophy,
    activeCls:
      "bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md shadow-rose-500/20",
    iconActiveCls: "text-white",
  },
];

export interface EducationLevelSelectorProps {
  /** Currently selected level. */
  value: EducationLevel;
  /** Called with the new level when the user clicks a tab. */
  onChange: (level: EducationLevel) => void;
  /**
   * Counts per level. The component reads `counts[value]` for each tab.
   * Missing counts default to 0. The "TOUS" count is the total of all banks.
   */
  counts: Partial<Record<EducationLevel, number>>;
  /** Optional className for the outer container. */
  className?: string;
  /**
   * Layout variant:
   *  - "pills" (default): horizontal pill bar with sliding highlight.
   *  - "cards": bigger card-style buttons (used in narrower sidebars).
   */
  variant?: "pills" | "cards";
}

/**
 * Compute the effective count for a tab. For specific levels (BEPC, BAC, …)
 * the effective count = banks at that level + "TOUS" banks (since TOUS banks
 * are always returned by the API for any level filter).
 */
function effectiveCount(
  level: EducationLevel,
  counts: Partial<Record<EducationLevel, number>>,
): number {
  if (level === "TOUS") {
    return counts.TOUS ?? 0;
  }
  return (counts[level] ?? 0) + (counts.TOUS ?? 0);
}

export function EducationLevelSelector({
  value,
  onChange,
  counts,
  className,
  variant = "pills",
}: EducationLevelSelectorProps) {
  // Pre-compute the effective counts so we don't recompute on every render
  // of each tab button.
  const effectiveCounts = useMemo(() => {
    const map: Record<EducationLevel, number> = {
      TOUS: effectiveCount("TOUS", counts),
      BEPC: effectiveCount("BEPC", counts),
      BAC: effectiveCount("BAC", counts),
      LICENCE: effectiveCount("LICENCE", counts),
      CONCOURS: effectiveCount("CONCOURS", counts),
    };
    return map;
  }, [counts]);

  if (variant === "cards") {
    return (
      <div
        className={cn(
          "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5",
          className,
        )}
        role="tablist"
        aria-label="Niveau d'éducation"
      >
        {LEVEL_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isActive = value === opt.value;
          const count = effectiveCounts[opt.value];
          return (
            <button
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(opt.value)}
              className={cn(
                "group relative flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3 text-center transition-all hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1",
                isActive
                  ? cn(opt.activeCls, "border-transparent")
                  : "border-border bg-card text-card-foreground hover:border-emerald-300 hover:bg-muted/40",
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-colors",
                  isActive
                    ? opt.iconActiveCls
                    : "text-muted-foreground group-hover:text-emerald-600",
                )}
              />
              <span className="text-sm font-semibold leading-none">
                {opt.label}
              </span>
              <span
                className={cn(
                  "text-[10px] leading-tight",
                  isActive ? "text-white/80" : "text-muted-foreground",
                )}
              >
                {opt.hint}
              </span>
              <span
                className={cn(
                  "mt-0.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                  isActive
                    ? "bg-white/25 text-white"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  // Default "pills" variant — a horizontal scrollable pill bar.
  return (
    <div
      className={cn(
        "w-full overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      role="tablist"
      aria-label="Niveau d'éducation"
    >
      <div className="inline-flex min-w-full gap-1.5 rounded-2xl border bg-card p-1.5 shadow-sm sm:min-w-0">
        {LEVEL_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isActive = value === opt.value;
          const count = effectiveCounts[opt.value];
          return (
            <button
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(opt.value)}
              title={`${opt.label} — ${opt.hint}`}
              className={cn(
                "group relative flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1",
                isActive
                  ? cn(opt.activeCls, "scale-[1.02]")
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-transform group-hover:scale-110",
                  isActive ? opt.iconActiveCls : "",
                )}
              />
              <span className="flex flex-col items-start leading-tight">
                <span className="font-semibold">{opt.label}</span>
                <span
                  className={cn(
                    "text-[10px] leading-none",
                    isActive ? "text-white/80" : "text-muted-foreground/70",
                  )}
                >
                  {opt.hint}
                </span>
              </span>
              <span
                className={cn(
                  "ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums transition-colors",
                  isActive
                    ? "bg-white/25 text-white"
                    : "bg-muted text-muted-foreground group-hover:bg-background",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Helper: returns a human-readable label + colour classes for a given level.
 * Used by badges elsewhere in the app (home-view card, start-dialog header,
 * admin bank list, etc.).
 */
export function getEducationLevelMeta(level: string): {
  label: string;
  icon: LucideIcon;
  /** Tailwind classes for an outline badge. */
  badgeCls: string;
} {
  const match = LEVEL_OPTIONS.find((o) => o.value === level.toUpperCase());
  if (match) {
    return {
      label: match.label,
      icon: match.icon,
      badgeCls: cn(
        "border-transparent text-white",
        match.activeCls.split(" ").filter((c) => c.startsWith("bg-") || c.startsWith("text-") || c.startsWith("shadow-")).join(" "),
      ),
    };
  }
  // Fallback for "TOUS" / unknown.
  const fallback = LEVEL_OPTIONS[0];
  return {
    label: fallback.label,
    icon: GraduationCap,
    badgeCls: "border-transparent bg-muted text-muted-foreground",
  };
}

export { LEVEL_OPTIONS as EDUCATION_LEVEL_OPTIONS };
