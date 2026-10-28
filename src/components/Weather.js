/**
 * Weather — screen-space rain, snow, leaves or petals with depth (near + far layers).
 *   const w = this.fx.weather('rain', { amount: 6, wind: 60, lightning: true, ground: 520 });
 *   w.gust();  w.setWind(-120);  w.destroy();
 * Types: 'rain' | 'snow' | 'leaves' | 'petals'. Wind is gravityX, so gusts bend
 * particles already in the air. `ground` (screen y) is where rain splashes.
 */
class Weather extends Component {
  constructor(fx, type = 'rain', o = {}) {
    super(fx);
    this.type = type;
    this.wind = o.wind != null ? o.wind : 40;
    const { w, h } = this.j.screen();
    this.W = w;
    this.ground = o.ground != null ? o.ground : h;
    const amount = o.amount || 6;
    const depth = o.depth != null ? o.depth : this.j.depth(350);
    this.layers = [this.make(0.5, amount, depth - 2), this.make(1, amount, depth)];
    if (type === 'rain') {
      if (o.splashes !== false) {
        this.splash = this.track(this.j.emitter(0, this.ground, 'pfx-dot', {
          emitZone: { type: 'random', source: new Phaser.Geom.Line(0, 0, w, 0) }, frequency: 140 / amount, lifespan: 260,
          speedY: { min: -120, max: -60 }, speedX: { min: -50, max: 50 }, gravityY: 600, scale: { start: 0.18, end: 0.05 }, alpha: 0.7, tint: 0xbfd6ff
        }, depth - 1).setScrollFactor(0));
        this.splash.windK = 0;
      }
      if (o.lightning) { this.lightning = true; this.nextBolt = 2500; }
    }
    this.setWind(this.wind);
    this.onUpdate((t, dt) => {
      if (!this.lightning) return;
      this.nextBolt -= dt;
      if (this.nextBolt <= 0) { this.bolt(); this.nextBolt = Phaser.Math.Between(4000, 9000); }
    });
  }

  make(k, amount, depth) {
    const near = k === 1;
    const zone = { type: 'random', source: new Phaser.Geom.Line(-300, 0, this.W + 300, 0) };
    let cfg;
    let tex;
    if (this.type === 'rain') {
      tex = 'pfx-drop';
      cfg = {
        emitZone: zone, frequency: 40 / Settings.amount(amount) / k, quantity: near ? 2 : 1, speedY: { min: 950 * k, max: 1150 * k },
        lifespan: ((this.ground + 40) / (1050 * k)) * 1000 * (near ? 1 : 0.8), scaleY: near ? 1.2 : 0.6, scaleX: near ? 1 : 0.6,
        alpha: near ? 0.75 : 0.35, tint: 0xbfd6ff, rotate: { onUpdate: (p) => Phaser.Math.RadToDeg(Math.atan2(p.velocityY, p.velocityX)) - 90 }
      };
    } else if (this.type === 'snow') {
      tex = 'pfx-dot';
      cfg = {
        emitZone: zone, frequency: 120 / Settings.amount(amount) / k, lifespan: 12000, speedY: { min: 30 * k + 20, max: 70 * k + 20 },
        speedX: { min: -20, max: 20 }, accelerationX: { min: -10, max: 10 }, scale: near ? { min: 0.3, max: 0.5 } : { min: 0.1, max: 0.2 }, alpha: near ? 0.95 : 0.55
      };
    } else {
      const leaves = this.type === 'leaves';
      tex = 'pfx-leaf';
      cfg = {
        emitZone: zone, frequency: (leaves ? 420 : 260) / Settings.amount(amount) / k, lifespan: 12000,
        speedY: { min: 50 * k + 20, max: 110 * k + 20 }, speedX: { min: -30, max: 30 },
        tint: leaves ? [0xe8833a, 0xd4572a, 0xf2b84b, 0xa8452a] : [0xffc2d9, 0xff9cc2, 0xffe3ee],
        scale: near ? { min: leaves ? 1.1 : 0.6, max: leaves ? 1.5 : 0.9 } : { min: 0.45, max: 0.7 }, alpha: near ? 1 : 0.55,
        rotate: { onEmit: (p) => { p.pfxSpin = Phaser.Math.FloatBetween(-3, 3); return Phaser.Math.Between(0, 360); }, onUpdate: (p, kk, t, v) => v + p.pfxSpin },
        scaleY: { onEmit: (p) => { p.pfxWob = Math.random() * 6.28; return 1; }, onUpdate: (p, kk, t) => Math.cos(p.pfxWob + t * 40) * (near ? 1.3 : 0.6) }
      };
    }
    const em = this.track(this.j.emitter(0, -30, tex, { maxParticles: 900, ...cfg }, depth).setScrollFactor(0));
    em.windK = this.type === 'rain' ? 0.6 : near ? 1 : 0.6;
    return em;
  }

  setWind(w) {
    this.wind = w;
    [...this.layers, this.splash].filter(Boolean).forEach((em) => { this.scene.tweens.killTweensOf(em); em.gravityX = w * em.windK; });
    return this;
  }

  /** A gust of wind that pushes everything in the air, then settles. */
  gust(strength = 700) {
    const dir = this.wind >= 0 ? 1 : -1;
    this.layers.forEach((em) => {
      const base = this.wind * em.windK;
      this.scene.tweens.add({ targets: em, gravityX: base + dir * strength * em.windK, duration: 500, yoyo: true, hold: 300, ease: 'Sine.easeInOut' });
    });
    this.j.sfx('whoosh');
  }

  /** One lightning strike: flash, a jagged bolt and thunder. */
  bolt() {
    const sc = this.scene;
    const x0 = Phaser.Math.Between(this.W * 0.2, this.W * 0.8);
    const g = this.j.ui(sc.add.graphics().setDepth(this.layers[1].depth + 1));
    let x = x0;
    let y = 0;
    g.lineStyle(4, 0xffffff, 1).beginPath().moveTo(x, y);
    while (y < this.ground * 0.75) { x += Phaser.Math.Between(-40, 40); y += Phaser.Math.Between(30, 60); g.lineTo(x, y); }
    g.strokePath();
    g.lineStyle(12, 0x9fc4ff, 0.35).strokePath();
    this.j.flash(180, 0xdfe8ff, 0.55);
    sc.time.delayedCall(120, () => g.destroy());
    sc.time.delayedCall(400, () => this.j.sfx('boom'));
  }
}
