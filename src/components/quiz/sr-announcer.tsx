"use client";

import { useEffect, useRef, useState } from "react";
import { subscribe } from "@/lib/screen-reader";

/**
 * SrAnnouncer — invisible aria-live region for screen reader
 * announcements (Feature E6.9).
 *
 * Renders two hidden <div>s with aria-live="polite" and aria-live=
 * "assertive". When announce() is called from anywhere in the app,
 * the matching div's text content is updated — screen readers will
 * read the new content aloud.
 *
 * The text is cleared after 1.5 s so a repeated identical message
 * still triggers an announcement (some screen readers ignore duplicate
 * text).
 *
 * Mount this component ONCE at the app root (e.g. in page.tsx).
 */
export function SrAnnouncer() {
  const [polite, setPolite] = useState("");
  const [assertive, setAssertive] = useState("");
  const politeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const assertiveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsub = subscribe((message, level) => {
      if (level === "assertive") {
        // Clear first so screen readers detect the change.
        setAssertive("");
        if (assertiveTimerRef.current) clearTimeout(assertiveTimerRef.current);
        // Use a microtask to set the new value after the clear.
        setTimeout(() => setAssertive(message), 50);
        assertiveTimerRef.current = setTimeout(() => setAssertive(""), 1500);
      } else {
        setPolite("");
        if (politeTimerRef.current) clearTimeout(politeTimerRef.current);
        setTimeout(() => setPolite(message), 50);
        politeTimerRef.current = setTimeout(() => setPolite(""), 1500);
      }
    });
    return () => {
      unsub();
      if (politeTimerRef.current) clearTimeout(politeTimerRef.current);
      if (assertiveTimerRef.current) clearTimeout(assertiveTimerRef.current);
    };
  }, []);

  return (
    <>
      {/* sr-only — visually hidden but announced by screen readers. */}
      <div
        aria-live="polite"
        aria-atomic="true"
        role="status"
        className="sr-only"
      >
        {polite}
      </div>
      <div
        aria-live="assertive"
        aria-atomic="true"
        role="alert"
        className="sr-only"
      >
        {assertive}
      </div>
    </>
  );
}
