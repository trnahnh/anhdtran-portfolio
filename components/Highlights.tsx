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
      {/* Two by two at every width, so the strip keeps its proportions on a
          phone. The labels are short on purpose: the full measurement sits
          beside the card each number points to. */}
      <ul className="grid auto-rows-fr grid-cols-2 gap-2 sm:gap-4">
        {highlights.map(({ key, value, label, name, target }) => (
          <li key={key}>
            <a
              href={`#${target}`}
              onClick={(e) => jump(e, target)}
              className="group flex h-full flex-col rounded-xl border border-border p-3 transition-colors duration-300 hover:bg-black/3 dark:hover:bg-white/3 sm:p-4"
            >
              <span className="font-mono text-xl tabular-nums leading-none text-signal sm:text-2xl">
                {value}
              </span>
              <span className="mt-2 font-mono text-xs uppercase leading-snug tracking-[0.1em] text-readout">
                {label}
              </span>
              <span className="mt-auto pt-2 text-xs text-muted-foreground transition-colors group-hover:text-foreground sm:text-sm">
                {name} &#8595;
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
