"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useMounted } from "@/hooks/useMounted";

const BOOT_LINES = [
  { text: "BIOS v2.4.1 ... OK", delay: 120 },
  { text: "Memory check: 16384 MB ... OK", delay: 200 },
  { text: "Loading kernel ........................ done", delay: 350 },
  { text: "Mounting /dev/portfolio ... OK", delay: 180 },
  { text: "Initializing network interfaces ... OK", delay: 220 },
  { text: "Loading user profile: visitor@anhdtran ... OK", delay: 280 },
  { text: "Starting terminal session ...", delay: 400 },
  { text: "Go Bearcats!", delay: 85 },
];

interface Props {
  onComplete: () => void;
}

export default function TerminalIntroScreen({ onComplete }: Props) {
  const mounted = useMounted();
  const [show, setShow] = useState(true);
  const [fading, setFading] = useState(false);
  const [visibleLines, setVisibleLines] = useState(0);
  const [progress, setProgress] = useState(0);

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const removeUnlockRef = useRef<(() => void) | null>(null);
  const finishedRef = useRef(false);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (removeUnlockRef.current) {
      removeUnlockRef.current();
      removeUnlockRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setFading(true);
    const t = setTimeout(() => {
      setShow(false);
      onComplete();
    }, 500);
    timersRef.current.push(t);
  }, [onComplete]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === "Escape" || e.key === " ") {
        finish();
      }
    },
    [finish],
  );

  useEffect(() => {
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

    let elapsed = 0;
    BOOT_LINES.forEach((line, i) => {
      elapsed += line.delay;
      const t = setTimeout(() => {
        setVisibleLines(i + 1);
        setProgress(((i + 1) / BOOT_LINES.length) * 100);
      }, elapsed);
      timersRef.current.push(t);
    });

    const finishTimer = setTimeout(finish, elapsed + 600);
    timersRef.current.push(finishTimer);

    return () => {
      timersRef.current.forEach(clearTimeout);
      if (removeUnlockRef.current) {
        removeUnlockRef.current();
        removeUnlockRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
    };
  }, [onComplete, finish]);

  if (!mounted || !show) return null;

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={`fixed inset-0 z-100 outline-none flex flex-col bg-[#e8e8ec] dark:bg-[#0a0a0b] transition-opacity duration-500 cursor-pointer select-none ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      onClick={finish}
    >
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 max-w-2xl mx-auto w-full">
        <div className="font-mono text-xs sm:text-sm space-y-1.5">
          {BOOT_LINES.slice(0, visibleLines).map((line, i) => (
            <div
              key={i}
              className="text-gray-900 dark:text-white animate-in fade-in duration-300"
            >
              <span className="text-black/30 dark:text-white/30 mr-2">
                [{String(i).padStart(2, "0")}]
              </span>
              {line.text}
            </div>
          ))}
          {visibleLines > 0 && visibleLines < BOOT_LINES.length && (
            <span className="inline-block w-2 h-4 bg-gray-900/70 dark:bg-white/70 animate-pulse ml-1" />
          )}
        </div>
      </div>

      <div className="px-6 sm:px-12 pb-8">
        <div className="h-1 w-full max-w-2xl mx-auto bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gray-900 dark:bg-white/70 transition-all duration-300 ease-out rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-black/20 dark:text-white/20 text-[10px] tracking-[0.3em] uppercase text-center mt-3">
          Tap anywhere to skip
        </p>
      </div>
    </div>
  );
}
