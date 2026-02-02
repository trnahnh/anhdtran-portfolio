"use client";

import { useEffect, useState } from "react";

interface RotatingTextProps {
  texts: string[];
  interval?: number;
}

export default function RotatingText({ texts, interval = 3000 }: RotatingTextProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % texts.length);
        setIsAnimating(false);
      }, 300);
    }, interval);

    return () => clearInterval(timer);
  }, [texts.length, interval]);

  return (
    <span className="rotating-text-container">
      <span
        className={`rotating-text inline-block transition-all duration-300 ${
          isAnimating ? "translate-y-[-100%] opacity-0" : "translate-y-0 opacity-100"
        }`}
      >
        {texts[currentIndex]}
      </span>
    </span>
  );
}
