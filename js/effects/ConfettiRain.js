/**
 * ConfettiRain — celebration confetti that FLUTTERS instead of falling like rocks.
 *
 * The trick: real paper flips over as it falls. We fake that by animating
 * scaleX with a cosine wave (1 → 0 → -1 → 0 → 1), each piece with its own
 * random phase, while it drifts and rotates.
 */
class ConfettiRain extends BaseEffect {
  static id = 'confetti';
  static title = 'Confetti';
  static group = 'particles';
  static tags = ['games', 'learning', 'stories'];
  static useFor = 'Level complete, lesson finished, a birthday or happy ending in a story.';
  static mode = 'tap';
  static hint = 'Click to fire the confetti cannons';
  static file = 'js/effects/ConfettiRain.js';
  static uses = ['js/fx/Juice.js'];
  static summary = 'Gentle rain from the top edge plus two cannons that fire from the bottom corners. The flutter comes from a cosine wave on scaleX.';
  static steps = [
    'Rain: emitZone is a random line across the top, emitting a few pieces per tick.',
    'Each piece picks a random colour (tint array) and spins with a random rotate speed.',
    'scaleX.onEmit stores a random phase; scaleX.onUpdate returns cos(phase + t × wobble).',
    'Cannons: explode() at the corners with an upward angle range and high speed; gravity brings them back.',
    'maxParticles caps the total, so a happy player clicking 50 times cannot melt the frame rate.'
  ];
  static params = [
    { key: 'rain', label: 'Rain density', min: 0, max: 10, step: 1, value: 4 },
    { key: 'wobble', label: 'Flutter speed', min: 0, max: 60, step: 1, value: 26 },
    { key: 'gravity', label: 'Gravity', min: 50, max: 900, step: 10, value: 260 },
    { key: 'cannon', label: 'Cannon pieces', min: 10, max: 160, step: 5, value: 70 }
  ];

  static COLORS = [0xff5fa2, 0xffc94a, 0x4fe0c8, 0x7a8cff, 0xff8a3d, 0xffffff];

  flutter() {
    const wob = this.p.wobble;
    return {
      onEmit: (pt) => { pt.wobPhase = Math.random() * Math.PI * 2; return 1; },
      onUpdate: (pt, key, t) => Math.cos(pt.wobPhase + t * wob)
    };
  }

  start() {
    const { width } = this.scene.scale;
    const base = {
      tint: ConfettiRain.COLORS,
      rotate: {
        onEmit: (pt) => { pt.spinSpeed = Phaser.Math.FloatBetween(-8, 8); return Phaser.Math.Between(0, 360); },
        onUpdate: (pt, key, t, v) => v + pt.spinSpeed
      },
      scaleX: this.flutter(),
      scaleY: { min: 0.7, max: 1.1 },
      maxParticles: 600
    };

    this.rain = this.emitter(0, -20, 'fx-confetti', {
      ...base,
      emitZone: { type: 'random', source: new Phaser.Geom.Line(0, 0, width, 0) },
      speedY: { min: 40, max: 110 },
      speedX: { min: -30, max: 30 },
      accelerationX: { min: -20, max: 20 },
      gravityY: this.p.gravity * 0.25,
      lifespan: 7000,
      frequency: this.p.rain ? 600 / this.p.rain : -1,
      quantity: 1
    }, 5);

    this.cannon = this.emitter(0, 0, 'fx-confetti', {
      ...base,
      emitting: false,
      speed: { min: 380, max: 820 },
      gravityY: this.p.gravity,
      lifespan: 3800,
      alpha: { start: 1, end: 0, ease: 'Quint.easeIn' }
    }, 30);
  }

  autoPlay() { this.play(this.cx, this.cy); }

  play() {
    const { width, height } = this.scene.scale;
    const n = Juice.amount(this.p.cannon);
    // Angles: 0° = right, -90° = up. Left cannon fires up-right, right cannon up-left.
    // ops.angle.loadConfig swaps the angle range on a reused emitter.
    this.cannon.ops.angle.loadConfig({ angle: { min: -80, max: -50 } });
    this.cannon.explode(n, 20, height + 10);
    this.cannon.ops.angle.loadConfig({ angle: { min: -130, max: -100 } });
    this.cannon.explode(n, width - 20, height + 10);
    Juice.sfx('pop');
    Juice.sfx('sparkle');
  }
}
