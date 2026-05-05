"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const SplashCursor = dynamic(
  () => import("./SplashCursor").then((mod) => mod.SplashCursor),
  { ssr: false },
);

function getInitialIntroActive(pathname: string): boolean {
  if (typeof window === "undefined") return false;
  if (pathname === "/") {
    return localStorage.getItem("intro-home-seen") !== "true";
  }
  if (pathname === "/profile") {
    const saved = localStorage.getItem("theme");
    return saved
      ? saved === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  return false;
}

export default function ConditionalSplashCursor() {
  const pathname = usePathname();
  const [introActive, setIntroActive] = useState(false);

  useEffect(() => {
    setIntroActive(getInitialIntroActive(pathname));
  }, [pathname]);

  useEffect(() => {
    const onShown = () => setIntroActive(true);
    const onDone = () => setIntroActive(false);
    window.addEventListener("intro-shown", onShown);
    window.addEventListener("intro-done", onDone);
    return () => {
      window.removeEventListener("intro-shown", onShown);
      window.removeEventListener("intro-done", onDone);
    };
  }, []);

  if (pathname === "/space" || pathname === "/terminal") return null;
  if (introActive) return null;
  return <SplashCursor />;
}
