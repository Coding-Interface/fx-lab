/**
 * BaseEffect — every lab effect extends this. Copy the pattern into your game:
 *
 *   start()          build emitters / objects ONCE
 *   play(x, y)       trigger the effect (tap / click)
 *   autoPlay()       what "Replay" does (defaults to play at the centre)
 *   update(t, dt)    per-frame work, if any
 *   pointerMove(p)   optional pointer following
 *
 * Static fields describe the effect for the lab UI (title, sliders, steps…).
 */
class BaseEffect {
  static id = 'base';
  static title = 'Base';
  static group = 'foundations';   // see EffectRegistry.GROUPS
  static tags = [];               // any of: 'games', 'learning', 'stories'
  static useFor = '';             // one line: where this effect earns its place
  static summary = '';
  static steps = [];
  static params = [];
  static mode = 'tap';          // tap | auto | continuous | cards
  static hint = 'Click the stage';
  static file = 'js/effects/BaseEffect.js';
  static uses = ['js/fx/Juice.js'];

  constructor(scene, values = {}) {
    this.scene = scene;
    this.objects = [];
    this.cx = scene.scale.width / 2;
    this.cy = scene.scale.height / 2;
    this.p = {};
    this.constructor.params.forEach((d) => { this.p[d.key] = values[d.key] != null ? values[d.key] : d.value; });
  }

  start() {}
  play() {}
  autoPlay() { this.play(this.cx, this.cy); }
  update() {}
  pointerMove() {}

  /** Remember an object so destroy() can clean it up. */
  track(obj) { this.objects.push(obj); return obj; }

  /** Create a particle emitter that respects slow motion. */
  emitter(x, y, texture, config, depth = 10) {
    const em = this.scene.add.particles(x, y, texture, config).setDepth(depth);
    em.timeScale = Juice.timeScale;
    return this.track(em);
  }

  /** Small on-stage caption (used by the comparison effects). */
  label(x, y, text, color = '#9b93c4', size = 15) {
    return this.track(this.scene.add.text(x, y, text, {
      fontFamily: '"Manrope", "Trebuchet MS", sans-serif', fontSize: `${size}px`, color, fontStyle: '700'
    }).setOrigin(0.5));
  }

  destroy() {
    this.objects.forEach((o) => { if (o && o.destroy) o.destroy(); });
    this.objects = [];
  }
}
