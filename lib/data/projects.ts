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
    name: "RG2026-Predict",
    description:
      "ML pipeline predicting Roland Garros 2026 winner with 65.2% match accuracy and 0.714 AUC by training XGBoost on 37 temporal features from 75K+ ATP matches and simulating 10K Monte Carlo bracket draws.",
    link: "https://github.com/trnahnh/rg2026-predict",
    techStack: [
      "Python",
      "XGBoost",
      "Optuna",
      "pandas",
      "scikit-learn",
      "Plotly",
      "Monte Carlo",
    ],
    status: "current",
  },
  {
    name: "Draft-Thinker",
    description:
      "Cost-aware LLM gateway that cuts inference costs by 91.6% through entropy-based draft-and-verify routing with speculative execution and semantic caching.",
    link: "https://draft-thinker.vercel.app/",
    techStack: [
      "Go",
      "Shannon Entropy",
      "OpenAI API",
      "Qdrant",
      "Redis",
      "Prometheus",
      "Grafana",
      "Docker",
    ],
    status: "current",
  },
  {
    name: "Ferrox",
    description:
      "LMAX-inspired high-frequency order matching engine benchmarked at sub-microsecond latency and 4.7M simulated orders/sec.",
    link: "https://ferrox-engine.vercel.app/",
    techStack: [
      "Rust",
      "Lock-Free SPSC Ring Buffer",
      "UDP Multicast",
      "Memory-Mapped I/O",
      "Arena Allocator",
      "HdrHistogram",
      "Criterion",
    ],
    status: "current",
  },
  {
    name: "Inyeon",
    nameAlt: "(인연)",
    description:
      "Agentic AI Git companion that orchestrates the full workflow automation in one command.",
    link: "https://inyeon.cloud/",
    techStack: [
      "FastAPI",
      "Pydantic",
      "LangChain",
      "LangGraph",
      "Ollama",
      "ChromaDB",
      "Gemini",
      "OpenAI",
      "scikit-learn",
      "NumPy",
      "Docker",
    ],
    status: "current",
  },
  {
    name: "AnyuDock",
    nameAlt: "(暗语-Dock)",
    description:
      "Pronounced ànyǔ (ahn-yoo). Simple S3 file storage for sharing files and env configs between machines.",
    link: "https://anyudock.cloud/",
    techStack: [
      "AWS S3",
      "Bun",
      "Hono",
      "TypeScript",
      "Nginx",
      "Drizzle",
      "PostgreSQL",
      "GitHub Actions CI/CD",
    ],
    status: "current",
  },
  {
    name: "FixBuddy",
    description:
      "AI-powered web application that helps users diagnose and fix broken household items.",
    link: "https://github.com/jamesvo2103/Fix-Buddy",
    techStack: [
      "LangChain",
      "Youtube Data API",
      "Gemini API",
      "MongoDB",
      "Express.js",
      "React",
      "Tailwind CSS",
      "Node.js",
    ],
    status: "past",
  },
  {
    name: "ResumeHippocrates",
    description:
      "AI-powered full-stack resume builder optimizing content for ATS (Applicant Tracking System) with OpenAI integration.",
    link: "https://github.com/trnahnh/Resume-Hippocrates",
    techStack: [
      "Gemini API",
      "OpenAI",
      "ImageKit",
      "MongoDB",
      "Express.js",
      "React",
      "Node.js",
    ],
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
