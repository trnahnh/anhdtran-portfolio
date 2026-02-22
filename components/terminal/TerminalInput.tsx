"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";

export interface TerminalInputHandle {
  getValue: () => string;
  setValue: (v: string) => void;
  focus: () => void;
}

interface TerminalInputProps {
  onSubmit: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, value: string) => void;
}

const TerminalInput = forwardRef<TerminalInputHandle, TerminalInputProps>(
  ({ onSubmit, onKeyDown }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      getValue: () => inputRef.current?.value ?? "",
      setValue: (v: string) => {
        if (inputRef.current) inputRef.current.value = v;
      },
      focus: () => inputRef.current?.focus(),
    }));

    return (
      <div className="flex items-center px-4 sm:px-5 py-2 shrink-0 text-gray-900 dark:text-white transition-colors duration-300">
        <span className="hidden sm:inline shrink-0">visitor@anhdtran:~$ </span>
        <span className="sm:hidden shrink-0">~$ </span>
        <input
          ref={inputRef}
          type="text"
          defaultValue=""
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSubmit(inputRef.current?.value ?? "");
            } else {
              onKeyDown(e, inputRef.current?.value ?? "");
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
