import {
  siApachekafka,
  siArgo,
  siBun,
  siCplusplus,
  siDjango,
  siDocker,
  siDrizzle,
  siExpress,
  siFastapi,
  siGithubactions,
  siGo,
  siGooglegemini,
  siGrafana,
  siHono,
  siIstio,
  siJaeger,
  siJavascript,
  siKubernetes,
  siLangchain,
  siLanggraph,
  siMongodb,
  siNginx,
  siNodedotjs,
  siNumpy,
  siOllama,
  siOpentelemetry,
  siOptuna,
  siPandas,
  siPlotly,
  siPm2,
  siPostgresql,
  siPrometheus,
  siPydantic,
  siPython,
  siQdrant,
  siReact,
  siRedis,
  siResend,
  siRust,
  siScikitlearn,
  siSpring,
  siSqlite,
  siStripe,
  siTailwindcss,
  siTerraform,
  siTypescript,
  siYoutube,
  siZod,
  type SimpleIcon,
} from "simple-icons";

/**
 * Logo for each tech-stack name, from Simple Icons (CC0). Named imports, so
 * only these ship. Keyed by the exact strings in lib/data/projects.ts.
 *
 * A name with no entry renders as text alone. That is deliberate for:
 *   - AWS and OpenAI, whose owners asked Simple Icons to remove their marks;
 *   - ChromaDB, Crossplane, ImageKit, Kyverno, XGBoost, not in the set;
 *   - techniques rather than products (Monte Carlo, Arena Allocator, ...);
 *   - libraries that only sit near a brand. Chi is a Go router and Criterion
 *     a Rust bench harness: borrowing the language's logo would claim the
 *     wrong thing.
 */
const TECH_ICONS: Record<string, SimpleIcon> = {
  // Languages and runtimes
  Go: siGo,
  Rust: siRust,
  "C++20": siCplusplus,
  Python: siPython,
  TypeScript: siTypescript,
  "vanilla JS": siJavascript,
  "Node.js": siNodedotjs,
  Bun: siBun,
  "Java (Spring Boot)": siSpring,

  // Web frameworks and libraries
  React: siReact,
  "React Ecosystem": siReact,
  "Tailwind CSS": siTailwindcss,
  Hono: siHono,
  "Express.js": siExpress,
  FastAPI: siFastapi,
  Django: siDjango,
  "Django REST": siDjango,
  Pydantic: siPydantic,
  Zod: siZod,
  Drizzle: siDrizzle,

  // Data stores
  PostgreSQL: siPostgresql,
  Redis: siRedis,
  MongoDB: siMongodb,
  SQLite: siSqlite,
  Qdrant: siQdrant,
  Kafka: siApachekafka,

  // Infrastructure and delivery
  Kubernetes: siKubernetes,
  "kubebuilder/controller-runtime": siKubernetes,
  ArgoCD: siArgo,
  Istio: siIstio,
  Docker: siDocker,
  Terraform: siTerraform,
  Nginx: siNginx,
  "PM2/nginx": siPm2,
  "GitHub Actions CI/CD": siGithubactions,

  // Observability
  Prometheus: siPrometheus,
  Grafana: siGrafana,
  "Grafana Loki": siGrafana,
  OpenTelemetry: siOpentelemetry,
  Jaeger: siJaeger,

  // ML and AI
  "scikit-learn": siScikitlearn,
  NumPy: siNumpy,
  pandas: siPandas,
  Optuna: siOptuna,
  Plotly: siPlotly,
  LangChain: siLangchain,
  LangGraph: siLanggraph,
  Ollama: siOllama,
  Gemini: siGooglegemini,
  "Gemini API": siGooglegemini,

  // Services
  Stripe: siStripe,
  Resend: siResend,
  "Youtube Data API": siYoutube,
};

export function techIcon(name: string): SimpleIcon | undefined {
  return TECH_ICONS[name];
}
