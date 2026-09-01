"use client";

import { useEffect, useState } from "react";
import { useInView } from "@/hooks/useInView";

interface RotatingTextProps {
  texts: string[];
  interval?: number;
}

export default function RotatingText({
  texts,
  interval = 3000,
}: RotatingTextProps) {
  const [containerRef, inView] = useInView<HTMLSpanElement>({ threshold: 0 });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Doctrine rule 3: this loop is never finished, so it is allowed to run —
    // but it stops the moment it scrolls out of the viewport.
    if (!inView) return;

    let timeoutId: ReturnType<typeof setTimeout>;
    const timer = setInterval(() => {
      setIsAnimating(true);
      timeoutId = setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % texts.length);
        setIsAnimating(false);
      }, 300);
    }, interval);

    return () => {
      clearInterval(timer);
      clearTimeout(timeoutId);
    };
  }, [texts.length, interval, inView]);

  return (
    <span ref={containerRef} className="rotating-text-container">
      <span
        className={`rotating-text inline-block motion-token ${
          isAnimating
            ? "-translate-y-full opacity-0"
            : "translate-y-0 opacity-100"
        }`}
      >
        {texts[currentIndex]}
      </span>
    </span>
  );
}
