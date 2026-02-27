"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

export default function CardIntroScreen() {
  const [show, setShow] = useState(false);
  const [fading, setFading] = useState(false);

  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const removeUnlockRef = useRef<(() => void) | null>(null);

  const reducedMotion = usePrefersReducedMotion();

  const clearAll = useCallback(() => {
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
      fadeTimeoutRef.current = null;
    }
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
      audioRef.current = null;
    }
    if (removeUnlockRef.current) {
      removeUnlockRef.current();
      removeUnlockRef.current = null;
    }
  }, []);

  const playTapSound = useCallback(() => {
    const audio = new Audio("/sfx/tap-to-pay.mp3");
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
      if (!(err instanceof DOMException && err.name === "NotAllowedError"))
        return;
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
  }, []);

  const startIntro = useCallback(() => {
    clearAll();
    setFading(false);
    setShow(true);

    // For reduced motion: show card static, then auto-trigger the post-spin sequence
    if (reducedMotion) {
      // Play sound immediately, then fade
      playTapSound();
      fadeTimeoutRef.current = setTimeout(() => setFading(true), 800);
      hideTimeoutRef.current = setTimeout(() => setShow(false), 1300);
    }
  }, [clearAll, reducedMotion, playTapSound]);

  const handleSpinEnd = useCallback(() => {
    if (fading) return;
    playTapSound();
    // 800ms pause, then 500ms fade
    fadeTimeoutRef.current = setTimeout(() => setFading(true), 800);
    hideTimeoutRef.current = setTimeout(() => setShow(false), 1300);
  }, [fading, playTapSound]);

  const skip = useCallback(() => {
    clearAll();
    setFading(true);
    hideTimeoutRef.current = setTimeout(() => setShow(false), 500);
  }, [clearAll]);

  // Stable ref so the mount effect never re-runs when startIntro recreates
  const startIntroRef = useRef(startIntro);
  useEffect(() => {
    startIntroRef.current = startIntro;
  });

  // Mount effect — runs exactly once
  useEffect(() => {
    const isDarkNow = () => document.documentElement.classList.contains("dark");
    if (!isDarkNow()) return;

    const navEntry = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    const isReload = navEntry?.type === "reload";
    const hasSeenIntro =
      sessionStorage.getItem("profile-card-intro-seen") === "true";

    if (!hasSeenIntro || isReload) {
      sessionStorage.setItem("profile-card-intro-seen", "true");
      startIntroRef.current();
    }
  }, []);

  // Dark-mode observer — reacts to theme toggles
  useEffect(() => {
    const isDarkNow = () => document.documentElement.classList.contains("dark");
    let prevDark = isDarkNow();

    const observer = new MutationObserver(() => {
      const nowDark = isDarkNow();
      if (nowDark === prevDark) return;
      prevDark = nowDark;

      if (nowDark) {
        startIntro();
      } else {
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

  if (!show) return null;

  return (
    <div
      className={`fixed inset-0 z-100 flex flex-col items-center justify-center bg-zinc-950 transition-opacity duration-500 cursor-pointer ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      onClick={skip}
    >
      {/* Perspective container */}
      <div style={{ perspective: "1200px" }}>
        {/* Spinning wrapper */}
        <div
          className={reducedMotion ? "" : "card-spin"}
          style={{ transformStyle: "preserve-3d" }}
          onAnimationEnd={handleSpinEnd}
        >
          {/* Card shell — both faces share this sizing */}
          <div className="relative w-[92vw] max-w-[580px] aspect-856/540">
            {/* ===== FRONT FACE ===== */}
            <div
              className="absolute inset-0 rounded-2xl"
              style={{
                backfaceVisibility: "hidden",
              }}
            >
              {/* Metallic edge borders */}
              <div
                className="absolute inset-0 rounded-2xl"
                style={{
                  background:
                    "linear-gradient(180deg, #f0d478 0%, #c9a84c 25%, #a07c30 50%, #8a6b28 75%, #6b5220 100%)",
                  padding: "1.5px",
                  WebkitMask:
                    "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                  WebkitMaskComposite: "xor",
                  maskComposite: "exclude",
                }}
              />

              {/* Card surface */}
              <div
                className="absolute inset-0 rounded-2xl overflow-hidden"
                style={{
                  background:
                    "linear-gradient(145deg, #1a1a1a, #0d0d0d, #1a1a1a)",
                  boxShadow:
                    "0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4)",
                }}
              >
                {/* Subtle diagonal sheen */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      "linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.04) 48%, rgba(255,255,255,0.02) 52%, transparent 70%)",
                  }}
                />

                {/* Light gradient blobs on card */}
                <div
                  className="absolute w-[200%] h-[200%] rounded-full opacity-[0.06] animate-blob pointer-events-none"
                  style={{
                    background:
                      "radial-gradient(circle, #818cf8 0%, transparent 60%)",
                    top: "-60%",
                    left: "-40%",
                  }}
                />
                <div
                  className="absolute w-[180%] h-[180%] rounded-full opacity-[0.05] animate-blob animate-blob-delay-2 pointer-events-none"
                  style={{
                    background:
                      "radial-gradient(circle, #a78bfa 0%, transparent 60%)",
                    bottom: "-70%",
                    right: "-30%",
                  }}
                />
                <div
                  className="absolute w-[150%] h-[150%] rounded-full opacity-[0.04] animate-blob animate-blob-delay-4 pointer-events-none"
                  style={{
                    background:
                      "radial-gradient(circle, #f472b6 0%, transparent 60%)",
                    top: "20%",
                    right: "-50%",
                  }}
                />

                {/* Card content — Sapphire-style single flow */}
                <div className="relative h-full p-4 sm:p-8 flex flex-col justify-between">
                  {/* Top row: portrait (brand mark) right-aligned */}
                  <div className="flex justify-end">
                    <div className="w-12 h-12 sm:w-24 sm:h-24 rounded-full overflow-hidden border border-zinc-700/40">
                      <Image
                        src="/profile/portrait.png"
                        alt="Anh Tran"
                        width={96}
                        height={96}
                        priority
                        sizes="(min-width: 640px) 96px, 48px"
                        className="object-cover w-full h-full"
                      />
                    </div>
                  </div>

                  {/* Middle: chip + card number */}
                  <div className="space-y-1.5 sm:space-y-4">
                    {/* EMV chip */}
                    <div
                      className="w-9 h-6 sm:w-13 sm:h-9 rounded-md"
                      style={{
                        background:
                          "linear-gradient(135deg, #c9a84c 0%, #f0d478 40%, #c9a84c 60%, #a07c30 100%)",
                        boxShadow:
                          "inset 0 1px 2px rgba(255,255,255,0.3), inset 0 -1px 2px rgba(0,0,0,0.2)",
                      }}
                    />
                    {/* Card number */}
                    <p
                      className="font-mono text-[11px] sm:text-base tracking-[0.22em] text-zinc-400"
                      style={{
                        textShadow:
                          "0 -1px 0 rgba(255,255,255,0.06), 0 1px 2px rgba(0,0,0,0.5)",
                      }}
                    >
                      xxxx 0511 2006 xxxx
                    </p>
                    <p
                      className="text-[8px] sm:text-xs tracking-[0.15em] text-zinc-500 mt-0.5 sm:mt-1"
                      style={{
                        textShadow:
                          "0 -1px 0 rgba(255,255,255,0.04), 0 1px 1px rgba(0,0,0,0.4)",
                      }}
                    >
                      MEMBER SINCE 08/24
                    </p>
                  </div>

                  {/* Bottom row: name + title left, issuer right */}
                  <div className="flex items-end justify-between">
                    <div>
                      <p
                        className="text-sm sm:text-xl font-bold tracking-[0.25em] text-zinc-200"
                        style={{
                          textShadow:
                            "0 -1px 0 rgba(255,255,255,0.08), 0 1px 2px rgba(0,0,0,0.6)",
                        }}
                      >
                        DUY ANH TRAN
                      </p>
                      <p
                        className="text-[8px] sm:text-xs font-light tracking-[0.2em] text-zinc-500 mt-0.5"
                        style={{
                          textShadow:
                            "0 -1px 0 rgba(255,255,255,0.04), 0 1px 1px rgba(0,0,0,0.4)",
                        }}
                      >
                        SOFTWARE ENGINEER
                      </p>
                    </div>
                    <p
                      className="text-[10px] sm:text-xs tracking-[0.15em] text-zinc-500"
                      style={{
                        textShadow:
                          "0 -1px 0 rgba(255,255,255,0.04), 0 1px 1px rgba(0,0,0,0.4)",
                      }}
                    >
                      HUI - CVG
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ===== BACK FACE ===== */}
            <div
              className="absolute inset-0 rounded-2xl"
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
              }}
            >
              {/* Metallic edge borders */}
              <div
                className="absolute inset-0 rounded-2xl"
                style={{
                  background:
                    "linear-gradient(180deg, #f0d478 0%, #c9a84c 25%, #a07c30 50%, #8a6b28 75%, #6b5220 100%)",
                  padding: "1.5px",
                  WebkitMask:
                    "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                  WebkitMaskComposite: "xor",
                  maskComposite: "exclude",
                }}
              />

              {/* Card surface */}
              <div
                className="absolute inset-0 rounded-2xl overflow-hidden"
                style={{
                  background:
                    "linear-gradient(145deg, #1a1a1a, #0d0d0d, #1a1a1a)",
                  boxShadow:
                    "0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4)",
                }}
              >
                {/* Magnetic stripe */}
                <div className="mt-8 w-full h-10 sm:h-12 bg-zinc-800" />
                {/* Signature strip */}
                <div className="mx-6 mt-4 h-6 sm:h-8 rounded-sm bg-zinc-200/10" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Skip hint */}
      <p className="mt-5 text-sm select-none text-zinc-600">
        Tap anywhere to skip.
      </p>
    </div>
  );
}
