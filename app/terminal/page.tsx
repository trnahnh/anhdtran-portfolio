"use client";

import { useState } from "react";
import TerminalIntroScreen from "@/components/TerminalIntroScreen";
import Terminal from "@/components/terminal/Terminal";

export default function TerminalPage() {
  const [booted, setBooted] = useState(false);

  return (
    <div className="fixed inset-0 bg-[#e8e8ec] dark:bg-[#0a0a0b] transition-colors duration-300">
      {!booted && <TerminalIntroScreen onComplete={() => setBooted(true)} />}
      {booted && <Terminal />}
    </div>
  );
}
