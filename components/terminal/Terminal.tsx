"use client";

import { useState, useEffect, memo } from "react";
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
    <div className="mb-3 text-black/60 dark:text-white/40 text-[10px] sm:text-[11px] tracking-widest font-mono select-none transition-colors duration-300 text-center">
      <p>Cincinnati, OH — {time.cinci}</p>
      <p>Hanoi, VN — {time.hanoi}</p>
    </div>
  );
});

interface TerminalProps {
  onExit: () => void;
}

export default function Terminal({ onExit }: TerminalProps) {
  const { history, handleSubmit, handleKeyDown, inputRef, outputRef } =
    useTerminal(onExit);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center p-4 sm:p-8"
      onClick={() => inputRef.current?.focus()}
    >
      <CincinnatiClock />

      <div className="w-full max-w-3xl h-[75vh] sm:h-[min(75vh,600px)] flex flex-col rounded-xl overflow-hidden shadow-2xl shadow-black/40 dark:shadow-black/60 border border-black/8 dark:border-white/8 transition-colors duration-300">
        <div className="flex items-center px-4 h-11 bg-[#e0e0e0] dark:bg-[#2a2a2c] shrink-0 select-none transition-colors duration-300">
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExit();
              }}
              className="group w-3 h-3 rounded-full bg-[#ff5f57] hover:brightness-110 transition-all cursor-pointer flex items-center justify-center"
              aria-label="Close"
            >
              <span className="hidden group-hover:block text-black/80 text-[8px] font-bold leading-none">
                &#x2715;
              </span>
            </button>
            <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <span className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <span className="flex-1 text-center text-black/40 dark:text-white/40 text-xs tracking-wide transition-colors duration-300">
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

      <p className="mt-4 text-[10px] sm:text-xs text-black/40 dark:text-white/30 font-mono select-none transition-colors duration-300">
        &copy; 2026 Anh Tran. All rights reserved.
      </p>
    </div>
  );
}
