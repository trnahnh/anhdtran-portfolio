import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@mediapipe/hands", "@mediapipe/camera_utils"],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.scdn.co",
      },
    ],
  },
  async headers() {
    return [
      {
        // Sound effects shipped from /public default to `max-age=0`, so every
        // page load revalidated a 257 KB file and any cache miss downloaded it
        // in full at the exact moment play() was called. That is what made the
        // intro audio late sometimes and not others.
        //
        // These files are content-stable, so cache them hard. `immutable`
        // means a changed sound needs a new filename — rename rather than
        // overwrite.
        source: "/sfx/:file*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
