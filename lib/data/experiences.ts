export interface Experience {
  title: string;
  company: string;
  companyUrl?: string;
  description?: string;
  status: "current" | "past";
}

export const experiences: Experience[] = [
  {
    title: "Founding Engineer",
    company: "KatanaID",
    companyUrl: "https://www.katanaid.com",
    description: "AI-integrated Branding Toolkit",
    status: "current",
  },
  {
    title: "Full-stack Software Engineer Fellow",
    company: "Caphne",
    companyUrl: "https://caphne.co",
    description: "Tinder for Study Buddies",
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
    status: "past",
  },
  {
    title: "Lead Robot Designer",
    company: "UC College of Engineering & Applied Science",
    status: "past",
  },
];

export const currentExperiences = experiences.filter(
  (e) => e.status === "current",
);
export const pastExperiences = experiences.filter((e) => e.status === "past");
