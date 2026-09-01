"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

const DOB = new Date(2006, 4, 11).getTime(); // May 11, 2006
const MS_PER_YEAR = 365.2425 * 24 * 60 * 60 * 1000;

export default function Footer() {
  const ageRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ageRef.current;
    if (!el) return;

    let frame = 0;
    let visible = false;

    // Doctrine rule 3: the ticker is genuinely unfinished, so it may loop —
    // but only while someone can see it.
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
      },
      { threshold: 0 },
    );
    observer.observe(el);

    // Doctrine rule 4: rAF writes to the DOM, never to React state. This was
    // a setInterval calling setState 20x/second, which re-rendered the whole
    // footer subtree 20x/second for the life of the page.
    const tick = () => {
      if (visible) {
        el.textContent = ((Date.now() - DOB) / MS_PER_YEAR).toFixed(15);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return (
    <footer className="fade-in-up fade-in-up-delay-4 pt-16 pb-8">
      <div className="border-t border-rule mb-6" />
      {/* Layer 2 of the disclosure stack. The terminal was reachable only by
          a chord nobody discovers; this announces that the depth exists
          without making anyone go through it. */}
      <div className="flex justify-center mb-5">
        <Link
          href="/terminal"
          className="group inline-flex items-center gap-2 rounded-md border border-rule px-3 py-2.5 font-mono text-[11px] tracking-widest text-readout transition-colors duration-[var(--dur-tap)] hover:text-foreground hover:border-plate-chrome"
        >
          <span aria-hidden="true">$</span>
          <span>terminal</span>
          <kbd className="text-readout/70 group-hover:text-readout">
            ctrl&nbsp;+&nbsp;`
          </kbd>
        </Link>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        &copy; 2026 Anh Tran. All rights reserved.
      </div>
      <p
        ref={ageRef}
        aria-hidden="true"
        className="text-center text-xs text-readout/40 mt-2 font-mono tabular-nums tracking-wider min-h-[1rem] xl:hidden"
      />
    </footer>
  );
}
