"use client";

/**
 * One Web Audio context for the site's synthesised sounds, unlocked by the
 * visitor's first tap or keypress anywhere.
 *
 * Phones, iPhones above all, only let a context start inside a gesture.
 * The /profile card spin begins on page load, or a frame after the tap
 * that led there, which is already too late. So the context is started at
 * the first gesture the site sees, then suspended to rest the audio
 * hardware. Once a context has started under a gesture, it may be resumed
 * later without one, which is all the intro needs.
 *
 * Unlocking alone plays nothing audible and leaves iOS's audio session
 * alone, so it never interrupts music the visitor has playing. The
 * session is switched to "playback" only when a sound actually plays.
 */

let shared: AudioContext | null = null;

/** The shared context, created on first use. Null where Web Audio is missing. */
export function sharedAudio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!shared || shared.state === "closed") {
    try {
      shared = new AudioContext();
    } catch {
      return null;
    }
  }
  return shared;
}

/** Whether the shared context has been started by a gesture. */
let unlocked = false;
/** A gesture has asked it to start, and the device is still coming up. */
let unlocking = false;
export const audioUnlocked = () => unlocked;

/**
 * Call from inside a gesture. Starts the context with a silent sample (the
 * dependable unlock on older iOS), then lets it rest.
 */
export function unlockAudio(): void {
  if (unlocked) return;
  const ctx = sharedAudio();
  if (!ctx) return;
  try {
    const src = ctx.createBufferSource();
    src.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    src.connect(ctx.destination);
    src.start();
  } catch {}
  unlocking = true;
  ctx
    .resume()
    .then(() => {
      if (ctx.state !== "running") return;
      unlocked = true;
      // Rest unless something started playing in the meantime.
      if (active === 0) ctx.suspend().catch(() => {});
    })
    .catch(() => {})
    .finally(() => {
      unlocking = false;
    });
}

/** Sounds currently using the context; it is suspended when this hits 0. */
let active = 0;

/**
 * Wake the context for a sound. Resolves true once it is running, false if
 * the browser refuses (no gesture yet) within `maxWaitMs`.
 */
export function wakeAudio(ctx: AudioContext, maxWaitMs = 150): Promise<boolean> {
  active++;
  const session = (navigator as { audioSession?: { type: string } }).audioSession;
  // iPhones mute Web Audio on silent mode, unlike <audio>. "playback"
  // (Safari 17+) makes it play like the other intro sounds do.
  if (session) session.type = "playback";
  if (ctx.state === "running") return Promise.resolve(true);
  const resumed = ctx.resume().then(() => {
    // Started after the caller stopped waiting and released it: rest again.
    if (active === 0 && ctx.state === "running") ctx.suspend().catch(() => {});
    return ctx.state === "running";
  });
  return Promise.race([
    resumed,
    new Promise<boolean>((r) => setTimeout(() => r(false), maxWaitMs)),
  ]).catch(() => false);
}

/**
 * Wake an already-unlocked context ahead of a sound that is about to start,
 * so its clock is moving by the time that sound schedules. Holds it awake
 * for `holdMs`. Also runs while an unlock is still starting the device —
 * the first visit to /profile, where the tap that led there has only just
 * created the context. Does nothing before any gesture: creating a context
 * then would only be refused.
 */
export function warmAudio(holdMs = 3000): void {
  const ctx = shared;
  if (!ctx || !(unlocked || unlocking)) return;
  void wakeAudio(ctx, holdMs).then(() => setTimeout(() => releaseAudio(ctx), holdMs));
}

/** Done with the context; it rests once nothing else is using it. */
export function releaseAudio(ctx: AudioContext): void {
  active = Math.max(0, active - 1);
  if (active > 0) return;
  if (ctx.state === "running") ctx.suspend().catch(() => {});
  // Hand the session back, so the site isn't holding iOS's playback
  // category while it sits silent.
  const session = (navigator as { audioSession?: { type: string } }).audioSession;
  if (session) session.type = "auto";
}
