/**
 * QuizTimer — a countdown ring that builds urgency without panic.
 *
 * LESSONS:
 *  - Signal time with SEVERAL channels, not colour alone: the ring shrinks,
 *    the colour shifts, the number ticks, and in the last seconds it pulses
 *    with a soft tick. Colour-blind players still get the message.
 *  - Ramp urgency late (last ~5 s). A timer that pulses the whole time is
 *    just noise, and constant pressure hurts learning.
 *  - "Time's up" should be calm and move on. Offer an untimed mode for
 *    learners who need it.
 *  - The ring is redrawn with Graphics.arc every frame. It is one shape, so
 *    that is cheap.
 */
class QuizTimer extends BaseEffect {
  static id = 'timer';
  static title = 'Quiz Timer';
  static group = 'feedback';
  static tags = ['learning', 'games'];
  static useFor = 'Timed quizzes, speed rounds, turn timers, "beat the clock" mini-games.';
  static mode = 'tap';
  static hint = 'Watch the last seconds. Click to add +5 s (a power-up).';
  static file = 'js/effects/QuizTimer.js';
  static uses = ['js/fx/Juice.js'];
  static summary = 'A ring that drains, shifts green → amber → coral, and in the final seconds pulses with a soft tick. Time up is calm. A click adds a +5 s bonus.';
  static steps = [
    'Each frame: remaining / total → arc angle. Graphics.arc draws from the top, clockwise.',
    'Colour is interpolated between green, amber and coral by the fraction left.',
    'Last N seconds: the number pops each second, the ring pulses once, a soft tick plays.',
    'Bonus: "+5s" floats up, and the ring sweeps back with Back.easeOut so the gain is visible.',
    'Time up: the clock wobbles once, "Time\'s up, let\'s see the answer" appears, then a restart.',
    'Reduced motion keeps the colour and number, drops the pulses.'
  ];
  static params = [
    { key: 'seconds', label: 'Seconds', min: 5, max: 30, step: 1, value: 10 },
    { key: 'urgent', label: 'Urgent at (s)', min: 2, max: 10, step: 1, value: 5 }
  ];

  start() {
    const s = this.scene;
    this.total = this.p.seconds;
    this.left = this.total;
    this.shown = Math.ceil(this.left);
    this.running = true;
    this.ringX = this.cx;
    this.ringY = this.cy - 20;
    this.R = 110;
    this.track(s.add.circle(this.ringX, this.ringY, this.R + 18, 0x19142e).setStrokeStyle(2, 0x2c2550));
    this.glow = this.track(s.add.image(this.ringX, this.ringY, 'fx-glow').setScale(3).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.25).setDepth(1));
    this.ring = this.track(s.add.graphics().setDepth(5));
    this.dial = this.track(s.add.container(this.ringX, this.ringY).setDepth(6));
    this.num = Juice.text(s, 0, -4, String(this.shown), 64, '#ece8ff');
    this.sub = Juice.text(s, 0, 44, 'seconds', 14, '#9b93c4', { body: true });
    this.dial.add([this.num, this.sub]);
    this.msg = this.track(Juice.text(s, this.cx, this.cy + 170, 'What is 7 × 8?', 24, '#ece8ff'));
    this.color = new Phaser.Display.Color();
  }

  autoPlay() {}

  colorFor(f) {
    const C = Phaser.Display.Color;
    const green = C.ValueToColor(0x2fd48a);
    const amber = C.ValueToColor(0xffc94a);
    const coral = C.ValueToColor(0xff6b6b);
    const mix = f > 0.5
      ? C.Interpolate.ColorWithColor(amber, green, 100, (f - 0.5) * 200)
      : C.Interpolate.ColorWithColor(coral, amber, 100, f * 200);
    return C.GetColor(mix.r, mix.g, mix.b);
  }

  draw(frac) {
    const col = this.colorFor(frac);
    const g = this.ring;
    g.clear();
    g.lineStyle(16, 0x2c2550, 1).beginPath().arc(this.ringX, this.ringY, this.R, 0, Math.PI * 2).strokePath();
    if (frac > 0) {
      g.lineStyle(16, col, 1).beginPath();
      g.arc(this.ringX, this.ringY, this.R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac, false);
      g.strokePath();
      // end cap dot
      const a = -Math.PI / 2 + Math.PI * 2 * frac;
      g.fillStyle(0xffffff, 1).fillCircle(this.ringX + Math.cos(a) * this.R, this.ringY + Math.sin(a) * this.R, 5);
    }
    this.glow.setTint(col);
  }

  update(time, delta) {
    if (this.running) {
      this.left = Math.max(0, this.left - (delta * Juice.timeScale) / 1000);
      const sec = Math.ceil(this.left);
      if (sec !== this.shown) { this.shown = sec; this.tick(sec); }
      if (this.left <= 0) this.timeUp();
    }
    if (!this.bonusAnim) this.draw(this.left / this.total);
  }

  tick(sec) {
    const s = this.scene;
    this.num.setText(String(sec));
    if (sec > this.p.urgent || sec <= 0) return;
    // urgency: number pops, ring pulses, soft tick (higher as it gets closer)
    Juice.sfx('tone', 660 + (this.p.urgent - sec) * 60, 0.06, 'square', 0.035);
    if (Juice.reduced) return;
    s.tweens.add({ targets: this.num, scale: { from: 1.35, to: 1 }, duration: 260, ease: 'Back.easeOut' });
    Juice.shockwave(s, this.ringX, this.ringY, this.colorFor(this.left / this.total), 1.6, 500, 4);
  }

  async timeUp() {
    const s = this.scene;
    this.running = false;
    this.num.setText('0');
    Juice.sfx('tone', 392, 0.3, 'triangle', 0.08);
    Juice.sfx('tone', 330, 0.4, 'triangle', 0.07, 0.18);
    if (!Juice.reduced) s.tweens.add({ targets: this.dial, angle: { from: -8, to: 8 }, duration: 90, yoyo: true, repeat: 2, onComplete: () => this.dial.setAngle(0) });
    this.msg.setText("Time's up! Let's look at the answer together.").setColor('#ffd88a');
    Juice.pop(s, this.msg, 0.08, 300);
    await Juice.wait(s, 2400);
    if (s.sys.isActive()) s.restartEffect(false);
  }

  async play() {
    if (!this.running || this.bonusAnim) return;
    const s = this.scene;
    const from = this.left / this.total;
    this.left = Math.min(this.total, this.left + 5);
    this.shown = Math.ceil(this.left);
    this.num.setText(String(this.shown));
    Juice.floatText(s, this.ringX + 120, this.ringY - 100, '+5s', '#4fe0c8', 30);
    Juice.sfx('sparkle');
    this.bonusAnim = true;
    const o = { f: from };
    await Juice.tween(s, { targets: o, f: this.left / this.total, duration: 420, ease: 'Back.easeOut', onUpdate: () => this.draw(Math.min(1, o.f)) });
    this.bonusAnim = false;
  }
}
