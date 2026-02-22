"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const SplashCursor = dynamic(
  () => import("./SplashCursor").then((mod) => mod.SplashCursor),
  { ssr: false }
);

export default function ConditionalSplashCursor() {
  const pathname = usePathname();
  if (pathname === "/space" || pathname === "/terminal") return null;
  return <SplashCursor />;
}
