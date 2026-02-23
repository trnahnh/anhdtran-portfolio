"use client";

import { usePathname } from "next/navigation";

const IMMERSIVE_ROUTES = ["/space", "/terminal"];

export default function PageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (IMMERSIVE_ROUTES.includes(pathname)) return <>{children}</>;

  return (
    <div key={pathname} className="page-transition">
      {children}
    </div>
  );
}
