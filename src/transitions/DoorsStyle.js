/** Doors — two panels slide together from opposite edges and part again. */
class DoorsStyle extends TransitionStyle {
  static id = 'doors';
  static defaultSound = 'thud';
  static defaultRevealSound = 'slide';
  static label = 'Doors';
  static description = 'Two panels close from opposite sides, like sliding doors or an elevator.';
  static params = [
    { key: 'axis', label: 'Doors move', type: 'select', options: ['horizontal', 'vertical'], default: 'horizontal' },
    { key: 'trim', label: 'Edge trim (px)', type: 'number', min: 0, max: 24, step: 1, default: 6 },
    { key: 'trimColor', label: 'Trim colour', type: 'color', default: '#ffc94a' }
  ];

  setup() {
    this.g = this.graphics();
    this.trimCol = Phaser.Display.Color.HexStringToColor(this.p.trimColor || '#ffffff').color;
  }

  render(t) {
    const g = this.g;
    const { w, h } = this;
    const tr = this.p.trim;
    g.clear();
    if (t <= 0.0005) return;
    g.fillStyle(this.color, 1);
    if (this.p.axis === 'vertical') {
      const s = (h / 2) * t;
      g.fillRect(0, 0, w, s + 1).fillRect(0, h - s - 1, w, s + 1);
      if (tr && t < 0.999) g.fillStyle(this.trimCol, 1).fillRect(0, s - tr, w, tr).fillRect(0, h - s, w, tr);
    } else {
      const s = (w / 2) * t;
      g.fillRect(0, 0, s + 1, h).fillRect(w - s - 1, 0, s + 1, h);
      if (tr && t < 0.999) g.fillStyle(this.trimCol, 1).fillRect(s - tr, 0, tr, h).fillRect(w - s, 0, tr, h);
    }
  }
}
