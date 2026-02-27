"use client";

import Image from "next/image";
import { useState } from "react";
import NowPlaying from "./NowPlaying";
import SpotifyEmbed from "./SpotifyEmbed";
import QuotesSection from "./QuotesSection";
import ScrollReveal from "./ScrollReveal";
import TiltCard from "./TiltCard";

const photos = [
  {
    src: "/profile/portrait.png",
    alt: "Portrait",
    caption: "The face of the operation.",
  },
  {
    src: "/profile/halloween.png",
    alt: "Halloween",
    caption: "Full-stack by day, full-scare by night.",
  },
  {
    src: "/profile/basketball.png",
    alt: "Basketball",
    caption: "Hooping between deployments.",
  },
  {
    src: "/profile/gym.png",
    alt: "Gym",
    caption: "PRs on the platform and the platform only.",
  },
];

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
        sizes="(max-width: 640px) 50vw, 320px"
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
        <h2 className="fade-in-up fade-in-up-delay-1 text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Beyond the Code
        </h2>

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
      </section>

      <QuotesSection />

      <section className="fade-in-up fade-in-up-delay-3 space-y-6">
        <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Currently Playing
        </h2>
        <NowPlaying />
        <SpotifyEmbed />
      </section>
    </>
  );
}
