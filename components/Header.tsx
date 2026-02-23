"use client";

import { usePathname } from "next/navigation";
import RotatingText from "./RotatingText";
import UnderlineLink from "./UnderlineLink";
import ThemeToggle from "./ThemeToggle";

const DOB = new Date(2006, 4, 11); // May 11, 2006 since JS/TS is based-0

function getAge(): number {
  const today = new Date();
  let age = today.getFullYear() - DOB.getFullYear();
  const m = today.getMonth() - DOB.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < DOB.getDate())) age--;
  return age;
}

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-medium tracking-tight">
            <span className="text-muted-foreground mr-2" aria-hidden="true">
              &#9670;
            </span>
            Anh Tran, {getAge()}
          </h1>
        </div>
        <div className="flex items-center gap-6">
          <nav className="flex items-center gap-4 text-sm">
            {pathname !== "/" && <UnderlineLink href="/">Home</UnderlineLink>}
            {pathname !== "/projects" && (
              <UnderlineLink href="/projects">Projects</UnderlineLink>
            )}
            {pathname !== "/profile" && (
              <UnderlineLink href="/profile">Profile</UnderlineLink>
            )}
            <UnderlineLink href="/resume/Resume_Anh_Tran.pdf" external>
              Resume
            </UnderlineLink>
          </nav>
          <ThemeToggle />
        </div>
      </div>
      <p className="text-muted-foreground pl-6 sm:pl-7">
        <span className="mr-2" aria-hidden="true">
          &#8627;
        </span>
        <RotatingText
          texts={[
            "Full-stack Developer",
            "Powerlifting Enthusiast",
            "The Most 'Finance-Bro' Tech Bro",
            "Anatomy Connoisseur",
          ]}
          interval={3000}
        />
      </p>
    </header>
  );
}
