/**
 * QuizTimer — a countdown ring that ramps urgency only at the end.
 *   const timer = this.fx.timer(860, 90, { seconds: 20, urgentAt: 5, onTimeUp: () => this.reveal() });
 *   timer.addTime(5);  timer.pause();  timer.resume();  timer.stop();  timer.left
 * Screen-space (HUD). Signals time with ring, colour, number AND sound,
 * so it never relies on colour alone.
 */
class QuizTimer extends Component {
  constructor(fx, x, y, o = {}) {
    super(fx);
    const sc = this.scene;
    this.o = o;
    this.total = o.seconds || 10;
    this.left = this.total;
    this.shown = Math.ceil(this.left);
    this.urgent = o.urgentAt != null ? o.urgentAt : 5;
    this.R = o.radius || 46;
    this.x = x; this.y = y;
    this.running = o.autoStart !== false;
    const depth = o.depth != null ? o.depth : this.j.depth(500);
    this.track(this.j.ui(sc.add.circle(x, y, this.R + this.R * 0.18, 0x19142e, 0.95).setDepth(depth)));
    this.glow = this.track(this.j.ui(sc.add.image(x, y, 'pfx-glow').setScale(this.R / 40).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.25).setDepth(depth)));
    this.ring = this.track(this.j.ui(sc.add.graphics().setDepth(depth + 1)));
    this.num = this.track(this.j.ui(this.j.text(x, y, String(this.shown), Math.round(this.R * 0.62), '#ece8ff').setDepth(depth + 2)));
    this.onUpdate((t, dt) => {
      if (this.running) {
        this.left = Math.max(0, this.left - dt / 1000);
        const sec = Math.ceil(this.left);
        if (sec !== this.shown) { this.shown = sec; this.tick(sec); }
        if (this.left <= 0) this.timeUp();
      }
      if (!this.anim) this.draw(this.left / this.total);
    });
    this.draw(1);
  }

  colorFor(f) {
    const C = Phaser.Display.Color;
    const [a, b, c] = (this.o.colors || [0x2fd48a, 0xffc94a, 0xff6b6b]).map((v) => C.ValueToColor(v));
    const m = f > 0.5 ? C.Interpolate.ColorWithColor(b, a, 100, (f - 0.5) * 200) : C.Interpolate.ColorWithColor(c, b, 100, f * 200);
    return C.GetColor(m.r, m.g, m.b);
  }

  draw(frac) {
    const g = this.ring;
    const col = this.colorFor(frac);
    const lw = Math.max(6, this.R * 0.16);
    g.clear().lineStyle(lw, 0x2c2550, 1).beginPath().arc(this.x, this.y, this.R, 0, Math.PI * 2).strokePath();
    if (frac > 0) {
      g.lineStyle(lw, col, 1).beginPath().arc(this.x, this.y, this.R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac, false).strokePath();
      const a = -Math.PI / 2 + Math.PI * 2 * frac;
      g.fillStyle(0xffffff, 1).fillCircle(this.x + Math.cos(a) * this.R, this.y + Math.sin(a) * this.R, lw * 0.32);
    }
    this.glow.setTint(col);
  }

  tick(sec) {
    this.num.setText(String(sec));
    if (this.o.onTick) this.o.onTick(sec);
    if (sec > this.urgent || sec <= 0) return;
    this.j.sfx('tick', this.urgent - sec);
    if (Settings.reducedMotion) return;
    this.scene.tweens.add({ targets: this.num, scale: { from: 1.35, to: 1 }, duration: 260, ease: 'Back.easeOut' });
    this.j.ui(this.j.shockwave(this.x, this.y, this.colorFor(this.left / this.total), this.R / 70, 500, this.ring.depth - 1));
  }

  timeUp() {
    this.running = false;
    this.num.setText('0');
    this.j.sfx('tone', 392, 0.3, 'triangle', 0.08);
    this.j.sfx('tone', 330, 0.4, 'triangle', 0.07, 0.18);
    if (!Settings.reducedMotion) this.scene.tweens.add({ targets: this.num, angle: { from: -8, to: 8 }, duration: 90, yoyo: true, repeat: 2, onComplete: () => this.num.setAngle(0) });
    if (this.o.onTimeUp) this.o.onTimeUp();
  }

  start() { this.running = true; return this; }
  pause() { this.running = false; return this; }
  resume() { if (this.left > 0) this.running = true; return this; }
  stop() { this.running = false; return this; }

  /** Restart from full (optionally with a new length). */
  reset(seconds) {
    if (seconds) this.total = seconds;
    this.left = this.total;
    this.shown = Math.ceil(this.left);
    this.num.setText(String(this.shown));
    this.running = true;
    return this;
  }

  /** Bonus time with a visible refill. */
  async addTime(s = 5) {
    const from = this.left / this.total;
    this.left = Math.min(this.total, this.left + s);
    this.shown = Math.ceil(this.left);
    this.num.setText(String(this.shown));
    this.j.floatText(this.x + this.R, this.y - this.R, `+${s}s`, '#4fe0c8', 24, { screen: true });
    this.j.sfx('sparkle');
    this.anim = true;
    const o = { f: from };
    await this.j.tween({ targets: o, f: this.left / this.total, duration: 420, ease: 'Back.easeOut', onUpdate: () => this.alive && this.draw(Math.min(1, o.f)) });
    this.anim = false;
  }
}
