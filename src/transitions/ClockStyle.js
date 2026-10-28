/** Clock — a radial sweep like a clock hand. Nice for "later that day…" and timers. */
class ClockStyle extends TransitionStyle {
  static id = 'clock';
  static defaultSound = 'tickTock';
  static label = 'Clock wipe';
  static description = 'A radial sweep like a clock hand. "Continue" keeps sweeping on reveal.';
  static usesFocus = true;
  static params = [
    { key: 'start', label: 'Start angle (°)', type: 'number', min: -180, max: 180, step: 5, default: -90 },
    { key: 'direction', label: 'Direction', type: 'select', options: ['clockwise', 'anticlockwise'], default: 'clockwise' },
    { key: 'sectors', label: 'Hands', type: 'number', min: 1, max: 8, step: 1, default: 1 }
  ];

  setup() {
    this.g = this.graphics();
    const f = this.focus;
    this.R = Math.max(...this.screenPoly().map((p) => Math.hypot(p.x - f.x, p.y - f.y))) + 4;
  }

  render(t, phase) {
    const g = this.g;
    g.clear();
    if (t <= 0.0005) return;
    g.fillStyle(this.color, 1);
    if (t >= 0.999) { g.fillRect(0, 0, this.w, this.h); return; }
    const n = this.p.sectors;
    const seg = (Math.PI * 2) / n;
    const dir = this.p.direction === 'anticlockwise' ? -1 : 1;
    const a0 = Phaser.Math.DegToRad(this.p.start);
    for (let i = 0; i < n; i++) {
      const base = a0 + dir * i * seg;
      let from;
      let to;
      if (phase === 'reveal' && this.continues) { from = base + dir * (1 - t) * seg; to = base + dir * seg; } else { from = base; to = base + dir * t * seg; }
      g.beginPath();
      g.slice(this.focus.x, this.focus.y, this.R, from, to, dir < 0);
      g.fillPath();
    }
  }
}
