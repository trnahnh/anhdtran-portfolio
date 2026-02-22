"use client";

import { forwardRef } from "react";
import type { OutputLine } from "./commands";

interface TerminalOutputProps {
  history: OutputLine[];
}

const TerminalOutput = forwardRef<HTMLDivElement, TerminalOutputProps>(
  ({ history }, ref) => {
    return (
      <div ref={ref} className="flex-1 overflow-y-auto px-4 sm:px-5 pt-4 pb-2 scroll-smooth">
        {history.map((line, i) => (
          <div key={i} className="text-gray-900 dark:text-white leading-6 transition-colors duration-300">
            {line.type === "command" ? (
              <span>
                <span className="hidden sm:inline">visitor@anhdtran:~$ </span>
                <span className="sm:hidden">~$ </span>
                <span>{line.text}</span>
              </span>
            ) : (
              <pre className="whitespace-pre-wrap font-mono text-xs sm:text-sm">{line.text}</pre>
            )}
          </div>
        ))}
      </div>
    );
  }
);

TerminalOutput.displayName = "TerminalOutput";

export default TerminalOutput;
