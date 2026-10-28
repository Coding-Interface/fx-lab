/**
 * XPLevelUp — XP orbs fly into a bar; when it fills, LEVEL UP.
 *
 * LESSONS:
 *  - Separate the TRUE value from the SHOWN value. The true XP changes
 *    instantly; the bar eases toward it every frame. That lag is what makes
 *    a bar feel like it is filling up.
 *  - Feed the bar with visible orbs, so the player sees where XP comes from.
 *  - Level-up is a "moment": flash the bar, flip the level number, shout it,
 *    then roll the overflow into the next level so no XP is lost.
 */
class XPLevelUp extends BaseEffect {
  static id = 'xp';
  static title = 'XP Bar & Level Up';
  static group = 'rewards';
  static tags = ['games', 'learning'];
  static useFor = 'Player levels, course progress, skill mastery, any "experience" system.';
  static mode = 'tap';
  static hint = 'Click anywhere to earn XP. Fill the bar to level up.';
  static file = 'js/effects/XPLevelUp.js';
  static uses = ['js/fx/Juice.js'];
  static summary = 'Glowing orbs travel from where you clicked into the bar, which eases toward the true value. A full bar flashes, the level number flips, and overflow carries over.';
  static steps = [
    'Click: N orbs spawn and each flies on its own bezier to the bar\'s current fill edge.',
    'Each orb that lands adds its share of XP and makes a short rising blip.',
    'Every frame: shown += (xp − shown) × 0.12, then the fill is redrawn. A glow sits on the leading edge.',
    'At 100%: the bar flashes white, "LEVEL UP!" stamps in over rays, and the level badge flips to the new number.',
    'Overflow XP rolls into the next level; the next level needs 25% more.'
  ];
  static params = [
    { key: 'xp', label: 'XP per click', min: 10, max: 150, step: 5, value: 45 },
    { key: 'orbs', label: 'Orbs per click', min: 1, max: 20, step: 1, value: 8 },
    { key: 'need', label: 'XP for level 2', min: 50, max: 400, step: 10, value: 120 }
  ];

  start() {
    const s = this.scene;
    this.level = 1;
    this.need = this.p.need;
    this.xp = 0;
    this.shown = 0;
    this.barX = this.cx - 250;
    this.barY = this.cy - 40;
    this.barW = 560;
    this.barH = 34;
    this.track(Juice.text(s, this.barX + this.barW / 2 - 20, this.barY - 52, 'EXPERIENCE', 13, '#9b93c4', { body: true, weight: '800' }));
    this.bar = this.track(s.add.graphics().setDepth(5));
    this.edge = this.track(s.add.image(this.barX, this.barY, 'fx-glow').setTint(0x7ff7e3).setBlendMode(Phaser.BlendModes.ADD).setScale(0.5).setDepth(6));
    this.label = this.track(Juice.text(s, this.barX + this.barW / 2, this.barY + 44, '', 16, '#ece8ff', { body: true }));
    this.badge = this.track(s.add.container(this.barX - 60, this.barY).setDepth(8));
    const disc = s.add.graphics().fillStyle(0xffc94a, 1).fillCircle(0, 0, 44).fillStyle(0x2a1d5e, 1).fillCircle(0, 0, 37);
    this.lvl = Juice.text(s, 0, 4, '1', 32, '#ffc94a');
    const tag = Juice.text(s, 0, -22, 'LV', 11, '#9b93c4', { body: true, weight: '800' });
    this.badge.add([disc, tag, this.lvl]);
    this.drawBar();
  }

  autoPlay() {
    this.scene.time.delayedCall(250, () => this.play(this.cx - 140, this.cy + 170));
    this.scene.time.delayedCall(1300, () => this.play(this.cx + 160, this.cy + 180));
    this.scene.time.delayedCall(2300, () => this.play(this.cx, this.cy + 200));
  }

  edgeX() { return this.barX + this.barW * Math.min(1, this.shown / this.need); }

  play(x, y) {
    const s = this.scene;
    const n = Juice.amount(this.p.orbs);
    const each = this.p.xp / n;
    Juice.sfx('pop');
    Juice.shockwave(s, x, y, 0x7ff7e3, 0.8, 300, 20);
    for (let i = 0; i < n; i++) {
      const orb = s.add.image(x, y, 'fx-glow').setTint(0x4fe0c8).setBlendMode(Phaser.BlendModes.ADD).setScale(0.22).setDepth(20);
      const core = s.add.image(x, y, 'fx-dot').setScale(0.6).setDepth(21);
      // burst outward first (anticipation), then home in
      const ang = Math.random() * Math.PI * 2;
      const r = Phaser.Math.Between(30, 80);
      s.tweens.add({ targets: [orb, core], x: x + Math.cos(ang) * r, y: y + Math.sin(ang) * r, duration: 220, ease: 'Quad.easeOut' });
      s.time.delayedCall(240 + i * 55, () => {
        const start = new Phaser.Math.Vector2(orb.x, orb.y);
        const end = new Phaser.Math.Vector2(this.edgeX(), this.barY);
        const ctrl = new Phaser.Math.Vector2(start.x + Phaser.Math.Between(-160, 160), Math.min(start.y, end.y) - Phaser.Math.Between(40, 180));
        const curve = new Phaser.Curves.QuadraticBezier(start, ctrl, end);
        const o = { t: 0 };
        s.tweens.add({
          targets: o, t: 1, duration: 520, ease: 'Cubic.easeIn',
          onUpdate: () => { const p = curve.getPoint(o.t); orb.setPosition(p.x, p.y); core.setPosition(p.x, p.y); },
          onComplete: () => { orb.destroy(); core.destroy(); this.gain(each, i); }
        });
      });
    }
  }

  gain(amount, i) {
    this.xp += amount;
    Juice.sfx('tone', 880 + (i % 8) * 60, 0.05, 'sine', 0.04);
    Juice.burst(this.scene, this.edgeX(), this.barY, 'fx-dot', { speed: { min: 20, max: 90 }, lifespan: 300, scale: { start: 0.4, end: 0 }, color: [0xffffff, 0x7ff7e3], blendMode: 'ADD' }, 4, 7);
    if (this.xp >= this.need && !this.levelling) this.levelUp();
  }

  async levelUp() {
    const s = this.scene;
    this.levelling = true;
    // let the bar visibly reach the end first
    while (this.shown < this.need * 0.985) { await Juice.wait(s, 30); if (!s.sys.isActive()) return; }
    const bx = this.barX + this.barW / 2;
    Juice.flash(s, 140, 0xffffff, 0.35);
    const white = s.add.rectangle(bx, this.barY, this.barW, this.barH, 0xffffff).setDepth(7);
    s.tweens.add({ targets: white, alpha: 0, scaleY: 1.8, duration: 380, onComplete: () => white.destroy() });
    const rays = Juice.rays(s, this.badge.x, this.badge.y, 0xffc94a, 12, 4);
    s.tweens.add({ targets: rays, scale: 0.45, duration: 300, ease: 'Back.easeOut' });
    s.tweens.add({ targets: rays, alpha: 0, delay: 1100, duration: 500, onComplete: () => { s.tweens.killTweensOf(rays); rays.destroy(); } });
    Juice.sfx('fanfare');
    // flip the level number
    await Juice.tween(s, { targets: this.badge, scaleX: 0, duration: 120, ease: 'Cubic.easeIn' });
    this.level += 1;
    this.lvl.setText(String(this.level));
    await Juice.tween(s, { targets: this.badge, scaleX: 1, duration: 260, ease: 'Back.easeOut' });
    Juice.pop(s, this.badge, 0.2, 320);
    Juice.burst(s, this.badge.x, this.badge.y, 'fx-star', { speed: { min: 100, max: 300 }, lifespan: 700, scale: { start: 0.6, end: 0 }, color: [0xffffff, 0xffd86b], blendMode: 'ADD' }, 24, 9);
    const t = Juice.text(s, bx, this.barY - 110, 'LEVEL UP!', 44, '#ffc94a', { stroke: '#2a1640', strokeThickness: 10 }).setDepth(30).setScale(2.4).setAlpha(0);
    await Juice.tween(s, { targets: t, scale: 1, alpha: 1, duration: 220, ease: 'Cubic.easeIn' });
    Juice.shake(s, 120, 0.004);
    s.tweens.add({ targets: t, y: t.y - 30, alpha: 0, delay: 900, duration: 400, onComplete: () => t.destroy() });
    // overflow carries into the next level
    this.xp -= this.need;
    this.shown = 0;
    this.need = Math.round(this.need * 1.25);
    this.levelling = false;
    if (this.xp >= this.need) this.levelUp();
  }

  drawBar() {
    const g = this.bar;
    const f = Math.min(1, this.shown / this.need);
    const w = this.barW;
    const h = this.barH;
    g.clear();
    g.fillStyle(0x0b0818, 1).fillRoundedRect(this.barX - 4, this.barY - h / 2 - 4, w + 8, h + 8, (h + 8) / 2);
    g.fillStyle(0x241c48, 1).fillRoundedRect(this.barX, this.barY - h / 2, w, h, h / 2);
    if (f > 0.02) {
      const fw = Math.max(h, w * f);
      g.fillStyle(0x2fbfa8, 1).fillRoundedRect(this.barX, this.barY - h / 2, fw, h, h / 2);
      g.fillStyle(0x7ff7e3, 0.55).fillRoundedRect(this.barX + 6, this.barY - h / 2 + 5, fw - 12, h * 0.28, h * 0.14);
    }
    this.edge.setPosition(this.barX + w * f, this.barY).setVisible(f > 0.02);
    this.label.setText(`${Math.floor(Math.min(this.xp, this.need))} / ${this.need} XP`);
  }

  update(time, delta) {
    const target = Math.min(this.xp, this.need);
    const k = 1 - Math.pow(0.88, (delta * Juice.timeScale) / 16.67);
    this.shown += (target - this.shown) * k;
    this.drawBar();
  }
}
