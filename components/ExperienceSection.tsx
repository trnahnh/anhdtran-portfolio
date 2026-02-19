import { currentExperiences, pastExperiences } from "@/lib/data/experiences";
import UnderlineLink from "./UnderlineLink";

export default function ExperienceSection() {
  return (
    <section className="fade-in-up fade-in-up-delay-1">
      <div className="space-y-8">
        {/* Current Experience */}
        <div>
          <h2 className="text-lg font-medium mb-4">
            <span className="text-muted-foreground mr-2" aria-hidden="true">&#9670;</span>
            Current Experience
          </h2>
          <div className="space-y-3 pl-6 sm:pl-7">
            {currentExperiences.map((exp) => (
              <div key={`${exp.title}-${exp.company}`} className="text-muted-foreground">
                <span className="mr-2" aria-hidden="true">&#8627;</span>
                <span className="text-foreground">{exp.title}</span>
                <span className="mx-2">@</span>
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
            ))}
          </div>
        </div>

        {/* Past Experience */}
        <div>
          <h2 className="text-lg font-medium mb-4">
            <span className="text-muted-foreground mr-2" aria-hidden="true">&#9670;</span>
            Past Experience
          </h2>
          <div className="space-y-3 pl-6 sm:pl-7">
            {pastExperiences.map((exp) => (
              <div key={`${exp.title}-${exp.company}`} className="text-muted-foreground">
                <span className="mr-2" aria-hidden="true">&#8627;</span>
                <span className="text-foreground">{exp.title}</span>
                <span className="mx-2">@</span>
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
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
