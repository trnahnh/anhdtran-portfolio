"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function EnterSpaceButton() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const check = () =>
      setIsDark(document.documentElement.classList.contains("dark"));

    check();

    const observer = new MutationObserver(() => requestAnimationFrame(check));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <AnimatePresence>
      {isDark && (
        <motion.div
          className="flex flex-col items-center gap-2 pt-6 pb-2"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <motion.button
            onClick={() => router.push("/space")}
            className="group relative px-6 py-2.5 sm:px-8 sm:py-3 text-xs sm:text-sm font-light tracking-widest text-white/50 uppercase transition-all duration-500 rounded-full border border-white/10 bg-white/3 hover:text-white hover:border-white/20 hover:bg-white/6 cursor-pointer w-full max-w-[280px] sm:w-auto"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <span
              className="pointer-events-none absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"
              style={{
                boxShadow:
                  "0 0 24px 4px rgba(120,80,255,0.18), 0 0 48px 8px rgba(60,160,255,0.12), 0 0 80px 16px rgba(0,220,200,0.07)",
              }}
            />
            <span
              className="pointer-events-none absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                background:
                  "radial-gradient(ellipse at 50% 0%, rgba(120,80,255,0.08) 0%, transparent 70%)",
              }}
            />
            <span className="relative flex items-center justify-center gap-2">
              <span className="text-base leading-none">🌌</span>
              Enter Space Mode
            </span>
          </motion.button>
          <p className="text-white/20 text-[10px] tracking-widest uppercase">
            best experienced on desktop
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
