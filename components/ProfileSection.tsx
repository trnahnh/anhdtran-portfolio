import Image from "next/image";
import NowPlaying from "./NowPlaying";
import SpotifyEmbed from "./SpotifyEmbed";
import QuotesSection from "./QuotesSection";

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

export default function ProfileSection() {
  return (
    <>
      <section className="fade-in-up fade-in-up-delay-1 space-y-6">
        <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Beyond the Code
        </h2>

        <div className="grid grid-cols-2 gap-3">
          {photos.map(({ src, alt, caption }) => (
            <div key={src} className="relative group rounded-xl overflow-hidden">
              <Image
                src={src}
                alt={alt}
                width={4000}
                height={4000}
                loading="lazy"
                className="w-full h-auto transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 50vw, 320px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300" />
              <p className="absolute bottom-3 left-3 right-3 text-xs text-white/90 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 leading-snug">
                {caption}
              </p>
            </div>
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
