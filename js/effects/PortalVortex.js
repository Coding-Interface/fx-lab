/**
 * PortalVortex — a swirling magic portal.
 *
 * LESSONS:
 *  - emitZone { type: 'edge' } places particles ON the outline of a shape,
 *    stepping around it in order. With a fast frequency that reads as rotation.
 *  - moveToX / moveToY makes particles travel to a point over their lifespan:
 *    perfect for "energy being sucked in".
 *  - A few rotating ring images at different speeds and directions give depth
 *    cheaply (parallax rotation).
 */
class PortalVortex extends BaseEffect {
  static id = 'portal';
  static title = 'Portal Vortex';
  static group = 'particles';
  static tags = ['games', 'stories'];
  static useFor = 'Teleporters, level entrances, a magic door into the next chapter.';
  static mode = 'continuous';
  static hint = 'Click to pulse the portal';
  static file = 'js/effects/PortalVortex.js';
  static uses = ['js/fx/Juice.js'];
  static summary = 'Particles spawn on the rim of a circle and get pulled to the centre with moveTo, while counter-rotating rings and a pulsing core sell the swirl.';
  static steps = [
    'Rim emitter: emitZone edge on a circle, quantity 64 points, stepping around the circle.',
    'Every particle uses moveToX / moveToY = (0, 0), the portal centre in emitter space, so it is pulled in over its lifespan. Because the rim spawn point steps around the circle, the pull looks like a sweep.',
    'Outer sparkle emitter: drifts outward a little and fades (gives the rim a halo).',
    'Three ring images rotate at different speeds and directions, ADD-blended.',
    'Click: a pulse (core scale yoyo, shockwave ring, outward burst).'
  ];
  static params = [
    { key: 'radius', label: 'Radius', min: 80, max: 240, step: 5, value: 170 },
    { key: 'pull', label: 'Pull time (ms)', min: 300, max: 2000, step: 20, value: 900 },
    { key: 'palette', label: 'Palette (0–3)', min: 0, max: 3, step: 1, value: 0 }
  ];

  static PALETTES = [
    [0xffffff, 0x9be8ff, 0x7a5cff, 0x2a1f7a],
    [0xffffff, 0xb8ffcf, 0x2fd48a, 0x0b4a3a],
    [0xffffff, 0xffc2e0, 0xff4f9a, 0x5a0f3a],
    [0xffffff, 0xffe39a, 0xff9a2a, 0x5a2a05]
  ];

  start() {
    const s = this.scene;
    const r = this.p.radius;
    const pal = PortalVortex.PALETTES[this.p.palette] || PortalVortex.PALETTES[0];
    this.pal = pal;
    const x = this.cx;
    const y = this.cy;

    this.track(s.add.image(x, y, 'fx-glow').setScale(r / 40).setTint(pal[3]).setAlpha(0.8).setDepth(1));
    this.rings = [1.08, 0.82, 0.56].map((k, i) => {
      const ring = this.track(s.add.image(x, y, 'fx-ring').setScale((r * 2 * k) / 192).setTint(pal[i + 1]).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.55).setDepth(2));
      s.tweens.add({ targets: ring, angle: i % 2 ? -360 : 360, duration: 3000 + i * 1600, repeat: -1 });
      // squash rings a little so they look tilted, like a portal seen at an angle
      ring.scaleY *= 0.92;
      return ring;
    });

    this.rim = this.emitter(x, y, 'fx-dot', {
      emitZone: { type: 'edge', source: new Phaser.Geom.Circle(0, 0, r), quantity: 64, yoyo: false },
      frequency: 16, quantity: Juice.reduced ? 1 : 2,
      lifespan: this.p.pull,
      // particle positions are LOCAL to the emitter, so the centre is (0, 0)
      moveToX: 0, moveToY: 0,
      scale: { start: 0.65, end: 0.05 },
      color: pal,
      blendMode: 'ADD'
    }, 4);

    this.halo = this.emitter(x, y, 'fx-star', {
      emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, r) },
      frequency: 90,
      lifespan: 1200,
      speed: { min: 10, max: 40 },
      scale: { start: 0.45, end: 0 },
      rotate: { min: 0, max: 360 },
      color: [0xffffff, pal[1]],
      blendMode: 'ADD'
    }, 5);

    this.core = this.track(s.add.image(x, y, 'fx-glow').setScale(0.9).setTint(pal[1]).setBlendMode(Phaser.BlendModes.ADD).setDepth(6));
    s.tweens.add({ targets: this.core, scale: 1.15, alpha: 0.7, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  autoPlay() { this.scene.time.delayedCall(400, () => this.play(this.cx, this.cy)); }

  play() {
    const s = this.scene;
    const x = this.cx;
    const y = this.cy;
    s.tweens.add({ targets: this.rings, scaleX: '*=1.12', scaleY: '*=1.12', duration: 140, yoyo: true, ease: 'Quad.easeOut' });
    Juice.shockwave(s, x, y, this.pal[1], (this.p.radius * 2.4) / 96, 600, 7);
    Juice.burst(s, x, y, 'fx-dot', {
      speed: { min: 200, max: 480 }, lifespan: 700, scale: { start: 0.7, end: 0 }, color: this.pal, blendMode: 'ADD'
    }, 50, 7);
    Juice.sfx('whoosh');
    Juice.sfx('chime');
  }
}
