"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import * as THREE from "three";

// ── Planet data — all 8 ──────────────────────────────────────────────────────
// axialTilt: radians (realistic)  spinRate: multiplier vs Earth baseline
const PLANET_DATA = [
  {
    name: "Mercury",
    orbitR: 9,    size: 0.38, speed: 0.8,
    axialTilt: 0.034, spinRate: 0.017,
    color: new THREE.Color(0x9ab0c8), emissive: new THREE.Color(0x1a2635),
    atmoColor: new THREE.Color(0x7090b0), metalness: 0.45, roughness: 0.68,
  },
  {
    name: "Venus",
    orbitR: 14,   size: 0.72, speed: 0.5,
    axialTilt: 3.096, spinRate: -0.004,   // retrograde spin
    color: new THREE.Color(0xd4aa70), emissive: new THREE.Color(0x2a1800),
    atmoColor: new THREE.Color(0xe8c060), metalness: 0.08, roughness: 0.82,
  },
  {
    name: "Earth",
    orbitR: 20,   size: 0.76, speed: 0.38,
    axialTilt: 0.409, spinRate: 1.0,
    color: new THREE.Color(0x3a7acc), emissive: new THREE.Color(0x001122),
    atmoColor: new THREE.Color(0x55aaee), metalness: 0.12, roughness: 0.52,
  },
  {
    name: "Mars",
    orbitR: 27,   size: 0.55, speed: 0.26,
    axialTilt: 0.440, spinRate: 0.97,
    color: new THREE.Color(0xcc6644), emissive: new THREE.Color(0x1a0800),
    atmoColor: new THREE.Color(0xdd7755), metalness: 0.18, roughness: 0.75,
  },
  {
    name: "Jupiter",
    orbitR: 38,   size: 1.85, speed: 0.14,
    axialTilt: 0.054, spinRate: 2.4,     // fastest spinner
    color: new THREE.Color(0xc8a878), emissive: new THREE.Color(0x1a1000),
    atmoColor: new THREE.Color(0xddbb88), metalness: 0.05, roughness: 0.9,
  },
  {
    name: "Saturn",
    orbitR: 51,   size: 1.55, speed: 0.09,
    axialTilt: 0.467, spinRate: 2.25,
    color: new THREE.Color(0xd4c090), emissive: new THREE.Color(0x181000),
    atmoColor: new THREE.Color(0xe8d8a0), metalness: 0.05, roughness: 0.88,
    hasRings: true, ringColor: new THREE.Color(0xb8a070),
    ringInner: 2.1, ringOuter: 3.8, ringTilt: 0.46,
  },
  {
    name: "Uranus",
    orbitR: 64,   size: 1.1,  speed: 0.055,
    axialTilt: 1.706, spinRate: 1.4,     // ~98° — rolls on its side
    color: new THREE.Color(0x7dd8e0), emissive: new THREE.Color(0x001820),
    atmoColor: new THREE.Color(0x88eeff), metalness: 0.1, roughness: 0.6,
    hasRings: true, ringColor: new THREE.Color(0x55aaaa),
    ringInner: 1.5, ringOuter: 2.2, ringTilt: 1.5,
  },
  {
    name: "Neptune",
    orbitR: 78,   size: 1.05, speed: 0.034,
    axialTilt: 0.494, spinRate: 1.5,
    color: new THREE.Color(0x3355cc), emissive: new THREE.Color(0x000820),
    atmoColor: new THREE.Color(0x4466ee), metalness: 0.12, roughness: 0.58,
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function buildAtmosphere(radius: number, color: THREE.Color, segs = 32) {
  const geo = new THREE.SphereGeometry(radius * 1.28, segs, segs);
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.09,
    side: THREE.BackSide,
    depthWrite: false,
  });
  return new THREE.Mesh(geo, mat);
}

function buildRimGlow(radius: number, color: THREE.Color, segs = 32) {
  const geo = new THREE.SphereGeometry(radius * 1.12, segs, segs);
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.055,
    side: THREE.BackSide,
    depthWrite: false,
  });
  return new THREE.Mesh(geo, mat);
}

function buildPlanetRings(
  color: THREE.Color,
  innerR = 1.55,
  outerR = 2.6,
  tilt = Math.PI / 2.5,
) {
  const radius = (innerR + outerR) / 2;
  const tube   = (outerR - innerR) / 2;
  const geo = new THREE.TorusGeometry(radius, tube, 3, 80);
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.38,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = tilt;
  return mesh;
}

function buildOrbitRing(radius: number) {
  const points: THREE.Vector3[] = [];
  const segments = 128;
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(theta) * radius, 0, Math.sin(theta) * radius));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineBasicMaterial({
    color: 0x334466,
    transparent: true,
    opacity: 0.22,
  });
  return new THREE.LineLoop(geo, mat);
}

function buildNebula(): THREE.Mesh {
  const W = 2048, H = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Transparent base — the scene background shows through
  ctx.clearRect(0, 0, W, H);

  // Each entry: [cx%, cy%, radiusX%, radiusY%, rotAngle, r, g, b, maxOpacity]
  const blobs: [number,number,number,number,number,number,number,number,number][] = [
    [0.18, 0.35, 0.40, 0.22,  0.4,  58,  26, 106, 0.28], // large purple cloud
    [0.72, 0.55, 0.32, 0.18, -0.3,  10,  32,  80, 0.24], // deep blue
    [0.50, 0.18, 0.26, 0.14,  0.8,  35,  10,  90, 0.18], // violet wisp
    [0.88, 0.30, 0.22, 0.15,  0.2,  10,  55,  55, 0.20], // teal
    [0.30, 0.72, 0.28, 0.17, -0.5,  70,  10,  55, 0.16], // magenta
    [0.62, 0.78, 0.20, 0.12,  0.1,  85,  35,  10, 0.14], // warm orange (star formation)
    [0.05, 0.60, 0.18, 0.12,  0.6,  20,  10,  70, 0.15], // indigo edge
  ];

  blobs.forEach(([cx, cy, rx, ry, angle, r, g, b, maxOp]) => {
    const px = cx * W;
    const py = cy * H;
    const rX = rx * W;
    const rY = ry * H;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle);
    ctx.scale(1, rY / rX); // squash into ellipse

    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, rX);
    grad.addColorStop(0,    `rgba(${r},${g},${b},${maxOp})`);
    grad.addColorStop(0.40, `rgba(${r},${g},${b},${(maxOp * 0.45).toFixed(3)})`);
    grad.addColorStop(0.75, `rgba(${r},${g},${b},${(maxOp * 0.12).toFixed(3)})`);
    grad.addColorStop(1,    `rgba(${r},${g},${b},0)`);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, rX, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  const tex = new THREE.CanvasTexture(canvas);
  const geo = new THREE.SphereGeometry(560, 48, 48);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    side: THREE.BackSide,
    depthWrite: false,
    transparent: true,
    opacity: 1,
  });
  return new THREE.Mesh(geo, mat);
}

// ── Procedural planet textures ───────────────────────────────────────────────
// Shared helper: draw a soft elliptical blob on a canvas 2d context
function ellipseBlob(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,   // 0-1 fractions of canvas size
  rx: number, ry: number,   // 0-1 fractions of canvas size
  angle: number,
  r: number, g: number, b: number,
  alpha: number,
  W: number, H: number,
) {
  ctx.save();
  ctx.translate(cx * W, cy * H);
  ctx.rotate(angle);
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  grad.addColorStop(0,    `rgba(${r},${g},${b},${alpha})`);
  grad.addColorStop(0.65, `rgba(${r},${g},${b},${(alpha * 0.55).toFixed(3)})`);
  grad.addColorStop(1,    `rgba(${r},${g},${b},0)`);
  ctx.scale(rx * W, ry * H);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function buildJupiterTexture(): THREE.CanvasTexture {
  const W = 512, H = 256;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d")!;

  // Warm tan base
  ctx.fillStyle = "#c8a060";
  ctx.fillRect(0, 0, W, H);

  // Horizontal cloud bands [y, height, r, g, b, alpha]
  const bands: [number, number, number, number, number, number][] = [
    [0.00, 0.055, 50,  30,  12,  0.80],
    [0.06, 0.045, 220, 165,  85, 0.55],
    [0.11, 0.075, 100,  58,  22, 0.82],
    [0.19, 0.045, 240, 205, 125, 0.48],
    [0.24, 0.065, 80,  48,  18, 0.78],
    [0.31, 0.075, 210, 155,  85, 0.52],
    [0.39, 0.050, 58,  34,  12, 0.80],
    [0.44, 0.085, 235, 190, 110, 0.46],
    [0.53, 0.060, 110,  62,  24, 0.78],
    [0.59, 0.075, 215, 158,  88, 0.52],
    [0.67, 0.050, 55,  32,  10, 0.80],
    [0.72, 0.080, 230, 185, 105, 0.48],
    [0.80, 0.055, 95,  55,  20, 0.78],
    [0.86, 0.060, 205, 155,  80, 0.52],
    [0.92, 0.080, 50,  28,  10, 0.80],
  ];

  bands.forEach(([y, h, r, g, b, a]) => {
    // Soft edge: gradient fades in/out so bands blend
    const grad = ctx.createLinearGradient(0, y * H, 0, (y + h) * H);
    grad.addColorStop(0,   `rgba(${r},${g},${b},0)`);
    grad.addColorStop(0.2, `rgba(${r},${g},${b},${a})`);
    grad.addColorStop(0.8, `rgba(${r},${g},${b},${a})`);
    grad.addColorStop(1,   `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, y * H - 2, W, h * H + 4);
  });

  // Great Red Spot — oval storm, southern hemisphere
  const grsX = 0.55, grsY = 0.61, grsRx = 0.068, grsRy = 0.095;
  // Outer glow
  ellipseBlob(ctx, grsX, grsY, grsRx * 1.7, grsRy * 1.5, 0, 160, 40,  8,  0.35, W, H);
  // Core
  ellipseBlob(ctx, grsX, grsY, grsRx,       grsRy,       0, 195, 55, 18,  0.90, W, H);
  // Inner bright centre
  ellipseBlob(ctx, grsX, grsY, grsRx * 0.4, grsRy * 0.4, 0, 215, 80, 30,  0.70, W, H);

  return new THREE.CanvasTexture(cv);
}

function buildSaturnTexture(): THREE.CanvasTexture {
  const W = 512, H = 256;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d")!;

  ctx.fillStyle = "#d8c880";
  ctx.fillRect(0, 0, W, H);

  // Subtler, paler bands than Jupiter
  const bands: [number, number, number, number, number, number][] = [
    [0.00, 0.06, 140, 110,  45, 0.38],
    [0.08, 0.07, 170, 148,  80, 0.30],
    [0.17, 0.08, 125,  98,  35, 0.40],
    [0.27, 0.06, 185, 165, 100, 0.28],
    [0.35, 0.09, 148, 118,  48, 0.38],
    [0.46, 0.07, 175, 155,  85, 0.30],
    [0.55, 0.08, 132, 105,  40, 0.38],
    [0.65, 0.06, 180, 160,  95, 0.28],
    [0.73, 0.08, 138, 110,  44, 0.36],
    [0.83, 0.06, 165, 142,  75, 0.30],
    [0.91, 0.09, 128, 100,  36, 0.38],
  ];

  bands.forEach(([y, h, r, g, b, a]) => {
    const grad = ctx.createLinearGradient(0, y * H, 0, (y + h) * H);
    grad.addColorStop(0,   `rgba(${r},${g},${b},0)`);
    grad.addColorStop(0.2, `rgba(${r},${g},${b},${a})`);
    grad.addColorStop(0.8, `rgba(${r},${g},${b},${a})`);
    grad.addColorStop(1,   `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, y * H - 2, W, h * H + 4);
  });

  // Polar darkening
  const northGrad = ctx.createLinearGradient(0, 0, 0, H * 0.14);
  northGrad.addColorStop(0, "rgba(90,65,18,0.40)");
  northGrad.addColorStop(1, "rgba(90,65,18,0)");
  ctx.fillStyle = northGrad;
  ctx.fillRect(0, 0, W, H * 0.14);

  return new THREE.CanvasTexture(cv);
}

function buildEarthTexture(): THREE.CanvasTexture {
  const W = 512, H = 256;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d")!;

  // Deep ocean base
  ctx.fillStyle = "#1a4a88";
  ctx.fillRect(0, 0, W, H);

  // Shallow water (near coasts)
  ctx.fillStyle = "#245a9a";
  ctx.fillRect(0, 0, W, H);

  // Continents — approximate equirectangular positions
  // North America
  ellipseBlob(ctx, 0.12, 0.31, 0.095, 0.17, -0.2,  55, 100,  35, 0.90, W, H);
  ellipseBlob(ctx, 0.17, 0.21, 0.055, 0.10,  0.1,  60, 110,  40, 0.85, W, H);
  ellipseBlob(ctx, 0.09, 0.40, 0.040, 0.08, -0.1,  65, 105,  38, 0.80, W, H);
  // South America
  ellipseBlob(ctx, 0.22, 0.62, 0.052, 0.17,  0.15, 48,  92,  28, 0.90, W, H);
  ellipseBlob(ctx, 0.24, 0.50, 0.030, 0.06,  0.0,  52, 100,  32, 0.80, W, H);
  // Europe
  ellipseBlob(ctx, 0.49, 0.24, 0.038, 0.09,  0.1,  62, 108,  42, 0.85, W, H);
  ellipseBlob(ctx, 0.47, 0.18, 0.020, 0.05, -0.2,  58, 102,  38, 0.78, W, H);
  // Africa
  ellipseBlob(ctx, 0.52, 0.52, 0.068, 0.20,  0.05, 78, 108,  44, 0.92, W, H);
  ellipseBlob(ctx, 0.50, 0.36, 0.048, 0.09, -0.1,  72,  98,  38, 0.82, W, H);
  // Asia — multiple overlapping blobs
  ellipseBlob(ctx, 0.68, 0.26, 0.135, 0.18,  0.1,  58,  98,  36, 0.90, W, H);
  ellipseBlob(ctx, 0.81, 0.20, 0.075, 0.12, -0.2,  54,  92,  34, 0.85, W, H);
  ellipseBlob(ctx, 0.62, 0.37, 0.058, 0.09,  0.2,  62, 104,  40, 0.80, W, H);
  ellipseBlob(ctx, 0.75, 0.35, 0.045, 0.08,  0.1,  56,  96,  35, 0.78, W, H);
  // Australia — warm arid tones
  ellipseBlob(ctx, 0.84, 0.67, 0.052, 0.10,  0.1, 148, 118,  52, 0.88, W, H);
  // Greenland
  ellipseBlob(ctx, 0.27, 0.11, 0.038, 0.08, -0.3, 205, 228, 242, 0.78, W, H);

  // Polar ice caps
  const northIce = ctx.createLinearGradient(0, 0, 0, H * 0.15);
  northIce.addColorStop(0, "rgba(225,242,255,0.96)");
  northIce.addColorStop(1, "rgba(210,235,255,0)");
  ctx.fillStyle = northIce;
  ctx.fillRect(0, 0, W, H * 0.15);

  const southIce = ctx.createLinearGradient(0, H * 0.85, 0, H);
  southIce.addColorStop(0, "rgba(218,238,255,0)");
  southIce.addColorStop(1, "rgba(228,245,255,0.96)");
  ctx.fillStyle = southIce;
  ctx.fillRect(0, H * 0.85, W, H * 0.15);

  // Cloud patches (soft white blobs)
  const clouds: [number, number, number, number][] = [
    [0.08, 0.30, 0.11, 0.055],
    [0.36, 0.44, 0.10, 0.050],
    [0.60, 0.34, 0.12, 0.055],
    [0.74, 0.56, 0.09, 0.048],
    [0.20, 0.66, 0.08, 0.048],
    [0.91, 0.40, 0.10, 0.052],
    [0.45, 0.20, 0.07, 0.040],
    [0.55, 0.70, 0.08, 0.045],
  ];
  clouds.forEach(([cx, cy, rx, ry]) =>
    ellipseBlob(ctx, cx, cy, rx, ry, 0, 255, 255, 255, 0.42, W, H)
  );

  return new THREE.CanvasTexture(cv);
}

// ── Component ────────────────────────────────────────────────────────────────
export default function SpacePage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const targetZoomRef = useRef(95);
  const currentZoomRef = useRef(220); // starts far for entry animation
  const handsActiveRef = useRef(false);
  const [camState, setCamState] = useState<"loading" | "ready" | "denied" | "error">("loading");

  // ── Dark mode guard — redirect to /profile in light mode ───────────────────
  useEffect(() => {
    const isDark = () => document.documentElement.classList.contains("dark");
    if (!isDark()) {
      router.replace("/profile");
      return;
    }
    const observer = new MutationObserver(() => {
      if (!isDark()) router.replace("/profile");
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, [router]);

  // ── Three.js scene ─────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Device tier — drives all quality decisions below
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      || window.innerWidth < 768;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x00000a);
    scene.fog = new THREE.FogExp2(0x00000a, 0.0012);

    // Camera
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1200);
    camera.position.set(0, 55, 220); // entry start position
    camera.lookAt(0, 0, 0);

    // ── Lighting ───────────────────────────────────────────────────────────
    const ambient = new THREE.AmbientLight(0x111133, 0.9);
    scene.add(ambient);

    const sunLight = new THREE.PointLight(0xfff0c0, 5.5, 250, 1.4);
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0x223344, 0.35);
    fillLight.position.set(-50, 30, -40);
    scene.add(fillLight);

    // ── Stars ──────────────────────────────────────────────────────────────
    const starCount = isMobile ? 1200 : 4000;
    const starPositions = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);
    for (let i = 0; i < starCount; i++) {
      // Distribute on sphere surface for even coverage
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 280 + Math.random() * 120;
      starPositions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);
      starSizes[i] = 0.4 + Math.random() * 1.6;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute("size", new THREE.BufferAttribute(starSizes, 1));
    const starMat = new THREE.PointsMaterial({
      color: 0xeef4ff,
      size: 0.55,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.85,
    });
    scene.add(new THREE.Points(starGeo, starMat));

    // ── Sun ────────────────────────────────────────────────────────────────
    const sunSeg = isMobile ? 24 : 48;
    const sunCore = new THREE.Mesh(
      new THREE.SphereGeometry(3.0, sunSeg, sunSeg),
      new THREE.MeshBasicMaterial({ color: 0xfff4a0 })
    );
    scene.add(sunCore);

    // Corona layers — desktop: 4 layers, mobile: 2 (innermost only)
    const coronaLayers = isMobile
      ? [
          { r: 3.6, opacity: 0.18, color: 0xffcc44 },
          { r: 5.0, opacity: 0.08, color: 0xff8800 },
        ]
      : [
          { r: 3.6, opacity: 0.18, color: 0xffcc44 },
          { r: 4.5, opacity: 0.10, color: 0xff8800 },
          { r: 6.2, opacity: 0.05, color: 0xff4400 },
          { r: 9.0, opacity: 0.02, color: 0xff2200 },
        ];
    coronaLayers.forEach(({ r, opacity, color }) => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(r, 32, 32),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity,
          side: THREE.BackSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      scene.add(mesh);
    });

    // ── Nebula background — skip on mobile (canvas texture upload is costly) ──
    if (!isMobile) scene.add(buildNebula());

    // ── Planets ────────────────────────────────────────────────────────────
    const planetPivots: {
      pivot: THREE.Object3D;
      mesh: THREE.Mesh;
      speed: number;
      spinRate: number;
    }[] = [];

    PLANET_DATA.forEach((p) => {
      // Orbit ring
      scene.add(buildOrbitRing(p.orbitR));

      // Pivot carries the planet around its orbit
      const pivot = new THREE.Object3D();
      scene.add(pivot);

      // Planet sphere — full PBR on desktop, lightweight on mobile
      const pSeg = isMobile ? 20 : 48;
      const geo = new THREE.SphereGeometry(p.size, pSeg, pSeg);

      // Procedural surface texture for key planets
      const surfaceTexture =
        p.name === "Jupiter" ? buildJupiterTexture() :
        p.name === "Saturn"  ? buildSaturnTexture()  :
        p.name === "Earth"   ? buildEarthTexture()   :
        null;
      // When a texture supplies the colour, use white so it isn't tinted
      const matColor = surfaceTexture ? new THREE.Color(0xffffff) : p.color;

      const mat = isMobile
        ? new THREE.MeshStandardMaterial({
            color: matColor,
            emissive: p.emissive,
            emissiveIntensity: 0.5,
            metalness: p.metalness,
            roughness: p.roughness,
            map: surfaceTexture ?? undefined,
          })
        : new THREE.MeshPhysicalMaterial({
            color: matColor,
            emissive: p.emissive,
            emissiveIntensity: 0.6,
            metalness: p.metalness,
            roughness: p.roughness,
            transmission: surfaceTexture ? 0 : 0.08, // no transmission on textured planets
            thickness: p.size * 1.2,
            ior: 1.38,
            clearcoat: 0.6,
            clearcoatRoughness: 0.25,
            transparent: !surfaceTexture,
            opacity: surfaceTexture ? 1 : 0.97,
            map: surfaceTexture ?? undefined,
          });
      const planetMesh = new THREE.Mesh(geo, mat);

      // Tilt group: rotates the spin axis to the planet's axial tilt,
      // then the mesh itself spins around its local Y inside that group.
      const tiltGroup = new THREE.Group();
      tiltGroup.rotation.z = p.axialTilt;
      tiltGroup.position.x = p.orbitR;
      tiltGroup.add(planetMesh);

      // Atmosphere + rim glow — fewer segments on mobile
      const glowSeg = isMobile ? 14 : 32;
      planetMesh.add(buildAtmosphere(p.size, p.atmoColor, glowSeg));
      planetMesh.add(buildRimGlow(p.size, p.atmoColor, glowSeg));

      // Rings (Saturn, Uranus) — attached to mesh so they tilt with it
      if ("hasRings" in p && p.hasRings && "ringColor" in p) {
        const inner = "ringInner" in p ? (p.ringInner as number) : 1.55;
        const outer = "ringOuter" in p ? (p.ringOuter as number) : 2.6;
        const tilt  = "ringTilt"  in p ? (p.ringTilt  as number) : Math.PI / 2.5;
        planetMesh.add(buildPlanetRings(p.ringColor as THREE.Color, inner, outer, tilt));
      }

      pivot.add(tiltGroup);
      pivot.rotation.y = Math.random() * Math.PI * 2;

      planetPivots.push({ pivot, mesh: planetMesh, speed: p.speed, spinRate: p.spinRate });
    });

    // ── Comets ─────────────────────────────────────────────────────────────
    const TAIL_LEN = isMobile ? 40 : 80;

    type CometObj = {
      head: THREE.Mesh;
      tailGeo: THREE.BufferGeometry;
      tailPos: Float32Array;
      vel: THREE.Vector3;
    };

    const spawnComet = (c: CometObj) => {
      // Random entry point on perimeter of the scene
      const angle  = Math.random() * Math.PI * 2;
      const startR = 110 + Math.random() * 20;
      const sx = Math.cos(angle) * startR;
      const sy = (Math.random() - 0.5) * 22;
      const sz = Math.sin(angle) * startR;

      c.head.position.set(sx, sy, sz);

      // Aim toward a random point near the solar system
      const tx = (Math.random() - 0.5) * 30;
      const ty = (Math.random() - 0.5) * 8;
      const tz = (Math.random() - 0.5) * 30;
      c.vel.set(tx - sx, ty - sy, tz - sz)
            .normalize()
            .multiplyScalar(13 + Math.random() * 9);

      // Collapse tail to spawn point so it doesn't streak across the scene
      for (let i = 0; i < TAIL_LEN * 3; i += 3) {
        c.tailPos[i]     = sx;
        c.tailPos[i + 1] = sy;
        c.tailPos[i + 2] = sz;
      }
      c.tailGeo.attributes.position.needsUpdate = true;
    };

    const makeComet = (staggerProgress = 0): CometObj => {
      // Head sphere
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 12, 12),
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      scene.add(head);

      // Head glow halo
      head.add(new THREE.Mesh(
        new THREE.SphereGeometry(0.62, 12, 12),
        new THREE.MeshBasicMaterial({
          color: 0x99ccff,
          transparent: true,
          opacity: 0.20,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.BackSide,
        })
      ));

      // Tail geometry — positions updated each frame, colors are pre-baked
      const tailPos    = new Float32Array(TAIL_LEN * 3);
      const tailColors = new Float32Array(TAIL_LEN * 3);
      for (let i = 0; i < TAIL_LEN; i++) {
        const t = i / (TAIL_LEN - 1); // 0 = tail end, 1 = head
        const b = t * t;              // quadratic falloff
        tailColors[i * 3]     = b;
        tailColors[i * 3 + 1] = b * 0.88;
        tailColors[i * 3 + 2] = b * 0.75; // warm blue-white
      }

      const tailGeo = new THREE.BufferGeometry();
      tailGeo.setAttribute("position", new THREE.BufferAttribute(tailPos, 3));
      tailGeo.setAttribute("color",    new THREE.BufferAttribute(tailColors, 3));
      scene.add(new THREE.Line(tailGeo, new THREE.LineBasicMaterial({ vertexColors: true })));

      const comet: CometObj = { head, tailGeo, tailPos, vel: new THREE.Vector3() };
      spawnComet(comet);

      // Fast-forward a staggered comet so it's mid-flight on load
      if (staggerProgress > 0) {
        const steps = Math.floor(staggerProgress * 300);
        for (let s = 0; s < steps; s++) {
          comet.head.position.addScaledVector(comet.vel, 0.016);
          comet.tailPos.copyWithin(0, 3);
          comet.tailPos[TAIL_LEN * 3 - 3] = comet.head.position.x;
          comet.tailPos[TAIL_LEN * 3 - 2] = comet.head.position.y;
          comet.tailPos[TAIL_LEN * 3 - 1] = comet.head.position.z;
          if (comet.head.position.length() > 130) { spawnComet(comet); break; }
        }
        comet.tailGeo.attributes.position.needsUpdate = true;
      }

      return comet;
    };

    // Two comets — second one fast-forwarded to appear mid-flight immediately
    const comets = [makeComet(0), makeComet(0.55)];

    // ── Animation loop ─────────────────────────────────────────────────────
    let animId: number;
    const clock = new THREE.Clock();

    // Entry animation constants
    const ENTRY_DURATION = 3.8;
    const ENTRY_Z0 = 220, ENTRY_Z1 = 95;
    const ENTRY_Y0 = 55,  ENTRY_Y1 = 20;
    let entryActive = true;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // ── Camera ────────────────────────────────────────────────────────
      if (entryActive) {
        // Cubic ease-out: start far/high, settle into orbit view
        const t = Math.min(elapsed / ENTRY_DURATION, 1);
        const e = 1 - Math.pow(1 - t, 3);
        const z = ENTRY_Z0 + (ENTRY_Z1 - ENTRY_Z0) * e;
        const y = ENTRY_Y0 + (ENTRY_Y1 - ENTRY_Y0) * e;
        camera.position.set(0, y, z);
        currentZoomRef.current = z;
        // Sync targetZoom only once at the end so gesture/keyboard
        // controls can take over immediately from the final position
        if (t >= 1) {
          targetZoomRef.current = z;
          entryActive = false;
        }
      } else {
        // Normal gesture-driven lerp
        currentZoomRef.current += (targetZoomRef.current - currentZoomRef.current) * 0.06;
        camera.position.set(0, 20, currentZoomRef.current);
      }
      camera.lookAt(0, 0, 0);

      // Planet orbits + axis self-rotation
      // Base spin: 0.004 rad/frame × spinRate multiplier
      planetPivots.forEach(({ pivot, mesh, speed, spinRate }) => {
        pivot.rotation.y += 0.0012 * speed;
        mesh.rotation.y  += 0.004  * spinRate;
      });

      // Comets — advance head, shift tail ring-buffer, respawn when off-screen
      comets.forEach((c) => {
        c.head.position.addScaledVector(c.vel, 0.016);
        // Shift all tail positions one slot toward index-0 (oldest end)
        c.tailPos.copyWithin(0, 3);
        // Write current head position into the newest slot
        c.tailPos[TAIL_LEN * 3 - 3] = c.head.position.x;
        c.tailPos[TAIL_LEN * 3 - 2] = c.head.position.y;
        c.tailPos[TAIL_LEN * 3 - 1] = c.head.position.z;
        c.tailGeo.attributes.position.needsUpdate = true;
        // Respawn once comet exits the scene
        if (c.head.position.length() > 135) spawnComet(c);
      });

      // Sun pulse
      const pulse = 1 + Math.sin(elapsed * 1.4) * 0.025;
      sunCore.scale.setScalar(pulse);

      renderer.render(scene, camera);
    };
    animate();

    // ── Resize ─────────────────────────────────────────────────────────────
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    // ── Touch pinch-zoom ────────────────────────────────────────────────────
    let lastPinchDist = 0;

    const pinchDist = (e: TouchEvent) => {
      const [a, b] = [e.touches[0], e.touches[1]];
      return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) lastPinchDist = pinchDist(e);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      e.preventDefault(); // stop page scroll during pinch
      const dist = pinchDist(e);
      const delta = lastPinchDist - dist; // positive = fingers closing = zoom in
      lastPinchDist = dist;
      targetZoomRef.current = Math.max(25, Math.min(130,
        targetZoomRef.current + delta * 0.35
      ));
    };

    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchmove",  onTouchMove,  { passive: false });

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove",  onTouchMove);
      renderer.dispose();
      scene.clear();
    };
  }, []);

  // ── Keyboard controls ──────────────────────────────────────────────────────
  useEffect(() => {
    const ZOOM_STEP = 6;
    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowUp":
        case "+":
        case "=":
          e.preventDefault();
          targetZoomRef.current = Math.max(25, targetZoomRef.current - ZOOM_STEP);
          break;
        case "ArrowDown":
        case "-":
          e.preventDefault();
          targetZoomRef.current = Math.min(130, targetZoomRef.current + ZOOM_STEP);
          break;
        case "Escape":
          router.push("/profile");
          break;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  // ── MediaPipe Hands ────────────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    if (!video || !overlayCanvas) return;

    let cameraUtils: { start: () => void; stop: () => void } | null = null;
    let stopped = false;

    const isMobileHands = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      || window.innerWidth < 768;

    const setup = async () => {
      // Pre-check camera permission before loading heavy MediaPipe bundles
      // Use front (selfie) camera — correct orientation for hand tracking
      const videoConstraints: MediaTrackConstraints = isMobileHands
        ? { facingMode: "user" }
        : { facingMode: { ideal: "user" } };
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints });
        stream.getTracks().forEach((t) => t.stop()); // release immediately
      } catch (err: unknown) {
        if (stopped) return;
        const name = err instanceof Error ? err.name : "";
        setCamState(name === "NotAllowedError" || name === "PermissionDeniedError" ? "denied" : "error");
        return;
      }

      if (stopped) return;

      const [{ Hands }, { Camera }] = await Promise.all([
        import("@mediapipe/hands"),
        import("@mediapipe/camera_utils"),
      ]);

      if (stopped) return;

      const hands = new Hands({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`,
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: isMobileHands ? 0 : 1, // lite model on mobile
        minDetectionConfidence: 0.72,
        minTrackingConfidence: 0.55,
      });

      hands.onResults((results) => {
        if (stopped) return;
        handsActiveRef.current = true;

        // Draw mirrored landmarks on overlay canvas
        const ctx = overlayCanvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          const landmarks = results.multiHandLandmarks[0];

          // Draw connections
          const connections: [number, number][] = [
            [0,1],[1,2],[2,3],[3,4],
            [0,5],[5,6],[6,7],[7,8],
            [0,9],[9,10],[10,11],[11,12],
            [0,13],[13,14],[14,15],[15,16],
            [0,17],[17,18],[18,19],[19,20],
            [5,9],[9,13],[13,17],
          ];
          ctx.strokeStyle = "rgba(120,180,255,0.55)";
          ctx.lineWidth = 1.5;
          connections.forEach(([a, b]) => {
            const lA = landmarks[a];
            const lB = landmarks[b];
            // Mirror X for selfie view
            ctx.beginPath();
            ctx.moveTo((1 - lA.x) * overlayCanvas.width, lA.y * overlayCanvas.height);
            ctx.lineTo((1 - lB.x) * overlayCanvas.width, lB.y * overlayCanvas.height);
            ctx.stroke();
          });

          // Draw keypoints
          landmarks.forEach((lm, i) => {
            const isThumb = i === 4;
            const isIndex = i === 8;
            const x = (1 - lm.x) * overlayCanvas.width;
            const y = lm.y * overlayCanvas.height;
            ctx.beginPath();
            ctx.arc(x, y, isThumb || isIndex ? 4.5 : 2.5, 0, Math.PI * 2);
            ctx.fillStyle = isThumb
              ? "rgba(255,160,60,0.95)"
              : isIndex
              ? "rgba(80,220,180,0.95)"
              : "rgba(140,180,255,0.75)";
            ctx.fill();
          });

          // Pinch detection
          const thumb = landmarks[4];
          const index = landmarks[8];
          const pinchDist = Math.hypot(thumb.x - index.x, thumb.y - index.y);

          // Draw pinch line
          ctx.beginPath();
          ctx.moveTo((1 - thumb.x) * overlayCanvas.width, thumb.y * overlayCanvas.height);
          ctx.lineTo((1 - index.x) * overlayCanvas.width, index.y * overlayCanvas.height);
          ctx.strokeStyle =
            pinchDist < 0.06
              ? "rgba(255,120,80,0.9)"
              : "rgba(100,255,180,0.7)";
          ctx.lineWidth = 2;
          ctx.stroke();

          // Map pinch distance → camera zoom
          // pinchDist ≈ 0.02 (fully pinched) → zoom 25 (close-up)
          // pinchDist ≈ 0.28 (fully spread)  → zoom 130 (full system view)
          const minDist = 0.02;
          const maxDist = 0.28;
          const t = Math.max(0, Math.min(1, (pinchDist - minDist) / (maxDist - minDist)));
          targetZoomRef.current = 25 + t * 105;
        }
      });

      cameraUtils = new Camera(video, {
        onFrame: async () => {
          if (!stopped) await hands.send({ image: video });
        },
        width: isMobileHands ? 160 : 200,
        height: isMobileHands ? 120 : 150,
        facingMode: "user",
      });
      cameraUtils.start();
      if (!stopped) setCamState("ready");
    };

    setup().catch((err: unknown) => {
      if (stopped) return;
      const name = err instanceof Error ? err.name : "";
      setCamState(name === "NotAllowedError" || name === "PermissionDeniedError" ? "denied" : "error");
    });

    return () => {
      stopped = true;
      cameraUtils?.stop();
    };
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#00000a]">
      {/* Three.js canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <motion.div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 pointer-events-none"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 2.4 }}
      >
        <div className="flex items-center gap-2 text-white/30 text-xs tracking-widest uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60 animate-pulse" />
          Space Mode
        </div>

        <button
          onClick={() => router.push("/profile")}
          className="pointer-events-auto group flex items-center gap-2 px-4 py-2 text-xs tracking-widest uppercase text-white/40 border border-white/10 rounded-full bg-white/[0.04] hover:text-white hover:border-white/25 hover:bg-white/[0.08] transition-all duration-300 cursor-pointer"
        >
          <span className="text-base leading-none">←</span>
          Exit
        </button>
      </motion.div>

      {/* ── Instructions ────────────────────────────────────────────────── */}
      <motion.div
        className="absolute bottom-4 right-4 text-right text-white/25 text-xs tracking-wide leading-6 select-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 4.0 }}
      >
        <div className="hidden sm:block">
          <span className="text-orange-400/60">●</span> thumb tip
          &nbsp;&nbsp;
          <span className="text-emerald-400/60">●</span> index tip
        </div>
        <div className="mt-1 text-white/20">Pinch to zoom in · Spread to zoom out</div>
        <div className="mt-0.5 text-white/15 hidden sm:block">↑ ↓ arrow keys or +/− to zoom · Esc to exit</div>
        <div className="mt-0.5 text-white/15 sm:hidden">Two fingers on screen to zoom</div>
      </motion.div>

      {/* ── Webcam preview ───────────────────────────────────────────────── */}
      <motion.div
        className="absolute bottom-4 left-4 rounded-2xl overflow-hidden border border-white/10"
        style={{
          boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.6)",
          background: "rgba(0,0,0,0.55)",
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 3.2 }}
      >
        {/* Card header */}
        <div className="absolute top-2 left-3 z-10 text-white/30 text-[10px] tracking-widest uppercase flex items-center gap-1.5">
          <span
            className={`w-1 h-1 rounded-full ${
              camState === "ready"
                ? "bg-red-500/70 animate-pulse"
                : camState === "loading"
                ? "bg-yellow-400/60 animate-pulse"
                : "bg-white/20"
            }`}
          />
          Cam
        </div>

        {/* Fixed-size content area — all states fill 200×150 (160×120 on mobile) */}
        <div className="relative w-[160px] h-[120px] sm:w-[200px] sm:h-[150px]">

          {/* ── Loading ── */}
          {camState === "loading" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              {/* Spinning ring */}
              <svg className="w-7 h-7 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.12)" strokeWidth="2" />
                <path d="M12 2 a10 10 0 0 1 10 10" stroke="rgba(120,180,255,0.7)" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="text-white/40 text-[10px] tracking-widest text-center leading-4">
                Initializing<br />camera…
              </span>
            </div>
          )}

          {/* ── Denied ── */}
          {camState === "denied" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4">
              <span className="text-2xl leading-none">🚫</span>
              <span className="text-white/50 text-[10px] tracking-wide text-center leading-4">
                Camera access blocked
              </span>
              <span className="text-white/25 text-[9px] tracking-wide text-center leading-3.5">
                Allow camera in your browser settings to use hand controls
              </span>
            </div>
          )}

          {/* ── Error ── */}
          {camState === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4">
              <span className="text-2xl leading-none">⚠️</span>
              <span className="text-white/50 text-[10px] tracking-wide text-center leading-4">
                Could not start camera
              </span>
              <span className="text-white/25 text-[9px] tracking-wide text-center leading-3.5">
                Arrow keys or touch still work for zoom
              </span>
            </div>
          )}

          {/* ── Ready — video + landmark overlay ── */}
          <video
            ref={videoRef}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
              camState === "ready" ? "opacity-55" : "opacity-0"
            }`}
            style={{ transform: "scaleX(-1)" }}
            playsInline
            muted
          />
          <canvas
            ref={overlayCanvasRef}
            width={200}
            height={150}
            className="absolute inset-0 w-full h-full"
          />
        </div>
      </motion.div>
    </div>
  );
}
