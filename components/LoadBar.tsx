"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Loading the bar.
 *
 * The left edge is a sleeve, and reading the page loads plates onto it. Each
 * section is a plate in its real IPF competition colour, sized to that
 * section's actual share of the document — so the bar reports two things at
 * once: how far down you are, and how the page is proportioned.
 *
 * Sections opt in with `data-load="Label"`. Anything unmarked is not a plate,
 * which is why the footer has none.
 *
 * Each plate is a real button that jumps to its section, so this is navigation
 * as well as telemetry: keyboard reaches it, screen readers get a labelled
 * list of destinations, and the hover label is a convenience rather than the
 * only way to know what a plate is.
 *
 * Doctrine rule 4: one rAF writing style and textContent through refs. React
 * re-renders only when the set of sections changes.
 */

interface Segment {
  label: string;
  /** Fractions of total document height. */
  top: number;
  height: number;
  /** Absolute document offset, for scrolling to it. */
  offset: number;
}

// 25kg red, 20kg blue, 15kg yellow, 10kg green — the loading order.
const PLATES = [
  "var(--plate-25)",
  "var(--plate-20)",
  "var(--plate-15)",
  "var(--plate-10)",
];

export default function LoadBar() {
  const pathname = usePathname();
  const [segments, setSegments] = useState<Segment[]>([]);

  const fillRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);

  const measure = useCallback(() => {
    const total = document.documentElement.scrollHeight || 1;
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>("[data-load]"),
    );
    setSegments(
      nodes.map((el) => {
        const box = el.getBoundingClientRect();
        const offset = box.top + window.scrollY;
        return {
          label: el.dataset.load ?? "",
          top: offset / total,
          height: box.height / total,
          offset,
        };
      }),
    );
  }, []);

  useEffect(() => {
    // Measured after paint rather than during the effect: layout is not final
    // while the effect runs, and reading it there would also set state
    // synchronously on mount. Measured again once fonts have landed and
    // images decoded, since both move every section below them.
    const first = requestAnimationFrame(measure);
    const settle = setTimeout(measure, 400);
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    return () => {
      cancelAnimationFrame(first);
      clearTimeout(settle);
      observer.disconnect();
    };
  }, [measure, pathname]);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const doc = document.documentElement;
      const total = doc.scrollHeight || 1;
      // Document space, not scroll space, so the fill and the plates share one
      // coordinate system and the head lands exactly on a plate boundary when
      // you actually reach it.
      const seen = Math.min(1, (doc.scrollTop + doc.clientHeight) / total);

      if (fillRef.current) fillRef.current.style.height = `${seen * 100}%`;
      if (headRef.current) headRef.current.style.top = `${seen * 100}%`;
      if (pctRef.current)
        pctRef.current.textContent = `${Math.round(seen * 100)}%`;

      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const jump = (offset: number) => {
    window.scrollTo({ top: Math.max(0, offset - 24), behavior: "smooth" });
  };

  if (segments.length === 0) return null;

  return (
    <nav className="load-bar" aria-label="Page sections">
      <div className="load-bar-track">
        {/* Unloaded plates: the shape of the whole page, dimmed. */}
        {segments.map((s, i) => (
          <span
            key={`ghost-${s.label}-${i}`}
            aria-hidden="true"
            className="load-bar-plate"
            style={{
              top: `${s.top * 100}%`,
              height: `${s.height * 100}%`,
              background: PLATES[i % PLATES.length],
              opacity: 0.16,
            }}
          />
        ))}

        {/* The loaded portion, revealed top-down. */}
        <div ref={fillRef} className="load-bar-fill">
          <div className="load-bar-stack">
            {segments.map((s, i) => (
              <span
                key={`lit-${s.label}-${i}`}
                aria-hidden="true"
                className="load-bar-plate"
                style={{
                  top: `${s.top * 100}%`,
                  height: `${s.height * 100}%`,
                  background: PLATES[i % PLATES.length],
                }}
              />
            ))}
          </div>
        </div>

        <div ref={headRef} className="load-bar-head" aria-hidden="true" />

        {/* The controls sit above both layers so the whole column is live. */}
        {segments.map((s, i) => (
          <button
            key={`hit-${s.label}-${i}`}
            type="button"
            onClick={() => jump(s.offset)}
            className="load-bar-hit"
            style={{ top: `${s.top * 100}%`, height: `${s.height * 100}%` }}
          >
            <span className="load-bar-label">{s.label}</span>
          </button>
        ))}
      </div>

      <span ref={pctRef} className="load-bar-pct" aria-hidden="true" />
    </nav>
  );
}
