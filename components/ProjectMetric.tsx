import type { Project } from "@/lib/data/projects";

/**
 * The measured headline, shown as a readout.
 *
 * These numbers were already in the data driving the matrix but had never
 * been rendered — nobody could read the one thing that most distinguishes
 * this work. On a phone the metric stacks under the description; from lg it
 * moves into the gutter beside it, which is what the extra width is for.
 *
 * The measurement date is part of the claim. A number without one is a boast.
 */
export default function ProjectMetric({
  metric,
}: {
  metric: NonNullable<Project["metric"]>;
}) {
  return (
    <p className="mt-2 lg:mt-0 lg:text-right">
      <span className="block font-mono text-base tabular-nums leading-none text-readout-strong">
        {metric.value}
      </span>
      <span className="mt-1.5 block font-mono text-[10px] uppercase leading-snug tracking-[0.14em] text-readout">
        {metric.label}
      </span>
      <span className="mt-1 block font-mono text-[10px] tabular-nums text-readout/60">
        measured {metric.measured}
      </span>
    </p>
  );
}
