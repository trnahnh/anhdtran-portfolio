"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { WELCOME_LINES } from "./asciiArt";
import { executeCommand, COMMAND_NAMES } from "./commands";
import type { OutputLine } from "./commands";

export function useTerminal() {
  const router = useRouter();

  const [history, setHistory] = useState<OutputLine[]>(() => [...WELCOME_LINES]);
  const [inputValue, setInputValue] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (outputRef.current) {
        outputRef.current.scrollTop = outputRef.current.scrollHeight;
      }
    });
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = inputValue.trim();

    const commandLine: OutputLine = { type: "command", text: trimmed };
    if (!trimmed) {
      setHistory((prev) => [...prev, commandLine]);
      setInputValue("");
      scrollToBottom();
      return;
    }

    // Special-case clear
    if (trimmed.toLowerCase() === "clear") {
      setHistory([]);
      setInputValue("");
      setCommandHistory((prev) => [...prev, trimmed]);
      setHistoryIndex(-1);
      scrollToBottom();
      return;
    }

    const output = executeCommand(trimmed);

    setHistory((prev) => [...prev, commandLine, ...output]);
    setCommandHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(-1);
    setInputValue("");
    scrollToBottom();
  }, [inputValue, scrollToBottom]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (commandHistory.length === 0) return;
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInputValue(commandHistory[newIndex]);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (historyIndex === -1) return;
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setInputValue("");
        } else {
          setHistoryIndex(newIndex);
          setInputValue(commandHistory[newIndex]);
        }
      } else if (e.key === "Tab") {
        e.preventDefault();
        if (!inputValue.trim()) return;
        const matches = COMMAND_NAMES.filter((c) => c.startsWith(inputValue.trim().toLowerCase()));
        if (matches.length === 1) {
          setInputValue(matches[0]);
        }
      } else if (e.key === "Escape") {
        router.back();
      }
    },
    [commandHistory, historyIndex, inputValue, router]
  );

  return {
    history,
    inputValue,
    setInputValue,
    handleSubmit,
    handleKeyDown,
    inputRef,
    outputRef,
  };
}
