"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import UnderlineLink from "./UnderlineLink";
import type { Project } from "@/lib/data/projects";

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="text-muted-foreground">
      <div className="flex items-start gap-2">
        <span className="mt-0.5">&#8627;</span>
        <div className="flex-1">
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
                aria-label={isExpanded ? "Collapse tech stack" : "Expand tech stack"}
              >
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-300 ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                />
              </button>
            )}
          </div>
          <div className="mt-1">
            <span>— {project.description}</span>
          </div>
          {project.techStack && project.techStack.length > 0 && (
            <div
              className={`grid transition-all duration-300 ease-in-out ${
                isExpanded
                  ? "grid-rows-[1fr] opacity-100 mt-3"
                  : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <div className="flex flex-wrap gap-2">
                  {project.techStack.map((tech) => (
                    <span
                      key={tech}
                      className="px-2.5 py-1 text-xs rounded-full bg-muted text-muted-foreground border border-border"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
