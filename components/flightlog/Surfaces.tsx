/**
 * The four playing surfaces, seen from above in hairline, for the varsity
 * cards. Each is drawn in currentColor, so the card sets its colour: the
 * plate colour nearest the real surface.
 *
 * Every surface carries one mover (a runner, a ball, a shuttle, a swimmer)
 * on an SMIL motion path. They play on their own; the card list pauses them
 * while it is off-screen or the reader prefers reduced motion.
 */

export type SurfaceKind = "track" | "court" | "badminton" | "pool";

const line = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 0.6,
  strokeLinecap: "round" as const,
};

function Track() {
  // Lane 1 runs 2 units inside the outer edge; the runner laps it.
  const lane = "M 32 8 H 68 A 24 24 0 0 1 68 56 H 32 A 24 24 0 0 1 32 8 Z";
  return (
    <>
      <rect x="6" y="6" width="88" height="52" rx="26" fill="currentColor" fillOpacity="0.22" />
      <rect x="22" y="22" width="56" height="20" rx="10" fill="var(--background)" fillOpacity="0.9" />
      {[0, 4, 8, 12, 16].map((d) => (
        <rect
          key={d}
          x={6 + d}
          y={6 + d}
          width={88 - 2 * d}
          height={52 - 2 * d}
          rx={26 - d}
          {...line}
          strokeOpacity={d === 0 ? 0.9 : 0.5}
        />
      ))}
      {/* Finish line across the home straight. */}
      <path d="M 60 42 V 58" {...line} strokeWidth="1" />
      <circle r="1.9" fill="currentColor">
        <animateMotion dur="4s" repeatCount="indefinite" path={lane} />
      </circle>
    </>
  );
}

function Court() {
  return (
    <>
      <rect x="6" y="6" width="88" height="52" fill="currentColor" fillOpacity="0.16" />
      {/* Floorboards. */}
      {Array.from({ length: 12 }, (_, i) => (
        <path key={i} d={`M 6 ${10 + i * 4} H 94`} {...line} strokeOpacity="0.14" />
      ))}
      <rect x="6" y="6" width="88" height="52" {...line} />
      <rect x="38" y="6" width="24" height="22" fill="currentColor" fillOpacity="0.28" />
      <rect x="38" y="6" width="24" height="22" {...line} />
      <circle cx="50" cy="28" r="8" {...line} />
      <path d="M 14 6 V 16 A 36 36 0 0 0 86 16 V 6" {...line} />
      <path d="M 44 9 H 56" {...line} strokeWidth="1.1" />
      <circle cx="50" cy="12" r="2.4" {...line} />
      {/* A jumper from the wing, held at the rim before the next. */}
      <circle r="2.2" fill="currentColor">
        <animateMotion
          dur="2.4s"
          repeatCount="indefinite"
          path="M 74 50 Q 66 -6 50 12"
          keyPoints="0;1;1"
          keyTimes="0;0.55;1"
          calcMode="spline"
          keySplines="0.3 0 0.7 1;0 0 1 1"
        />
      </circle>
    </>
  );
}

function Badminton() {
  return (
    <>
      <rect x="6" y="8" width="88" height="48" fill="currentColor" fillOpacity="0.22" />
      <rect x="6" y="8" width="88" height="48" {...line} />
      {/* Singles sidelines, long service lines for doubles, short service lines. */}
      <path d="M 6 11.6 H 94 M 6 52.4 H 94" {...line} strokeOpacity="0.7" />
      <path d="M 11 8 V 56 M 89 8 V 56" {...line} strokeOpacity="0.7" />
      <path d="M 39 8 V 56 M 61 8 V 56" {...line} strokeOpacity="0.7" />
      <path d="M 6 32 H 39 M 61 32 H 94" {...line} strokeOpacity="0.7" />
      {/* The net. */}
      <path d="M 50 5 V 59" {...line} strokeWidth="1.2" strokeDasharray="1 1" />
      {/* A clear from the back, then the steep drop of the smash return. */}
      <circle r="1.7" fill="currentColor">
        <animateMotion
          dur="2.6s"
          repeatCount="indefinite"
          path="M 18 44 Q 50 -14 80 22 Q 64 30 44 50"
          keyPoints="0;0.62;1;1"
          keyTimes="0;0.55;0.75;1"
          calcMode="linear"
        />
      </circle>
    </>
  );
}

function Pool() {
  const lanes = 5;
  const h = 52 / lanes;
  return (
    <>
      <rect x="6" y="6" width="88" height="52" fill="currentColor" fillOpacity="0.24" />
      <rect x="6" y="6" width="88" height="52" {...line} />
      {/* Lane ropes: floats, so dashed. */}
      {Array.from({ length: lanes - 1 }, (_, i) => (
        <path key={i} d={`M 6 ${6 + h * (i + 1)} H 94`} {...line} strokeWidth="1" strokeDasharray="1.2 1.2" />
      ))}
      {/* The T on the floor of each lane. */}
      {Array.from({ length: lanes }, (_, i) => {
        const y = 6 + h * (i + 0.5);
        return (
          <path
            key={i}
            d={`M 14 ${y} H 86 M 14 ${y - 2.4} V ${y + 2.4} M 86 ${y - 2.4} V ${y + 2.4}`}
            {...line}
            strokeOpacity="0.35"
          />
        );
      })}
      {/* Lengths, there and back, in the middle lane. */}
      <ellipse rx="3.2" ry="1.4" fill="currentColor">
        <animateMotion
          dur="5s"
          repeatCount="indefinite"
          path={`M 11 ${6 + h * 2.5} H 89`}
          keyPoints="0;1;0"
          keyTimes="0;0.5;1"
          calcMode="spline"
          keySplines="0.4 0 0.6 1;0.4 0 0.6 1"
        />
      </ellipse>
    </>
  );
}

const DRAW: Record<SurfaceKind, () => React.JSX.Element> = {
  track: Track,
  court: Court,
  badminton: Badminton,
  pool: Pool,
};

export default function Surface({ kind }: { kind: SurfaceKind }) {
  const Draw = DRAW[kind];
  return (
    <svg data-surface viewBox="0 0 100 64" aria-hidden="true" className="block w-full overflow-visible">
      <Draw />
    </svg>
  );
}
