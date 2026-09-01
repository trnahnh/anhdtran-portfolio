import InstrumentRail from "./InstrumentRail";

/**
 * The reading frame.
 *
 * The measure never changes. At 672px the prose already runs to roughly 78
 * characters a line, which is past the comfortable range — so wide screens
 * get *structure* in the margins rather than a wider column of text.
 *
 *   base   one column, 672px            (the phone layout, untouched)
 *   lg     896px, room for a metric gutter beside project rows
 *   xl     1152px, telemetry rail in the left margin
 *
 * The fog sits on the reading column alone, not on <main>. If it wrapped the
 * whole frame it would smother the matrix across the entire screen at xl; on
 * the column only, the scene stays visible through the rail and the outer
 * margins, and the rail reads as an instrument sitting on a live field.
 */
export default function PageShell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main
      className={`mx-auto w-full max-w-2xl px-6 py-16 sm:py-24 lg:max-w-4xl xl:max-w-6xl ${className}`}
    >
      <div className="xl:grid xl:grid-cols-[10rem_minmax(0,1fr)] xl:gap-x-12">
        <InstrumentRail />
        <div className="fog space-y-16">{children}</div>
      </div>
    </main>
  );
}
