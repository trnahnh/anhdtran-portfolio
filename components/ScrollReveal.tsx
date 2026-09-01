"use client";

import { type ReactNode } from "react";
import { useInView } from "@/hooks/useInView";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

interface ScrollRevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export default function ScrollReveal({
  children,
  delay = 0,
  className,
}: ScrollRevealProps) {
  const reducedMotion = usePrefersReducedMotion();
  // Doctrine rule 1: fired once on entry and then held. This previously
  // re-triggered on every scroll-back, so the page kept re-animating content
  // the reader had already arrived at.
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.1, once: true });

  const shown = reducedMotion || inView;

  return (
    <div
      ref={ref}
      className={className}
      style={
        reducedMotion
          ? undefined
          : {
              opacity: shown ? 1 : 0,
              transform: shown ? "translateY(0)" : "translateY(20px)",
              transition: `opacity var(--dur-arrive) var(--ease-out-expo) ${delay}ms, transform var(--dur-arrive) var(--ease-out-expo) ${delay}ms`,
            }
      }
    >
      {children}
    </div>
  );
}
