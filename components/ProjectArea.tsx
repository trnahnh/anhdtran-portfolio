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

/**
 * Link to /projects/[slug], rendered only where a case study exists. It sits
 * on its own line in the card's mono label style: tacked onto the end of the
 * description it read as the sentence's last words and wrapped to a
 * different spot on every card.
 */
export function CaseStudyLink({
  project,
  className = "",
}: {
  project: Project;
  className?: string;
}) {
  if (!project.caseStudy) return null;
  return (
    <p className={`mt-2 font-mono text-xs uppercase leading-6 tracking-[0.1em] ${className}`}>
      <Link
        href={`/projects/${project.slug}`}
        className="group underline-link interactive whitespace-nowrap text-foreground"
      >
        Read case study{" "}
        <span
          aria-hidden="true"
          className="inline-block transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none"
        >
          &#8594;
        </span>
      </Link>
    </p>
  );
}
