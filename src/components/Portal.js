/**
 * Portal — a swirling magic portal.
 *   const portal = this.fx.portal(600, 300, { radius: 120, palette: 'blue' });
 *   portal.pulse();   // e.g. when the player enters
 *   portal.destroy();
 * Palettes: 'blue' | 'green' | 'pink' | 'gold', or an array of 4 colours.
 */
class Portal extends Component {
  static PALETTES = {
    blue: [0xffffff, 0x9be8ff, 0x7a5cff, 0x2a1f7a],
    green: [0xffffff, 0xb8ffcf, 0x2fd48a, 0x0b4a3a],
    pink: [0xffffff, 0xffc2e0, 0xff4f9a, 0x5a0f3a],
    gold: [0xffffff, 0xffe39a, 0xff9a2a, 0x5a2a05]
  };

  constructor(fx, x, y, o = {}) {
    super(fx);
    const sc = this.scene;
    const r = o.radius || 120;
    const pal = Array.isArray(o.palette) ? o.palette : Portal.PALETTES[o.palette || 'blue'];
    const depth = o.depth != null ? o.depth : this.j.depth(10);
    this.x = x; this.y = y; this.r = r; this.pal = pal;
    this.track(sc.add.image(x, y, 'pfx-glow').setScale(r / 40).setTint(pal[3]).setAlpha(0.8).setDepth(depth));
    this.rings = [1.08, 0.82, 0.56].map((k, i) => {
      const ring = this.track(sc.add.image(x, y, 'pfx-ring').setScale((r * 2 * k) / 192, (r * 2 * k * 0.92) / 192).setTint(pal[i + 1]).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.55).setDepth(depth + 1));
      sc.tweens.add({ targets: ring, angle: i % 2 ? -360 : 360, duration: 3000 + i * 1600, repeat: -1 });
      return ring;
    });
    this.track(this.j.emitter(x, y, 'pfx-dot', {
      emitZone: { type: 'edge', source: new Phaser.Geom.Circle(0, 0, r), quantity: 64 },
      frequency: 16, quantity: Settings.reducedMotion ? 1 : 2, lifespan: o.pull || 900,
      moveToX: 0, moveToY: 0, scale: { start: 0.6 * (r / 170 + 0.4), end: 0.05 }, color: pal, blendMode: 'ADD'
    }, depth + 2));
    this.track(this.j.emitter(x, y, 'pfx-star', {
      emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, r) }, frequency: 90, lifespan: 1200,
      speed: { min: 10, max: 40 }, scale: { start: 0.4, end: 0 }, rotate: { min: 0, max: 360 }, color: [0xffffff, pal[1]], blendMode: 'ADD'
    }, depth + 3));
    this.core = this.track(sc.add.image(x, y, 'pfx-glow').setScale(0.9 * r / 170).setTint(pal[1]).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth + 4));
    sc.tweens.add({ targets: this.core, scale: 1.15 * r / 170, alpha: 0.7, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  pulse() {
    this.scene.tweens.add({ targets: this.rings, scaleX: '*=1.12', scaleY: '*=1.12', duration: 140, yoyo: true, ease: 'Quad.easeOut' });
    this.j.shockwave(this.x, this.y, this.pal[1], (this.r * 2.4) / 96, 600, this.core.depth + 1);
    this.j.burst(this.x, this.y, 'pfx-dot', { speed: { min: 200, max: 480 }, lifespan: 700, scale: { start: 0.7, end: 0 }, color: this.pal, blendMode: 'ADD' }, 50, this.core.depth + 1);
    this.j.sfx('whoosh');
    this.j.sfx('chime');
  }
}
