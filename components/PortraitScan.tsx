"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { matrix } from "@/components/matrix/matrixStore";

/**
 * The opening move: the instrument scans its subject.
 *
 * A point cloud of the portrait — head and shoulders, cut out and given depth
 * offline by scripts/build-portrait-scan.py — is revealed by a vertical plane
 * sweeping left to right through the volume. Nothing exists ahead of the
 * plane. Cells flare to the accent as it passes and decay to ink behind it.
 * The camera yaws slowly across the whole opening so the depth is visible on
 * every device without input; a pointer adds parallax where one exists.
 *
 * Then the volume collapses: depth eases to zero and every 2x2 group of cloud
 * points converges onto one cell of the instrument matrix's grid, exactly
 * aligned, so the measurement snaps to the readout's resolution. The flat
 * silhouette re-purposes its cells into the name, drawn in true on-screen
 * cells, holds, and the overlay fades while the header's own name settles.
 *
 * Shown once per visitor, skippable by any input. Reduced motion or no WebGL
 * shows nothing extra. The page's arrival animations are paused behind the
 * backdrop by a class on <html> and released at the handoff.
 */

export const SCAN_STORAGE_KEY = "portrait-scanned";
const ASSET = "/profile/portrait-scan.png";
const HTML_CLASS = "scanning";

// Same rule as InstrumentMatrix, so the two canvases share a pixel grid.
const CELL_MOBILE = 8;
const CELL_DESKTOP = 13;

// Beats, in seconds. The order is the argument.
const SCAN = 1.2;
const HOLD = 0.8;
const COLLAPSE = 0.8;
const NAME_IN = 0.4;
const NAME_HOLD = 0.5;
const FADE = 0.4;
const T_SCAN = SCAN;
const T_HOLD = T_SCAN + HOLD;
const T_COLLAPSE = T_HOLD + COLLAPSE;
const T_NAME = T_COLLAPSE + NAME_IN;
const T_RELEASE = T_NAME + NAME_HOLD;
const TOTAL = T_RELEASE + FADE;

// Camera and volume.
const FOV = (35 * Math.PI) / 180;
const CAM_D = 10;
const YAW = (14 * Math.PI) / 180; // authored sweep, -YAW to +YAW
const POINTER_YAW = (6 * Math.PI) / 180;
const POINTER_PITCH = (3 * Math.PI) / 180;
const DEPTH_EXTENT = 0.42; // z range as a fraction of the cloud's height

// Fit: the cloud's share of the viewport.
const FIT_H = 0.7;
const FIT_W = 0.86;
const CENTRE_Y = 0.47; // from the top

const ASSET_WAIT_MS = 2500;

const VERT = `
attribute vec3  aPos;     // cloud cells, centred; z is depth 0..1 minus 0.5
attribute vec2  aTarget;  // NDC of the matrix cell this point lands on
attribute float aLead;    // 1 for the point that survives the 2x2 merge
attribute float aSeed;    // per-point hash, for staggers

uniform mat4  uProj;
uniform float uScale;     // world units per cloud cell
uniform float uDepth;     // z extent in cloud cells
uniform float uYaw;
uniform float uPitch;
uniform float uCamD;
uniform float uHead;      // scan plane, in cloud-cell x
uniform float uCollapse;  // 0 volume .. 1 flat on the grid
uniform float uSil;       // 0 .. 1, silhouette handing its cells to the name
uniform float uNameK;     // 0 .. 1, name resolving
uniform float uFade;      // 1 .. 0 at the very end
uniform float uPointPx;   // cloud point size, device px, at the camera plane
uniform float uCellPx;    // matrix cell size, device px
uniform float uMode;      // 0 cloud, 1 name

varying float vV;
varying float vA;

void main() {
  if (uMode > 0.5) {
    // Name cells: already flat, intensity in aPos.z, staggered arrival.
    float k = smoothstep(aSeed * 0.6, aSeed * 0.6 + 0.4, uNameK);
    vV = aPos.z * k;
    vA = uFade;
    gl_Position = vec4(aTarget, 0.0, 1.0);
    gl_PointSize = uCellPx * 0.8;
    return;
  }

  float k = uCollapse;
  vec3 p = vec3(aPos.x, aPos.y, aPos.z * uDepth * (1.0 - k)) * uScale;

  float c = cos(uYaw), s = sin(uYaw);
  vec3 r = vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
  float cp = cos(uPitch), sp = sin(uPitch);
  r = vec3(r.x, cp * r.y - sp * r.z, sp * r.y + cp * r.z);

  vec4 clip = uProj * vec4(r, 1.0);
  vec2 ndc = clip.xy / clip.w;
  gl_Position = vec4(mix(ndc, aTarget, k), 0.0, 1.0);

  float size = uPointPx * (uCamD / clip.w);
  gl_PointSize = mix(size, aLead * uCellPx * 0.8, k);

  // The scan plane, in model space, so it wraps over the face on screen.
  float d = uHead - aPos.x;
  float passed = step(0.0, d);
  float flare = exp(-max(d, 0.0) * 0.9);
  float comb = (0.5 + 0.5 * cos(d * 6.2832 / 3.0)) * exp(-max(d, 0.0) / 9.0);
  float depthN = aPos.z + 0.5;
  float base = mix(0.28 + 0.32 * depthN, 0.5, k);
  vV = clamp(base + comb * 0.45 + flare * 1.2, 0.0, 1.0);

  // Non-lead points fade as they converge; the silhouette hands off staggered.
  float sil = 1.0 - smoothstep(aSeed * 0.6, aSeed * 0.6 + 0.4, uSil);
  vA = passed * mix(1.0, aLead, k) * sil * uFade;
}
`;

const FRAG = `
precision mediump float;
uniform vec3 uInk;
uniform vec3 uAccent;
varying float vV;
varying float vA;
void main() {
  float a = vV * vA;
  vec3 ink = mix(uInk, uAccent, smoothstep(0.55, 1.0, vV));
  gl_FragColor = vec4(ink * a, a);
}
`;

const STRIDE = 7; // floats per point

type Asset = { w: number; h: number; mask: Uint8ClampedArray; depth: Uint8ClampedArray };

type Layout = {
  cloud: Float32Array;
  name: Float32Array | null;
  gridW: number;
  gridH: number;
  centreRow: number;
  ndcX: (mx: number) => number;
  ndcY: (my: number) => number;
  count: number;
  leads: number;
  cols: number;
  rows: number;
  cellPx: number;
  pointPx: number;
  scale: number;
  depth: number;
  proj: Float32Array;
  captionTop: number; // CSS px
};

function hash(x: number, y: number) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function easeInOut(t: number) {
  t = Math.min(1, Math.max(0, t));
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function clamp01(t: number) {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

function readColor(name: string, fallback: [number, number, number]) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const m = /^#([0-9a-f]{6})$/i.exec(raw);
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255] as [
    number,
    number,
    number,
  ];
}

function perspective(fovy: number, aspect: number, near: number, far: number) {
  const f = 1 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);
  // Column-major, with the view translation (camera at +CAM_D) folded in.
  const m = new Float32Array(16);
  m[0] = f / aspect;
  m[5] = f;
  m[10] = (far + near) * nf;
  m[11] = -1;
  m[14] = 2 * far * near * nf;
  // translate(0, 0, -CAM_D) on the right: column 3 += column 2 * -CAM_D
  m[12] += m[8] * -CAM_D;
  m[13] += m[9] * -CAM_D;
  m[14] += m[10] * -CAM_D;
  m[15] += m[11] * -CAM_D;
  return m;
}

function loadAsset(src: string, timeoutMs: number): Promise<Asset | null> {
  return new Promise((resolve) => {
    const img = new Image();
    let done = false;
    const finish = (a: Asset | null) => {
      if (done) return;
      done = true;
      resolve(a);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    img.onload = () => {
      clearTimeout(timer);
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      if (!ctx) return finish(null);
      ctx.drawImage(img, 0, 0);
      const px = ctx.getImageData(0, 0, c.width, c.height).data;
      const n = c.width * c.height;
      const mask = new Uint8ClampedArray(n);
      const depth = new Uint8ClampedArray(n);
      for (let i = 0; i < n; i++) {
        mask[i] = px[i * 4];
        depth[i] = px[i * 4 + 1];
      }
      finish({ w: c.width, h: c.height, mask, depth });
    };
    img.onerror = () => {
      clearTimeout(timer);
      finish(null);
    };
    img.src = src;
  });
}

/**
 * Lay the cloud out for a viewport. Everything is derived from the matrix's
 * own cell grid so that the collapse lands cell on cell.
 */
function layout(asset: Asset, cssW: number, cssH: number, dpr: number): Layout {
  const cellCss = cssW < 640 ? CELL_MOBILE : CELL_DESKTOP;
  const cellPx = cellCss * dpr;
  const W = Math.floor(cssW * dpr);
  const H = Math.floor(cssH * dpr);
  const gridW = Math.max(1, Math.floor(W / cellPx));
  const gridH = Math.max(1, Math.floor(H / cellPx));

  // Contain-fit, in whole matrix cells, so 2x2 blocks stay aligned.
  const aspect = asset.w / asset.h;
  const targetH = Math.min(cssH * FIT_H, (cssW * FIT_W) / aspect);
  const mrows = Math.max(2, Math.floor(targetH / cellCss));
  const mcols = Math.max(2, Math.floor(mrows * aspect));
  const rows = mrows * 2;
  const cols = mcols * 2;
  const ox = Math.floor((gridW - mcols) / 2);
  const oy = Math.floor(gridH * (1 - CENTRE_Y) - mrows / 2);

  const ndcX = (mx: number) => (((mx + 0.5) * cellPx) / W) * 2 - 1;
  const ndcY = (my: number) => (((my + 0.5) * cellPx) / H) * 2 - 1;

  const pts: number[] = [];
  const leadTaken = new Uint8Array(mcols * mrows);
  let leads = 0;
  for (let j = 0; j < rows; j++) {
    const v = 1 - (j + 0.5) / rows; // asset rows run top-down
    const ay = Math.min(asset.h - 1, Math.floor(v * asset.h));
    for (let i = 0; i < cols; i++) {
      const u = (i + 0.5) / cols;
      const ax = Math.min(asset.w - 1, Math.floor(u * asset.w));
      const idx = ay * asset.w + ax;
      if (asset.mask[idx] < 128) continue;
      const bi = (j >> 1) * mcols + (i >> 1);
      let lead = 0;
      if (!leadTaken[bi]) {
        leadTaken[bi] = 1;
        lead = 1;
        leads++;
      }
      pts.push(
        i - cols / 2 + 0.5,
        j - rows / 2 + 0.5,
        asset.depth[idx] / 255 - 0.5,
        ndcX(ox + (i >> 1)),
        ndcY(oy + (j >> 1)),
        lead,
        hash(i, j),
      );
    }
  }

  // World scale so a cloud cell projects to exactly half a matrix cell at
  // the camera plane. Perspective then does the rest.
  const scale = (cellPx * CAM_D * Math.tan(FOV / 2)) / H;
  const proj = perspective(FOV, W / H, 1, 40);

  const cloudBottomCss = (H - oy * cellPx) / dpr;

  return {
    cloud: new Float32Array(pts),
    name: null,
    gridW,
    gridH,
    centreRow: oy + mrows / 2,
    ndcX,
    ndcY,
    count: pts.length / STRIDE,
    leads,
    cols,
    rows,
    cellPx,
    pointPx: cellPx * 0.5 * 0.8,
    scale,
    depth: rows * DEPTH_EXTENT,
    proj,
    captionTop: cloudBottomCss + 14,
  };
}

function rasterName(
  gridW: number,
  gridH: number,
  centreRow: number,
  ndcX: (mx: number) => number,
  ndcY: (my: number) => number,
): Float32Array {
  const c = document.createElement("canvas");
  c.width = gridW;
  c.height = gridH;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return new Float32Array(0);
  // next/font sets the variable on <body>, not the root.
  const family =
    getComputedStyle(document.body).getPropertyValue("--font-jetbrains").trim() ||
    "ui-monospace";
  // A phone grid is about fifty cells wide: one line of eight characters
  // would be seven cells tall and unreadable, so narrow grids set the name
  // on two lines at twice the size.
  const twoLines = gridW < 64;
  const size = twoLines
    ? Math.min(14, Math.floor(gridW / 3.2))
    : Math.min(16, Math.max(7, Math.round(gridW * 0.12)));
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.font = `700 ${size}px ${family}, ui-monospace, monospace`;
  const cy = gridH - centreRow;
  if (twoLines) {
    ctx.fillText("ANH", gridW / 2, cy - size * 0.6);
    ctx.fillText("TRAN", gridW / 2, cy + size * 0.6);
  } else {
    ctx.fillText("ANH TRAN", gridW / 2, cy);
  }
  const px = ctx.getImageData(0, 0, gridW, gridH).data;
  const pts: number[] = [];
  for (let row = 0; row < gridH; row++) {
    for (let col = 0; col < gridW; col++) {
      const a = px[(row * gridW + col) * 4 + 3];
      if (a <= 24) continue;
      const my = gridH - 1 - row;
      pts.push(0, 0, a / 255, ndcX(col), ndcY(my), 1, hash(col, my));
    }
  }
  return new Float32Array(pts);
}

/* ------------------------------------------------------------------------ */

export default function PortraitScan() {
  const [show, setShow] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  const skipRef = useRef<() => void>(() => {});

  // Decide before first paint, so the page's arrival animations are paused
  // before they have drawn a frame.
  useLayoutEffect(() => {
    const seen = localStorage.getItem(SCAN_STORAGE_KEY) === "true";
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!seen && !reduced) {
      document.documentElement.classList.add(HTML_CLASS);
      setShow(true);
    }
    const onReplay = () => setShow(true);
    window.addEventListener("replay-intro", onReplay);
    return () => {
      window.removeEventListener("replay-intro", onReplay);
      document.documentElement.classList.remove(HTML_CLASS);
    };
  }, []);

  useLayoutEffect(() => {
    if (!show) return;
    const canvas = canvasRef.current;
    const root = rootRef.current;
    const backdrop = backdropRef.current;
    const caption = captionRef.current;
    const hint = hintRef.current;
    if (!canvas || !root || !backdrop || !caption || !hint) return;

    let disposed = false;
    let frame = 0;
    let gl: WebGLRenderingContext | null = null;
    let asset: Asset | null = null;
    let lay: Layout | null = null;
    let cloudBuf: WebGLBuffer | null = null;
    let nameBuf: WebGLBuffer | null = null;
    let start = 0;
    let skipAt = -1;
    let released = false;
    let audio: { ctx: AudioContext; osc: OscillatorNode; gain: GainNode } | null = null;
    let unlockers: (() => void)[] = [];
    let observer: MutationObserver | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

    matrix.locked = true;
    matrix.amp = 0;
    window.dispatchEvent(new Event("intro-shown"));

    // The handoff: the page's own arrival is allowed to happen.
    const release = () => {
      if (released) return;
      released = true;
      document.documentElement.classList.remove(HTML_CLASS);
    };

    const finish = () => {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(frame);
      release();
      localStorage.setItem(SCAN_STORAGE_KEY, "true");
      matrix.locked = false;
      matrix.amp = 1;
      matrix.dirty = true;
      stopAudio();
      window.removeEventListener("pointerdown", skip);
      window.removeEventListener("keydown", skip);
      window.removeEventListener("wheel", skip);
      window.removeEventListener("pointermove", onPointer);
      observer?.disconnect();
      resizeObserver?.disconnect();
      if (gl) {
        if (cloudBuf) gl.deleteBuffer(cloudBuf);
        if (nameBuf) gl.deleteBuffer(nameBuf);
      }
      setShow(false);
      window.dispatchEvent(new Event("intro-done"));
    };

    const skip = () => {
      if (skipAt >= 0 || start === 0) return;
      const t = (performance.now() - start) / 1000;
      if (t >= T_RELEASE) return;
      skipAt = performance.now();
    };
    skipRef.current = skip;

    const onPointer = (e: PointerEvent) => {
      pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };

    /* ---- audio: a tone that tracks the scan plane -------------------- */

    const startAudio = () => {
      if (audio || disposed) return;
      const Ctor = window.AudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      osc.type = "triangle";
      filter.type = "lowpass";
      filter.frequency.value = 1800;
      gain.gain.value = 0;
      osc.connect(filter).connect(gain).connect(ctx.destination);
      osc.start();
      audio = { ctx, osc, gain };
      if (ctx.state === "suspended") {
        // Autoplay is blocked until a gesture. A move or key is enough and
        // does not skip; a tap would, so it is not worth listening for.
        const unlock = () => {
          ctx.resume().catch(() => {});
          removeUnlockers();
        };
        window.addEventListener("pointermove", unlock, { passive: true });
        window.addEventListener("keydown", unlock);
        unlockers = [
          () => window.removeEventListener("pointermove", unlock),
          () => window.removeEventListener("keydown", unlock),
        ];
      }
    };
    const removeUnlockers = () => {
      unlockers.forEach((u) => u());
      unlockers = [];
    };
    const driveAudio = (t: number) => {
      if (!audio || audio.ctx.state !== "running") return;
      const { ctx, osc, gain } = audio;
      const now = ctx.currentTime;
      if (t < T_SCAN) {
        const p = t / T_SCAN;
        osc.frequency.setTargetAtTime(160 * Math.pow(5, p), now, 0.02);
        gain.gain.setTargetAtTime(0.05 * Math.sin(Math.PI * Math.min(1, p * 1.15)), now, 0.03);
      } else {
        gain.gain.setTargetAtTime(0, now, 0.05);
      }
    };
    const stopAudio = () => {
      removeUnlockers();
      if (!audio) return;
      const { ctx, osc, gain } = audio;
      try {
        gain.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
        osc.stop(ctx.currentTime + 0.15);
      } catch {}
      setTimeout(() => ctx.close().catch(() => {}), 250);
      audio = null;
    };

    /* ---- GL ------------------------------------------------------------ */

    gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "high-performance",
    });
    if (!gl) {
      finish();
      return;
    }
    const g = gl;

    const compile = (type: number, src: string) => {
      const sh = g.createShader(type)!;
      g.shaderSource(sh, src);
      g.compileShader(sh);
      return sh;
    };
    const prog = g.createProgram()!;
    g.attachShader(prog, compile(g.VERTEX_SHADER, VERT));
    g.attachShader(prog, compile(g.FRAGMENT_SHADER, FRAG));
    g.linkProgram(prog);
    if (!g.getProgramParameter(prog, g.LINK_STATUS)) {
      finish();
      return;
    }
    g.useProgram(prog);

    const attr = {
      pos: g.getAttribLocation(prog, "aPos"),
      target: g.getAttribLocation(prog, "aTarget"),
      lead: g.getAttribLocation(prog, "aLead"),
      seed: g.getAttribLocation(prog, "aSeed"),
    };
    const u = (name: string) => g.getUniformLocation(prog, name);
    const uni = {
      proj: u("uProj"),
      scale: u("uScale"),
      depth: u("uDepth"),
      yaw: u("uYaw"),
      pitch: u("uPitch"),
      camD: u("uCamD"),
      head: u("uHead"),
      collapse: u("uCollapse"),
      sil: u("uSil"),
      nameK: u("uNameK"),
      fade: u("uFade"),
      pointPx: u("uPointPx"),
      cellPx: u("uCellPx"),
      mode: u("uMode"),
      ink: u("uInk"),
      accent: u("uAccent"),
    };

    g.enable(g.BLEND);
    g.blendFunc(g.ONE, g.ONE_MINUS_SRC_ALPHA);
    g.clearColor(0, 0, 0, 0);
    g.uniform1f(uni.camD, CAM_D);

    const bindLayout = (buf: WebGLBuffer) => {
      g.bindBuffer(g.ARRAY_BUFFER, buf);
      const bytes = STRIDE * 4;
      g.enableVertexAttribArray(attr.pos);
      g.vertexAttribPointer(attr.pos, 3, g.FLOAT, false, bytes, 0);
      g.enableVertexAttribArray(attr.target);
      g.vertexAttribPointer(attr.target, 2, g.FLOAT, false, bytes, 12);
      g.enableVertexAttribArray(attr.lead);
      g.vertexAttribPointer(attr.lead, 1, g.FLOAT, false, bytes, 20);
      g.enableVertexAttribArray(attr.seed);
      g.vertexAttribPointer(attr.seed, 1, g.FLOAT, false, bytes, 24);
    };

    const readColors = () => {
      g.uniform3fv(uni.ink, readColor("--matrix-ink", [0.51, 0.52, 0.56]));
      g.uniform3fv(uni.accent, readColor("--matrix-accent", [0.95, 0.33, 0.37]));
    };
    readColors();
    observer = new MutationObserver(() => requestAnimationFrame(readColors));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    const rebuild = () => {
      if (!asset) return;
      const cssW = canvas.clientWidth;
      const cssH = canvas.clientHeight;
      if (cssW === 0 || cssH === 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, cssW < 768 ? 1 : 1.5);
      const w = Math.floor(cssW * dpr);
      const h = Math.floor(cssH * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      g.viewport(0, 0, w, h);

      lay = layout(asset, cssW, cssH, dpr);
      if (!cloudBuf) cloudBuf = g.createBuffer();
      if (!nameBuf) nameBuf = g.createBuffer();
      g.bindBuffer(g.ARRAY_BUFFER, cloudBuf);
      g.bufferData(g.ARRAY_BUFFER, lay.cloud, g.STATIC_DRAW);
      // The name is rasterised on first use, by which time the mono face
      // has loaded; a resize after that just rasterises it again.
      nameCount = 0;

      g.uniformMatrix4fv(uni.proj, false, lay.proj);
      g.uniform1f(uni.scale, lay.scale);
      g.uniform1f(uni.depth, lay.depth);
      g.uniform1f(uni.pointPx, lay.pointPx);
      g.uniform1f(uni.cellPx, lay.cellPx);

      caption.style.top = `${lay.captionTop}px`;
    };

    resizeObserver = new ResizeObserver(() => rebuild());

    let nameCount = 0;
    const ensureName = () => {
      if (!lay || lay.name) return;
      lay.name = rasterName(lay.gridW, lay.gridH, lay.centreRow, lay.ndcX, lay.ndcY);
      nameCount = lay.name.length / STRIDE;
      g.bindBuffer(g.ARRAY_BUFFER, nameBuf!);
      g.bufferData(g.ARRAY_BUFFER, lay.name, g.STATIC_DRAW);
    };

    /* ---- the timeline ------------------------------------------------- */

    let lastCaption = "";
    const setCaption = (s: string) => {
      if (s === lastCaption) return;
      lastCaption = s;
      caption.textContent = s;
    };

    const step = (now: number) => {
      if (disposed) return;
      frame = requestAnimationFrame(step);
      if (!lay) return;

      // A skip fast-forwards to the release beat and plays the fade from
      // there, so every uniform stays a pure function of t.
      let t = (now - start) / 1000;
      if (skipAt >= 0) t = T_RELEASE + (now - skipAt) / 1000;

      if (t >= T_RELEASE) release();
      if (t >= TOTAL) {
        finish();
        return;
      }

      pointer.x += (pointer.tx - pointer.x) * 0.08;
      pointer.y += (pointer.ty - pointer.y) * 0.08;

      const head = -lay.cols / 2 - 3 + (lay.cols + 6) * clamp01(t / T_SCAN);
      const collapse = easeInOut((t - T_HOLD) / COLLAPSE);
      const sil = clamp01((t - T_COLLAPSE) / NAME_IN);
      const nameK = clamp01((t - T_COLLAPSE) / NAME_IN);
      const fade = 1 - clamp01((t - T_RELEASE) / FADE);
      const yaw =
        (-YAW + 2 * YAW * easeInOut(t / T_COLLAPSE)) * (1 - collapse) +
        pointer.x * POINTER_YAW * (1 - collapse);
      const pitch = -pointer.y * POINTER_PITCH * (1 - collapse);

      // The page arrives behind the collapse; the matrix returns with the fade.
      backdrop.style.opacity = String(1 - collapse);
      matrix.amp = 1 - fade;
      root.style.opacity = String(fade);

      g.uniform1f(uni.head, head);
      g.uniform1f(uni.collapse, collapse);
      g.uniform1f(uni.sil, sil);
      g.uniform1f(uni.nameK, nameK);
      g.uniform1f(uni.fade, fade);
      g.uniform1f(uni.yaw, yaw);
      g.uniform1f(uni.pitch, pitch);

      g.clear(g.COLOR_BUFFER_BIT);
      g.uniform1f(uni.mode, 0);
      bindLayout(cloudBuf!);
      g.drawArrays(g.POINTS, 0, lay.count);
      if (t >= T_HOLD) ensureName();
      if (nameK > 0 && nameCount) {
        g.uniform1f(uni.mode, 1);
        bindLayout(nameBuf!);
        g.drawArrays(g.POINTS, 0, nameCount);
      }

      driveAudio(t);

      if (t < T_SCAN) {
        const pct = Math.round(clamp01(t / T_SCAN) * 100);
        setCaption(`SCAN 01 · DEPTH · ${lay.count.toLocaleString()} CELLS · ${pct}%`);
      } else if (t < T_HOLD) {
        setCaption(`SCAN 01 · DEPTH · ${lay.count.toLocaleString()} CELLS · COMPLETE`);
      } else if (t < T_COLLAPSE) {
        setCaption(`READOUT · ${lay.leads.toLocaleString()} CELLS · ${Math.round(collapse * 100)}%`);
      } else {
        setCaption("");
      }
      hint.style.opacity = t < T_HOLD ? "1" : "0";
    };

    window.addEventListener("pointerdown", skip, { passive: true });
    window.addEventListener("keydown", skip);
    window.addEventListener("wheel", skip, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });

    loadAsset(ASSET, ASSET_WAIT_MS).then((a) => {
      if (disposed) return;
      if (!a) {
        finish();
        return;
      }
      asset = a;
      rebuild();
      resizeObserver?.observe(canvas);
      start = performance.now();
      startAudio();
      frame = requestAnimationFrame(step);
    });

    return () => {
      // Route change or replay mid-flight: put everything back.
      finish();
    };
  }, [show]);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === "Escape" || e.key === " ") skipRef.current();
  }, []);

  if (!show) return null;

  return (
    <div
      ref={rootRef}
      role="button"
      tabIndex={0}
      aria-label="Skip intro"
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-100 cursor-pointer select-none outline-none"
    >
      <div ref={backdropRef} className="absolute inset-0 bg-background" />
      <canvas
        ref={canvasRef}
        className="matrix-canvas absolute inset-x-0 top-0 w-full"
        aria-hidden="true"
      />
      <p
        ref={captionRef}
        className="absolute inset-x-0 text-center font-mono text-[11px] tracking-[0.18em] text-muted-foreground"
        aria-live="off"
      />
      <p
        ref={hintRef}
        className="absolute inset-x-0 bottom-8 text-center text-sm text-muted-foreground/70 transition-opacity duration-300"
      >
        Tap anywhere to skip.
      </p>
    </div>
  );
}
