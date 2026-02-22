"use client";

import { forwardRef } from "react";

interface TerminalInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const TerminalInput = forwardRef<HTMLInputElement, TerminalInputProps>(
  ({ value, onChange, onSubmit, onKeyDown }, ref) => {
    return (
      <div className="flex items-center px-4 sm:px-5 py-2 shrink-0 text-gray-900 dark:text-white transition-colors duration-300">
        <span className="hidden sm:inline shrink-0">visitor@anhdtran:~$ </span>
        <span className="sm:hidden shrink-0">~$ </span>
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSubmit();
            } else {
              onKeyDown(e);
            }
          }}
          className="flex-1 bg-transparent outline-none text-inherit text-sm font-mono caret-current ml-1 min-w-0"
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
      </div>
    );
  }
);

TerminalInput.displayName = "TerminalInput";

export default TerminalInput;
