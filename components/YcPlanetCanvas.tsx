"use client";

import { useEffect, useRef, useState } from "react";
import type * as THREE_NS from "three";

// CSS size of the canvas. Wider than tall to leave room for the ring.
export const PLANET_W = 128;
export const PLANET_H = 88;

// Radians per second around the planet's axis.
const SPIN = 0.35;
const SPIN_FAST = 1.8;

type Three = typeof THREE_NS;

/** Deterministic, so the planet looks the same on every visit. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Dark rust to pale peach, with Y Combinator orange (#F26522) in the middle.
const PALETTE: [number, number, number][] = [
  [92, 28, 10],
  [176, 62, 22],
  [242, 101, 34],
  [255, 145, 82],
  [255, 214, 176],
];

function palette(t: number): [number, number, number] {
  const x = Math.min(0.9999, Math.max(0, t)) * (PALETTE.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  const a = PALETTE[i];
  const b = PALETTE[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

/**
 * Gas-giant bands, warped by noise. Noise is sampled around a cylinder so the
 * texture wraps without a seam where u = 0 meets u = 1.
 */
function buildSurface(
  THREE: Three,
  noise: (x: number, y: number, z: number) => number,
) {
  const W = 512;
  const H = 256;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d")!;
  const img = ctx.createImageData(W, H);

  for (let y = 0; y < H; y++) {
    const lat = y / H;
    const pole = Math.pow(Math.abs(lat - 0.5) * 2, 3);
    for (let x = 0; x < W; x++) {
      const a = (x / W) * Math.PI * 2;
      const cx = Math.cos(a);
      const cz = Math.sin(a);
      const warp = noise(cx * 1.3, cz * 1.3, lat * 5) * 1.7;
      const band = Math.sin(lat * Math.PI * 11 + warp) * 0.5 + 0.5;
      const grain = noise(cx * 5, cz * 5, lat * 30) * 0.1;
      // Weighted to the middle of the palette, so it reads as YC orange.
      const [r, g, b] = palette(0.22 + band * 0.62 + grain);
      const shade = 1 - pole * 0.45;
      const o = (y * W + x) * 4;
      img.data[o] = r * shade;
      img.data[o + 1] = g * shade;
      img.data[o + 2] = b * shade;
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // One pale storm, for something to watch go round.
  const sx = W * 0.62;
  const sy = H * 0.63;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(1.9, 1);
  const storm = ctx.createRadialGradient(0, 0, 0, 0, 0, 14);
  storm.addColorStop(0, "rgba(255,236,214,0.95)");
  storm.addColorStop(0.55, "rgba(255,190,140,0.7)");
  storm.addColorStop(1, "rgba(242,101,34,0)");
  ctx.fillStyle = storm;
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

/**
 * A live WebGL planet: banded surface, side light for a real terminator, a
 * fresnel atmosphere and a ring. Three.js is loaded on demand so it stays out
 * of the page's first bundle. The loop only runs while the canvas is on
 * screen and the tab is visible; reduced motion gets one still frame.
 */
export default function YcPlanetCanvas({
  fast,
  still,
}: {
  fast: boolean;
  still: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const speedRef = useRef(SPIN);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    speedRef.current = still ? 0 : fast ? SPIN_FAST : SPIN;
  }, [fast, still]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const [THREE, { createNoise3D }] = await Promise.all([
        import("three"),
        import("simplex-noise"),
      ]);
      if (disposed) return;

      // Building the texture is ~130k noise samples on the main thread, so
      // it waits for an idle moment instead of landing in the page's load.
      await new Promise<void>((resolve) => {
        if ("requestIdleCallback" in window) {
          requestIdleCallback(() => resolve(), { timeout: 1500 });
        } else {
          setTimeout(resolve, 200);
        }
      });
      if (disposed) return;

      let renderer: THREE_NS.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({
          canvas,
          alpha: true,
          antialias: true,
          powerPreference: "low-power",
        });
      } catch {
        setFailed(true);
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(PLANET_W, PLANET_H, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, PLANET_W / PLANET_H, 0.1, 100);
      camera.position.set(0, 0.85, 7.4);
      camera.lookAt(0, 0, 0);

      const system = new THREE.Group();
      system.rotation.z = 0.32;
      scene.add(system);

      const surface = buildSurface(THREE, createNoise3D(mulberry32(1156)));
      const planetGeo = new THREE.SphereGeometry(1, 64, 64);
      const planetMat = new THREE.MeshStandardMaterial({
        map: surface,
        roughness: 0.92,
        metalness: 0,
      });
      const planet = new THREE.Mesh(planetGeo, planetMat);
      system.add(planet);

      // Atmosphere: the back faces of a slightly larger sphere, brightest
      // just outside the planet's silhouette and fading to nothing outward.
      // The planet hides the part of the shell behind it.
      const atmoGeo = new THREE.SphereGeometry(1.16, 64, 64);
      const atmoMat = new THREE.ShaderMaterial({
        uniforms: { color: { value: new THREE.Color("#ff7a35") } },
        vertexShader: /* glsl */ `
          varying vec3 vN;
          void main() {
            vN = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 color;
          varying vec3 vN;
          void main() {
            float i = pow(max(0.0, 0.62 - dot(vN, vec3(0.0, 0.0, 1.0))), 3.0);
            gl_FragColor = vec4(color, 1.0) * min(i, 1.0) * 0.7;
          }`,
        side: THREE.BackSide,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      system.add(new THREE.Mesh(atmoGeo, atmoMat));

      // Ring bands drawn from the radius, with a Cassini-style gap.
      const INNER = 1.42;
      const OUTER = 2.1;
      const ringGeo = new THREE.RingGeometry(INNER, OUTER, 160, 1);
      const ringMat = new THREE.ShaderMaterial({
        uniforms: {
          inner: { value: INNER },
          outer: { value: OUTER },
          light: { value: new THREE.Color("#ffd9b8") },
          deep: { value: new THREE.Color("#F26522") },
        },
        vertexShader: /* glsl */ `
          varying vec2 vP;
          void main() {
            vP = position.xy;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform float inner;
          uniform float outer;
          uniform vec3 light;
          uniform vec3 deep;
          varying vec2 vP;
          void main() {
            float t = (length(vP) - inner) / (outer - inner);
            float bands = 0.55 + 0.45 * sin(t * 46.0) * sin(t * 13.0 + 1.3);
            float edge = smoothstep(0.0, 0.08, t) * smoothstep(1.0, 0.82, t);
            float gap = 1.0 - 0.85 * smoothstep(0.54, 0.57, t) * smoothstep(0.66, 0.63, t);
            gl_FragColor = vec4(mix(light, deep, t), edge * bands * gap * 0.75);
          }`,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2 + 0.38;
      system.add(ring);

      const sun = new THREE.DirectionalLight(0xffffff, 2.3);
      sun.position.set(-4, 2.2, 3.5);
      scene.add(sun);
      scene.add(new THREE.AmbientLight(0xffffff, 0.14));

      let raf = 0;
      let last = performance.now();
      let onScreen = true;

      const frame = (now: number) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        planet.rotation.y += dt * speedRef.current;
        renderer.render(scene, camera);
        raf = requestAnimationFrame(frame);
      };
      const start = () => {
        if (raf || still || !onScreen || document.hidden) return;
        last = performance.now();
        raf = requestAnimationFrame(frame);
      };
      const stop = () => {
        cancelAnimationFrame(raf);
        raf = 0;
      };

      renderer.render(scene, camera);
      setReady(true);
      start();

      const io = new IntersectionObserver(([entry]) => {
        onScreen = entry.isIntersecting;
        if (onScreen) start();
        else stop();
      });
      io.observe(canvas);
      const onVisibility = () => (document.hidden ? stop() : start());
      document.addEventListener("visibilitychange", onVisibility);

      cleanup = () => {
        stop();
        io.disconnect();
        document.removeEventListener("visibilitychange", onVisibility);
        surface.dispose();
        planetGeo.dispose();
        planetMat.dispose();
        atmoGeo.dispose();
        atmoMat.dispose();
        ringGeo.dispose();
        ringMat.dispose();
        renderer.dispose();
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [still]);

  if (failed) {
    // No WebGL: a shaded CSS sphere so the egg is still there to find.
    return (
      <span
        className="block rounded-full"
        style={{
          width: 52,
          height: 52,
          background:
            "radial-gradient(circle at 32% 30%, #ffd6b0, #F26522 45%, #5c1c0a 100%)",
          boxShadow: "0 0 18px rgba(242,101,34,0.45)",
        }}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={PLANET_W}
      height={PLANET_H}
      style={{ width: PLANET_W, height: PLANET_H }}
      className={`block transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}
    />
  );
}
