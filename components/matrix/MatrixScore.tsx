"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { subscribeSpotify } from "@/lib/spotifyStore";
import { DATA_H, DATA_W, matrix } from "./matrixStore";
import {
  drawBlocks,
  drawCipher,
  drawCurve,
  drawDecay,
  drawHeatmap,
  drawHistogram,
  drawIdle,
  drawTimeline,
  drawWave,
  type ReadoutKind,
} from "./readouts";

/**
 * The score.
 *
 * Sections declare what the instrument shows while they are being read, via
 * `data-matrix="<kind>"`. This picks whichever declared section occupies most
 * of the viewport, renders its readout into a target buffer, and eases the
 * live field toward it — so the matrix retunes between rooms instead of
 * cutting, which is what a persistent scene is for.
 *
 * Renders nothing.
 */

const TARGET_FPS = 20;
const EASE = 0.14;

/**
 * Module scope on purpose. A route change remounts the effect, and a target
 * allocated per mount would start empty — the field would ease down to nothing
 * and climb back, which reads as a cut. Held here, the matrix retunes from
 * whatever the last room left on it.
 */
const target = new Uint8Array(DATA_W * DATA_H);

export default function MatrixScore() {
  const pathname = usePathname();
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (pathname === "/profile") return; // SplashCursor's room

    const ratios = new Map<Element, number>();
    let kind: ReadoutKind = "idle";
    let energy = 0.3;

    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>("[data-matrix]"),
    );

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratios.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0);
        }
        let best: Element | null = null;
        let bestRatio = 0;
        for (const [el, ratio] of ratios) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            best = el;
          }
        }
        const next = (best as HTMLElement | null)?.dataset.matrix as
          | ReadoutKind
          | undefined;
        kind = next ?? "idle";
      },
      { threshold: [0, 0.15, 0.35, 0.6, 0.85, 1] },
    );
    nodes.forEach((n) => observer.observe(n));

    // The one live feed, through the shared store so the rail and the matrix
    // share a single poll rather than each running their own.
    const unsubscribeSpotify = subscribeSpotify((track) => {
      energy = track.isPlaying ? 0.85 : 0.3;
    });

    const render = (t: number) => {
      target.fill(0);
      switch (kind) {
        case "wave":
          drawWave(target, t, energy);
          break;
        case "timeline":
          drawTimeline(target, TIMELINE_BANDS);
          break;
        case "histogram":
          drawHistogram(target, t);
          break;
        case "decay":
          drawDecay(target, t);
          break;
        case "curve":
          drawCurve(target);
          break;
        case "heatmap":
          drawHeatmap(target, t);
          break;
        case "cipher":
          drawCipher(target, t);
          break;
        case "blocks":
          drawBlocks(target, t);
          break;
        default:
          drawIdle(target, t);
      }
    };

    const start = performance.now();
    let frame = 0;
    let lastRender = 0;

    const step = (now: number) => {
      frame = requestAnimationFrame(step);
      if (matrix.locked) return; // calibration owns the field

      const t = (now - start) / 1000;
      if (now - lastRender > 1000 / TARGET_FPS) {
        render(t);
        lastRender = now;
      }

      // Ease the live field toward the target. Uint8 truncates, so snap the
      // last couple of levels or a channel can stall one step short.
      const cur = matrix.pixels;
      for (let i = 0; i < cur.length; i++) {
        const d = target[i] - cur[i];
        if (d === 0) continue;
        cur[i] = Math.abs(d) < 3 ? target[i] : cur[i] + d * EASE;
      }
      matrix.dirty = true;
    };

    if (reducedMotion) {
      render(0);
      matrix.pixels.set(target);
      matrix.dirty = true;
    } else {
      frame = requestAnimationFrame(step);
    }

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      unsubscribeSpotify();
    };
  }, [pathname, reducedMotion]);

  return null;
}

/**
 * Experience as bands. Derived from the real status field on each role —
 * past roles to the left, current through the middle, incoming at the edge.
 * Coarse by construction: the data has statuses, not dates, so this says
 * exactly as much as the data actually knows.
 */
const TIMELINE_BANDS = [
  { start: 0.02, end: 0.34, row: 8, weight: 90 },
  { start: 0.06, end: 0.4, row: 16, weight: 90 },
  { start: 0.1, end: 0.46, row: 24, weight: 90 },
  { start: 0.12, end: 0.52, row: 32, weight: 90 },
  { start: 0.34, end: 0.86, row: 40, weight: 175 },
  { start: 0.4, end: 0.86, row: 48, weight: 175 },
  { start: 0.46, end: 0.86, row: 56, weight: 175 },
  { start: 0.88, end: 0.99, row: 64, weight: 235 },
];
