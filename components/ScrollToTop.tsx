"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Scroll to top"
      className="
        fixed bottom-6 right-6 z-50
        w-11 h-11 sm:w-10 sm:h-10
        flex items-center justify-center
        rounded-full
        bg-background border border-border
        text-muted-foreground hover:text-foreground
        hover:bg-muted
        shadow-md
        transition-colors duration-200
        cursor-pointer
      "
    >
      <ArrowUp className="w-4 h-4" />
    </button>
  );
}
