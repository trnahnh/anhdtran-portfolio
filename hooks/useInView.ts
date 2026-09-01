"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

interface UseInViewOptions {
  threshold?: number;
  rootMargin?: string;
  /** Doctrine rule 1: fire once on entry, then hold. Never re-trigger. */
  once?: boolean;
}

/**
 * Shared visibility primitive.
 *
 * Doctrine rule 1 wants entry animations fired once and held; doctrine rule 3
 * wants loops stopped the moment they leave the viewport. Those are the same
 * observer with a different disconnect policy, so they live in one hook.
 */
export function useInView<T extends Element>(
  options?: UseInViewOptions,
): [RefObject<T | null>, boolean] {
  const { threshold = 0.1, rootMargin = "0px", once = false } = options ?? {};
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return [ref, inView];
}
