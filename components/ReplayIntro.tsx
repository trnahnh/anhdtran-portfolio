"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Play } from "lucide-react";
import { useMounted } from "@/hooks/useMounted";

// The scan on / is once per session; the profile card is once per browser.
const STORAGE_KEYS: Record<string, { store: "session" | "local"; key: string }> = {
  "/": { store: "session", key: "portrait-scanned" },
  "/profile": { store: "local", key: "intro-profile-seen" },
};

function readFlag(entry: { store: "session" | "local"; key: string }) {
  const store = entry.store === "session" ? sessionStorage : localStorage;
  return store.getItem(entry.key) === "true";
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
  const storageKey = STORAGE_KEYS[pathname];
  const mounted = useMounted();

  const hasSeen = useSyncExternalStore(
    subscribeNoop,
    () => (storageKey ? readFlag(storageKey) : false),
    () => false,
  );

  const isDark = useSyncExternalStore(
    subscribeDarkMode,
    getDarkModeSnapshot,
    () => true,
  );

  if (!mounted || !storageKey || !hasSeen) return null;
  if (pathname === "/profile" && !isDark) return null;

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
