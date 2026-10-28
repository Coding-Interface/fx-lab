/**
 * StarRating — results panel: score rolls up, stars slam in one by one.
 *   const panel = await this.fx.starRating(2, { score: 870, title: 'LESSON COMPLETE' });
 *   panel.destroy();
 * Options: x, y (screen), score, title, message, gap (ms), confetti (default: on for 3/3),
 * width, height, colors { panel, edge, banner, bannerText }.
 */
class StarRating extends Component {
  static MESSAGES = ['Good effort! Try again for a star.', 'Nice start! You earned a star.', 'Great work! Two stars!', 'Perfect! All three stars!'];

  constructor(fx, stars, o = {}) {
    super(fx);
    const sc = this.scene;
    const { cx, cy } = this.j.screen();
    const W = o.width || 520;
    const H = o.height || 400;
    const col = { panel: 0x221a44, edge: 0x4a3f7c, banner: 0x2fd48a, bannerText: '#0b2b20', ...(o.colors || {}) };
    this.stars = Phaser.Math.Clamp(stars, 0, 3);
    this.o = o;
    this.panel = this.track(this.j.ui(sc.add.container(o.x != null ? o.x : cx, o.y != null ? o.y : cy).setDepth(this.j.depth(600)).setScale(0.6).setAlpha(0)));
    const g = sc.add.graphics();
    g.fillStyle(0x07050f, 0.6).fillRoundedRect(-W / 2, -H / 2 + 8, W, H, 28);
    g.fillStyle(col.panel, 1).fillRoundedRect(-W / 2, -H / 2, W, H, 28).lineStyle(3, col.edge, 1).strokeRoundedRect(-W / 2, -H / 2, W, H, 28);
    g.fillStyle(col.banner, 1).fillRoundedRect(-150, -H / 2 - 28, 300, 56, 28);
    const title = this.j.text(0, -H / 2, o.title || 'LEVEL COMPLETE', 20, col.bannerText);
    this.slots = [-130, 0, 130].map((x, i) => sc.add.image(x, -H / 2 + 134 + (i === 1 ? -22 : 0), 'pfx-star5-empty').setScale(i === 1 ? 1.15 : 0.95));
    this.panel.add([g, title, ...this.slots]);
    if (o.score != null) {
      this.panel.add(this.j.text(0, H / 2 - 148, o.scoreLabel || 'SCORE', 13, '#9b93c4', { body: true }));
      this.scoreText = this.j.text(0, H / 2 - 108, '0', 46, '#ffc94a');
      this.panel.add(this.scoreText);
    }
    this.msg = this.j.text(0, H / 2 - 48, '', 18, '#ece8ff', { body: true, wrap: W - 60 });
    this.panel.add(this.msg);
    this.done = this.run();
  }

  async run() {
    const j = this.j;
    const o = this.o;
    j.sfx('whoosh');
    await j.tween({ targets: this.panel, scale: 1, alpha: 1, duration: 420, ease: 'Back.easeOut' });
    const counting = this.scoreText ? j.countUp(this.scoreText, 0, o.score, 900) : Promise.resolve();
    await j.wait(300);
    for (let i = 0; i < 3; i++) {
      if (!this.alive) return this;
      if (i < this.stars) await this.slam(i);
      else this.scene.tweens.add({ targets: this.slots[i], alpha: { from: 1, to: 0.55 }, duration: 700, yoyo: true, repeat: 1 });
      await j.wait(o.gap || 420);
    }
    await counting;
    if (!this.alive) return this;
    this.msg.setText(o.message || StarRating.MESSAGES[this.stars]).setAlpha(0);
    this.scene.tweens.add({ targets: this.msg, alpha: 1, duration: 300 });
    if (o.confetti !== false && (o.confetti || this.stars === 3)) Particles.confetti(this.fx, { sound: false });
    if (this.stars === 3) j.sfx('fanfare');
    return this;
  }

  async slam(i) {
    const j = this.j;
    const slot = this.slots[i];
    const size = i === 1 ? 1.15 : 0.95;
    const star = this.scene.add.image(slot.x, slot.y, 'pfx-star5').setScale(size * 3).setAngle(-40).setAlpha(0);
    this.panel.add(star);
    await j.tween({ targets: star, scale: size, angle: 0, alpha: 1, duration: 260, ease: 'Cubic.easeIn' });
    const wx = this.panel.x + slot.x;
    const wy = this.panel.y + slot.y;
    j.sfx('tone', [659, 784, 1047][i], 0.25, 'triangle', 0.11);
    j.sfx('sparkle');
    j.shake(90, 0.003 + i * 0.002);
    j.ui(j.shockwave(wx, wy, 0xffd86b, 1.4 + i * 0.3, 420, this.panel.depth + 1));
    j.ui(j.burst(wx, wy, 'pfx-star', { speed: { min: 100, max: 260 + i * 60 }, lifespan: { min: 400, max: 750 }, scale: { start: 0.55, end: 0 }, rotate: { min: 0, max: 360 }, color: [0xffffff, 0xffd86b], blendMode: 'ADD' }, 14 + i * 8, this.panel.depth + 1));
    j.pop(star, 0.18, 280);
  }

  /** Slide the panel away and remove it. */
  async close() {
    if (!this.alive) return;
    await this.j.tween({ targets: this.panel, scale: 0.8, alpha: 0, duration: 220, ease: 'Back.easeIn' });
    this.destroy();
  }
}
