/**
 * SparkBurst — the "hello world" of game particles, done properly.
 *
 * Three layers fire on the same frame:
 *   1. a quick bright core (one glow image, scaled up and faded)
 *   2. streak sparks that ROTATE TO FACE THEIR VELOCITY (onUpdate)
 *   3. slower embers that fall with gravity and linger
 * Fast + slow layers together read as "energy", one layer alone reads as "dots".
 */
class SparkBurst extends BaseEffect {
  static id = 'sparks';
  static title = 'Spark Burst';
  static group = 'particles';
  static tags = ['games', 'learning'];
  static useFor = 'Hits, pickups, a correct answer tap, a button that has just been pressed.';
  static mode = 'tap';
  static hint = 'Click anywhere to burst';
  static file = 'js/effects/SparkBurst.js';
  static uses = ['js/fx/Juice.js', 'js/fx/FXTextures.js'];
  static summary = 'A layered burst: a bright core, streak sparks that point the way they fly, and slow embers. Build the emitters once and explode() them on every click.';
  static steps = [
    'Core: one fx-glow image pops from scale 0.2 to 1.4 and fades in 180 ms.',
    'Sparks: fx-spark streaks, ADD blend, colour over life white → gold → orange → red.',
    'rotate.onUpdate turns each spark to atan2(velocityY, velocityX), so streaks follow their path.',
    'Embers: small dots with gravity and a longer life, to give the burst a tail.',
    'The emitters are created in start() and reused; play() only calls explode().'
  ];
  static params = [
    { key: 'count', label: 'Sparks', min: 6, max: 140, step: 1, value: 48 },
    { key: 'speed', label: 'Speed', min: 100, max: 1000, step: 10, value: 520 },
    { key: 'gravity', label: 'Gravity', min: 0, max: 1400, step: 10, value: 600 },
    { key: 'life', label: 'Lifespan (ms)', min: 200, max: 1600, step: 10, value: 650 }
  ];

  start() {
    const p = this.p;
    this.sparks = this.emitter(0, 0, 'fx-spark', {
      emitting: false,
      speed: { min: p.speed * 0.35, max: p.speed },
      lifespan: { min: p.life * 0.6, max: p.life },
      gravityY: p.gravity,
      scaleX: { start: 0.9, end: 0.2 },
      scaleY: { start: 0.7, end: 0.3 },
      color: [0xffffff, 0xffe680, 0xffa82e, 0xff4a1c],
      colorEase: 'Quad.easeIn',
      blendMode: 'ADD',
      // LESSON: EmitterOp onUpdate runs every frame for every particle.
      rotate: { onUpdate: (pt) => Phaser.Math.RadToDeg(Math.atan2(pt.velocityY, pt.velocityX)) }
    }, 20);

    this.embers = this.emitter(0, 0, 'fx-ember', {
      emitting: false,
      speed: { min: 30, max: p.speed * 0.3 },
      lifespan: { min: p.life, max: p.life * 2 },
      gravityY: p.gravity * 0.35,
      scale: { start: 0.55, end: 0 },
      color: [0xffe680, 0xff7a1a, 0x80200a],
      blendMode: 'ADD'
    }, 19);
  }

  autoPlay() {
    this.play(this.cx, this.cy);
    this.scene.time.delayedCall(450, () => this.play(this.cx - 220, this.cy + 60));
    this.scene.time.delayedCall(800, () => this.play(this.cx + 230, this.cy - 40));
  }

  play(x, y) {
    const s = this.scene;
    const core = s.add.image(x, y, 'fx-glow').setScale(0.2).setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff1b8).setDepth(21);
    s.tweens.add({ targets: core, scale: 1.4, alpha: 0, duration: 180, ease: 'Cubic.easeOut', onComplete: () => core.destroy() });

    this.sparks.explode(Juice.amount(this.p.count), x, y);
    this.embers.explode(Juice.amount(Math.round(this.p.count / 3)), x, y);
    Juice.sfx('pop');
  }
}
