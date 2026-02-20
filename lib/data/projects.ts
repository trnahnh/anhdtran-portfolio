export interface Project {
  name: string;
  nameAlt?: string;
  description: string;
  link: string;
  techStack?: string[];
  status: "current" | "past";
}

export const projects: Project[] = [
  {
    name: "Inyeon",
    nameAlt: "(인연)",
    description:
      "Agentic AI Git companion that orchestrates the full workflow in one command.",
    link: "https://inyeon-upstream.vercel.app",
    techStack: ["FastAPI", "Pydantic", "LangChain", "LangGraph", "Ollama", "ChromaDB", "Gemini Embeddings", "scikit-learn", "NumPy", "Docker"],
    status: "current",
  },
  {
    name: "AnyuDock",
    nameAlt: "(暗语-Dock)",
    description:
      "Pronounced ànyǔ (ahn-yoo). Simple S3 file storage for sharing files and env configs between machines.",
    link: "https://github.com/suka712/renga-anyu-s3",
    techStack: ["AWS S3", "Bun", "Hono", "TypeScript", "PostgreSQL", "GitHub Actions CI/CD"],
    status: "current",
  },
  {
    name: "FixBuddy",
    description:
      "AI-powered web application that helps users diagnose and fix broken household items.",
    link: "https://github.com/jamesvo2103/Fix-Buddy",
    techStack: ["LangChain", "Youtube Data API", "Gemini API", "MongoDB", "Express.js", "React", "Tailwind CSS", "Node.js"],
    status: "past",
  },
  {
    name: "ResumeHippocrates",
    description:
      "AI-powered full-stack resume builder optimizing content for ATS (Applicant Tracking System) with OpenAI integration.",
    link: "https://github.com/trnahnh/Resume-Hippocrates",
    techStack: ["Gemini API", "OpenAI", "ImageKit", "MongoDB", "Express.js", "React", "Node.js"],
    status: "past",
  },
  {
    name: "DietApollo",
    description:
      "Pixel-themed web application for managing meal plans, grocery lists, and calorie intake in a retro-styled interface.",
    link: "https://github.com/trnahnh/DietApollo",
    techStack: ["Django", "Django REST", "vanilla JS", "SQLite", "REST API"],
    status: "past",
  },
];

export const currentProjects = projects.filter((p) => p.status === "current");
export const pastProjects = projects.filter((p) => p.status === "past");
export const allProjects = projects;
