"use client";

import { useEffect, useRef, useState } from "react";
import { subscribeSpotify, type Track } from "@/lib/spotifyStore";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * The telemetry rail.
 *
 * An instrument panel's margins are where the readings live. Below xl there
 * are no margins to speak of, so this is not rendered at all — the phone
 * layout is untouched by its existence.
 *
 * Sits on the live matrix rather than on the fog: telemetry belongs on the
 * field, and mono at this weight holds up over it.
 *
 * Doctrine rule 4: one rAF for all four channels, writing textContent and
 * custom properties. No state, no re-render, no second timer.
 */

const DOB = new Date(2006, 4, 11).getTime();
const MS_PER_YEAR = 365.2425 * 24 * 60 * 60 * 1000;

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

export default function InstrumentRail() {
  const ageRef = useRef<HTMLParagraphElement>(null);
  const clockRef = useRef<HTMLParagraphElement>(null);
  const sessionRef = useRef<HTMLParagraphElement>(null);
  const depthRef = useRef<HTMLDivElement>(null);
  const depthLabelRef = useRef<HTMLSpanElement>(null);

  const [track, setTrack] = useState<Track>({ isPlaying: false });
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => subscribeSpotify(setTrack), []);

  useEffect(() => {
    const mounted = performance.now();
    let frame = 0;

    const pad = (n: number) => String(n).padStart(2, "0");

    const paint = () => {
      const now = Date.now();

      if (ageRef.current) {
        ageRef.current.textContent = ((now - DOB) / MS_PER_YEAR).toFixed(9);
      }

      if (clockRef.current) {
        clockRef.current.textContent = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/New_York",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }).format(now);
      }

      if (sessionRef.current) {
        const s = Math.floor((performance.now() - mounted) / 1000);
        sessionRef.current.textContent = `${pad(Math.floor(s / 3600))}:${pad(
          Math.floor((s % 3600) / 60),
        )}:${pad(s % 60)}`;
      }

      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      const pct = scrollable > 0 ? Math.min(1, doc.scrollTop / scrollable) : 0;
      if (depthRef.current) {
        depthRef.current.style.transform = `scaleX(${pct.toFixed(4)})`;
      }
      if (depthLabelRef.current) {
        depthLabelRef.current.textContent = `${Math.round(pct * 100)}%`;
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
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [reducedMotion]);

  return (
    // Only the constantly-ticking numerics are hidden from assistive tech —
    // a clock that changes sixty times a second is noise in the AT tree.
    // Now playing stays readable, because on the home page the rail is the
    // only place it appears.
    <aside className="hidden xl:block">
      <div className="sticky top-24 select-none">
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
        </Channel>

        <Channel label="Session" hidden>
          <p
            ref={sessionRef}
            className="font-mono text-[13px] tabular-nums tracking-tight text-readout-strong"
          />
        </Channel>

        <Channel label="Now playing">
          {track.isPlaying ? (
            <div className="space-y-1">
              <div className="flex items-end gap-[3px] h-4" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className="w-[3px] bg-plate-25 origin-bottom animate-[eq_900ms_ease-in-out_infinite]"
                    style={{
                      height: "100%",
                      animationDelay: `${i * 120}ms`,
                    }}
                  />
                ))}
              </div>
              <p className="truncate font-mono text-[11px] text-readout-strong">
                {track.title}
              </p>
              <p className="truncate font-mono text-[11px] text-readout">
                {track.artist}
              </p>
            </div>
          ) : (
            <p className="font-mono text-[11px] text-readout">—</p>
          )}
        </Channel>

        <Channel label="Depth" hidden>
          <div className="h-[3px] w-full bg-rule">
            <div
              ref={depthRef}
              className="h-full w-full origin-left scale-x-0 bg-plate-chrome"
            />
          </div>
          <span
            ref={depthLabelRef}
            className="mt-1 block font-mono text-[10px] tabular-nums text-readout"
          />
        </Channel>
      </div>
    </aside>
  );
}
