"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import SpaceIntroScreen from "@/components/SpaceIntroScreen";

// ── Planet data — all 8 ──────────────────────────────────────────────────────
// axialTilt: radians (realistic)  spinRate: multiplier vs Earth baseline
const PLANET_DATA = [
  {
    name: "Mercury",
    orbitR: 9,
    size: 0.38,
    speed: 0.8,
    axialTilt: 0.034,
    spinRate: 0.017,
    color: new THREE.Color(0x9ab0c8),
    emissive: new THREE.Color(0x1a2635),
    atmoColor: new THREE.Color(0x7090b0),
    metalness: 0.45,
    roughness: 0.68,
    fact: "Smallest planet in the solar system",
  },
  {
    name: "Venus",
    orbitR: 14,
    size: 0.72,
    speed: 0.5,
    axialTilt: 3.096,
    spinRate: -0.004, // retrograde spin
    color: new THREE.Color(0xd4aa70),
    emissive: new THREE.Color(0x2a1800),
    atmoColor: new THREE.Color(0xe8c060),
    metalness: 0.08,
    roughness: 0.82,
    fact: "Hottest planet in the solar system",
  },
  {
    name: "Earth",
    orbitR: 20,
    size: 0.76,
    speed: 0.38,
    axialTilt: 0.409,
    spinRate: 1.0,
    color: new THREE.Color(0x3a7acc),
    emissive: new THREE.Color(0x001122),
    atmoColor: new THREE.Color(0x55aaee),
    metalness: 0.12,
    roughness: 0.52,
    fact: "The only known planet with life",
  },
  {
    name: "Mars",
    orbitR: 27,
    size: 0.55,
    speed: 0.26,
    axialTilt: 0.44,
    spinRate: 0.97,
    color: new THREE.Color(0xcc6644),
    emissive: new THREE.Color(0x1a0800),
    atmoColor: new THREE.Color(0xdd7755),
    metalness: 0.18,
    roughness: 0.75,
    fact: "Home to the tallest volcano — Olympus Mons",
  },
  {
    name: "Jupiter",
    orbitR: 38,
    size: 1.85,
    speed: 0.14,
    axialTilt: 0.054,
    spinRate: 2.4, // fastest spinner
    color: new THREE.Color(0xc8a878),
    emissive: new THREE.Color(0x1a1000),
    atmoColor: new THREE.Color(0xddbb88),
    metalness: 0.05,
    roughness: 0.9,
    fact: "Largest planet — fits 1,300 Earths inside",
  },
  {
    name: "Saturn",
    orbitR: 51,
    size: 1.55,
    speed: 0.09,
    axialTilt: 0.467,
    spinRate: 2.25,
    color: new THREE.Color(0xd4c090),
    emissive: new THREE.Color(0x181000),
    atmoColor: new THREE.Color(0xe8d8a0),
    metalness: 0.05,
    roughness: 0.88,
    hasRings: true,
    ringColor: new THREE.Color(0xb8a070),
    ringInner: 2.1,
    ringOuter: 3.8,
    ringTilt: 0.46,
    fact: "Its rings could span from Earth to the Moon",
  },
  {
    name: "Uranus",
    orbitR: 64,
    size: 1.1,
    speed: 0.055,
    axialTilt: 1.706,
    spinRate: 1.4, // ~98° — rolls on its side
    color: new THREE.Color(0x7dd8e0),
    emissive: new THREE.Color(0x001820),
    atmoColor: new THREE.Color(0x88eeff),
    metalness: 0.1,
    roughness: 0.6,
    hasRings: true,
    ringColor: new THREE.Color(0x55aaaa),
    ringInner: 1.5,
    ringOuter: 2.2,
    ringTilt: 1.5,
    fact: "Rotates on its side at 98°",
  },
  {
    name: "Neptune",
    orbitR: 78,
    size: 1.05,
    speed: 0.034,
    axialTilt: 0.494,
    spinRate: 1.5,
    color: new THREE.Color(0x3355cc),
    emissive: new THREE.Color(0x000820),
    atmoColor: new THREE.Color(0x4466ee),
    metalness: 0.12,
    roughness: 0.58,
    fact: "Winds reach 1,200 mph — fastest in the solar system",
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
  const tube = (outerR - innerR) / 2;
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
    points.push(
      new THREE.Vector3(Math.cos(theta) * radius, 0, Math.sin(theta) * radius),
    );
  }
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineBasicMaterial({
    color: 0x334466,
    transparent: true,
    opacity: 0.22,
  });
  return new THREE.LineLoop(geo, mat);
}

function buildNebula(mobile = false): THREE.Mesh {
  const W = mobile ? 512 : 2048,
    H = mobile ? 256 : 1024;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Transparent base — the scene background shows through
  ctx.clearRect(0, 0, W, H);

  // Each entry: [cx%, cy%, radiusX%, radiusY%, rotAngle, r, g, b, maxOpacity]
  const blobs: [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ][] = [
    [0.18, 0.35, 0.4, 0.22, 0.4, 58, 26, 106, 0.28], // large purple cloud
    [0.72, 0.55, 0.32, 0.18, -0.3, 10, 32, 80, 0.24], // deep blue
    [0.5, 0.18, 0.26, 0.14, 0.8, 35, 10, 90, 0.18], // violet wisp
    [0.88, 0.3, 0.22, 0.15, 0.2, 10, 55, 55, 0.2], // teal
    [0.3, 0.72, 0.28, 0.17, -0.5, 70, 10, 55, 0.16], // magenta
    [0.62, 0.78, 0.2, 0.12, 0.1, 85, 35, 10, 0.14], // warm orange (star formation)
    [0.05, 0.6, 0.18, 0.12, 0.6, 20, 10, 70, 0.15], // indigo edge
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
    grad.addColorStop(0, `rgba(${r},${g},${b},${maxOp})`);
    grad.addColorStop(0.4, `rgba(${r},${g},${b},${(maxOp * 0.45).toFixed(3)})`);
    grad.addColorStop(
      0.75,
      `rgba(${r},${g},${b},${(maxOp * 0.12).toFixed(3)})`,
    );
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, rX, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  const tex = new THREE.CanvasTexture(canvas);
  const geo = new THREE.SphereGeometry(560, mobile ? 24 : 48, mobile ? 24 : 48);
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
  cx: number,
  cy: number, // 0-1 fractions of canvas size
  rx: number,
  ry: number, // 0-1 fractions of canvas size
  angle: number,
  r: number,
  g: number,
  b: number,
  alpha: number,
  W: number,
  H: number,
) {
  ctx.save();
  ctx.translate(cx * W, cy * H);
  ctx.rotate(angle);
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  grad.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
  grad.addColorStop(0.65, `rgba(${r},${g},${b},${(alpha * 0.55).toFixed(3)})`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.scale(rx * W, ry * H);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function buildJupiterTexture(): THREE.CanvasTexture {
  const W = 512,
    H = 256;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d")!;

  // Warm tan base
  ctx.fillStyle = "#c8a060";
  ctx.fillRect(0, 0, W, H);

  // Horizontal cloud bands [y, height, r, g, b, alpha]
  const bands: [number, number, number, number, number, number][] = [
    [0.0, 0.055, 50, 30, 12, 0.8],
    [0.06, 0.045, 220, 165, 85, 0.55],
    [0.11, 0.075, 100, 58, 22, 0.82],
    [0.19, 0.045, 240, 205, 125, 0.48],
    [0.24, 0.065, 80, 48, 18, 0.78],
    [0.31, 0.075, 210, 155, 85, 0.52],
    [0.39, 0.05, 58, 34, 12, 0.8],
    [0.44, 0.085, 235, 190, 110, 0.46],
    [0.53, 0.06, 110, 62, 24, 0.78],
    [0.59, 0.075, 215, 158, 88, 0.52],
    [0.67, 0.05, 55, 32, 10, 0.8],
    [0.72, 0.08, 230, 185, 105, 0.48],
    [0.8, 0.055, 95, 55, 20, 0.78],
    [0.86, 0.06, 205, 155, 80, 0.52],
    [0.92, 0.08, 50, 28, 10, 0.8],
  ];

  bands.forEach(([y, h, r, g, b, a]) => {
    // Soft edge: gradient fades in/out so bands blend
    const grad = ctx.createLinearGradient(0, y * H, 0, (y + h) * H);
    grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
    grad.addColorStop(0.2, `rgba(${r},${g},${b},${a})`);
    grad.addColorStop(0.8, `rgba(${r},${g},${b},${a})`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, y * H - 2, W, h * H + 4);
  });

  // Great Red Spot — oval storm, southern hemisphere
  const grsX = 0.55,
    grsY = 0.61,
    grsRx = 0.068,
    grsRy = 0.095;
  // Outer glow
  ellipseBlob(
    ctx,
    grsX,
    grsY,
    grsRx * 1.7,
    grsRy * 1.5,
    0,
    160,
    40,
    8,
    0.35,
    W,
    H,
  );
  // Core
  ellipseBlob(ctx, grsX, grsY, grsRx, grsRy, 0, 195, 55, 18, 0.9, W, H);
  // Inner bright centre
  ellipseBlob(
    ctx,
    grsX,
    grsY,
    grsRx * 0.4,
    grsRy * 0.4,
    0,
    215,
    80,
    30,
    0.7,
    W,
    H,
  );

  return new THREE.CanvasTexture(cv);
}

function buildSaturnTexture(): THREE.CanvasTexture {
  const W = 512,
    H = 256;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d")!;

  ctx.fillStyle = "#d8c880";
  ctx.fillRect(0, 0, W, H);

  // Subtler, paler bands than Jupiter
  const bands: [number, number, number, number, number, number][] = [
    [0.0, 0.06, 140, 110, 45, 0.38],
    [0.08, 0.07, 170, 148, 80, 0.3],
    [0.17, 0.08, 125, 98, 35, 0.4],
    [0.27, 0.06, 185, 165, 100, 0.28],
    [0.35, 0.09, 148, 118, 48, 0.38],
    [0.46, 0.07, 175, 155, 85, 0.3],
    [0.55, 0.08, 132, 105, 40, 0.38],
    [0.65, 0.06, 180, 160, 95, 0.28],
    [0.73, 0.08, 138, 110, 44, 0.36],
    [0.83, 0.06, 165, 142, 75, 0.3],
    [0.91, 0.09, 128, 100, 36, 0.38],
  ];

  bands.forEach(([y, h, r, g, b, a]) => {
    const grad = ctx.createLinearGradient(0, y * H, 0, (y + h) * H);
    grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
    grad.addColorStop(0.2, `rgba(${r},${g},${b},${a})`);
    grad.addColorStop(0.8, `rgba(${r},${g},${b},${a})`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
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
  const W = 512,
    H = 256;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d")!;

  // Deep ocean base
  ctx.fillStyle = "#1a4a88";
  ctx.fillRect(0, 0, W, H);

  // Shallow water (near coasts)
  ctx.fillStyle = "#245a9a";
  ctx.fillRect(0, 0, W, H);

  // Continents — approximate equirectangular positions
  // North America
  ellipseBlob(ctx, 0.12, 0.31, 0.095, 0.17, -0.2, 55, 100, 35, 0.9, W, H);
  ellipseBlob(ctx, 0.17, 0.21, 0.055, 0.1, 0.1, 60, 110, 40, 0.85, W, H);
  ellipseBlob(ctx, 0.09, 0.4, 0.04, 0.08, -0.1, 65, 105, 38, 0.8, W, H);
  // South America
  ellipseBlob(ctx, 0.22, 0.62, 0.052, 0.17, 0.15, 48, 92, 28, 0.9, W, H);
  ellipseBlob(ctx, 0.24, 0.5, 0.03, 0.06, 0.0, 52, 100, 32, 0.8, W, H);
  // Europe
  ellipseBlob(ctx, 0.49, 0.24, 0.038, 0.09, 0.1, 62, 108, 42, 0.85, W, H);
  ellipseBlob(ctx, 0.47, 0.18, 0.02, 0.05, -0.2, 58, 102, 38, 0.78, W, H);
  // Africa
  ellipseBlob(ctx, 0.52, 0.52, 0.068, 0.2, 0.05, 78, 108, 44, 0.92, W, H);
  ellipseBlob(ctx, 0.5, 0.36, 0.048, 0.09, -0.1, 72, 98, 38, 0.82, W, H);
  // Asia — multiple overlapping blobs
  ellipseBlob(ctx, 0.68, 0.26, 0.135, 0.18, 0.1, 58, 98, 36, 0.9, W, H);
  ellipseBlob(ctx, 0.81, 0.2, 0.075, 0.12, -0.2, 54, 92, 34, 0.85, W, H);
  ellipseBlob(ctx, 0.62, 0.37, 0.058, 0.09, 0.2, 62, 104, 40, 0.8, W, H);
  ellipseBlob(ctx, 0.75, 0.35, 0.045, 0.08, 0.1, 56, 96, 35, 0.78, W, H);
  // Australia — warm arid tones
  ellipseBlob(ctx, 0.84, 0.67, 0.052, 0.1, 0.1, 148, 118, 52, 0.88, W, H);
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
    [0.08, 0.3, 0.11, 0.055],
    [0.36, 0.44, 0.1, 0.05],
    [0.6, 0.34, 0.12, 0.055],
    [0.74, 0.56, 0.09, 0.048],
    [0.2, 0.66, 0.08, 0.048],
    [0.91, 0.4, 0.1, 0.052],
    [0.45, 0.2, 0.07, 0.04],
    [0.55, 0.7, 0.08, 0.045],
  ];
  clouds.forEach(([cx, cy, rx, ry]) =>
    ellipseBlob(ctx, cx, cy, rx, ry, 0, 255, 255, 255, 0.42, W, H),
  );

  return new THREE.CanvasTexture(cv);
}

function buildSunTexture(): THREE.CanvasTexture {
  const W = 512,
    H = 256;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d")!;

  // Warm base gradient
  const base = ctx.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0, "#ffcc44");
  base.addColorStop(0.3, "#ffaa22");
  base.addColorStop(0.5, "#ffbb33");
  base.addColorStop(0.7, "#ff9911");
  base.addColorStop(1, "#ffcc44");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);

  // Solar granulation — many small bright cells
  for (let i = 0; i < 260; i++) {
    const cx = Math.random() * W;
    const cy = Math.random() * H;
    const r = 4 + Math.random() * 12;
    const bright = Math.random();
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    if (bright > 0.7) {
      // Bright granule
      grad.addColorStop(0, `rgba(255,240,160,${0.3 + bright * 0.3})`);
      grad.addColorStop(0.6, `rgba(255,200,80,${0.15 + bright * 0.1})`);
      grad.addColorStop(1, "rgba(255,180,60,0)");
    } else {
      // Darker intergranular lane
      grad.addColorStop(0, `rgba(200,100,10,${0.2 + bright * 0.15})`);
      grad.addColorStop(0.5, `rgba(180,80,5,${0.1 + bright * 0.05})`);
      grad.addColorStop(1, "rgba(160,70,0,0)");
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Sunspots — a few dark regions
  const spots: [number, number, number][] = [
    [0.3, 0.45, 0.035],
    [0.65, 0.55, 0.025],
    [0.5, 0.35, 0.02],
    [0.8, 0.4, 0.018],
  ];
  spots.forEach(([sx, sy, sr]) => {
    const px = sx * W,
      py = sy * H,
      pr = sr * W;
    // Dark umbra
    ellipseBlob(ctx, sx, sy, sr * 0.5, sr * 0.5, 0, 60, 20, 0, 0.85, W, H);
    // Penumbra
    const pen = ctx.createRadialGradient(px, py, pr * 0.3, px, py, pr);
    pen.addColorStop(0, "rgba(100,40,5,0.6)");
    pen.addColorStop(0.5, "rgba(160,70,10,0.3)");
    pen.addColorStop(1, "rgba(200,100,20,0)");
    ctx.fillStyle = pen;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
  });

  // Bright faculae near sunspots
  ellipseBlob(ctx, 0.25, 0.42, 0.06, 0.03, 0.3, 255, 230, 140, 0.35, W, H);
  ellipseBlob(ctx, 0.7, 0.58, 0.05, 0.025, -0.2, 255, 235, 150, 0.3, W, H);

  // Limb darkening (edges of the equirectangular map → poles of the sphere)
  const northDark = ctx.createLinearGradient(0, 0, 0, H * 0.12);
  northDark.addColorStop(0, "rgba(120,50,0,0.5)");
  northDark.addColorStop(1, "rgba(120,50,0,0)");
  ctx.fillStyle = northDark;
  ctx.fillRect(0, 0, W, H * 0.12);
  const southDark = ctx.createLinearGradient(0, H * 0.88, 0, H);
  southDark.addColorStop(0, "rgba(120,50,0,0)");
  southDark.addColorStop(1, "rgba(120,50,0,0.5)");
  ctx.fillStyle = southDark;
  ctx.fillRect(0, H * 0.88, W, H * 0.12);

  return new THREE.CanvasTexture(cv);
}

// ── Component ────────────────────────────────────────────────────────────────
export default function SpacePage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const planetLabelRef = useRef<HTMLDivElement>(null);
  const targetZoomRef = useRef(95);
  const currentZoomRef = useRef(220); // starts far for entry animation
  const handsActiveRef = useRef(false);
  const [camState, setCamState] = useState<
    "loading" | "ready" | "denied" | "error"
  >("loading");

  // ── Dark mode guard — redirect to /profile if accessed in light mode ─────────
  // Only checked at mount; "dark" is hardcoded in layout so this is purely defensive.
  useEffect(() => {
    if (!document.documentElement.classList.contains("dark")) {
      router.replace("/profile");
    }
  }, [router]);

  // ── Space background audio ─────────────────────────────────────────────────
  useEffect(() => {
    const audio = new Audio("/sfx/space-background.mp3");
    audio.loop = true;

    const unlock = () => {
      document.removeEventListener("click", unlock);
      document.removeEventListener("keydown", unlock);
      document.removeEventListener("touchstart", unlock);
      document.removeEventListener("mousemove", unlock);
      audio.play().catch(() => {});
    };

    const removeUnlock = () => {
      document.removeEventListener("click", unlock);
      document.removeEventListener("keydown", unlock);
      document.removeEventListener("touchstart", unlock);
      document.removeEventListener("mousemove", unlock);
    };

    audio.play().catch((err: unknown) => {
      if (!(err instanceof DOMException && err.name === "NotAllowedError"))
        return;
      document.addEventListener("click", unlock);
      document.addEventListener("keydown", unlock);
      document.addEventListener("touchstart", unlock);
      document.addEventListener("mousemove", unlock);
    });

    return () => {
      removeUnlock();
      audio.pause();
      audio.src = "";
    };
  }, []);

  // ── Three.js scene ─────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Device tier — drives all quality decisions below
    const isMobile =
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
      window.innerWidth < 768;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !isMobile,
      alpha: false,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2),
    );
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x00000a);
    scene.fog = new THREE.FogExp2(0x00000a, 0.0012);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      1200,
    );
    camera.position.set(0, isMobile ? 40 : 55, isMobile ? 160 : 220); // entry start position
    camera.lookAt(0, 0, 0);

    // ── Bloom post-processing (reduced on mobile) ─────────────────────────
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      isMobile ? 0.5 : 0.8,
      isMobile ? 0.3 : 0.4,
      isMobile ? 0.25 : 0.15,
    );
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());

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
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);
      starSizes[i] = 0.4 + Math.random() * 1.6;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(starPositions, 3),
    );
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
    const sunTex = buildSunTexture();
    const sunCore = new THREE.Mesh(
      new THREE.SphereGeometry(3.0, sunSeg, sunSeg),
      new THREE.MeshBasicMaterial({ map: sunTex }),
    );
    scene.add(sunCore);

    // Inner plasma layer — slightly larger, rotates independently for depth
    const sunLayer = new THREE.Mesh(
      new THREE.SphereGeometry(3.12, sunSeg, sunSeg),
      new THREE.MeshBasicMaterial({
        map: sunTex,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    sunLayer.rotation.y = Math.PI; // offset so granules don't align
    scene.add(sunLayer);

    // Corona layers — desktop: 4 layers, mobile: 2 (innermost only)
    const coronaLayers = isMobile
      ? [
          { r: 3.6, opacity: 0.18, color: 0xffcc44 },
          { r: 5.0, opacity: 0.08, color: 0xff8800 },
        ]
      : [
          { r: 3.6, opacity: 0.18, color: 0xffcc44 },
          { r: 4.5, opacity: 0.1, color: 0xff8800 },
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
        }),
      );
      scene.add(mesh);
    });

    // ── Nebula background (smaller texture on mobile) ──
    scene.add(buildNebula(isMobile));

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
        p.name === "Jupiter"
          ? buildJupiterTexture()
          : p.name === "Saturn"
            ? buildSaturnTexture()
            : p.name === "Earth"
              ? buildEarthTexture()
              : null;
      // When a texture supplies the colour, use white so it isn't tinted
      const matColor = surfaceTexture ? new THREE.Color(0xffffff) : p.color;

      const mat = isMobile
        ? new THREE.MeshStandardMaterial({
            color: matColor,
            emissive: p.emissive,
            emissiveIntensity: 0.5,
            metalness: p.metalness,
            roughness: p.roughness,
            ...(surfaceTexture ? { map: surfaceTexture } : {}),
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
            ...(surfaceTexture ? { map: surfaceTexture } : {}),
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
        const tilt = "ringTilt" in p ? (p.ringTilt as number) : Math.PI / 2.5;
        planetMesh.add(
          buildPlanetRings(p.ringColor as THREE.Color, inner, outer, tilt),
        );
      }

      pivot.add(tiltGroup);
      pivot.rotation.y = Math.random() * Math.PI * 2;

      planetPivots.push({
        pivot,
        mesh: planetMesh,
        speed: p.speed,
        spinRate: p.spinRate,
      });
    });

    // ── Planet meshes for raycasting ────────────────────────────────────────
    const planetMeshes = planetPivots.map((pp) => pp.mesh);

    // ── Raycaster for planet hover/click ────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-999, -999);
    let hoveredPlanetIdx = -1;
    let prevHoveredIdx = -1;
    let mouseDirty = false;
    const cameraLookAtTarget = new THREE.Vector3(0, 0, 0);
    const cameraLookAtCurrent = new THREE.Vector3(0, 0, 0);
    const _hoverScaleVec = new THREE.Vector3();
    const _worldPos = new THREE.Vector3();
    const _ssHead = new THREE.Vector3();
    const _ssTail = new THREE.Vector3();

    // ── Asteroid Belt (between Mars & Jupiter) ─────────────────────────────
    const asteroidCount = isMobile ? 100 : 300;
    const asteroidGeo = new THREE.IcosahedronGeometry(0.08, 0);
    const asteroidMat = new THREE.MeshStandardMaterial({
      color: 0x666655,
      roughness: 0.9,
      metalness: 0.1,
    });
    const asteroidMesh = new THREE.InstancedMesh(
      asteroidGeo,
      asteroidMat,
      asteroidCount,
    );
    const dummy = new THREE.Object3D();
    for (let i = 0; i < asteroidCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 29 + Math.random() * 7;
      const y = (Math.random() - 0.5) * 3;
      const scale = 0.5 + Math.random();
      dummy.position.set(Math.cos(angle) * r, y, Math.sin(angle) * r);
      dummy.scale.setScalar(scale);
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      dummy.updateMatrix();
      asteroidMesh.setMatrixAt(i, dummy.matrix);
    }
    const asteroidGroup = new THREE.Group();
    asteroidGroup.add(asteroidMesh);
    scene.add(asteroidGroup);

    // ── Shooting Stars (pooled — no alloc in animation loop) ──────────────
    const SS_POOL_SIZE = 8;
    type ShootingStar = {
      line: THREE.Line;
      mat: THREE.LineBasicMaterial;
      positions: Float32Array;
      direction: THREE.Vector3;
      origin: THREE.Vector3;
      startTime: number;
      duration: number;
      active: boolean;
    };
    const shootingStarPool: ShootingStar[] = [];
    for (let i = 0; i < SS_POOL_SIZE; i++) {
      const positions = new Float32Array(6);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.LineBasicMaterial({
        color: 0xccddff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const line = new THREE.Line(geo, mat);
      line.visible = false;
      scene.add(line);
      shootingStarPool.push({
        line,
        mat,
        positions,
        direction: new THREE.Vector3(),
        origin: new THREE.Vector3(),
        startTime: 0,
        duration: 0.6,
        active: false,
      });
    }
    let nextShootTime = 2 + Math.random() * 4;
    const spawnShootingStar = (time: number) => {
      const s = shootingStarPool.find((p) => !p.active);
      if (!s) return; // pool exhausted, skip
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 250;
      s.origin.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi),
      );
      s.direction
        .set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
        .normalize()
        .multiplyScalar(10 + Math.random() * 5);
      s.startTime = time;
      s.active = true;
      s.line.visible = true;
      s.mat.opacity = 0;
    };

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
      const angle = Math.random() * Math.PI * 2;
      const startR = 110 + Math.random() * 20;
      const sx = Math.cos(angle) * startR;
      const sy = (Math.random() - 0.5) * 22;
      const sz = Math.sin(angle) * startR;

      c.head.position.set(sx, sy, sz);

      // Aim toward a random point near the solar system
      const tx = (Math.random() - 0.5) * 30;
      const ty = (Math.random() - 0.5) * 8;
      const tz = (Math.random() - 0.5) * 30;
      c.vel
        .set(tx - sx, ty - sy, tz - sz)
        .normalize()
        .multiplyScalar(13 + Math.random() * 9);

      // Collapse tail to spawn point so it doesn't streak across the scene
      for (let i = 0; i < TAIL_LEN * 3; i += 3) {
        c.tailPos[i] = sx;
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
        }),
      );
      scene.add(head);

      // Head glow halo
      head.add(
        new THREE.Mesh(
          new THREE.SphereGeometry(0.62, 12, 12),
          new THREE.MeshBasicMaterial({
            color: 0x99ccff,
            transparent: true,
            opacity: 0.2,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.BackSide,
          }),
        ),
      );

      // Tail geometry — positions updated each frame, colors are pre-baked
      const tailPos = new Float32Array(TAIL_LEN * 3);
      const tailColors = new Float32Array(TAIL_LEN * 3);
      for (let i = 0; i < TAIL_LEN; i++) {
        const t = i / (TAIL_LEN - 1); // 0 = tail end, 1 = head
        const b = t * t; // quadratic falloff
        tailColors[i * 3] = b;
        tailColors[i * 3 + 1] = b * 0.88;
        tailColors[i * 3 + 2] = b * 0.75; // warm blue-white
      }

      const tailGeo = new THREE.BufferGeometry();
      tailGeo.setAttribute("position", new THREE.BufferAttribute(tailPos, 3));
      tailGeo.setAttribute("color", new THREE.BufferAttribute(tailColors, 3));
      scene.add(
        new THREE.Line(
          tailGeo,
          new THREE.LineBasicMaterial({ vertexColors: true }),
        ),
      );

      const comet: CometObj = {
        head,
        tailGeo,
        tailPos,
        vel: new THREE.Vector3(),
      };
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
          if (comet.head.position.length() > 130) {
            spawnComet(comet);
            break;
          }
        }
        comet.tailGeo.attributes.position.needsUpdate = true;
      }

      return comet;
    };

    // Two comets — second one fast-forwarded to appear mid-flight immediately
    const comets = [makeComet(0), makeComet(0.55)];

    // ── Animation loop ─────────────────────────────────────────────────────
    let animId: number;
    const timer = new THREE.Timer();

    // Entry animation constants — mobile starts closer so the scene is immediately visible
    const ENTRY_DURATION = isMobile ? 2.5 : 3.8;
    const ENTRY_Z0 = isMobile ? 160 : 220,
      ENTRY_Z1 = 95;
    const ENTRY_Y0 = isMobile ? 40 : 55,
      ENTRY_Y1 = 20;
    let entryActive = true;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      timer.update();
      const elapsed = timer.getElapsed();

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
        currentZoomRef.current +=
          (targetZoomRef.current - currentZoomRef.current) * 0.06;
        camera.position.set(0, 20, currentZoomRef.current);
      }
      cameraLookAtTarget.multiplyScalar(0.997);
      cameraLookAtCurrent.lerp(cameraLookAtTarget, 0.03);
      camera.lookAt(cameraLookAtCurrent);

      // Planet orbits + axis self-rotation
      // Base spin: 0.004 rad/frame × spinRate multiplier
      planetPivots.forEach(({ pivot, mesh, speed, spinRate }) => {
        pivot.rotation.y += 0.0012 * speed;
        mesh.rotation.y += 0.004 * spinRate;
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

      // Sun pulse + rotation
      const pulse = 1 + Math.sin(elapsed * 1.4) * 0.025;
      sunCore.scale.setScalar(pulse);
      sunCore.rotation.y += 0.001;
      sunLayer.scale.setScalar(pulse * 1.01);
      sunLayer.rotation.y -= 0.0007;
      sunLayer.rotation.x += 0.0003;

      // ── Asteroid belt rotation ──
      asteroidGroup.rotation.y += 0.0003;

      // ── Shooting stars (pooled) ──
      if (elapsed >= nextShootTime) {
        const count = 3 + Math.floor(Math.random() * 2);
        for (let i = 0; i < count; i++) spawnShootingStar(elapsed);
        nextShootTime = elapsed + 4 + Math.random() * 4;
      }
      for (let i = 0; i < shootingStarPool.length; i++) {
        const s = shootingStarPool[i];
        if (!s.active) continue;
        const t = (elapsed - s.startTime) / s.duration;
        if (t >= 1) {
          s.active = false;
          s.line.visible = false;
          continue;
        }
        const fade = t < 0.3 ? t / 0.3 : t > 0.7 ? (1 - t) / 0.3 : 1;
        s.mat.opacity = fade * 0.9;
        _ssHead.copy(s.origin).addScaledVector(s.direction, t);
        _ssTail
          .copy(s.origin)
          .addScaledVector(s.direction, Math.max(0, t - 0.35));
        s.positions[0] = _ssTail.x;
        s.positions[1] = _ssTail.y;
        s.positions[2] = _ssTail.z;
        s.positions[3] = _ssHead.x;
        s.positions[4] = _ssHead.y;
        s.positions[5] = _ssHead.z;
        s.line.geometry.attributes.position.needsUpdate = true;
      }

      // ── Planet hover — raycast only when mouse moved ──
      if (mouseDirty) {
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(planetMeshes);
        hoveredPlanetIdx =
          intersects.length > 0
            ? planetMeshes.indexOf(intersects[0].object as THREE.Mesh)
            : -1;
        mouseDirty = false;
      }
      planetMeshes.forEach((m, i) => {
        _hoverScaleVec.setScalar(i === hoveredPlanetIdx ? 1.15 : 1);
        m.scale.lerp(_hoverScaleVec, 0.1);
      });
      // DOM writes only on hover state change (avoid per-frame reflow)
      if (hoveredPlanetIdx !== prevHoveredIdx) {
        canvas.style.cursor = hoveredPlanetIdx >= 0 ? "pointer" : "default";
        const labelEl = planetLabelRef.current;
        if (labelEl) {
          if (hoveredPlanetIdx >= 0) {
            const planet = PLANET_DATA[hoveredPlanetIdx];
            labelEl.style.display = "block";
            labelEl.innerHTML = `<div style="font-weight:600;font-size:13px">${planet.name}</div><div style="opacity:0.7;font-size:10px;margin-top:2px">${planet.fact}</div>`;
          } else {
            labelEl.style.display = "none";
          }
        }
        prevHoveredIdx = hoveredPlanetIdx;
      }
      // Label position tracks orbiting planet (lightweight: 2 style writes)
      if (hoveredPlanetIdx >= 0) {
        const labelEl = planetLabelRef.current;
        if (labelEl) {
          planetMeshes[hoveredPlanetIdx].getWorldPosition(_worldPos);
          _worldPos.project(camera);
          labelEl.style.left = `${(_worldPos.x * 0.5 + 0.5) * window.innerWidth}px`;
          labelEl.style.top = `${(-_worldPos.y * 0.5 + 0.5) * window.innerHeight - 30}px`;
        }
      }

      composer.render();
    };
    animate();

    // ── Resize ─────────────────────────────────────────────────────────────
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
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
      targetZoomRef.current = Math.max(
        25,
        Math.min(130, targetZoomRef.current + delta * 0.35),
      );
    };

    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });

    // ── Mouse/touch interaction for planets ─────────────────────────────────
    const onMouseMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      mouseDirty = true;
    };
    const zoomToPlanet = (idx: number) => {
      const mesh = planetMeshes[idx];
      const worldPos = new THREE.Vector3();
      mesh.getWorldPosition(worldPos);
      targetZoomRef.current = Math.max(25, PLANET_DATA[idx].orbitR * 0.7);
      cameraLookAtTarget.copy(worldPos).multiplyScalar(0.3);
    };
    const onCanvasClick = () => {
      if (hoveredPlanetIdx >= 0) zoomToPlanet(hoveredPlanetIdx);
    };
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("click", onCanvasClick);

    // Mobile tap for planet interaction
    let tapStartTime = 0;
    const onTapStart = (e: TouchEvent) => {
      if (e.touches.length === 1) tapStartTime = Date.now();
    };
    const onTapEnd = (e: TouchEvent) => {
      if (Date.now() - tapStartTime > 300 || e.changedTouches.length !== 1)
        return;
      const touch = e.changedTouches[0];
      mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(planetMeshes);
      if (hits.length > 0) {
        const idx = planetMeshes.indexOf(hits[0].object as THREE.Mesh);
        if (idx >= 0) zoomToPlanet(idx);
      }
    };
    canvas.addEventListener("touchstart", onTapStart, { passive: true });
    canvas.addEventListener("touchend", onTapEnd, { passive: true });

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("click", onCanvasClick);
      canvas.removeEventListener("touchstart", onTapStart);
      canvas.removeEventListener("touchend", onTapEnd);
      shootingStarPool.forEach((s) => {
        s.line.geometry.dispose();
        s.mat.dispose();
      });
      composer.dispose();
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
          targetZoomRef.current = Math.max(
            25,
            targetZoomRef.current - ZOOM_STEP,
          );
          break;
        case "ArrowDown":
        case "-":
          e.preventDefault();
          targetZoomRef.current = Math.min(
            130,
            targetZoomRef.current + ZOOM_STEP,
          );
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

    const isMobileHands =
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
      window.innerWidth < 768;

    const setup = async () => {
      // Pre-check camera permission before loading heavy MediaPipe bundles
      // Use front (selfie) camera — correct orientation for hand tracking
      const videoConstraints: MediaTrackConstraints = isMobileHands
        ? { facingMode: "user" }
        : { facingMode: { ideal: "user" } };
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
        });
        stream.getTracks().forEach((t) => t.stop()); // release immediately
      } catch (err: unknown) {
        if (stopped) return;
        const name = err instanceof Error ? err.name : "";
        setCamState(
          name === "NotAllowedError" || name === "PermissionDeniedError"
            ? "denied"
            : "error",
        );
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

        if (
          results.multiHandLandmarks &&
          results.multiHandLandmarks.length > 0
        ) {
          const landmarks = results.multiHandLandmarks[0];

          // Draw connections
          const connections: [number, number][] = [
            [0, 1],
            [1, 2],
            [2, 3],
            [3, 4],
            [0, 5],
            [5, 6],
            [6, 7],
            [7, 8],
            [0, 9],
            [9, 10],
            [10, 11],
            [11, 12],
            [0, 13],
            [13, 14],
            [14, 15],
            [15, 16],
            [0, 17],
            [17, 18],
            [18, 19],
            [19, 20],
            [5, 9],
            [9, 13],
            [13, 17],
          ];
          ctx.strokeStyle = "rgba(120,180,255,0.55)";
          ctx.lineWidth = 1.5;
          connections.forEach(([a, b]) => {
            const lA = landmarks[a];
            const lB = landmarks[b];
            // Mirror X for selfie view
            ctx.beginPath();
            ctx.moveTo(
              (1 - lA.x) * overlayCanvas.width,
              lA.y * overlayCanvas.height,
            );
            ctx.lineTo(
              (1 - lB.x) * overlayCanvas.width,
              lB.y * overlayCanvas.height,
            );
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
          ctx.moveTo(
            (1 - thumb.x) * overlayCanvas.width,
            thumb.y * overlayCanvas.height,
          );
          ctx.lineTo(
            (1 - index.x) * overlayCanvas.width,
            index.y * overlayCanvas.height,
          );
          ctx.strokeStyle =
            pinchDist < 0.06 ? "rgba(255,120,80,0.9)" : "rgba(100,255,180,0.7)";
          ctx.lineWidth = 2;
          ctx.stroke();

          // Map pinch distance → camera zoom
          // pinchDist ≈ 0.02 (fully pinched) → zoom 25 (close-up)
          // pinchDist ≈ 0.28 (fully spread)  → zoom 130 (full system view)
          const minDist = 0.02;
          const maxDist = 0.28;
          const t = Math.max(
            0,
            Math.min(1, (pinchDist - minDist) / (maxDist - minDist)),
          );
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
      setCamState(
        name === "NotAllowedError" || name === "PermissionDeniedError"
          ? "denied"
          : "error",
      );
    });

    return () => {
      stopped = true;
      cameraUtils?.stop();
    };
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#00000a]">
      <SpaceIntroScreen />

      {/* Three.js canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Screen vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.7) 100%)",
        }}
      />

      {/* Planet hover label */}
      <div
        ref={planetLabelRef}
        className="absolute pointer-events-none text-white text-center text-xs tracking-wide"
        style={{
          display: "none",
          transform: "translate(-50%, -100%)",
          textShadow: "0 2px 8px rgba(0,0,0,0.9)",
          whiteSpace: "nowrap",
        }}
      />

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <motion.div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 pointer-events-none"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <div className="flex items-center gap-2 text-white/30 text-xs tracking-widest uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60 animate-pulse" />
          Space Mode
        </div>

        <button
          onClick={() => router.push("/profile")}
          className="pointer-events-auto group flex items-center gap-2 px-4 py-2 text-xs tracking-widest uppercase text-white/40 border border-white/10 rounded-full bg-white/4 hover:text-white hover:border-white/25 hover:bg-white/8 transition-all duration-300 cursor-pointer"
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
          <span className="text-orange-400/60">●</span> thumb tip &nbsp;&nbsp;
          <span className="text-emerald-400/60">●</span> index tip
        </div>
        <div className="mt-1 text-white/20">
          Pinch to zoom in · Spread to zoom out
        </div>
        <div className="mt-0.5 text-white/15 hidden sm:block">
          ↑ ↓ arrow keys or +/− to zoom · Esc to exit
        </div>
        <div className="mt-0.5 text-white/15 sm:hidden">
          Two fingers on screen to zoom
        </div>
      </motion.div>

      {/* ── Webcam preview ───────────────────────────────────────────────── */}
      <motion.div
        className="absolute bottom-4 left-4 rounded-2xl overflow-hidden border border-white/10"
        style={{
          boxShadow:
            "0 0 0 1px rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.6)",
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
              <svg
                className="w-7 h-7 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth="2"
                />
                <path
                  d="M12 2 a10 10 0 0 1 10 10"
                  stroke="rgba(120,180,255,0.7)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <span className="text-white/40 text-[10px] tracking-widest text-center leading-4">
                Initializing
                <br />
                camera…
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
