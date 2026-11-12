"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useTransform,
  type MotionStyle,
} from "framer-motion";
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
// The Y's outer edges (strokes included) and its centre, as fractions of the
// photo's width and height. The zoom scales about the centre.
const Y_BOX = { left: 0.217, right: 0.813, top: 0.162, bottom: 0.797 };
const Y_CX = 0.515;
const Y_CY = 0.48;
const Y_ORIGIN = `${Y_CX * 100}% ${Y_CY * 100}%`;
// The slow push-in while the Y draws, on top of the starting zoom.
const PUSH = 1.06;

// The LED sign's red, sampled from the photo.
const SIGN_FIELD =
  "radial-gradient(ellipse at 50% 45%, rgb(196,44,32) 0%, rgb(159,32,26) 45%, rgb(104,14,10) 100%)";
// The sign's LED dot grid.
const SIGN_DOTS =
  "radial-gradient(circle, rgba(255,120,90,0.32) 1px, transparent 1.6px)";

const at = (phase: Phase, from: Phase) =>
  PHASES.indexOf(phase) >= PHASES.indexOf(from);

/**
 * Card width: big, but the 3:4 photo fits the screen with ~76px to spare
 * below for the caption. The card is centred on its own (the caption sits
 * outside the layout), which is what lets zoomFor know where the Y is.
 */
function cardWidth() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return Math.round(Math.min(vw * 0.92, 640, (vh - 152) * 0.75));
}

/**
 * How far the card starts zoomed in: as big as the Y can get, at the end of
 * the push-in, with all four edges of it still inside the screen and clear
 * of a margin. Worked out from where the Y actually lands, since the card is
 * centred but the Y isn't centred in the photo. On a phone the width is the
 * limit; on a laptop, the height.
 */
function zoomFor(w: number) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const h = (w * 4) / 3;
  // The zoom's fixed point, on screen.
  const ox = vw / 2 + (Y_CX - 0.5) * w;
  const oy = vh / 2 + (Y_CY - 0.5) * h;
  const mx = Math.max(16, vw * 0.04);
  const my = Math.max(24, vh * 0.07);
  const fit = Math.min(
    (ox - mx) / ((Y_CX - Y_BOX.left) * w),
    (vw - mx - ox) / ((Y_BOX.right - Y_CX) * w),
    (oy - my) / ((Y_CY - Y_BOX.top) * h),
    (vh - my - oy) / ((Y_BOX.bottom - Y_CY) * h),
  );
  return Math.max(1, fit / PUSH);
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
  // A phone on its side leaves a card under 200px wide: the stamp and the
  // close button shrink to suit it.
  const compact = w < 280;
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
  const showPhoto = at(phase, "match") && loaded;
  // The pull back waits for the photo too, or it would pull back from nothing.
  const pulling = at(phase, "pull") && loaded;

  /*
   * The pull back is one progress value, 0 → 1, and the card's scale, the
   * mask opening and the red fading are all read off it. Run on separate
   * clocks they drifted apart: the mask and the red finished first and left
   * a still-oversized photo hanging off both sides of a phone, on black.
   */
  const push = useMotionValue(still ? 1 : zoom);
  const pull = useMotionValue(still ? 1 : 0);
  const cardScale = useTransform([push, pull], ([s, p]: number[]) => s + (1 - s) * p);
  // The oval holds while the card is bigger than the screen and opens as it
  // lands. On a phone the zoomed photo stays wider than the screen until
  // ~85% of the way back, so anything earlier shows its edges hanging off
  // both sides; the red goes in step, so there's never a bare photo on black.
  const maskX = useTransform(pull, [0, 0.7, 1], ["52%", "64%", "150%"]);
  const maskY = useTransform(pull, [0, 0.7, 1], ["56%", "68%", "150%"]);
  const redOpacity = useTransform(pull, [0.45, 1], [1, 0]);

  useEffect(() => {
    if (still) return;
    if (!at(phase, "sign")) {
      push.set(zoom);
      return;
    }
    // The slow push-in while the Y draws.
    const c = animate(push, zoom * PUSH, { duration: 1.4, ease: "linear" });
    return () => c.stop();
  }, [phase, zoom, still, push]);

  useEffect(() => {
    if (!pulling || still) return;
    const c = animate(pull, 1, { type: "spring", stiffness: 70, damping: 16, mass: 0.9 });
    return () => c.stop();
  }, [pulling, still, pull]);
  // The drawn Y: on while it draws, and kept on past the match-cut until the
  // real one has loaded to take over from it.
  const showY = !still && (phase === "sign" || (at(phase, "match") && !loaded));
  // The card is at its real size with the photo in it: time for the stamp,
  // the caption and the close button.
  const settled = done && loaded;

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
              // Held through the match-cut, so the photo's red sign melts
              // into it, and let go as the camera pulls back.
              opacity: redOpacity,
            }}
            initial={{ clipPath: "circle(0% at 50% 50%)" }}
            animate={{
              clipPath: at(phase, "dive")
                ? "circle(150% at 50% 50%)"
                : "circle(0% at 50% 50%)",
            }}
            transition={{ duration: 0.6, ease: [0.7, 0, 0.84, 0] }}
          />
          <motion.div
            className="absolute inset-0 bg-white pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === "sign" ? [0.6, 0] : 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          />
        </>
      )}

      {/* No padding here: the card must sit dead centre for zoomFor's sums,
          and cardWidth already keeps it clear of the edges. */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <figure
          role="dialog"
          aria-modal="true"
          aria-label="Y Combinator Startup School 2026"
          className="relative m-0 pointer-events-auto"
          style={{ width: w }}
          onClick={(e) => {
            // Inside the card, a click only skips the intro, never closes.
            e.stopPropagation();
            if (!done) skip();
          }}
        >
          <motion.div
            className="relative aspect-3/4 overflow-hidden rounded-xl"
            style={{ transformOrigin: Y_ORIGIN, scale: cardScale }}
            initial={{ opacity: 0 }}
            animate={{
              opacity: at(phase, "sign") ? 1 : 0,
              x: phase === "sign" ? [0, -7, 6, -4, 2, 0] : 0,
              boxShadow: settled
                ? "0 30px 80px -20px rgba(242,101,34,0.45), 0 0 0 1px rgba(255,255,255,0.1)"
                : "0 0 0 0 rgba(0,0,0,0)",
            }}
            transition={{
              opacity: { duration: 0.01 },
              x: { duration: 0.4 },
              boxShadow: { duration: 0.8 },
            }}
          >
            {/* Through the match-cut the photo shows only through a soft oval
                around the Y, so its edges dissolve into the red instead of
                a hard rectangle appearing. The oval opens as the camera
                pulls back. */}
            <motion.div
              // CSS variables driven by motion values; framer supports them,
              // its types don't list them.
              style={
                {
                  "--mx": maskX,
                  "--my": maskY,
                  maskImage: `radial-gradient(ellipse var(--mx) var(--my) at ${Y_ORIGIN}, #000 58%, transparent 92%)`,
                  WebkitMaskImage: `radial-gradient(ellipse var(--mx) var(--my) at ${Y_ORIGIN}, #000 58%, transparent 92%)`,
                } as MotionStyle
              }
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
              className={`absolute rounded-md border-2 bg-black/60 font-mono uppercase leading-tight whitespace-nowrap ${
                compact ? "bottom-2 left-2 px-2 py-1" : "bottom-4 left-4 px-3 py-1.5"
              }`}
              style={{ borderColor: YC, color: YC, rotate: -8 }}
              initial={{ opacity: 0, scale: still ? 1 : 2.4 }}
              animate={settled ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 2.4 }}
              transition={
                still
                  ? { duration: 0.2 }
                  : { delay: 0.15, type: "spring", stiffness: 520, damping: 17 }
              }
            >
              <span
                className={`block tracking-[0.2em] ${compact ? "text-[7px]" : "text-[10px] sm:text-xs"}`}
              >
                Y Combinator
              </span>
              <span
                className={`block font-bold tracking-wider ${compact ? "text-[10px]" : "text-sm sm:text-base"}`}
              >
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
              className={`absolute flex items-center justify-center rounded-full bg-black/50 text-white/90 hover:bg-black/70 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
                compact ? "top-1.5 right-1.5 w-9 h-9" : "top-2 right-2 w-11 h-11"
              }`}
              // Only once the card has landed at its real size: while it's
              // still zoomed, its corner can be off the edge of a phone.
              initial={{ opacity: 0 }}
              animate={{ opacity: settled ? 1 : 0 }}
              transition={{ duration: 0.4 }}
            >
              <X className="w-4 h-4" />
            </motion.button>
          </motion.div>

          {/* Outside the layout, so the card alone decides where centre is.
              Free to run wider than the card, so a narrow card (a phone on
              its side) doesn't wrap it onto lines the screen can't fit. */}
          <motion.figcaption
            className={`absolute left-1/2 top-full -translate-x-1/2 w-max max-w-[92vw] text-center ${
              compact ? "mt-2 space-y-0" : "mt-4 space-y-1"
            }`}
            initial={{ opacity: 0, y: 10 }}
            animate={settled ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ duration: 0.5, delay: still ? 0 : 0.35 }}
          >
          <p className={`font-display text-white ${compact ? "text-sm" : "text-base sm:text-lg"}`}>
            You found the orange planet.
          </p>
          <p className={`text-white/60 ${compact ? "text-[11px]" : "text-xs sm:text-sm"}`}>
            Y Combinator Startup School, 2026.
          </p>
          </motion.figcaption>
        </figure>
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
