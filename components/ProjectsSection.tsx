import UnderlineLink from "./UnderlineLink";
import ProjectCard from "./ProjectCard";
import { currentProjects, pastProjects } from "@/lib/data/projects";

function AnimatedDots() {
  return (
    <span className="inline-flex w-[1.2em]" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="animate-pulse"
          style={{ animationDelay: `${i * 400}ms` }}
        >.</span>
      ))}
    </span>
  );
}

interface ProjectsSectionProps {
  showAll?: boolean;
}

export default function ProjectsSection({ showAll = false }: ProjectsSectionProps) {

  return (
    <section className="fade-in-up fade-in-up-delay-2">
      <h2 className="text-lg font-medium mb-4">
        <span className="text-muted-foreground mr-2" aria-hidden="true">&#9670;</span>
        {showAll ? "All Projects" : (
          <>Currently building<AnimatedDots /></>
        )}
      </h2>
      {showAll ? (
        // Grouped cards on /projects page
        <div className="space-y-10 pl-6 sm:pl-7">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Currently building<AnimatedDots /></p>
            {currentProjects.map((project) => (
              <ProjectCard key={project.name} project={project} />
            ))}
          </div>
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Past</p>
            {pastProjects.map((project) => (
              <ProjectCard key={project.name} project={project} />
            ))}
          </div>
        </div>
      ) : (
        // Simple list on landing page
        <div className="space-y-4 pl-6 sm:pl-7">
          {currentProjects.map((project) => (
            <div key={project.name} className="text-muted-foreground">
              <span className="mr-2" aria-hidden="true">&#8627;</span>
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
      )}
    </section>
  );
}
