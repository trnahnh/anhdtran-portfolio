"use client";

/**
 * The roulette under the /profile card spin, synthesised in Web Audio so
 * there is nothing to download and nothing to wait for.
 *
 * The card turns three times in 2.4s on a steep ease-out (see `.card-spin`
 * in globals.css). A tick is scheduled every 30° of that turn, solved from
 * the same cubic-bezier, so the ticks rattle while the card blurs and spread
 * out as it slows: a wheel clicking past its frets. The curve reaches 97% of
 * its turn by 1.5s and creeps for the rest, so the last ticks are spaced
 * through that creep, the final one landing as the card stops — the moment
 * the tap-to-pay chime takes over.
 *
 * Each tick is a pure, high sine ping with a short decay: no noise, so it
 * stays clean instead of crackling, even where the ticks crowd together.
 *
 * It plays on the site's shared context (lib/audio.ts), unlocked by the
 * visitor's first gesture, because on phones a context started by the spin
 * itself would be refused. A context that is slow to start (the first visit,
 * when the tap that led here has only just created it) is waited on for as
 * long as the card turns, and joins in step with whatever ticks are left. If
 * it never runs (no gesture yet, e.g. /profile opened straight from a link),
 * this stays silent; the chime then falls back to the <audio> path, which
 * has its own way of getting heard.
 */

import { releaseAudio, sharedAudio, wakeAudio } from "@/lib/audio";

export type SpinSound = {
  /** Whether the closing chime is scheduled on this clock. */
  readonly chimed: boolean;
  stop: () => void;
};

export const NO_SPIN: SpinSound = { chimed: false, stop() {} };

/**
 * A sound to play the instant the spin stops, scheduled on the same clock
 * as the ticks so it follows the last one exactly — no waiting on an
 * `animationend` that a busy main thread may deliver late.
 */
export type Chime = {
  src: string;
  /** Seconds of the file to skip, e.g. leading silence. */
  offset: number;
  /** Checked just before scheduling; false once the caller played it itself. */
  allowed: () => boolean;
};

/** Must match `.card-spin` in globals.css. */
const DURATION = 2.4;
const EASE = [0.12, 0.8, 0.24, 1] as const;
/** 1080° in 30° frets. */
const FRETS = 36;
/** Closer than this the pings smear into a buzz; drop the extras. */
const MIN_GAP = 0.024;
/** Angle-synced ticks stop here; the creep's ticks take over. */
const CREEP_FROM = 1.25;
/** Widening gaps through the creep, the last one as the card stops. */
const CREEP_TICKS = [1.47, 1.76, 2.06, DURATION - 0.02];
/** The ping's pitch, alternating either side of it as the ball rocks. */
const PITCH = 3600;

const bez = (s: number, p1: number, p2: number) =>
  3 * (1 - s) ** 2 * s * p1 + 3 * (1 - s) * s * s * p2 + s ** 3;

/** Solve one axis of the curve for the parameter that reaches `target`. */
function solve(target: number, p1: number, p2: number): number {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (bez(mid, p1, p2) < target) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** Seconds into the spin at which the card has turned `progress` of the way. */
const timeAt = (progress: number) =>
  bez(solve(progress, EASE[1], EASE[3]), EASE[0], EASE[2]) * DURATION;

/** How far the card has turned `t` seconds in, 0 to 1. */
const progressAt = (t: number) =>
  bez(solve(Math.min(Math.max(t / DURATION, 0), 1), EASE[0], EASE[2]), EASE[1], EASE[3]);

/** The card's turning speed at `t`, relative to its speed at the start. */
const speedAt = (t: number) => {
  const dt = 0.01;
  const v = (time: number) => (progressAt(time + dt) - progressAt(time)) / dt;
  return Math.min(v(t) / v(0), 1);
};

function tickTimes(): number[] {
  const times: number[] = [];
  let last = -Infinity;
  for (let k = 1; k < FRETS; k++) {
    const t = timeAt(k / FRETS);
    if (t > CREEP_FROM) break;
    if (t - last < MIN_GAP) continue;
    times.push(t);
    last = t;
  }
  return times.concat(CREEP_TICKS);
}

/**
 * Wait for the audio clock to be moving, then return the context time at
 * which the spin began. A context that has just started or resumed reports
 * "running" while its clock still waits on the audio device, so scheduling
 * off `currentTime` straight away lands everything late by that start-up.
 * `getOutputTimestamp` pairs a context time with the moment it reaches the
 * speakers, which maps the spin's start across exactly, latency included.
 */
function spinStartOnClock(
  ctx: AudioContext,
  spinStart: number,
  restedAt: number,
): Promise<number> {
  const fallback = () =>
    ctx.currentTime - (performance.now() - spinStart) / 1000 - (ctx.outputLatency || 0);
  if (typeof ctx.getOutputTimestamp !== "function") return Promise.resolve(fallback());
  return new Promise((resolve) => {
    const deadline = performance.now() + 300;
    const check = () => {
      const ts = ctx.getOutputTimestamp();
      const fresh =
        ts.contextTime &&
        ts.performanceTime &&
        // Resumed from rest, the timestamp is stale until the clock has
        // moved past where it stopped.
        ts.contextTime > restedAt &&
        Math.abs(performance.now() - ts.performanceTime) < 250;
      if (fresh) {
        resolve(ts.contextTime! - (ts.performanceTime! - spinStart) / 1000);
      } else if (performance.now() > deadline) {
        resolve(fallback());
      } else {
        setTimeout(check, 5);
      }
    };
    check();
  });
}

/** Decoded once per page; replays reuse it. */
const decoded = new Map<string, Promise<AudioBuffer>>();
function decode(ctx: AudioContext, src: string): Promise<AudioBuffer> {
  let buf = decoded.get(src);
  if (!buf) {
    buf = fetch(src)
      .then((r) => r.arrayBuffer())
      .then((data) => ctx.decodeAudioData(data));
    // A failure shouldn't stick; let the next spin try again.
    buf.catch(() => decoded.delete(src));
    decoded.set(src, buf);
  }
  return buf;
}

/**
 * Play the spin that began at `spinStart` (a `performance.now()` time; the
 * card may have been turning a while before this is called). Returns a
 * handle to silence it.
 */
export async function playSpinSound(spinStart: number, chime?: Chime): Promise<SpinSound> {
  const ctx = sharedAudio();
  if (!ctx) return NO_SPIN;
  // Start decoding the chime now; the spin is 2.4s of head start.
  const chimeBuf = chime ? decode(ctx, chime.src) : null;

  // Where the clock stood before waking: a running clock's timestamp is
  // already good, a rested one's only once it passes this.
  const restedAt = ctx.state === "running" ? -1 : ctx.currentTime;
  // Wait as long as the card is still turning, not a fixed moment. The
  // first time through, the context was only created by the tap that led
  // here, and the audio device can take a few hundred ms to start: a short
  // wait gave up on it and left the chime to play alone. Ticks are placed on
  // the spin's own timeline, so a clock that arrives late just skips the
  // ones already gone and joins the rest in step.
  const spinLeft = spinStart + DURATION * 1000 - performance.now() - 50;
  if (!(await wakeAudio(ctx, Math.max(150, spinLeft)))) {
    releaseAudio(ctx);
    return NO_SPIN;
  }

  // Line the spin's timeline up with the audio clock.
  const t0 = await spinStartOnClock(ctx, spinStart, restedAt);
  const now = ctx.currentTime + 0.005;
  const end = t0 + DURATION;

  // Everything this spin plays goes through one bus, so it can be faded
  // and unplugged without touching anything else on the shared context.
  const bus = ctx.createGain();
  bus.connect(ctx.destination);
  const ticks = ctx.createGain();
  ticks.gain.value = 0.35;
  ticks.connect(bus);

  const ping = (at: number, loud: number, freq: number, decay: number) => {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = freq;
    const g = ctx.createGain();
    // A 2ms rise rather than a jump: an instant edge is itself a click.
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(loud, at + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, at + decay);
    o.connect(g).connect(ticks);
    o.start(at);
    o.stop(at + decay + 0.01);
  };

  const times = tickTimes();
  times.forEach((t, i) => {
    const at = t0 + t;
    if (at < now) return;
    const final = i === times.length - 1;
    const slow = 1 - speedAt(t);
    // Soft and short in the rattle, fuller and ringing as it slows.
    const loud = final ? 0.6 : 0.2 + 0.3 * slow;
    const decay = final ? 0.09 : 0.025 + 0.04 * slow;
    const freq = PITCH * (i % 2 ? 0.92 : 1.08) * (0.98 + Math.random() * 0.04);
    ping(at, loud, freq, decay);
  });

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    bus.disconnect();
    releaseAudio(ctx);
  };
  let done = setTimeout(finish, (end + 0.3 - ctx.currentTime) * 1000);

  let chimed = false;
  if (chime && chimeBuf) {
    chimeBuf
      .then((buf) => {
        if (finished || !chime.allowed() || end < ctx.currentTime + 0.01) return;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(bus);
        src.start(end, chime.offset);
        chimed = true;
        clearTimeout(done);
        const tail = end + buf.duration - chime.offset + 0.2;
        done = setTimeout(finish, (tail - ctx.currentTime) * 1000);
      })
      .catch(() => {});
  }

  return {
    get chimed() {
      return chimed;
    },
    stop() {
      if (finished) return;
      clearTimeout(done);
      bus.gain.setTargetAtTime(0, ctx.currentTime, 0.015);
      setTimeout(finish, 80);
    },
  };
}
