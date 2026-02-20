"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const SEGMENTS = [
  { text: "console", className: "text-blue-400" },
  { text: ".", className: "text-zinc-300" },
  { text: "log", className: "text-yellow-300" },
  { text: "(", className: "text-zinc-300" },
  { text: '"Hello, World!"', className: "text-green-400" },
  { text: ")", className: "text-zinc-300" },
  { text: ";", className: "text-zinc-500" },
];

const FULL_TEXT = SEGMENTS.map((s) => s.text).join("");

let hasPlayed = false;

function renderSegments(charCount: number) {
  let remaining = charCount;
  return SEGMENTS.map((seg, i) => {
    if (remaining <= 0) return null;
    const visible = seg.text.slice(0, remaining);
    remaining -= seg.text.length;
    return (
      <span key={i} className={seg.className}>
        {visible}
      </span>
    );
  });
}

export default function IntroScreen() {
  const [show, setShow] = useState(!hasPlayed);
  const [charCount, setCharCount] = useState(0);
  const [fading, setFading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const skip = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setFading(true);
    setTimeout(() => setShow(false), 500);
  }, []);

  useEffect(() => {
    if (hasPlayed) return;
    hasPlayed = true;

    let index = 0;
    timerRef.current = setInterval(() => {
      index++;
      setCharCount(index);
      if (index === FULL_TEXT.length) {
        clearInterval(timerRef.current!);
        timerRef.current = null;
        setTimeout(() => setFading(true), 500);
        setTimeout(() => setShow(false), 1000);
      }
    }, 67);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!show) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-zinc-950 transition-opacity duration-500 cursor-pointer ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      onClick={skip}
    >
      {/* IDE Window */}
      <div className="w-[85%] max-w-xl rounded-xl overflow-hidden shadow-2xl border border-zinc-800">
        {/* Title bar */}
        <div className="bg-zinc-900 px-4 py-3 flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
          <span className="w-3 h-3 rounded-full bg-[#28c840]" />
          <span className="ml-4 text-xs text-zinc-500 font-mono">index.tsx</span>
        </div>

        {/* Code area */}
        <div className="bg-zinc-950 px-4 sm:px-6 py-6 sm:py-10 font-mono text-base sm:text-xl lg:text-2xl flex items-start gap-3 sm:gap-5">
          <span className="text-zinc-600 select-none pt-0.5">1</span>
          <p>
            {renderSegments(charCount)}
            <span
              className={`inline-block w-[2px] h-5 sm:h-6 lg:h-7 bg-zinc-300 ml-0.5 align-middle ${
                fading ? "opacity-0" : "animate-pulse"
              }`}
            />
          </p>
        </div>
      </div>

      {/* Skip hint */}
      <p className="mt-5 text-sm text-zinc-600 select-none">Tap anywhere to skip.</p>
    </div>
  );
}
