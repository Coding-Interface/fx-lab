/**
 * MagicTrail — a wand trail that follows the pointer.
 *
 * LESSONS:
 *  - Smooth the head with a LERP (move a fraction of the way each frame), so
 *    the trail curves nicely instead of copying jittery mouse input.
 *  - Emit MORE when moving fast and almost nothing when still: scale the
 *    emitter frequency by speed. A trail that keeps spraying while the wand is
 *    still looks like a leak.
 *  - When nobody is touching it, an autopilot draws a figure-eight so the
 *    effect still demos itself.
 */
class MagicTrail extends BaseEffect {
  static id = 'trail';
  static title = 'Magic Trail';
  static group = 'particles';
  static tags = ['games', 'stories'];
  static useFor = 'Cursor trails, drawing or tracing activities, a fairy flying through a scene.';
  static mode = 'continuous';
  static hint = 'Move the pointer over the stage. Click for a sparkle pop.';
  static file = 'js/effects/MagicTrail.js';
  static uses = ['js/fx/Juice.js'];
  static summary = 'A glowing wand head chases the pointer with a lerp, leaving twinkle stars and soft glow dots. Emission rises with speed.';
  static steps = [
    'Head: a glow image moves 25% of the way to the pointer every frame (lerp).',
    'Two emitters sit at the head: twinkling stars (spin + shrink) and soft dots (ADD).',
    'Colour over life: white → gold → pink → violet, so the trail cools as it ages.',
    'Speed-based emission: fast movement = more particles, standing still = none.',
    'After 2 s without input, an autopilot traces a figure-eight.'
  ];
  static params = [
    { key: 'density', label: 'Density', min: 1, max: 10, step: 1, value: 6 },
    { key: 'life', label: 'Trail length (ms)', min: 200, max: 1800, step: 20, value: 800 },
    { key: 'lerp', label: 'Smoothing', min: 0.05, max: 1, step: 0.05, value: 0.25 }
  ];

  start() {
    const s = this.scene;
    this.target = new Phaser.Math.Vector2(this.cx, this.cy);
    this.lastInput = -99999;
    this.head = this.track(s.add.image(this.cx, this.cy, 'fx-glow').setScale(0.45).setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff1b8).setDepth(30));
    this.core = this.track(s.add.image(this.cx, this.cy, 'fx-star').setScale(0.7).setBlendMode(Phaser.BlendModes.ADD).setDepth(31));
    s.tweens.add({ targets: this.core, angle: 360, duration: 2400, repeat: -1 });

    const life = this.p.life;
    this.stars = this.emitter(0, 0, 'fx-star', {
      frequency: 30, quantity: 1, emitting: true,
      lifespan: { min: life * 0.6, max: life },
      speed: { min: 5, max: 40 },
      scale: { start: 0.55, end: 0 },
      rotate: { start: 0, end: 220 },
      color: [0xffffff, 0xffd86b, 0xff5fa2, 0x8a6bff],
      blendMode: 'ADD', gravityY: 30
    }, 28);
    this.dots = this.emitter(0, 0, 'fx-glow', {
      frequency: 20, quantity: 1, emitting: true,
      lifespan: life * 0.7,
      scale: { start: 0.22, end: 0.02 },
      alpha: { start: 0.55, end: 0 },
      color: [0xfff1b8, 0xff8ac2, 0x7a5cff],
      blendMode: 'ADD'
    }, 27);
    // LESSON: startFollow, not setPosition. Particles live in the emitter's local
    // space, so moving the emitter would drag the whole trail along with it.
    // A follow target only changes where NEW particles are born.
    this.stars.startFollow(this.head);
    this.dots.startFollow(this.head);
    this.prev = new Phaser.Math.Vector2(this.cx, this.cy);
  }

  pointerMove(p) {
    this.target.set(p.x, p.y);
    this.lastInput = this.scene.time.now;
  }

  play(x, y) {
    this.target.set(x, y);
    this.lastInput = this.scene.time.now;
    Juice.burst(this.scene, x, y, 'fx-star', {
      speed: { min: 60, max: 260 }, scale: { start: 0.8, end: 0 }, lifespan: 700,
      rotate: { min: 0, max: 360 }, color: [0xffffff, 0xffd86b, 0xff5fa2], blendMode: 'ADD'
    }, 22, 32);
    Juice.sfx('sparkle');
  }

  autoPlay() { this.lastInput = -99999; }

  update(time, delta) {
    if (time - this.lastInput > 2000) {
      const t = time / 1000;
      this.target.set(this.cx + Math.sin(t * 1.3) * 300, this.cy + Math.sin(t * 2.6) * 150);
    }
    // frame-rate independent lerp: same feel at 30, 60 or 144 fps
    const k = 1 - Math.pow(1 - this.p.lerp, (delta * Juice.timeScale) / 16.67);
    const hx = Phaser.Math.Linear(this.head.x, this.target.x, k);
    const hy = Phaser.Math.Linear(this.head.y, this.target.y, k);
    this.head.setPosition(hx, hy);
    this.core.setPosition(hx, hy);

    const speed = Phaser.Math.Distance.Between(this.prev.x, this.prev.y, hx, hy) / Math.max(1, delta * Juice.timeScale) * 16.67;
    this.prev.set(hx, hy);
    const d = Juice.reduced ? this.p.density * 0.5 : this.p.density;
    if (speed < 0.6) {
      this.stars.frequency = 400;
      this.dots.frequency = 300;
    } else {
      this.stars.frequency = Math.max(6, 160 / (d * Math.min(speed, 30) * 0.12 + 1));
      this.dots.frequency = Math.max(5, 110 / (d * Math.min(speed, 30) * 0.12 + 1));
    }
  }
}
