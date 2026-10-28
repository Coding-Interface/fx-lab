/**
 * Synth — tiny Web Audio sound effects so every effect has a sound out of the
 * box, with no audio files. Shared by all scenes.
 *
 * Replace or silence it with PhaserFX.settings.soundHandler / .sound.
 */
class Synth {
  static ctx = null;

  static _ctx() {
    if (!Settings.sound || Settings.volume <= 0) return null;
    if (!Synth.ctx) {
      const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
      if (!AC) return null;
      try { Synth.ctx = new AC(); } catch (e) { return null; }
    }
    if (Synth.ctx.state === 'suspended') Synth.ctx.resume();
    return Synth.ctx;
  }

  /**
   * Browsers (iOS Safari especially) only allow audio after the player taps or
   * presses a key. Start the audio context on the first input, so the first
   * effect sound isn't lost.
   */
  static unlockOnInput() {
    if (Synth._unlockArmed || typeof window === 'undefined') return;
    Synth._unlockArmed = true;
    const events = ['pointerdown', 'touchend', 'keydown'];
    const go = () => {
      const ctx = Synth._ctx();
      if (ctx && ctx.state === 'running') events.forEach((e) => window.removeEventListener(e, go, true));
    };
    events.forEach((e) => window.addEventListener(e, go, true));
  }

  /** Play a named sound ('pop', 'coin', …). Goes through soundHandler first. */
  static play(name, ...args) {
    if (Settings.soundHandler) {
      try { if (Settings.soundHandler(name, ...args) === true) return; } catch (e) { /* user handler failed: fall back */ }
    }
    if (typeof Synth[name] === 'function' && !['play', '_ctx'].includes(name)) Synth[name](...args);
  }

  static tone(freq, dur = 0.15, type = 'sine', vol = 0.12, delay = 0, slideTo = null) {
    const ctx = Synth._ctx();
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * Settings.volume), t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  static noise(dur = 0.3, vol = 0.15, delay = 0, lowpass = 1200) {
    const ctx = Synth._ctx();
    if (!ctx) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = lowpass;
    const g = ctx.createGain();
    g.gain.value = vol * Settings.volume;
    src.connect(f).connect(g).connect(ctx.destination);
    src.start(ctx.currentTime + delay);
  }

  /** Filtered noise whose filter sweeps from one frequency to another (swishes, risers). */
  static sweep(dur = 0.4, vol = 0.12, delay = 0, from = 600, to = 5000, type = 'bandpass') {
    const ctx = Synth._ctx();
    if (!ctx) return;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) { const k = i / len; d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * k) ** 1.5; }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = 1.4;
    const t = ctx.currentTime + delay;
    f.frequency.setValueAtTime(from, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(40, to), t + dur);
    const g = ctx.createGain();
    g.gain.value = vol * Settings.volume;
    src.connect(f).connect(g).connect(ctx.destination);
    src.start(t);
  }

  // ---------------------------------------------------------- transition sounds
  // These take the length of the cover/reveal half in ms, so they fit the motion.

  /** Sounds that accept a duration (ms) as their first argument. */
  static TIMED = ['swish', 'shutter', 'rumble', 'slide', 'riser', 'bloop', 'glitch', 'tickTock', 'whoosh'];

  /** Sounds made for transitions (the Studio lists these first). */
  static TRANSITION_SOUNDS = ['whoosh', 'swish', 'shutter', 'slide', 'thud', 'rumble', 'riser', 'bloop', 'glitch', 'tickTock', 'chime', 'sparkle', 'fanfare', 'soft', 'pop', 'flip'];

  static swish(ms = 400) { const d = Math.min(1.2, Math.max(0.15, ms / 1000)); Synth.sweep(d, 0.16, 0, 500, 6000); }

  static shutter(ms = 600) {
    const n = 8;
    const span = Math.max(0.2, (ms / 1000) * 0.7);
    Synth.sweep(span + 0.1, 0.07, 0, 800, 4000);
    for (let i = 0; i < n; i++) {
      const at = (i / (n - 1)) * span;
      Synth.noise(0.035, 0.16, at, 6500);
      Synth.tone(240 + i * 14, 0.035, 'square', 0.025, at);
    }
  }

  static rumble(ms = 900) {
    const d = Math.min(2, Math.max(0.3, ms / 1000));
    Synth.tone(72, d, 'sine', 0.2, 0, 52);
    Synth.noise(d, 0.1, 0, 380);
  }

  static slide(ms = 500) {
    const d = Math.min(1.2, Math.max(0.15, ms / 1000));
    Synth.tone(520, d, 'triangle', 0.05, 0, 170);
    Synth.sweep(d, 0.08, 0, 3000, 600);
  }

  static thud() { Synth.tone(95, 0.28, 'sine', 0.3, 0, 45); Synth.noise(0.12, 0.2, 0, 500); }

  static riser(ms = 600) {
    const d = Math.min(1.5, Math.max(0.2, ms / 1000));
    Synth.tone(180, d, 'sawtooth', 0.035, 0, 1100);
    Synth.sweep(d, 0.1, 0, 400, 7000);
  }

  static bloop(ms = 600) {
    const span = Math.max(0.2, (ms / 1000) * 0.8);
    for (let i = 0; i < 7; i++) Synth.tone(380 + Math.random() * 500, 0.09, 'sine', 0.07, (i / 6) * span, 900 + Math.random() * 600);
  }

  static glitch(ms = 500) {
    const span = Math.max(0.15, (ms / 1000) * 0.8);
    for (let i = 0; i < 10; i++) Synth.tone(200 + Math.random() * 1600, 0.03, 'square', 0.025, (i / 9) * span);
  }

  static tickTock(ms = 800) {
    const n = 5;
    const span = Math.max(0.2, (ms / 1000) * 0.85);
    for (let i = 0; i < n; i++) Synth.tone(i % 2 ? 980 : 1320, 0.05, 'square', 0.03, (i / (n - 1)) * span);
  }

  static pop() { Synth.tone(420, 0.1, 'triangle', 0.12, 0, 820); }
  static sparkle() { [1568, 2093, 2637].forEach((f, i) => Synth.tone(f, 0.18, 'sine', 0.05, i * 0.05)); }
  static whoosh(ms = 450) { Synth.noise(Math.min(1, Math.max(0.2, ms / 1000)), 0.12, 0, 2400); }
  static boom() { Synth.tone(110, 0.5, 'sine', 0.3, 0, 40); Synth.noise(0.5, 0.25, 0, 700); }
  static coin() { Synth.tone(1319, 0.07, 'square', 0.03); Synth.tone(1976, 0.12, 'square', 0.03, 0.05); }
  static flip() { Synth.noise(0.12, 0.08, 0, 4000); }
  static crack() { Synth.noise(0.18, 0.3, 0, 5000); Synth.tone(1800, 0.05, 'square', 0.04); }
  static charge(step = 0) { Synth.tone(330 * 2 ** (step / 4), 0.22, 'triangle', 0.08); }
  static fanfare() { [523, 659, 784, 1047].forEach((f, i) => Synth.tone(f, 0.3, 'triangle', 0.1, i * 0.09)); }
  static chime() { [784, 988, 1175, 1568].forEach((f, i) => Synth.tone(f, 0.4, 'sine', 0.06, i * 0.07)); }
  static correct() { Synth.tone(784, 0.14, 'triangle', 0.1); Synth.tone(1175, 0.22, 'triangle', 0.1, 0.09); }
  static soft() { Synth.tone(330, 0.16, 'sine', 0.07); Synth.tone(294, 0.2, 'sine', 0.06, 0.12); }
  static tick(step = 0) { Synth.tone(660 + step * 60, 0.06, 'square', 0.035); }
  static hit() { Synth.tone(180, 0.08, 'square', 0.08, 0, 90); }
  static blip(pitch = 520) { Synth.tone(pitch * (0.92 + Math.random() * 0.16), 0.04, 'square', 0.025); }
}
