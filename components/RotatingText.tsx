"use client";

import { useEffect, useState } from "react";
import { useInView } from "@/hooks/useInView";

interface RotatingTextProps {
  texts: string[];
  interval?: number;
}

/**
 * The tagline, one line at a time.
 *
 * The old version slid a line out and snapped the next one into place, and
 * the paragraph re-flowed to each line's width. Now the outgoing and the
 * incoming line cross on screen — one drifting up as it fades, the other
 * arriving from below on the doctrine's arrival curve — inside a box that
 * is already as wide as the widest line, so nothing around it moves.
 *
 * Doctrine rule 3: this loop is never finished, so it is allowed to run —
 * but it stops the moment it scrolls out of the viewport.
 */
export default function RotatingText({
  texts,
  interval = 4000,
}: RotatingTextProps) {
  const [containerRef, inView] = useInView<HTMLSpanElement>({ threshold: 0 });
  const [current, setCurrent] = useState(0);
  const [leaving, setLeaving] = useState<number | null>(null);

  useEffect(() => {
    if (!inView) return;
    let settle: ReturnType<typeof setTimeout>;
    const timer = setInterval(() => {
      setCurrent((prev) => {
        setLeaving(prev);
        return (prev + 1) % texts.length;
      });
      settle = setTimeout(() => setLeaving(null), 700);
    }, interval);
    return () => {
      clearInterval(timer);
      clearTimeout(settle);
    };
  }, [texts.length, interval, inView]);

  return (
    <span ref={containerRef} className="tagline">
      {/* Every line, invisible, so the box is as wide as the widest. */}
      {texts.map((t) => (
        <span key={t} className="tagline-ghost" aria-hidden="true">
          {t}
        </span>
      ))}
      {leaving !== null && (
        <span key={`out-${leaving}`} className="tagline-line tagline-out" aria-hidden="true">
          {texts[leaving]}
        </span>
      )}
      <span key={`in-${current}`} className={`tagline-line ${leaving !== null ? "tagline-in" : ""}`}>
        {texts[current]}
      </span>
    </span>
  );
}
