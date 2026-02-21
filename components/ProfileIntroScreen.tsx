"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const SEGMENTS = [
  { text: "ssh", className: "text-yellow-300" },
  { text: " ", className: "" },
  { text: "anhdtran.space", className: "text-green-400" },
];

const SEGMENTS_LIGHT = [
  { text: "ssh", className: "text-amber-600" },
  { text: " ", className: "" },
  { text: "anhdtran.space", className: "text-green-700" },
];

const FULL_TEXT = SEGMENTS.map((s) => s.text).join("");

function renderSegments(charCount: number, isDark: boolean) {
  const segments = isDark ? SEGMENTS : SEGMENTS_LIGHT;
  let remaining = charCount;
  return segments.map((seg, i) => {
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

export default function ProfileIntroScreen() {
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(true);
  const [charCount, setCharCount] = useState(0);
  const [fading, setFading] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    setIsDark(saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches);
    setMounted(true);
  }, []);

  const skip = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setFading(true);
    setTimeout(() => setShow(false), 500);
  }, []);

  useEffect(() => {
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

  if (!mounted || !show) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center transition-opacity duration-500 cursor-pointer ${
        isDark ? "bg-zinc-950" : "bg-white"
      } ${fading ? "opacity-0 pointer-events-none" : "opacity-100"}`}
      onClick={skip}
    >
      {/* IDE Window */}
      <div
        className={`w-[85%] max-w-xl rounded-xl overflow-hidden shadow-2xl border ${
          isDark ? "border-zinc-800" : "border-zinc-200"
        }`}
      >
        {/* Title bar */}
        <div
          className={`px-4 py-3 flex items-center gap-2 ${
            isDark ? "bg-zinc-900" : "bg-zinc-100"
          }`}
        >
          <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
          <span className="w-3 h-3 rounded-full bg-[#28c840]" />
          <span className={`ml-4 text-xs font-mono ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
            zsh
          </span>
        </div>

        {/* Terminal area */}
        <div
          className={`px-4 sm:px-6 py-6 sm:py-10 font-mono text-base sm:text-xl lg:text-2xl flex items-center gap-3 sm:gap-5 ${
            isDark ? "bg-zinc-950" : "bg-white"
          }`}
        >
          <span className={isDark ? "text-zinc-600" : "text-zinc-400"}>$</span>
          <p>
            {renderSegments(charCount, isDark)}
            <span
              className={`inline-block w-[2px] h-5 sm:h-6 lg:h-7 ml-0.5 align-middle ${
                isDark ? "bg-zinc-300" : "bg-zinc-700"
              } ${fading ? "opacity-0" : "animate-pulse"}`}
            />
          </p>
        </div>
      </div>

      {/* Skip hint */}
      <p className={`mt-5 text-sm select-none ${isDark ? "text-zinc-600" : "text-zinc-400"}`}>
        Tap anywhere to skip.
      </p>
    </div>
  );
}
