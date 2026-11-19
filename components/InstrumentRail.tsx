"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { subscribeSpotify, type Track } from "@/lib/spotifyStore";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useMounted } from "@/hooks/useMounted";

/**
 * The telemetry rail.
 *
 * An instrument panel's margins are where the readings live. At xl it sits in
 * the left margin. Below xl there are no margins to speak of, so the same
 * readings live in a drawer instead: a slim tab peeks from the left edge, and
 * a tap or a drag pulls the panel out over the page.
 *
 * The drawer opens from a visible tab rather than from a swipe off the screen
 * edge, because that edge belongs to the OS — it is the back gesture on iOS
 * Safari and on Android gesture navigation.
 *
 * Sits on the live matrix rather than on the fog: telemetry belongs on the
 * field, and mono at this weight holds up over it.
 *
 * Doctrine rule 4: one rAF for all four channels, writing textContent and
 * custom properties. No state, no re-render, no second timer.
 * Doctrine rule 3: the loop only runs while its readings can be seen — the
 * rail at xl, the drawer while it is open or being dragged.
 */

const DOB = new Date(2006, 4, 11).getTime();
const MS_PER_YEAR = 365.2425 * 24 * 60 * 60 * 1000;

// Two clocks: where the work happens and where home is. Each carries its
// offset from UTC, read live so Cincinnati's daylight shift is honest.
const CLOCKS = [
  { tz: "America/New_York" },
  { tz: "Asia/Ho_Chi_Minh" },
] as const;

const XL_QUERY = "(min-width: 1280px)";

function offsetOf(tz: string, now: number) {
  const part = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    timeZoneName: "longOffset",
  })
    .formatToParts(now)
    .find((p) => p.type === "timeZoneName");
  // "GMT-04:00" → "UTC−04:00"; a bare "GMT" is UTC itself.
  const raw = part?.value ?? "GMT";
  return raw === "GMT" ? "UTC+00:00" : raw.replace("GMT", "UTC").replace("-", "−");
}

function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", cb);
      return () => mql.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** The refs the readings paint into, and the one loop that paints them. */
function useTelemetry(active: boolean) {
  const ageRef = useRef<HTMLParagraphElement>(null);
  const clockRef = useRef<HTMLParagraphElement>(null);
  const clockTzRef = useRef<HTMLParagraphElement>(null);
  const hanoiRef = useRef<HTMLParagraphElement>(null);
  const hanoiTzRef = useRef<HTMLParagraphElement>(null);
  const sessionRef = useRef<HTMLParagraphElement>(null);

  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (!active) return;

    let frame = 0;

    const pad = (n: number) => String(n).padStart(2, "0");

    const paint = () => {
      const now = Date.now();

      if (ageRef.current) {
        ageRef.current.textContent = ((now - DOB) / MS_PER_YEAR).toFixed(9);
      }

      const clocks: [
        React.RefObject<HTMLParagraphElement | null>,
        React.RefObject<HTMLParagraphElement | null>,
      ][] = [
        [clockRef, clockTzRef],
        [hanoiRef, hanoiTzRef],
      ];
      clocks.forEach(([timeRef, tzRef], i) => {
        const tz = CLOCKS[i].tz;
        if (timeRef.current) {
          timeRef.current.textContent = new Intl.DateTimeFormat("en-US", {
            timeZone: tz,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          }).format(now);
        }
        // The offset only moves twice a year; write it when it changes.
        if (tzRef.current) {
          const off = offsetOf(tz, now);
          if (tzRef.current.textContent !== off) tzRef.current.textContent = off;
        }
      });

      if (sessionRef.current) {
        // performance.now() counts from the document's load and survives
        // client-side navigation, so this is the visitor's time on the site —
        // not reset by a page change remounting the rail, or by the drawer
        // only starting its loop when opened.
        const s = Math.floor(performance.now() / 1000);
        sessionRef.current.textContent = `${pad(Math.floor(s / 3600))}:${pad(
          Math.floor((s % 3600) / 60),
        )}:${pad(s % 60)}`;
      }
    };

    // Reduced motion still gets every reading — just once a second instead of
    // sixty times, and with the age at a precision a human can actually read.
    if (reducedMotion) {
      paint();
      const slow = setInterval(paint, 1000);
      return () => clearInterval(slow);
    }

    const loop = () => {
      paint();
      frame = requestAnimationFrame(loop);
    };
    // Painted once up front, so a drawer sliding out never shows empty rows.
    paint();
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [active, reducedMotion]);

  return { ageRef, clockRef, clockTzRef, hanoiRef, hanoiTzRef, sessionRef };
}

function Channel({
  label,
  children,
  hidden = false,
}: {
  label: string;
  children: React.ReactNode;
  hidden?: boolean;
}) {
  return (
    <div className="mb-7" aria-hidden={hidden || undefined}>
      <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-readout">
        {label}
      </p>
      {children}
    </div>
  );
}

/**
 * The track, linked through to Spotify.
 *
 * A visitor who recognises what is playing should be able to go and hear it —
 * the readout was showing a title with no way to act on it. Falls back to a
 * plain block when the API has no song URL, so the layout never shifts
 * depending on whether the link happens to exist.
 */
function NowPlayingLink({ track }: { track: Track }) {
  const body = (
    <>
      <div className="flex items-end gap-[3px] h-4" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="w-[3px] bg-plate-25 origin-bottom animate-[eq_900ms_ease-in-out_infinite]"
            style={{ height: "100%", animationDelay: `${i * 120}ms` }}
          />
        ))}
      </div>
      <p className="truncate font-mono text-[11px] text-readout-strong">
        {track.title}
      </p>
      <p className="truncate font-mono text-[11px] text-readout">
        {track.artist}
      </p>
    </>
  );

  if (!track.songUrl) return <div className="space-y-1">{body}</div>;

  return (
    <a
      href={track.songUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={`${track.title} — ${track.artist}. Open in Spotify.`}
      className="group block space-y-1 rounded-md -m-1.5 p-1.5 transition-colors duration-[var(--dur-tap)] hover:bg-black/5 dark:hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plate-25"
    >
      {body}
      <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-readout/0 transition-colors duration-[var(--dur-tap)] group-hover:text-readout group-focus-visible:text-readout">
        open in spotify ↗
      </span>
    </a>
  );
}

/**
 * The five readings. Only the constantly-ticking numerics are hidden from
 * assistive tech — a clock that changes sixty times a second is noise in the
 * AT tree. Now playing stays readable, because on the home page the rail is
 * the only place it appears.
 */
function Readings({ active, track }: { active: boolean; track: Track }) {
  const { ageRef, clockRef, clockTzRef, hanoiRef, hanoiTzRef, sessionRef } =
    useTelemetry(active);

  return (
    <>
      <Channel label="Age" hidden>
        <p
          ref={ageRef}
          className="font-mono text-[13px] tabular-nums tracking-tight text-readout-strong"
        />
      </Channel>

      <Channel label="Cincinnati" hidden>
        <p
          ref={clockRef}
          className="font-mono text-[13px] tabular-nums tracking-tight text-readout-strong"
        />
        <p
          ref={clockTzRef}
          className="font-mono text-[10px] tabular-nums tracking-[0.14em] text-readout"
        />
      </Channel>

      <Channel label="Hanoi" hidden>
        <p
          ref={hanoiRef}
          className="font-mono text-[13px] tabular-nums tracking-tight text-readout-strong"
        />
        <p
          ref={hanoiTzRef}
          className="font-mono text-[10px] tabular-nums tracking-[0.14em] text-readout"
        />
      </Channel>

      <Channel label="Session" hidden>
        <p
          ref={sessionRef}
          className="font-mono text-[13px] tabular-nums tracking-tight text-readout-strong"
        />
      </Channel>

      <Channel label="Now playing">
        {track.isPlaying ? (
          <NowPlayingLink track={track} />
        ) : (
          <p className="font-mono text-[11px] text-readout">—</p>
        )}
      </Channel>
    </>
  );
}

// Below this many pixels a press is a tap, not a drag.
const DRAG_SLOP = 6;

/**
 * The phone drawer.
 *
 * Open and closed are React state and CSS transitions. A drag in progress is
 * not: the panel and backdrop follow the finger through inline styles written
 * straight to the DOM, and on release the inline styles are dropped and the
 * state settles — the CSS transition then carries the panel the rest of the
 * way from wherever the finger let go.
 */
function RailDrawer({ track }: { track: Track }) {
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);

  const tabRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<{
    id: number;
    x: number;
    y: number;
    t: number;
    from: number; // panel offset at the start: 0 open, -width closed
    width: number;
    moved: boolean;
    lastX: number;
    lastT: number;
    vx: number;
  } | null>(null);
  // Until this time, clicks are eaten: a press that turned into a drag must
  // not also land as a tap. A window rather than a flag, because a drag isn't
  // always followed by a click, and a stale flag would eat the next real tap.
  const suppressUntil = useRef(0);
  const swallowClick = () => performance.now() < suppressUntil.current;

  const place = (x: number, width: number) => {
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    if (panel) {
      panel.style.transition = "none";
      // Tailwind v4's translate utilities set `translate`, not `transform`;
      // writing transform here would stack on top of the class's -100%.
      panel.style.translate = `${x}px 0`;
    }
    if (backdrop) {
      backdrop.style.transition = "none";
      backdrop.style.opacity = String(1 + x / width);
    }
  };

  const release = () => {
    for (const el of [panelRef.current, backdropRef.current]) {
      if (!el) continue;
      el.style.removeProperty("transition");
      el.style.removeProperty("translate");
      el.style.removeProperty("opacity");
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const width = panelRef.current?.offsetWidth ?? 256;
    const now = performance.now();
    gesture.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      t: now,
      from: open ? 0 : -width,
      width,
      moved: false,
      lastX: e.clientX,
      lastT: now,
      vx: 0,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;

    if (!g.moved) {
      if (Math.abs(dx) < DRAG_SLOP) return;
      // A mostly-vertical move inside the open panel is a scroll, not a drag.
      if (Math.abs(dy) > Math.abs(dx)) {
        gesture.current = null;
        return;
      }
      g.moved = true;
      try {
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
      } catch {
        // The pointer already ended; the release handler will settle it.
      }
      setDragging(true);
    }

    const now = performance.now();
    if (now > g.lastT) g.vx = (e.clientX - g.lastX) / (now - g.lastT);
    g.lastX = e.clientX;
    g.lastT = now;

    place(Math.min(0, Math.max(-g.width, g.from + dx)), g.width);
  };

  const onPointerEnd = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    gesture.current = null;
    if (!g.moved) return; // a tap — the click handler takes it from here

    const x = Math.min(0, Math.max(-g.width, g.from + (e.clientX - g.x)));
    // A flick decides on its own; otherwise whichever side of halfway it's on.
    const next =
      g.vx > 0.4 ? true : g.vx < -0.4 ? false : x > -g.width / 2;

    suppressUntil.current = performance.now() + 350;
    release();
    setDragging(false);
    setOpen(next);
  };

  const onPointerCancel = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    gesture.current = null;
    if (!g.moved) return;
    suppressUntil.current = performance.now() + 350;
    release();
    setDragging(false);
  };

  const close = useCallback(() => setOpen(false), []);

  // Esc closes; focus moves into the panel on open, stays inside it while
  // open (it is a modal), and goes back to the tab on close — so a keyboard
  // user is never left on something they can't see.
  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const stops = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>("a[href], button"),
      );
      if (stops.length === 0) return;
      const first = stops[0];
      const last = stops[stops.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panelRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      } else if (!panelRef.current.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const panel = panelRef.current;
    const tab = tabRef.current;
    return () => {
      document.removeEventListener("keydown", onKey);
      if (panel?.contains(document.activeElement)) {
        tab?.focus({ preventScroll: true });
      }
    };
  }, [open, close]);

  const dragHandlers = {
    onPointerDown,
    onPointerMove,
    onPointerUp: onPointerEnd,
    onPointerCancel,
  };

  const visible = open || dragging;

  return (
    <>
      {/* The tab. A 28px hit area with a 14px plate showing, so it reads as
          something tucked behind the edge rather than a button on the page.
          It carries the same pulse as the rail: equalizer bars while music
          plays — live, so they loop — and otherwise a signal dot that pulses
          three times to be noticed and then rests (doctrine rule 3). */}
      <button
        ref={tabRef}
        type="button"
        aria-label="Open telemetry"
        aria-expanded={open}
        aria-controls="telemetry-drawer"
        onClick={() => {
          if (!swallowClick()) setOpen(true);
        }}
        {...dragHandlers}
        className="group fixed left-[env(safe-area-inset-left,0px)] top-1/2 z-45 flex h-20 w-7 -translate-y-1/2 items-center touch-none select-none [-webkit-touch-callout:none] outline-none"
      >
        <span className="flex h-14 w-3.5 flex-col items-center justify-center rounded-r-md border border-l-0 border-rule bg-card/90 shadow-sm backdrop-blur-sm transition-[width] duration-[var(--dur-tap)] ease-[var(--ease-smooth)] group-active:w-4 group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-plate-25">
          {track.isPlaying ? (
            <span className="flex h-3 items-end gap-px" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-full w-[2px] origin-bottom bg-plate-25 animate-[eq_900ms_ease-in-out_infinite]"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </span>
          ) : (
            <span
              className="size-1.5 rounded-full bg-signal animate-pulse [animation-iteration-count:3]"
              aria-hidden="true"
            />
          )}
        </span>
      </button>

      <div
        ref={backdropRef}
        onClick={() => {
          if (!swallowClick()) close();
        }}
        {...dragHandlers}
        aria-hidden="true"
        className={`fixed inset-0 z-54 touch-none bg-black/40 transition-opacity duration-[var(--dur-quick)] ease-[var(--ease-smooth)] motion-reduce:transition-none ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <div
        ref={panelRef}
        id="telemetry-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Telemetry"
        tabIndex={-1}
        inert={!visible}
        onClickCapture={(e) => {
          // A drag that started on the Spotify link must not open it.
          if (swallowClick()) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        {...dragHandlers}
        className={`fixed inset-y-0 left-0 z-55 w-64 max-w-[80vw] touch-pan-y select-none overflow-y-auto overscroll-contain border-r border-rule bg-background px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] pl-[max(1.5rem,env(safe-area-inset-left))] shadow-2xl outline-none transition-transform duration-[var(--dur-quick)] ease-[var(--ease-out-expo)] motion-reduce:transition-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* No heading: the rail has none, so the drawer opens straight onto
            the same readings. The close button sits in the corner, beside
            Age rather than above it. */}
        <button
          type="button"
          onClick={close}
          aria-label="Close telemetry"
          className="absolute right-3 top-[max(1rem,calc(env(safe-area-inset-top)-0.5rem))] rounded-md px-2 py-1 font-mono text-[13px] text-readout transition-colors duration-[var(--dur-tap)] hover:text-readout-strong focus-visible:outline-2 focus-visible:outline-plate-25"
        >
          ✕
        </button>
        <Readings active={open || dragging} track={track} />
      </div>
    </>
  );
}

export default function InstrumentRail() {
  const [track, setTrack] = useState<Track>({ isPlaying: false });
  const isXl = useMediaQuery(XL_QUERY);
  const mounted = useMounted();

  useEffect(() => subscribeSpotify(setTrack), []);

  return (
    <>
      <aside className="hidden xl:block">
        <div className="fog-rail sticky top-24 select-none">
          <Readings active={isXl} track={track} />
        </div>
      </aside>

      {/* Portalled to <body>: the page sits inside a fade-in transition and,
          on /profile, its own z-10 stacking context, either of which would
          trap a fixed drawer underneath the page peel and the scroll button. */}
      {mounted && !isXl && createPortal(<RailDrawer track={track} />, document.body)}
    </>
  );
}
