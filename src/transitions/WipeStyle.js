/**
 * Wipe — a straight edge sweeps across at any angle, with an optional bright edge line.
 * Uses half-plane clipping, so every angle works in WebGL and Canvas.
 */
class WipeStyle extends TransitionStyle {
  static id = 'wipe';
  static defaultSound = 'swish';
  static label = 'Wipe';
  static description = 'A straight edge sweeps across at any angle. "Continue" makes the reveal carry on the same way.';
  static params = [
    { key: 'angle', label: 'Direction (°)', type: 'number', min: 0, max: 359, step: 1, default: 0 },
    { key: 'edge', label: 'Edge line (px)', type: 'number', min: 0, max: 40, step: 1, default: 0 },
    { key: 'edgeColor', label: 'Edge colour', type: 'color', default: '#ffc94a' }
  ];

  setup() {
    this.g = this.graphics();
    const a = Phaser.Math.DegToRad(this.p.angle);
    this.nx = Math.cos(a);
    this.ny = Math.sin(a);
    this.r = this.range(this.nx, this.ny);
    this.edgeCol = Phaser.Display.Color.HexStringToColor(this.p.edgeColor || '#ffffff').color;
  }

  render(t, phase) {
    const g = this.g;
    g.clear();
    if (t <= 0.0005) return;
    const { min, max } = this.r;
    const span = max - min + this.p.edge * 2;
    const S = TransitionStyle;
    let poly;
    let edgeAt;
    let edgeDir;
    if (phase === 'reveal' && this.continues) {
      const c = min - this.p.edge + (1 - t) * span;
      poly = S.clip(this.screenPoly(), this.nx, this.ny, c, false);
      edgeAt = c; edgeDir = -1;
    } else {
      const c = min - this.p.edge + t * span;
      poly = S.clip(this.screenPoly(), this.nx, this.ny, c, true);
      edgeAt = c; edgeDir = 1;
    }
    g.fillStyle(this.color, 1);
    this.fillPoly(g, poly);
    if (this.p.edge > 0 && t < 0.999) {
      const band = S.clip(S.clip(this.screenPoly(), this.nx, this.ny, edgeAt + (edgeDir > 0 ? this.p.edge : 0), true), this.nx, this.ny, edgeAt - (edgeDir > 0 ? 0 : this.p.edge), false);
      g.fillStyle(this.edgeCol, 1);
      this.fillPoly(g, band);
    }
  }
}
