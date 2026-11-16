import { LAND_COLS, LAND_MASK, LAND_ROWS } from "@/lib/data/landMask";
import { LEGS, type Place } from "@/lib/data/journey";

/**
 * The Flight Log globe: an orthographic dotted earth on a 2D canvas.
 *
 * Everything is a function of one number, the stage — 0 at the first leg,
 * LEGS.length - 1 at the last, fractional in between. The camera, the arcs
 * and the head of the route are all read off it, so scrolling back unwinds
 * the trip exactly.
 */

const RAD = Math.PI / 180;

export interface Palette {
  ink: string; // land dots and labels
  strong: string; // pins
  signal: string; // the route
  rule: string; // graticule and limb
  font: string; // the mono family, for pin labels
}

// -- Land ------------------------------------------------------------------

interface Dots {
  sinLat: Float32Array;
  cosLat: Float32Array;
  lon: Float32Array;
  n: number;
}

let dots: Dots | null = null;

/**
 * Decoded once, on first draw. The grid is equirectangular, so rows toward
 * the poles are thinned to keep the dot spacing roughly even on the sphere.
 */
function landDots(): Dots {
  if (dots) return dots;
  const bin = atob(LAND_MASK);
  const lat: number[] = [];
  const lon: number[] = [];
  for (let r = 0; r < LAND_ROWS; r++) {
    const la = 89.5 - r;
    const stride = Math.max(1, Math.round(1 / Math.cos(la * RAD)));
    for (let c = 0; c < LAND_COLS; c += stride) {
      const bit = r * LAND_COLS + c;
      if ((bin.charCodeAt(bit >> 3) >> (7 - (bit & 7))) & 1) {
        lat.push(la);
        lon.push(-179.5 + c);
      }
    }
  }
  const n = lat.length;
  dots = {
    sinLat: Float32Array.from(lat, (d) => Math.sin(d * RAD)),
    cosLat: Float32Array.from(lat, (d) => Math.cos(d * RAD)),
    lon: Float32Array.from(lon, (d) => d * RAD),
    n,
  };
  return dots;
}

// -- Camera ----------------------------------------------------------------

// Beyond this many degrees of longitude, a hop is flown, not drawn as a
// great circle; see longHaul().
const LONG_HAUL = 60;

/** How far north the long haul bows, in degrees, at its midpoint. */
const LONG_HAUL_BOW = 28;

interface Camera {
  lon: number;
  lat: number;
  zoom: number;
}

/**
 * Where the camera sits for each leg. Longitudes are unwrapped (Cincinnati
 * as 275.5 rather than -84.5) so the last move travels east across the
 * Pacific instead of back over Asia and Europe. The schools push in a
 * little each time, so the years in Hue don't read as one held frame.
 */
const SHOTS: Camera[] = [
  { lon: 107.2, lat: 17, zoom: 1 }, // origin: the whole globe, Vietnam centred
  { lon: 106.8, lat: 19, zoom: 3.4 }, // childhood, framing both cities
  { lon: 107.4, lat: 17.4, zoom: 3.6 },
  { lon: 107.4, lat: 17.2, zoom: 3.85 },
  { lon: 107.5, lat: 17, zoom: 4.1 },
  { lon: 275.5, lat: 36, zoom: 1.7 },
];

function cameraAt(stage: number): Camera {
  const i = Math.min(Math.floor(stage), SHOTS.length - 2);
  const u = stage - i;
  const a = SHOTS[i];
  const b = SHOTS[i + 1];
  // Zoom moves geometrically, so a 1x → 4x push feels even all the way.
  let zoom = Math.exp(Math.log(a.zoom) + (Math.log(b.zoom) - Math.log(a.zoom)) * u);
  let lat = a.lat + (b.lat - a.lat) * u;
  // The long haul pulls back to the whole globe mid-flight and rides along
  // with the plane, a little behind it, so the trail stays in frame.
  if (Math.abs(b.lon - a.lon) > LONG_HAUL) {
    const mid = Math.sqrt(a.zoom * b.zoom);
    zoom *= 1 - (1 - 1 / mid) * Math.sin(Math.PI * u);
    lat += LONG_HAUL_BOW * 0.75 * Math.sin(Math.PI * u);
  }
  return { lon: a.lon + (b.lon - a.lon) * u, lat, zoom };
}

// -- Projection ------------------------------------------------------------

type Vec = [number, number, number];

const toVec = (p: Place): Vec => {
  const la = p.lat * RAD;
  const lo = p.lon * RAD;
  return [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
};

interface View {
  cx: number;
  cy: number;
  R: number;
  lon0: number;
  sinLat0: number;
  cosLat0: number;
}

/** Screen x, y and depth (> 0 faces the viewer) for a point at radius r. */
function project(v: View, sinLat: number, cosLat: number, lon: number, r = 1) {
  const d = lon - v.lon0;
  const cosD = Math.cos(d);
  return {
    x: v.cx + v.R * r * cosLat * Math.sin(d),
    y: v.cy - v.R * r * (v.cosLat0 * sinLat - v.sinLat0 * cosLat * cosD),
    z: v.sinLat0 * sinLat + v.cosLat0 * cosLat * cosD,
  };
}

function projectVec(v: View, [x, y, z]: Vec) {
  const r = Math.hypot(x, y, z);
  const sinLat = z / r;
  return project(v, sinLat, Math.sqrt(1 - sinLat * sinLat), Math.atan2(y, x), r);
}

// -- Arcs ------------------------------------------------------------------

/** Degrees east from a to b, the short way round. */
const eastward = (a: Place, b: Place) => ((b.lon - a.lon + 540) % 360) - 180;

/**
 * The long haul. The great circle from Hue to Cincinnati runs over the pole,
 * which on a north-up globe hugs the rim and spins the camera; airliners fly
 * the North Pacific instead. So longitude runs east evenly and latitude bows
 * north past Alaska, lifted a little off the surface.
 */
function longHaul(a: Place, b: Place, f: number): Vec {
  const lat = (a.lat + (b.lat - a.lat) * f + LONG_HAUL_BOW * Math.sin(Math.PI * f)) * RAD;
  const lon = (a.lon + eastward(a, b) * f) * RAD;
  const r = 1 + 0.05 * Math.sin(Math.PI * f);
  return [r * Math.cos(lat) * Math.cos(lon), r * Math.cos(lat) * Math.sin(lon), r * Math.sin(lat)];
}

/**
 * A point along a short hop: the great circle, bowed sideways so going out
 * and coming back draw two distinct curves.
 */
function arcPoint(a: Vec, b: Vec, f: number): Vec {
  const dot = Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]);
  const w = Math.acos(dot);
  const s = Math.sin(w);
  const ka = Math.sin((1 - f) * w) / s;
  const kb = Math.sin(f * w) / s;
  let p: Vec = [ka * a[0] + kb * b[0], ka * a[1] + kb * b[1], ka * a[2] + kb * b[2]];

  // Normal to the great-circle plane; swaps sign with direction.
  const n: Vec = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const nl = Math.hypot(...n) || 1;
  const bow = 0.28 * w * Math.sin(Math.PI * f);
  p = [p[0] + (n[0] / nl) * bow, p[1] + (n[1] / nl) * bow, p[2] + (n[2] / nl) * bow];

  const len = Math.hypot(...p);
  return [p[0] / len, p[1] / len, p[2] / len];
}

/** A lifted point is visible in front of the globe or beyond its rim. */
const visible = (v: View, p: { x: number; y: number; z: number }) =>
  p.z > 0 || Math.hypot(p.x - v.cx, p.y - v.cy) > v.R;

// -- Draw ------------------------------------------------------------------

export function drawGlobe(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  stage: number,
  pal: Palette,
) {
  const cam = cameraAt(stage);
  const lat0 = cam.lat * RAD;
  const view: View = {
    cx: w / 2,
    cy: h / 2,
    R: (Math.min(w, h) / 2 - 4) * cam.zoom,
    lon0: cam.lon * RAD,
    sinLat0: Math.sin(lat0),
    cosLat0: Math.cos(lat0),
  };

  ctx.clearRect(0, 0, w, h);

  // Zoomed in, the globe overflows the canvas. Seen through a round scope
  // it reads as a lens; cut by the canvas it reads as a broken square.
  const scope = Math.min(w, h) / 2 - 4;
  ctx.save();
  if (cam.zoom > 1.001) {
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = pal.rule;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(view.cx, view.cy, scope, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(view.cx, view.cy, scope - 0.5, 0, Math.PI * 2);
    ctx.clip();
  }

  // Limb.
  ctx.globalAlpha = 0.6;
  ctx.strokeStyle = pal.rule;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(view.cx, view.cy, view.R, 0, Math.PI * 2);
  ctx.stroke();

  // Graticule, every 30°.
  ctx.globalAlpha = 0.3;
  ctx.setLineDash([2, 3]);
  ctx.beginPath();
  const line = (pts: [number, number][]) => {
    let pen = false;
    for (const [la, lo] of pts) {
      const p = project(view, Math.sin(la * RAD), Math.cos(la * RAD), lo * RAD);
      if (p.z <= 0) pen = false;
      else if (pen) ctx.lineTo(p.x, p.y);
      else {
        ctx.moveTo(p.x, p.y);
        pen = true;
      }
    }
  };
  for (let lo = -180; lo < 180; lo += 30) {
    line(Array.from({ length: 91 }, (_, i) => [-90 + i * 2, lo] as [number, number]));
  }
  for (let la = -60; la <= 60; la += 30) {
    line(Array.from({ length: 181 }, (_, i) => [la, -180 + i * 2] as [number, number]));
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // Land. Four depth bands, one path each, so the limb falls away softly
  // without a fill call per dot.
  const land = landDots();
  const r = Math.min(1.6, 0.3 + view.R * 0.0034);
  const bands: Path2D[] = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
  for (let i = 0; i < land.n; i++) {
    const p = project(view, land.sinLat[i], land.cosLat[i], land.lon[i]);
    if (p.z <= 0.02 || p.x < -2 || p.y < -2 || p.x > w + 2 || p.y > h + 2) continue;
    const band = bands[Math.min(3, Math.floor(p.z * 4))];
    band.moveTo(p.x + r, p.y);
    band.arc(p.x, p.y, r, 0, Math.PI * 2);
  }
  ctx.fillStyle = pal.ink;
  bands.forEach((band, i) => {
    ctx.globalAlpha = 0.18 + i * 0.16;
    ctx.fill(band);
  });

  // The route.
  ctx.strokeStyle = pal.signal;
  ctx.fillStyle = pal.signal;
  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";
  let head: { x: number; y: number } | null = null;
  for (let j = 0; j < LEGS.length - 1; j++) {
    const from = LEGS[j].place;
    const to = LEGS[j + 1].place;
    if (from === to) continue;
    const f = Math.max(0, Math.min(1, stage - j));
    if (f === 0) continue;
    const a = toVec(from);
    const b = toVec(to);
    const long = Math.abs(eastward(from, to)) > LONG_HAUL;
    const at = (t: number) => (long ? longHaul(from, to, t) : arcPoint(a, b, t));
    const steps = long ? 120 : 48;
    const end = Math.ceil(steps * f);
    ctx.globalAlpha = 1;
    ctx.beginPath();
    let pen = false;
    let last = null;
    for (let k = 0; k <= end; k++) {
      const p = projectVec(view, at(Math.min(f, k / steps)));
      if (!visible(view, p)) {
        pen = false;
        last = null;
        continue;
      }
      if (pen) ctx.lineTo(p.x, p.y);
      else ctx.moveTo(p.x, p.y);
      pen = true;
      last = p;
    }
    ctx.stroke();
    if (f < 1 && last) head = last;
  }

  // Pins: one per city, each drawn once. Origin is solid, childhood a ring,
  // the present red.
  const active = LEGS[Math.round(stage)].place;
  const pins = new Map<Place, { kind: string; x: number; y: number }>();
  for (const leg of LEGS) {
    if (pins.has(leg.place)) continue;
    const p = projectVec(view, toVec(leg.place));
    if (p.z <= 0) continue;
    pins.set(leg.place, { kind: leg.kind, x: p.x, y: p.y });
  }
  const crowded = (() => {
    const pts = [...pins.values()];
    for (let i = 0; i < pts.length; i++)
      for (let k = i + 1; k < pts.length; k++)
        if (Math.hypot(pts[i].x - pts[k].x, pts[i].y - pts[k].y) < 34) return true;
    return false;
  })();

  ctx.font = `600 12px ${pal.font}`;
  ctx.textBaseline = "middle";
  for (const [place, pin] of pins) {
    const isActive = place === active;
    ctx.globalAlpha = 1;
    if (isActive) {
      ctx.strokeStyle = pal.signal;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(pin.x, pin.y, 7.5, 0, Math.PI * 2);
      ctx.stroke();
    }
    const color = pin.kind === "now" ? pal.signal : pal.strong;
    ctx.beginPath();
    ctx.arc(pin.x, pin.y, 3, 0, Math.PI * 2);
    if (pin.kind === "childhood") {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      ctx.fillStyle = color;
      ctx.fill();
    }
    if (!crowded || isActive) {
      ctx.fillStyle = isActive ? pal.strong : pal.ink;
      ctx.fillText(place.code, pin.x + 11, pin.y - 10);
    }
  }

  // The head of the route, mid-flight.
  if (head) {
    ctx.fillStyle = pal.signal;
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.arc(head.x, head.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(head.x, head.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}
