"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * Loading the bar.
 *
 * The left edge is a sleeve, and reading the page loads plates onto it. Each
 * section is a plate in its real IPF competition colour, sized to its actual
 * share of the document, so the bar reports how far down you are and how the
 * page is proportioned at the same time.
 *
 * The colour is not painted, it is simulated. SplashCursor on /profile runs a
 * full 2D Navier-Stokes solve — advection, pressure projection, vorticity,
 * splats injected from pointer velocity, dye and velocity dissipating over
 * time. A five-pixel column does not need two dimensions, so this is the same
 * idea reduced to one: dye and velocity advected along the vertical axis.
 * Scrolling is the splat force, the plates are the dye sources, and the
 * pointer stirs it exactly the way it does on the profile page.
 *
 * Sections opt in with `data-load="Label"`. Each plate is a real button that
 * jumps to its section, so this is navigation as well as telemetry.
 */

interface Segment {
  label: string;
  top: number;
  height: number;
  offset: number;
}

/** Simulation cells down the column. 1D, so this is nothing. */
const N = 220;

/**
 * Tuned against SplashCursor's own constants, converted from its per-second
 * dissipation to a per-frame decay: dye 2.08, velocity 1.19.
 */
const DYE_DECAY = 0.966;
const VEL_DECAY = 0.981;
const SPLAT_FORCE = 0.055;
const POINTER_REACH = 130; // px from the left edge before the cursor stirs it

type RGB = [number, number, number];

function readPlate(name: string, fallback: RGB): RGB {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  const hex = /^#([0-9a-f]{6})$/i.exec(raw);
  if (!hex) return fallback;
  const n = parseInt(hex[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export default function LoadBar() {
  const pathname = usePathname();
  const reducedMotion = usePrefersReducedMotion();
  const [segments, setSegments] = useState<Segment[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  // The component renders nothing until it has measured sections, so the
  // canvas is absent on the first pass. Without this in the deps the setup
  // effect runs once against a null ref, returns early, and never runs again
  // — the bar mounts and never draws a single frame.
  const hasSegments = segments.length > 0;
  const pctRef = useRef<HTMLSpanElement>(null);
  // The simulation loop reads the segments without depending on them, so it
  // is never torn down and restarted when a measurement changes.
  const segRef = useRef<Segment[]>([]);
  useEffect(() => {
    segRef.current = segments;
  }, [segments]);

  const measure = useCallback(() => {
    const total = document.documentElement.scrollHeight || 1;
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>("[data-load]"),
    );
    setSegments(
      nodes.map((el) => {
        const box = el.getBoundingClientRect();
        const offset = box.top + window.scrollY;
        return {
          label: el.dataset.load ?? "",
          top: offset / total,
          height: box.height / total,
          offset,
        };
      }),
    );
  }, []);

  useEffect(() => {
    // Measured after paint: layout is not final while the effect runs, and
    // reading it there would also set state synchronously on mount. Measured
    // again once fonts have landed, since they move every section below them.
    const first = requestAnimationFrame(measure);
    const settle = setTimeout(measure, 400);
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    return () => {
      cancelAnimationFrame(first);
      clearTimeout(settle);
      observer.disconnect();
    };
  }, [measure, pathname]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // A 1 x N strip holds the simulation; the browser's own image smoothing
    // scales it up the column, which is what gives the dye its softness for
    // free rather than costing a blur pass.
    const strip = document.createElement("canvas");
    strip.width = 1;
    strip.height = N;
    const stripCtx = strip.getContext("2d");
    if (!stripCtx) return;
    const image = stripCtx.createImageData(1, N);

    const vel = new Float32Array(N);
    const dye = new Float32Array(N * 3);
    const nextDye = new Float32Array(N * 3);

    let plates: RGB[] = [];
    let collarInk = "#fafaf9";
    const readPlates = () => {
      // Literal primitives only. --foreground is a var() chain and browsers
      // differ on whether a chain is resolved by the time getComputedStyle
      // sees it; --chalk and --iron are always plain hex.
      const dark = document.documentElement.classList.contains("dark");
      const c = readPlate(dark ? "--chalk" : "--iron", dark ? [250, 250, 249] : [10, 10, 11]);
      collarInk = `rgb(${c[0]},${c[1]},${c[2]})`;
      plates = [
        readPlate("--plate-25", [200, 32, 46]),
        readPlate("--plate-20", [27, 95, 193]),
        readPlate("--plate-15", [232, 185, 35]),
        readPlate("--plate-10", [30, 138, 76]),
      ];
    };
    readPlates();
    const themeObserver = new MutationObserver(readPlates);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    let cssW = 0;
    let cssH = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cssW = canvas.clientWidth;
      cssH = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(cssW * dpr));
      canvas.height = Math.max(1, Math.floor(cssH * dpr));
    };
    resize();
    const sizeObserver = new ResizeObserver(resize);
    sizeObserver.observe(canvas);

    // Pointer proximity, the way SplashCursor takes pointer velocity.
    let pointerRow = -1;
    let pointerVel = 0;
    let lastPointerY = 0;
    const onPointerMove = (e: PointerEvent) => {
      if (e.clientX > POINTER_REACH) {
        // Forget where the cursor was. Re-entering from across the screen
        // would otherwise register as one enormous downward flick.
        pointerRow = -1;
        pointerVel = 0;
        lastPointerY = e.clientY;
        return;
      }
      const strength = 1 - e.clientX / POINTER_REACH;
      pointerRow = Math.floor((e.clientY / window.innerHeight) * N);
      pointerVel = (e.clientY - lastPointerY) * strength;
      lastPointerY = e.clientY;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    /** Which plate colour belongs at a given fraction of the document. */
    const plateAt = (f: number): RGB | null => {
      const segs = segRef.current;
      for (let i = 0; i < segs.length; i++) {
        if (f >= segs[i].top && f < segs[i].top + segs[i].height) {
          return plates[i % plates.length];
        }
      }
      return null;
    };

    let lastScroll =
      typeof window !== "undefined" ? document.documentElement.scrollTop : 0;
    let frame = 0;

    const step = () => {
      const doc = document.documentElement;
      const total = doc.scrollHeight || 1;
      const seen = Math.min(1, (doc.scrollTop + doc.clientHeight) / total);
      const collar = Math.min(N - 1, Math.floor(seen * N));

      const delta = doc.scrollTop - lastScroll;
      lastScroll = doc.scrollTop;

      if (!reducedMotion) {
        // Splat. Scrolling injects velocity and dye at the collar, so a hard
        // flick sends colour surging ahead of where you actually are and it
        // dissipates back — the bar overshoots the way the fluid does.
        // A jump-scroll — clicking a plate, an anchor, restoring position —
        // arrives as one enormous delta. Clamped, so a jump stirs the column
        // instead of firing dye clean off the end of it.
        vel[collar] += Math.max(-6, Math.min(6, delta * SPLAT_FORCE));
        const c = plateAt(seen);
        if (c) {
          const o = collar * 3;
          dye[o] = Math.min(255, dye[o] + c[0] * 0.5);
          dye[o + 1] = Math.min(255, dye[o + 1] + c[1] * 0.5);
          dye[o + 2] = Math.min(255, dye[o + 2] + c[2] * 0.5);
        }

        if (pointerRow >= 0 && pointerRow < N) {
          vel[pointerRow] += pointerVel * 0.35;
          const pc = plateAt(pointerRow / N);
          if (pc) {
            const o = pointerRow * 3;
            dye[o] = Math.min(255, dye[o] + pc[0] * 0.35);
            dye[o + 1] = Math.min(255, dye[o + 1] + pc[1] * 0.35);
            dye[o + 2] = Math.min(255, dye[o + 2] + pc[2] * 0.35);
          }
          pointerVel *= 0.6;
        }

        // Semi-Lagrangian advection: each cell reads from where its dye came
        // from, one dimension instead of two.
        for (let i = 0; i < N; i++) {
          const src = i - vel[i];
          const i0 = Math.floor(src);
          const t = src - i0;
          const a = Math.max(0, Math.min(N - 1, i0));
          const b = Math.max(0, Math.min(N - 1, i0 + 1));
          for (let k = 0; k < 3; k++) {
            nextDye[i * 3 + k] =
              (dye[a * 3 + k] * (1 - t) + dye[b * 3 + k] * t) * DYE_DECAY;
          }
        }

        // A three-tap smear stands in for diffusion. It is what softens the
        // seam where one plate's dye meets the next.
        for (let i = 0; i < N; i++) {
          const p = Math.max(0, i - 1);
          const n = Math.min(N - 1, i + 1);
          for (let k = 0; k < 3; k++) {
            dye[i * 3 + k] =
              nextDye[i * 3 + k] * 0.7 +
              (nextDye[p * 3 + k] + nextDye[n * 3 + k]) * 0.15;
          }
          vel[i] *= VEL_DECAY;
        }
      }

      // Compose: the plate structure underneath, the dye on top.
      const px = image.data;
      for (let i = 0; i < N; i++) {
        const f = i / N;
        const base = plateAt(f);
        const loaded = f <= seen;
        const o = i * 3;
        const q = i * 4;

        if (base) {
          const weight = loaded ? 1 : 0.28;
          px[q] = base[0] * weight + dye[o] * 0.85;
          px[q + 1] = base[1] * weight + dye[o + 1] * 0.85;
          px[q + 2] = base[2] * weight + dye[o + 2] * 0.85;
          px[q + 3] = 255;
        } else {
          px[q] = dye[o];
          px[q + 1] = dye[o + 1];
          px[q + 2] = dye[o + 2];
          px[q + 3] = 60;
        }
      }
      stripCtx.putImageData(image, 0, 0);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(strip, 0, 0, 1, N, 0, 0, canvas.width, canvas.height);

      // The collar: where the loaded plates stop.
      const y = Math.round(seen * canvas.height);
      // Read once on mount and on theme change, never in the loop: this was
      // forcing a style recalculation on every frame.
      ctx.fillStyle = collarInk;
      ctx.fillRect(0, Math.max(0, y - 1), canvas.width, 2);

      if (pctRef.current)
        pctRef.current.textContent = `${Math.round(seen * 100)}%`;

      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      sizeObserver.disconnect();
      themeObserver.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, [reducedMotion, hasSegments]);

  const jump = (offset: number) => {
    window.scrollTo({ top: Math.max(0, offset - 24), behavior: "smooth" });
  };

  if (segments.length === 0) return null;

  return (
    <nav className="load-bar" aria-label="Page sections">
      <div className="load-bar-track">
        <canvas ref={canvasRef} className="load-bar-canvas" aria-hidden="true" />

        {segments.map((s, i) => (
          <button
            key={`${s.label}-${i}`}
            type="button"
            onClick={() => jump(s.offset)}
            className="load-bar-hit"
            style={{ top: `${s.top * 100}%`, height: `${s.height * 100}%` }}
          >
            <span className="load-bar-label">{s.label}</span>
          </button>
        ))}
      </div>

      <span ref={pctRef} className="load-bar-pct" aria-hidden="true" />
    </nav>
  );
}
