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

export default function InstrumentRail() {
  const ageRef = useRef<HTMLParagraphElement>(null);
  const clockRef = useRef<HTMLParagraphElement>(null);
  const sessionRef = useRef<HTMLParagraphElement>(null);

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
            <NowPlayingLink track={track} />
          ) : (
            <p className="font-mono text-[11px] text-readout">—</p>
          )}
        </Channel>

      </div>
    </aside>
  );
}
