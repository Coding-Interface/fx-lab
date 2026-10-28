/**
 * Fireworks — a two-stage effect: launch, then burst (+ crackle).
 *
 * LESSONS:
 *  - Multi-stage effects are just Promises in a row: await the rocket tween,
 *    then fire the burst. Read it top to bottom like a script.
 *  - A trail emitter uses startFollow(rocket): new sparks are born at the
 *    rocket, old sparks stay where they were born.
 *  - A round shell = many particles with the SAME speed. Random speeds give a
 *    fuzzy ball. We layer both: a crisp ring plus a soft filled centre.
 *  - "Crackle" = a delayed second burst of tiny flickering stars.
 */
class Fireworks extends BaseEffect {
  static id = 'fireworks';
  static title = 'Fireworks';
  static group = 'particles';
  static tags = ['games', 'learning', 'stories'];
  static useFor = 'Big wins, a 100% score, a festival scene, the finale of a story.';
  static mode = 'tap';
  static hint = 'Click where the firework should burst';
  static file = 'js/effects/Fireworks.js';
  static uses = ['js/fx/Juice.js'];
  static summary = 'A rocket climbs with a spark trail, then bursts into a crisp ring and a soft core, and finally crackles. Each stage waits for the previous one.';
  static steps = [
    'Launch: a glow dot tweens from the ground to the click point with Quad.easeOut (it slows as it climbs).',
    'Trail: an emitter follows the rocket, sparks fall back with gravity.',
    'Burst: ring shell (fixed speed) + filled core (random speed) + flash glow + shockwave.',
    'All burst particles share a palette and colour-over-life, ending dim.',
    'Crackle: 350 ms later, tiny stars flicker by randomising their alpha every frame.'
  ];
  static params = [
    { key: 'size', label: 'Shell size', min: 120, max: 520, step: 10, value: 300 },
    { key: 'count', label: 'Particles', min: 20, max: 200, step: 5, value: 90 },
    { key: 'gravity', label: 'Gravity', min: 0, max: 400, step: 10, value: 140 },
    { key: 'crackle', label: 'Crackle (0/1)', min: 0, max: 1, step: 1, value: 1 }
  ];

  static PALETTES = [
    [0xffffff, 0xffd86b, 0xff7a1a],
    [0xffffff, 0x9be8ff, 0x4f7bff],
    [0xffffff, 0xffa8d8, 0xff3f8e],
    [0xffffff, 0xc3ffb0, 0x2fd48a],
    [0xffffff, 0xd8b8ff, 0x8a4dff]
  ];

  start() {
    this.shot = 0;
  }

  autoPlay() {
    this.play(this.cx, 170);
    this.scene.time.delayedCall(700, () => this.play(this.cx - 250, 230));
    this.scene.time.delayedCall(1300, () => this.play(this.cx + 260, 200));
  }

  async play(x, y) {
    const s = this.scene;
    const pal = Fireworks.PALETTES[this.shot++ % Fireworks.PALETTES.length];
    const groundY = s.scale.height + 10;
    const ty = Math.min(y, s.scale.height - 120);

    // 1. LAUNCH
    const rocket = s.add.image(x + Phaser.Math.Between(-40, 40), groundY, 'fx-glow').setScale(0.16).setBlendMode(Phaser.BlendModes.ADD).setDepth(20);
    const trail = s.add.particles(0, 0, 'fx-dot', {
      frequency: 12, lifespan: 600, speed: { min: 10, max: 50 }, gravityY: 200,
      scale: { start: 0.45, end: 0 }, color: [0xffffff, pal[1], pal[2]], blendMode: 'ADD'
    }).setDepth(19);
    trail.timeScale = Juice.timeScale;
    trail.startFollow(rocket);
    Juice.sfx('whoosh');
    await Juice.tween(s, { targets: rocket, x, y: ty, duration: 700, ease: 'Quad.easeOut' });
    if (!rocket.scene) return; // scene restarted while we waited

    // 2. BURST
    trail.stopFollow();
    trail.stop();
    s.time.delayedCall(800, () => trail.destroy());
    rocket.destroy();

    const flash = s.add.image(x, ty, 'fx-glow').setScale(0.4).setTint(pal[1]).setBlendMode(Phaser.BlendModes.ADD).setDepth(22);
    s.tweens.add({ targets: flash, scale: this.p.size / 60, alpha: 0, duration: 420, ease: 'Cubic.easeOut', onComplete: () => flash.destroy() });
    Juice.shockwave(s, x, ty, pal[1], this.p.size / 90, 500, 21);

    const life = 1300;
    const shared = { lifespan: { min: life * 0.8, max: life }, gravityY: this.p.gravity, color: pal, colorEase: 'Quad.easeIn', blendMode: 'ADD' };
    // crisp ring: every particle the same speed, so they stay on one circle
    Juice.burst(s, x, ty, 'fx-dot', { ...shared, speed: this.p.size * 0.95, scale: { start: 0.6, end: 0 } }, Math.round(this.p.count * 0.6), 21);
    // soft core: random speeds fill the inside
    Juice.burst(s, x, ty, 'fx-ember', { ...shared, speed: { min: 20, max: this.p.size * 0.7 }, scale: { start: 0.7, end: 0 } }, Math.round(this.p.count * 0.4), 21);
    Juice.sfx('boom');

    // 3. CRACKLE
    if (!this.p.crackle) return;
    await Juice.wait(s, 350);
    if (!s.sys.isActive()) return;
    Juice.burst(s, x, ty, 'fx-star', {
      emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, this.p.size * 0.6) },
      speed: { min: 0, max: 20 }, lifespan: { min: 300, max: 700 }, gravityY: 40,
      scale: { start: 0.4, end: 0.1 }, color: [0xffffff, pal[1]], blendMode: 'ADD',
      // flicker: random alpha every frame (reduced motion: steady)
      alpha: { onUpdate: () => (Juice.reduced ? 0.8 : Math.random()) }
    }, 40, 23);
    Juice.sfx('sparkle');
  }
}
