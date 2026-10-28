/**
 * Streak — a streak counter whose flame grows with every hit, with a
 * multiplier banner at milestones and a kind reset.
 *   const streak = this.fx.streak(90, 300, { milestone: 3 });
 *   streak.hit();     // correct answer / successful action → returns the new streak
 *   streak.miss();    // ends the streak kindly → returns the run length
 *   streak.value, streak.best, streak.multiplier
 * Screen-space (HUD). x, y = the counter position.
 */
class Streak extends Component {
  constructor(fx, x, y, o = {}) {
    super(fx);
    const sc = this.scene;
    this.o = o;
    this.value = 0;
    this.best = 0;
    this.multiplier = 1;
    this.milestone = o.milestone || 3;
    this.growth = o.growth || 0.16;
    this.x = x; this.y = y;
    const depth = o.depth != null ? o.depth : this.j.depth(500);
    this.flame = this.track(this.j.emitter(x, y - 50, 'pfx-ember', {
      frequency: 60, lifespan: { min: 380, max: 620 }, emitZone: { type: 'random', source: new Phaser.Geom.Ellipse(0, 0, 26, 8) },
      speedY: { min: -150, max: -80 }, speedX: { min: -14, max: 14 }, scale: { start: 0.9, end: 0.1, ease: 'Quad.easeIn' },
      alpha: { start: 0.9, end: 0.2 }, color: [0xfff2c0, 0xffc23a, 0xff6a14, 0xb3220c], blendMode: 'ADD'
    }, depth).setScrollFactor(0));
    this.glow = this.track(this.j.ui(sc.add.image(x, y - 70, 'pfx-glow').setTint(0xff8a2a).setBlendMode(Phaser.BlendModes.ADD).setScale(0.8).setAlpha(0.4).setDepth(depth - 1)));
    this.count = this.track(this.j.ui(this.j.text(x, y + 6, '0', 40, '#ffc94a').setDepth(depth + 1)));
    this.caption = this.track(this.j.ui(this.j.text(x, y + 40, o.label || 'in a row', 13, '#9b93c4', { body: true }).setDepth(depth + 1)));
    this.multi = this.track(this.j.ui(this.j.text(x, y + 66, '×1', 18, '#ece8ff').setDepth(depth + 1)));
    this.setFlame(0);
  }

  setFlame(n) {
    const k = 1 + n * this.growth;
    const sc = { start: 0.9 * k, end: 0.1, ease: 'Quad.easeIn' };
    this.flame.ops.scaleX.loadConfig({ scaleX: sc });
    this.flame.ops.scaleY.loadConfig({ scaleY: sc });
    this.flame.ops.speedY.loadConfig({ speedY: { min: -150 * Math.sqrt(k), max: -80 * Math.sqrt(k) } });
    this.flame.frequency = Math.max(14, 60 / k);
    this.scene.tweens.add({ targets: this.glow, scale: 0.8 * k, alpha: Math.min(0.9, 0.3 + n * 0.06), duration: 300 });
  }

  hit() {
    if (!this.alive) return this.value;
    const j = this.j;
    this.value += 1;
    this.best = Math.max(this.best, this.value);
    this.count.setText(String(this.value));
    const C = Phaser.Display.Color;
    const warm = C.Interpolate.ColorWithColor(C.ValueToColor(0xffc94a), C.ValueToColor(0xff5fa2), 10, Math.min(10, this.value));
    this.count.setColor(C.RGBToString(warm.r, warm.g, warm.b));
    j.pop(this.count, 0.3, 320);
    this.setFlame(this.value);
    j.sfx('tone', 523 * 2 ** (Math.min(this.value, 12) / 12), 0.16, 'triangle', 0.1);
    j.ui(j.burst(this.x, this.y - 40, 'pfx-dot', { speed: { min: 60, max: 180 }, angle: { min: -150, max: -30 }, lifespan: 500, scale: { start: 0.5, end: 0 }, color: [0xffe680, 0xff7a1a], blendMode: 'ADD' }, 10 + this.value * 2, this.count.depth));
    if (this.value % this.milestone === 0) {
      this.multiplier = 1 + this.value / this.milestone;
      this.multi.setText(`×${this.multiplier}`);
      j.pop(this.multi, 0.4, 360);
      if (this.o.banner !== false) this.banner(this.multiplier);
      if (this.o.onMilestone) this.o.onMilestone(this.value, this.multiplier);
    }
    return this.value;
  }

  async banner(mult) {
    const j = this.j;
    const sc = this.scene;
    const { w, cx, cy } = j.screen();
    const band = j.ui(sc.add.container(-w / 2, cy - 20).setDepth(j.depth(650)));
    band.add([sc.add.rectangle(0, 0, w, 96, this.o.bannerColor || 0xff5fa2, 0.92).setAngle(-4),
      j.text(0, 0, `${this.o.bannerText || 'ON FIRE!'}  ×${mult}`, 46, '#ffffff', { stroke: '#7a1040', strokeThickness: 8 }).setAngle(-4)]);
    j.ui(band);
    j.sfx('fanfare');
    await j.tween({ targets: band, x: cx, duration: 360, ease: 'Back.easeOut' });
    j.ui(j.burst(cx, cy - 20, 'pfx-star', { speed: { min: 150, max: 420 }, lifespan: 700, scale: { start: 0.7, end: 0 }, color: [0xffffff, 0xffd86b, 0xff5fa2], blendMode: 'ADD' }, 30, band.depth + 1));
    await j.wait(650);
    await j.tween({ targets: band, x: w * 1.5, duration: 300, ease: 'Cubic.easeIn' });
    band.destroy();
  }

  /** End the streak kindly. Shows an optional message and returns the run length. */
  miss(message) {
    if (!this.alive) return 0;
    const run = this.value;
    this.value = 0;
    this.multiplier = 1;
    this.count.setText('0').setColor('#ffc94a');
    this.multi.setText('×1');
    this.setFlame(0);
    this.j.sfx('soft');
    const msg = message !== undefined ? message : (run > 1 ? `Streak of ${run}. Great run!` : null);
    if (msg) this.j.floatText(this.x, this.y - 100, msg, '#ffd88a', 16, { screen: true, rise: 30, hold: 900 });
    return run;
  }
}
