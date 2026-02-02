"use client";

export default function GradientBlobs() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Blob 1 - Indigo */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full animate-blob opacity-[0.03]"
        style={{
          background: "radial-gradient(circle, var(--accent-1) 0%, transparent 70%)",
          top: "-10%",
          left: "-10%",
        }}
      />
      {/* Blob 2 - Purple */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full animate-blob animate-blob-delay-2 opacity-[0.03]"
        style={{
          background: "radial-gradient(circle, var(--accent-2) 0%, transparent 70%)",
          top: "40%",
          right: "-5%",
        }}
      />
      {/* Blob 3 - Pink */}
      <div
        className="absolute w-[400px] h-[400px] rounded-full animate-blob animate-blob-delay-4 opacity-[0.03]"
        style={{
          background: "radial-gradient(circle, var(--accent-3) 0%, transparent 70%)",
          bottom: "-5%",
          left: "30%",
        }}
      />
    </div>
  );
}
