"use client";

/**
 * Page + list transition helpers built on framer-motion (E3).
 *
 * All variants here default to a short, gentle ease. They are designed to
 * compose — pass `staggerContainer` to a parent and `staggerItem` to its
 * children to get a coordinated reveal, or use <PageTransition> as a
 * one-shot wrapper for a whole view.
 *
 * The component prop types intentionally avoid spreading arbitrary
 * HTMLAttributes onto motion.* elements: framer-motion redefines a handful
 * of DOM event handlers (onAnimationStart, onDrag*, …) with incompatible
 * types, which trips the compiler when HTMLAttributes is spread. Instead we
 * expose only the props the wrapper actually consumes (children, className).
 */

import { forwardRef, type ReactNode } from "react";
import {
  motion,
  useReducedMotion,
  type Transition,
  type Variants,
} from "framer-motion";
import { cn } from "@/lib/utils";

/* --- Shared timing tokens --- */
export const EASE_OUT: Transition["ease"] = [0.22, 1, 0.36, 1];
export const SPRING: Transition = { type: "spring", stiffness: 380, damping: 26 };

/* --- Variants --- */

/** Page-level fade + slide up (8px). */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE_OUT } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: EASE_OUT } },
};

/** Stagger container: each direct child is revealed 60ms after the previous. */
export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

/** Stagger item: fade up + subtle scale-in. */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: EASE_OUT },
  },
};

/* ============================================================================
 * PageTransition — wrap a view to animate its mount.
 *
 * Renders a <motion.div> with `pageVariants`. Use a `key` on the parent so
 * AnimatePresence can coordinate enter/exit, but for the simple mount case
 * (no exit) this works on its own.
 * ============================================================================ */

export interface PageTransitionProps {
  children?: ReactNode;
  className?: string;
  /** Disable animation (e.g. for the very first paint). */
  disabled?: boolean;
}

export const PageTransition = forwardRef<HTMLDivElement, PageTransitionProps>(
  function PageTransition({ children, disabled, className }, ref) {
    const reduce = useReducedMotion();
    if (disabled || reduce) {
      return (
        <div ref={ref} className={className}>
          {children}
        </div>
      );
    }
    return (
      <motion.div
        ref={ref}
        variants={pageVariants}
        initial="initial"
        animate="enter"
        exit="exit"
        className={className}
      >
        {children}
      </motion.div>
    );
  },
);

/* ============================================================================
 * StaggerList — reveal a list of items one by one.
 *
 * Wrap a list of <StaggerItem> children. The parent variant orchestrates
 * the stagger; each child uses `staggerItem`. Falls back to no animation
 * when the user prefers reduced motion (the children simply appear).
 * ============================================================================ */

export interface StaggerListProps {
  children?: ReactNode;
  className?: string;
  /** Override the default stagger delay (ms). */
  stagger?: number;
}

export function StaggerList({ children, className, stagger }: StaggerListProps) {
  const reduce = useReducedMotion();
  if (reduce) {
    return <div className={className}>{children}</div>;
  }
  const variants: Variants = stagger
    ? {
        hidden: {},
        show: { transition: { staggerChildren: stagger / 1000, delayChildren: 0.04 } },
      }
    : staggerContainer;
  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate="show"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export interface StaggerItemProps {
  children?: ReactNode;
  className?: string;
}

export function StaggerItem({ children, className }: StaggerItemProps) {
  const reduce = useReducedMotion();
  if (reduce) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div variants={staggerItem} className={className}>
      {children}
    </motion.div>
  );
}

/* ============================================================================
 * SpringButton — button-shaped motion wrapper with a springy press effect.
 *
 * This is a *wrapper*, not a replacement for <Button>. Use it to wrap
 * anything you want a tactile press effect on:
 *
 *   <SpringButton>
 *     <Button>...</Button>
 *   </SpringButton>
 *
 * It scales down to 0.97 on tap and snaps back on release.
 * ============================================================================ */

export interface SpringButtonProps {
  children?: ReactNode;
  className?: string;
}

export function SpringButton({ children, className }: SpringButtonProps) {
  const reduce = useReducedMotion();
  if (reduce) {
    return <div className={cn("inline-block", className)}>{children}</div>;
  }
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={SPRING}
      className={cn("inline-block", className)}
    >
      {children}
    </motion.div>
  );
}
