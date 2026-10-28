/**
 * Trail — a sparkly trail that follows a game object or the pointer.
 *   const t = this.fx.trail(player);                 // follow a sprite
 *   const t = this.fx.trail('pointer', { colors: [0xffffff, 0x7ff7e3] });
 *   t.burst();  t.destroy();
 * Emission rises with speed: standing still makes almost nothing.
 */
class Trail extends Component {
  constructor(fx, target = 'pointer', o = {}) {
    super(fx);
    const sc = this.scene;
    this.target = target;
    this.density = o.density || 6;
    this.lerp = o.smoothing != null ? o.smoothing : (target === 'pointer' ? 0.25 : 1);
    const colors = o.colors || [0xffffff, 0xffd86b, 0xff5fa2, 0x8a6bff];
    const life = o.lifespan || 800;
    const depth = o.depth != null ? o.depth : this.j.depth(30);
    const p = this.targetPoint();
    this.head = this.track(sc.add.image(p.x, p.y, 'pfx-glow').setScale(o.headSize != null ? o.headSize : 0.4).setBlendMode(Phaser.BlendModes.ADD).setTint(colors[1]).setDepth(depth + 1));
    if (o.head === false) this.head.setVisible(false);
    this.stars = this.track(this.j.emitter(0, 0, 'pfx-star', {
      frequency: 400, lifespan: { min: life * 0.6, max: life }, speed: { min: 5, max: 40 },
      scale: { start: 0.5 * (o.size || 1), end: 0 }, rotate: { start: 0, end: 220 }, color: colors, blendMode: 'ADD', gravityY: 30
    }, depth));
    this.dots = this.track(this.j.emitter(0, 0, 'pfx-glow', {
      frequency: 300, lifespan: life * 0.7, scale: { start: 0.2 * (o.size || 1), end: 0.02 }, alpha: { start: 0.55, end: 0 }, color: colors, blendMode: 'ADD'
    }, depth - 1));
    this.stars.startFollow(this.head);
    this.dots.startFollow(this.head);
    this.prev = { x: p.x, y: p.y };
    this.colors = colors;
    this.onUpdate((t, dt) => this.tick(dt));
  }

  targetPoint() {
    if (this.target === 'pointer') {
      const ptr = this.scene.input.activePointer;
      return { x: ptr.worldX, y: ptr.worldY };
    }
    return this.j.centerOf(this.target);
  }

  tick(dt) {
    if (this.target !== 'pointer' && (!this.target || !this.target.scene)) { this.destroy(); return; }
    const p = this.targetPoint();
    const k = 1 - Math.pow(1 - Math.min(1, this.lerp), dt / 16.67);
    const hx = this.head.x + (p.x - this.head.x) * k;
    const hy = this.head.y + (p.y - this.head.y) * k;
    this.head.setPosition(hx, hy);
    const speed = Phaser.Math.Distance.Between(this.prev.x, this.prev.y, hx, hy) / Math.max(1, dt) * 16.67;
    this.prev = { x: hx, y: hy };
    const d = Settings.reducedMotion ? this.density * 0.5 : this.density;
    if (speed < 0.6) { this.stars.frequency = 400; this.dots.frequency = 300; } else {
      const m = d * Math.min(speed, 30) * 0.12 + 1;
      this.stars.frequency = Math.max(6, 160 / m);
      this.dots.frequency = Math.max(5, 110 / m);
    }
  }

  /** A little sparkle pop at the head. */
  burst() {
    this.j.burst(this.head.x, this.head.y, 'pfx-star', { speed: { min: 60, max: 260 }, scale: { start: 0.8, end: 0 }, lifespan: 700, rotate: { min: 0, max: 360 }, color: this.colors, blendMode: 'ADD' }, 22, this.head.depth + 1);
    this.j.sfx('sparkle');
  }
}
