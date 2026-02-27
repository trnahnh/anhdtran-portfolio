import { currentExperiences, pastExperiences } from "@/lib/data/experiences";
import UnderlineLink from "./UnderlineLink";
import ScrollReveal from "./ScrollReveal";

export default function ExperienceSection() {
  return (
    <section>
      <div className="space-y-8">
        <div>
          <h2 className="fade-in-up fade-in-up-delay-1 text-lg font-medium mb-4">
            <span className="text-muted-foreground mr-2" aria-hidden="true">
              &#9670;
            </span>
            Current Experience
          </h2>
          <div className="space-y-3 pl-6 sm:pl-7">
            {currentExperiences.map((exp, i) => (
              <ScrollReveal key={`${exp.title}-${exp.company}`} delay={i * 100}>
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
              </ScrollReveal>
            ))}
          </div>
        </div>

        <div>
          <h2 className="fade-in-up fade-in-up-delay-1 text-lg font-medium mb-4">
            <span className="text-muted-foreground mr-2" aria-hidden="true">
              &#9670;
            </span>
            Past Experience
          </h2>
          <div className="space-y-3 pl-6 sm:pl-7">
            {pastExperiences.map((exp, i) => (
              <ScrollReveal key={`${exp.title}-${exp.company}`} delay={i * 100}>
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
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
