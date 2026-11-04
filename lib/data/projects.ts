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
      "Internal developer platform with a cost-aware Kubernetes scheduler that keeps every latency-class workload off spot capacity, validated across 57,012 replayed placements on a 12,477-machine cluster trace, plus 11s p50 self-service provisioning, sequential-test canary rollbacks, chaos experiments, and a tamper-evident audit log.",
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
      "Developer-activity tracker that turns coding into a sport - sessions, pace, streaks, and leaderboards, plus a shareable per-session keyboard heatmap.",
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
      "End-to-end encrypted journaling app - thoughts are encrypted on-device before sync with daily writing prompts to beat the blank page.",
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
      measured: "2026-03",
    },
    description:
      "Cost-aware LLM gateway that cuts inference costs by 82.9% while holding 98.1% accuracy through entropy-based draft-and-verify routing and semantic caching.",
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
      "LMAX-inspired high-frequency order matching engine sustaining 4.7M simulated orders/sec, with its lock-free ring buffer ported to C++20 to measure the cost of memory orderings and bounds checks.",
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
    readout: "blocks",
    nameAlt: "(인연)",
    description:
      "Agentic AI Git companion that orchestrates the full workflow automation in one command.",
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
    status: "past",
  },
  {
    name: "FixBuddy",
    slug: "fixbuddy",
    area: "Full-stack",
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
    slug: "resumehippocrates",
    area: "Full-stack",
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
    slug: "dietapollo",
    area: "Full-stack",
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

/**
 * The three numbers under the name: infra depth, systems speed, real users.
 * Each one is a project's own measured metric, so the strip can never say
 * something the card below it does not.
 */
export const highlights = ["kiln", "ferrox", "commma"].map((slug) => {
  const project = projects.find((p) => p.slug === slug);
  if (!project?.metric) throw new Error(`highlight ${slug} has no metric`);
  return { slug, name: project.name, metric: project.metric };
});
