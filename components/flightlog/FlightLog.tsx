"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { ARRIVED, LEGS, type Place } from "@/lib/data/journey";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { drawGlobe, type Palette } from "./globe";
import VarsityCards from "./VarsityCards";

/**
 * The route here, as a flight log: a compact list of legs beside a globe
 * that flies between them.
 *
 * While the section is in view the globe plays the trip on a loop, holding
 * on each leg long enough to read it, resting in Cincinnati, then rewinding
 * to Hue. Picking a leg takes over and flies straight there; the loop picks
 * up again from that leg after a few idle seconds. It pauses off-screen.
 * Reduced motion skips all of it: the globe shows the finished route and
 * cuts between legs when one is picked.
 */

const LAST = LEGS.length - 1;
// How long the tour lingers on each leg before flying on.
const DWELL_MS = 1100;
// Resting on the present before rewinding to the start.
const LANDED_MS = 3500;
// How long a picked leg holds before the loop takes back over.
const RESUME_MS = 7000;
// Short hops, and the one across the Pacific, which deserves the time.
const HOP_MS = 900;
const LONG_HAUL_MS = 2400;

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** Time for the leg from stage i to i + 1, alone or as part of a longer flight. */
function legMs(i: number, through: boolean) {
  const long = LEGS[i].place.region !== LEGS[i + 1].place.region;
  if (!through) return long ? LONG_HAUL_MS : HOP_MS;
  return long ? LONG_HAUL_MS * 0.75 : HOP_MS / 2;
}

/**
 * A flight from stage `from` to `to` (either may be fractional), as its
 * length and a map from eased progress to stage. Every leg crossed gets a
 * share of the trip in proportion to its own time, so the rewind spends its
 * time on the Pacific rather than flashing across it at peak speed while the
 * short Hue hops eat the rest.
 */
function flightPath(from: number, to: number) {
  const dir = Math.sign(to - from);
  const pieces: { a: number; b: number; ms: number }[] = [];
  const through = Math.abs(to - from) > 1;
  for (let a = from; a !== to; ) {
    const b = dir > 0 ? Math.min(to, Math.floor(a) + 1) : Math.max(to, Math.ceil(a) - 1);
    pieces.push({ a, b, ms: legMs(Math.floor(Math.min(a, b)), through) * Math.abs(b - a) });
    a = b;
  }
  const ms = pieces.reduce((sum, p) => sum + p.ms, 0);
  const at = (e: number) => {
    let d = e * ms;
    for (const p of pieces) {
      if (d <= p.ms) return p.a + (p.b - p.a) * (d / p.ms);
      d -= p.ms;
    }
    return to;
  };
  return { ms, at };
}

function coords({ lat, lon }: Place) {
  return [
    `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? "N" : "S"}`,
    `${Math.abs(lon).toFixed(2)}°${lon >= 0 ? "E" : "W"}`,
  ];
}

function cssVar(style: CSSStyleDeclaration, name: string, fallback: string) {
  const v = style.getPropertyValue(name).trim();
  return v && !v.includes("var(") ? v : fallback;
}

/** T+ days and a clock since landing, written straight to the node. */
function Elapsed() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const paint = () => {
      if (!ref.current) return;
      const s = Math.max(0, Math.floor((Date.now() - ARRIVED.getTime()) / 1000));
      const d = Math.floor(s / 86400);
      ref.current.textContent = `T+ ${d}d ${pad(Math.floor((s % 86400) / 3600))}:${pad(
        Math.floor((s % 3600) / 60),
      )}:${pad(s % 60)}`;
    };
    paint();
    const id = setInterval(paint, 1000);
    return () => clearInterval(id);
  }, []);

  // Ticking every second is noise to a screen reader; the dates say it.
  return <span ref={ref} aria-hidden="true" className="tabular-nums" />;
}

export default function FlightLog() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef(0);
  const drawRef = useRef<() => void>(() => {});
  // Cuts the flight in progress short, settling its promise as false so
  // whatever awaits it can stand down instead of hanging.
  const stopRef = useRef<() => void>(() => {});
  const resumeRef = useRef(0);
  const inViewRef = useRef(false);
  // Bumped by anything that takes over the globe, so a running tour knows
  // to stand down.
  const runRef = useRef(0);
  const [active, setActive] = useState(0);
  const [touring, setTouring] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const show = useCallback((stage: number) => {
    stageRef.current = stage;
    setActive(Math.round(stage));
    drawRef.current();
  }, []);

  /** Fly to a stage. Resolves true on arrival, false if cut short. */
  const fly = useCallback(
    (to: number) =>
      new Promise<boolean>((resolve) => {
        stopRef.current();
        const from = stageRef.current;
        if (reducedMotion || from === to) {
          show(to);
          resolve(true);
          return;
        }
        const path = flightPath(from, to);
        const start = performance.now();
        let frame = 0;
        const settle = (arrived: boolean) => {
          stopRef.current = () => {};
          resolve(arrived);
        };
        const step = (now: number) => {
          const t = Math.min(1, (now - start) / path.ms);
          show(path.at(easeInOut(t)));
          if (t < 1) frame = requestAnimationFrame(step);
          else settle(true);
        };
        stopRef.current = () => {
          cancelAnimationFrame(frame);
          settle(false);
        };
        frame = requestAnimationFrame(step);
      }),
    [reducedMotion, show],
  );

  /**
   * The trip on a loop, leg by leg from wherever the globe is, or from
   * `from` when given. Runs until something bumps runRef.
   */
  const tour = useCallback(
    async (from?: number) => {
      const run = ++runRef.current;
      const alive = () => run === runRef.current;
      setTouring(true);
      let i = from ?? Math.round(stageRef.current);
      // Settle on a whole leg first: flown to, not cut to, whether the
      // replay asked for Hue or the loop was paused between two legs.
      if (!(await fly(i))) return;
      while (alive()) {
        await new Promise((r) => setTimeout(r, i === LAST ? LANDED_MS : DWELL_MS));
        if (!alive()) return;
        const next = i === LAST ? 0 : i + 1;
        if (!(await fly(next))) return;
        i = next;
      }
    },
    [fly],
  );

  /** Stops whatever tour, flight or pending resume is running. */
  const halt = useCallback(() => {
    runRef.current++;
    stopRef.current();
    clearTimeout(resumeRef.current);
  }, []);

  const pick = (i: number) => {
    halt();
    setTouring(false);
    fly(i);
    // Off-screen by then, the loop waits for the section to come back.
    if (!reducedMotion) {
      resumeRef.current = window.setTimeout(() => inViewRef.current && tour(), RESUME_MS);
    }
  };

  // The canvas: size, inks, and a draw function the tweens call.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let palette: Palette;
    const readPalette = () => {
      const root = getComputedStyle(document.documentElement);
      palette = {
        ink: cssVar(root, "--readout", "#83868f"),
        strong: cssVar(root, "--readout-strong", "#fafaf9"),
        signal: cssVar(root, "--signal", "#f2555f"),
        rule: cssVar(root, "--plate-chrome", "#8d9197"),
        font: getComputedStyle(canvas).fontFamily,
      };
    };
    readPalette();

    let w = 0;
    let h = 0;
    drawRef.current = () => {
      if (w) drawGlobe(ctx, w, h, stageRef.current, palette);
    };

    const resize = new ResizeObserver(([entry]) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = entry.contentRect.width;
      h = entry.contentRect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawRef.current();
    });
    resize.observe(canvas);

    // The theme toggle swaps a class on <html>; the canvas has to repaint
    // with the new inks itself.
    const theme = new MutationObserver(() => {
      readPalette();
      drawRef.current();
    });
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    // Pin labels wait for the mono face, or the first frame falls back.
    document.fonts?.ready.then(() => {
      readPalette();
      drawRef.current();
    });

    return () => {
      resize.disconnect();
      theme.disconnect();
      drawRef.current = () => {};
    };
  }, []);

  // The loop runs only while the globe is properly in view, and picks up
  // where it left off. Reduced motion cuts to the finished route once.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let seen = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        inViewRef.current = entry.isIntersecting;
        if (reducedMotion) {
          if (entry.isIntersecting && !seen) show(LAST);
        } else if (entry.isIntersecting) tour();
        else {
          halt();
          setTouring(false);
        }
        seen ||= entry.isIntersecting;
      },
      { threshold: 0.5 },
    );
    io.observe(root);
    return () => {
      io.disconnect();
      halt();
    };
  }, [reducedMotion, show, tour, halt]);

  const here = LEGS[active].place;

  return (
    <div className="space-y-8">
      <div
        ref={rootRef}
        className="grid items-center gap-y-6 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-x-8"
      >
        <div className="mx-auto w-full max-w-64 sm:max-w-none">
          <canvas
            ref={canvasRef}
            role="img"
            aria-label="A globe tracing the route from Hue to Hanoi, back to Hue, then across the Pacific to Cincinnati."
            className="block aspect-square w-full font-mono"
          />
          <div className="mt-3 flex items-center justify-center gap-3 font-mono text-xs uppercase tracking-[0.1em] text-readout tabular-nums">
            <span aria-hidden="true" className="text-readout-strong">
              {here.code}
            </span>
            {coords(here).map((c) => (
              <span key={c} aria-hidden="true">
                {c}
              </span>
            ))}
            {!reducedMotion && (
              <button
                type="button"
                onClick={() => tour(0)}
                disabled={touring}
                aria-label="Replay the route"
                title="Replay the route"
                className="-m-1.5 rounded p-1.5 transition-colors duration-[var(--dur-tap)] hover:text-readout-strong disabled:opacity-0 focus-visible:outline-2 focus-visible:outline-plate-25"
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        <ol className="relative">
          {/* The spine. */}
          <span
            aria-hidden="true"
            className="absolute left-[3px] top-4 bottom-4 w-px bg-rule"
          />
          {LEGS.map((leg, i) => {
            const on = i === active;
            const isCity = leg.kind === "origin" || leg.kind === "childhood";
            return (
              <li key={i} aria-current={on ? "step" : undefined}>
                <button
                  type="button"
                  onClick={() => pick(i)}
                  className={`group relative block w-full rounded-md py-2 pl-6 pr-2 text-left transition-[opacity,background-color] duration-[var(--dur-quick)] hover:bg-black/5 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-plate-25 dark:hover:bg-white/5 ${
                    on ? "opacity-100" : "opacity-50"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`absolute left-0 top-[13px] size-[7px] rounded-full border transition-colors duration-[var(--dur-quick)] ${
                      on ? "border-signal bg-signal" : "border-readout bg-background"
                    }`}
                  />
                  <span className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                    <span className="text-base font-medium leading-snug">
                      {isCity ? `${leg.place.city}, ${leg.place.region}` : leg.title}
                    </span>
                    <span className="whitespace-nowrap font-mono text-xs uppercase tracking-[0.1em] text-readout">
                      {leg.place.code} &middot;{" "}
                      <span className="text-readout-strong">{leg.when}</span>
                      {leg.kind === "now" && (
                        <span
                          aria-hidden="true"
                          className="ml-1.5 inline-block size-1.5 rounded-full bg-signal align-middle motion-safe:animate-pulse"
                        />
                      )}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">
                    {isCity ? leg.title : `${leg.place.city}, ${leg.place.region}`}
                    {leg.kind === "now" && (
                      <>
                        <span className="mx-1.5" aria-hidden="true">
                          &middot;
                        </span>
                        <span className="font-mono text-xs text-readout">
                          <Elapsed />
                        </span>
                      </>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="border-t border-rule pt-5">
        <VarsityCards />
      </div>
    </div>
  );
}
