"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  X,
  ChevronRight,
  ChevronLeft,
  GraduationCap,
  BookOpen,
  Search,
  LayoutDashboard,
  Trophy,
  MessagesSquare,
  Swords,
  Sparkles,
} from "lucide-react";
import { useQuizStore } from "@/lib/quiz-store";

const STORAGE_KEY = "onboarding-completed";

interface TourStep {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  /** CSS selector for the element to highlight. When null, the tooltip is centered. */
  selector: string | null;
}

const STEPS: TourStep[] = [
  {
    title: "Bienvenue ! 🎓",
    description:
      "QuizExam BF est votre plateforme de préparation aux concours du Burkina Faso. Suivez ce petit tour pour découvrir les fonctionnalités essentielles.",
    icon: GraduationCap,
    selector: "[data-tour='home']",
  },
  {
    title: "Banques de questions",
    description:
      "Parcourez les banques de QCM classées par matière. Cliquez sur une banque pour la prévisualiser et lancer un quiz.",
    icon: BookOpen,
    selector: "[data-tour='banks-section']",
  },
  {
    title: "Recherche rapide",
    description:
      "Appuyez sur Ctrl+K (ou Cmd+K) à tout moment pour ouvrir la recherche globale : questions, banques, sujets du forum et utilisateurs.",
    icon: Search,
    selector: "[data-tour='search-btn']",
  },
  {
    title: "Tableau de bord",
    description:
      "Suivez votre progression : scores, temps de réponse, série de jours consécutifs et statistiques détaillées par matière.",
    icon: LayoutDashboard,
    selector: "[data-tour='dashboard-nav']",
  },
  {
    title: "Défi quotidien",
    description:
      "Relevez le défi du jour pour gagner 2× plus d'XP et maintenir votre série de révision. Un nouveau défi chaque jour !",
    icon: Trophy,
    selector: "[data-tour='daily-challenge']",
  },
  {
    title: "Forum",
    description:
      "Échangez avec la communauté dans le forum par matière. Posez vos questions et aidez les autres candidats.",
    icon: MessagesSquare,
    selector: "[data-tour='more-nav']",
  },
  {
    title: "Compétition",
    description:
      "Affrontez d'autres candidats en temps réel ! Créez ou rejoignez une salle de compétition et grimpez au classement.",
    icon: Swords,
    selector: "[data-tour='more-nav']",
  },
  {
    title: "C'est parti ! 🚀",
    description:
      "Vous êtes prêt ! Vous pouvez relancer ce tour à tout moment via le bouton d'aide (?) en bas à gauche. Bonne révision !",
    icon: Sparkles,
    selector: null,
  },
];

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TooltipPosition {
  top: number;
  left: number;
  placement: "above" | "below" | "center";
}

const PADDING = 8;
const TOOLTIP_WIDTH = 340;
const TOOLTIP_ESTIMATED_HEIGHT = 240;
const VIEWPORT_MARGIN = 16;

function computeTooltipPosition(rect: Rect | null): TooltipPosition {
  if (!rect) {
    return {
      top: Math.max(VIEWPORT_MARGIN, (window.innerHeight - TOOLTIP_ESTIMATED_HEIGHT) / 2),
      left: Math.max(VIEWPORT_MARGIN, (window.innerWidth - TOOLTIP_WIDTH) / 2),
      placement: "center",
    };
  }
  const spaceBelow = window.innerHeight - (rect.top + rect.height);
  const placement: "above" | "below" =
    spaceBelow > TOOLTIP_ESTIMATED_HEIGHT + VIEWPORT_MARGIN || rect.top < TOOLTIP_ESTIMATED_HEIGHT + VIEWPORT_MARGIN
      ? "below"
      : "above";

  let top: number;
  if (placement === "below") {
    top = rect.top + rect.height + PADDING * 2;
  } else {
    top = rect.top - TOOLTIP_ESTIMATED_HEIGHT - PADDING * 2;
  }
  // Clamp within viewport.
  top = Math.max(VIEWPORT_MARGIN, Math.min(top, window.innerHeight - TOOLTIP_ESTIMATED_HEIGHT - VIEWPORT_MARGIN));

  // Try to center the tooltip horizontally on the target, clamped to viewport.
  const desiredLeft = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
  const left = Math.max(
    VIEWPORT_MARGIN,
    Math.min(desiredLeft, window.innerWidth - TOOLTIP_WIDTH - VIEWPORT_MARGIN)
  );

  return { top, left, placement };
}

/**
 * Interactive onboarding tour shown on first login.
 *
 * Shows a spotlight overlay with a cutout on the target element, plus a tooltip
 * with the step description, "Suivant" / "Précédent" buttons and a "Passer"
 * button. Completion is stored in localStorage so the tour never annoys users
 * on subsequent visits.
 */
export function OnboardingTour() {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPosition>({
    top: 0,
    left: 0,
    placement: "center",
  });
  const goHome = useQuizStore((s) => s.goHome);
  const containerRef = useRef<HTMLDivElement>(null);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  // Compute target rect whenever the step changes or window scrolls/resizes.
  // All setState calls happen inside requestAnimationFrame (async) so the
  // lint rule about synchronous setState in effects is satisfied.
  const recompute = useCallback(() => {
    requestAnimationFrame(() => {
      if (!current.selector) {
        setRect(null);
        setTooltipPos(computeTooltipPosition(null));
        return;
      }
      const el = document.querySelector(current.selector);
      if (!el) {
        setRect(null);
        setTooltipPos(computeTooltipPosition(null));
        return;
      }
      // Make sure the target is visible before measuring.
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      const r = el.getBoundingClientRect();
      const newRect: Rect = {
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
      };
      setRect(newRect);
      setTooltipPos(computeTooltipPosition(newRect));
    });
  }, [current.selector]);

  // When the tour first mounts, navigate home so the home-view elements exist.
  useEffect(() => {
    goHome();
  }, [goHome]);

  // Recompute on step change.
  useEffect(() => {
    recompute();
  }, [recompute, step]);

  // Recompute on scroll/resize.
  useEffect(() => {
    let raf = 0;
    const handler = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(recompute);
    };
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    };
  }, [recompute]);

  // Tour control functions — declared before the keyboard effect that uses
  // them so the lint rule about "accessing before declaration" is satisfied.
  function complete() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore (private mode etc.)
    }
    // Tell parent to unmount us via custom event.
    window.dispatchEvent(new CustomEvent("onboarding-complete"));
  }

  function next() {
    if (isLast) {
      complete();
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function prev() {
    setStep((s) => Math.max(s - 1, 0));
  }

  // ESC to skip / arrow keys to navigate.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        complete();
      } else if (e.key === "ArrowRight") {
        next();
      } else if (e.key === "ArrowLeft") {
        prev();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [step, isLast]);

  const Icon = current.icon;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[60]"
      role="dialog"
      aria-modal="true"
      aria-label={`Tour guidé — étape ${step + 1} sur ${STEPS.length}: ${current.title}`}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />

      {/* Spotlight cutout (box-shadow trick) */}
      {rect && (
        <div
          className="absolute rounded-xl border-2 border-emerald-400 transition-all duration-200"
          style={{
            top: rect.top - PADDING,
            left: rect.left - PADDING,
            width: rect.width + PADDING * 2,
            height: rect.height + PADDING * 2,
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.5)",
            pointerEvents: "none",
          }}
          aria-hidden="true"
        />
      )}

      {/* Tooltip */}
      <div
        className="absolute z-10"
        style={{
          top: tooltipPos.top,
          left: tooltipPos.left,
          width: TOOLTIP_WIDTH,
          maxWidth: "calc(100vw - 32px)",
        }}
      >
        <div className="overflow-hidden rounded-xl border border-emerald-200 bg-card shadow-2xl">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 text-white">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/80">
                  Étape {step + 1} / {STEPS.length}
                </p>
                <h3 className="text-base font-bold leading-tight">
                  {current.title}
                </h3>
              </div>
            </div>
            <button
              onClick={complete}
              className="rounded-md p-1 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
              aria-label="Passer le tour"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="space-y-4 px-4 py-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {current.description}
            </p>

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-1.5">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === step
                      ? "w-6 bg-emerald-500"
                      : "w-1.5 bg-muted-foreground/40 hover:bg-muted-foreground/70"
                  }`}
                  aria-label={`Aller à l'étape ${i + 1}`}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={complete}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Passer
              </Button>
              <div className="flex items-center gap-1.5">
                {step > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={prev}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Précédent
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={next}
                  className="gap-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-90"
                >
                  {isLast ? "Terminer" : "Suivant"}
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Arrow indicator pointing to the spotlight */}
        {tooltipPos.placement === "below" && rect && (
          <div
            className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-l border-t border-emerald-200 bg-card"
            style={{
              left: Math.max(
                16,
                Math.min(
                  rect.left + rect.width / 2 - tooltipPos.left,
                  TOOLTIP_WIDTH - 16
                )
              ),
            }}
            aria-hidden="true"
          />
        )}
        {tooltipPos.placement === "above" && rect && (
          <div
            className="absolute -bottom-2 h-4 w-4 rotate-45 border-b border-r border-emerald-200 bg-card"
            style={{
              left: Math.max(
                16,
                Math.min(
                  rect.left + rect.width / 2 - tooltipPos.left,
                  TOOLTIP_WIDTH - 16
                )
              ),
            }}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}

/**
 * Container component that decides whether to show the tour.
 * Shows on first login (when localStorage doesn't have STORAGE_KEY set).
 */
export function OnboardingTourContainer({
  isAuthenticated,
}: {
  isAuthenticated: boolean;
}) {
  const [shouldShow, setShouldShow] = useState(false);

  // Only schedule the tour when authenticated AND not yet completed.
  // Uses setTimeout (async) so we never call setState synchronously inside
  // the effect body — and so the home view has time to mount target elements.
  useEffect(() => {
    if (!isAuthenticated) return;
    let shouldStart = false;
    try {
      shouldStart = !localStorage.getItem(STORAGE_KEY);
    } catch {
      // localStorage unavailable (private mode etc.) — skip tour.
      shouldStart = false;
    }
    if (!shouldStart) return;
    const timer = setTimeout(() => setShouldShow(true), 800);
    return () => clearTimeout(timer);
  }, [isAuthenticated]);

  // Listen for "onboarding-complete" custom event to unmount.
  useEffect(() => {
    if (!shouldShow) return;
    const handler = () => setShouldShow(false);
    window.addEventListener("onboarding-complete", handler);
    return () => window.removeEventListener("onboarding-complete", handler);
  }, [shouldShow]);

  if (!shouldShow) return null;
  return <OnboardingTour />;
}

/**
 * Allow external code (e.g. the help button) to re-trigger the tour.
 */
export function restartOnboarding() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  window.location.reload();
}
