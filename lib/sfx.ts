"use client";

/**
 * Sound effects, fetched before they are needed.
 *
 * The intro screens did `new Audio(src)` and called `.play()` on the same
 * tick, so playback started whenever the network happened to deliver the
 * file. With a warm cache that is instant; with a cold one it was seconds
 * late while the animation carried on without it. The lag was never in the
 * audio pipeline — it was the download sitting on the critical path.
 *
 * `prime` starts the fetch as early as a component knows it will need a
 * sound. `ready` resolves once enough has buffered to play through, or after
 * a short ceiling so a slow network delays the moment rather than blocking it
 * forever.
 */

/** Typed out under the terminal's boot screen. */
export const TERMINAL_SFX = "/sfx/keyboard-typing.mp3";

const cache = new Map<string, HTMLAudioElement>();

/** Begin fetching. Safe to call repeatedly; the element is reused. */
export function prime(src: string): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;

  let audio = cache.get(src);
  if (!audio) {
    audio = new Audio();
    audio.preload = "auto";
    audio.src = src;
    audio.load();
    cache.set(src, audio);
  }
  return audio;
}

/**
 * Resolve when the sound can play through, or when `maxWaitMs` elapses —
 * whichever comes first. Never rejects: a missing sound should cost the
 * visitor nothing but silence.
 */
export function ready(
  src: string,
  maxWaitMs = 700,
): Promise<HTMLAudioElement | null> {
  const audio = prime(src);
  if (!audio) return Promise.resolve(null);

  // HAVE_FUTURE_DATA or better — enough to start without stalling.
  if (audio.readyState >= 3) return Promise.resolve(audio);

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      audio.removeEventListener("canplaythrough", finish);
      audio.removeEventListener("error", finish);
      clearTimeout(timer);
      resolve(audio);
    };
    const timer = setTimeout(finish, maxWaitMs);
    audio.addEventListener("canplaythrough", finish, { once: true });
    audio.addEventListener("error", finish, { once: true });
  });
}

/**
 * Start a sound from the top, unless it is already playing out loud.
 *
 * Phones only allow sound inside a tap, a keypress or a finger lifting, so
 * call this from the event itself. Called anywhere else it may be refused,
 * which is harmless: the element stays paused, and the next call from a
 * real gesture starts it.
 */
export function start(src: string): void {
  const audio = prime(src);
  if (!audio || (!audio.paused && !audio.muted)) return;
  audio.muted = false;
  try {
    audio.currentTime = 0;
  } catch {}
  void audio.play().catch(() => {});
}

/** Rewind and play. Returns the element so callers can stop it later. */
export function play(audio: HTMLAudioElement | null): void {
  if (!audio) return;
  audio.muted = false;
  try {
    audio.currentTime = 0;
  } catch {
    // Seeking before metadata arrives throws in some browsers; harmless.
  }
  void audio.play().catch(() => {});
}
