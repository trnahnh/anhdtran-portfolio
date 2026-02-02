export interface Project {
  name: string;
  nameAlt?: string;
  description: string;
  link: string;
}

export const currentProjects: Project[] = [
  {
    name: "Inyeon",
    nameAlt: "(인연)",
    description:
      "Your AI-powered git companion that analyzes diffs, generates commits, and reviews code with multi-agent intelligence",
    link: "https://github.com/suka712/inyeon-upstream",
  },
  {
    name: "AnyuDock",
    nameAlt: "(暗语-Dock)",
    description:
      "Pronounced ànyǔ (ahn-yoo). Simple S3 file storage for sharing files and env configs between machines",
    link: "https://github.com/suka712/anyu-dock",
  },
];

export const pastProjects: Project[] = [
  {
    name: "FixBuddy",
    description:
      "AI-powered web app that helps users diagnose and fix broken household items",
    link: "https://github.com/jamesvo2103/Fix-Buddy",
  },
  {
    name: "ResumeHippocrates",
    description:
      "Automated resume builder powered by AI and optimized for ATS",
    link: "https://github.com/trnahnh/Resume-Hippocrates",
  },
  {
    name: "DietApollo",
    description:
      "Pixel-themed web app for managing meal plans, grocery lists, and calorie intake in a retro-styled interface",
    link: "https://github.com/trnahnh/DietApollo",
  },
];

export const allProjects: Project[] = [...currentProjects, ...pastProjects];
