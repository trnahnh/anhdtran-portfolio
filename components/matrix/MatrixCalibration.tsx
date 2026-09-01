"use client";

import { useEffect } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { DATA_H, DATA_W, matrix } from "./matrixStore";
import { drawText } from "./readouts";

/**
 * The opening move.
 *
 * The instrument boots: a sweep crosses the field, the cells self-test, the
 * noise settles to a baseline, and the name resolves out of it. Four beats,
 * about three seconds, and the order is the argument — the machine proves it
 * is working before it says whose machine it is.
 *
 * Shown once per visitor and skippable by any input, the way IntroScreen
 * already behaves. On a first visit the console.log intro types over the top
 * of this rather than competing with it: one is the overlay, one is the
 * substrate, and they finish together.
 */

const STORAGE_KEY = "matrix-calibrated";

const SWEEP_END = 0.9;
const TEST_END = 1.7;
const SETTLE_END = 2.35;
const TOTAL = 3.0;

function hash(x: number, y: number) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

export default function MatrixCalibration() {
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    if (localStorage.getItem(STORAGE_KEY) === "true") return;

    const buf = matrix.pixels;
    matrix.locked = true;

    const start = performance.now();
    let frame = 0;
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      cancelAnimationFrame(frame);
      matrix.locked = false;
      localStorage.setItem(STORAGE_KEY, "true");
      window.removeEventListener("pointerdown", finish);
      window.removeEventListener("keydown", finish);
      window.removeEventListener("wheel", finish);
    };

    window.addEventListener("pointerdown", finish, { passive: true });
    window.addEventListener("keydown", finish);
    window.addEventListener("wheel", finish, { passive: true });

    const step = (now: number) => {
      const t = (now - start) / 1000;
      buf.fill(0);

      if (t < SWEEP_END) {
        // 1. Sweep. A bar crosses the field and wakes the cells behind it.
        const head = (t / SWEEP_END) * DATA_W;
        for (let x = 0; x < DATA_W; x++) {
          if (x > head) continue;
          const trail = Math.max(0, 1 - (head - x) / 26);
          for (let y = 0; y < DATA_H; y++) {
            const lit = hash(x, y) > 0.55 ? 1 : 0.25;
            buf[y * DATA_W + x] = 40 + trail * 190 * lit;
          }
        }
      } else if (t < TEST_END) {
        // 2. Self-test. Every cell is exercised, at speed.
        const seed = Math.floor(t * 26);
        for (let y = 0; y < DATA_H; y++) {
          for (let x = 0; x < DATA_W; x++) {
            const h = hash(x + seed * 13, y - seed * 7);
            buf[y * DATA_W + x] = h > 0.62 ? 60 + h * 190 : 0;
          }
        }
      } else if (t < SETTLE_END) {
        // 3. Settle. The noise decays onto a baseline.
        const k = (t - TEST_END) / (SETTLE_END - TEST_END);
        const seed = Math.floor(t * 20);
        const floorRow = Math.round(DATA_H * 0.5);
        for (let y = 0; y < DATA_H; y++) {
          for (let x = 0; x < DATA_W; x++) {
            const h = hash(x + seed * 13, y - seed * 7);
            const noise = h > 0.62 ? (60 + h * 190) * (1 - k) : 0;
            const pull = Math.abs(y - floorRow) < 1 ? 210 * k : 0;
            buf[y * DATA_W + x] = Math.max(noise, pull);
          }
        }
      } else {
        // 4. Resolve. The name comes out of the baseline.
        const k = Math.min(1, (t - SETTLE_END) / (TOTAL - SETTLE_END));
        const floorRow = Math.round(DATA_H * 0.5);
        const spread = Math.round(k * DATA_W * 0.5);
        for (let x = 0; x < DATA_W; x++) {
          const d = Math.abs(x - DATA_W / 2);
          if (d > DATA_W / 2 - spread) continue;
          buf[floorRow * DATA_W + x] = 210 * (1 - k);
        }
        const text = new Uint8Array(DATA_W * DATA_H);
        // Sized to survive downsampling to the on-screen grid: the field is
        // mapped across however many cells fit, so type authored small in the
        // buffer arrives as mush on a narrow screen.
        drawText(text, "ANH TRAN", { size: 19, y: Math.round(DATA_H * 0.5) });
        for (let i = 0; i < buf.length; i++) {
          buf[i] = Math.max(buf[i], text[i] * k);
        }
      }

      matrix.dirty = true;

      if (t >= TOTAL) {
        finish();
        return;
      }
      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return finish;
  }, [reducedMotion]);

  return null;
}
