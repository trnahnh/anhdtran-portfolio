"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { matrix } from "@/components/matrix/matrixStore";

/**
 * The opening move: the instrument scans its subject.
 *
 * A point cloud of the portrait — head and shoulders, cut out and given depth
 * offline by scripts/build-portrait-scan.py — is revealed by a vertical plane
 * sweeping left to right through the volume. Nothing exists ahead of the
 * plane. Cells flare to the accent as it passes and decay to ink behind it.
 * Then the volume turns: out to one side, back through front to the other,
 * and settles face-on, so the depth is seen on every device without input.
 * A pointer adds parallax where one exists. The page arrives behind the
 * volume as it fades, still in depth.
 *
 * About four and a half seconds including the fade. Shown once per browser
 * session: the first time the site is opened in a tab, not again on a reload
 * or a route change, and again in a new tab, after the browser is closed, or
 * on a hard reload (Ctrl+Shift+R), which reads as asking for the site fresh.
 * Skippable by any input. Reduced motion or no WebGL shows nothing extra. The
 * page's arrival animations are held by a class on <html>, set before first
 * paint by app/layout.tsx, and released as the fade begins.
 *
 * The visitor is only marked as having seen it once the scan has actually
 * started. A bail-out before that (no WebGL context, the asset not arriving
 * in time) leaves the flag alone so the next visit gets another try, and
 * says why on the console so a machine that never shows it can be diagnosed.
 */

export const SCAN_STORAGE_KEY = "portrait-scanned";
// The once-per-visitor flag the scan used until 2026-09-04. Cleared on sight
// so a browser that carries it still gets the scan under the session rule.
const LEGACY_STORAGE_KEY = "portrait-scanned";
const ASSET = "/profile/portrait-scan.png";
const HTML_CLASS = "scanning";

// Same rule as InstrumentMatrix; the cloud runs at half its pitch.
const CELL_MOBILE = 8;
const CELL_DESKTOP = 13;

// Beats, in seconds. Scan, turn, fade: 4.7s in all.
const SCAN = 1.5;
const ROTATE = 2.3;
const FADE = 0.9;
const T_SCAN = SCAN;
const T_ROTATE = T_SCAN + ROTATE;
const TOTAL = T_ROTATE + FADE;

// Camera and volume. A single-photo depth map is a relief with no back, so
// the turn stays inside the angle where that is not exposed.
const FOV = (35 * Math.PI) / 180;
const CAM_D = 10;
const YAW = (28 * Math.PI) / 180;
const POINTER_YAW = (6 * Math.PI) / 180;
const POINTER_PITCH = (3 * Math.PI) / 180;
const DEPTH_EXTENT = 0.9; // z range as a fraction of the cloud's height

// Fit: the cloud's share of the viewport.
const FIT_H = 0.7;
const FIT_W = 0.86;
const CENTRE_Y = 0.47; // from the top

// Phones in portrait get the face, not the bust: the whole figure on a
// 390px screen leaves the face about 120px wide. The crop is a window on
// the same asset, measured off its mask: hair at 3% of the height, the
// neck's narrowest point at 47%, the collar from 50%. Everything 640px and
// wider (iPads, a phone held sideways) keeps the bust.
const FACE_MAX_WIDTH = 640;
const FACE_CROP = { x0: 0.31, x1: 0.75, y0: 0.0, y1: 0.52 };
const FACE_FIT_W = 0.8;

const ASSET_WAIT_MS = 2500;

// Fixed to the camera, upper left and in front, so the lit side changes as
// the volume turns.
const LIGHT = [-0.55, 0.6, 1.0];

const VERT = `
attribute vec3 aPos;      // cloud cells, centred; z is depth 0..1 minus 0.5
attribute vec3 aNormal;   // surface normal from the depth map, model space

uniform mat4  uProj;
uniform float uScale;     // world units per cloud cell
uniform float uDepth;     // z extent in cloud cells
uniform float uYaw;
uniform float uPitch;
uniform float uCamD;
uniform float uHead;      // scan plane, in cloud-cell x
uniform float uFade;      // 1 .. 0 at the end
uniform float uPointPx;   // point size, device px, at the camera plane
uniform vec3  uLight;     // camera space, normalised

varying float vV;
varying float vA;

void main() {
  vec3 p = vec3(aPos.x, aPos.y, aPos.z * uDepth) * uScale;

  float c = cos(uYaw), s = sin(uYaw);
  vec3 r = vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
  float cp = cos(uPitch), sp = sin(uPitch);
  r = vec3(r.x, cp * r.y - sp * r.z, sp * r.y + cp * r.z);

  vec4 clip = uProj * vec4(r, 1.0);
  gl_Position = vec4(clip.xy / clip.w, 0.0, 1.0);

  // Near cells are larger, so the volume reads on a still frame too.
  float depthN = aPos.z + 0.5;
  gl_PointSize = uPointPx * (0.7 + 0.6 * depthN) * (uCamD / clip.w);

  // Diffuse light on the surface the depth map describes, turned with it.
  vec3 n = vec3(c * aNormal.x + s * aNormal.z, aNormal.y, -s * aNormal.x + c * aNormal.z);
  n = vec3(n.x, cp * n.y - sp * n.z, sp * n.y + cp * n.z);
  float lit = max(dot(normalize(n), uLight), 0.0);

  // The scan plane, in model space, so it wraps over the face on screen.
  float d = uHead - aPos.x;
  float passed = step(0.0, d);
  float flare = exp(-max(d, 0.0) * 0.9);
  float comb = (0.5 + 0.5 * cos(d * 6.2832 / 3.0)) * exp(-max(d, 0.0) / 9.0);
  float base = 0.14 + 0.16 * depthN + 0.42 * lit;
  vV = clamp(base + comb * 0.45 + flare * 1.2, 0.0, 1.0);
  vA = passed * uFade;
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
  vec3 ink = mix(uInk, uAccent, smoothstep(0.6, 1.0, vV));
  gl_FragColor = vec4(ink * a, a);
}
`;

type Asset = { w: number; h: number; mask: Uint8ClampedArray; depth: Uint8ClampedArray };

const STRIDE = 6; // floats per point: position, normal

type Layout = {
  cloud: Float32Array;
  count: number;
  /** Cells at or left of each cloud column, so the count can follow the line. */
  seenByCol: Uint32Array;
  cols: number;
  rows: number;
  pointPx: number;
  scale: number;
  depth: number;
  proj: Float32Array;
  captionTop: number; // CSS px
};

/**
 * A hard reload fetches the document in full; a normal reload revalidates it
 * and the navigation entry reports it as delivered from cache. Both are
 * readable before first paint, so the gate script in app/layout.tsx applies
 * the same test. A browser without deliveryType treats every reload as a
 * normal one. A fresh deployment also fetches in full, and plays once.
 */
function isHardReload() {
  const nav = performance.getEntriesByType("navigation")[0] as
    | (PerformanceNavigationTiming & { deliveryType?: string })
    | undefined;
  return !!nav && nav.type === "reload" && "deliveryType" in nav && nav.deliveryType !== "cache";
}

function skipped(reason: string) {
  console.info(`[portrait scan] skipped: ${reason}`);
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

/** Lay the cloud out for a viewport: contain-fit, at half the matrix pitch. */
function layout(asset: Asset, cssW: number, cssH: number, dpr: number): Layout {
  const cellCss = cssW < 640 ? CELL_MOBILE : CELL_DESKTOP;
  const pitchCss = cellCss / 2;
  const H = Math.floor(cssH * dpr);
  const W = Math.floor(cssW * dpr);

  const face = cssW < FACE_MAX_WIDTH;
  const crop = face ? FACE_CROP : { x0: 0, x1: 1, y0: 0, y1: 1 };
  const cropW = (crop.x1 - crop.x0) * asset.w;
  const cropH = (crop.y1 - crop.y0) * asset.h;
  const aspect = cropW / cropH;
  const fitW = face ? FACE_FIT_W : FIT_W;

  // Perspective enlarges the nearest cells: with the volume this deep the
  // chest projects about a quarter larger than the cloud's nominal box.
  // Fit the projected size, not the box, or the figure runs into the
  // caption on a short viewport. The magnification depends on the size,
  // so it is solved by a couple of rounds.
  const fovK = 2 * CAM_D * Math.tan(FOV / 2); // world units per full viewport height
  const magFor = (hCss: number) => {
    const zHalf = (DEPTH_EXTENT * (hCss / cssH) * fovK) / 2;
    return CAM_D / (CAM_D - zHalf);
  };
  let targetH = Math.min(cssH * FIT_H, (cssW * fitW) / aspect);
  for (let k = 0; k < 3; k++) {
    const m = magFor(targetH);
    targetH = Math.min((cssH * FIT_H) / m, (cssW * fitW) / aspect / m);
  }
  const rows = Math.max(4, Math.floor(targetH / pitchCss));
  const cols = Math.max(4, Math.floor(rows * aspect));
  const mag = magFor(rows * pitchCss);

  // The camera looks at the origin, which is the screen's centre; the cloud
  // sits a little above it, so its cells are shifted up in cloud units.
  const lift = ((0.5 - CENTRE_Y) * cssH) / pitchCss;

  // Sample the asset onto the cloud grid first, so normals can be taken
  // between neighbouring cells with the same z scale the shader will use.
  const zExtent = rows * DEPTH_EXTENT; // cloud cells, matching uDepth
  const inside = new Uint8Array(cols * rows);
  const z = new Float32Array(cols * rows);
  let zMin = Infinity;
  let zMax = -Infinity;
  for (let j = 0; j < rows; j++) {
    const v = 1 - (j + 0.5) / rows; // asset rows run top-down
    const ay = Math.min(asset.h - 1, Math.floor((crop.y0 + v * (crop.y1 - crop.y0)) * asset.h));
    for (let i = 0; i < cols; i++) {
      const u = (i + 0.5) / cols;
      const ax = Math.min(asset.w - 1, Math.floor((crop.x0 + u * (crop.x1 - crop.x0)) * asset.w));
      const idx = ay * asset.w + ax;
      if (asset.mask[idx] < 128) continue;
      inside[j * cols + i] = 1;
      const d = asset.depth[idx] / 255;
      z[j * cols + i] = d;
      if (d < zMin) zMin = d;
      if (d > zMax) zMax = d;
    }
  }
  // Re-stretch depth over what is actually in the crop. The asset's range
  // runs chest-to-hair, so a face alone would sit in its far half.
  const zSpan = zMax - zMin > 0.05 ? zMax - zMin : 1;
  for (let k = 0; k < z.length; k++) {
    if (inside[k]) z[k] = (z[k] - zMin) / zSpan - 0.5;
  }
  const zAt = (i: number, j: number, fallback: number) =>
    i >= 0 && j >= 0 && i < cols && j < rows && inside[j * cols + i] ? z[j * cols + i] : fallback;

  const seenByCol = new Uint32Array(cols + 1);
  for (let i = 0; i < cols; i++) {
    let n = 0;
    for (let j = 0; j < rows; j++) n += inside[j * cols + i];
    seenByCol[i + 1] = seenByCol[i] + n;
  }

  const pts: number[] = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      if (!inside[j * cols + i]) continue;
      const zc = z[j * cols + i];
      // Central differences, falling back to the cell itself at the
      // silhouette so the edge does not get a normal that points sideways.
      const dzdx = ((zAt(i + 1, j, zc) - zAt(i - 1, j, zc)) / 2) * zExtent;
      const dzdy = ((zAt(i, j + 1, zc) - zAt(i, j - 1, zc)) / 2) * zExtent;
      const len = Math.hypot(dzdx, dzdy, 1) || 1;
      pts.push(
        i - cols / 2 + 0.5,
        j - rows / 2 + 0.5 + lift,
        zc,
        -dzdx / len,
        -dzdy / len,
        1 / len,
      );
    }
  }

  // World scale so a cloud cell projects to exactly one pitch at the camera
  // plane: a world height h at distance D covers h * (H/2) / (D tan(fov/2))
  // device pixels. Perspective then does the rest.
  const pitchPx = pitchCss * dpr;
  const scale = (2 * pitchPx * CAM_D * Math.tan(FOV / 2)) / H;
  const proj = perspective(FOV, W / H, 1, 40);

  // The caption sits under the projected bottom edge, with room for the
  // few degrees of pointer pitch on top.
  const centreCss = cssH * CENTRE_Y;
  const cloudBottomCss = centreCss + ((rows * pitchCss) / 2) * mag + cssH * 0.015;

  return {
    cloud: new Float32Array(pts),
    count: pts.length / STRIDE,
    seenByCol,
    cols,
    rows,
    pointPx: pitchPx * 0.8,
    scale,
    depth: rows * DEPTH_EXTENT,
    proj,
    captionTop: cloudBottomCss + 30,
  };
}

/* ------------------------------------------------------------------------ */

export default function PortraitScan() {
  const [show, setShow] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const line1Ref = useRef<HTMLSpanElement>(null);
  const line2Ref = useRef<HTMLSpanElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  const skipRef = useRef<() => void>(() => {});

  // Decide before first paint. The gate script in the layout has already
  // set the class for a first visit; this keeps the two in step.
  useLayoutEffect(() => {
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {}
    const seen = sessionStorage.getItem(SCAN_STORAGE_KEY) === "true" && !isHardReload();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!seen && !reduced) {
      document.documentElement.classList.add(HTML_CLASS);
      setShow(true);
    } else {
      skipped(seen ? "already seen this session" : "prefers-reduced-motion is set");
      document.documentElement.classList.remove(HTML_CLASS);
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
    const line1 = line1Ref.current;
    const line2 = line2Ref.current;
    const hint = hintRef.current;
    if (!canvas || !root || !backdrop || !caption || !line1 || !line2 || !hint) return;

    let disposed = false;
    let frame = 0;
    let gl: WebGLRenderingContext | null = null;
    let asset: Asset | null = null;
    let lay: Layout | null = null;
    let cloudBuf: WebGLBuffer | null = null;
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
      // Only a scan that ran counts as seen; see the note at the top.
      if (start > 0) sessionStorage.setItem(SCAN_STORAGE_KEY, "true");
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
      if (gl && cloudBuf) gl.deleteBuffer(cloudBuf);
      setShow(false);
      window.dispatchEvent(new Event("intro-done"));
    };

    const skip = () => {
      if (skipAt >= 0 || start === 0) return;
      const t = (performance.now() - start) / 1000;
      if (t >= T_ROTATE) return;
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
      skipped("no WebGL context (graphics acceleration off, or the GPU is blocklisted)");
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
      skipped("shader failed to link: " + (g.getProgramInfoLog(prog) || "").trim());
      finish();
      return;
    }
    g.useProgram(prog);

    const aPos = g.getAttribLocation(prog, "aPos");
    const aNormal = g.getAttribLocation(prog, "aNormal");
    const u = (name: string) => g.getUniformLocation(prog, name);
    const uni = {
      proj: u("uProj"),
      scale: u("uScale"),
      depth: u("uDepth"),
      yaw: u("uYaw"),
      pitch: u("uPitch"),
      camD: u("uCamD"),
      head: u("uHead"),
      fade: u("uFade"),
      pointPx: u("uPointPx"),
      light: u("uLight"),
      ink: u("uInk"),
      accent: u("uAccent"),
    };

    g.enable(g.BLEND);
    g.blendFunc(g.ONE, g.ONE_MINUS_SRC_ALPHA);
    g.clearColor(0, 0, 0, 0);
    g.uniform1f(uni.camD, CAM_D);
    {
      const l = Math.hypot(LIGHT[0], LIGHT[1], LIGHT[2]);
      g.uniform3f(uni.light, LIGHT[0] / l, LIGHT[1] / l, LIGHT[2] / l);
    }

    const readColors = () => {
      g.uniform3fv(uni.ink, readColor("--scan-ink", [0.6, 0.62, 0.65]));
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
      g.bindBuffer(g.ARRAY_BUFFER, cloudBuf);
      g.bufferData(g.ARRAY_BUFFER, lay.cloud, g.STATIC_DRAW);
      g.enableVertexAttribArray(aPos);
      g.vertexAttribPointer(aPos, 3, g.FLOAT, false, STRIDE * 4, 0);
      g.enableVertexAttribArray(aNormal);
      g.vertexAttribPointer(aNormal, 3, g.FLOAT, false, STRIDE * 4, 12);

      g.uniformMatrix4fv(uni.proj, false, lay.proj);
      g.uniform1f(uni.scale, lay.scale);
      g.uniform1f(uni.depth, lay.depth);
      g.uniform1f(uni.pointPx, lay.pointPx);

      // On a short viewport (a phone in landscape) the caption would land
      // on the skip hint, so the caption is clamped and the hint gives way.
      const short = cssH < 520;
      caption.style.top = `${Math.min(lay.captionTop, cssH - 36)}px`;
      hint.hidden = short;
    };

    resizeObserver = new ResizeObserver(() => rebuild());

    /* ---- the timeline ------------------------------------------------- */

    let lastCaption = "";
    const setCaption = (a: string, b: string) => {
      const key = a + "|" + b;
      if (key === lastCaption) return;
      lastCaption = key;
      line1.textContent = a;
      line2.textContent = b;
    };

    // Frame time as a rolling average, and a caption that only re-renders
    // a few times a second: the numbers are real, the text is not jittery.
    let lastFrame = 0;
    let frameMs = 0;
    let captionAt = 0;

    const step = (now: number) => {
      if (disposed) return;
      frame = requestAnimationFrame(step);
      if (!lay) return;

      // A skip fast-forwards to the fade and plays it from there, so every
      // uniform stays a pure function of t.
      let t = (now - start) / 1000;
      if (skipAt >= 0) t = T_ROTATE + (now - skipAt) / 1000;

      if (t >= T_ROTATE) release();
      if (t >= TOTAL) {
        finish();
        return;
      }

      pointer.x += (pointer.tx - pointer.x) * 0.08;
      pointer.y += (pointer.ty - pointer.y) * 0.08;

      const head = -lay.cols / 2 - 3 + (lay.cols + 6) * clamp01(t / T_SCAN);
      // Out to one side, back through front to the other, settle face-on.
      const turn = Math.sin(2 * Math.PI * clamp01((t - T_SCAN) / ROTATE));
      const yaw = YAW * turn + pointer.x * POINTER_YAW;
      const pitch = -pointer.y * POINTER_PITCH;
      const fadeP = clamp01((t - T_ROTATE) / FADE);
      const fade = 1 - fadeP;

      // The page arrives first, under the volume; the matrix returns with it.
      backdrop.style.opacity = String(1 - clamp01(fadeP / 0.6));
      matrix.amp = fadeP;
      root.style.opacity = String(fade);

      g.uniform1f(uni.head, head);
      g.uniform1f(uni.fade, fade);
      g.uniform1f(uni.yaw, yaw);
      g.uniform1f(uni.pitch, pitch);

      g.clear(g.COLOR_BUFFER_BIT);
      g.drawArrays(g.POINTS, 0, lay.count);

      driveAudio(t);

      if (lastFrame) frameMs += (now - lastFrame - frameMs) * 0.1;
      lastFrame = now;
      if (now - captionAt > 100) {
        captionAt = now;
        // The count follows the line: cells it has passed so far.
        const col = Math.max(0, Math.min(lay.cols, Math.floor(head + lay.cols / 2 + 0.5)));
        const seen = t < T_SCAN ? lay.seenByCol[col] : lay.count;
        const ms = frameMs.toFixed(1);
        const deg = ((yaw * 180) / Math.PI).toFixed(0).replace("-0", "0");
        const stage =
          t < T_SCAN ? `${Math.round(clamp01(t / T_SCAN) * 100)}%` : "COMPLETE";
        setCaption(
          `SCAN 01 · ${seen.toLocaleString()} CELLS · ${stage}`,
          `${ms} MS · YAW ${Number(deg) >= 0 ? "+" : ""}${deg}° · Z ${DEPTH_EXTENT.toFixed(2)}`,
        );
      }
      hint.style.opacity = t < T_ROTATE ? "1" : "0";
    };

    window.addEventListener("pointerdown", skip, { passive: true });
    window.addEventListener("keydown", skip);
    window.addEventListener("wheel", skip, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });

    loadAsset(ASSET, ASSET_WAIT_MS).then((a) => {
      if (disposed) return;
      if (!a) {
        skipped(`asset ${ASSET} did not load within ${ASSET_WAIT_MS} ms`);
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

  // Rendered at the end of <body>, not inside the page tree. The page
  // transition wrapper keeps a stacking context after its fade, so anything
  // fixed at body level would paint over an overlay nested inside it, and
  // on iPhone an ancestor's geometry could shape what "fixed" means.
  return createPortal(
    <div
      ref={rootRef}
      role="button"
      tabIndex={0}
      aria-label="Skip intro"
      onKeyDown={onKeyDown}
      className="scan-root fixed inset-x-0 top-0 z-100 cursor-pointer select-none outline-none"
    >
      <div ref={backdropRef} className="absolute inset-x-0 top-0 -bottom-[20%] bg-background" />
      <canvas
        ref={canvasRef}
        className="matrix-canvas absolute inset-x-0 top-0 w-full"
        aria-hidden="true"
      />
      <p
        ref={captionRef}
        className="absolute inset-x-0 px-4 text-center font-mono text-[11px] leading-5 tracking-[0.18em] text-muted-foreground"
        aria-live="off"
      >
        <span ref={line1Ref} />
        <span className="hidden sm:inline"> · </span>
        <br className="sm:hidden" />
        <span ref={line2Ref} />
      </p>
      <p
        ref={hintRef}
        className="scan-hint absolute inset-x-0 text-center text-sm text-muted-foreground/70 transition-opacity duration-300"
      >
        Tap anywhere to skip.
      </p>
    </div>,
    document.body,
  );
}
