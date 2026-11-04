"use client";

import { forwardRef, memo } from "react";
import Link from "next/link";
import type { OutputLine } from "./commands";

const URL_RE = /(https?:\/\/[^\s]+)/g;
const OWN_SITE = /^https?:\/\/(www\.)?anhdtrn\.com(?=\/|$)/;

const LINK_CLASS =
  "underline decoration-dotted underline-offset-2 transition-colors hover:text-signal hover:decoration-solid";

/**
 * A link inside terminal output. Pages on this site open in place, like any
 * other navigation; everything else (live demos, repos, profiles) opens in a
 * new tab so the terminal session survives the click.
 */
function TermLink({ href, children }: { href: string; children: React.ReactNode }) {
  if (OWN_SITE.test(href)) {
    return (
      <Link href={href.replace(OWN_SITE, "") || "/"} className={LINK_CLASS}>
        {children}
      </Link>
    );
  }
  const external = !href.startsWith("mailto:");
  return (
    <a
      href={href}
      className={LINK_CLASS}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  );
}

/** Text with every URL in it turned into a link. */
function Linkified({ text }: { text: string }) {
  // split() with a capturing group puts each match at an odd index.
  return text.split(URL_RE).map((part, i) =>
    i % 2 === 1 ? (
      <TermLink key={i} href={part}>
        {part}
      </TermLink>
    ) : (
      part
    ),
  );
}

interface TerminalOutputProps {
  history: OutputLine[];
}

const TerminalOutput = memo(
  forwardRef<HTMLDivElement, TerminalOutputProps>(({ history }, ref) => {
    return (
      <div
        ref={ref}
        className="flex-1 overflow-y-auto px-4 sm:px-5 pt-4 pb-2 scroll-smooth"
      >
        {history.map((line, i) => (
          <div
            key={i}
            className="text-gray-900 dark:text-white leading-6 transition-colors duration-300"
          >
            {line.type === "command" ? (
              <span>
                <span className="hidden sm:inline">visitor@anhdtran:~$ </span>
                <span className="sm:hidden">~$ </span>
                <span>{line.text}</span>
              </span>
            ) : line.columns ? (
              <div className="flex font-mono text-xs sm:text-sm">
                <span className="shrink-0 w-20 sm:w-28 inline-block">
                  {line.columns[0]}
                </span>
                <span className="min-w-0 wrap-break-word">
                  {line.href ? (
                    <TermLink href={line.href}>{line.columns[1]}</TermLink>
                  ) : (
                    line.columns[1]
                  )}
                </span>
              </div>
            ) : (
              <pre className="whitespace-pre-wrap font-mono text-xs sm:text-sm">
                <Linkified text={line.text} />
              </pre>
            )}
          </div>
        ))}
      </div>
    );
  }),
);

TerminalOutput.displayName = "TerminalOutput";

export default TerminalOutput;
