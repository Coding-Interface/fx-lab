/** Tiles — a grid of squares, circles or diamonds pops in by a pattern (diagonal, spiral, random…). */
class TilesStyle extends TransitionStyle {
  static id = 'tiles';
  static defaultSound = 'shutter';
  static label = 'Tiles / checker';

  /** Fewer, bigger tiles at lower quality. */
  static adapt(p, q) {
    if (q.tiles >= 1) return;
    const k = Math.sqrt(q.tiles);
    p.cols = Math.max(2, Math.round(p.cols * k));
    p.rows = Math.max(2, Math.round(p.rows * k));
  }
  static description = 'A grid of tiles pops in following a pattern. Small random tiles make a pixel dissolve.';
  static params = [
    { key: 'cols', label: 'Columns', type: 'number', min: 2, max: 48, step: 1, default: 12 },
    { key: 'rows', label: 'Rows', type: 'number', min: 2, max: 32, step: 1, default: 8 },
    { key: 'order', label: 'Pattern', type: 'select', options: ['diagonal', 'random', 'spiral', 'center', 'edges', 'rows', 'columns', 'checker'], default: 'diagonal' },
    { key: 'shape', label: 'Tile shape', type: 'select', options: ['square', 'circle', 'diamond'], default: 'square' },
    { key: 'stagger', label: 'Stagger', type: 'number', min: 0, max: 0.9, step: 0.05, default: 0.6 }
  ];

  setup() {
    this.g = this.graphics();
    const { cols, rows } = this.p;
    const rnd = new Phaser.Math.RandomDataGenerator(['tiles']);
    const cx = (cols - 1) / 2;
    const cy = (rows - 1) / 2;
    const maxD = Math.hypot(cx, cy) || 1;
    this.tiles = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let k;
        const d = Math.hypot(c - cx, r - cy) / maxD;
        switch (this.p.order) {
          case 'random': k = rnd.frac(); break;
          case 'spiral': k = ((Math.atan2(r - cy, c - cx) + Math.PI) / (Math.PI * 2)) * 0.35 + d * 0.65; break;
          case 'center': k = d; break;
          case 'edges': k = 1 - d; break;
          case 'rows': k = r / Math.max(1, rows - 1) * 0.85 + c / Math.max(1, cols - 1) * 0.15; break;
          case 'columns': k = c / Math.max(1, cols - 1) * 0.85 + r / Math.max(1, rows - 1) * 0.15; break;
          case 'checker': k = ((r + c) % 2) * 0.5 + rnd.frac() * 0.2; break;
          default: k = (c + r) / Math.max(1, cols + rows - 2);
        }
        this.tiles.push({ c, r, k: Phaser.Math.Clamp(k, 0, 1) });
      }
    }
  }

  render(t) {
    const g = this.g;
    g.clear();
    if (t <= 0.0005) return;
    g.fillStyle(this.color, 1);
    if (t >= 0.999) { g.fillRect(0, 0, this.w, this.h); return; }
    const tw = this.w / this.p.cols;
    const th = this.h / this.p.rows;
    const st = this.p.stagger;
    this.tiles.forEach((tl) => {
      const local = Phaser.Math.Clamp((t - tl.k * st) / (1 - st), 0, 1);
      if (local <= 0) return;
      const x = tl.c * tw + tw / 2;
      const y = tl.r * th + th / 2;
      if (this.p.shape === 'circle') g.fillCircle(x, y, (Math.hypot(tw, th) / 2 + 0.5) * local);
      else if (this.p.shape === 'diamond') {
        const k = local * 1.0;
        g.fillPoints([{ x, y: y - th * k }, { x: x + tw * k, y }, { x, y: y + th * k }, { x: x - tw * k, y }], true);
      } else g.fillRect(x - (tw / 2) * local - 0.5, y - (th / 2) * local - 0.5, tw * local + 1, th * local + 1);
    });
  }
}
