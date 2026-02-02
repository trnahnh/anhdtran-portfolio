import UnderlineLink from "./UnderlineLink";
import { currentProjects, allProjects, type Project } from "@/lib/data/projects";

interface ProjectsSectionProps {
  showAll?: boolean;
}

export default function ProjectsSection({ showAll = false }: ProjectsSectionProps) {
  const projects: Project[] = showAll ? allProjects : currentProjects;

  return (
    <section className="fade-in-up fade-in-up-delay-2">
      <h2 className="text-lg font-medium mb-4">
        <span className="text-muted-foreground mr-2">&#9670;</span>
        {showAll ? "All Projects" : "Projects"}
      </h2>
      <div className="space-y-4 pl-6 sm:pl-7">
        {projects.map((project) => (
          <div key={project.name} className="text-muted-foreground">
            <span className="mr-2">&#8627;</span>
            <UnderlineLink href={project.link} external className="text-foreground font-medium">
              {project.name}
              {project.nameAlt && (
                <span className="ml-1 font-normal">{project.nameAlt}</span>
              )}
            </UnderlineLink>
            <span className="mx-2">—</span>
            <span>{project.description}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
