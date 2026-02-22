"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTerminal } from "./useTerminal";
import TerminalOutput from "./TerminalOutput";
import TerminalInput from "./TerminalInput";

function useCincinnatiTime() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const date = now.toLocaleDateString("en-US", {
        timeZone: "America/New_York",
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      const clock = now.toLocaleTimeString("en-US", {
        timeZone: "America/New_York",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
      setTime(`${date}, ${clock}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return time;
}

export default function Terminal() {
  const router = useRouter();
  const time = useCincinnatiTime();
  const {
    history,
    handleSubmit,
    handleKeyDown,
    inputRef,
    outputRef,
  } = useTerminal();

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center p-4 sm:p-8"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Timezone subtitle */}
      {time && (
        <p className="mb-3 text-black/60 dark:text-white/40 text-[10px] sm:text-[11px] tracking-widest font-mono select-none transition-colors duration-300">
          Cincinnati, OH — {time}
        </p>
      )}

      {/* macOS terminal window */}
      <div className="w-full max-w-3xl h-[75vh] sm:h-[min(75vh,600px)] flex flex-col rounded-xl overflow-hidden shadow-2xl shadow-black/40 dark:shadow-black/60 border border-black/[0.08] dark:border-white/[0.08] transition-colors duration-300">
        {/* Title bar */}
        <div className="flex items-center px-4 h-11 bg-[#e0e0e0] dark:bg-[#2a2a2c] shrink-0 select-none transition-colors duration-300">
          {/* Traffic lights */}
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); router.back(); }}
              className="group w-3 h-3 rounded-full bg-[#ff5f57] hover:brightness-110 transition-all cursor-pointer flex items-center justify-center"
              aria-label="Close"
            >
              <span className="hidden group-hover:block text-black/80 text-[8px] font-bold leading-none">&#x2715;</span>
            </button>
            <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <span className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          {/* Title */}
          <span className="flex-1 text-center text-black/40 dark:text-white/40 text-xs tracking-wide transition-colors duration-300">
            visitor@anhdtran — zsh
          </span>
          {/* Spacer to balance traffic lights */}
          <div className="w-[52px]" />
        </div>

        {/* Terminal body */}
        <div className="flex-1 flex flex-col bg-white dark:bg-[#1a1a1d] font-mono text-sm text-gray-900 dark:text-white min-h-0 transition-colors duration-300">
          <TerminalOutput ref={outputRef} history={history} />
          <TerminalInput
            ref={inputRef}
            onSubmit={handleSubmit}
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>

      {/* Footer */}
      <p className="mt-4 text-[10px] sm:text-xs text-black/40 dark:text-white/30 font-mono select-none transition-colors duration-300">
        &copy; 2026 Anh Tran. All rights reserved.
      </p>
    </div>
  );
}
