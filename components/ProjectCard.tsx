"use client";

import { useState } from "react";
import { ChevronDown, Cloud } from "lucide-react";
import UnderlineLink from "./UnderlineLink";
import ProjectMetric from "./ProjectMetric";
import ProjectArea, { CaseStudyLink } from "./ProjectArea";
import type { Project } from "@/lib/data/projects";
import { isCloudService, techIcon } from "@/lib/techIcons";

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      id={`project-${project.slug}`}
      data-matrix={project.readout ?? "idle"}
      className="scroll-mt-24 text-muted-foreground rounded-xl p-3 -mx-3 transition-all duration-300 hover:shadow-depth hover-lift hover:bg-black/3 dark:hover:bg-white/3"
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5" aria-hidden="true">
          &#8627;
        </span>
        <div className="flex-1">
          <ProjectArea project={project} className="-mb-1" />
          <div className="flex items-center gap-2">
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
            {project.techStack && project.techStack.length > 0 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 rounded-md hover:bg-muted transition-colors interactive"
                aria-label={
                  isExpanded ? "Collapse tech stack" : "Expand tech stack"
                }
                aria-expanded={isExpanded}
              >
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-300 ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                />
              </button>
            )}
          </div>
          <p className="mt-1">— {project.description}</p>
          {project.metric && <ProjectMetric metric={project.metric} />}
          <CaseStudyLink project={project} />
          {project.techStack && project.techStack.length > 0 && (
            <div
              className={`grid transition-all duration-300 ease-in-out ${
                isExpanded
                  ? "grid-rows-[1fr] opacity-100 mt-3"
                  : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden pb-px">
                <div className="flex flex-wrap gap-2">
                  {project.techStack.map((tech) => {
                    const icon = techIcon(tech);
                    return (
                      <span
                        key={tech}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-muted text-muted-foreground border border-border shadow-sm"
                      >
                        {/* One colour, the chip's own: brand colours would
                            put fifty accents beside the site's one. */}
                        {icon && (
                          <svg
                            viewBox="0 0 24 24"
                            className="h-3 w-3 shrink-0"
                            fill="currentColor"
                            aria-hidden="true"
                            focusable="false"
                          >
                            <path d={icon.path} />
                          </svg>
                        )}
                        {!icon && isCloudService(tech) && (
                          <Cloud
                            className="h-3 w-3 shrink-0"
                            strokeWidth={2.5}
                            aria-hidden="true"
                          />
                        )}
                        {tech}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
