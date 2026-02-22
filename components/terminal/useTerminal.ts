"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { WELCOME_LINES } from "./asciiArt";
import { executeCommand, COMMAND_NAMES } from "./commands";
import type { OutputLine } from "./commands";
import type { TerminalInputHandle } from "./TerminalInput";

export function useTerminal() {
  const router = useRouter();

  const [history, setHistory] = useState<OutputLine[]>(() => [...WELCOME_LINES]);
  const commandHistory = useRef<string[]>([]);
  const historyIndex = useRef(-1);

  const inputRef = useRef<TerminalInputHandle>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (outputRef.current) {
        outputRef.current.scrollTop = outputRef.current.scrollHeight;
      }
    });
  }, []);

  const handleSubmit = useCallback((value: string) => {
    const trimmed = value.trim();

    const commandLine: OutputLine = { type: "command", text: trimmed };
    if (!trimmed) {
      setHistory((prev) => [...prev, commandLine]);
      if (inputRef.current) inputRef.current.setValue("");
      scrollToBottom();
      return;
    }

    // Special-case exit
    if (trimmed.toLowerCase() === "exit") {
      router.back();
      return;
    }

    // Special-case clear
    if (trimmed.toLowerCase() === "clear") {
      setHistory([]);
      if (inputRef.current) inputRef.current.setValue("");
      commandHistory.current = [...commandHistory.current, trimmed];
      historyIndex.current = -1;
      scrollToBottom();
      return;
    }

    const output = executeCommand(trimmed);

    setHistory((prev) => [...prev, commandLine, ...output]);
    commandHistory.current = [...commandHistory.current, trimmed];
    historyIndex.current = -1;
    if (inputRef.current) inputRef.current.setValue("");
    scrollToBottom();
  }, [scrollToBottom, router]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, value: string) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        const cmds = commandHistory.current;
        if (cmds.length === 0) return;
        const newIndex = historyIndex.current === -1 ? cmds.length - 1 : Math.max(0, historyIndex.current - 1);
        historyIndex.current = newIndex;
        if (inputRef.current) inputRef.current.setValue(cmds[newIndex]);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (historyIndex.current === -1) return;
        const newIndex = historyIndex.current + 1;
        const cmds = commandHistory.current;
        if (newIndex >= cmds.length) {
          historyIndex.current = -1;
          if (inputRef.current) inputRef.current.setValue("");
        } else {
          historyIndex.current = newIndex;
          if (inputRef.current) inputRef.current.setValue(cmds[newIndex]);
        }
      } else if (e.key === "Tab") {
        e.preventDefault();
        const trimmed = value.trim();
        if (!trimmed) return;
        const matches = COMMAND_NAMES.filter((c) => c.startsWith(trimmed.toLowerCase()));
        if (matches.length === 1) {
          if (inputRef.current) inputRef.current.setValue(matches[0]);
        }
      } else if (e.key === "Escape") {
        router.back();
      }
    },
    [router]
  );

  return {
    history,
    handleSubmit,
    handleKeyDown,
    inputRef,
    outputRef,
  };
}
