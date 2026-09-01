"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { DATA_H, DATA_W, matrix } from "./matrixStore";

/**
 * The site's one WebGL scene.
 *
 * A single fullscreen quad. The cell grid is computed in the fragment shader
 * from gl_FragCoord, so the whole field is one draw call with no geometry and
 * no per-cell objects — cheap by construction rather than cheap by
 * degradation, which is what full mobile parity requires.
 *
 * Content comes from a 128x72 greyscale texture that sections write into.
 * Phase 3 ships the substrate with an idle sweep; phase 4 writes the score.
 */

const VERT = `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FRAG = `
precision mediump float;

uniform vec2      uRes;
uniform float     uCell;
uniform float     uTime;
uniform vec3      uInk;
uniform vec3      uAccent;
uniform float     uAmp;
uniform sampler2D uData;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  vec2 cell  = floor(gl_FragCoord.xy / uCell);
  vec2 local = fract(gl_FragCoord.xy / uCell);

  // A gutter on every side, so the field reads as discrete plates rather
  // than a wash. Multiplied into alpha instead of discarded: discard is
  // expensive on the tile-based GPUs this has to hold 60fps on.
  float inset =
      step(0.10, local.x) * step(local.x, 0.90) *
      step(0.10, local.y) * step(local.y, 0.90);

  vec2 grid = max(floor(uRes / uCell), vec2(1.0));

  // Idle: a refresh bar crossing the field, leaving a decaying trail. An
  // instrument with nothing to report still sweeps.
  float sweep = fract(uTime * 0.05 - cell.x / grid.x);
  float band  = smoothstep(0.00, 0.04, sweep) * smoothstep(0.34, 0.06, sweep);
  float idle  = band * step(0.62, hash(cell));

  // Authored content, written by the score.
  //
  // Normalised by the on-screen grid, NOT by the texture's own dimensions.
  // Sampling by texture size crops the readout to however many cells happen
  // to fit: a phone showed the left 23% of every chart and a 4K display
  // smeared the last column across half the screen. The field is meant to
  // span whatever it is drawn on.
  float data = texture2D(uData, (cell + 0.5) / grid).r;

  float v   = clamp(idle * 0.55 + data, 0.0, 1.0);
  vec3  ink = mix(uInk, uAccent, smoothstep(0.55, 1.0, v));

  gl_FragColor = vec4(ink, v * uAmp * inset);
}
`;

/**
 * Cell size in CSS pixels.
 *
 * Smaller on a phone, and that is not a compromise: the fragment shader runs
 * once per screen pixel whatever the cell size is, so finer cells cost exactly
 * nothing in fill-rate. What they buy is grid resolution — at 13px a 393px
 * phone has 30 columns, which renders the calibration name at under two cells
 * per character. At 8px it has 49, and the readouts survive.
 */
const CELL_DESKTOP = 13;
const CELL_MOBILE = 8;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function readColor(name: string, fallback: [number, number, number]) {
  if (typeof window === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  const hex = /^#([0-9a-f]{6})$/i.exec(raw);
  if (!hex) return fallback;
  const n = parseInt(hex[1], 16);
  return [
    ((n >> 16) & 255) / 255,
    ((n >> 8) & 255) / 255,
    (n & 255) / 255,
  ] as [number, number, number];
}

export default function InstrumentMatrix() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pathname = usePathname();
  const reducedMotion = usePrefersReducedMotion();

  // /profile is SplashCursor's room. Two WebGL contexts must never share a GPU.
  const suspended = pathname === "/profile";

  useEffect(() => {
    if (suspended) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      powerPreference: "low-power",
    });
    if (!gl) return;

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    // Fullscreen triangle pair.
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const u = {
      res: gl.getUniformLocation(program, "uRes"),
      cell: gl.getUniformLocation(program, "uCell"),
      time: gl.getUniformLocation(program, "uTime"),
      ink: gl.getUniformLocation(program, "uInk"),
      accent: gl.getUniformLocation(program, "uAccent"),
      amp: gl.getUniformLocation(program, "uAmp"),
      data: gl.getUniformLocation(program, "uData"),
    };

    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.uniform1i(u.data, 0);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    const resize = () => {
      // Measure the canvas box, never window.innerHeight. On mobile the URL
      // bar collapses as you scroll, innerHeight changes with it, and sizing
      // from it reallocated the drawing buffer on nearly every scroll frame.
      // The element is pinned to 100lvh, which does not move.
      const cssW = canvas.clientWidth;
      const cssH = canvas.clientHeight;
      if (!cssW || !cssH) return;

      // Cap device pixel ratio hard. The field is flat cells; above 1.5x
      // there is nothing left to resolve and it costs fill-rate a mid-range
      // phone does not have.
      const dpr = Math.min(window.devicePixelRatio || 1, cssW < 768 ? 1 : 1.5);
      const w = Math.floor(cssW * dpr);
      const h = Math.floor(cssH * dpr);
      if (canvas.width === w && canvas.height === h) return;

      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(u.res, w, h);
      gl.uniform1f(u.cell, (cssW < 640 ? CELL_MOBILE : CELL_DESKTOP) * dpr);
    };
    resize();

    // Fires on real box changes only — orientation, window resize, zoom —
    // and not on the URL-bar scroll jitter that a per-frame check picked up.
    const sizeObserver = new ResizeObserver(resize);
    sizeObserver.observe(canvas);

    const applyTheme = () => {
      gl.uniform3fv(u.ink, readColor("--matrix-ink", [0.51, 0.52, 0.56]));
      gl.uniform3fv(u.accent, readColor("--matrix-accent", [0.95, 0.33, 0.37]));
    };
    applyTheme();

    const themeObserver = new MutationObserver(() =>
      requestAnimationFrame(applyTheme),
    );
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // Allocate once; stream updates. The score eases the field every frame,
    // so this path runs at 60fps and texImage2D would reallocate each call.
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.LUMINANCE,
      DATA_W,
      DATA_H,
      0,
      gl.LUMINANCE,
      gl.UNSIGNED_BYTE,
      matrix.pixels,
    );
    const uploadData = () => {
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        0,
        0,
        DATA_W,
        DATA_H,
        gl.LUMINANCE,
        gl.UNSIGNED_BYTE,
        matrix.pixels,
      );
      matrix.dirty = false;
    };

    const start = performance.now();
    let frame = 0;

    const draw = (now: number) => {
      if (matrix.dirty) uploadData();
      gl.uniform1f(u.time, (now - start) / 1000);
      gl.uniform1f(u.amp, matrix.amp);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    if (reducedMotion) {
      // Doctrine rule 3: no loop. One frame, held.
      draw(start);
    } else {
      const loop = (now: number) => {
        draw(now);
        frame = requestAnimationFrame(loop);
      };
      frame = requestAnimationFrame(loop);
    }

    const onLost = (e: Event) => {
      e.preventDefault();
      cancelAnimationFrame(frame);
    };
    canvas.addEventListener("webglcontextlost", onLost);

    return () => {
      cancelAnimationFrame(frame);
      sizeObserver.disconnect();
      themeObserver.disconnect();
      canvas.removeEventListener("webglcontextlost", onLost);
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [suspended, reducedMotion]);

  if (suspended) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="matrix-canvas fixed inset-x-0 top-0 -z-10 w-full pointer-events-none"
    />
  );
}
