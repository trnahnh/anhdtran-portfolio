"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

const DISABLED_ROUTES = ["/space", "/terminal"];

export default function SmoothScroll() {
  const pathname = usePathname();
  const prefersReducedMotion = usePrefersReducedMotion();
  const lenisRef = useRef<Lenis | null>(null);

  const isDisabled = DISABLED_ROUTES.includes(pathname) || prefersReducedMotion;

  useEffect(() => {
    if (isDisabled) {
      lenisRef.current?.destroy();
      lenisRef.current = null;
      return;
    }

    const isTouch = window.matchMedia("(pointer: coarse)").matches;

    const lenis = new Lenis({
      lerp: isTouch ? 0.12 : 0.07,
      wheelMultiplier: 0.8,
      touchMultiplier: 1.5,
      autoRaf: true,
    });

    lenisRef.current = lenis;

    return () => {
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [isDisabled]);

  return null;
}
