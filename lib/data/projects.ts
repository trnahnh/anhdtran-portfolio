export interface Project {
  name: string;
  nameAlt?: string;
  description: string;
  link: string;
  techStack?: string[];
}

export const currentProjects: Project[] = [
  {
    name: "Inyeon",
    nameAlt: "(인연)",
    description:
      "AI-powered git companion that analyzes diffs, generates commits, and reviews code with multi-agent intelligence.",
    link: "https://github.com/suka712/inyeon-upstream",
    techStack: ["FastAPI", "Pydantic", "LangChain", "LangGraph", "Ollama", "ChromaDB", "Gemini Embeddings", "Docker"],
  },
  {
    name: "AnyuDock",
    nameAlt: "(暗语-Dock)",
    description:
      "Pronounced ànyǔ (ahn-yoo). Simple S3 file storage for sharing files and env configs between machines.",
    link: "https://github.com/suka712/anyu-dock",
    techStack: ["AWS", "Bun", "Hono", "PostgreSQL"],
  },
];

export const pastProjects: Project[] = [
  {
    name: "FixBuddy",
    description:
      "AI-powered web application that helps users diagnose and fix broken household items.",
    link: "https://github.com/jamesvo2103/Fix-Buddy",
    techStack: ["LangChain", "Youtube Data API", "Gemini API", "MongoDB", "Express.js", "React", "Tailwind CSS", "Node.js"],
  },
  {
    name: "ResumeHippocrates",
    description:
      "AI-powered full-stack resume builder optimizing content for ATS with OpenAI integration.",
    link: "https://github.com/trnahnh/Resume-Hippocrates",
    techStack: ["Gemini API", "ImageKit", "MongoDB", "Express.js", "React", "Node.js"],
  },
  {
    name: "DietApollo",
    description:
      "Pixel-themed web app for managing meal plans, grocery lists, and calorie intake in a retro-styled interface.",
    link: "https://github.com/trnahnh/DietApollo",
    techStack: ["Django", "Django REST", "React", "SQLite", "REST API"],
  },
];

export const allProjects: Project[] = [...currentProjects, ...pastProjects];
