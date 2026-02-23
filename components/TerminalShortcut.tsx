"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function TerminalShortcut() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.key === "`") {
        e.preventDefault();
        if (pathname !== "/terminal") {
          router.push("/terminal");
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router, pathname]);

  return null;
}
