/**
 * Iris — the view closes to a shape around a focus point (circle, heart, star…).
 * Darkness is a RenderTexture: fill it, then erase a shape that shrinks.
 */
class IrisStyle extends TransitionStyle {
  static id = 'iris';
  static defaultSound = 'slide';
  static label = 'Iris (shape)';
  static description = 'The view closes to a shape around a point. Great for focusing on a character.';
  static usesFocus = true;
  static params = [
    { key: 'shape', label: 'Shape', type: 'select', options: ['circle', 'diamond', 'square', 'heart', 'star'], default: 'circle' },
    { key: 'spin', label: 'Spin (°)', type: 'number', min: -720, max: 720, step: 15, default: 0 },
    { key: 'pause', label: 'Pause at small size', type: 'number', min: 0, max: 0.4, step: 0.01, default: 0 }
  ];

  static FACTOR = { circle: 1, square: 1, diamond: 1.45, heart: 1.75, star: 2.7 };

  setup() {
    const key = Textures.shape(this.scene, this.p.shape);
    this.rt = this.add(this.scene.add.renderTexture(0, 0, this.w, this.h).setOrigin(0, 0));
    this.brush = this.scene.make.image({ key }, false);
    const f = this.focus;
    const far = Math.max(...this.screenPoly().map((p) => Math.hypot(p.x - f.x, p.y - f.y)));
    this.maxScale = (far * 2 * (IrisStyle.FACTOR[this.p.shape] || 1)) / 256;
  }

  render(t) {
    const rt = this.rt;
    rt.clear();
    if (t <= 0.0005) return;
    rt.fill(this.color, 1);
    // optional "pause": hold a small hole for a beat before closing (classic cartoon ending)
    const pz = this.p.pause;
    let open = 1 - t;
    if (pz > 0) open = t < 1 - pz ? 1 - t / (1 - pz) * (1 - 0.06) : 0.06 * Math.max(0, (1 - t) / pz);
    const s = open * this.maxScale;
    if (s <= 0.0005) return;
    this.brush.setScale(s).setAngle(this.p.spin * (1 - open));
    rt.erase(this.brush, this.focus.x, this.focus.y);
  }

  destroy() {
    if (this.brush) this.brush.destroy();
    super.destroy();
  }
}
