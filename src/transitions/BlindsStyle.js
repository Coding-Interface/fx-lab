/** Blinds — strips grow one after another at any angle (horizontal, vertical, diagonal). */
class BlindsStyle extends TransitionStyle {
  static id = 'blinds';
  static defaultSound = 'shutter';
  static label = 'Blinds / stripes';
  static description = 'Strips grow one after another. Set an angle for diagonal stripes.';
  static params = [
    { key: 'count', label: 'Strips', type: 'number', min: 2, max: 40, step: 1, default: 10 },
    { key: 'angle', label: 'Angle (°)', type: 'number', min: 0, max: 179, step: 1, default: 0 },
    { key: 'stagger', label: 'Stagger', type: 'number', min: 0, max: 0.9, step: 0.05, default: 0.5 },
    { key: 'from', label: 'Order', type: 'select', options: ['start', 'end', 'center', 'edges', 'random'], default: 'start' }
  ];

  setup() {
    this.g = this.graphics();
    const a = Phaser.Math.DegToRad(this.p.angle + 90);
    this.nx = Math.cos(a);
    this.ny = Math.sin(a);
    this.r = this.range(this.nx, this.ny);
    const n = this.p.count;
    const rnd = new Phaser.Math.RandomDataGenerator(['blinds']);
    this.order = Array.from({ length: n }, (_, i) => {
      const u = n === 1 ? 0 : i / (n - 1);
      switch (this.p.from) {
        case 'end': return 1 - u;
        case 'center': return Math.abs(u - 0.5) * 2;
        case 'edges': return 1 - Math.abs(u - 0.5) * 2;
        case 'random': return rnd.frac();
        default: return u;
      }
    });
  }

  render(t) {
    const g = this.g;
    g.clear();
    if (t <= 0.0005) return;
    g.fillStyle(this.color, 1);
    if (t >= 0.999) { g.fillRect(0, 0, this.w, this.h); return; }
    const { min, max } = this.r;
    const n = this.p.count;
    const sp = (max - min) / n;
    const st = this.p.stagger;
    const S = TransitionStyle;
    for (let i = 0; i < n; i++) {
      const local = Phaser.Math.Clamp((t - this.order[i] * st) / (1 - st), 0, 1);
      if (local <= 0) continue;
      const c = min + (i + 0.5) * sp;
      const half = (sp / 2) * local + 0.5;
      const strip = S.clip(S.clip(this.screenPoly(), this.nx, this.ny, c + half, true), this.nx, this.ny, c - half, false);
      this.fillPoly(g, strip);
    }
  }
}
