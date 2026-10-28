/**
 * FXSound — synthesised sound effects (Web Audio, no files).
 * LESSON: sound is half of "juice". A sparkle with a rising chime feels twice as
 * magical as the same sparkle in silence. Match sound timing to the visual beat.
 */
class FXSound {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  _ctx() {
    if (this.muted) return null;
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  tone(freq, dur = 0.15, type = 'sine', vol = 0.12, delay = 0, slideTo = null) {
    const ctx = this._ctx();
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  noise(dur = 0.3, vol = 0.15, delay = 0, lowpass = 1200) {
    const ctx = this._ctx();
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
    g.gain.value = vol;
    src.connect(f).connect(g).connect(ctx.destination);
    src.start(ctx.currentTime + delay);
  }

  pop() { this.tone(420, 0.1, 'triangle', 0.12, 0, 820); }
  sparkle() { [1568, 2093, 2637].forEach((f, i) => this.tone(f, 0.18, 'sine', 0.05, i * 0.05)); }
  whoosh() { this.noise(0.45, 0.12, 0, 2400); }
  boom() { this.tone(110, 0.5, 'sine', 0.3, 0, 40); this.noise(0.5, 0.25, 0, 700); }
  coin() { this.tone(1319, 0.07, 'square', 0.03); this.tone(1976, 0.12, 'square', 0.03, 0.05); }
  flip() { this.noise(0.12, 0.08, 0, 4000); }
  crack() { this.noise(0.18, 0.3, 0, 5000); this.tone(1800, 0.05, 'square', 0.04); }
  /** rising "charge" note used for anticipation: step 0,1,2… goes higher */
  charge(step) { this.tone(330 * 2 ** (step / 4), 0.22, 'triangle', 0.08); }
  fanfare() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.1, i * 0.09)); }
  chime() { [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.4, 'sine', 0.06, i * 0.07)); }
}
