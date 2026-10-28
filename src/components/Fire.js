/**
 * Fire — campfire / torch flames with smoke, embers and flickering light.
 *   const fire = this.fx.fire(400, 500, { size: 1, wind: 30, smoke: 5 });
 *   fire.setPosition(x, y);  fire.setWind(-80);  fire.destroy();
 * Flames are ADD-blended (light), smoke is NORMAL (matter).
 */
class Fire extends Component {
  constructor(fx, x, y, o = {}) {
    super(fx);
    const k = o.size || 1;
    const wind = o.wind || 0;
    const smoke = o.smoke != null ? o.smoke : 5;
    const depth = o.depth != null ? o.depth : this.j.depth(15);
    this.k = k;
    this.x = x;
    this.y = y;
    this.light = this.track(this.scene.add.image(x, y - 40 * k, 'pfx-glow').setTint(o.lightColor || 0xff8a2a).setBlendMode(Phaser.BlendModes.ADD).setScale(3.2 * k).setAlpha(o.light === false ? 0 : 0.35).setDepth(depth - 3));
    this.smoke = this.track(this.j.emitter(x, y - 70 * k, 'pfx-smoke', {
      frequency: smoke ? 900 / smoke : -1, lifespan: { min: 2600, max: 3600 }, speedY: { min: -70, max: -40 }, speedX: { min: -12, max: 12 },
      scale: { start: 0.4 * k, end: 2.4 * k }, rotate: { min: 0, max: 360 }, tint: o.smokeColors || [0x3c3550, 0x4a4360, 0x2e2840],
      alpha: { onUpdate: (p, key, t) => Math.sin(t * Math.PI) * 0.4 }
    }, depth - 2));
    this.flame = this.track(this.j.emitter(x, y - 6, 'pfx-ember', {
      frequency: Settings.reducedMotion ? 40 : 22, quantity: 1,
      emitZone: { type: 'random', source: new Phaser.Geom.Ellipse(0, 0, 80 * k, 14 * k) },
      lifespan: { min: 550, max: 950 }, speedY: { min: -200 * k, max: -110 * k }, speedX: { min: -20, max: 20 },
      scale: { start: 1.5 * k, end: 0.15 * k, ease: 'Quad.easeIn' }, alpha: { start: 0.85, end: 0.2 },
      color: o.colors || [0xfff2c0, 0xffc23a, 0xff6a14, 0xb3220c, 0x1a0602], colorEase: 'Sine.easeOut', blendMode: 'ADD'
    }, depth));
    this.embers = this.track(this.j.emitter(x, y - 20, 'pfx-dot', {
      frequency: 140, lifespan: { min: 1600, max: 2600 }, speedY: { min: -160, max: -70 }, speedX: { min: -40, max: 40 },
      accelerationY: { min: -20, max: 10 }, scale: { start: 0.35 * k, end: 0 }, color: [0xffe680, 0xff7a1a, 0x802008], blendMode: 'ADD'
    }, depth + 1));
    this.setWind(wind);
    this.lightOn = o.light !== false;
    this.next = 0;
    this.onUpdate((t) => {
      if (!this.lightOn || t < this.next) return;
      this.next = t + Phaser.Math.Between(60, 140) / this.j.timeScale;
      const a = Settings.reducedMotion ? 0.33 : Phaser.Math.FloatBetween(0.26, 0.42);
      this.scene.tweens.add({ targets: this.light, alpha: a, scale: 3.2 * this.k * Phaser.Math.FloatBetween(0.95, 1.06), duration: 90 });
    });
  }

  /** Wind uses gravityX, so flames and smoke already in the air bend too. */
  setWind(w) {
    this.flame.gravityX = w * 0.3;
    this.smoke.gravityX = w * 0.6;
    this.embers.gravityX = w * 0.45;
    return this;
  }

  setPosition(x, y) {
    const dx = x - this.x;
    const dy = y - this.y;
    [this.flame, this.smoke, this.embers, this.light].forEach((o) => { o.x += dx; o.y += dy; });
    this.x = x; this.y = y;
    return this;
  }

  /** A puff of sparks (e.g. when a log is added). */
  flare() {
    this.j.burst(this.x, this.y - 20, 'pfx-dot', { speed: { min: 80, max: 260 }, angle: { min: -150, max: -30 }, gravityY: 300, lifespan: 900, scale: { start: 0.4, end: 0 }, color: [0xffe680, 0xff7a1a], blendMode: 'ADD' }, 24, this.flame.depth + 2);
    this.j.sfx('whoosh');
  }
}
