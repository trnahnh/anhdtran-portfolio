"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Play } from "lucide-react";
import { useMounted } from "@/hooks/useMounted";

// The scan on / plays once per session, and the button is always there
// underneath it: the overlay covers the header while the scan runs, and once
// it is gone (finished, skipped for lack of WebGL, or the asset was slow)
// the visitor can ask for it again. The profile card is once per browser and
// its button shows only after the card has been seen.
const PROFILE_KEY = "intro-profile-seen";

function readProfileFlag() {
  try {
    return localStorage.getItem(PROFILE_KEY) === "true";
  } catch {
    return false;
  }
}

const subscribeNoop = () => () => {};

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

  const profileSeen = useSyncExternalStore(subscribeNoop, readProfileFlag, () => false);

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
