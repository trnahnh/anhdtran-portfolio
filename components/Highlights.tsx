"use client";

import { highlights } from "@/lib/data/projects";

// Lenis (SmoothScroll's `anchors` option) does the glide but leaves the
// click's default alone, so the browser would also write #project-… into the
// address bar. Cancel that; without Lenis (reduced motion), scroll here.
function jump(e: React.MouseEvent<HTMLAnchorElement>, slug: string) {
  e.preventDefault();
  if (document.documentElement.classList.contains("lenis")) return;
  document.getElementById(`project-${slug}`)?.scrollIntoView({ block: "start" });
}

/**
 * Three measured numbers directly under the name, before any section.
 *
 * A host in team matching gives the page about a minute. These are the
 * strongest evidence on the site, so they go where the eye lands first
 * instead of in a gutter three sections down. Each one jumps to the project
 * it was measured on, and each is that project's own metric, so the strip
 * and the card can never disagree.
 */
export default function Highlights() {
  return (
    <section
      aria-label="Highlights"
      className="fade-in-up fade-in-up-delay-1 -mt-6 pl-6 sm:pl-7"
    >
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-4">
        {highlights.map(({ slug, name, metric }) => (
          <li key={slug}>
            <a
              href={`#project-${slug}`}
              onClick={(e) => jump(e, slug)}
              className="group flex items-baseline gap-4 rounded-xl border border-border px-3 py-2.5 transition-colors duration-300 hover:bg-black/3 dark:hover:bg-white/3 sm:block sm:p-3"
            >
              {/* Phones: number beside its label, so three fit in one glance.
                  From sm: number above, three across. */}
              <span className="w-20 shrink-0 font-mono text-xl tabular-nums leading-none text-signal sm:block sm:w-auto sm:text-2xl">
                {metric.value}
              </span>
              <span className="min-w-0">
                <span className="block font-mono text-[10px] uppercase leading-snug tracking-[0.14em] text-readout sm:mt-2">
                  {metric.label}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground transition-colors group-hover:text-foreground sm:mt-1.5">
                  {name} &#8595;
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
