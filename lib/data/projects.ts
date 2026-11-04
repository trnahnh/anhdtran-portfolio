import type { ReadoutKind } from "@/components/matrix/readouts";

/**
 * The one area a project belongs to. A host from a given org should find
 * their area in a second, so the vocabulary is small and fixed.
 */
export type ProjectArea =
  | "Infra"
  | "Systems"
  | "ML Systems"
  | "ML"
  | "AI Tooling"
  | "Security"
  | "Product"
  | "Cloud"
  | "Full-stack";

export interface Project {
  name: string;
  /** Anchor id on the landing list and the case study URL segment. */
  slug: string;
  area: ProjectArea;
  /** True when /projects/[slug] has a case study for this project. */
  caseStudy?: boolean;
  nameAlt?: string;
  description: string;
  link: string;
  techStack?: string[];
  status: "current" | "past";
  /** Which instrument this project drives when it comes into view. */
  readout?: ReadoutKind;
  /** The measured headline. Real, dated, and committed — never authored. */
  metric?: { value: string; label: string; measured: string };
}

export const projects: Project[] = [
  {
    name: "Kiln-IDP",
    slug: "kiln",
    area: "Infra",
    caseStudy: true,
    readout: "timeline",
    metric: {
      value: "57,012",
      label: "replayed placements · 0 latency-class on spot",
      measured: "2026-10",
    },
    description:
      "Internal developer platform whose cost-aware Kubernetes scheduler keeps latency-critical workloads off spot capacity.",
    link: "https://kiln-idp.vercel.app/",
    techStack: [
      "Go",
      "Java (Spring Boot)",
      "Kubernetes",
      "kubebuilder/controller-runtime",
      "Custom Scheduler",
      "Crossplane v2",
      "ArgoCD",
      "Kyverno",
      "Istio",
      "Kafka",
      "PostgreSQL",
      "OpenTelemetry",
      "Jaeger",
    ],
    status: "current",
  },
  {
    name: "Commma",
    slug: "commma",
    area: "Product",
    readout: "heatmap",
    metric: {
      value: "600+",
      label: "downloads · VS Code + Open VSX",
      measured: "2026-10",
    },
    description:
      "Coding-activity tracker that turns programming into a sport: pace, streaks, leaderboards and keyboard heatmaps.",
    link: "https://commma.dev/",
    techStack: [
      "TypeScript",
      "Hono",
      "Node.js",
      "Zod",
      "Drizzle",
      "PostgreSQL",
      "Redis",
      "React Ecosystem",
      "Stripe",
      "Resend",
      "OpenAI",
      "Grafana Loki",
      "AWS EC2",
      "AWS S3",
      "AWS CloudFront",
      "AWS Route 53",
      "AWS CloudWatch",
      "Terraform",
      "PM2/nginx",
      "GitHub Actions CI/CD",
    ],
    status: "current",
  },
  {
    name: "Dasi",
    slug: "dasi",
    area: "Security",
    readout: "cipher",
    description:
      "End-to-end encrypted journal: entries are encrypted on-device before they sync.",
    link: "https://github.com/NauriFive/dasi-encrypted-journal",
    techStack: [
      "Go",
      "Chi",
      "PostgreSQL",
      "Resend",
      "React",
      "TypeScript",
      "AWS Lambda",
    ],
    status: "past",
  },
  {
    name: "RG2026-Predict",
    slug: "rg2026-predict",
    area: "ML",
    readout: "curve",
    metric: {
      value: "0.714",
      label: "AUC · 65.2% match accuracy",
      measured: "2026-05",
    },
    description:
      "XGBoost model on 75K+ ATP matches, simulating 10K Roland Garros 2026 brackets.",
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
    status: "past",
  },
  {
    name: "Draft-Thinker",
    slug: "draft-thinker",
    area: "ML Systems",
    caseStudy: true,
    readout: "decay",
    metric: {
      value: "-82.9%",
      label: "inference cost",
      measured: "2026-08",
    },
    description:
      "Go LLM gateway that drafts on a cheap model, benchmarked to find where the savings really come from.",
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
    slug: "ferrox",
    area: "Systems",
    caseStudy: true,
    readout: "histogram",
    metric: {
      value: "4.7M",
      label: "simulated orders/sec · 82-85% faster worst-case cancels",
      measured: "2026-02",
    },
    description:
      "LMAX-style order matching engine in Rust, its lock-free ring buffer ported to C++20 to measure memory-ordering costs.",
    link: "https://ferrox-engine.vercel.app/",
    techStack: [
      "Rust",
      "C++20",
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
    slug: "inyeon",
    area: "AI Tooling",
    caseStudy: true,
    readout: "blocks",
    nameAlt: "(인연)",
    description:
      "Agentic Git CLI that splits, commits, reviews and opens PRs in one command.",
    link: "https://inyeon-upstream.vercel.app/",
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
    slug: "anyudock",
    area: "Cloud",
    readout: "blocks",
    nameAlt: "(暗语-Dock)",
    description:
      "S3-backed storage for moving files and env configs between machines.",
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
    status: "past",
  },
  {
    name: "FixBuddy",
    slug: "fixbuddy",
    area: "Full-stack",
    description:
      "AI assistant that diagnoses broken household items and finds the repair.",
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
    slug: "resumehippocrates",
    area: "Full-stack",
    description:
      "AI resume builder that tailors content to pass applicant tracking systems.",
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
    slug: "dietapollo",
    area: "Full-stack",
    description:
      "Retro pixel-art app for meal plans, grocery lists and calories.",
    link: "https://github.com/trnahnh/DietApollo",
    techStack: ["Django", "Django REST", "vanilla JS", "SQLite", "REST API"],
    status: "past",
  },
];

export const currentProjects = projects.filter((p) => p.status === "current");
export const pastProjects = projects.filter((p) => p.status === "past");
export const allProjects = projects;
