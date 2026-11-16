"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { RotateCcw } from "lucide-react";
import { LEGS, SQUAD, VARSITY, type Sport } from "@/lib/data/journey";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import Surface from "./Surfaces";

/**
 * Ex-varsity, as a set of trading cards. The front is the sport's playing
 * surface from above, in the plate colour nearest the real thing; tap and it
 * turns over to the school and years behind it.
 *
 * The little play on each surface runs by itself while the cards are on
 * screen. The tilt and the glare follow a mouse only: on touch they would
 * fight the scroll, and the tap is reserved for the flip. Reduced motion
 * keeps everything still and crossfades the faces instead of turning them.
 */

const plate = (p: Sport["plate"]) => `var(--plate-${p})`;

function Card({ sport, index }: { sport: Sport; index: number }) {
  const [flipped, setFlipped] = useState(false);
  const tiltRef = useRef<HTMLButtonElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const legNo = String(LEGS.indexOf(sport.school) + 1).padStart(2, "0");

  const onMove = (e: PointerEvent<HTMLButtonElement>) => {
    const el = tiltRef.current;
    if (!el || e.pointerType !== "mouse" || reducedMotion) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.transform = `perspective(700px) rotateY(${(x - 0.5) * 16}deg) rotateX(${(0.5 - y) * 16}deg) scale(1.03)`;
    el.style.setProperty("--mx", `${x * 100}%`);
    el.style.setProperty("--my", `${y * 100}%`);
    el.style.setProperty("--glare", "1");
  };
  const onLeave = () => {
    const el = tiltRef.current;
    if (!el) return;
    el.style.transform = "";
    el.style.setProperty("--glare", "0");
  };

  const face =
    "@container absolute inset-0 overflow-hidden rounded-xl border border-rule bg-background [backface-visibility:hidden]";
  // The card's own colour, washed in from the plate's corner.
  const wash = {
    backgroundImage: `radial-gradient(120% 80% at 100% 0%, color-mix(in oklab, ${plate(sport.plate)} 26%, transparent), transparent 60%)`,
  };

  return (
    <li>
      <button
        ref={tiltRef}
        type="button"
        onClick={() => setFlipped((f) => !f)}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        aria-pressed={flipped}
        aria-label={`${sport.name}: ex-varsity ${SQUAD.toLowerCase()}, ${sport.school.title}, ${sport.school.span}. ${flipped ? "Showing the back." : "Flip to see the school."}`}
        className="group block w-full rounded-xl text-left transition-transform duration-300 ease-out focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-plate-25"
        style={{ transformStyle: "preserve-3d" }}
      >
        <div
          className="relative aspect-[2/3] sm:aspect-[3/4] transition-transform duration-[var(--dur-travel)] ease-[var(--ease-out-expo)]"
          style={{
            transformStyle: "preserve-3d",
            transform: !reducedMotion && flipped ? "rotateY(180deg)" : undefined,
          }}
        >
          {/* Front. */}
          <div
            className={`${face} flex flex-col p-3 sm:p-4 transition-opacity duration-[var(--dur-quick)]`}
            style={{ ...wash, opacity: reducedMotion && flipped ? 0 : 1 }}
          >
            <div className="relative flex items-center justify-between">
              <p className="font-mono text-[min(8.5cqw,0.8125rem)] tabular-nums tracking-[0.1em] text-readout">
                {String(index + 1).padStart(2, "0")}
                <span className="text-readout/60">/{String(VARSITY.length).padStart(2, "0")}</span>
              </p>
              <RotateCcw
                aria-hidden="true"
                className="size-[min(10cqw,1.125rem)] shrink-0 text-readout transition-transform duration-[var(--dur-quick)] group-hover:-rotate-90"
              />
            </div>

            <div className="relative mt-2.5" style={{ color: plate(sport.plate) }}>
              <Surface kind={sport.surface} />
            </div>

            <div className="relative mt-auto">
              {/* Sized off the card: BASKETBALL, the widest line, is 6.37em, so
                  14.5cqw fills ~92% of the face at any card width. */}
              <p className="font-display text-[min(14.5cqw,2rem)] font-semibold uppercase leading-[0.95] tracking-tight">
                {sport.name}
              </p>
              <p className="mt-2.5 border-t border-rule pt-2 font-mono text-[min(9cqw,0.8125rem)] uppercase leading-relaxed tracking-[0.06em] text-readout">
                <span className="block text-readout-strong">Ex-varsity</span>
                {SQUAD}
              </p>
            </div>

            {/* Glare: a soft light that follows the mouse across the foil. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 transition-opacity duration-300"
              style={{
                opacity: "var(--glare, 0)",
                background:
                  "radial-gradient(circle at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.16), transparent 50%), linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.06) 45%, rgba(255,255,255,0.0) 60%)",
                mixBlendMode: "screen",
              }}
            />
          </div>

          {/* Back. */}
          <div
            className={`${face} flex flex-col p-3 sm:p-4 transition-opacity duration-[var(--dur-quick)]`}
            style={{
              transform: reducedMotion ? undefined : "rotateY(180deg)",
              opacity: reducedMotion && !flipped ? 0 : 1,
            }}
          >
            <span
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-1"
              style={{ background: plate(sport.plate) }}
            />
            <p className="font-mono text-[min(8.5cqw,0.8125rem)] uppercase tracking-[0.1em] text-readout">
              {sport.school.place.code} &middot; Leg {legNo}
            </p>
            <p className="mt-2.5 text-[min(10cqw,1.25rem)] font-medium leading-snug">
              {sport.school.title}
            </p>
            <p className="mt-1.5 font-mono text-[min(9cqw,0.9375rem)] tabular-nums text-readout-strong">
              {sport.school.when}
            </p>

            <div className="mt-auto border-t border-rule pt-2.5">
              <p className="flex items-center gap-2 font-display text-[min(10.5cqw,1.25rem)] font-semibold uppercase leading-tight">
                <span
                  aria-hidden="true"
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: plate(sport.plate) }}
                />
                {sport.name}
              </p>
              <p className="mt-1 font-mono text-[min(9cqw,0.8125rem)] uppercase tracking-[0.06em] text-readout">
                {SQUAD}
              </p>
            </div>
          </div>
        </div>
      </button>
    </li>
  );
}

export default function VarsityCards() {
  const listRef = useRef<HTMLUListElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  // Every surface plays while the cards are on screen, and holds still off
  // it or under reduced motion.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const arts = () => list.querySelectorAll<SVGSVGElement>("svg[data-surface]");
    const set = (on: boolean) =>
      arts().forEach((svg) => (on ? svg.unpauseAnimations() : svg.pauseAnimations()));
    set(false);
    if (reducedMotion) return;
    const io = new IntersectionObserver(([entry]) => set(entry.isIntersecting), {
      threshold: 0.15,
    });
    io.observe(list);
    return () => io.disconnect();
  }, [reducedMotion]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-readout">
          Ex-varsity &middot; <span className="text-readout-strong">{SQUAD}</span>
        </p>
        <p className="font-mono text-xs uppercase tracking-[0.1em] text-readout/70">
          Tap to flip
        </p>
      </div>
      {/* Four across only from lg: below it a card is ~140px and the type
          would have to shrink past legible to fit. */}
      <ul ref={listRef} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {VARSITY.map((sport, i) => (
          <Card key={sport.name} sport={sport} index={i} />
        ))}
      </ul>
    </div>
  );
}
