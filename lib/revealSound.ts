"use client";

/**
 * The sound for the incoming-experience reveal, synthesised in Web Audio so
 * there is nothing to download. Scheduled on the audio clock from the click,
 * so it stays in step with the animation:
 *
 *   dark    the screen cuts to black: a sub swells in under a cold breath
 *           of air, and a low rumble settles in to sit under everything
 *   kicker  one dry digital tick per typed character
 *   draw    tension while the outline traces: a filtered noise sweep and a
 *           detuned tone both climbing, a tremolo speeding up, stray data
 *           chirps growing denser; all of it drops out a beat before...
 *   lock    the hit: a sub boom, a dark burst into the room, an inharmonic
 *           metallic shimmer, then a low open fifth that hangs and fades
 *
 * Started from the click itself, which is what lets iOS play it.
 */

export type RevealSound = {
  /** Jump to the hit now (the sequence was skipped). */
  skip: () => void;
  /** Fade everything out (the reveal closed). */
  stop: () => void;
};

export const NO_REVEAL_SOUND: RevealSound = { skip() {}, stop() {} };

/** All times in seconds after the click. */
export type RevealTiming = {
  kickerAt: number;
  kickerStep: number;
  kickerChars: number;
  drawAt: number;
  lockAt: number;
};

export function playRevealSound(timing: RevealTiming): RevealSound {
  // iPhones mute Web Audio on silent mode, unlike <audio>. "playback"
  // (Safari 17+) makes it play like the site's other intro sounds.
  const session = (navigator as { audioSession?: { type: string } }).audioSession;
  if (session) session.type = "playback";
  let ctx: AudioContext;
  try {
    ctx = new AudioContext();
  } catch {
    return NO_REVEAL_SOUND;
  }
  // Some iOS versions start a new context suspended even inside a tap.
  ctx.resume().catch(() => {});

  const t0 = ctx.currentTime;
  const draw = t0 + timing.drawAt;
  const lock = t0 + timing.lockAt;

  const noise = (seconds: number) => {
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    return src;
  };
  const gainAt = (t: number, v = 0.0001) => {
    const g = ctx.createGain();
    g.gain.setValueAtTime(v, t);
    return g;
  };

  // Master, with a compressor to glue the layers and hold the peaks.
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.ratio.value = 4;
  const master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(comp).connect(ctx.destination);

  // A big dark room: a generated impulse, three seconds of decaying noise.
  const verb = ctx.createConvolver();
  const irLen = Math.ceil(ctx.sampleRate * 3);
  const ir = ctx.createBuffer(2, irLen, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < irLen; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 2.6);
  }
  verb.buffer = ir;
  const verbOut = ctx.createGain();
  verbOut.gain.value = 0.45;
  verb.connect(verbOut).connect(master);
  const send = (node: AudioNode, amount: number) => {
    const g = ctx.createGain();
    g.gain.value = amount;
    node.connect(g).connect(verb);
  };

  // Everything before the hit shares a bus, so a skip can cut it alone.
  const leadIn = ctx.createGain();
  leadIn.connect(master);

  /* ---- dark ---------------------------------------------------------- */

  // The sub, swelling in and holding low until the hit.
  const sub = ctx.createOscillator();
  sub.frequency.setValueAtTime(42, t0);
  sub.frequency.linearRampToValueAtTime(48, lock);
  const subGain = gainAt(t0);
  subGain.gain.exponentialRampToValueAtTime(0.32, t0 + 0.7);
  subGain.gain.setValueAtTime(0.32, lock - 0.12);
  subGain.gain.exponentialRampToValueAtTime(0.0001, lock - 0.03);
  sub.connect(subGain).connect(leadIn);
  sub.start(t0);
  sub.stop(lock);

  // A cold breath of air as the lights go: bright noise, falling away.
  const air = noise(1.4);
  const airTone = ctx.createBiquadFilter();
  airTone.type = "bandpass";
  airTone.Q.value = 0.8;
  airTone.frequency.setValueAtTime(6000, t0);
  airTone.frequency.exponentialRampToValueAtTime(700, t0 + 1.2);
  const airGain = gainAt(t0);
  airGain.gain.exponentialRampToValueAtTime(0.09, t0 + 0.08);
  airGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.3);
  air.connect(airTone).connect(airGain).connect(leadIn);
  send(airGain, 0.5);
  air.start(t0);

  // A low rumble under it all.
  const rumble = noise(timing.lockAt + 0.2);
  const rumbleTone = ctx.createBiquadFilter();
  rumbleTone.type = "lowpass";
  rumbleTone.frequency.value = 140;
  const rumbleGain = gainAt(t0);
  rumbleGain.gain.exponentialRampToValueAtTime(0.12, t0 + 1);
  rumbleGain.gain.setValueAtTime(0.12, lock - 0.12);
  rumbleGain.gain.exponentialRampToValueAtTime(0.0001, lock - 0.03);
  rumble.connect(rumbleTone).connect(rumbleGain).connect(leadIn);
  rumble.start(t0);

  /* ---- kicker -------------------------------------------------------- */

  for (let i = 0; i < timing.kickerChars; i++) {
    const t = t0 + timing.kickerAt + i * timing.kickerStep;
    const o = ctx.createOscillator();
    o.type = "square";
    o.frequency.value = 1800 + Math.random() * 900;
    const tone = ctx.createBiquadFilter();
    tone.type = "highpass";
    tone.frequency.value = 1200;
    const g = gainAt(t);
    g.gain.exponentialRampToValueAtTime(0.035, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    o.connect(tone).connect(g).connect(leadIn);
    send(g, 0.25);
    o.start(t);
    o.stop(t + 0.04);
  }

  /* ---- draw ---------------------------------------------------------- */

  // The sweep: noise through a band that narrows as it climbs.
  const sweep = noise(timing.lockAt - timing.drawAt + 0.1);
  const sweepTone = ctx.createBiquadFilter();
  sweepTone.type = "bandpass";
  sweepTone.Q.setValueAtTime(1, draw);
  sweepTone.Q.linearRampToValueAtTime(7, lock);
  sweepTone.frequency.setValueAtTime(250, draw);
  sweepTone.frequency.exponentialRampToValueAtTime(5200, lock - 0.05);
  const sweepGain = gainAt(draw);
  sweepGain.gain.exponentialRampToValueAtTime(0.16, lock - 0.08);
  // The drop-out: a breath of silence before the hit.
  sweepGain.gain.exponentialRampToValueAtTime(0.0001, lock - 0.03);
  sweep.connect(sweepTone).connect(sweepGain).connect(leadIn);
  send(sweepGain, 0.35);
  sweep.start(draw);

  // The rising tone: two detuned saws, a tremolo on them speeding up.
  const riseTone = ctx.createBiquadFilter();
  riseTone.type = "lowpass";
  riseTone.frequency.setValueAtTime(260, draw);
  riseTone.frequency.exponentialRampToValueAtTime(2600, lock);
  const trem = ctx.createGain();
  trem.gain.value = 0.5;
  const lfo = ctx.createOscillator();
  lfo.frequency.setValueAtTime(3, draw);
  lfo.frequency.exponentialRampToValueAtTime(18, lock);
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = 0.5;
  lfo.connect(lfoDepth).connect(trem.gain);
  const riseGain = gainAt(draw);
  riseGain.gain.exponentialRampToValueAtTime(0.07, lock - 0.08);
  riseGain.gain.exponentialRampToValueAtTime(0.0001, lock - 0.03);
  riseTone.connect(trem).connect(riseGain).connect(leadIn);
  send(riseGain, 0.3);
  lfo.start(draw);
  lfo.stop(lock);
  for (const detune of [-12, 9]) {
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.detune.value = detune;
    o.frequency.setValueAtTime(82.4, draw);
    o.frequency.exponentialRampToValueAtTime(329.6, lock);
    o.connect(riseTone);
    o.start(draw);
    o.stop(lock);
  }

  // Data chirps: short high blips, scattered, thickening toward the hit.
  const span = timing.lockAt - timing.drawAt;
  let at = 0.15;
  while (at < span - 0.12) {
    const t = draw + at;
    const o = ctx.createOscillator();
    o.type = "sine";
    const f = 2400 + Math.random() * 3600;
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * (Math.random() < 0.5 ? 0.6 : 1.5), t + 0.05);
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.random() * 1.6 - 0.8;
    const g = gainAt(t);
    g.gain.exponentialRampToValueAtTime(0.02, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    o.connect(pan).connect(g).connect(leadIn);
    send(g, 0.5);
    o.start(t);
    o.stop(t + 0.07);
    // From one every ~0.3s to one every ~0.05s.
    at += 0.05 + 0.25 * (1 - at / span) * (0.6 + Math.random() * 0.8);
  }

  /* ---- lock ---------------------------------------------------------- */

  const hit = (t: number, bus: AudioNode) => {
    // A sub boom, dropping.
    const boom = ctx.createOscillator();
    boom.frequency.setValueAtTime(90, t);
    boom.frequency.exponentialRampToValueAtTime(38, t + 0.35);
    const boomGain = gainAt(t);
    boomGain.gain.exponentialRampToValueAtTime(0.95, t + 0.006);
    boomGain.gain.exponentialRampToValueAtTime(0.0001, t + 2);
    boom.connect(boomGain).connect(bus);
    boom.start(t);
    boom.stop(t + 2.1);

    // A dark burst that blooms into the room.
    const body = noise(0.6);
    const bodyTone = ctx.createBiquadFilter();
    bodyTone.type = "lowpass";
    bodyTone.frequency.setValueAtTime(1600, t);
    bodyTone.frequency.exponentialRampToValueAtTime(160, t + 0.5);
    const bodyGain = gainAt(t);
    bodyGain.gain.exponentialRampToValueAtTime(0.4, t + 0.006);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    body.connect(bodyTone).connect(bodyGain).connect(bus);
    send(bodyGain, 1);
    body.start(t);

    // A metallic shimmer: inharmonic partials, the high ones dying first.
    for (const [freq, level, decay] of [
      [523, 0.05, 2.6],
      [1312, 0.03, 1.8],
      [2090, 0.018, 1.1],
      [3477, 0.01, 0.6],
    ]) {
      const o = ctx.createOscillator();
      o.frequency.value = freq;
      const g = gainAt(t);
      g.gain.exponentialRampToValueAtTime(level, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      o.connect(g).connect(bus);
      send(g, 0.9);
      o.start(t);
      o.stop(t + decay + 0.05);
    }

    // A low open fifth that hangs in the dark and fades.
    const padTone = ctx.createBiquadFilter();
    padTone.type = "lowpass";
    padTone.frequency.setValueAtTime(1800, t);
    padTone.frequency.exponentialRampToValueAtTime(400, t + 4.5);
    const padGain = gainAt(t);
    padGain.gain.exponentialRampToValueAtTime(0.06, t + 0.25);
    padGain.gain.exponentialRampToValueAtTime(0.0001, t + 5);
    padTone.connect(padGain).connect(bus);
    send(padGain, 0.6);
    for (const [freq, detune] of [
      [55, 0],
      [82.4, -6],
      [110, 7],
    ]) {
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.value = freq;
      o.detune.value = detune;
      o.connect(padTone);
      o.start(t);
      o.stop(t + 5.1);
    }
  };

  // The scheduled hit has its own bus too, so a skip can trade it for one
  // that lands now.
  const lockBus = ctx.createGain();
  lockBus.connect(master);
  hit(lock, lockBus);

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    ctx.close().catch(() => {});
    if (session) session.type = "auto";
  };
  let closeTimer = window.setTimeout(close, (timing.lockAt + 6) * 1000);

  return {
    skip() {
      if (closed) return;
      const now = ctx.currentTime;
      // Past the hit already: nothing to skip to.
      if (now >= lock - 0.05) return;
      leadIn.gain.setTargetAtTime(0, now, 0.02);
      lockBus.gain.setValueAtTime(0, now);
      hit(now + 0.03, master);
      clearTimeout(closeTimer);
      closeTimer = window.setTimeout(close, 6000);
    },
    stop() {
      clearTimeout(closeTimer);
      if (closed) return;
      // A quick fade rather than a click.
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      window.setTimeout(close, 300);
    },
  };
}
