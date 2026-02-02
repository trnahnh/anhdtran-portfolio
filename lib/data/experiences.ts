export interface Experience {
  title: string;
  company: string;
  companyUrl?: string;
  description?: string;
}

export const currentExperiences: Experience[] = [
  {
    title: "Founding Engineer",
    company: "KatanaID",
    companyUrl: "https://www.katanaid.com",
    description: "AI-integrated Authentication Toolkit",
  },
  {
    title: "Full-stack Software Engineer Fellowship",
    company: "Caphne",
    companyUrl: "https://caphne.co",
    description: "Tinder for Study Buddies",
  },
];

export const pastExperiences: Experience[] = [
  {
    title: "Technical Assistant Intern",
    company: "JSC Bank for Foreign Trade of Vietnam",
  },
  {
    title: "Supplemental Review Session Leader",
    company: "UC Learning Commons",
  },
  {
    title: "Fitness Floor Coordinator",
    company: "UC Campus Recreation Center",
  },
];
