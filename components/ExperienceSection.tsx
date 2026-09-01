import {
  futureExperiences,
  currentExperiences,
  pastExperiences,
  type Experience,
} from "@/lib/data/experiences";
import UnderlineLink from "./UnderlineLink";
import ScrollReveal from "./ScrollReveal";

/**
 * Three groups, one component. This was the same forty lines of JSX pasted
 * three times, which meant every change to a row had to be made three times.
 *
 * Deliberately NOT split-justified the way a dated timeline would be. The
 * data has statuses, not dates, and a left column of repeated status labels
 * would be structure that encodes nothing — the group heading already says
 * it. Wide screens get their structure where there is something true to put
 * in it: the measured metrics beside the projects, and the telemetry rail.
 */

const GROUPS: { title: string; items: Experience[] }[] = [
  { title: "Incoming Experience", items: futureExperiences },
  { title: "Current Experience", items: currentExperiences },
  { title: "Past Experience", items: pastExperiences },
];

function Row({ exp }: { exp: Experience }) {
  return (
    <div className="text-muted-foreground rounded-xl p-3 -mx-3 transition-all duration-300 hover:shadow-depth hover-lift hover:bg-black/3 dark:hover:bg-white/3">
      <span className="mr-2" aria-hidden="true">
        &#8627;
      </span>
      <span className="text-foreground">{exp.title}</span>
      <span className="mx-2">꩜</span>
      {exp.companyUrl ? (
        <UnderlineLink href={exp.companyUrl} external>
          {exp.company}
        </UnderlineLink>
      ) : (
        <span>{exp.company}</span>
      )}
      {exp.description && (
        <>
          <span className="mx-2">—</span>
          <span>{exp.description}</span>
        </>
      )}
    </div>
  );
}

export default function ExperienceSection() {
  return (
    <section data-matrix="timeline">
      <div className="space-y-8">
        {GROUPS.map((group) => (
          <div key={group.title}>
            <h2 className="fade-in-up fade-in-up-delay-1 text-lg font-medium mb-4">
              <span className="text-muted-foreground mr-2" aria-hidden="true">
                &#9670;
              </span>
              {group.title}
            </h2>
            <div className="space-y-3 pl-6 sm:pl-7">
              {group.items.map((exp, i) => (
                <ScrollReveal
                  key={`${exp.title}-${exp.company}`}
                  delay={i * 100}
                >
                  <Row exp={exp} />
                </ScrollReveal>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
