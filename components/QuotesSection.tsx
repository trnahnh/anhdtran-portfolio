"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const quotes = [
  { text: "This too shall pass.", author: "Persian Proverb" },
  { text: "The obstacle is the way.", author: "Marcus Aurelius" },
  { text: "Know thyself.", author: "Socrates" },
  { text: "Amor fati.", author: "Friedrich Nietzsche" },
  { text: "Be here now.", author: "Ram Dass" },
  { text: "Less is more.", author: "Mies van der Rohe" },
  { text: "Endure and persist.", author: "Ovid" },
  { text: "What we resist, persists.", author: "Carl Jung" },
  { text: "Still waters run deep.", author: "Latin Proverb" },
  { text: "Fortune favors the bold.", author: "Latin Proverb" },
];

export default function QuotesSection() {
  const [index, setIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  const prev = () => setIndex((i) => (i - 1 + quotes.length) % quotes.length);
  const next = useCallback(() => setIndex((i) => (i + 1) % quotes.length), []);

  useEffect(() => {
    if (!sectionRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 },
    );
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    const interval = setInterval(next, 3000);
    return () => clearInterval(interval);
  }, [isVisible, index, next]);

  const { text, author } = quotes[index];

  return (
    <section
      ref={sectionRef}
      className="fade-in-up fade-in-up-delay-2 space-y-6"
    >
      <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
        Words to Live By
      </h2>
      <div className="flex items-center gap-4">
        <button
          onClick={prev}
          aria-label="Previous quote"
          className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex-1 text-center space-y-2">
          <p className="text-base font-light italic">&ldquo;{text}&rdquo;</p>
          <p className="text-xs text-muted-foreground">— {author}</p>
        </div>

        <button
          onClick={next}
          aria-label="Next quote"
          className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="flex justify-center">
        {quotes.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            aria-label={`Go to quote ${i + 1}`}
            className="p-2 flex items-center justify-center"
          >
            <span className="relative flex items-center justify-center w-1.5 h-1.5">
              {i === index && (
                <span className="absolute inset-0 rounded-full bg-foreground/30 animate-ping" />
              )}
              <span
                className={`relative w-1.5 h-1.5 rounded-full transition-colors block ${
                  i === index ? "bg-foreground" : "bg-muted-foreground/30"
                }`}
              />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
