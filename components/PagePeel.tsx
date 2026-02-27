"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useMounted } from "@/hooks/useMounted";

const HIDDEN_ROUTES = ["/terminal", "/space"];

export default function PagePeel() {
  const pathname = usePathname();
  const router = useRouter();

  const mounted = useMounted();
  const [expanding, setExpanding] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [viewportSize, setViewportSize] = useState({ w: 1920, h: 1080 });
  const [isDark, setIsDark] = useState(true);
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Drag state kept in refs to avoid re-renders on every pointer move
  const draggingRef = useRef(false);
  const dragDistRef = useRef(0);
  const startPos = useRef({ x: 0, y: 0 });
  const animFrameRef = useRef<number>(0);
  const expandedRef = useRef(false);

  // DOM refs for direct mutation during drag (avoids React re-render per frame)
  const shadowRef = useRef<HTMLDivElement>(null);
  const curlRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGLineElement>(null);
  const hitRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const update = () =>
      setViewportSize({ w: window.innerWidth, h: window.innerHeight });
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
    setHovered(false);
  }

  // Reset refs on route change (must be in effect, not render)
  useEffect(() => {
    expandedRef.current = false;
    draggingRef.current = false;
    dragDistRef.current = 0;
  }, [pathname]);

  const base = Math.min(viewportSize.w, viewportSize.h);
  const idleSize = Math.max(base * 0.045, 36);
  const maxDrag = base * 0.35;
  const triggerThreshold = base * 0.2;
  const hoverExtra = base * 0.025;

  // Bounding box for paint containment — only repaint this corner, not the full screen
  const boxSize = Math.ceil(maxDrag * 1.5);

  const applyPeelSize = useCallback(
    (s: number) => {
      const sh = s * 1.15;
      const progress = Math.min(dragDistRef.current / triggerThreshold, 1);
      const shadowOp = 0.15 + progress * 0.15;

      if (shadowRef.current) {
        // Shadow anchored to bottom-left corner (the "hole" left behind)
        shadowRef.current.style.clipPath = `polygon(0 100%, ${sh}px 100%, 0 calc(100% - ${sh}px))`;
        shadowRef.current.style.background = `linear-gradient(135deg, rgba(0,0,0,${shadowOp}) 0%, rgba(0,0,0,${shadowOp * 0.3}) 50%, transparent 100%)`;
      }
      if (curlRef.current) {
        curlRef.current.style.clipPath = `polygon(${s}px 100%, ${s}px calc(100% - ${s}px), 0 calc(100% - ${s}px))`;
        curlRef.current.style.filter = `drop-shadow(2px -2px ${3 + progress * 4}px rgba(0,0,0,${0.2 + progress * 0.15})) drop-shadow(4px -4px ${8 + progress * 8}px rgba(0,0,0,${0.08 + progress * 0.08}))`;
      }
      if (lineRef.current) {
        // Coordinates relative to bounding box, not full screen
        lineRef.current.setAttribute("x1", String(s));
        lineRef.current.setAttribute("y1", String(boxSize));
        lineRef.current.setAttribute("x2", String(0));
        lineRef.current.setAttribute("y2", String(boxSize - s));
        lineRef.current.setAttribute(
          "stroke-width",
          String(1 + progress * 0.5),
        );
      }
      if (promptRef.current) {
        promptRef.current.style.fontSize = `${Math.max(9, s * 0.18)}px`;
        promptRef.current.style.opacity = String(0.8 + progress * 0.2);
        promptRef.current.style.bottom = `${s * 0.65}px`;
        promptRef.current.style.left = `${s * 0.65}px`;
        promptRef.current.style.transform = "translate(-50%, 50%)";
      }
      if (hitRef.current) {
        const hit = Math.max(s + 30, 90);
        hitRef.current.style.width = `${hit}px`;
        hitRef.current.style.height = `${hit}px`;
      }
    },
    [triggerThreshold, boxSize],
  );

  const triggerExpand = useCallback(() => {
    if (expandedRef.current) return;
    expandedRef.current = true;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    draggingRef.current = false;
    setExpanding(true);
    setTimeout(() => router.push("/terminal"), 500);
  }, [router]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (expanding || expandedRef.current) return;
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      startPos.current = { x: e.clientX, y: e.clientY };
      draggingRef.current = true;
      dragDistRef.current = 0;

      shadowRef.current?.style.setProperty("transition", "none");
      curlRef.current?.style.setProperty("transition", "none");
      lineRef.current?.style.setProperty("transition", "none");

      if (hitRef.current) hitRef.current.style.cursor = "grabbing";
    },
    [expanding],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingRef.current || expanding || expandedRef.current) return;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      const cx = e.clientX;
      const cy = e.clientY;
      animFrameRef.current = requestAnimationFrame(() => {
        const dx = startPos.current.x - cx;
        const dy = startPos.current.y - cy;
        const dist = Math.max(0, Math.sqrt(dx * dx + dy * dy));
        dragDistRef.current = dist;
        const s = Math.min(idleSize + dist * 1.8, maxDrag);
        applyPeelSize(s);
        if (dist >= triggerThreshold) triggerExpand();
      });
    },
    [
      expanding,
      triggerExpand,
      triggerThreshold,
      idleSize,
      maxDrag,
      applyPeelSize,
    ],
  );

  const handlePointerUp = useCallback(() => {
    if (!draggingRef.current) return;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (dragDistRef.current >= triggerThreshold) {
      triggerExpand();
    } else {
      draggingRef.current = false;
      dragDistRef.current = 0;
      const dur = "300ms";
      shadowRef.current?.style.setProperty(
        "transition",
        `clip-path ${dur} ease-out, background ${dur} ease-out`,
      );
      curlRef.current?.style.setProperty(
        "transition",
        `clip-path ${dur} ease-out, filter ${dur} ease-out`,
      );
      lineRef.current?.style.setProperty("transition", `all ${dur} ease-out`);
      applyPeelSize(hovered ? idleSize + hoverExtra : idleSize);
      if (hitRef.current) hitRef.current.style.cursor = "grab";
    }
  }, [
    triggerExpand,
    triggerThreshold,
    applyPeelSize,
    hovered,
    idleSize,
    hoverExtra,
  ]);

  const handleHoverEnter = useCallback(() => {
    setHovered(true);
    if (!draggingRef.current) applyPeelSize(idleSize + hoverExtra);
  }, [applyPeelSize, idleSize, hoverExtra]);

  const handleHoverLeave = useCallback(() => {
    if (!draggingRef.current) {
      setHovered(false);
      applyPeelSize(idleSize);
    }
  }, [applyPeelSize, idleSize]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === "Enter" || e.key === " ") && !expandedRef.current) {
        e.preventDefault();
        triggerExpand();
      }
    },
    [triggerExpand],
  );

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  useEffect(() => {
    if (!mounted || expanding) return;
    applyPeelSize(hovered ? idleSize + hoverExtra : idleSize);
  }, [mounted, expanding, idleSize, hoverExtra, hovered, applyPeelSize]);

  if (HIDDEN_ROUTES.includes(pathname)) return null;
  if (!mounted) return null;

  const s = hovered ? idleSize + hoverExtra : idleSize;
  const sh = s * 1.15;

  const curlGradient = isDark
    ? `linear-gradient(135deg, #e8e8e8 0%, #d0d0d0 50%, #bbb 100%)`
    : `linear-gradient(135deg, #2a2a2a 0%, #222 50%, #1a1a1a 100%)`;
  const promptColor = isDark ? "#000" : "#fff";
  const expandBg = isDark ? "#e0e0e0" : "#1a1a1d";

  return (
    <>
      {!expanding && (
        <div
          ref={shadowRef}
          className="fixed bottom-0 left-0 z-49 pointer-events-none"
          style={{
            width: boxSize,
            height: boxSize,
            clipPath: `polygon(0 100%, ${sh}px 100%, 0 calc(100% - ${sh}px))`,
            background: `linear-gradient(135deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.045) 50%, transparent 100%)`,
            filter: "blur(8px)",
            transition: "clip-path 300ms ease-out, background 300ms ease-out",
          }}
        />
      )}

      {!expanding && (
        <div
          ref={curlRef}
          className="fixed bottom-0 left-0 z-50 pointer-events-none"
          style={{
            width: boxSize,
            height: boxSize,
            clipPath: `polygon(${s}px 100%, ${s}px calc(100% - ${s}px), 0 calc(100% - ${s}px))`,
            background: curlGradient,
            transition: "clip-path 300ms ease-out, filter 300ms ease-out",
            filter:
              "drop-shadow(2px -2px 3px rgba(0,0,0,0.2)) drop-shadow(4px -4px 8px rgba(0,0,0,0.08))",
          }}
        >
          <span
            ref={promptRef}
            className="absolute font-mono"
            style={{
              bottom: s * 0.65,
              left: s * 0.65,
              transform: "translate(-50%, 50%)",
              fontSize: Math.max(9, s * 0.18),
              color: promptColor,
              opacity: 0.8,
            }}
          >
            {">_"}
          </span>
        </div>
      )}

      {!expanding && (
        <svg
          className="fixed bottom-0 left-0 z-50 pointer-events-none"
          style={{ width: boxSize, height: boxSize }}
        >
          <line
            ref={lineRef}
            x1={s}
            y1={boxSize}
            x2={0}
            y2={boxSize - s}
            stroke={
              isDark ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.15)"
            }
            strokeWidth={1}
            style={{ transition: "all 300ms ease-out" }}
          />
        </svg>
      )}

      <div
        ref={hitRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        onMouseEnter={handleHoverEnter}
        onMouseLeave={handleHoverLeave}
        aria-label="Drag to open terminal"
        role="button"
        tabIndex={0}
        className="fixed bottom-0 left-0 z-51 touch-none select-none"
        style={{
          width: Math.max(s + 30, 90),
          height: Math.max(s + 30, 90),
          cursor: "grab",
        }}
      />

      {expanding && (
        <div
          className="peel-expand-overlay fixed inset-0 z-60"
          style={{ background: expandBg }}
        />
      )}
    </>
  );
}
