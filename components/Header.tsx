"use client";

import { usePathname } from "next/navigation";
import RotatingText from "./RotatingText";
import UnderlineLink from "./UnderlineLink";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  const pathname = usePathname();
  const isProjectsPage = pathname === "/projects";

  return (
    <header className="fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-medium tracking-tight">
            <span className="text-muted-foreground mr-2">&#9670;</span>
            Anh Tran, 20
          </h1>
        </div>
        <div className="flex items-center gap-6">
          <nav className="flex items-center gap-4 text-sm">
            {isProjectsPage && <UnderlineLink href="/">Home</UnderlineLink>}
            <UnderlineLink href="/projects">Projects</UnderlineLink>
            <UnderlineLink
              href="/resume/Resume_Anh_Tran.pdf"
              external
            >
              Resume
            </UnderlineLink>
          </nav>
          <ThemeToggle />
        </div>
      </div>
      <p className="text-muted-foreground pl-6 sm:pl-7">
        <span className="mr-2">&#8627;</span>
        <RotatingText
          texts={["Full-stack Developer", "Powerlifting Enthusiast"]}
          interval={3000}
        />
      </p>
    </header>
  );
}
