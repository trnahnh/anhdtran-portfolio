"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import TerminalIntroScreen from "@/components/TerminalIntroScreen";
import Terminal from "@/components/terminal/Terminal";

export default function TerminalPage() {
  const router = useRouter();
  const [booted, setBooted] = useState(false);
  const [exiting, setExiting] = useState(false);
  const exitingRef = useRef(false);
  const hasHistoryRef = useRef(false);

  // Track whether we were navigated to (vs direct URL entry)
  useEffect(() => {
    // history.length > 1 means there's a previous entry to go back to
    hasHistoryRef.current = window.history.length > 1;
  }, []);

  const handleExit = useCallback(() => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    setExiting(true);
    setTimeout(() => {
      if (hasHistoryRef.current) {
        router.back();
      } else {
        router.push("/");
      }
    }, 300);
  }, [router]);

  const handleBootComplete = useCallback(() => setBooted(true), []);

  useEffect(() => {
    if (booted) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleExit();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [booted, handleExit]);

  return (
    <div
      className={`fixed inset-0 bg-[#e8e8ec] dark:bg-[#0a0a0b] transition-all duration-300 ${
        exiting ? "opacity-0 scale-[0.98]" : "opacity-100 scale-100"
      }`}
    >
      {!booted && <TerminalIntroScreen onComplete={handleBootComplete} />}
      {booted && <Terminal onExit={handleExit} />}
    </div>
  );
}
