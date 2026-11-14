"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useSyncExternalStore,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useMounted } from "@/hooks/useMounted";

const HIDDEN_ROUTES = ["/terminal", "/space"];

// Whether an intro currently owns the viewport. Every intro announces
// itself with intro-shown / intro-done; the home scan also sets
// html.scanning before first paint, which covers the frame between this
// mounting and that event arriving.
let introFlag: boolean | null = null;
function getIntroActive() {
  if (introFlag === null) {
    introFlag = document.documentElement.classList.contains("scanning");
  }
  return introFlag;
}
function subscribeIntro(onChange: () => void) {
  const shown = () => {
    introFlag = true;
    onChange();
  };
  const done = () => {
    introFlag = false;
    onChange();
  };
  window.addEventListener("intro-shown", shown);
  window.addEventListener("intro-done", done);
  return () => {
    window.removeEventListener("intro-shown", shown);
    window.removeEventListener("intro-done", done);
  };
}

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
const getReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ==========================================================================
   Geometry
   --------------------------------------------------------------------------
   Local space: origin at the viewport's bottom-left corner, x right, y up.
   The page corner (0,0) has been lifted to the tip T. The fold is the
   perpendicular bisector of corner→tip: every point X with X·n = d, where
   n = T/|T| and d = |T|/2. Everything on the corner side of the fold is
   revealed (the terminal underneath); its mirror image across the fold is
   the flap, the back of the page.
   ========================================================================== */

type Pt = [number, number];

function foldGeometry(tx: number, ty: number, W: number, H: number) {
  const len = Math.hypot(tx, ty);
  const nx = tx / len;
  const ny = ty / len;
  const d = len / 2;

  // Clip the viewport rectangle to the corner side of the fold
  // (one-plane Sutherland–Hodgman).
  const rect: Pt[] = [
    [0, 0],
    [W, 0],
    [W, H],
    [0, H],
  ];
  const hole: Pt[] = [];
  // Which hole vertices lie on the fold (the two cut points).
  const onFold: boolean[] = [];
  for (let i = 0; i < 4; i++) {
    const a = rect[i];
    const b = rect[(i + 1) % 4];
    const fa = a[0] * nx + a[1] * ny - d;
    const fb = b[0] * nx + b[1] * ny - d;
    if (fa <= 0) {
      hole.push(a);
      onFold.push(false);
    }
    if (fa < 0 !== fb < 0) {
      const t = fa / (fa - fb);
      hole.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      onFold.push(true);
    }
  }

  // Mirror across the fold.
  const flap: Pt[] = hole.map(([x, y]) => {
    const k = 2 * (d - (x * nx + y * ny));
    return [x + k * nx, y + k * ny];
  });

  return { nx, ny, d, hole, flap, onFold };
}

const toPoints = (pts: Pt[], H: number) =>
  pts.map(([x, y]) => `${x.toFixed(2)},${(H - y).toFixed(2)}`).join(" ");

// Paper never lies dead flat once lifted: every free edge of the flap
// bows inward a little. The fold edge stays straight.
function bowedPath(pts: Pt[], onFold: boolean[], H: number, bow: number) {
  const n = pts.length;
  let cx = 0;
  let cy = 0;
  for (const [x, y] of pts) {
    cx += x / n;
    cy += y / n;
  }
  const f = (v: number) => v.toFixed(2);
  let path = `M${f(pts[0][0])},${f(H - pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const [ax, ay] = pts[i];
    const [bx, by] = pts[j];
    if (onFold[i] && onFold[j]) {
      path += `L${f(bx)},${f(H - by)}`;
      continue;
    }
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    const len = Math.hypot(bx - ax, by - ay);
    const toC = Math.hypot(cx - mx, cy - my) || 1;
    const k = Math.min(len * bow, toC * 0.5) / toC;
    const qx = mx + (cx - mx) * k;
    const qy = my + (cy - my) * k;
    path += `Q${f(qx)},${f(H - qy)} ${f(bx)},${f(H - by)}`;
  }
  return path + "Z";
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

/* ==========================================================================
   The terminal printed underneath. Bottom line first; it sits in the very
   corner so the idle peel always shows a prompt and a blinking cursor.
   ========================================================================== */

type Line = { kind: "prompt" | "output" | "cursor"; text: string };
const UNDER_LINES: Line[] = [
  { kind: "cursor", text: "" },
  { kind: "output", text: "contact.txt  experience/  projects/" },
  { kind: "prompt", text: "ls" },
  { kind: "output", text: "visitor" },
  { kind: "prompt", text: "whoami" },
  { kind: "output", text: "Type 'help' to get started." },
  { kind: "output", text: "Anh Tran — Portfolio Terminal" },
  { kind: "output", text: "Last login: ttys001" },
];
const LINE_X = 9;
const LINE_Y0 = 11;
const LINE_H = 15;
const FONT = 11;
// JetBrains Mono advance is 0.6em.
const CH = FONT * 0.6;

type Mode = "idle" | "hover" | "drag" | "expand";

export default function PagePeel() {
  const pathname = usePathname();
  const router = useRouter();

  const mounted = useMounted();
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    () => false,
  );
  const [expanding, setExpanding] = useState(false);
  const [viewport, setViewport] = useState({ w: 1920, h: 1080 });
  const [isDark, setIsDark] = useState(true);
  const [prevPathname, setPrevPathname] = useState(pathname);
  const introActive = useSyncExternalStore(
    subscribeIntro,
    getIntroActive,
    () => false,
  );

  // DOM nodes mutated directly every frame.
  const holeClipRef = useRef<SVGPolygonElement>(null);
  const holeShadeRef = useRef<SVGPolygonElement>(null);
  const holeShadeGradRef = useRef<SVGLinearGradientElement>(null);
  const castRef = useRef<SVGPathElement>(null);
  const castBlurRef = useRef<SVGFEGaussianBlurElement>(null);
  const flapRef = useRef<SVGPathElement>(null);
  const flapGradRef = useRef<SVGLinearGradientElement>(null);
  const flapStopRefs = useRef<(SVGStopElement | null)[]>([]);
  const hitRef = useRef<HTMLDivElement>(null);

  // Simulation state. Never rendered by React.
  const sim = useRef({
    px: 1,
    py: 1,
    vx: 0,
    vy: 0,
    tx: 1,
    ty: 1,
    mode: "idle" as Mode,
    raf: 0,
    last: 0,
    // expand tween
    ex0: 0,
    ey0: 0,
    ex1: 0,
    ey1: 0,
    et0: 0,
    // drag
    grabDX: 0,
    grabDY: 0,
    downX: 0,
    downY: 0,
    downT: 0,
    moved: 0,
    pvx: 0,
    pvy: 0,
    lastPX: 0,
    lastPY: 0,
    lastPT: 0,
  });

  const W = viewport.w;
  const H = viewport.h;
  const base = Math.min(W, H);
  const idleSize = Math.max(base * 0.045, 36);
  const hoverSize = idleSize + Math.max(base * 0.03, 16);
  // Tip distance from the corner at which a drag tears the page away.
  const tearDist = base * 0.45;
  // On release: past this, the page keeps going.
  const commitDist = base * 0.26;

  const dims = useRef({ W, H, idleSize, hoverSize, tearDist, commitDist });
  useEffect(() => {
    dims.current = { W, H, idleSize, hoverSize, tearDist, commitDist };
  }, [W, H, idleSize, hoverSize, tearDist, commitDist]);

  const reducedRef = useRef(reducedMotion);
  useEffect(() => {
    reducedRef.current = reducedMotion;
  }, [reducedMotion]);

  useEffect(() => {
    const update = () =>
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const check = () =>
      setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const observer = new MutationObserver(() => requestAnimationFrame(check));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  // Reset state on route change (render-phase pattern for state)
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setExpanding(false);
  }

  /* ---------------------------------------------------------------- draw */

  const draw = useCallback(() => {
    const { W, H } = dims.current;
    const s = sim.current;
    const { nx, ny, d, hole, flap, onFold } = foldGeometry(s.px, s.py, W, H);

    const holePts = toPoints(hole, H);
    holeClipRef.current?.setAttribute("points", holePts);
    holeShadeRef.current?.setAttribute("points", holePts);
    flapRef.current?.setAttribute("d", bowedPath(flap, onFold, H, 0.06));

    // Fold line midpoint and tip, in screen space.
    const fx = nx * d;
    const fy = H - ny * d;
    const tipX = s.px;
    const tipY = H - s.py;

    // Shadow the curl throws into the hole, darkest right under the fold.
    const shadeW = clamp(d * 0.7, 10, 140);
    const sg = holeShadeGradRef.current;
    if (sg) {
      sg.setAttribute("x1", String(fx));
      sg.setAttribute("y1", String(fy));
      sg.setAttribute("x2", String(fx - nx * shadeW));
      sg.setAttribute("y2", String(fy + ny * shadeW));
    }

    // Back of the page: a rolled edge at the fold that catches the light,
    // then flat paper falling away into shade toward the tip.
    const fg = flapGradRef.current;
    if (fg) {
      fg.setAttribute("x1", String(fx));
      fg.setAttribute("y1", String(fy));
      fg.setAttribute("x2", String(tipX));
      fg.setAttribute("y2", String(tipY));
    }
    const curl = clamp(d * 0.45, 4, 90);
    const o1 = Math.min((curl * 0.12) / d, 0.3);
    const o2 = Math.min((curl * 0.38) / d, 0.55);
    const o3 = Math.min(curl / d, 0.8);
    const offs = [0, o1, o2, o3, 1];
    flapStopRefs.current.forEach((stop, i) =>
      stop?.setAttribute("offset", String(offs[i])),
    );

    // Cast shadow on the page: anchored at the fold, sliding further
    // out the higher the paper lifts (toward the tip).
    const sx = 0.05;
    const sy = -0.08;
    const cast: Pt[] = flap.map(([x, y]) => {
      const lift = x * nx + y * ny - d;
      return [x + lift * (0.04 * nx + sx), y + lift * (0.04 * ny + sy)];
    });
    castRef.current?.setAttribute("d", bowedPath(cast, onFold, H, 0.06));
    castBlurRef.current?.setAttribute(
      "stdDeviation",
      // Capped: past ~14px the shadow reads the same, but a blur that wide
      // over a screen-sized shape drops frames on phones mid tear-off.
      String(Math.min(1.5 + d * 0.05, 14).toFixed(2)),
    );

    if (hitRef.current && s.mode !== "drag") {
      const hit = Math.max(Math.max(s.px, s.py) + 30, 90);
      hitRef.current.style.width = `${hit}px`;
      hitRef.current.style.height = `${hit}px`;
    }
  }, []);

  /* ------------------------------------------------------------- physics */

  // Advances one frame; false once there is nothing left to animate.
  const step = useCallback(
    (now: number): boolean => {
      const s = sim.current;
      const dt = Math.min((now - s.last) / 1000, 1 / 30);
      s.last = now;

      if (s.mode === "expand") {
        const dur = reducedRef.current ? 200 : 720;
        const t = Math.min((now - s.et0) / dur, 1);
        // Resist, then let go: the page tears free and flies.
        const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        s.px = s.ex0 + (s.ex1 - s.ex0) * e;
        s.py = s.ey0 + (s.ey1 - s.ey0) * e;
        draw();
        if (t >= 1) {
          router.push("/terminal");
          return false;
        }
        return true;
      }

      // Drag: stiff and near-critical, so the corner trails the finger with
      // a little weight. Free: soft and underdamped, so paper flops.
      const drag = s.mode === "drag";
      const k = drag ? 1500 : 260;
      const zeta = drag ? 0.92 : reducedRef.current ? 1 : 0.48;
      const c = 2 * Math.sqrt(k) * zeta;
      let rem = dt;
      while (rem > 1e-6) {
        const h = Math.min(rem, 1 / 240);
        rem -= h;
        s.vx += (k * (s.tx - s.px) - c * s.vx) * h;
        s.vy += (k * (s.ty - s.py) - c * s.vy) * h;
        s.px += s.vx * h;
        s.py += s.vy * h;
      }
      // The corner can't fold through itself.
      if (s.px < 1) {
        s.px = 1;
        s.vx = Math.max(0, s.vx);
      }
      if (s.py < 1) {
        s.py = 1;
        s.vy = Math.max(0, s.vy);
      }
      draw();

      const settled =
        Math.abs(s.tx - s.px) < 0.05 &&
        Math.abs(s.ty - s.py) < 0.05 &&
        Math.abs(s.vx) < 0.5 &&
        Math.abs(s.vy) < 0.5;
      if (settled && !drag) {
        s.px = s.tx;
        s.py = s.ty;
        s.vx = s.vy = 0;
        draw();
        return false;
      }
      return true;
    },
    [draw, router],
  );

  const kick = useCallback(() => {
    const s = sim.current;
    if (s.raf) return;
    s.last = performance.now();
    const frame = (now: number) => {
      s.raf = step(now) ? requestAnimationFrame(frame) : 0;
    };
    s.raf = requestAnimationFrame(frame);
  }, [step]);

  const setRest = useCallback(
    (mode: "idle" | "hover") => {
      const s = sim.current;
      if (s.mode === "expand") return;
      const size =
        mode === "hover" ? dims.current.hoverSize : dims.current.idleSize;
      s.mode = mode;
      s.tx = size;
      s.ty = size;
      kick();
    },
    [kick],
  );

  const triggerExpand = useCallback(() => {
    const s = sim.current;
    if (s.mode === "expand") return;
    const { W, H } = dims.current;
    s.mode = "expand";
    s.ex0 = s.px;
    s.ey0 = s.py;
    // Far enough out that the fold clears the opposite corner.
    s.ex1 = W * 2.15 + 40;
    s.ey1 = H * 2.15 + 40;
    s.et0 = performance.now();
    setExpanding(true);
    kick();
  }, [kick]);

  /* ------------------------------------------------------------- pointer */

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const s = sim.current;
      if (s.mode === "expand") return;
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      const lx = e.clientX;
      const ly = dims.current.H - e.clientY;
      s.mode = "drag";
      s.grabDX = s.px - lx;
      s.grabDY = s.py - ly;
      s.downX = e.clientX;
      s.downY = e.clientY;
      s.downT = performance.now();
      s.moved = 0;
      s.pvx = s.pvy = 0;
      s.lastPX = lx;
      s.lastPY = ly;
      s.lastPT = s.downT;
      if (hitRef.current) hitRef.current.style.cursor = "grabbing";
      kick();
    },
    [kick],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const s = sim.current;
      if (s.mode === "expand") return;
      const { H, hoverSize, tearDist } = dims.current;
      const lx = e.clientX;
      const ly = H - e.clientY;

      if (s.mode === "drag") {
        const now = performance.now();
        const dtp = Math.max(now - s.lastPT, 1) / 1000;
        // Smoothed pointer velocity, for flicks.
        s.pvx = s.pvx * 0.6 + ((lx - s.lastPX) / dtp) * 0.4;
        s.pvy = s.pvy * 0.6 + ((ly - s.lastPY) / dtp) * 0.4;
        s.lastPX = lx;
        s.lastPY = ly;
        s.lastPT = now;
        s.moved = Math.max(
          s.moved,
          Math.hypot(e.clientX - s.downX, e.clientY - s.downY),
        );
        s.tx = Math.max(1, lx + s.grabDX);
        s.ty = Math.max(1, ly + s.grabDY);
        if (Math.hypot(s.tx, s.ty) >= tearDist) triggerExpand();
        else kick();
        return;
      }

      // Hovering: the corner leans toward the cursor.
      if (e.pointerType === "mouse" && s.mode === "hover") {
        s.tx = Math.max(6, hoverSize + (lx - hoverSize) * 0.3);
        s.ty = Math.max(6, hoverSize + (ly - hoverSize) * 0.3);
        kick();
      }
    },
    [kick, triggerExpand],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const s = sim.current;
      if (s.mode !== "drag") return;
      if (hitRef.current) hitRef.current.style.cursor = "grab";
      const { commitDist, idleSize } = dims.current;
      const dist = Math.hypot(s.tx, s.ty);
      const len = Math.max(dist, 1);
      // Speed of the flick away from the corner.
      const outward = (s.pvx * s.tx + s.pvy * s.ty) / len;
      const tap =
        e.type === "pointerup" &&
        s.moved < 6 &&
        performance.now() - s.downT < 350;
      const fresh = performance.now() - s.lastPT < 80;
      if (
        tap ||
        dist >= commitDist ||
        (fresh && outward > 900 && dist > idleSize * 2)
      ) {
        triggerExpand();
        return;
      }
      // Let go: the corner keeps the pointer's momentum, then flops back.
      s.vx = s.pvx * 0.35;
      s.vy = s.pvy * 0.35;
      const over =
        e.pointerType === "mouse" &&
        hitRef.current?.matches(":hover") === true;
      setRest(over ? "hover" : "idle");
    },
    [setRest, triggerExpand],
  );

  const handleEnter = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      if (sim.current.mode === "idle") setRest("hover");
    },
    [setRest],
  );

  const handleLeave = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      if (sim.current.mode === "hover") setRest("idle");
    },
    [setRest],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        triggerExpand();
      }
    },
    [triggerExpand],
  );

  /* ----------------------------------------------------------- lifecycle */

  const visible = mounted && !introActive && !HIDDEN_ROUTES.includes(pathname);

  // Each time the peel appears, the corner unfurls from flat.
  useEffect(() => {
    if (!visible) return;
    const s = sim.current;
    s.mode = "idle";
    s.px = s.py = 1;
    s.vx = s.vy = 0;
    s.tx = s.ty = dims.current.idleSize;
    draw();
    kick();
    return () => {
      if (s.raf) cancelAnimationFrame(s.raf);
      s.raf = 0;
    };
  }, [visible, pathname, draw, kick]);

  // Resizes and theme flips re-render the static parts; redraw the rest,
  // and move the resting corner to its new size.
  useEffect(() => {
    if (!visible) return;
    const s = sim.current;
    if (s.mode === "idle" || s.mode === "hover") setRest(s.mode);
    draw();
  }, [visible, W, H, isDark, draw, setRest]);

  // Now and then a draught catches the corner.
  useEffect(() => {
    if (!visible || reducedMotion) return;
    let id = 0;
    const schedule = () => {
      id = window.setTimeout(
        () => {
          const s = sim.current;
          if (s.mode === "idle" && document.visibilityState === "visible") {
            const f = 0.7 + Math.random() * 0.6;
            s.vx += 150 * f;
            s.vy += 110 * f;
            kick();
          }
          schedule();
        },
        6000 + Math.random() * 6000,
      );
    };
    schedule();
    return () => clearTimeout(id);
  }, [visible, reducedMotion, kick]);

  if (!visible) return null;

  /* -------------------------------------------------------------- render */

  const pal = isDark
    ? {
        under: "#131316",
        underEnd: "#0a0a0b",
        glow: "rgba(208,210,215,0.07)",
        scan: "rgba(255,255,255,0.025)",
        out: "#83868f",
        cmd: "#ececed",
        prompt: "#3fb972",
        holeShade: 0.85,
        flap: ["#6e7179", "#f2f2f4", "#d4d6da", "#c3c5ca", "#8f929a"],
        cast: 0.7,
        edge: "rgba(0,0,0,0.35)",
      }
    : {
        under: "#e8e8ec",
        underEnd: "#e8e8ec",
        glow: "rgba(255,255,255,0.6)",
        scan: "rgba(10,10,11,0.025)",
        out: "#52545c",
        cmd: "#0a0a0b",
        prompt: "#1e8a4c",
        holeShade: 0.45,
        flap: ["#b9bbc1", "#ffffff", "#f3f3f4", "#e6e7e9", "#c9cbd0"],
        cast: 0.32,
        edge: "rgba(0,0,0,0.12)",
      };

  const mono = "var(--font-jetbrains), ui-monospace, SFMono-Regular, monospace";

  return (
    <>
      <svg
        aria-hidden
        className={`fixed inset-0 pointer-events-none ${expanding ? "z-60" : "z-50"}`}
        width={W}
        height={H}
        style={{ width: W, height: H }}
      >
        <defs>
          <clipPath id="peel-hole">
            <polygon ref={holeClipRef} />
          </clipPath>
          <filter
            id="peel-cast"
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur ref={castBlurRef} stdDeviation="2" />
          </filter>
          <linearGradient
            id="peel-hole-shade"
            ref={holeShadeGradRef}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#000" stopOpacity={pal.holeShade} />
            <stop
              offset="0.18"
              stopColor="#000"
              stopOpacity={pal.holeShade * 0.45}
            />
            <stop
              offset="0.5"
              stopColor="#000"
              stopOpacity={pal.holeShade * 0.12}
            />
            <stop offset="1" stopColor="#000" stopOpacity="0" />
          </linearGradient>
          <linearGradient
            id="peel-flap"
            ref={flapGradRef}
            gradientUnits="userSpaceOnUse"
          >
            {pal.flap.map((c, i) => (
              <stop
                key={i}
                ref={(el) => {
                  flapStopRefs.current[i] = el;
                }}
                stopColor={c}
              />
            ))}
          </linearGradient>
          <radialGradient
            id="peel-glow"
            gradientUnits="userSpaceOnUse"
            cx={0}
            cy={H}
            r={Math.max(260, base * 0.5)}
          >
            <stop offset="0" stopColor={pal.glow} />
            <stop offset="1" stopColor={pal.glow} stopOpacity="0" />
          </radialGradient>
          <pattern
            id="peel-scan"
            width="4"
            height="3"
            patternUnits="userSpaceOnUse"
          >
            <rect width="4" height="1" fill={pal.scan} />
          </pattern>
        </defs>

        {/* Shadow the lifted flap casts on the page. */}
        <path
          ref={castRef}
          fill="#000"
          opacity={pal.cast}
          filter="url(#peel-cast)"
        />

        {/* The terminal underneath. */}
        <g clipPath="url(#peel-hole)">
          <rect
            width={W}
            height={H}
            style={{
              fill: expanding ? pal.underEnd : pal.under,
              transition: "fill 600ms ease-in",
            }}
          />
          <rect width={W} height={H} fill="url(#peel-glow)" />
          <g
            fontFamily={mono}
            fontSize={FONT}
            style={{
              opacity: expanding ? 0 : 1,
              transition: "opacity 400ms ease-in 200ms",
            }}
          >
            {UNDER_LINES.map((line, i) => {
              const y = H - (LINE_Y0 + LINE_H * i);
              if (line.kind === "output") {
                return (
                  <text key={i} x={LINE_X} y={y} fill={pal.out}>
                    {line.text}
                  </text>
                );
              }
              return (
                <g key={i}>
                  <text x={LINE_X} y={y} fill={pal.prompt}>
                    $
                  </text>
                  {line.kind === "prompt" ? (
                    <text x={LINE_X + CH * 2} y={y} fill={pal.cmd}>
                      {line.text}
                    </text>
                  ) : (
                    <rect
                      className="peel-cursor"
                      x={LINE_X + CH * 2}
                      y={y - FONT * 0.8}
                      width={CH}
                      height={FONT}
                      fill={pal.cmd}
                    />
                  )}
                </g>
              );
            })}
          </g>
          <rect width={W} height={H} fill="url(#peel-scan)" />
          {/* Darkness under the curl. */}
          <polygon ref={holeShadeRef} fill="url(#peel-hole-shade)" />
        </g>

        {/* The back of the page. */}
        <path
          ref={flapRef}
          fill="url(#peel-flap)"
          stroke={pal.edge}
          strokeWidth={0.75}
          strokeLinejoin="round"
        />
      </svg>

      {!expanding && (
        <div
          ref={hitRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerEnter={handleEnter}
          onPointerLeave={handleLeave}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (sim.current.mode === "idle") setRest("hover");
          }}
          onBlur={() => {
            if (sim.current.mode === "hover") setRest("idle");
          }}
          aria-label="Open terminal (drag the corner or press Enter)"
          role="button"
          tabIndex={0}
          className="fixed bottom-0 left-0 z-51 touch-none select-none rounded-tr-2xl outline-none focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-plate-25"
          style={{ width: 90, height: 90, cursor: "grab" }}
        />
      )}
    </>
  );
}
