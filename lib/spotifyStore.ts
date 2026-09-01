"use client";

export interface Track {
  isPlaying: boolean;
  title?: string;
  artist?: string;
  albumArt?: string;
  songUrl?: string;
}

/**
 * One poll, many readers.
 *
 * Spotify is the site's only live feed, and three components want it: the
 * matrix waveform, the instrument rail, and NowPlaying on /profile. Polling
 * per component meant three requests every interval for one answer. This
 * refcounts subscribers and keeps exactly one timer alive while anyone is
 * listening — and none at all when nobody is.
 */

const POLL_MS = 30_000;

let state: Track = { isPlaying: false };
let timer: ReturnType<typeof setInterval> | null = null;
let refs = 0;

const listeners = new Set<(track: Track) => void>();

function poll() {
  if (typeof document !== "undefined" && document.hidden) return;
  fetch("/api/spotify")
    .then((r) => (r.ok ? r.json() : null))
    .then((data: Track | null) => {
      state = data ?? { isPlaying: false };
      listeners.forEach((fn) => fn(state));
    })
    .catch(() => {
      state = { isPlaying: false };
      listeners.forEach((fn) => fn(state));
    });
}

export function subscribeSpotify(fn: (track: Track) => void): () => void {
  listeners.add(fn);
  fn(state);
  refs += 1;

  if (refs === 1) {
    poll();
    timer = setInterval(poll, POLL_MS);
  }

  return () => {
    listeners.delete(fn);
    refs -= 1;
    if (refs <= 0 && timer) {
      clearInterval(timer);
      timer = null;
      refs = 0;
    }
  };
}
