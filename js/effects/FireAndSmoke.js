/**
 * FireAndSmoke — a campfire built from three emitters and a flickering light.
 *
 * LESSONS:
 *  - Fire is ADD-blended (it makes light). Smoke is NORMAL-blended (it blocks
 *    light). Mixing these up is the #1 reason fire looks "wrong".
 *  - Colour over life sells heat: white-hot core → yellow → orange → deep red,
 *    and fading to near-black under ADD means "invisible", so it just vanishes.
 *  - Smoke fades IN then out (alpha follows a sine hump) so puffs never pop.
 *  - Draw order: smoke behind fire, light glow behind everything.
 */
class FireAndSmoke extends BaseEffect {
  static id = 'fire';
  static title = 'Fire & Smoke';
  static group = 'particles';
  static tags = ['games', 'stories'];
  static useFor = 'Campfires, torches, a burning fuse, a dragon breathing, cosy story scenes.';
  static mode = 'continuous';
  static hint = 'Click to move the campfire. Try the wind slider.';
  static file = 'js/effects/FireAndSmoke.js';
  static uses = ['js/fx/Juice.js'];
  static summary = 'Flames (ADD), smoke (NORMAL) and rising embers, plus a flickering light glow. Colour over life does most of the work.';
  static steps = [
    'Flame: fx-ember particles rise fast, shrink, and run white → yellow → orange → red → dark.',
    'Smoke: starts above the flames, grows from 0.4 to 2.4 scale, alpha follows sin(π·t) × 0.4.',
    'Embers: tiny dots with a long life, random drift and wind.',
    'Light: a big tinted glow behind the fire whose alpha and scale jitter randomly.',
    'Wind is accelerationX on all three emitters. Smoke gets the most, so it bends further.'
  ];
  static params = [
    { key: 'size', label: 'Fire size', min: 0.4, max: 2, step: 0.05, value: 1 },
    { key: 'wind', label: 'Wind', min: -200, max: 200, step: 5, value: 30 },
    { key: 'smoke', label: 'Smoke', min: 0, max: 10, step: 1, value: 5 }
  ];

  start() {
    const s = this.scene;
    const k = this.p.size;
    const x = this.cx;
    const y = this.cy + 150;
    this.light = this.track(s.add.image(x, y - 40, 'fx-glow').setTint(0xff8a2a).setBlendMode(Phaser.BlendModes.ADD).setScale(3.2 * k).setAlpha(0.35).setDepth(1));

    // logs
    const g = this.track(s.add.graphics().setDepth(4));
    this.logs = g;
    this.drawLogs(x, y);

    this.smoke = this.emitter(x, y - 70 * k, 'fx-smoke', {
      frequency: this.p.smoke ? 900 / this.p.smoke : -1,
      lifespan: { min: 2600, max: 3600 },
      speedY: { min: -70, max: -40 },
      speedX: { min: -12, max: 12 },
      accelerationX: this.p.wind * 0.6,
      scale: { start: 0.4 * k, end: 2.4 * k },
      rotate: { min: 0, max: 360 },
      tint: [0x3c3550, 0x4a4360, 0x2e2840],
      alpha: { onUpdate: (pt, key, t) => Math.sin(t * Math.PI) * 0.4 }
    }, 3);

    this.flame = this.emitter(x, y - 6, 'fx-ember', {
      frequency: Juice.reduced ? 40 : 22, quantity: 1,
      emitZone: { type: 'random', source: new Phaser.Geom.Ellipse(0, 0, 80 * k, 14 * k) },
      lifespan: { min: 550, max: 950 },
      speedY: { min: -200 * k, max: -110 * k },
      speedX: { min: -20, max: 20 },
      accelerationX: this.p.wind * 0.3,
      // the base is wide, the tip is narrow: shrink as they rise
      scale: { start: 1.5 * k, end: 0.15 * k, ease: 'Quad.easeIn' },
      alpha: { start: 0.85, end: 0.2 },
      color: [0xfff2c0, 0xffc23a, 0xff6a14, 0xb3220c, 0x1a0602],
      colorEase: 'Sine.easeOut',
      blendMode: 'ADD'
    }, 6);

    this.embers = this.emitter(x, y - 20, 'fx-dot', {
      frequency: 140, quantity: 1,
      lifespan: { min: 1600, max: 2600 },
      speedY: { min: -160, max: -70 },
      speedX: { min: -40, max: 40 },
      accelerationX: this.p.wind * 0.45,
      scale: { start: 0.35, end: 0 },
      color: [0xffe680, 0xff7a1a, 0x802008],
      // random lift per ember, so some float high and some die low
      accelerationY: { min: -20, max: 10 },
      blendMode: 'ADD'
    }, 7);
    this.fireX = x;
    this.fireY = y;
  }

  drawLogs(x, y) {
    const g = this.logs;
    const k = this.p.size;
    g.clear();
    g.fillStyle(0x5a3520, 1);
    g.fillRoundedRect(x - 70 * k, y - 4, 140 * k, 20 * k, 9 * k);
    g.fillStyle(0x6e4128, 1);
    g.fillRoundedRect(x - 60 * k, y + 8 * k, 120 * k, 18 * k, 9 * k);
    g.fillStyle(0x3a2214, 1);
    g.fillCircle(x - 62 * k, y + 6 * k, 8 * k);
    g.fillCircle(x + 58 * k, y + 17 * k, 7 * k);
  }

  play(x, y) {
    const yy = Math.min(Math.max(y, 200), 520);
    [this.flame, this.smoke, this.embers].forEach((em) => { em.x += x - this.fireX; em.y += yy - this.fireY; });
    this.light.setPosition(x, yy - 40);
    this.drawLogs(x, yy);
    this.fireX = x;
    this.fireY = yy;
    Juice.burst(this.scene, x, yy - 20, 'fx-dot', {
      speed: { min: 80, max: 260 }, angle: { min: -150, max: -30 }, gravityY: 300, lifespan: 900,
      scale: { start: 0.4, end: 0 }, color: [0xffe680, 0xff7a1a], blendMode: 'ADD'
    }, 24, 8);
    Juice.sfx('whoosh');
  }

  autoPlay() {}

  update(time) {
    // flicker: random, not a smooth sine. Real fire light is jittery.
    if (!this.nextFlicker || time > this.nextFlicker) {
      this.nextFlicker = time + Phaser.Math.Between(60, 140) / Juice.timeScale;
      const k = this.p.size;
      const a = Juice.reduced ? 0.33 : Phaser.Math.FloatBetween(0.26, 0.42);
      this.scene.tweens.add({ targets: this.light, alpha: a, scale: 3.2 * k * Phaser.Math.FloatBetween(0.95, 1.06), duration: 90 });
    }
  }
}
