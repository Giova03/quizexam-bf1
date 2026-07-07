"use client";

/**
 * Ultra-modern animated UI primitives (E3).
 *
 * Every component here is built so it can be dropped into existing views
 * without breaking their layout. They are all SSR-safe (the framer-motion
 * pieces are lazy / guarded) and they honour the user's reduce-motion
 * preference via the global CSS rules in globals.css.
 */

import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/* ============================================================================
 * AnimatedCard — glassmorphism + 3D tilt on hover.
 *
 * The tilt follows the cursor for an interactive premium feel. Falls back
 * to a CSS-only hover transform when the user prefers reduced motion.
 * ============================================================================ */

export interface AnimatedCardProps extends HTMLAttributes<HTMLDivElement> {
  /** Enable the cursor-tracking 3D tilt. Default: true. */
  tilt?: boolean;
  /** Use the glass background instead of the default Card background. */
  glass?: boolean;
  /** Max tilt angle in degrees. Default: 6. */
  maxTilt?: number;
  children?: ReactNode;
}

export const AnimatedCard = forwardRef<HTMLDivElement, AnimatedCardProps>(
  function AnimatedCard(
    { tilt = true, glass = true, maxTilt = 6, className, children, style, onMouseMove, onMouseLeave, ...rest },
    ref,
  ) {
    const reduceMotion = useReducedMotion();
    const innerRef = useRef<HTMLDivElement | null>(null);

    // Merge the forwarded ref and the local ref so we can read the element
    // for tilt math while still exposing it to the parent.
    const setRefs = (node: HTMLDivElement | null) => {
      innerRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
    };

    function handleMove(e: MouseEvent<HTMLDivElement>) {
      if (!tilt || reduceMotion) return;
      const el = innerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width; // 0..1
      const py = (e.clientY - rect.top) / rect.height; // 0..1
      const rx = (0.5 - py) * maxTilt * 2; // rotateX
      const ry = (px - 0.5) * maxTilt * 2; // rotateY
      el.style.transform = `perspective(1000px) rotateX(${rx.toFixed(
        2,
      )}deg) rotateY(${ry.toFixed(2)}deg) translateY(-4px)`;
      if (onMouseMove) onMouseMove(e);
    }

    function handleLeave(e: MouseEvent<HTMLDivElement>) {
      const el = innerRef.current;
      if (el) el.style.transform = "";
      if (onMouseLeave) onMouseLeave(e);
    }

    return (
      <div
        ref={setRefs}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        className={cn(
          "rounded-2xl transition-[transform,box-shadow] duration-200 will-change-transform",
          glass ? "glass" : "",
          !tilt || reduceMotion ? "" : "card-3d",
          className,
        )}
        style={style}
        {...rest}
      >
        {children}
      </div>
    );
  },
);

/* ============================================================================
 * ProgressRing — circular progress indicator with animated stroke.
 *
 * Renders a single <svg> with two concentric <circle>s. The outer circle
 * is the track, the inner circle's stroke-dashoffset animates to reveal
 * progress. A label can be rendered in the centre via the `children` prop.
 * ============================================================================ */

export interface ProgressRingProps {
  /** 0..1 progress fraction (clamped). */
  value: number;
  /** Diameter in pixels. Default: 120. */
  size?: number;
  /** Stroke width in pixels. Default: 10. */
  strokeWidth?: number;
  /** Track colour. Default: currentColor at 15% opacity. */
  trackColor?: string;
  /** Progress colour. Default: emerald-500. */
  progressColor?: string;
  /** Optional centre content (e.g. a percentage or icon). */
  children?: ReactNode;
  className?: string;
  /** Round line caps for a softer look. Default: true. */
  rounded?: boolean;
}

export function ProgressRing({
  value,
  size = 120,
  strokeWidth = 10,
  trackColor,
  progressColor = "#10b981",
  children,
  className,
  rounded = true,
}: ProgressRingProps) {
  const reduceMotion = useReducedMotion();
  const clamped = Math.max(0, Math.min(1, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Compute the target offset every render. When reduceMotion is on, the
  // state starts at the target so there's no animation. When it's off,
  // the state starts at `circumference` (empty ring) and the effect below
  // schedules a rAF to animate it to the target.
  const targetOffset = circumference * (1 - clamped);
  const [offset, setOffset] = useState(
    reduceMotion ? targetOffset : circumference,
  );

  // Animate from 0 → target on mount and whenever the value changes.
  // setState is called inside a rAF callback (async) so it does not fire
  // synchronously during the effect body (avoids cascading-render lint).
  useEffect(() => {
    if (reduceMotion) return;
    const raf = requestAnimationFrame(() => {
      setOffset(targetOffset);
    });
    return () => cancelAnimationFrame(raf);
  }, [targetOffset, reduceMotion]);

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className="progress-ring"
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor ?? "currentColor"}
          strokeOpacity={trackColor ? 1 : 0.15}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={progressColor}
          strokeWidth={strokeWidth}
          strokeLinecap={rounded ? "round" : "butt"}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      {children != null && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}

/* ============================================================================
 * Confetti — burst of falling pieces.
 *
 * Renders `count` absolutely-positioned coloured pieces at random x positions
 * with random durations / delays. The pieces are portaled to the document
 * body via position:fixed (see .confetti-piece in globals.css) so they
 * overlay the whole viewport. After `duration` ms the component clears
 * itself, so callers can just toggle a `fire` boolean.
 * ============================================================================ */

const CONFETTI_COLORS = [
  "#10b981", // emerald
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
];

export interface ConfettiProps {
  /** Trigger a new burst when this value changes / becomes true. */
  fire: boolean | number;
  /** Number of pieces. Default: 80. */
  count?: number;
  /** Total animation duration in ms. Default: 3500. */
  duration?: number;
}

export function Confetti({ fire, count = 80, duration = 3500 }: ConfettiProps) {
  const [pieces, setPieces] = useState<
    { id: number; left: number; color: string; delay: number; dur: number; rotate: number }[]
  >([]);
  // Keep a ref of the last "fire" signal we already reacted to so we don't
  // double-burst when the parent re-renders without changing the prop.
  const lastFireRef = useRef<unknown>(null);

  useEffect(() => {
    if (fire === false || fire === null || fire === undefined) return;
    if (lastFireRef.current === fire) return;
    lastFireRef.current = fire;

    // Schedule the burst on the next frame so setState doesn't fire
    // synchronously during the effect body (avoids cascading-render lint).
    const raf = requestAnimationFrame(() => {
      const next = Array.from({ length: count }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        delay: Math.random() * 600,
        dur: duration * (0.6 + Math.random() * 0.5),
        rotate: Math.random() * 360,
      }));
      setPieces(next);
    });
    const t = setTimeout(() => setPieces([]), duration + 800);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [fire, count, duration]);

  if (pieces.length === 0) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[60]">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}ms`,
            animationDuration: `${p.dur}ms`,
            transform: `rotate(${p.rotate}deg)`,
            borderRadius: p.id % 3 === 0 ? "50%" : "2px",
          }}
        />
      ))}
    </div>
  );
}

/* ============================================================================
 * ShimmerSkeleton — shimmer loading placeholder.
 *
 * A rounded box with the .shimmer overlay. Use as a drop-in replacement for
 * the basic <Skeleton> from shadcn/ui when you want the moving sheen.
 * ============================================================================ */

export interface ShimmerSkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Render multiple stacked lines (like a paragraph). */
  lines?: number;
}

export function ShimmerSkeleton({
  className,
  lines,
  style,
  ...rest
}: ShimmerSkeletonProps) {
  if (lines && lines > 1) {
    return (
      <div className="space-y-2" {...rest}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "relative overflow-hidden rounded-md bg-muted shimmer",
              i === lines - 1 ? "h-3 w-2/3" : "h-3 w-full",
            )}
          />
        ))}
      </div>
    );
  }
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted shimmer",
        className,
      )}
      style={style}
      {...rest}
    />
  );
}

/* ============================================================================
 * FloatingBadge — badge with the animate-float micro-animation.
 *
 * Renders an inline-flex pill with an icon + label that gently floats up
 * and down. Use it on hero sections to draw the eye.
 * ============================================================================ */

export interface FloatingBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  icon?: ReactNode;
  children?: ReactNode;
}

export function FloatingBadge({
  icon,
  children,
  className,
  ...rest
}: FloatingBadgeProps) {
  return (
    <span
      className={cn(
        "animate-float inline-flex items-center gap-1.5 rounded-full border border-emerald-200/60 bg-white/70 px-3 py-1 text-xs font-medium text-emerald-700 shadow-sm backdrop-blur dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300",
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </span>
  );
}

/* ============================================================================
 * GradientText — text with a smooth emerald → teal → cyan gradient.
 *
 * The gradient is applied via -webkit-background-clip: text. Falls back to
 * the current text colour in browsers that don't support background-clip.
 * ============================================================================ */

export interface GradientTextProps extends HTMLAttributes<HTMLSpanElement> {
  /** Gradient direction. Default: 135deg. */
  angle?: number;
  /** Custom gradient stops. Default: emerald → teal → cyan. */
  from?: string;
  via?: string;
  to?: string;
  children?: ReactNode;
}

export function GradientText({
  angle = 135,
  from = "#10b981",
  via = "#14b8a6",
  to = "#06b6d4",
  className,
  style,
  children,
  ...rest
}: GradientTextProps) {
  const gradient = `linear-gradient(${angle}deg, ${from} 0%, ${via} 50%, ${to} 100%)`;
  const merged: CSSProperties = {
    backgroundImage: gradient,
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    WebkitTextFillColor: "transparent",
    color: "transparent",
    ...style,
  };
  return (
    <span className={cn("font-bold", className)} style={merged} {...rest}>
      {children}
    </span>
  );
}

/* ============================================================================
 * CountUp — animate a number from 0 to `value` over `duration` ms.
 *
 * Uses requestAnimationFrame and an ease-out cubic curve. Renders the
 * formatted number as plain text so it can be embedded in any heading.
 * ============================================================================ */

export interface CountUpProps {
  value: number;
  /** Animation duration in ms. Default: 900. */
  duration?: number;
  /** Decimal places to render. Default: 0. */
  decimals?: number;
  /** Prefix (e.g. "%" rendered after the number → use suffix). */
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function CountUp({
  value,
  duration = 900,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
}: CountUpProps) {
  const reduceMotion = useReducedMotion();
  // When reduceMotion is true, start at the final value so no animation
  // effect is needed. Otherwise start at 0 and let the rAF below animate.
  const [display, setDisplay] = useState(reduceMotion ? value : 0);

  useEffect(() => {
    if (reduceMotion) return; // nothing to animate
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const to = value;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, reduceMotion]);

  const formatted = useMemo(
    () =>
      display.toLocaleString("fr-FR", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }),
    [display, decimals],
  );

  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

/* ============================================================================
 * Sparkles — a small decorative SVG that twinkles (used in hero sections).
 * ============================================================================ */

export function SparkleIcon({ className }: { className?: string }) {
  return (
    <motion.svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      initial={{ scale: 0.9, opacity: 0.6 }}
      animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.6, 1, 0.6] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
    >
      <path d="M12 2l1.6 5.2L19 9l-5.4 1.8L12 16l-1.6-5.2L5 9l5.4-1.8L12 2z" />
    </motion.svg>
  );
}
