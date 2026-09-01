import { DATA_H, DATA_W } from "./matrixStore";

/**
 * Readout renderers.
 *
 * Each writes a greyscale field into a DATA_W x DATA_H buffer. Row 0 is the
 * bottom of the screen — the shader's cell.y counts up from gl_FragCoord.y —
 * so charts are authored the way charts are read, and text is flipped once on
 * rasterisation rather than every renderer having to think about it.
 */

export type ReadoutKind =
  | "idle"
  | "wave"
  | "timeline"
  | "histogram"
  | "decay"
  | "curve"
  | "heatmap"
  | "cipher"
  | "blocks";

const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v | 0);

function put(buf: Uint8Array, x: number, y: number, v: number) {
  if (x < 0 || y < 0 || x >= DATA_W || y >= DATA_H) return;
  const i = y * DATA_W + x;
  if (buf[i] < v) buf[i] = clamp255(v);
}

function column(buf: Uint8Array, x: number, height: number, v: number) {
  for (let y = 0; y < height; y++) put(buf, x, y, v);
}

/** Deterministic per-cell noise, so a field looks the same on every render. */
function hash(x: number, y: number) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

/* -------------------------------------------------------------------------
   Text
   ---------------------------------------------------------------------- */

let textCanvas: HTMLCanvasElement | null = null;

/**
 * Rasterise a line of type into the field using the site's own mono face,
 * rather than a hand-rolled bitmap font. One offscreen draw per text change.
 */
export function drawText(
  buf: Uint8Array,
  text: string,
  opts: { size?: number; y?: number; align?: "left" | "center"; x?: number } = {},
): void {
  if (typeof document === "undefined") return;
  const { size = 11, y = 36, align = "center", x = 4 } = opts;

  if (!textCanvas) {
    textCanvas = document.createElement("canvas");
    textCanvas.width = DATA_W;
    textCanvas.height = DATA_H;
  }
  const ctx = textCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;

  ctx.clearRect(0, 0, DATA_W, DATA_H);
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  // Canvas cannot resolve a CSS custom property in `font`, so read the
  // family list off the document first and fall back if it is not there yet.
  const family =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--font-jetbrains")
      .trim() || "ui-monospace";
  ctx.font = `700 ${size}px ${family}, ui-monospace, monospace`;
  ctx.textAlign = align === "center" ? "center" : "left";
  // Canvas y grows downward; the field's y grows upward.
  ctx.fillText(text, align === "center" ? DATA_W / 2 : x, DATA_H - y);

  const px = ctx.getImageData(0, 0, DATA_W, DATA_H).data;
  for (let row = 0; row < DATA_H; row++) {
    for (let col = 0; col < DATA_W; col++) {
      const a = px[(row * DATA_W + col) * 4 + 3];
      if (a > 24) put(buf, col, DATA_H - 1 - row, a);
    }
  }
}

/* -------------------------------------------------------------------------
   Fields
   ---------------------------------------------------------------------- */

/** Nothing to report. A slow drift, so the instrument is plainly still on. */
export function drawIdle(buf: Uint8Array, t: number): void {
  for (let x = 0; x < DATA_W; x++) {
    const h = 2 + Math.sin(x * 0.09 + t * 0.5) * 1.6 + Math.sin(x * 0.031 - t * 0.31) * 1.2;
    column(buf, x, Math.max(1, Math.round(h)), 70);
  }
}

/** Home: an audio field. Real amplitudes when Spotify is playing. */
export function drawWave(buf: Uint8Array, t: number, energy = 0.35): void {
  const mid = DATA_H * 0.5;
  for (let x = 0; x < DATA_W; x++) {
    const phase = x * 0.16;
    const a =
      Math.sin(phase + t * 2.1) * 0.5 +
      Math.sin(phase * 0.47 - t * 1.3) * 0.32 +
      Math.sin(phase * 1.9 + t * 3.4) * 0.18;
    const half = Math.abs(a) * energy * DATA_H * 0.42;
    for (let y = Math.round(mid - half); y <= Math.round(mid + half); y++) {
      put(buf, x, y, 150);
    }
  }
}

/** Experience: roles as bands across real dates. Density, not decoration. */
export function drawTimeline(
  buf: Uint8Array,
  bands: { start: number; end: number; row: number; weight: number }[],
): void {
  for (const b of bands) {
    const x0 = Math.round(b.start * (DATA_W - 1));
    const x1 = Math.round(b.end * (DATA_W - 1));
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
      for (let dy = 0; dy < 3; dy++) put(buf, x, b.row + dy, b.weight);
    }
  }
}

/** Ferrox: a latency distribution. Long tail to the right, as latency is. */
export function drawHistogram(buf: Uint8Array, t: number): void {
  const peak = DATA_W * 0.22;
  for (let x = 0; x < DATA_W; x++) {
    const d = (x - peak) / (DATA_W * 0.16);
    const gauss = Math.exp(-d * d * 0.5);
    const tail = x > peak ? Math.exp(-(x - peak) / (DATA_W * 0.55)) * 0.34 : 0;
    const jitter = 1 + Math.sin(x * 0.7 + t * 1.4) * 0.05;
    const h = (gauss + tail) * jitter * DATA_H * 0.78;
    column(buf, x, Math.round(h), 180);
  }
}

/** Draft-Thinker: cost collapsing 91.6%, with the baseline it collapsed from. */
export function drawDecay(buf: Uint8Array, t: number): void {
  const baseline = Math.round(DATA_H * 0.82);
  for (let x = 0; x < DATA_W; x += 2) put(buf, x, baseline, 60);

  const knee = DATA_W * 0.3;
  for (let x = 0; x < DATA_W; x++) {
    const k = x < knee ? 1 : Math.exp(-(x - knee) / (DATA_W * 0.17));
    const y = Math.round(DATA_H * 0.08 + k * DATA_H * 0.74);
    put(buf, x, y, 220);
    put(buf, x, y - 1, 120);
    // The gap between plan and outcome is the claim; shade it.
    for (let f = y + 1; f < baseline; f += 3) put(buf, x, f, 26);
  }
  const cursor = Math.round(((t * 0.22) % 1) * (DATA_W - 1));
  for (let y = 0; y < DATA_H; y += 2) put(buf, cursor, y, 40);
}

/** RG2026: an ROC curve above the no-skill diagonal. AUC 0.714. */
export function drawCurve(buf: Uint8Array): void {
  for (let i = 0; i < DATA_W; i++) {
    const y = Math.round((i / (DATA_W - 1)) * (DATA_H - 1));
    if (i % 3 === 0) put(buf, i, y, 48);
  }
  for (let i = 0; i < DATA_W * 2; i++) {
    const fpr = i / (DATA_W * 2 - 1);
    const tpr = Math.pow(fpr, 0.46); // integrates to roughly 0.71
    put(buf, Math.round(fpr * (DATA_W - 1)), Math.round(tpr * (DATA_H - 1)), 215);
  }
}

/** commma: a keyboard heatmap, staggered the way a keyboard is. */
export function drawHeatmap(buf: Uint8Array, t: number): void {
  const rows = 4;
  const cols = 13;
  const kw = Math.floor(DATA_W / (cols + 2));
  const kh = Math.floor(DATA_H / (rows + 2));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const heat = hash(c, r);
      const pulse = 0.85 + Math.sin(t * 1.6 + c * 0.6 + r) * 0.15;
      const v = heat * heat * 255 * pulse;
      const ox = Math.floor(kw * (c + 1) + r * kw * 0.35);
      const oy = Math.floor(kh * (rows - r));
      for (let y = 0; y < kh - 1; y++) {
        for (let x = 0; x < kw - 1; x++) put(buf, ox + x, oy + y, v);
      }
    }
  }
}

/** Dasi: ciphertext. Blocks that mean nothing, which is the point. */
export function drawCipher(buf: Uint8Array, t: number): void {
  const step = 4;
  const drift = Math.floor(t * 2) % 7;
  for (let y = 0; y < DATA_H; y += step) {
    for (let x = 0; x < DATA_W; x += step) {
      const h = hash(x + drift, y);
      if (h < 0.42) continue;
      const v = 40 + h * 150;
      for (let dy = 0; dy < step - 1; dy++)
        for (let dx = 0; dx < step - 1; dx++) put(buf, x + dx, y + dy, v);
    }
  }
}

/** AnyuDock: object storage. A board that fills on a diagonal. */
export function drawBlocks(buf: Uint8Array, t: number): void {
  const cols = 16;
  const rows = 9;
  const bw = Math.floor(DATA_W / cols);
  const bh = Math.floor(DATA_H / rows);
  const front = ((t * 0.35) % 1.6) * (cols + rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (c + r > front) continue;
      const v = hash(c, r) > 0.45 ? 175 : 55;
      for (let y = 0; y < bh - 1; y++)
        for (let x = 0; x < bw - 1; x++) put(buf, c * bw + x, r * bh + y, v);
    }
  }
}
