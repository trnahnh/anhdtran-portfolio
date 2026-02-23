"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import UnderlineLink from "./UnderlineLink";

interface Track {
  isPlaying: boolean;
  title?: string;
  artist?: string;
  albumArt?: string;
  songUrl?: string;
}

export default function NowPlaying() {
  const [track, setTrack] = useState<Track | null>(null);

  useEffect(() => {
    const fetch_ = () =>
      fetch("/api/spotify")
        .then((r) => r.json())
        .then(setTrack)
        .catch(() => {});

    fetch_();
    const interval = setInterval(fetch_, 20_000);
    return () => clearInterval(interval);
  }, []);

  if (!track) return null;

  return (
    <div className="flex items-center gap-3 text-sm">
      {track.isPlaying && track.albumArt ? (
        <>
          <div className="relative shrink-0">
            <Image
              src={track.albumArt}
              alt={track.title ?? "Album art"}
              width={40}
              height={40}
              className="rounded shadow-depth"
            />
            {/* Pulsing playing indicator */}
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full">
              <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75" />
            </span>
          </div>
          <div className="min-w-0">
            <UnderlineLink
              href={track.songUrl ?? ""}
              external
              className="font-medium text-foreground truncate block"
            >
              {track.title}
            </UnderlineLink>
            <p className="text-muted-foreground truncate">{track.artist}</p>
          </div>
        </>
      ) : (
        <p className="text-muted-foreground">Not playing anything right now.</p>
      )}
    </div>
  );
}
