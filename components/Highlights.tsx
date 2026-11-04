"use client";

import { highlights } from "@/lib/data/highlights";

// Lenis (SmoothScroll's `anchors` option) does the glide but leaves the
// click's default alone, so the browser would also write #project-… into the
// address bar. Cancel that; without Lenis (reduced motion), scroll here.
function jump(e: React.MouseEvent<HTMLAnchorElement>, target: string) {
  e.preventDefault();
  if (document.documentElement.classList.contains("lenis")) return;
  document.getElementById(target)?.scrollIntoView({ block: "start" });
}

/**
 * Four headline numbers directly under the name, before any section.
 *
 * A host in team matching gives the page about a minute. These are the
 * strongest evidence on the site, so they go where the eye lands first
 * instead of in a gutter three sections down. Each one jumps to the project
 * or role it belongs to and is read from that entry's own data (see
 * lib/data/highlights.ts), so the strip and the row can never disagree.
 */
export default function Highlights() {
  return (
    <section
      aria-label="Highlights"
      className="fade-in-up fade-in-up-delay-1 -mt-6 pl-6 sm:pl-7"
    >
      <ul className="grid auto-rows-fr grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-4">
        {highlights.map(({ key, value, label, name, target }) => (
          <li key={key}>
            <a
              href={`#${target}`}
              onClick={(e) => jump(e, target)}
              className="group flex items-baseline gap-4 rounded-xl border border-border px-3 py-2.5 transition-colors duration-300 hover:bg-black/3 dark:hover:bg-white/3 h-full sm:flex-col sm:items-stretch sm:gap-0 sm:p-3"
            >
              {/* Phones: number beside its label, so all four fit in one
                  glance. From sm: number above, two by two. */}
              <span className="w-20 shrink-0 font-mono text-xl tabular-nums leading-none text-signal sm:block sm:w-auto sm:text-2xl">
                {value}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="block font-mono text-[10px] uppercase leading-snug tracking-[0.14em] text-readout sm:mt-2">
                  {label}
                </span>
                <span className="mt-auto block pt-1 text-xs text-muted-foreground transition-colors group-hover:text-foreground sm:pt-2">
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
