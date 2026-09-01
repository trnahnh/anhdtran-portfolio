"use client";

import { useEffect } from "react";

/**
 * Doctrine rule 3: nothing loops unless it is genuinely unfinished, and every
 * loop stops when it cannot be seen.
 *
 * Per-section loops gate themselves with useInView. Fixed ambient layers can't
 * — an IntersectionObserver considers a `position: fixed` element permanently
 * in view — so their gate lives here: one class on <html>, one CSS rule, every
 * running animation on the page paused when the tab is not being looked at.
 *
 * Renders nothing.
 */
export default function MotionGate() {
  useEffect(() => {
    const root = document.documentElement;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    const syncReduced = () => root.classList.toggle("motion-off", reduced.matches);
    const syncHidden = () =>
      root.classList.toggle("motion-paused", document.hidden);

    syncReduced();
    syncHidden();

    reduced.addEventListener("change", syncReduced);
    document.addEventListener("visibilitychange", syncHidden);

    return () => {
      reduced.removeEventListener("change", syncReduced);
      document.removeEventListener("visibilitychange", syncHidden);
      root.classList.remove("motion-off", "motion-paused");
    };
  }, []);

  return null;
}
