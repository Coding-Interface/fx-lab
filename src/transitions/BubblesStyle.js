/** Bubbles — circles, stars or hearts burst in until they cover the screen. Playful, kid-friendly. */
class BubblesStyle extends TransitionStyle {
  static id = 'bubbles';
  static defaultSound = 'bloop';
  static label = 'Bubbles / shapes';

  /** Fewer, bigger shapes at lower quality. */
  static adapt(p, q) { if (q.tiles < 1) p.count = Math.max(8, Math.round(p.count * q.tiles)); }
  static description = 'Playful circles, stars or hearts pop in until they cover the screen.';
  static params = [
    { key: 'count', label: 'Amount', type: 'number', min: 8, max: 160, step: 1, default: 40 },
    { key: 'shape', label: 'Shape', type: 'select', options: ['circle', 'star', 'heart'], default: 'circle' },
    { key: 'stagger', label: 'Stagger', type: 'number', min: 0, max: 0.9, step: 0.05, default: 0.55 },
    { key: 'bounce', label: 'Bouncy', type: 'bool', default: true }
  ];

  setup() {
    this.g = this.graphics();
    const n = this.p.count;
    const aspect = this.w / this.h;
    const rows = Math.max(2, Math.round(Math.sqrt(n / aspect)));
    const cols = Math.max(2, Math.ceil(n / rows));
    const cw = this.w / cols;
    const ch = this.h / rows;
    const rnd = new Phaser.Math.RandomDataGenerator(['bubbles']);
    const k = this.p.shape === 'star' ? 1.9 : this.p.shape === 'heart' ? 1.25 : 0.8;
    this.items = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        this.items.push({
          x: (c + 0.5 + rnd.realInRange(-0.35, 0.35)) * cw,
          y: (r + 0.5 + rnd.realInRange(-0.35, 0.35)) * ch,
          R: Math.hypot(cw, ch) * k * rnd.realInRange(0.9, 1.25),
          k: rnd.frac(),
          rot: rnd.realInRange(0, Math.PI * 2)
        });
      }
    }
  }

  draw(g, it, r) {
    if (this.p.shape === 'circle') { g.fillCircle(it.x, it.y, r); return; }
    const pts = [];
    if (this.p.shape === 'star') {
      for (let i = 0; i < 10; i++) {
        const a = it.rot + (i * Math.PI) / 5;
        const rr = i % 2 ? r * 0.45 : r;
        pts.push({ x: it.x + Math.cos(a) * rr, y: it.y + Math.sin(a) * rr });
      }
    } else {
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const hx = 16 * Math.sin(a) ** 3;
        const hy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a));
        pts.push({ x: it.x + (hx / 16) * r, y: it.y + (hy / 16) * r });
      }
    }
    g.fillPoints(pts, true);
  }

  render(t) {
    const g = this.g;
    g.clear();
    if (t <= 0.0005) return;
    g.fillStyle(this.color, 1);
    if (t >= 0.999) { g.fillRect(0, 0, this.w, this.h); return; }
    const st = this.p.stagger;
    const ease = this.p.bounce ? Phaser.Math.Easing.Back.Out : (v) => v;
    this.items.forEach((it) => {
      const local = Phaser.Math.Clamp((t - it.k * st) / (1 - st), 0, 1);
      if (local > 0) this.draw(g, it, it.R * ease(local));
    });
  }
}
