"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Timer } from "lucide-react";
import { toast } from "sonner";

interface ExamTimerProps {
  /** ISO string of when the session started. */
  startedAt: string;
  /** Duration of the exam in minutes. */
  durationMin: number;
  /** Called once when the timer reaches 0. */
  onExpire: () => void;
}

/**
 * Countdown timer for "Mode Examen chronométré".
 *
 * - Displays MM:SS in the header (red when < 5 minutes left).
 * - Triggers toast warnings at 10 min, 5 min and 1 min remaining.
 * - Calls `onExpire` exactly once when the time runs out.
 *
 * The countdown is computed from `startedAt` (server timestamp) plus
 * `durationMin`, so it stays correct across re-renders, HMR and tab
 * re-activations.
 */
export function ExamTimer({ startedAt, durationMin, onExpire }: ExamTimerProps) {
  const endTimeMs = useMemo(
    () => new Date(startedAt).getTime() + durationMin * 60_000,
    [startedAt, durationMin]
  );

  const [remainingMs, setRemainingMs] = useState(() =>
    Math.max(0, endTimeMs - Date.now())
  );

  // Track which thresholds we've already toasted so we don't spam.
  const warnedRef = useRef<Set<number>>(new Set());
  const expiredRef = useRef(false);

  useEffect(() => {
    function tick() {
      const r = Math.max(0, endTimeMs - Date.now());
      setRemainingMs(r);

      // Warning thresholds (in minutes)
      const minutesLeft = r / 60_000;
      const thresholds: Array<{ min: number; msg: string }> = [
        { min: 10, msg: "Plus que 10 minutes !" },
        { min: 5, msg: "Plus que 5 minutes !" },
        { min: 1, msg: "Dernière minute !" },
      ];
      for (const t of thresholds) {
        if (minutesLeft <= t.min && minutesLeft > 0 && !warnedRef.current.has(t.min)) {
          warnedRef.current.add(t.min);
          if (t.min <= 5) {
            toast.warning(t.msg);
          } else {
            toast.info(t.msg);
          }
        }
      }

      if (r <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpire();
      }
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endTimeMs, onExpire]);

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const formatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  const isCritical = minutes < 5;

  return (
    <Badge
      variant="outline"
      className={
        isCritical
          ? "animate-pulse border-rose-300 bg-rose-50 font-mono text-rose-700 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
          : "border-violet-200 bg-violet-50 font-mono text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300"
      }
      aria-label={`Temps restant : ${formatted}`}
    >
      <Timer className="mr-1 h-3 w-3" />
      {formatted}
    </Badge>
  );
}
