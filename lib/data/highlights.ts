import { projects } from "./projects";
import { experiences } from "./experiences";

/**
 * The numbers under the name, two by two: infra depth and systems speed on
 * top, real users below. Each is the project's own measured metric or the
 * role's own headline, so the strip can never say something the row it
 * points to does not.
 */
export interface Highlight {
  key: string;
  value: string;
  label: string;
  /** What the number belongs to, shown under it. */
  name: string;
  /** Element id on the landing page the highlight scrolls to. */
  target: string;
}

function fromProject(slug: string): Highlight {
  const project = projects.find((p) => p.slug === slug);
  if (!project?.metric) throw new Error(`highlight ${slug} has no metric`);
  return {
    key: slug,
    value: project.metric.value,
    label: project.metric.label,
    name: project.name,
    target: `project-${slug}`,
  };
}

function fromExperience(slug: string): Highlight {
  const exp = experiences.find((e) => e.slug === slug);
  if (!exp?.highlight) throw new Error(`highlight ${slug} has no number`);
  return {
    key: slug,
    value: exp.highlight.value,
    label: exp.highlight.label,
    name: exp.company,
    target: `experience-${slug}`,
  };
}

export const highlights: Highlight[] = [
  fromProject("kiln"),
  fromProject("ferrox"),
  fromProject("commma"),
  fromExperience("caphne"),
];
