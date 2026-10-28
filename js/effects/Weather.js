/**
 * Weather — rain (with lightning), snow, autumn leaves and blossom petals.
 *
 * LESSONS:
 *  - PARALLAX: every weather type is two emitters, a FAR layer (small, slow,
 *    faint) and a NEAR layer (big, fast, bright). Two layers read as depth;
 *    one layer reads as a flat screen effect.
 *  - Wind is gravityX on the emitter. Unlike speedX, it pushes particles
 *    that are ALREADY flying, so a gust visibly bends the whole scene.
 *  - Fake the splash: the ground splashes are a separate emitter along the
 *    ground line, not real collisions. Nobody can tell, and it is far cheaper.
 *  - Lightning: one flash plus a bolt drawn for ~120 ms, thunder 0.4 s later.
 *    Keep it rare (and soft in reduced-motion mode) to stay photosensitivity-safe.
 */
class Weather extends BaseEffect {
  static id = 'weather';
  static title = 'Weather';
  static group = 'particles';
  static tags = ['stories', 'games'];
  static useFor = 'Story mood (a storm before a sad scene, snow for a cosy one), seasons, world-map ambience.';
  static mode = 'continuous';
  static hint = 'Click for a gust of wind. Change "Type" for snow, leaves or petals.';
  static file = 'js/effects/Weather.js';
  static uses = ['js/fx/Juice.js'];
  static summary = 'Four weather types, each built from a far and a near emitter for depth. Wind is gravityX, so gusts push particles mid-air. Rain adds fake splashes and occasional lightning.';
  static steps = [
    'Two emitters per type: far (scale ×0.5, speed ×0.6, alpha 0.5) and near (full size and speed).',
    'Rain: fx-drop streaks rotated to their velocity; lifespan tuned so drops end at the ground.',
    'Splashes: a separate emitter along the ground line throws tiny droplets up; ripples are squashed rings.',
    'Snow drifts; leaves and petals spin and flutter (cosine on scaleY) like the confetti trick.',
    'Click: gravityX tweens up and back down, so everything already in the air bends with the gust.',
    'Lightning (rain only): a flash, a jagged bolt drawn with Graphics, and thunder 400 ms later, every 4–9 s.'
  ];
  static params = [
    { key: 'type', label: 'Type (0 rain · 1 snow · 2 leaves · 3 petals)', min: 0, max: 3, step: 1, value: 0 },
    { key: 'amount', label: 'Intensity', min: 1, max: 10, step: 1, value: 6 },
    { key: 'wind', label: 'Wind', min: -300, max: 300, step: 10, value: 60 },
    { key: 'lightning', label: 'Lightning (0/1)', min: 0, max: 1, step: 1, value: 1 }
  ];

  start() {
    const s = this.scene;
    const type = this.p.type;
    const skies = [0x1d2340, 0x2b3a5e, 0x6b4a6b, 0x7fa6d9];
    this.track(s.add.rectangle(480, 300, 960, 600, skies[type]).setDepth(0));
    const g = this.track(s.add.graphics().setDepth(2));
    g.fillStyle(type === 1 ? 0xdfe8f5 : 0x223a35, 1).fillEllipse(220, 600, 900, 260).fillEllipse(780, 610, 900, 240);
    g.fillStyle(type === 1 ? 0xc8d4e8 : 0x1a2e2a, 1).fillRect(0, 520, 960, 80);
    this.ground = 520;
    this.layers = [];
    const a = this.p.amount;
    const near = this.make(type, 1, a);
    const far = this.make(type, 0.5, a);
    this.layers.push(far, near);
    if (type === 0) {
      this.splash = this.emitter(0, this.ground, 'fx-dot', {
        emitZone: { type: 'random', source: new Phaser.Geom.Line(0, 0, 960, 0) },
        frequency: 140 / a, quantity: 1, lifespan: 260, speedY: { min: -120, max: -60 }, speedX: { min: -50, max: 50 },
        gravityY: 600, scale: { start: 0.18, end: 0.05 }, alpha: 0.7, tint: 0xbfd6ff
      }, 6);
      this.layers.push(this.splash);
      this.rippleTimer = s.time.addEvent({ delay: 260 / a * 3, loop: true, callback: () => this.ripple() });
      this.nextBolt = 2500;
    }
    this.layers.forEach((em) => { em.gravityX = this.p.wind * (em.windK || 1); });
  }

  /** Build one weather layer. depth k: 1 = near, 0.5 = far. */
  make(type, k, amount) {
    const near = k === 1;
    const depth = near ? 8 : 3;
    const wid = { type: 'random', source: new Phaser.Geom.Line(-300, 0, 1260, 0) };
    let cfg;
    if (type === 0) {
      cfg = {
        emitZone: wid, frequency: 40 / amount / k, quantity: near ? 2 : 1,
        speedY: { min: 950 * k, max: 1150 * k }, speedX: this.p.wind * 0.4 * k,
        lifespan: (this.ground + 40) / (1050 * k) * 1000 * (near ? 1 : 0.8),
        scaleY: near ? 1.2 : 0.6, scaleX: near ? 1 : 0.6, alpha: near ? 0.75 : 0.35, tint: 0xbfd6ff,
        rotate: { onUpdate: (pt) => Phaser.Math.RadToDeg(Math.atan2(pt.velocityY, pt.velocityX)) - 90 }
      };
    } else if (type === 1) {
      cfg = {
        emitZone: wid, frequency: 120 / amount / k, lifespan: 9000,
        speedY: { min: 30 * k + 20, max: 70 * k + 20 }, speedX: { min: -20, max: 20 }, accelerationX: { min: -10, max: 10 },
        scale: near ? { min: 0.3, max: 0.5 } : { min: 0.1, max: 0.2 }, alpha: near ? 0.95 : 0.55, tint: 0xffffff
      };
    } else {
      const leaves = type === 2;
      cfg = {
        emitZone: wid, frequency: (leaves ? 420 : 260) / amount / k, lifespan: 9000,
        speedY: { min: 50 * k + 20, max: 110 * k + 20 }, speedX: { min: -30, max: 30 },
        tint: leaves ? [0xe8833a, 0xd4572a, 0xf2b84b, 0xa8452a] : [0xffc2d9, 0xff9cc2, 0xffe3ee],
        scale: near ? { min: leaves ? 1.1 : 0.6, max: leaves ? 1.5 : 0.9 } : { min: 0.45, max: 0.7 },
        alpha: near ? 1 : 0.55,
        rotate: { onEmit: (pt) => { pt.spinSpeed = Phaser.Math.FloatBetween(-3, 3); return Phaser.Math.Between(0, 360); }, onUpdate: (pt, key, t, v) => v + pt.spinSpeed },
        scaleY: { onEmit: (pt) => { pt.wobPhase = Math.random() * 6.28; return 1; }, onUpdate: (pt, key, t) => Math.cos(pt.wobPhase + t * 40) * (near ? 1.3 : 0.6) }
      };
    }
    const tex = type === 0 ? 'fx-drop' : type === 1 ? 'fx-dot' : 'fx-leaf';
    const em = this.emitter(0, -30, tex, { maxParticles: 900, ...cfg }, depth);
    em.windK = type === 0 ? 0.6 : near ? 1 : 0.6;
    return em;
  }

  ripple() {
    const s = this.scene;
    const r = s.add.image(Phaser.Math.Between(20, 940), Phaser.Math.Between(this.ground + 8, 590), 'fx-ring').setScale(0.05, 0.02).setAlpha(0.5).setTint(0xbfd6ff).setDepth(4);
    s.tweens.add({ targets: r, scaleX: 0.22, scaleY: 0.07, alpha: 0, duration: 600, ease: 'Quad.easeOut', onComplete: () => r.destroy() });
  }

  autoPlay() { this.scene.time.delayedCall(1200, () => this.play()); }

  play() {
    const s = this.scene;
    Juice.sfx('whoosh');
    this.layers.forEach((em) => {
      const base = this.p.wind * (em.windK || 1);
      const dir = this.p.wind >= 0 ? 1 : -1;
      s.tweens.add({ targets: em, gravityX: base + dir * 700 * (em.windK || 1), duration: 500, yoyo: true, hold: 300, ease: 'Sine.easeInOut' });
    });
  }

  bolt() {
    const s = this.scene;
    const x0 = Phaser.Math.Between(200, 760);
    const g = s.add.graphics().setDepth(9);
    let x = x0;
    let y = 0;
    g.lineStyle(4, 0xffffff, 1).beginPath().moveTo(x, y);
    while (y < this.ground - 120) { x += Phaser.Math.Between(-40, 40); y += Phaser.Math.Between(30, 60); g.lineTo(x, y); }
    g.strokePath();
    g.lineStyle(12, 0x9fc4ff, 0.35).strokePath();
    Juice.flash(s, 180, 0xdfe8ff, 0.55);
    s.time.delayedCall(120, () => g.destroy());
    s.time.delayedCall(400, () => Juice.sfx('boom'));
  }

  update(time, delta) {
    if (this.p.type !== 0 || !this.p.lightning) return;
    this.nextBolt -= delta * Juice.timeScale;
    if (this.nextBolt <= 0) { this.bolt(); this.nextBolt = Phaser.Math.Between(4000, 9000); }
  }
}
