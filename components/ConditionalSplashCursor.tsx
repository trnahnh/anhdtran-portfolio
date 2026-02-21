"use client";

import { usePathname } from "next/navigation";
import { SplashCursor } from "./SplashCursor";

export default function ConditionalSplashCursor() {
  const pathname = usePathname();
  if (pathname === "/space") return null;
  return <SplashCursor />;
}
