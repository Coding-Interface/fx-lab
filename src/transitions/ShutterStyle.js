/**
 * Shutter — slanted, coloured bars slide in from alternate sides one after
 * another until they cover the screen, with an optional spinning medallion
 * (a "?" badge, a star, your game's logo letter…) in the middle. On reveal
 * the bars carry on out the other side, or slide back the way they came.
 */
class ShutterStyle extends TransitionStyle {
  static id = 'shutter';
  static label = 'Shutter bars';
  static description = 'Slanted colourful bars slide in from alternate sides, with an optional spinning medallion. Great for game shows, quizzes and level select.';
  static defaultColor = '#3a2e7a';
  static defaultSound = 'whoosh';
  static defaultRevealSound = 'swish';
  static params = [
    { key: 'palette', label: 'Bar colours', type: 'colors', default: ['#ff5e5b', '#ffc93c', '#2ec4b6', '#3a2e7a', '#ff7eb6', '#4ea8ff'] },
    { key: 'count', label: 'Bars', type: 'number', min: 3, max: 24, step: 1, default: 8 },
    { key: 'angle', label: 'Slant (°)', type: 'number', min: -45, max: 45, step: 1, default: -14 },
    { key: 'stagger', label: 'Stagger', type: 'number', min: 0, max: 0.85, step: 0.05, default: 0.45 },
    { key: 'from', label: 'Bars come from', type: 'select', options: ['alternate', 'top', 'bottom'], default: 'alternate' },
    { key: 'shine', label: 'Highlight stripe', type: 'bool', default: true },
    { key: 'badge', label: 'Medallion', type: 'bool', default: true },
    { key: 'badgeText', label: 'Medallion text', type: 'text', default: '?', showIf: 'badge' },
    { key: 'badgeSize', label: 'Medallion size', type: 'number', min: 0.08, max: 0.4, step: 0.01, default: 0.19, showIf: 'badge' },
    { key: 'badgeFill', label: 'Medallion colour', type: 'color', default: '#fff4dc', showIf: 'badge' },
    { key: 'badgeRing', label: 'Ring colour', type: 'color', default: '#ffc93c', showIf: 'badge' },
    { key: 'badgeTextColor', label: 'Text colour', type: 'color', default: '#ff5e5b', showIf: 'badge' }
  ];

  setup() {
    const P = ParticlePreset;
    const w = this.w;
    const h = this.h;
    const diag = Math.hypot(w, h);
    const n = Math.max(1, Math.round(this.p.count));
    const pal = (this.p.palette && this.p.palette.length ? this.p.palette : [this.color]).map((c) => P.hex(c));
    this.layer = this.add(this.scene.add.container(w / 2, h / 2).setAngle(this.p.angle));
    const barW = (diag * 1.05) / n;
    this.barH = diag * 1.2;
    this.bars = [];
    for (let i = 0; i < n; i++) {
      const x = -diag * 0.525 + barW * (i + 0.5);
      const dir = this.p.from === 'top' ? -1 : this.p.from === 'bottom' ? 1 : (i % 2 === 0 ? -1 : 1);
      const bar = this.scene.add.rectangle(x, dir * this.barH, barW + 3, this.barH, pal[i % pal.length]);
      bar.dir = dir;
      this.layer.add(bar);
      if (this.p.shine) {
        bar.stripe = this.scene.add.rectangle(x - barW * 0.32, bar.y, Math.max(3, barW * 0.06), this.barH, 0xffffff, 0.18);
        this.layer.add(bar.stripe);
      }
      this.bars.push(bar);
    }
    if (this.p.badge) {
      const r = Math.min(w, h) * this.p.badgeSize;
      const medal = this.scene.add.container(0, 0);
      const g = this.scene.add.graphics();
      g.fillStyle(this.color, 1).fillCircle(0, 0, r * 1.17);
      g.fillStyle(P.hex(this.p.badgeFill), 1).fillCircle(0, 0, r);
      g.lineStyle(Math.max(3, r * 0.085), P.hex(this.p.badgeRing), 1).strokeCircle(0, 0, r);
      medal.add(g);
      if (this.p.badgeText) {
        const txt = this.j.text(0, r * 0.06, String(this.p.badgeText), Math.round(r * (String(this.p.badgeText).length > 1 ? 0.75 : 1.35)), this.p.badgeTextColor);
        medal.add(txt);
      }
      medal.setScale(0);
      this.medal = medal;
      this.layer.add(medal);
    }
    this.cubicIn = P.ease('Cubic.easeIn');
    this.cubicOut = P.ease('Cubic.easeOut');
    this.backOut = P.ease('Back.easeOut');
    this.backIn = P.ease('Back.easeIn');
  }

  /** 0…1 progress of bar i when the whole effect is at u (bars start one after another). */
  local(i, u) {
    const n = this.bars.length;
    const S = this.p.stagger;
    const start = n > 1 ? (i / (n - 1)) * S : 0;
    return Phaser.Math.Clamp((u - start) / Math.max(0.0001, 1 - S), 0, 1);
  }

  render(t, phase) {
    const exiting = phase === 'reveal';
    const through = exiting && this.continues;
    const u = exiting ? 1 - t : t; // progress of the current half
    this.bars.forEach((bar, i) => {
      const k = this.local(i, u);
      let y;
      if (!exiting) y = bar.dir * this.barH * (1 - this.cubicOut(k));
      else y = (through ? -bar.dir : bar.dir) * this.barH * this.cubicIn(k);
      bar.y = y;
      if (bar.stripe) bar.stripe.y = y;
    });
    if (this.medal) {
      if (!exiting) {
        const m = Phaser.Math.Clamp((t - 0.3) / 0.62, 0, 1);
        this.medal.setScale(Math.max(0, this.backOut(m))).setAngle(-this.p.angle + 360 * this.cubicOut(m));
      } else {
        const m = Phaser.Math.Clamp(u / 0.3, 0, 1);
        this.medal.setScale(Math.max(0, 1 - this.backIn(m))).setAngle(-this.p.angle);
      }
    }
  }
}
