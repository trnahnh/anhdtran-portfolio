"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const SEGMENTS = [
  { text: "ssh", className: "text-yellow-300" },
  { text: " ", className: "" },
  { text: "anhdtran.space", className: "text-green-400" },
];

const FULL_TEXT = SEGMENTS.map((s) => s.text).join("");

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

export default function ProfileIntroScreen() {
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [fading, setFading] = useState(false);

  const timerRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeTimeoutRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimeoutRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef        = useRef<HTMLAudioElement | null>(null);
  const removeUnlockRef = useRef<(() => void) | null>(null);

  const clearAll = useCallback(() => {
    if (timerRef.current)        { clearInterval(timerRef.current);        timerRef.current = null; }
    if (fadeTimeoutRef.current)  { clearTimeout(fadeTimeoutRef.current);   fadeTimeoutRef.current = null; }
    if (hideTimeoutRef.current)  { clearTimeout(hideTimeoutRef.current);   hideTimeoutRef.current = null; }
    if (audioRef.current)        { audioRef.current.pause(); audioRef.current.src = ""; audioRef.current = null; }
    if (removeUnlockRef.current) { removeUnlockRef.current();              removeUnlockRef.current = null; }
  }, []);

  const startIntro = useCallback(() => {
    clearAll();
    setCharCount(0);
    setFading(false);
    setShow(true);

    const audio = new Audio("/sfx/keyboard-typing.mp3");
    audioRef.current = audio;

    const unlock = () => {
      document.removeEventListener("click", unlock);
      document.removeEventListener("keydown", unlock);
      document.removeEventListener("touchstart", unlock);
      document.removeEventListener("mousemove", unlock);
      removeUnlockRef.current = null;
      if (audioRef.current) audioRef.current.play().catch(() => {});
    };

    audio.play().catch((err: unknown) => {
      if (!(err instanceof DOMException && err.name === "NotAllowedError")) return;
      document.addEventListener("click", unlock);
      document.addEventListener("keydown", unlock);
      document.addEventListener("touchstart", unlock);
      document.addEventListener("mousemove", unlock);
      removeUnlockRef.current = () => {
        document.removeEventListener("click", unlock);
        document.removeEventListener("keydown", unlock);
        document.removeEventListener("touchstart", unlock);
        document.removeEventListener("mousemove", unlock);
      };
    });

    let index = 0;
    timerRef.current = setInterval(() => {
      index++;
      setCharCount(index);
      if (index === FULL_TEXT.length) {
        clearInterval(timerRef.current!);
        timerRef.current = null;
        if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; audioRef.current = null; }
        fadeTimeoutRef.current = setTimeout(() => setFading(true), 500);
        hideTimeoutRef.current = setTimeout(() => setShow(false), 1000);
      }
    }, 67);
  }, [clearAll]);

  const skip = useCallback(() => {
    clearAll();
    setFading(true);
    hideTimeoutRef.current = setTimeout(() => setShow(false), 500);
  }, [clearAll]);

  useEffect(() => {
    setMounted(true);

    const isDarkNow = () => document.documentElement.classList.contains("dark");

    // Initial show: first visit or hard reload, dark mode only
    if (isDarkNow()) {
      const navEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      const isReload = navEntry?.type === "reload";
      const hasSeenIntro = sessionStorage.getItem("profile-intro-seen") === "true";

      if (!hasSeenIntro || isReload) {
        sessionStorage.setItem("profile-intro-seen", "true");
        startIntro();
      }
    }

    // Watch for theme toggles
    let prevDark = isDarkNow();
    const observer = new MutationObserver(() => {
      const nowDark = isDarkNow();
      if (nowDark === prevDark) return;
      prevDark = nowDark;

      if (nowDark) {
        // Toggled to dark → show intro
        startIntro();
      } else {
        // Toggled to light → fade out if showing
        clearAll();
        setFading(true);
        hideTimeoutRef.current = setTimeout(() => setShow(false), 500);
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      clearAll();
      observer.disconnect();
    };
  }, [startIntro, clearAll]);

  if (!mounted || !show) return null;

  return (
    <div
      className={`fixed inset-0 z-100 flex flex-col items-center justify-center bg-zinc-950 transition-opacity duration-500 cursor-pointer ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      onClick={skip}
    >
      {/* IDE Window */}
      <div className="w-[85%] max-w-xl rounded-xl overflow-hidden shadow-2xl border border-zinc-800">
        {/* Title bar */}
        <div className="px-4 py-3 flex items-center gap-2 bg-zinc-900">
          <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
          <span className="w-3 h-3 rounded-full bg-[#28c840]" />
          <span className="ml-4 text-xs font-mono text-zinc-400">zsh</span>
        </div>

        {/* Terminal area */}
        <div className="px-4 sm:px-6 py-6 sm:py-10 font-mono text-base sm:text-xl lg:text-2xl flex items-center gap-3 sm:gap-5 bg-zinc-950">
          <span className="text-zinc-600">$</span>
          <p>
            {renderSegments(charCount)}
            <span
              className={`inline-block w-[2px] h-5 sm:h-6 lg:h-7 ml-0.5 align-middle bg-zinc-300 ${
                fading ? "opacity-0" : "animate-pulse"
              }`}
            />
          </p>
        </div>
      </div>

      {/* Skip hint */}
      <p className="mt-5 text-sm select-none text-zinc-600">
        Tap anywhere to skip.
      </p>
    </div>
  );
}
