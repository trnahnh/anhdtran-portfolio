import Link from "next/link";
import type { Project } from "@/lib/data/projects";

/**
 * The one area a project belongs to, set small above its name. Hosts come
 * from different orgs; this lets an infra host find kiln and an ML host find
 * Draft-Thinker without reading every description.
 */
export default function ProjectArea({
  project,
  className = "",
}: {
  project: Project;
  className?: string;
}) {
  return (
    <span
      className={`mb-1 block font-mono text-xs uppercase tracking-[0.1em] text-readout ${className}`}
    >
      {project.area}
    </span>
  );
}

/** Inline link to /projects/[slug], rendered only where a case study exists. */
export function CaseStudyLink({ project }: { project: Project }) {
  if (!project.caseStudy) return null;
  return (
    <Link
      href={`/projects/${project.slug}`}
      className="underline-link interactive ml-2 whitespace-nowrap text-foreground"
    >
      Case study &#8594;
    </Link>
  );
}
