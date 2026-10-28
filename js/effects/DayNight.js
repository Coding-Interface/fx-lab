/**
 * DayNight — a full day cycle: sky colour, sun and moon, stars, lit windows
 * and fireflies, all driven by ONE number (the hour).
 *
 * LESSONS:
 *  - Drive everything from a single value. update() turns the hour into sky
 *    colour, sun position, darkness, star alpha… so scrubbing or speeding up
 *    time "just works".
 *  - Colour keyframes + interpolation give much richer skies than a straight
 *    blue → black fade: dawn pink and sunset orange do the storytelling.
 *  - Darken the LAND with a shade layer, but keep lights (windows,
 *    fireflies) ABOVE the shade so they glow at night.
 *  - Lights switching on one by one (each window has its own threshold)
 *    feels like people living there.
 */
class DayNight extends BaseEffect {
  static id = 'daynight';
  static title = 'Day & Night Cycle';
  static group = 'story';
  static tags = ['stories', 'games'];
  static useFor = 'Story mood and time passing, farming/life sims, "the next morning…" beats, calm ambient menus.';
  static mode = 'continuous';
  static hint = 'Click to fast-forward 6 hours.';
  static file = 'js/effects/DayNight.js';
  static uses = ['js/fx/Juice.js'];
  static summary = 'The hour drives everything: interpolated sky keyframes, a sun and moon on arcs, stars that fade in, a land shade, windows that light up one by one and fireflies at night.';
  static steps = [
    'Sky: keyframes (night, dawn pink, day blue, sunset orange) blended with Color.Interpolate by hour.',
    'Sun: visible 6:00–18:00 on a half-circle arc; the moon takes the other half of the day.',
    'Night amount (0–1) drives star alpha, the land shade alpha and the firefly emitter.',
    'Each window has its own switch-on threshold, and pops with a glow when it lights.',
    'Fireflies: soft ADD dots with random drift; alpha follows a sine so they blink gently.',
    'A clock pill shows the time of day as words as well, so the cue is not only colour.'
  ];
  static params = [
    { key: 'cycle', label: 'Seconds per day', min: 6, max: 120, step: 1, value: 24 },
    { key: 'start', label: 'Start hour', min: 0, max: 23, step: 1, value: 15 },
    { key: 'flies', label: 'Fireflies', min: 0, max: 10, step: 1, value: 6 }
  ];

  static SKY = [[0, 0x0b1030], [5, 0x1b2150], [6.5, 0xf7a6b9], [8, 0x8fd3ff], [16, 0x8fd3ff], [18, 0xff9a6b], [19.5, 0x3a2a6b], [21, 0x0b1030], [24, 0x0b1030]];

  start() {
    const s = this.scene;
    this.hour = this.p.start;
    this.sky = this.track(s.add.rectangle(480, 300, 960, 600, 0x8fd3ff).setDepth(0));
    this.stars = Array.from({ length: 70 }, () => this.track(s.add.image(Phaser.Math.Between(0, 960), Phaser.Math.Between(0, 330), 'fx-star').setScale(Phaser.Math.FloatBetween(0.1, 0.28)).setBlendMode(Phaser.BlendModes.ADD).setDepth(1).setAlpha(0)));
    this.stars.forEach((st) => { st.base = Phaser.Math.FloatBetween(0.5, 1); st.phase = Math.random() * 6.28; });
    this.sunGlow = this.track(s.add.image(0, 0, 'fx-glow').setTint(0xffd86b).setBlendMode(Phaser.BlendModes.ADD).setScale(2.2).setDepth(2));
    this.sun = this.track(s.add.circle(0, 0, 38, 0xfff1a6).setDepth(2));
    this.moon = this.track(s.add.container(0, 0).setDepth(2));
    const mg = s.add.graphics().fillStyle(0xf6f1d8, 1).fillCircle(0, 0, 30).fillStyle(0xd9d2b4, 1).fillCircle(-8, -6, 6).fillCircle(9, 8, 4);
    this.moon.add(mg);

    const land = (g, shade) => {
      const c = (col) => (shade ? 0x070a22 : col);
      g.fillStyle(c(0x5fae6b), 1).fillEllipse(220, 600, 900, 380);
      g.fillStyle(c(0x4c9a5c), 1).fillEllipse(760, 610, 900, 360);
      g.fillStyle(c(0xe8d6b0), 1).fillRect(560, 330, 170, 120);
      g.fillStyle(c(0xb5523b), 1).fillTriangle(540, 335, 750, 335, 645, 255);
      g.fillStyle(c(0x7a4a22), 1).fillRect(628, 390, 34, 60);
      g.fillStyle(c(0x7a4a22), 1).fillRect(220, 330, 18, 110);
      g.fillStyle(c(0x3f8a4b), 1).fillCircle(229, 320, 54).fillCircle(196, 346, 36).fillCircle(262, 346, 36);
    };
    land(this.track(s.add.graphics().setDepth(3)), false);
    this.shade = this.track(s.add.graphics().setDepth(4));
    land(this.shade, true);

    this.windows = [[582, 350], [690, 350], [582, 400], [690, 400]].map(([x, y], i) => {
      const w = this.track(s.add.rectangle(x + 9, y + 12, 22, 24, 0x3a2f4a).setDepth(5));
      const glow = this.track(s.add.image(x + 9, y + 12, 'fx-glow').setTint(0xffc96b).setBlendMode(Phaser.BlendModes.ADD).setScale(0.6).setAlpha(0).setDepth(5));
      return { w, glow, at: 0.35 + i * 0.12, on: false };
    });

    this.flies = this.emitter(480, 440, 'fx-glow', {
      emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-460, -120, 920, 160) },
      frequency: this.p.flies ? 1600 / this.p.flies : -1, lifespan: { min: 2500, max: 4500 },
      speedX: { min: -20, max: 20 }, speedY: { min: -14, max: 8 }, accelerationX: { min: -8, max: 8 },
      scale: { min: 0.06, max: 0.12 }, tint: 0xd9ff8a, blendMode: 'ADD',
      alpha: { onEmit: (pt) => { pt.blink = Math.random() * 6.28; return 0; }, onUpdate: (pt, k, t) => Math.max(0, Math.sin(t * Math.PI)) * (0.5 + 0.5 * Math.sin(pt.blink + t * 14)) * (this.night || 0) }
    }, 7);

    this.clock = this.track(s.add.container(18, 18).setDepth(20));
    const cb = s.add.graphics().fillStyle(0x0f0b1e, 0.8).fillRoundedRect(0, 0, 230, 40, 20);
    this.clockText = Juice.text(s, 115, 20, '', 15, '#ece8ff', { body: true, weight: '800' });
    this.clock.add([cb, this.clockText]);
  }

  autoPlay() {}

  play() {
    const s = this.scene;
    const o = { h: this.hour };
    this.ff = true;
    Juice.sfx('whoosh');
    s.tweens.add({ targets: o, h: this.hour + 6, duration: 1200, ease: 'Sine.easeInOut', onUpdate: () => { this.hour = o.h % 24; }, onComplete: () => { this.ff = false; } });
  }

  skyAt(h) {
    const K = DayNight.SKY;
    let i = 0;
    while (i < K.length - 2 && h >= K[i + 1][0]) i++;
    const [h0, c0] = K[i];
    const [h1, c1] = K[i + 1];
    const f = Phaser.Math.Clamp((h - h0) / (h1 - h0), 0, 1);
    const C = Phaser.Display.Color;
    const m = C.Interpolate.ColorWithColor(C.ValueToColor(c0), C.ValueToColor(c1), 100, f * 100);
    return C.GetColor(m.r, m.g, m.b);
  }

  nightAt(h) {
    if (h >= 21 || h < 5) return 1;
    if (h >= 8 && h < 17) return 0;
    if (h < 8) return 1 - (h - 5) / 3;
    return (h - 17) / 4;
  }

  static WORDS = [[5, 'Night'], [8, 'Dawn'], [12, 'Morning'], [17, 'Afternoon'], [20, 'Evening'], [24, 'Night']];

  update(time, delta) {
    if (!this.ff) this.hour = (this.hour + (delta * Juice.timeScale) / 1000 * (24 / this.p.cycle)) % 24;
    const h = this.hour;
    const n = this.nightAt(h);
    this.night = n;
    this.sky.setFillStyle(this.skyAt(h));
    // sun 6–18, moon 18–6, each on a half-circle arc
    const arc = (p) => ({ x: 80 + 800 * p, y: 360 - Math.sin(p * Math.PI) * 290 });
    const sp = (h - 6) / 12;
    const sunUp = sp >= 0 && sp <= 1;
    const sa = arc(Phaser.Math.Clamp(sp, 0, 1));
    this.sun.setPosition(sa.x, sa.y).setVisible(sunUp);
    this.sunGlow.setPosition(sa.x, sa.y).setVisible(sunUp).setAlpha(0.6 - n * 0.4);
    const mp = ((h - 18 + 24) % 24) / 12;
    const ma = arc(Phaser.Math.Clamp(mp, 0, 1));
    this.moon.setPosition(ma.x, ma.y).setVisible(mp <= 1);
    // stars twinkle (reduced motion: steady)
    const tt = time / 1000;
    this.stars.forEach((st) => st.setAlpha(n * st.base * (Juice.reduced ? 1 : 0.7 + 0.3 * Math.sin(tt * 2 + st.phase))));
    this.shade.setAlpha(n * 0.62);
    // windows switch on one by one
    this.windows.forEach((w) => {
      const on = n > w.at;
      if (on !== w.on) {
        w.on = on;
        w.w.setFillStyle(on ? 0xffd88a : 0x3a2f4a);
        this.scene.tweens.add({ targets: w.glow, alpha: on ? 0.75 : 0, duration: 260 });
        if (on) Juice.pop(this.scene, w.w, 0.25, 260);
      }
    });
    const hh = Math.floor(h);
    const mm = Math.floor((h - hh) * 60 / 15) * 15;
    const word = DayNight.WORDS.find(([lim]) => h < lim)[1];
    this.clockText.setText(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} · ${word}`);
  }
}
