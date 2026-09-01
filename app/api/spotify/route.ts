import { NextResponse } from "next/server";

const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
const NOW_PLAYING_ENDPOINT =
  "https://api.spotify.com/v1/me/player/currently-playing";

interface TokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

/** Not playing, and the UI should treat it exactly like silence. */
const SILENT = { isPlaying: false } as const;

async function getAccessToken(): Promise<TokenResponse> {
  const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN } =
    process.env;

  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SPOTIFY_REFRESH_TOKEN) {
    return {
      error: "missing_env",
      error_description:
        "SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET or SPOTIFY_REFRESH_TOKEN is not set",
    };
  }

  const credentials = Buffer.from(
    `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`,
  ).toString("base64");

  try {
    const res = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: SPOTIFY_REFRESH_TOKEN,
      }),
      cache: "no-store",
    });
    return (await res.json()) as TokenResponse;
  } catch (err) {
    return {
      error: "network",
      error_description: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function GET() {
  const token = await getAccessToken();

  // A revoked refresh token fails right here. Previously access_token was
  // simply undefined, the next call went out as "Bearer undefined", Spotify
  // answered 401, and the 401 was folded into the same not-playing response
  // as genuine silence — so a dead credential looked exactly like nobody
  // listening to music, with nothing anywhere to say otherwise.
  if (!token.access_token) {
    console.error(
      "[spotify] token refresh failed:",
      token.error ?? "unknown",
      token.error_description ?? "",
    );
    return NextResponse.json({ ...SILENT, error: "auth" });
  }

  let res: Response;
  try {
    res = await fetch(NOW_PLAYING_ENDPOINT, {
      headers: { Authorization: `Bearer ${token.access_token}` },
      cache: "no-store",
    });
  } catch (err) {
    console.error("[spotify] now-playing request failed:", err);
    return NextResponse.json({ ...SILENT, error: "network" });
  }

  // 204 is Spotify's "nothing is playing" and is not a problem.
  if (res.status === 204) return NextResponse.json(SILENT);

  if (res.status >= 400) {
    console.error("[spotify] now-playing returned", res.status);
    return NextResponse.json({ ...SILENT, error: `http_${res.status}` });
  }

  const data = await res.json();

  if (data?.currently_playing_type !== "track" || !data.item) {
    return NextResponse.json(SILENT);
  }

  return NextResponse.json({
    isPlaying: data.is_playing,
    title: data.item.name,
    artist: data.item.artists.map((a: { name: string }) => a.name).join(", "),
    albumArt: data.item.album.images[1]?.url,
    songUrl: data.item.external_urls.spotify,
  });
}
