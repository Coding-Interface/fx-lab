/**
 * XPBar — experience bar with flying orbs and LEVEL UP.
 *   const xp = this.fx.xpBar(80, 40, { width: 300, need: 100, onLevelUp: (lv) => {...} });
 *   xp.add(25, enemy.x, enemy.y);   // orbs fly from a world point into the bar
 *   xp.add(10);                      // no orbs, just fill
 * The bar is screen-space (HUD). x, y = left-centre of the bar.
 */
class XPBar extends Component {
  constructor(fx, x, y, o = {}) {
    super(fx);
    const sc = this.scene;
    this.o = o;
    this.level = o.level || 1;
    this.need = o.need || 100;
    this.growth = o.growth || 1.25;
    this.xp = o.xp || 0;
    this.shown = this.xp;
    this.x = x; this.y = y;
    this.w = o.width || 300;
    this.h = o.height || 22;
    this.color = o.color || 0x2fbfa8;
    const depth = o.depth != null ? o.depth : this.j.depth(500);
    this.bar = this.track(this.j.ui(sc.add.graphics().setDepth(depth)));
    this.edge = this.track(this.j.ui(sc.add.image(x, y, 'pfx-glow').setTint(0x7ff7e3).setBlendMode(Phaser.BlendModes.ADD).setScale(this.h / 70).setDepth(depth + 1)));
    this.badge = this.track(this.j.ui(sc.add.container(x - this.h * 1.4, y).setDepth(depth + 2)));
    const r = this.h * 1.15;
    const disc = sc.add.graphics().fillStyle(0xffc94a, 1).fillCircle(0, 0, r).fillStyle(0x2a1d5e, 1).fillCircle(0, 0, r * 0.84);
    this.lvl = this.j.text(0, 1, String(this.level), Math.round(r * 0.9), '#ffc94a');
    this.badge.add([disc, this.lvl]);
    this.label = o.label === false ? null : this.track(this.j.ui(this.j.text(x + this.w / 2, y + this.h + 4, '', 13, '#ece8ff', { body: true, oy: 0 }).setDepth(depth)));
    this.onUpdate((t, dt) => {
      const target = Math.min(this.xp, this.need);
      this.shown += (target - this.shown) * (1 - Math.pow(0.88, dt / 16.67));
      this.draw();
    });
    this.draw();
  }

  draw() {
    const g = this.bar;
    const f = Math.min(1, this.shown / this.need);
    const { x, y, w, h } = this;
    g.clear();
    g.fillStyle(0x0b0818, 0.9).fillRoundedRect(x - 3, y - h / 2 - 3, w + 6, h + 6, (h + 6) / 2);
    g.fillStyle(0x241c48, 1).fillRoundedRect(x, y - h / 2, w, h, h / 2);
    if (f > 0.02) {
      const fw = Math.max(h, w * f);
      g.fillStyle(this.color, 1).fillRoundedRect(x, y - h / 2, fw, h, h / 2);
      g.fillStyle(0xffffff, 0.35).fillRoundedRect(x + 4, y - h / 2 + 3, fw - 8, h * 0.28, h * 0.14);
    }
    this.edge.setPosition(x + w * f, y).setVisible(f > 0.02);
    if (this.label) this.label.setText(`${Math.floor(Math.min(this.xp, this.need))} / ${this.need} XP`);
  }

  /** Add XP. With fromX/fromY (world), glowing orbs carry it into the bar. */
  add(amount, fromX, fromY, orbs = 8) {
    if (!this.alive) return Promise.resolve();
    if (fromX == null) { this.gain(amount); return Promise.resolve(); }
    const j = this.j;
    const sc = this.scene;
    const n = Settings.amount(orbs);
    const each = amount / n;
    const start = j.toScreen(fromX, fromY);
    j.sfx('pop');
    const jobs = [];
    for (let i = 0; i < n; i++) {
      const orb = j.ui(sc.add.image(start.x, start.y, 'pfx-glow').setTint(0x4fe0c8).setBlendMode(Phaser.BlendModes.ADD).setScale(0.22).setDepth(this.bar.depth + 3));
      const ang = Math.random() * Math.PI * 2;
      const r = Phaser.Math.Between(30, 80);
      sc.tweens.add({ targets: orb, x: start.x + Math.cos(ang) * r, y: start.y + Math.sin(ang) * r, duration: 220, ease: 'Quad.easeOut' });
      jobs.push(j.wait(240 + i * 55).then(() => j.flyTo(orb, null, { x: this.x + this.w * Math.min(1, this.shown / this.need), y: this.y }, { duration: 520 }))
        .then(() => { orb.destroy(); if (this.alive) { j.sfx('tone', 880 + (i % 8) * 60, 0.05, 'sine', 0.04); this.gain(each); } }));
    }
    return Promise.all(jobs);
  }

  gain(amount) {
    this.xp += amount;
    if (this.xp >= this.need && !this.levelling) this.levelUp();
  }

  async levelUp() {
    const j = this.j;
    this.levelling = true;
    while (this.alive && this.shown < this.need * 0.985) await j.wait(30);
    if (!this.alive) return;
    const white = j.ui(this.scene.add.rectangle(this.x + this.w / 2, this.y, this.w, this.h, 0xffffff).setDepth(this.bar.depth + 1));
    this.scene.tweens.add({ targets: white, alpha: 0, scaleY: 1.8, duration: 380, onComplete: () => white.destroy() });
    j.sfx('fanfare');
    await j.tween({ targets: this.badge, scaleX: 0, duration: 120, ease: 'Cubic.easeIn' });
    this.level += 1;
    this.lvl.setText(String(this.level));
    await j.tween({ targets: this.badge, scaleX: 1, duration: 260, ease: 'Back.easeOut' });
    j.pop(this.badge, 0.25, 320);
    j.ui(j.burst(this.badge.x, this.badge.y, 'pfx-star', { speed: { min: 80, max: 240 }, lifespan: 700, scale: { start: 0.5, end: 0 }, color: [0xffffff, 0xffd86b], blendMode: 'ADD' }, 18, this.badge.depth + 1));
    if (this.o.banner !== false) {
      const { cx, cy } = j.screen();
      const t = j.ui(j.text(cx, cy - 60, this.o.bannerText || 'LEVEL UP!', 48, '#ffc94a', { stroke: '#2a1640', strokeThickness: 10 }).setDepth(this.j.depth(650)).setScale(2.4).setAlpha(0));
      await j.tween({ targets: t, scale: 1, alpha: 1, duration: 220, ease: 'Cubic.easeIn' });
      j.shake(120, 0.004);
      this.scene.tweens.add({ targets: t, y: t.y - 30, alpha: 0, delay: 900, duration: 400, onComplete: () => t.destroy() });
    }
    this.xp -= this.need;
    this.shown = 0;
    this.need = Math.round(this.need * this.growth);
    this.levelling = false;
    if (this.o.onLevelUp) this.o.onLevelUp(this.level);
    if (this.xp >= this.need) this.levelUp();
  }
}
