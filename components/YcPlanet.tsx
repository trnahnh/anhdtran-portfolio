"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useMounted } from "@/hooks/useMounted";
import YcPlanetCanvas, { PLANET_H, PLANET_W } from "./YcPlanetCanvas";
import YcReveal, { DIVE_AT, DIVE_MS } from "./YcReveal";

/**
 * The /profile easter egg: a live 3D orange planet that drifts over the whole
 * page. It eases to a stop under the pointer so it can be caught. Clicking it
 * sends it diving into the screen, which plays the YcReveal intro and ends on
 * the Startup School photo. The terminal's hidden `yc` command points here.
 *
 * The loop writes the transform straight to the element rather than through
 * React, since it changes every frame.
 */

type Mode = "roam" | "fly" | "gone" | "return";

const FLY_MS = DIVE_AT;
const RETURN_MS = 800;

// Keep clear of the edges; the top margin leaves the header's row alone.
const EDGE_X = 12;
const EDGE_TOP = 64;
const EDGE_BOTTOM = 16;

/**
 * A slow Lissajous loop across the screen, its width and height breathing
 * a little so it doesn't trace the exact same figure every lap. One lap
 * across takes about 80 seconds. W and H are the planet layer's measured
 * size, not window.innerWidth: on iOS that reports the visual viewport,
 * which changes when the page is zoomed.
 */
function pathAt(t: number, W: number, H: number) {
  const minX = EDGE_X;
  const maxX = Math.max(minX, W - PLANET_W - EDGE_X);
  const minY = EDGE_TOP;
  const maxY = Math.max(minY, H - PLANET_H - EDGE_BOTTOM);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const ax = (maxX - minX) / 2;
  const ay = (maxY - minY) / 2;
  return {
    x: cx + ax * Math.sin(t * 0.078 + 0.6) * (0.82 + 0.18 * Math.sin(t * 0.031)),
    y: cy + ay * Math.sin(t * 0.113 + 2.1) * (0.85 + 0.15 * Math.cos(t * 0.047)),
  };
}

const easeInOutCubic = (p: number) =>
  p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
const easeInCubic = (p: number) => p * p * p;
const easeOutBack = (p: number) => {
  const c = 1.6;
  return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2);
};

/**
 * Whether a full-screen intro (the /profile card) owns the viewport. The
 * planet stays unmounted until it's over: loading Three.js, building the
 * texture and opening a WebGL context while the card spins made both stutter.
 *
 * The listeners attach when this module loads, ahead of every mount effect,
 * so the card's first intro-shown or intro-done is never missed (the planet
 * mounts after the card, and the card dispatches from its own mount effect).
 * Until one arrives the answer is "busy": the card always sends one or the
 * other on mount.
 *
 * On a later client-side visit the value may be a stale "done" from an
 * earlier intro. That's harmless: the planet waits ARRIVE_DELAY_MS before
 * mounting, and the card's intro-shown lands in its mount effect, well
 * inside that wait, cancelling it.
 */
let introBusy = true;
const introSubs = new Set<() => void>();
const setIntroBusy = (busy: boolean) => {
  introBusy = busy;
  introSubs.forEach((notify) => notify());
};
if (typeof window !== "undefined") {
  window.addEventListener("intro-shown", () => setIntroBusy(true));
  window.addEventListener("intro-done", () => setIntroBusy(false));
}
function useIntroBusy() {
  return useSyncExternalStore(
    (notify) => {
      introSubs.add(notify);
      return () => introSubs.delete(notify);
    },
    () => introBusy,
    () => true,
  );
}

// After the card has gone, a beat before the planet arrives, so the page
// settles (and the fluid cursor starts) before the WebGL work begins.
const ARRIVE_DELAY_MS = 700;

/**
 * The page's root is `relative z-10`, a stacking context of its own, so
 * anything inside it stays under the body-level reveal overlay whatever its
 * z-index. Mounting on <body> lets the planet dive in front of the overlay.
 */
function PlanetPortal({ children }: { children: React.ReactNode }) {
  const mounted = useMounted();
  return mounted ? createPortal(children, document.body) : null;
}

export default function YcPlanet() {
  const still = usePrefersReducedMotion();
  const mounted = useMounted();
  const introBusyNow = useIntroBusy();
  const [arrived, setArrived] = useState(false);
  // The planet only exists once the intro is over and the beat after it has
  // passed. While a replayed intro plays it goes away again.
  const present = mounted && !introBusyNow && arrived;
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [flying, setFlying] = useState(false);

  const layerRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const hitRef = useRef<HTMLButtonElement>(null);
  const modeRef = useRef<Mode>("roam");
  const modeAt = useRef(0);
  const hoveredRef = useRef(false);
  const stillRef = useRef(still);

  useEffect(() => {
    hoveredRef.current = hovered;
  }, [hovered]);
  useEffect(() => {
    stillRef.current = still;
  }, [still]);

  const setMode = (m: Mode) => {
    modeRef.current = m;
    modeAt.current = performance.now();
  };

  useEffect(() => {
    if (introBusyNow) return;
    const id = window.setTimeout(() => setArrived(true), ARRIVE_DELAY_MS);
    return () => clearTimeout(id);
  }, [introBusyNow]);

  useEffect(() => {
    const layer = layerRef.current;
    const el = wrapRef.current;
    if (!layer || !el) return;

    // Arrive with the same pop-in it uses when coming back from the reveal.
    modeRef.current = "return";
    modeAt.current = performance.now();

    // The layer is exactly the screen; its size is the planet's world.
    let W = layer.clientWidth;
    let H = layer.clientHeight;
    const ro = new ResizeObserver(() => {
      W = layer.clientWidth;
      H = layer.clientHeight;
    });
    ro.observe(layer);

    // Start somewhere different on each visit.
    let t = Math.random() * 200;
    // Reduced motion starts parked rather than easing down from full speed.
    let pace = stillRef.current ? 0 : 1;
    let last = performance.now();
    let raf = 0;
    let from = pathAt(t, W, H);
    let prevX = from.x;
    let bank = 0;

    const place = (x: number, y: number, scale: number, opacity: number, z: number) => {
      el.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${bank}deg) scale(${scale})`;
      el.style.opacity = String(opacity);
      // The layer carries the z-index: it is the stacking context.
      layer.style.zIndex = String(z);
    };

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const since = now - modeAt.current;
      const mode = modeRef.current;

      if (mode === "roam" || mode === "return") {
        // Ease to a stop under the pointer, and stay put with reduced motion.
        const target = hoveredRef.current || stillRef.current ? 0 : 1;
        pace += (target - pace) * Math.min(1, dt * 3);
        t += dt * pace;
        const p = pathAt(t, W, H);
        // Lean into the direction of travel, like it's banking.
        const vx = (p.x - prevX) / Math.max(dt, 0.001);
        prevX = p.x;
        bank += (Math.max(-10, Math.min(10, vx * 0.12)) - bank) * Math.min(1, dt * 2);
        from = p;

        if (mode === "return") {
          const k = Math.min(1, since / RETURN_MS);
          place(p.x, p.y, 0.3 + 0.7 * easeOutBack(k), k, 40);
          if (k >= 1) modeRef.current = "roam";
        } else {
          place(p.x, p.y, 1, 1, 40);
        }
      } else if (mode === "fly") {
        // To the centre, growing, then a plunge into the screen.
        const cx = W / 2 - PLANET_W / 2;
        const cy = H / 2 - PLANET_H / 2;
        bank += (0 - bank) * Math.min(1, dt * 6);
        if (since < FLY_MS) {
          const k = easeInOutCubic(since / FLY_MS);
          place(from.x + (cx - from.x) * k, from.y + (cy - from.y) * k, 1 + 1.6 * k, 1, 95);
        } else {
          const k = easeInCubic(Math.min(1, (since - FLY_MS) / DIVE_MS));
          place(cx, cy, 2.6 + 22 * k, 1 - k, 95);
          if (k >= 1) modeRef.current = "gone";
        }
      } else {
        place(from.x, from.y, 1, 0, 40);
      }

      raf = requestAnimationFrame(frame);
    };

    const startLoop = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stopLoop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const onVisibility = () => (document.hidden ? stopLoop() : startLoop());

    startLoop();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stopLoop();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [present]);

  const launch = () => {
    setHovered(false);
    setOpen(true);
    if (still) {
      setMode("gone");
      return;
    }
    setFlying(true);
    setMode("fly");
  };

  const skip = useCallback(() => setMode("gone"), []);

  const close = useCallback(() => {
    setOpen(false);
    setFlying(false);
    setMode("return");
    // The button is disabled while the reveal is open; wait a frame for it
    // to be enabled again before handing focus back.
    requestAnimationFrame(() => hitRef.current?.focus({ preventScroll: true }));
  }, []);

  return (
    <>
      {present && (
      <PlanetPortal>
      {/* A screen-sized clipping layer. iOS Safari counts a fixed element
          that pokes past the screen edge as page width: the planet grows
          24x in its dive (and its ring can graze the edge while roaming),
          which widened the page, so Safari zoomed the whole page out and
          the reveal overlay covered only part of the screen. Clipped here,
          nothing can reach past the edge. */}
      <div
        ref={layerRef}
        className="fixed inset-0 z-40 overflow-hidden pointer-events-none"
      >
      <div
        ref={wrapRef}
        className="absolute top-0 left-0 pointer-events-none will-change-transform"
        style={{ width: PLANET_W, height: PLANET_H, opacity: 0 }}
      >
        <YcPlanetCanvas fast={hovered || flying} still={still} />
        {/* Only the sphere catches the pointer; the ring and the empty
            corners of the canvas let clicks through to the page. */}
        <button
          ref={hitRef}
          type="button"
          onClick={launch}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
          // Keyboard focus parks it too, so it can be reached with Tab. Not
          // mouse or programmatic focus: closing the reveal hands focus back
          // here, and that shouldn't freeze it until the next click.
          onFocus={(e) => {
            if (e.currentTarget.matches(":focus-visible")) setHovered(true);
          }}
          onBlur={() => setHovered(false)}
          aria-label="An orange planet"
          aria-haspopup="dialog"
          disabled={open}
          // While the reveal is open the planet dives in front of it, scaled
          // up mid-screen; it must not swallow the tap that skips the intro.
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-[#F26522]/70 ${
            open ? "pointer-events-none" : "pointer-events-auto"
          }`}
        />
      </div>
      </div>
      </PlanetPortal>
      )}

      <YcReveal open={open} still={still} onClose={close} onSkip={skip} />
    </>
  );
}
