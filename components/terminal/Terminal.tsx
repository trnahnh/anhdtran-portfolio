"use client";

import { useState, useEffect, useCallback, memo } from "react";
import { flushSync } from "react-dom";
import { useTerminal } from "./useTerminal";
import TerminalOutput from "./TerminalOutput";
import TerminalInput from "./TerminalInput";

function readClock(now: Date, tz: string) {
  const date = now.toLocaleDateString("en-US", {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const clock = now.toLocaleTimeString("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  const off =
    new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "longOffset" })
      .formatToParts(now)
      .find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const utc = off === "GMT" ? "UTC+00:00" : off.replace("GMT", "UTC").replace("-", "−");
  return `${date}, ${clock} · ${utc}`;
}

const CincinnatiClock = memo(function CincinnatiClock() {
  const [time, setTime] = useState<{ cinci: string; hanoi: string } | null>(null);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime({
        cinci: readClock(now, "America/New_York"),
        hanoi: readClock(now, "Asia/Ho_Chi_Minh"),
      });
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  if (!time) return null;

  return (
    <div className="mb-3 text-black/60 dark:text-white/50 text-[10px] sm:text-[11px] tracking-widest font-mono select-none transition-colors duration-300 text-center">
      <p>Cincinnati, OH — {time.cinci}</p>
      <p>Hanoi, VN — {time.hanoi}</p>
    </div>
  );
});

// Written on the "desktop" under the window. Only someone who minimizes it
// ever sees this, and it points at the hidden `yc` command, which in turn
// points at the orange planet on /profile.
const BEHIND_THE_WINDOW: { text: React.ReactNode; className?: string }[] = [
  { text: "// behind the window", className: "text-black/35 dark:text-white/30" },
  { text: "nobody ever looks back here." },
  { text: "since you did: there's a command `help` won't show you." },
  {
    text: (
      <>
        two letters. starts with <span className="text-signal">y</span>.
      </>
    ),
  },
];

function BehindTheWindow({ shown }: { shown: boolean }) {
  return (
    <div
      aria-hidden={!shown}
      className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 pb-16 font-mono text-xs sm:text-sm text-center text-black/60 dark:text-white/55 select-none pointer-events-none"
    >
      {BEHIND_THE_WINDOW.map((line, i) => (
        <p
          key={i}
          // Lines surface one at a time once the window is out of the way,
          // and all vanish together the moment it comes back.
          style={{ transitionDelay: shown ? `${250 + i * 450}ms` : "0ms" }}
          className={`text-balance transition-[opacity,translate] duration-500 motion-reduce:transition-none ${
            shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
          } ${line.className ?? ""}`}
        >
          {line.text}
        </p>
      ))}
    </div>
  );
}

interface TerminalProps {
  onExit: () => void;
}

const LIGHT =
  "w-3 h-3 rounded-full hover:brightness-110 transition-all cursor-pointer flex items-center justify-center text-black/70";
// Glyphs show on hover of the whole cluster, the way macOS does it.
const GLYPH = "hidden group-hover/lights:block group-focus-within/lights:block";

export default function Terminal({ onExit }: TerminalProps) {
  const { history, handleSubmit, handleKeyDown, inputRef, outputRef } =
    useTerminal(onExit);
  const [maximized, setMaximized] = useState(false);
  const [minimized, setMinimized] = useState(false);

  const toggleMaximize = () => {
    setMaximized((m) => !m);
    inputRef.current?.focus();
  };

  // The window is inert while minimized, so commit the restore synchronously
  // and focus inside the same tap or keypress. iOS only raises the keyboard
  // for a focus that happens within the user's gesture.
  const restore = useCallback(
    (typed = "") => {
      flushSync(() => setMinimized(false));
      const input = inputRef.current;
      if (!input) return;
      if (typed.trim()) input.setValue(input.getValue() + typed);
      input.focus();
    },
    [inputRef],
  );

  // While minimized the window is still mounted (scroll and half-typed input
  // survive), so a stray Escape or keypress shouldn't reach it. Any key that
  // isn't a modifier brings it back, like clicking its icon in the Dock, and
  // the keystroke carries over into the prompt.
  useEffect(() => {
    if (!minimized) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onExit();
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key !== "Enter" && e.key.length > 1) return;
      e.preventDefault();
      restore(e.key.length === 1 ? e.key : "");
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [minimized, onExit, restore]);

  return (
    <div
      className={`fixed inset-0 flex flex-col items-center justify-center transition-[padding] duration-300 ${
        maximized ? "p-2 sm:p-3" : "p-4 sm:p-8"
      }`}
      onClick={() => !minimized && inputRef.current?.focus()}
    >
      <BehindTheWindow shown={minimized} />

      {!maximized && <CincinnatiClock />}

      <div
        inert={minimized}
        aria-hidden={minimized}
        className={`relative w-full flex flex-col rounded-xl overflow-hidden shadow-2xl shadow-black/40 dark:shadow-black/60 border border-black/8 dark:border-white/8 origin-bottom transition-[max-width,height,translate,scale,opacity,background-color,border-color] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none ${
          maximized ? "max-w-full h-full" : "max-w-3xl h-[75vh] sm:h-[min(75vh,600px)]"
        } ${minimized ? "translate-y-[45vh] scale-[0.08] opacity-0 pointer-events-none" : ""}`}
      >
        <div
          className="flex items-center px-4 h-11 bg-[#e0e0e0] dark:bg-[#2a2a2c] shrink-0 select-none transition-colors duration-300"
          onDoubleClick={toggleMaximize}
        >
          <div className="group/lights flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExit();
              }}
              className={`${LIGHT} bg-[#ff5f57]`}
              aria-label="Close"
              title="Close"
            >
              <span className={`${GLYPH} text-[8px] font-bold leading-none`}>
                &#x2715;
              </span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMinimized(true);
              }}
              className={`${LIGHT} bg-[#febc2e]`}
              aria-label="Minimize"
              title="Minimize"
            >
              <svg viewBox="0 0 12 12" className={`${GLYPH} w-2 h-2`} aria-hidden>
                <path d="M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleMaximize();
              }}
              className={`${LIGHT} bg-[#28c840]`}
              aria-label={maximized ? "Exit full screen" : "Enter full screen"}
              aria-pressed={maximized}
              title={maximized ? "Exit full screen" : "Enter full screen"}
            >
              <svg viewBox="0 0 12 12" className={`${GLYPH} w-2 h-2`} aria-hidden>
                {maximized ? (
                  // Corners pointing in: shrink back.
                  <path d="M5.5 1.5v4h-4zM6.5 10.5v-4h4z" fill="currentColor" />
                ) : (
                  // Corners pointing out: grow.
                  <path d="M1.5 6.5v-5h5zM10.5 5.5v5h-5z" fill="currentColor" />
                )}
              </svg>
            </button>
          </div>
          <span className="flex-1 text-center text-black/60 dark:text-white/60 text-xs tracking-wide transition-colors duration-300">
            visitor@anhdtran — zsh
          </span>
          {/* Spacer to balance traffic lights */}
          <div className="w-[52px]" />
        </div>

        <div className="flex-1 flex flex-col bg-white dark:bg-[#1a1a1d] font-mono text-sm text-gray-900 dark:text-white min-h-0 transition-colors duration-300">
          <TerminalOutput ref={outputRef} history={history} />
          <TerminalInput
            ref={inputRef}
            onSubmit={handleSubmit}
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>

      {!maximized && (
        <p
          className={`mt-4 text-[10px] sm:text-xs text-black/60 dark:text-white/50 font-mono select-none transition-[color,opacity] duration-300 ${
            minimized ? "opacity-0" : ""
          }`}
        >
          &copy; 2026 Anh Tran. All rights reserved.
        </p>
      )}

      {/* Dock chip: where the window goes when minimized. */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          restore();
        }}
        tabIndex={minimized ? 0 : -1}
        aria-hidden={!minimized}
        aria-label="Restore terminal"
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2.5 pl-2 pr-3.5 py-2 rounded-xl font-mono text-xs bg-white/80 dark:bg-[#2a2a2c]/80 backdrop-blur-md border border-black/8 dark:border-white/10 shadow-lg shadow-black/20 text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white cursor-pointer transition-[opacity,translate,color] duration-300 motion-reduce:transition-none ${
          minimized ? "opacity-100 translate-y-0 delay-150" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        <span className="flex items-center justify-center w-7 h-7 rounded-md bg-[#1a1a1d] text-[#28c840] text-[11px] leading-none">
          &gt;_
        </span>
        <span className="whitespace-nowrap">
          zsh — <span className="pointer-coarse:hidden">click or type</span>
          <span className="hidden pointer-coarse:inline">tap</span> to restore
        </span>
      </button>
    </div>
  );
}
