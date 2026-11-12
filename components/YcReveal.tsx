"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useMounted } from "@/hooks/useMounted";

// Y Combinator orange, for the stamp.
const YC = "#F26522";

/**
 * The intro, in order. Times are ms after the click.
 *
 *   warp   the screen goes dark, stars streak past; the planet flies to the
 *          centre and spins up (YcPlanet runs that part)
 *   dive   the planet plunges in and the screen floods with the sign's red,
 *          spreading out from the centre
 *   sign   a white Y draws itself on the red
 *   match  the photo fades in under the drawn Y. Both sit in the same box at
 *          the same scale, and the drawn Y traces the real one, so the sign
 *          turns into the photo of it
 *   pull   the camera pulls back from the sign to the whole photo
 *   done   the stamp lands, the caption comes up
 */
export const PHASES = ["warp", "dive", "sign", "match", "pull", "done"] as const;
export type Phase = (typeof PHASES)[number];

/** When the planet starts its plunge, and how long it takes. YcPlanet times
 *  its flight from these, so the planet lands as the red floods in. */
export const DIVE_AT = 650;
export const DIVE_MS = 500;

const SCHEDULE: [Phase, number][] = [
  ["dive", DIVE_AT],
  ["sign", DIVE_AT + DIVE_MS],
  ["match", 2250],
  ["pull", 2600],
  ["done", 3350],
];

// Where the Y sits in yc-startup-school.webp (1200x1600), measured from the
// photo: arm tops at y≈259, the arms meet the stem at (621, 835), the stem
// ends at y≈1275, and every stroke is ~120px wide.
const Y_LEFT_TOP: [number, number] = [313, 259];
const Y_RIGHT_TOP: [number, number] = [925, 259];
const Y_JOIN: [number, number] = [621, 835];
const Y_FOOT = 1275;
const Y_STROKE = 120;
// Centre of the Y as a fraction of the photo, and its size against the photo
// width (0.6 wide, 0.85 tall). The zoom scales about this point.
const Y_ORIGIN = "51.5% 48%";
const Y_W = 0.6;
const Y_H = 0.85;

// The LED sign's red, sampled from the photo.
const SIGN_FIELD =
  "radial-gradient(ellipse at 50% 45%, rgb(196,44,32) 0%, rgb(159,32,26) 45%, rgb(104,14,10) 100%)";
// The sign's LED dot grid.
const SIGN_DOTS =
  "radial-gradient(circle, rgba(255,120,90,0.32) 1px, transparent 1.6px)";

const at = (phase: Phase, from: Phase) =>
  PHASES.indexOf(phase) >= PHASES.indexOf(from);

/** Card width: big, but the 3:4 photo and its caption fit the screen. */
function cardWidth() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return Math.round(Math.min(vw * 0.92, 640, (vh - 128) * 0.75));
}

/**
 * How far the card starts zoomed in, so the Y nearly fills the screen. Kept
 * to ~68% of the height: the caption below the card puts the Y's centre a
 * little above the screen's, and the push-in adds another 6%, so anything
 * bigger crops the arms off the top.
 */
function zoomFor(w: number) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return Math.max(1, Math.min((vh * 0.68) / (Y_H * w), (vw * 0.82) / (Y_W * w)));
}

export default function YcReveal({
  open,
  still,
  onClose,
  onSkip,
}: {
  open: boolean;
  still: boolean;
  onClose: () => void;
  /** Called when the intro is cut short, so the planet can stop its dive. */
  onSkip: () => void;
}) {
  const mounted = useMounted();
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && <Reveal still={still} onClose={onClose} onSkip={onSkip} />}
    </AnimatePresence>,
    document.body,
  );
}

function Reveal({
  still,
  onClose,
  onSkip,
}: {
  still: boolean;
  onClose: () => void;
  onSkip: () => void;
}) {
  const [phase, setPhase] = useState<Phase>(still ? "done" : "warp");
  // The photo starts loading on click. On a slow connection it may not be
  // there by the match-cut, so the drawn Y and the red hold until it is.
  const [loaded, setLoaded] = useState(false);
  const [w, setW] = useState(cardWidth);
  const zoom = zoomFor(w);
  const timers = useRef<number[]>([]);
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (still) return;
    timers.current = SCHEDULE.map(([p, ms]) => window.setTimeout(() => setPhase(p), ms));
    return () => timers.current.forEach(clearTimeout);
  }, [still]);

  const skip = useCallback(() => {
    timers.current.forEach(clearTimeout);
    setPhase("done");
    onSkip();
  }, [onSkip]);

  useEffect(() => {
    closeRef.current?.focus();
    const onResize = () => setW(cardWidth());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      // One focusable control, so Tab stays on it.
      if (e.key === "Tab") {
        e.preventDefault();
        closeRef.current?.focus();
      }
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKey);

    // Lenis listens for wheel and touch on window. Stopping them here keeps
    // the page still behind the overlay without reaching into Lenis itself.
    const el = overlayRef.current;
    const block = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };
    el?.addEventListener("wheel", block, { passive: false });
    el?.addEventListener("touchmove", block, { passive: false });

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey);
      el?.removeEventListener("wheel", block);
      el?.removeEventListener("touchmove", block);
    };
  }, [onClose]);

  const done = phase === "done";
  const zoomed = !at(phase, "pull");
  const showPhoto = at(phase, "match") && loaded;
  // The drawn Y: on while it draws, and kept on past the match-cut until the
  // real one has loaded to take over from it.
  const showY = !still && (phase === "sign" || (at(phase, "match") && !loaded));

  return (
    <motion.div
      ref={overlayRef}
      // Above the page peel (z-60), below the intro card (z-100). The planet
      // rides at z-95 during its dive, in front of all of this.
      className="fixed inset-0 z-90 overflow-hidden"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      // A click during the intro skips it; once it's over, the backdrop closes.
      onClick={() => (done ? onClose() : skip())}
    >
      <motion.div
        // Blurred as well as dark, so page text never fights the caption.
        className="absolute inset-0 bg-black backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: done ? 0.93 : 0.95 }}
        transition={{ duration: 0.45 }}
      />

      <AnimatePresence>
        {!at(phase, "sign") && (
          <motion.div
            className="absolute inset-0"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <WarpStreaks />
          </motion.div>
        )}
      </AnimatePresence>

      {/* The sign's red, flooding out from where the planet went in, and
          the white flash as it fills the screen. Reduced motion gets
          neither: it goes straight to the photo. */}
      {!still && (
        <>
          <motion.div
            className="absolute inset-0"
            style={{
              backgroundImage: `${SIGN_DOTS}, ${SIGN_FIELD}`,
              backgroundSize: "6px 6px, 100% 100%",
            }}
            initial={{ clipPath: "circle(0% at 50% 50%)", opacity: 1 }}
            animate={{
              clipPath: at(phase, "dive")
                ? "circle(150% at 50% 50%)"
                : "circle(0% at 50% 50%)",
              opacity: showPhoto ? 0 : 1,
            }}
            transition={{
              clipPath: { duration: 0.6, ease: [0.7, 0, 0.84, 0] },
              opacity: { duration: 0.7, delay: 0.15 },
            }}
          />
          <motion.div
            className="absolute inset-0 bg-white pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === "sign" ? [0.6, 0] : 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          />
        </>
      )}

      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 pointer-events-none">
        <motion.figure
          role="dialog"
          aria-modal="true"
          aria-label="Y Combinator Startup School 2026"
          className="relative m-0 pointer-events-auto"
          style={{ width: w, transformOrigin: Y_ORIGIN }}
          initial={{ opacity: 0, scale: still ? 1 : zoom }}
          animate={{
            opacity: at(phase, "sign") ? 1 : 0,
            // A slow push-in while the Y draws, then the pull back.
            scale: zoomed ? (at(phase, "sign") ? zoom * 1.06 : zoom) : 1,
            x: phase === "sign" ? [0, -7, 6, -4, 2, 0] : 0,
          }}
          transition={{
            opacity: { duration: 0.01 },
            scale: zoomed
              ? { duration: 1.4, ease: "linear" }
              : { type: "spring", stiffness: 70, damping: 16, mass: 0.9 },
            x: { duration: 0.4 },
          }}
          onClick={(e) => {
            // Inside the card, a click only skips the intro, never closes.
            e.stopPropagation();
            if (!done) skip();
          }}
        >
          <motion.div
            className="relative overflow-hidden rounded-xl"
            animate={{
              boxShadow: done
                ? "0 30px 80px -20px rgba(242,101,34,0.45), 0 0 0 1px rgba(255,255,255,0.1)"
                : "0 0 0 0 rgba(0,0,0,0)",
            }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: showPhoto ? 1 : 0 }}
              transition={{ duration: 0.5 }}
            >
              <Image
                src="/profile/yc-startup-school.webp"
                alt="Anh giving a thumbs up and holding up a badge in front of the giant Y Combinator Y sign"
                width={1200}
                height={1600}
                sizes="(max-width: 700px) 92vw, 640px"
                className="block w-full h-auto"
                onLoad={() => setLoaded(true)}
                priority
              />
            </motion.div>

            {/* The drawn Y, laid over the real one. */}
            <motion.svg
              viewBox="0 0 1200 1600"
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ filter: "drop-shadow(0 0 22px rgba(255,255,255,0.55))" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: showY ? 1 : 0 }}
              transition={{ duration: showY ? 0.01 : 0.6 }}
              aria-hidden="true"
            >
              <defs>
                {/* Squares off the arm tops, as on the sign. */}
                <clipPath id="yc-y-clip">
                  <rect x="0" y={Y_LEFT_TOP[1]} width="1200" height="1600" />
                </clipPath>
              </defs>
              <g
                clipPath="url(#yc-y-clip)"
                fill="none"
                stroke="#f3f2ee"
                strokeWidth={Y_STROKE}
                strokeLinejoin="miter"
              >
                <motion.path
                  d={`M ${Y_LEFT_TOP[0] - 16} ${Y_LEFT_TOP[1] - 30} L ${Y_JOIN[0]} ${Y_JOIN[1]} L ${Y_RIGHT_TOP[0] + 16} ${Y_RIGHT_TOP[1] - 30}`}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: at(phase, "sign") ? 1 : 0 }}
                  transition={{ duration: 0.7, ease: [0.65, 0, 0.35, 1] }}
                />
                <motion.path
                  d={`M ${Y_JOIN[0]} ${Y_JOIN[1] - 60} L ${Y_JOIN[0]} ${Y_FOOT}`}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: at(phase, "sign") ? 1 : 0 }}
                  transition={{ duration: 0.4, delay: 0.55, ease: [0.65, 0, 0.35, 1] }}
                />
              </g>
            </motion.svg>

            <motion.div
              className="absolute bottom-4 left-4 rounded-md border-2 bg-black/60 px-3 py-1.5 font-mono uppercase leading-tight"
              style={{ borderColor: YC, color: YC, rotate: -8 }}
              initial={{ opacity: 0, scale: still ? 1 : 2.4 }}
              animate={done ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 2.4 }}
              transition={
                still
                  ? { duration: 0.2 }
                  : { delay: 0.15, type: "spring", stiffness: 520, damping: 17 }
              }
            >
              <span className="block text-[10px] sm:text-xs tracking-[0.2em]">Y Combinator</span>
              <span className="block text-sm sm:text-base font-bold tracking-wider">
                Startup School &rsquo;26
              </span>
            </motion.div>

            <motion.button
              ref={closeRef}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              aria-label="Close"
              className="absolute top-2 right-2 w-11 h-11 flex items-center justify-center rounded-full bg-black/50 text-white/90 hover:bg-black/70 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              initial={{ opacity: 0 }}
              animate={{ opacity: at(phase, "pull") ? 1 : 0 }}
              transition={{ duration: 0.4 }}
            >
              <X className="w-4 h-4" />
            </motion.button>
          </motion.div>
        </motion.figure>

        <motion.figcaption
          className="mt-4 text-center space-y-1"
          initial={{ opacity: 0, y: 10 }}
          animate={done ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.5, delay: still ? 0 : 0.35 }}
        >
          <p className="font-display text-base sm:text-lg text-white">
            You found the orange planet.
          </p>
          <p className="text-xs sm:text-sm text-white/60">Y Combinator Startup School, 2026.</p>
        </motion.figcaption>
      </div>
    </motion.div>
  );
}

/**
 * Hyperspace: stars rushing out from the centre, faster every frame, drawn
 * as streaks whose length follows their speed.
 */
function WarpStreaks() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio, 1.5);
    let W = 0;
    let H = 0;
    const size = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    window.addEventListener("resize", size);

    const N = W < 640 ? 160 : 280;
    const spawn = (z = Math.random() * 0.9 + 0.1) => ({
      x: (Math.random() * 2 - 1) * 1.2,
      y: (Math.random() * 2 - 1) * 1.2,
      z,
      warm: Math.random() < 0.3,
    });
    const stars = Array.from({ length: N }, () => spawn());

    const start = performance.now();
    let last = start;
    let raf = 0;

    const frame = (now: number) => {
      const t = (now - start) / 1000;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      // Ease in hard: a drift that becomes a jump.
      const speed = 0.12 + 3.2 * t * t;
      const trail = Math.min(0.5, speed * 0.07);
      const f = Math.max(W, H) * 0.5;
      const cx = W / 2;
      const cy = H / 2;

      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = "round";
      for (const s of stars) {
        s.z -= speed * dt;
        if (s.z <= 0.02) Object.assign(s, spawn(1));
        const tz = s.z + trail;
        const x1 = cx + (s.x / s.z) * f;
        const y1 = cy + (s.y / s.z) * f;
        const x0 = cx + (s.x / tz) * f;
        const y0 = cy + (s.y / tz) * f;
        const near = 1 - s.z;
        ctx.strokeStyle = s.warm
          ? `rgba(255,150,90,${0.25 + near * 0.75})`
          : `rgba(255,255,255,${0.2 + near * 0.8})`;
        ctx.lineWidth = 0.4 + near * 2.2;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", size);
    };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 w-full h-full" />;
}
