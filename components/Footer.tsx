"use client";

import { useEffect, useState } from "react";

const DOB = new Date(2006, 4, 11).getTime(); // May 11, 2006
const MS_PER_YEAR = 365.2425 * 24 * 60 * 60 * 1000;

function getPreciseAge(): string {
  const age = (Date.now() - DOB) / MS_PER_YEAR;
  return age.toFixed(12);
}

export default function Footer() {
  const [age, setAge] = useState<string>("");

  useEffect(() => {
    const id = setInterval(() => setAge(getPreciseAge()), 50);
    return () => clearInterval(id);
  }, []);

  return (
    <footer className="fade-in-up fade-in-up-delay-4 pt-16 pb-8">
      <div className="border-t border-border mb-6" />
      <div className="text-center text-sm text-muted-foreground">
        &copy; 2026 Anh Tran. All rights reserved.
      </div>
      {age && (
        <p className="text-center text-xs text-muted-foreground/40 mt-2 font-mono tabular-nums tracking-wider">
          {age}
        </p>
      )}
    </footer>
  );
}
