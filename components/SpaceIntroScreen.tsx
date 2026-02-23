"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const LINE_1 = "Hello.";
const LINE_2 = "Welcome to Space.";
const INTERVAL = 90; // ms per character — slightly slower for drama

export default function SpaceIntroScreen() {
  const [mounted, setMounted] = useState(false);
  const [show, setShow]       = useState(true);
  const [fading, setFading]   = useState(false);
  const [line1, setLine1]     = useState(0);
  const [line2, setLine2]     = useState<number | null>(null);

  const timerRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const t1Ref           = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const t2Ref           = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const t3Ref           = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const audioRef        = useRef<HTMLAudioElement | null>(null);
  const removeUnlockRef = useRef<(() => void) | null>(null);

  const skip = useCallback(() => {
    if (timerRef.current)        { clearInterval(timerRef.current);  timerRef.current = null; }
    if (t1Ref.current)           { clearTimeout(t1Ref.current);      t1Ref.current = null; }
    if (t2Ref.current)           { clearTimeout(t2Ref.current);      t2Ref.current = null; }
    if (t3Ref.current)           { clearTimeout(t3Ref.current);      t3Ref.current = null; }
    if (removeUnlockRef.current) { removeUnlockRef.current();        removeUnlockRef.current = null; }
    if (audioRef.current)        { audioRef.current.pause(); audioRef.current.src = ""; audioRef.current = null; }
    setFading(true);
    setTimeout(() => setShow(false), 500);
  }, []);

  useEffect(() => {
    const audio = new Audio("/sfx/keyboard-typing.mp3");
    audioRef.current = audio;

    const unlock = () => {
      document.removeEventListener("click",      unlock);
      document.removeEventListener("keydown",    unlock);
      document.removeEventListener("touchstart", unlock);
      document.removeEventListener("mousemove",  unlock);
      removeUnlockRef.current = null;
      if (audioRef.current) audioRef.current.play().catch(() => {});
    };

    audio.play().catch((err: unknown) => {
      if (!(err instanceof DOMException && err.name === "NotAllowedError")) return;
      document.addEventListener("click",      unlock);
      document.addEventListener("keydown",    unlock);
      document.addEventListener("touchstart", unlock);
      document.addEventListener("mousemove",  unlock);
      removeUnlockRef.current = () => {
        document.removeEventListener("click",      unlock);
        document.removeEventListener("keydown",    unlock);
        document.removeEventListener("touchstart", unlock);
        document.removeEventListener("mousemove",  unlock);
      };
    });

    // ── Phase 1: type LINE_1 ────────────────────────────────────────────────
    let idx1 = 0;
    timerRef.current = setInterval(() => {
      idx1++;
      setLine1(idx1);

      if (idx1 === LINE_1.length) {
        clearInterval(timerRef.current!);
        timerRef.current = null;

        // ── Pause, then start LINE_2 ────────────────────────────────────────
        t1Ref.current = setTimeout(() => {
          setLine2(0);
          let idx2 = 0;
          timerRef.current = setInterval(() => {
            idx2++;
            setLine2(idx2);

            if (idx2 === LINE_2.length) {
              clearInterval(timerRef.current!);
              timerRef.current = null;
              if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; audioRef.current = null; }
              t2Ref.current = setTimeout(() => setFading(true),     1200);
              t3Ref.current = setTimeout(() => setShow(false),      1700);
            }
          }, INTERVAL);
        }, 700);
      }
    }, INTERVAL);

    return () => {
      if (timerRef.current)        clearInterval(timerRef.current);
      if (t1Ref.current)           clearTimeout(t1Ref.current);
      if (t2Ref.current)           clearTimeout(t2Ref.current);
      if (t3Ref.current)           clearTimeout(t3Ref.current);
      if (removeUnlockRef.current) { removeUnlockRef.current(); removeUnlockRef.current = null; }
      if (audioRef.current)        { audioRef.current.pause(); audioRef.current.src = ""; audioRef.current = null; }
    };
  }, []);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted || !show) return null;

  return (
    <div
      className={`fixed inset-0 z-100 flex flex-col items-center justify-center bg-[#00000a] transition-opacity duration-500 cursor-pointer select-none ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      onClick={skip}
    >
      <div className="flex flex-col items-center gap-5 sm:gap-7 text-center">
        {/* Line 1 — large, thin */}
        <p className="font-thin text-6xl sm:text-8xl lg:text-9xl tracking-[0.15em] text-white/90">
          {LINE_1.slice(0, line1)}
          <span
            className={`inline-block w-[2px] h-12 sm:h-16 lg:h-20 ml-1 align-middle bg-white/60 ${
              line2 !== null || fading ? "opacity-0" : "animate-pulse"
            }`}
          />
        </p>

        {/* Line 2 — smaller, wide tracking, uppercase */}
        {line2 !== null && (
          <p className="font-extralight text-sm sm:text-base lg:text-lg tracking-[0.4em] uppercase text-white/35">
            {LINE_2.slice(0, line2)}
            <span
              className={`inline-block w-[1.5px] h-3.5 sm:h-4 ml-0.5 align-middle bg-white/35 ${
                line2 === LINE_2.length || fading ? "opacity-0" : "animate-pulse"
              }`}
            />
          </p>
        )}
      </div>

      <p className="absolute bottom-8 text-white/20 text-[10px] tracking-[0.3em] uppercase">
        Tap anywhere to skip
      </p>
    </div>
  );
}
