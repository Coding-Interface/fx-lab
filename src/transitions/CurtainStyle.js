/** Curtain — theatre curtains with folds and a scalloped valance. Perfect for stories and shows. */
class CurtainStyle extends TransitionStyle {
  static id = 'curtain';
  static defaultSound = 'rumble';
  static defaultRevealSound = 'rumble';
  static label = 'Theatre curtain';
  static description = 'Velvet curtains close from both sides under a scalloped valance.';
  static defaultColor = '#8b1e2d';
  static params = [
    { key: 'folds', label: 'Folds', type: 'number', min: 2, max: 30, step: 1, default: 12 },
    { key: 'valance', label: 'Valance', type: 'bool', default: true },
    { key: 'trimColor', label: 'Trim colour', type: 'color', default: '#ffc94a' }
  ];

  setup() {
    this.g = this.graphics();
    const C = Phaser.Display.Color.IntegerToColor(this.color);
    this.dark = Phaser.Display.Color.GetColor(C.red * 0.6, C.green * 0.6, C.blue * 0.6);
    this.light = Phaser.Display.Color.GetColor(Math.min(255, C.red * 1.25 + 20), Math.min(255, C.green * 1.25 + 10), Math.min(255, C.blue * 1.25 + 10));
    this.trim = Phaser.Display.Color.HexStringToColor(this.p.trimColor || '#ffc94a').color;
  }

  panel(g, x0, wPanel, fromLeft) {
    const { h } = this;
    const folds = Math.max(2, Math.round(this.p.folds / 2));
    const fw = wPanel / folds;
    g.fillStyle(this.color, 1).fillRect(x0, 0, wPanel + 1, h);
    for (let i = 0; i < folds; i++) {
      const fx = x0 + i * fw;
      g.fillStyle(this.dark, 0.55).fillRect(fx + fw * 0.62, 0, fw * 0.38, h);
      g.fillStyle(this.light, 0.35).fillRect(fx + fw * 0.12, 0, fw * 0.16, h);
    }
    g.fillStyle(this.trim, 1).fillRect(fromLeft ? x0 + wPanel - 4 : x0, 0, 4, h);
  }

  render(t) {
    const g = this.g;
    const { w } = this;
    g.clear();
    if (t <= 0.0005) return;
    const pw = (w / 2) * t;
    this.panel(g, 0, pw, true);
    this.panel(g, w - pw, pw, false);
    if (this.p.valance) {
      const vh = 46 * Math.min(1, t * 3);
      g.fillStyle(this.dark, 1).fillRect(0, 0, w, vh);
      const n = Math.ceil(w / 60);
      for (let i = 0; i < n; i++) g.fillCircle(i * 60 + 30, vh, 30 * Math.min(1, t * 3));
      g.fillStyle(this.trim, 1).fillRect(0, vh - 4, w, 4);
    }
  }
}
