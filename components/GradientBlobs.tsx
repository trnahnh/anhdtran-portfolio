"use client";

import { usePathname } from "next/navigation";

/**
 * Colour washes for the profile route only, where they sit with the fluid
 * cursor. Everywhere else the matrix is the whole background; three drifting
 * blobs on top of it read as clutter, not atmosphere.
 */
export default function GradientBlobs() {
  const pathname = usePathname();
  if (pathname !== "/profile") return null;
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div
        className="absolute w-[300px] h-[300px] sm:w-[600px] sm:h-[600px] rounded-full animate-blob opacity-[0.12]"
        style={{
          background:
            "radial-gradient(circle, var(--accent-1) 0%, transparent 70%)",
          top: "-10%",
          left: "-10%",
        }}
      />
      <div
        className="absolute w-[250px] h-[250px] sm:w-[500px] sm:h-[500px] rounded-full animate-blob animate-blob-delay-2 opacity-[0.12]"
        style={{
          background:
            "radial-gradient(circle, var(--accent-2) 0%, transparent 70%)",
          top: "40%",
          right: "-5%",
        }}
      />
      <div
        className="absolute w-[200px] h-[200px] sm:w-[400px] sm:h-[400px] rounded-full animate-blob animate-blob-delay-4 opacity-[0.12]"
        style={{
          background:
            "radial-gradient(circle, var(--accent-3) 0%, transparent 70%)",
          bottom: "-5%",
          left: "30%",
        }}
      />
    </div>
  );
}
