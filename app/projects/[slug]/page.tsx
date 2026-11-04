import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import PageShell from "@/components/PageShell";
import Footer from "@/components/Footer";
import UnderlineLink from "@/components/UnderlineLink";
import { caseStudies, getCaseStudy } from "@/lib/data/caseStudies";

export const dynamicParams = false;

export function generateStaticParams() {
  return caseStudies.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const study = getCaseStudy((await params).slug);
  if (!study) return {};
  return {
    title: `${study.title} · Case study · Anh Tran`,
    description: study.summary,
    alternates: { canonical: `/projects/${study.slug}` },
  };
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-medium mb-4">
      <span className="text-muted-foreground mr-2" aria-hidden="true">
        &#9670;
      </span>
      {children}
    </h2>
  );
}

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const study = getCaseStudy((await params).slug);
  if (!study) notFound();

  return (
    <div className="min-h-screen">
      <PageShell>
        <Header />

        <article className="space-y-14 text-muted-foreground">
          <header className="fade-in-up fade-in-up-delay-1 pl-6 sm:pl-7">
            <p className="font-mono text-xs uppercase tracking-[0.1em] text-readout">
              Case study
            </p>
            <h1 className="mt-2 text-2xl sm:text-3xl font-medium tracking-tight text-foreground">
              {study.title}
            </h1>
            <p className="mt-3 max-w-prose">{study.summary}</p>
            <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm">
              <UnderlineLink href={study.repo} external className="text-foreground">
                Source
              </UnderlineLink>
              {study.live && (
                <UnderlineLink href={study.live} external className="text-foreground">
                  Live
                </UnderlineLink>
              )}
              <UnderlineLink href="/projects">All projects</UnderlineLink>
            </p>
          </header>

          {/* Results first: the reader came for them. */}
          <section className="fade-in-up fade-in-up-delay-2" aria-labelledby="results">
            <Heading>
              <span id="results">Results</span>
            </Heading>
            <dl className="grid gap-4 pl-6 sm:pl-7 sm:grid-cols-2 sm:auto-rows-fr">
              {study.results.map((r) => (
                <div key={r.label} className="rounded-xl border border-border p-4">
                  <dt className="font-mono text-xs uppercase leading-snug tracking-[0.1em] text-readout">
                    {r.label}
                  </dt>
                  <dd className="mt-1">
                    <span className="block font-mono text-2xl tabular-nums leading-tight text-signal">
                      {r.value}
                    </span>
                    <span className="mt-2 block text-sm">{r.context}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-label="Problem">
            <Heading>Problem</Heading>
            <div className="space-y-4 pl-6 sm:pl-7 max-w-prose">
              {study.problem.map((p) => (
                <p key={p.slice(0, 32)}>{p}</p>
              ))}
            </div>
          </section>

          <section aria-label="What I built">
            <Heading>What I built</Heading>
            <div className="pl-6 sm:pl-7 space-y-6">
              {/* The path through the system, one box per step. */}
              <ol className="grid gap-2 sm:grid-cols-2 sm:auto-rows-fr lg:grid-cols-3">
                {study.flow.map((step, i) => (
                  <li
                    key={step.label}
                    className="rounded-lg border border-border px-3 py-2"
                  >
                    <span className="font-mono text-xs tabular-nums text-readout">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="ml-2 text-foreground">{step.label}</span>
                    <span className="mt-0.5 block font-mono text-xs leading-snug text-readout">
                      {step.detail}
                    </span>
                  </li>
                ))}
              </ol>
              <div className="space-y-4 max-w-prose">
                {study.built.map((p) => (
                  <p key={p.slice(0, 32)}>{p}</p>
                ))}
              </div>
              <div className="max-w-prose">
                <h3 className="font-mono text-xs uppercase tracking-[0.1em] text-readout mb-2">
                  Considered and set aside
                </h3>
                <ul className="space-y-1.5">
                  {study.rejected.map((r) => (
                    <li key={r.option}>
                      <span className="mr-2" aria-hidden="true">
                        &#8627;
                      </span>
                      <span className="text-foreground">{r.option}</span>
                      <span className="mx-2">—</span>
                      {r.reason}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section aria-label="How to read the results">
            <Heading>Reading the numbers</Heading>
            <div className="space-y-4 pl-6 sm:pl-7 max-w-prose">
              {study.resultNotes.map((p) => (
                <p key={p.slice(0, 32)}>{p}</p>
              ))}
            </div>
          </section>

          <section aria-label="Lessons">
            <Heading>Lessons</Heading>
            <ul className="space-y-3 pl-6 sm:pl-7 max-w-prose">
              {study.lessons.map((l) => (
                <li key={l.slice(0, 32)}>
                  <span className="mr-2" aria-hidden="true">
                    &#8627;
                  </span>
                  {l}
                </li>
              ))}
            </ul>
            <p className="mt-6 pl-6 sm:pl-7 max-w-prose">
              <span className="font-mono text-xs uppercase tracking-[0.1em] text-readout mr-2">
                Next
              </span>
              {study.next}
            </p>
          </section>
        </article>

        <Footer />
      </PageShell>
    </div>
  );
}
