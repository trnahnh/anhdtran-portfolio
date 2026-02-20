"use client";

import { useState, useEffect } from "react";
import UnderlineLink from "./UnderlineLink";
import ProjectCard from "./ProjectCard";
import { currentProjects, pastProjects, type Project } from "@/lib/data/projects";

interface ProjectsSectionProps {
  showAll?: boolean;
}

export default function ProjectsSection({ showAll = false }: ProjectsSectionProps) {
  const [dots, setDots] = useState(".");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "." : prev + "."));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="fade-in-up fade-in-up-delay-2">
      <h2 className="text-lg font-medium mb-4">
        <span className="text-muted-foreground mr-2" aria-hidden="true">&#9670;</span>
        {showAll ? "All Projects" : (
          <>Currently building<span aria-hidden="true">{dots}</span></>
        )}
      </h2>
      {showAll ? (
        // Grouped cards on /projects page
        <div className="space-y-10 pl-6 sm:pl-7">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Currently building<span aria-hidden="true">{dots}</span></p>
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
