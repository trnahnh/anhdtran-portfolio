"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { Experience } from "@/lib/data/experiences";
import { useMounted } from "@/hooks/useMounted";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import {
  NO_REVEAL_SOUND,
  playRevealSound,
  type RevealSound,
} from "@/lib/revealSound";

/**
 * The incoming role, sealed until asked for. The row on the page is two
 * redaction bars; a click takes over the whole screen, the role draws
 * itself there in outline, and the spiral lights up between the role and
 * the company, a teaser rather than a list entry.
 *
 * Until there is a role to announce, it reads TBD ꩜ TBD. Add an entry with
 * status "future" in lib/data/experiences.ts and it takes over.
 */

const PLACEHOLDER = { title: "TBD", company: "TBD" };

// The words around the reveal. Short, lower-key than the headline.
const KICKER = "Incoming";
const CAPTION = "Announcing soon";

/**
 * The sequence, in ms after the click:
 *
 *   dark     the screen goes dark
 *   kicker   KICKER types on, small, with a block cursor
 *   draw     the role's outline traces itself, every glyph at once, while
 *            the spiral turns into place and its light builds
 *   lock     the outline closes, the spiral flares
 *   settle   a hairline draws under it and the caption comes up
 *
 * A click during the sequence jumps to the end; after it, a click closes.
 * lib/revealSound.ts is scheduled off the same numbers.
 */
const KICKER_AT = 400;
const KICKER_STEP = 70;
const DRAW_AT = 1100;
const DRAW_MS = 2400;
const LOCK_AT = DRAW_AT + DRAW_MS;
const SETTLE_AT = LOCK_AT + 150;
const END = SETTLE_AT + 900;

// SVG user units; the viewBox is measured from the rendered text.
const FONT_SIZE = 100;
const LINE_HEIGHT = 112;
// The spiral sits on a line of its own. Its glyph is small for its font
// size, so it's set larger than the letters to hold its own between them.
const SYMBOL_SIZE = 150;
// Clear space between the ink of the role, the spiral and the company.
const GAP = 34;
// How far the spiral turns as it comes in, in degrees.
const SYMBOL_TURN = 150;
// Text has no pathLength, so a contour can't be told to finish at 100%. A
// dash grows from nothing to solid instead. Any contour shorter than the
// period closes early, once the dash reaches its length; at 160 that's only
// the small counters, so the letters finish together, each traced from a
// few points at once.
const DASH = 160;
// On-screen stroke weight, whatever size the text is drawn at; thinner on
// small type, or the counters close up and the letters read as filled.
const STROKE_PX = 1.6;
const STROKE_PER_PX = 0.025;
// Lines wrap at word breaks to this many characters. A phone gets short
// lines, so each word can be big.
const WRAP_WIDE = 26;
const WRAP_NARROW = 11;
const NARROW = "(max-width: 639px)";

const easeOutExpo = (p: number) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p));
const easeInOut = (p: number) =>
  p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
const clamp01 = (p: number) => Math.min(1, Math.max(0, p));

/** Greedy word wrap. A word longer than `max` gets a line to itself. */
function wrap(text: string, max: number) {
  const lines: string[] = [];
  for (const word of text.toUpperCase().split(" ")) {
    const last = lines[lines.length - 1];
    if (last !== undefined && last.length + 1 + word.length <= max) {
      lines[lines.length - 1] = `${last} ${word}`;
    } else {
      lines.push(word);
    }
  }
  return lines;
}

function mediaStore(query: string) {
  return {
    subscribe(cb: () => void) {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", cb);
      return () => mql.removeEventListener("change", cb);
    },
    get: () => window.matchMedia(query).matches,
  };
}
const narrowStore = mediaStore(NARROW);
const useNarrow = () =>
  useSyncExternalStore(narrowStore.subscribe, narrowStore.get, () => false);
const touchStore = mediaStore("(pointer: coarse)");
const useTouch = () =>
  useSyncExternalStore(touchStore.subscribe, touchStore.get, () => false);

// The theme is a class on <html>, set by ThemeToggle.
function subscribeTheme(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => mo.disconnect();
}
const useDark = () =>
  useSyncExternalStore(
    subscribeTheme,
    () => document.documentElement.classList.contains("dark"),
    () => true,
  );

type Layout = {
  vb: string;
  w: number;
  h: number;
  symbolY: number;
  companyY: number;
  /** The spiral's centre, to turn it about. */
  cx: number;
  cy: number;
};

/**
 * One role: its title traced in outline, the spiral alone on the line
 * under it, the company traced under that. `progress` (0 → 1) is how far
 * the trace has got; `glow` (0 → about 1) is the spiral's light.
 */
function Lockup({
  title,
  company,
  narrow,
  dark,
  progress,
  glow,
}: {
  title: string;
  company: string;
  narrow: boolean;
  dark: boolean;
  progress: number;
  glow: number;
}) {
  const glowId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const titleRef = useRef<SVGGElement>(null);
  const symbolRef = useRef<SVGTextElement>(null);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [scale, setScale] = useState(1);

  const max = narrow ? WRAP_NARROW : WRAP_WIDE;
  const titleLines = wrap(title, max);
  const companyLines = wrap(company, max);
  const key = `${titleLines.join("\n")}\n—\n${companyLines.join("\n")}`;

  // Stack the three parts by their ink, once the display face has loaded.
  // SVG can only measure a text's line box (ascent to descent), and the
  // spiral's glyph sits low in its box, so spacing by those left it closer
  // to the company than the role. A canvas reports where the ink is.
  useLayoutEffect(() => {
    let live = true;
    const measure = () => {
      const tg = titleRef.current?.querySelector("text");
      const sg = symbolRef.current;
      const ctx = document.createElement("canvas").getContext("2d");
      if (!live || !tg || !sg || !ctx) return;
      const ink = (el: SVGTextElement, text: string, size: number) => {
        const cs = getComputedStyle(el);
        ctx.font = `${cs.fontWeight} ${size}px ${cs.fontFamily}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        const m = ctx.measureText(text);
        return {
          top: -m.actualBoundingBoxAscent,
          bottom: m.actualBoundingBoxDescent,
          left: -m.actualBoundingBoxLeft,
          right: m.actualBoundingBoxRight,
        };
      };
      // A block of lines, baselines LINE_HEIGHT apart from y = 0.
      const block = (lines: string[]) =>
        lines
          .map((line, i) => {
            const b = ink(tg, line, FONT_SIZE);
            return { ...b, top: b.top + i * LINE_HEIGHT, bottom: b.bottom + i * LINE_HEIGHT };
          })
          .reduce((a, b) => ({
            top: Math.min(a.top, b.top),
            bottom: Math.max(a.bottom, b.bottom),
            left: Math.min(a.left, b.left),
            right: Math.max(a.right, b.right),
          }));
      const tb = block(titleLines);
      const cb = block(companyLines);
      const sb = ink(sg, "꩜", SYMBOL_SIZE);
      const symbolY = tb.bottom + GAP - sb.top;
      const companyY = symbolY + sb.bottom + GAP - cb.top;
      const left = Math.min(tb.left, sb.left, cb.left);
      const right = Math.max(tb.right, sb.right, cb.right);
      const top = tb.top;
      const bottom = companyY + cb.bottom;
      const pad = 6;
      const w = right - left + pad * 2;
      const h = bottom - top + pad * 2;
      setLayout({
        vb: `${left - pad} ${top - pad} ${w} ${h}`,
        w,
        h,
        symbolY,
        companyY,
        cx: (sb.left + sb.right) / 2,
        cy: (sb.top + sb.bottom) / 2,
      });
    };
    measure();
    document.fonts?.ready.then(measure);
    return () => {
      live = false;
    };
    // Keyed on the text, not the arrays: the parent re-renders every frame
    // of the sequence and builds fresh (but equal) arrays each time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // How many screen pixels one user unit is, so the stroke holds its weight
  // at any size. The box can be capped by width or by height.
  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg || !layout) return;
    const update = () => {
      const r = svg.getBoundingClientRect();
      setScale(Math.min(r.width / layout.w, r.height / layout.h) || 1);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(svg);
    return () => ro.disconnect();
  }, [layout]);

  const dash = DASH * progress;
  const turn = -SYMBOL_TURN * (1 - easeOutExpo(progress));
  // On a light page the halo is a soft shadow rather than light, and it
  // reads much stronger, so it is held back.
  const g = glow * (dark ? 1 : 0.55);

  return (
    <svg
      ref={svgRef}
      viewBox={layout?.vb ?? "0 0 1 1"}
      className="block h-auto max-h-(--stack) w-[min(88vw,1100px)] overflow-visible text-foreground"
      style={{
        visibility: layout ? "visible" : "hidden",
        // A tall stack (a short role on a phone, or TBD anywhere) is capped
        // by height; this keeps the box the stack's own shape so it stays
        // centred and the scale above is right.
        aspectRatio: layout ? `${layout.w} / ${layout.h}` : undefined,
        width: layout ? `min(88vw, 1100px, calc(var(--stack) * ${layout.w / layout.h}))` : undefined,
      }}
      aria-hidden="true"
    >
      <defs>
        {/* Two blurs of the glyph under it: a wide soft halo and a tight
            bright edge. Radii are in user units, so the glow scales with
            the type. */}
        <filter id={glowId} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="18" result="wide" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.6" result="tight" />
          <feComponentTransfer in="wide" result="wideLit">
            <feFuncA type="linear" slope={1.6 * g} />
          </feComponentTransfer>
          {/* The halo is cut out of the spiral's footprint (the glyph grown
              until its turns merge), so the light spreads outward and the
              gaps between the turns stay clear. */}
          <feMorphology in="SourceAlpha" operator="dilate" radius="6" result="grown" />
          {/* Feathered, or the cut shows as a hard ring. */}
          <feGaussianBlur in="grown" stdDeviation="5" result="body" />
          <feComposite in="wideLit" in2="body" operator="out" result="halo" />
          {/* Kept tight: any wider and it fills the gaps between the
              spiral's turns and the shape goes to mush. */}
          <feComponentTransfer in="tight" result="tightLit">
            <feFuncA type="linear" slope={0.9 * g} />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode in="halo" />
            <feMergeNode in="tightLit" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g
        fontWeight={700}
        textAnchor="middle"
        style={{ fontFamily: "var(--font-archivo), system-ui, sans-serif" }}
      >
        {/* The role and the company, traced. */}
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth={Math.min(STROKE_PX, FONT_SIZE * scale * STROKE_PER_PX) / scale}
          strokeLinejoin="round"
          strokeDasharray={progress >= 1 ? undefined : `${dash} ${DASH - dash}`}
          fontSize={FONT_SIZE}
        >
          <g ref={titleRef}>
            {titleLines.map((line, i) => (
              <text key={i} x={0} y={i * LINE_HEIGHT}>
                {line}
              </text>
            ))}
          </g>
          <g transform={`translate(0 ${layout?.companyY ?? 0})`}>
            {companyLines.map((line, i) => (
              <text key={i} x={0} y={i * LINE_HEIGHT}>
                {line}
              </text>
            ))}
          </g>
        </g>

        {/* The spiral, alone on its line. It stays the normal solid glyph:
            its lines are too fine to outline, both edges run together. It
            turns into place and lights up as the letters are traced. */}
        <g transform={`translate(0 ${layout?.symbolY ?? 0})`}>
          <g transform={layout ? `rotate(${turn} ${layout.cx} ${layout.cy})` : undefined}>
            <text
              ref={symbolRef}
              x={0}
              y={0}
              fontSize={SYMBOL_SIZE}
              fill="currentColor"
              fillOpacity={progress}
              filter={`url(#${glowId})`}
              style={{ fontFamily: "system-ui, sans-serif" }}
            >
              ꩜
            </text>
          </g>
        </g>
      </g>
    </svg>
  );
}

function Overlay({
  roles,
  onClose,
  onSkip,
}: {
  roles: { title: string; company: string }[];
  onClose: () => void;
  onSkip: () => void;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const narrow = useNarrow();
  const touch = useTouch();
  const dark = useDark();
  const [t, setT] = useState(reducedMotion ? END : 0);
  const skipTo = useRef<number | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // One clock for the whole sequence; everything on screen is read off it.
  useEffect(() => {
    if (reducedMotion) return;
    let raf = 0;
    let start = performance.now();
    const tick = (now: number) => {
      if (skipTo.current !== null) {
        start = now - skipTo.current;
        skipTo.current = null;
      }
      const elapsed = now - start;
      setT(Math.min(elapsed, END));
      if (elapsed < END) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion]);

  const done = t >= END;

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      // One focusable control, so Tab stays on it.
      if (e.key === "Tab") {
        e.preventDefault();
        closeRef.current?.focus({ preventScroll: true });
      }
    };
    window.addEventListener("keydown", onKey);
    // Lenis listens for wheel and touch on window; stop them at the overlay
    // so the page stays put behind it.
    const el = overlayRef.current;
    const block = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };
    el?.addEventListener("wheel", block, { passive: false });
    el?.addEventListener("touchmove", block, { passive: false });
    return () => {
      window.removeEventListener("keydown", onKey);
      el?.removeEventListener("wheel", block);
      el?.removeEventListener("touchmove", block);
    };
  }, [onClose]);

  // Kicker: typed on, then the cursor keeps blinking.
  const typed = Math.max(0, Math.floor((t - KICKER_AT) / KICKER_STEP) + 1);
  const kicker = KICKER.slice(0, Math.min(typed, KICKER.length));
  const cursorOn =
    t >= KICKER_AT && (typed <= KICKER.length || Math.floor(t / 500) % 2 === 0);

  const drawn = easeInOut(clamp01((t - DRAW_AT) / DRAW_MS));
  // A flare as the outline closes, fading out.
  const flare = t < LOCK_AT ? 0 : 1 - clamp01((t - LOCK_AT) / 900);
  // The spiral's light: builds as the letters are traced, flares as they
  // close, then holds at a steady glow rather than going out.
  const symbolGlow = drawn * 0.75 + flare * 0.5;
  const settled = clamp01((t - SETTLE_AT) / 700);
  const headline = roles.map((r) => `${r.title} at ${r.company}`).join("; ");

  return (
    <motion.div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Incoming: ${headline}`}
      // Above the page peel (z-60), level with the YC reveal. Takes the
      // page's own colours: dark ink on light, light on dark.
      // --stack is the most height the role's lockup may take. A landscape
      // phone has little height to give, so it gets less, and smaller
      // labels around it.
      className="fixed inset-0 z-90 flex cursor-pointer flex-col items-center justify-center bg-background px-4 text-foreground [--stack:56svh] short:[--stack:46svh]"
      style={{ overflow: "clip" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      onClick={() => {
        if (done) return onClose();
        skipTo.current = END;
        onSkip();
      }}
    >
      {/* A faint light behind the words, brighter for a moment at the lock. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 50% 40% at 50% 50%, color-mix(in srgb, var(--foreground) ${(dark ? 3.5 : 2.5) + flare * 6}%, transparent), transparent 70%)`,
        }}
      />

      <p
        aria-hidden="true"
        className="relative mb-[clamp(1rem,4svh,3rem)] h-5 font-mono text-sm uppercase tracking-[0.5em] text-foreground/55 sm:h-6 sm:text-lg short:h-5 short:text-sm"
      >
        {kicker}
        <span
          className="ml-1 inline-block h-[1.05em] w-[0.6em] translate-y-[0.15em] bg-foreground/60"
          style={{ opacity: cursorOn ? 1 : 0 }}
        />
      </p>

      <div
        className="relative flex flex-col items-center gap-[4svh]"
        style={{
          filter:
            flare > 0
              ? `drop-shadow(0 0 ${14 * flare}px color-mix(in srgb, var(--foreground) ${(dark ? 50 : 25) * flare}%, transparent))`
              : undefined,
        }}
      >
        {roles.map((r) => (
          <Lockup
            key={`${r.title}-${r.company}`}
            title={r.title}
            company={r.company}
            narrow={narrow}
            dark={dark}
            progress={drawn}
            glow={symbolGlow}
          />
        ))}
      </div>

      <div
        aria-hidden="true"
        className="relative mt-[clamp(1rem,5svh,3.5rem)] flex flex-col items-center gap-5 short:gap-3"
      >
        <span
          className="block h-px w-48 bg-foreground/35 sm:w-80"
          style={{ transform: `scaleX(${easeOutExpo(settled)})` }}
        />
        <span
          className="font-mono text-sm uppercase tracking-[0.35em] text-foreground/60 sm:text-lg short:text-sm"
          style={{ opacity: settled, transform: `translateY(${(1 - settled) * 6}px)` }}
        >
          {CAPTION}
        </span>
      </div>

      <button
        ref={closeRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close"
        className="absolute right-4 top-4 rounded-full p-2 text-foreground/50 transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-1 focus-visible:outline-foreground/60 sm:right-6 sm:top-6"
      >
        <X className="size-5" />
      </button>

      <p
        aria-hidden="true"
        // Hidden where there's no room under the caption for it.
        className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] font-mono text-xs uppercase tracking-[0.3em] text-foreground/35 transition-opacity duration-500 short:hidden"
        style={{ opacity: done ? 1 : 0 }}
      >
        {touch ? "Tap to close" : "Esc or click to close"}
      </p>
    </motion.div>
  );
}

export default function IncomingReveal({ items }: { items: Experience[] }) {
  const [open, setOpen] = useState(false);
  const mounted = useMounted();
  const reducedMotion = usePrefersReducedMotion();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sound = useRef<RevealSound>(NO_REVEAL_SOUND);

  const roles = items.length > 0 ? items : [PLACEHOLDER];

  const reveal = () => {
    // Started here, inside the click, which is what lets iOS play it.
    sound.current = playRevealSound({
      kickerAt: KICKER_AT / 1000,
      kickerStep: KICKER_STEP / 1000,
      kickerChars: KICKER.length,
      drawAt: DRAW_AT / 1000,
      lockAt: LOCK_AT / 1000,
    });
    // No sequence to score: just the hit.
    if (reducedMotion) sound.current.skip();
    setOpen(true);
  };

  const close = useCallback(() => {
    sound.current.stop();
    sound.current = NO_REVEAL_SOUND;
    setOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  }, []);

  const skip = useCallback(() => sound.current.skip(), []);

  // Leaving the page mid-reveal shouldn't leave it ringing.
  useEffect(() => () => sound.current.stop(), []);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={reveal}
        aria-haspopup="dialog"
        className="group interactive flex w-full items-center text-left text-muted-foreground rounded-xl p-3 -mx-3 transition-all duration-300 hover:shadow-depth hover-lift hover:bg-black/3 dark:hover:bg-white/3"
      >
        <span className="mr-2" aria-hidden="true">
          &#8627;
        </span>
        <span
          aria-hidden="true"
          className="inline-block h-[0.95em] w-14 rounded-[2px] bg-foreground/85 transition-[width] duration-300 group-hover:w-16"
        />
        <span className="mx-2" aria-hidden="true">
          ꩜
        </span>
        <span
          aria-hidden="true"
          className="inline-block h-[0.95em] w-20 rounded-[2px] bg-foreground/85 transition-[width] duration-300 group-hover:w-24"
        />
        <span className="ml-auto pl-4 font-mono text-xs uppercase tracking-widest">
          Reveal
          <span className="sr-only"> incoming experience</span>
        </span>
      </button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <Overlay key="incoming" roles={roles} onClose={close} onSkip={skip} />
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
