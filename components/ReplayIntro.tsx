"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Play } from "lucide-react";
import { useMounted } from "@/hooks/useMounted";
import { profileIntroSeen } from "@/lib/profileIntro";

// The scan on / plays once per session, and the button is always there
// underneath it: the overlay covers the header while the scan runs, and once
// it is gone (finished, skipped for lack of WebGL, or the asset was slow)
// the visitor can ask for it again. The profile card is once per session too,
// and its button shows once the card has played.
function subscribeProfileIntro(callback: () => void) {
  window.addEventListener("intro-shown", callback);
  window.addEventListener("intro-done", callback);
  return () => {
    window.removeEventListener("intro-shown", callback);
    window.removeEventListener("intro-done", callback);
  };
}

function subscribeDarkMode(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

function getDarkModeSnapshot() {
  return document.documentElement.classList.contains("dark");
}

export default function ReplayIntro() {
  const pathname = usePathname();
  const mounted = useMounted();

  const profileSeen = useSyncExternalStore(
    subscribeProfileIntro,
    profileIntroSeen,
    () => false,
  );

  const isDark = useSyncExternalStore(
    subscribeDarkMode,
    getDarkModeSnapshot,
    () => true,
  );

  if (!mounted) return null;
  if (pathname === "/profile") {
    if (!profileSeen || !isDark) return null;
  } else if (pathname !== "/") {
    return null;
  }

  return (
    <button
      onClick={() => window.dispatchEvent(new CustomEvent("replay-intro"))}
      className="p-2 rounded-full transition-colors hover:bg-muted interactive"
      aria-label="Replay intro animation"
      title="Replay intro"
    >
      <Play className="w-5 h-5" />
    </button>
  );
}
