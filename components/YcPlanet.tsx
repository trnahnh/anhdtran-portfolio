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
 * The dive's sound, synthesised so there's nothing to download: a whoosh
 * that rises as the planet flies in, a thump as it plunges and the red
 * floods, and a short buzz as the Y lights up. Everything is scheduled on
 * the audio clock from the click, so it stays in step with the animation.
 * Started from the click itself, which is what lets iOS play it; the same
 * context plays the stamp later, so that's allowed too.
 */
type DiveSound = {
  /** Silence the dive (the intro was skipped); the stamp can still play. */
  cut: () => void;
  /** The stamp hitting the photo. */
  stamp: () => void;
  /** Silence everything (the reveal closed). */
  stop: () => void;
};
const NO_SOUND: DiveSound = { cut() {}, stamp() {}, stop() {} };

function playDiveSound(): DiveSound {
  // iPhones mute Web Audio on silent mode, unlike the <audio> the other
  // intros use. "playback" (Safari 17+) makes it play like those do.
  const session = (navigator as { audioSession?: { type: string } }).audioSession;
  if (session) session.type = "playback";
  let ctx: AudioContext;
  try {
    ctx = new AudioContext();
  } catch {
    return NO_SOUND;
  }
  // Some iOS versions start a new context suspended even inside a tap.
  ctx.resume().catch(() => {});
  const t0 = ctx.currentTime;
  const dive = t0 + DIVE_AT / 1000;
  const sign = dive + DIVE_MS / 1000;

  const master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
  // The dive's layers share a bus, so a skip can cut them alone.
  const diveBus = ctx.createGain();
  diveBus.connect(master);

  // Whoosh: noise through a band that sweeps up as the planet speeds in.
  const noise = ctx.createBuffer(1, ctx.sampleRate * 1.2, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const whoosh = ctx.createBufferSource();
  whoosh.buffer = noise;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = 1.2;
  band.frequency.setValueAtTime(250, t0);
  band.frequency.exponentialRampToValueAtTime(2600, dive);
  const whooshGain = ctx.createGain();
  whooshGain.gain.setValueAtTime(0.0001, t0);
  whooshGain.gain.exponentialRampToValueAtTime(0.35, dive - 0.05);
  whooshGain.gain.exponentialRampToValueAtTime(0.0001, dive + 0.25);
  whoosh.connect(band).connect(whooshGain).connect(diveBus);
  whoosh.start(t0);
  whoosh.stop(dive + 0.3);

  // Thump: a falling sine, the planet going in.
  const thump = ctx.createOscillator();
  thump.frequency.setValueAtTime(120, dive);
  thump.frequency.exponentialRampToValueAtTime(38, dive + 0.4);
  const thumpGain = ctx.createGain();
  thumpGain.gain.setValueAtTime(0.0001, t0);
  thumpGain.gain.setValueAtTime(0.0001, dive);
  thumpGain.gain.exponentialRampToValueAtTime(0.9, dive + 0.02);
  thumpGain.gain.exponentialRampToValueAtTime(0.0001, dive + 0.55);
  thump.connect(thumpGain).connect(diveBus);
  thump.start(dive);
  thump.stop(dive + 0.6);

  // Buzz: the LED sign switching on, low and brief.
  const buzz = ctx.createOscillator();
  buzz.type = "sawtooth";
  buzz.frequency.value = 60;
  const buzzTone = ctx.createBiquadFilter();
  buzzTone.type = "lowpass";
  buzzTone.frequency.value = 900;
  const buzzGain = ctx.createGain();
  buzzGain.gain.setValueAtTime(0.0001, t0);
  buzzGain.gain.setValueAtTime(0.0001, sign);
  buzzGain.gain.exponentialRampToValueAtTime(0.12, sign + 0.03);
  buzzGain.gain.exponentialRampToValueAtTime(0.0001, sign + 0.7);
  buzz.connect(buzzTone).connect(buzzGain).connect(diveBus);
  buzz.start(sign);
  buzz.stop(sign + 0.75);

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    ctx.close().catch(() => {});
    if (session) session.type = "auto";
  };
  // In case the stamp never comes (a photo that never loads).
  const giveUp = window.setTimeout(close, 10000);

  return {
    cut() {
      if (!closed) diveBus.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
    },
    stamp() {
      if (closed) return;
      const t = ctx.currentTime;
      // A low thud for the weight of it...
      const thud = ctx.createOscillator();
      thud.frequency.setValueAtTime(170, t);
      thud.frequency.exponentialRampToValueAtTime(55, t + 0.12);
      const thudGain = ctx.createGain();
      thudGain.gain.setValueAtTime(0.8, t);
      thudGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      thud.connect(thudGain).connect(master);
      thud.start(t);
      thud.stop(t + 0.2);
      // ...and a short muffled slap for the rubber meeting the photo.
      const slapBuf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
      const d = slapBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const slap = ctx.createBufferSource();
      slap.buffer = slapBuf;
      const muffle = ctx.createBiquadFilter();
      muffle.type = "lowpass";
      muffle.frequency.value = 1400;
      const slapGain = ctx.createGain();
      slapGain.gain.setValueAtTime(0.6, t);
      slapGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      slap.connect(muffle).connect(slapGain).connect(master);
      slap.start(t);
      clearTimeout(giveUp);
      window.setTimeout(close, 500);
    },
    stop() {
      clearTimeout(giveUp);
      if (closed) return;
      // A quick fade rather than a click.
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
      window.setTimeout(close, 150);
    },
  };
}

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
  const sound = useRef<DiveSound>(NO_SOUND);

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
    sound.current = playDiveSound();
  };

  const skip = useCallback(() => {
    sound.current.cut();
    setMode("gone");
  }, []);

  const stamp = useCallback(() => sound.current.stamp(), []);

  const close = useCallback(() => {
    sound.current.stop();
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
        // clip, so focusing the planet can never scroll the layer.
        style={{ overflow: "clip" }}
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

      <YcReveal
        open={open}
        still={still}
        onClose={close}
        onSkip={skip}
        onStamp={stamp}
      />
    </>
  );
}
