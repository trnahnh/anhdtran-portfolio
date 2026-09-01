"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const loadSplashCursor = () =>
  import("./SplashCursor").then((mod) => mod.SplashCursor);

const SplashCursor = dynamic(loadSplashCursor, { ssr: false });

/**
 * The fluid cursor is the /profile room's surface, and only that room's.
 *
 * It used to be mounted in the root layout, which put a second WebGL context
 * on every route — a 1,426-line fluid simulation competing for the GPU with
 * the instrument matrix that is supposed to be the site's one scene.
 * It is now mounted by app/profile/page.tsx alone.
 */
export default function ConditionalSplashCursor() {
  const [introActive, setIntroActive] = useState(false);

  useEffect(() => {
    // CardIntroScreen owns the viewport on first visit; hold the cursor back
    // until it is done. Client-only: reads localStorage and matchMedia, so it
    // cannot run during SSR or in a lazy useState initialiser without a
    // hydration mismatch.
    const saved = localStorage.getItem("theme");
    const active = saved
      ? saved === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIntroActive(active);
    if (active) loadSplashCursor();
  }, []);

  useEffect(() => {
    const onShown = () => {
      setIntroActive(true);
      loadSplashCursor();
    };
    const onDone = () => setIntroActive(false);
    window.addEventListener("intro-shown", onShown);
    window.addEventListener("intro-done", onDone);
    return () => {
      window.removeEventListener("intro-shown", onShown);
      window.removeEventListener("intro-done", onDone);
    };
  }, []);

  if (introActive) return null;
  return <SplashCursor />;
}
