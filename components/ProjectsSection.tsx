import UnderlineLink from "./UnderlineLink";
import ProjectCard from "./ProjectCard";
import ProjectMetric from "./ProjectMetric";
import ProjectArea, { CaseStudyLink } from "./ProjectArea";
import ScrollReveal from "./ScrollReveal";
import { currentProjects, pastProjects } from "@/lib/data/projects";

function AnimatedDots() {
  return (
    <span className="inline-flex w-[1.2em]" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="animate-pulse"
          style={{ animationDelay: `${i * 400}ms` }}
        >
          .
        </span>
      ))}
    </span>
  );
}

interface ProjectsSectionProps {
  showAll?: boolean;
}

export default function ProjectsSection({
  showAll = false,
}: ProjectsSectionProps) {
  return (
    <section data-load="Projects">
      <h2 className="fade-in-up fade-in-up-delay-1 text-lg font-medium mb-4">
        <span className="text-muted-foreground mr-2" aria-hidden="true">
          &#9670;
        </span>
        {showAll ? (
          "All Projects"
        ) : (
          <>
            Currently building
            <AnimatedDots />
          </>
        )}
      </h2>
      {showAll ? (
        // Grouped cards on /projects. Two up from lg: this page is the one
        // that suffers most from a tall thin list on a wide screen.
        <div className="space-y-10 pl-6 sm:pl-7">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Currently building
              <AnimatedDots />
            </p>
            <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-7 lg:gap-y-4 space-y-4 lg:space-y-0">
              {currentProjects.map((project, i) => (
                <ScrollReveal key={project.name} delay={i * 100}>
                  <ProjectCard project={project} />
                </ScrollReveal>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Past
            </p>
            <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-7 lg:gap-y-4 space-y-4 lg:space-y-0">
              {pastProjects.map((project, i) => (
                <ScrollReveal key={project.name} delay={i * 100}>
                  <ProjectCard project={project} />
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      ) : (
        // Landing list. From lg the measured headline moves out of the prose
        // and into the gutter beside it.
        <div className="space-y-4 pl-6 sm:pl-7">
          {currentProjects.map((project, i) => (
            <ScrollReveal key={project.name} delay={i * 100}>
              <div
                id={`project-${project.slug}`}
                data-matrix={project.readout ?? "idle"}
                className="scroll-mt-24 text-muted-foreground rounded-xl p-3 -mx-3 transition-all duration-300 hover:shadow-depth hover-lift hover:bg-black/3 dark:hover:bg-white/3 lg:grid lg:grid-cols-[minmax(0,1fr)_14rem] lg:items-baseline lg:gap-x-8"
              >
                <div>
                  <ProjectArea project={project} className="pl-6" />
                  <span className="mr-2" aria-hidden="true">
                    &#8627;
                  </span>
                  <UnderlineLink
                    href={project.link}
                    external
                    className="text-foreground font-medium"
                  >
                    {project.name}
                    {project.nameAlt && (
                      <span className="ml-1 font-normal">{project.nameAlt}</span>
                    )}
                  </UnderlineLink>
                  <span className="mx-2">—</span>
                  <span>{project.description}</span>
                  {/* Desktop: under the description, the number in the
                      gutter beside it. Phone: after the number, so the
                      description and its number stay together. */}
                  <CaseStudyLink project={project} className="hidden pl-6 lg:block" />
                </div>
                {project.metric && <ProjectMetric metric={project.metric} />}
                <CaseStudyLink project={project} className="lg:hidden" />
              </div>
            </ScrollReveal>
          ))}
        </div>
      )}
    </section>
  );
}
