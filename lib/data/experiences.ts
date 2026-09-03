export interface Experience {
  title: string;
  company: string;
  companyUrl?: string;
  description?: string;
  status: "current" | "past" | "future";
}

export const experiences: Experience[] = [
  {
    title: "AI Researcher",
    company: "University of Cincinnati Department of Computer Science",
    status: "future",
  },
  {
    title: "Founder, CTO",
    company: "Commma",
    companyUrl: "https://commma.dev",
    description: "Pace your Code",
    status: "current",
  },
  {
    title: "Lead Software Engineer",
    company: "Caphne",
    companyUrl: "https://caphne.co",
    description: "Study Buddies Matchmaking",
    status: "current",
  },
  {
    title: "Founding Engineer",
    company: "KatanaID",
    companyUrl: "https://katanaid.com",
    description: "AI Branding Toolkit",
    status: "current",
  },
  {
    title: "Technical Assistant Intern",
    company: "JSC Bank for Foreign Trade of Vietnam",
    status: "past",
  },
  {
    title: "Supplemental Review Session Leader",
    company: "UC Learning Commons",
    status: "past",
  },
  {
    title: "Fitness Floor Coordinator",
    company: "UC Campus Recreation Center",
    status: "current",
  },
  {
    title: "Lead Robot Designer",
    company: "UC College of Engineering & Applied Science",
    status: "past",
  },
];

export const futureExperiences = experiences.filter(
  (e) => e.status === "future",
);
export const currentExperiences = experiences.filter(
  (e) => e.status === "current",
);
export const pastExperiences = experiences.filter((e) => e.status === "past");
