"use client";

import { useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

function withOpacity(rgba: string, opacity: number) {
  return rgba.replace(/,\s*[\d.]+\)$/, `, ${opacity})`);
}

const STARS = Array.from({ length: 80 }, (_, i) => ({
  id: i,
  cx: ((i * 47.3 + 11) % 100).toFixed(2),
  cy: ((i * 31.7 + 53) % 100).toFixed(2),
  r: [0.5, 0.8, 0.4, 1.1, 0.6, 0.3, 0.9][i % 7],
  delay: `${((i * 0.37) % 4).toFixed(2)}s`,
  duration: `${(((i * 0.53) % 2) + 2.5).toFixed(2)}s`,
}));

const PLANETS = [
  {
    id: 1,
    orbitR: 72,
    size: 10,
    speed: 9,
    color: "rgba(180,200,230,0.85)",
    dash: "2 3",
  },
  {
    id: 2,
    orbitR: 118,
    size: 15,
    speed: 17,
    color: "rgba(210,170,120,0.85)",
    dash: "3 4",
    hasRings: true,
  },
  {
    id: 3,
    orbitR: 170,
    size: 9,
    speed: 27,
    color: "rgba(140,175,220,0.85)",
    dash: "2 2",
  },
  {
    id: 4,
    orbitR: 228,
    size: 18,
    speed: 44,
    color: "rgba(155,205,155,0.85)",
    dash: "4 3",
  },
] as const;

const BG_FLOATERS = [
  {
    id: 1,
    left: "6%",
    top: "16%",
    size: 26,
    duration: 20,
    color: "rgba(180,200,230,0.3)",
  },
  {
    id: 2,
    left: "86%",
    top: "26%",
    size: 18,
    duration: 29,
    color: "rgba(210,170,120,0.3)",
  },
  {
    id: 3,
    left: "75%",
    top: "66%",
    size: 22,
    duration: 25,
    color: "rgba(140,175,220,0.3)",
  },
  {
    id: 4,
    left: "11%",
    top: "74%",
    size: 14,
    duration: 34,
    color: "rgba(155,205,155,0.3)",
  },
];

function SunSVG() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="22" fill="rgba(255,215,60,0.06)" />
      <circle
        cx="24"
        cy="24"
        r="20"
        fill="none"
        stroke="rgba(255,215,60,0.22)"
        strokeWidth="1"
        strokeDasharray="4 3"
      />
      <circle
        cx="24"
        cy="24"
        r="14"
        fill="none"
        stroke="rgba(255,215,60,0.38)"
        strokeWidth="1"
        strokeDasharray="2 2"
      />
      <circle cx="24" cy="24" r="9" fill="rgba(255,215,60,0.18)" />
      <circle cx="24" cy="24" r="5" fill="rgba(255,215,60,0.45)" />
    </svg>
  );
}

function PlanetSVG({
  size,
  color,
  dash,
  hasRings,
}: {
  size: number;
  color: string;
  dash: string;
  hasRings?: boolean;
}) {
  const r = size / 2;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ overflow: "visible" }}
    >
      {hasRings && (
        <ellipse
          cx={r}
          cy={r}
          rx={size * 0.92}
          ry={size * 0.24}
          fill="none"
          stroke={withOpacity(color, 0.48)}
          strokeWidth="1"
          strokeDasharray="3 2"
        />
      )}
      <circle
        cx={r}
        cy={r}
        r={r - 1}
        fill={withOpacity(color, 0.11)}
        stroke={color}
        strokeWidth="1"
        strokeDasharray={dash}
      />
      <circle cx={r} cy={r} r={r * 0.42} fill={withOpacity(color, 0.08)} />
    </svg>
  );
}

export default function SolarSystem() {
  const [scale, setScale] = useState(1);
  const [isDark, setIsDark] = useState(true);

  const { scrollY } = useScroll();
  const solarY = useTransform(scrollY, [0, 1000], [0, -140]);
  const starsY = useTransform(scrollY, [0, 1000], [0, -50]);
  const floatersY = useTransform(scrollY, [0, 1000], [0, -90]);

  useEffect(() => {
    const updateScale = () => {
      const w = window.innerWidth;
      // Outermost orbit diameter = 228 * 2 = 456px; fit within 85% of screen
      setScale(Math.min(1, (w * 0.85) / 456));
    };

    const updateTheme = () =>
      setIsDark(document.documentElement.classList.contains("dark"));

    updateScale();
    updateTheme();

    window.addEventListener("resize", updateScale, { passive: true });

    const observer = new MutationObserver(() =>
      requestAnimationFrame(updateTheme),
    );
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      window.removeEventListener("resize", updateScale);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-1 pointer-events-none overflow-hidden transition-opacity duration-300"
      style={{ opacity: isDark ? 1 : 0 }}
      aria-hidden="true"
    >
      <motion.svg
        className="absolute inset-0 w-full h-full"
        style={{ y: starsY, color: "var(--foreground)" }}
      >
        {STARS.map((s) => (
          <circle
            key={s.id}
            className="star-twinkle"
            cx={`${s.cx}%`}
            cy={`${s.cy}%`}
            r={s.r}
            fill="currentColor"
            style={{
              animation: `twinkle ${s.duration} ${s.delay} ease-in-out infinite`,
            }}
          />
        ))}
      </motion.svg>

      <motion.div className="absolute inset-0" style={{ y: floatersY }}>
        {BG_FLOATERS.map((p) => (
          <motion.div
            key={p.id}
            className="absolute"
            style={{ left: p.left, top: p.top }}
            animate={{ rotate: 360 }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            <PlanetSVG size={p.size} color={p.color} dash="3 4" />
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        className="absolute"
        style={{ left: "50%", top: "42%", y: solarY }}
      >
        {/* All orbits share this anchor as (0,0) */}
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) scale(${scale})`,
            transformOrigin: "center center",
          }}
        >
          <div
            style={{
              position: "absolute",
              transform: "translate(-24px, -24px)",
            }}
          >
            <SunSVG />
          </div>

          {PLANETS.map((planet) => (
            <div
              key={planet.id}
              style={{
                position: "absolute",
                transform: "translate(-50%, -50%)",
              }}
            >
              <svg
                style={{
                  position: "absolute",
                  width: planet.orbitR * 2,
                  height: planet.orbitR * 2,
                  left: -planet.orbitR,
                  top: -planet.orbitR,
                  overflow: "visible",
                }}
              >
                <circle
                  cx={planet.orbitR}
                  cy={planet.orbitR}
                  r={planet.orbitR - 1}
                  fill="none"
                  stroke="var(--foreground)"
                  strokeOpacity={0.09}
                  strokeWidth="1"
                  strokeDasharray="5 5"
                />
              </svg>

              {/* Orbit wrapper – rotates to carry the planet */}
              <motion.div
                style={{
                  position: "absolute",
                  width: planet.orbitR * 2,
                  height: planet.orbitR * 2,
                  left: -planet.orbitR,
                  top: -planet.orbitR,
                }}
                animate={{ rotate: 360 }}
                transition={{
                  duration: planet.speed,
                  repeat: Infinity,
                  ease: "linear",
                }}
              >
                {/* Planet – counter-rotates to stay upright */}
                <motion.div
                  style={{
                    position: "absolute",
                    top: -(planet.size / 2),
                    left: planet.orbitR - planet.size / 2,
                  }}
                  animate={{ rotate: -360 }}
                  transition={{
                    duration: planet.speed,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                >
                  <PlanetSVG
                    size={planet.size}
                    color={planet.color}
                    dash={planet.dash}
                    hasRings={"hasRings" in planet ? planet.hasRings : false}
                  />
                </motion.div>
              </motion.div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
