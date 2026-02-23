"use client";

import { useState } from "react";

export default function SpotifyEmbed() {
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      className="relative rounded-xl overflow-hidden"
      style={{ height: 352 }}
    >
      {!loaded && (
        <div className="absolute inset-0 bg-muted animate-pulse rounded-xl" />
      )}
      <iframe
        style={{
          borderRadius: "12px",
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.3s ease",
        }}
        src="https://open.spotify.com/embed/playlist/59J1xc7HyfCa3EusuWcPd8?utm_source=generator"
        width="100%"
        height="352"
        frameBorder="0"
        allowFullScreen
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
