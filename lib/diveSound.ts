"use client";

/**
 * The sound for the /profile planet dive, synthesised in Web Audio so there
 * is nothing to download. Everything is scheduled on the audio clock from
 * the click, so it stays in step with the animation:
 *
 *   warp   a noise whoosh panning past, a rising detuned tone and a sub
 *          swell underneath; all of it drops out a beat before the impact
 *   dive   a sub drop and a dark burst, ringing out into a reverb
 *   sign   the LED sign flickering on: crackles, a low hum, and a soft
 *          open chord swelling in as the Y draws and the photo appears
 *   stamp  a title hit as the YC sticker lands: a boom onto a low A, a
 *          dark burst into the room, and a bell on the chord's A
 *
 * Started from the click itself, which is what lets iOS play it; the same
 * context plays the stamp later, so that's allowed too.
 */

export type DiveSound = {
  /** Silence the dive (the intro was skipped); the stamp can still play. */
  cut: () => void;
  /** The stamp hitting the photo. */
  stamp: () => void;
  /** Silence everything (the reveal closed). */
  stop: () => void;
};

export const NO_SOUND: DiveSound = { cut() {}, stamp() {}, stop() {} };

/** `diveAt` and `signAt` are seconds after the click. */
export function playDiveSound(diveAt: number, signAt: number): DiveSound {
  // iPhones mute Web Audio on silent mode, unlike the <audio> the other
  // intros use. "playback" (Safari 17+) makes it play like those do.
  const session = (navigator as { audioSession?: { type: string } }).audioSession;
  if (session) session.type = "playback";
  let ctx: AudioContext;
  try {
    ctx = new AudioContext();
  } catch {
    return NO_SOUND;
  }
  // Some iOS versions start a new context suspended even inside a tap.
  ctx.resume().catch(() => {});

  const t0 = ctx.currentTime;
  const dive = t0 + diveAt;
  const sign = t0 + signAt;

  const noise = (seconds: number) => {
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    return src;
  };
  // A gain that starts silent; the caller shapes it from there.
  const silentGain = () => {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    return g;
  };

  // Master, with a compressor to glue the layers and keep peaks in check.
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.ratio.value = 4;
  const master = ctx.createGain();
  master.gain.value = 0.55;
  master.connect(comp).connect(ctx.destination);

  // A shared room: a generated impulse, two seconds of decaying noise.
  const verb = ctx.createConvolver();
  const irLen = Math.ceil(ctx.sampleRate * 2.2);
  const ir = ctx.createBuffer(2, irLen, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < irLen; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 3);
  }
  verb.buffer = ir;
  const verbOut = ctx.createGain();
  verbOut.gain.value = 0.4;
  verb.connect(verbOut).connect(master);

  // The dive's layers, and their sends to the room, each share a bus, so
  // a skip can cut them alone and leave the stamp.
  const diveBus = ctx.createGain();
  diveBus.connect(master);
  const diveSend = ctx.createGain();
  diveSend.connect(verb);
  const send = (node: AudioNode, amount: number, to: AudioNode = diveSend) => {
    const g = ctx.createGain();
    g.gain.value = amount;
    node.connect(g).connect(to);
  };

  /* ---- warp ---------------------------------------------------------- */

  // The whoosh, swept up and panned left to right as the planet flies past.
  const whoosh = noise(diveAt + 0.2);
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = 1.4;
  band.frequency.setValueAtTime(220, t0);
  band.frequency.exponentialRampToValueAtTime(3200, dive - 0.04);
  const pan = ctx.createStereoPanner();
  pan.pan.setValueAtTime(-0.7, t0);
  pan.pan.linearRampToValueAtTime(0.5, dive);
  const whooshGain = silentGain();
  whooshGain.gain.exponentialRampToValueAtTime(0.3, dive - 0.06);
  // The drop-out: a breath of silence before the hit.
  whooshGain.gain.exponentialRampToValueAtTime(0.0001, dive - 0.01);
  whoosh.connect(band).connect(pan).connect(whooshGain).connect(diveBus);
  send(whooshGain, 0.3);
  whoosh.start(t0);
  whoosh.stop(dive + 0.1);

  // A rising tone: two detuned saws, the filter opening as they climb.
  const riseTone = ctx.createBiquadFilter();
  riseTone.type = "lowpass";
  riseTone.frequency.setValueAtTime(300, t0);
  riseTone.frequency.exponentialRampToValueAtTime(2400, dive);
  const riseGain = silentGain();
  riseGain.gain.exponentialRampToValueAtTime(0.05, dive - 0.06);
  riseGain.gain.exponentialRampToValueAtTime(0.0001, dive - 0.01);
  riseTone.connect(riseGain).connect(diveBus);
  for (const detune of [-8, 8]) {
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.detune.value = detune;
    o.frequency.setValueAtTime(110, t0);
    o.frequency.exponentialRampToValueAtTime(440, dive);
    o.connect(riseTone);
    o.start(t0);
    o.stop(dive + 0.05);
  }

  // A sub swell under it all, felt more than heard.
  const swell = ctx.createOscillator();
  swell.frequency.setValueAtTime(42, t0);
  swell.frequency.exponentialRampToValueAtTime(70, dive);
  const swellGain = silentGain();
  swellGain.gain.exponentialRampToValueAtTime(0.3, dive - 0.06);
  swellGain.gain.exponentialRampToValueAtTime(0.0001, dive - 0.01);
  swell.connect(swellGain).connect(diveBus);
  swell.start(t0);
  swell.stop(dive + 0.05);

  /* ---- dive ---------------------------------------------------------- */

  // The impact: a sub drop...
  const drop = ctx.createOscillator();
  drop.frequency.setValueAtTime(110, dive);
  drop.frequency.exponentialRampToValueAtTime(30, dive + 0.8);
  const dropGain = silentGain();
  dropGain.gain.setValueAtTime(0.0001, dive);
  dropGain.gain.exponentialRampToValueAtTime(1, dive + 0.015);
  dropGain.gain.exponentialRampToValueAtTime(0.0001, dive + 1.1);
  drop.connect(dropGain).connect(diveBus);
  drop.start(dive);
  drop.stop(dive + 1.2);

  // ...and a dark burst that blooms into the room.
  const burst = noise(0.6);
  const burstTone = ctx.createBiquadFilter();
  burstTone.type = "lowpass";
  burstTone.frequency.setValueAtTime(2600, dive);
  burstTone.frequency.exponentialRampToValueAtTime(250, dive + 0.45);
  const burstGain = silentGain();
  burstGain.gain.setValueAtTime(0.0001, dive);
  burstGain.gain.exponentialRampToValueAtTime(0.45, dive + 0.01);
  burstGain.gain.exponentialRampToValueAtTime(0.0001, dive + 0.55);
  burst.connect(burstTone).connect(burstGain).connect(diveBus);
  send(burstGain, 0.9);
  burst.start(dive);

  /* ---- sign ---------------------------------------------------------- */

  // The LED sign catching: three crackles, uneven, like a tube striking.
  const crackleTone = ctx.createBiquadFilter();
  crackleTone.type = "highpass";
  crackleTone.frequency.value = 2500;
  crackleTone.connect(diveBus);
  send(crackleTone, 0.4);
  for (const [at, level] of [[0, 0.18], [0.07, 0.1], [0.16, 0.22]] as const) {
    const c = noise(0.03);
    const g = silentGain();
    g.gain.setValueAtTime(level, sign + at);
    g.gain.exponentialRampToValueAtTime(0.0001, sign + at + 0.025);
    c.connect(g).connect(crackleTone);
    c.start(sign + at);
  }

  // Its hum, low and brief.
  const hum = ctx.createOscillator();
  hum.type = "sawtooth";
  hum.frequency.value = 55;
  const humTone = ctx.createBiquadFilter();
  humTone.type = "lowpass";
  humTone.frequency.value = 650;
  const humGain = silentGain();
  humGain.gain.setValueAtTime(0.0001, sign + 0.16);
  humGain.gain.exponentialRampToValueAtTime(0.06, sign + 0.2);
  humGain.gain.exponentialRampToValueAtTime(0.0001, sign + 1.3);
  hum.connect(humTone).connect(humGain).connect(diveBus);
  hum.start(sign + 0.16);
  hum.stop(sign + 1.4);

  // A soft open chord (A, E, A, E) swelling in under the reveal and
  // letting go as the camera pulls back. Mostly reverb.
  const pad = ctx.createGain();
  pad.gain.setValueAtTime(0.0001, t0);
  pad.gain.setValueAtTime(0.0001, sign + 0.1);
  pad.gain.exponentialRampToValueAtTime(0.05, sign + 1.2);
  pad.gain.setValueAtTime(0.05, sign + 1.6);
  pad.gain.exponentialRampToValueAtTime(0.0001, sign + 3.2);
  pad.connect(diveBus);
  send(pad, 1);
  for (const f of [220, 329.63, 440, 659.25]) {
    for (const detune of [-5, 5]) {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      o.detune.value = detune;
      o.connect(pad);
      o.start(sign + 0.1);
      o.stop(sign + 3.3);
    }
  }

  /* ---- lifetime ------------------------------------------------------ */

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    ctx.close().catch(() => {});
    if (session) session.type = "auto";
  };
  // In case the stamp never comes (a photo that never loads).
  let closeTimer = window.setTimeout(close, 12000);

  return {
    cut() {
      if (closed) return;
      diveBus.gain.setTargetAtTime(0, ctx.currentTime, 0.04);
      diveSend.gain.setTargetAtTime(0, ctx.currentTime, 0.04);
    },
    stamp() {
      if (closed) return;
      const t = ctx.currentTime;
      // A title hit, not foley: it closes the score rather than sounding
      // like a rubber stamp on a desk. Pitched to the chord's A, so it
      // lands as the last note. A boom that settles onto a low A...
      const boom = ctx.createOscillator();
      boom.frequency.setValueAtTime(95, t);
      boom.frequency.exponentialRampToValueAtTime(55, t + 0.15);
      const boomGain = ctx.createGain();
      boomGain.gain.setValueAtTime(0.0001, t);
      boomGain.gain.exponentialRampToValueAtTime(0.9, t + 0.008);
      boomGain.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
      boom.connect(boomGain).connect(master);
      boom.start(t);
      boom.stop(t + 1.7);
      // ...a dark burst that blooms into the room...
      const body = noise(0.5);
      const bodyTone = ctx.createBiquadFilter();
      bodyTone.type = "lowpass";
      bodyTone.frequency.setValueAtTime(1200, t);
      bodyTone.frequency.exponentialRampToValueAtTime(180, t + 0.4);
      const bodyGain = ctx.createGain();
      bodyGain.gain.setValueAtTime(0.0001, t);
      bodyGain.gain.exponentialRampToValueAtTime(0.35, t + 0.008);
      bodyGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      body.connect(bodyTone).connect(bodyGain).connect(master);
      send(bodyGain, 1, verb);
      body.start(t);
      // ...and one clear bell on A, its upper partials dying first.
      for (const [ratio, level, decay] of [
        [1, 0.06, 2.2],
        [2, 0.025, 1.4],
        [2.76, 0.018, 0.9],
        [5.4, 0.008, 0.45],
      ]) {
        const o = ctx.createOscillator();
        o.frequency.value = 440 * ratio;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(level, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
        o.connect(g).connect(master);
        send(g, 0.8, verb);
        o.start(t);
        o.stop(t + decay + 0.05);
      }
      // Long enough for the room and the chord to ring out.
      clearTimeout(closeTimer);
      closeTimer = window.setTimeout(close, 3500);
    },
    stop() {
      clearTimeout(closeTimer);
      if (closed) return;
      // A quick fade rather than a click.
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
      window.setTimeout(close, 150);
    },
  };
}
