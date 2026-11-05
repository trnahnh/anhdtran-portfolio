export interface Experience {
  title: string;
  company: string;
  companyUrl?: string;
  description?: string;
  /** One line of measured impact, drawn from the resume. */
  impact?: string;
  /** Shown on the landing page; the rest wait behind "Show all". */
  featured?: boolean;
  /** Anchor id on the landing list, for a highlight that points here. */
  slug?: string;
  /** A headline number for the strip under the name (its label lives in lib/data/highlights.ts). */
  highlight?: { value: string };
  status: "current" | "past" | "future";
}

export const experiences: Experience[] = [
  {
    title: "AI Researcher",
    company: "University of Cincinnati Department of Computer Science",
    impact:
      "Cut voice-resynthesis time 15x (5.5s to 0.36s) after profiling pitch tracking to 89% of runtime.",
    featured: true,
    status: "current",
  },
  {
    title: "Founder & Lead Engineer",
    company: "Commma",
    companyUrl: "https://commma.dev",
    description: "Pace your Code",
    impact:
      "700+ downloads; coding-time totals made exact under concurrency and crashes with an advisory lock and a transactional outbox.",
    featured: true,
    status: "current",
  },
  {
    title: "Lead Software Engineer",
    company: "Caphne",
    companyUrl: "https://caphne.co",
    description: "Study Buddies Matchmaking",
    impact:
      "Led 6 engineers to 400+ active users; real-time chat cut API response time from 60s to 10s at 1.7K+ requests/min.",
    featured: true,
    slug: "caphne",
    highlight: { value: "400+" },
    status: "past",
  },
  {
    title: "Founding Engineer",
    company: "KatanaID",
    companyUrl: "https://katanaid.com",
    description: "AI Branding Toolkit",
    impact:
      "Led 5 engineers; Go backend fans out 19+ external API calls per brand report with goroutines, serving 2,300+ requests/day.",
    featured: true,
    status: "past",
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
    description: "CPR/AED & First Aid certified",
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
