"use client";

import Image from "next/image";
import { useState } from "react";
import { Dumbbell, HeartPulse } from "lucide-react";
import UnderlineLink from "./UnderlineLink";
import NowPlaying from "./NowPlaying";
import SpotifyEmbed from "./SpotifyEmbed";
import QuotesSection from "./QuotesSection";
import ScrollReveal from "./ScrollReveal";
import TiltCard from "./TiltCard";

const photos = [
  {
    src: "/profile/portrait.webp",
    alt: "Anh in a navy quarter-zip, smiling on a city street",
    caption: "The face of the operation.",
  },
  {
    src: "/profile/halloween.webp",
    alt: "Anh in a Halloween costume, arms crossed, outside a party lit in red",
    caption: "Full-stack by day, full-scare by night.",
  },
  {
    src: "/profile/tennis.webp",
    alt: "Anh mid-swing on a tennis court at night",
    caption: "Rallying between deployments.",
  },
  {
    src: "/profile/gym.webp",
    alt: "Anh and a friend taking a mirror selfie at the gym",
    caption: "PRs on the platform and the platform only.",
  },
];

// The lifting the gym photo hints at, made specific.
const clubs = [
  { name: "UC Powerlifting Team", href: "https://www.instagram.com/ucpowerlifting" },
  { name: "UC Bodybuilding Club", href: "https://www.instagram.com/uc_bodybuilding_club" },
];

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-medium">
      <span className="text-muted-foreground mr-2" aria-hidden="true">
        &#9670;
      </span>
      {children}
    </h2>
  );
}

function PhotoCard({
  src,
  alt,
  caption,
  priority,
}: {
  src: string;
  alt: string;
  caption: string;
  priority: boolean;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <TiltCard className="relative group rounded-xl overflow-hidden">
      {!loaded && (
        <div className="absolute inset-0 bg-muted animate-pulse rounded-xl" />
      )}
      <Image
        src={src}
        alt={alt}
        width={4000}
        height={4000}
        loading={priority ? "eager" : "lazy"}
        priority={priority}
        onLoad={() => setLoaded(true)}
        className={`w-full h-auto transition-all duration-500 group-hover:scale-105 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
        // Must track the reading column's real width. When PageShell widened
        // to max-w-4xl at lg and max-w-6xl at xl, each grid cell went from
        // ~306px to ~418px and ~442px while this still claimed 320px — so a
        // 320px file was being stretched 1.31x and 1.38x. Values include
        // headroom for the 1.05 hover scale.
        sizes="(max-width: 639px) 50vw, (max-width: 1023px) 340px, (max-width: 1279px) 450px, 480px"
      />
      <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300" />
      <p className="absolute bottom-3 left-3 right-3 text-xs text-white/90 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 leading-snug">
        {caption}
      </p>
    </TiltCard>
  );
}

export default function ProfileSection() {
  return (
    <>
      <section className="space-y-6">
        <div className="fade-in-up fade-in-up-delay-1">
          <SectionHeading>Beyond the Code</SectionHeading>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {photos.map(({ src, alt, caption }, i) => (
            <ScrollReveal key={src} delay={i * 100}>
              <PhotoCard
                src={src}
                alt={alt}
                caption={caption}
                priority={i === 0}
              />
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={400}>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            {clubs.map(({ name, href }) => (
              <li key={name} className="flex items-center justify-center gap-2">
                <Dumbbell className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span className="text-center">
                  Active member &middot;{" "}
                  <UnderlineLink href={href} external className="whitespace-nowrap">
                    {name}
                  </UnderlineLink>
                </span>
              </li>
            ))}
            <li className="flex items-center justify-center gap-2">
              <HeartPulse className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span className="text-center">
                CPR/AED &amp; First Aid certified &middot;{" "}
                <UnderlineLink
                  href="/certifications/RedCrossCertificate_AD-20261007-5315113.PDF"
                  external
                  className="whitespace-nowrap"
                >
                  American Red Cross
                </UnderlineLink>
              </span>
            </li>
          </ul>
        </ScrollReveal>
      </section>

      <QuotesSection />

      <section className="fade-in-up fade-in-up-delay-3 space-y-6">
        <SectionHeading>Currently Playing</SectionHeading>
        <NowPlaying />
        <SpotifyEmbed />
      </section>
    </>
  );
}
