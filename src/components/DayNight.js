/**
 * DayNight — time-of-day lighting over YOUR scene, driven by one number (the hour).
 *   const sky = this.fx.dayNight({ hour: 17, speed: 0.5, stars: true, fireflies: true });
 *   sky.addLight(house.x, house.y - 20, { radius: 60, color: 0xffc96b });  // glows at night
 *   sky.setHour(21);   sky.hour   sky.night (0..1)   sky.phase ('Morning'…)
 * It tints the whole camera view with a MULTIPLY overlay (day = no change),
 * fades stars in over the top `skyHeight` px, and fades lights up as night falls.
 * Options: hour (12), speed (game-hours per real second, 0 = still), stars, fireflies,
 * skyHeight (screen px for stars, 45% of height), clock (show a time pill), depth, onPhase(name).
 */
class DayNight extends Component {
  static TINT = [[0, 0x3a4080], [5, 0x4a4f90], [6.5, 0xffc8c0], [8, 0xffffff], [16.5, 0xffffff], [18, 0xffb080], [19.5, 0x8070c0], [21, 0x3a4080], [24, 0x3a4080]];
  static PHASES = [[5, 'Night'], [8, 'Dawn'], [12, 'Morning'], [17, 'Afternoon'], [20, 'Evening'], [24, 'Night']];

  constructor(fx, o = {}) {
    super(fx);
    const sc = this.scene;
    const { w, h, cx, cy } = this.j.screen();
    this.o = o;
    this.hour = o.hour != null ? o.hour : 12;
    this.speed = o.speed || 0;
    this.depth = o.depth != null ? o.depth : Settings.depth - 100;
    this.overlay = this.track(this.j.ui(sc.add.rectangle(cx, cy, w * 3, h * 3, 0xffffff).setBlendMode(Phaser.BlendModes.MULTIPLY).setDepth(this.depth)));
    this.stars = [];
    if (o.stars !== false) {
      const sky = o.skyHeight != null ? o.skyHeight : h * 0.45;
      for (let i = 0; i < (o.starCount || 60); i++) {
        const s = this.track(this.j.ui(sc.add.image(Phaser.Math.Between(0, w), Phaser.Math.Between(0, sky), 'pfx-star').setScale(Phaser.Math.FloatBetween(0.1, 0.26)).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(this.depth + 1)));
        s.base = Phaser.Math.FloatBetween(0.5, 1);
        s.phase = Math.random() * 6.28;
        this.stars.push(s);
      }
    }
    this.lights = [];
    if (o.fireflies) {
      this.flies = this.track(this.j.emitter(cx, h * 0.75, 'pfx-glow', {
        emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-w / 2, -h * 0.25, w, h * 0.35) }, frequency: 260, lifespan: { min: 2500, max: 4500 },
        speedX: { min: -20, max: 20 }, speedY: { min: -14, max: 8 }, scale: { min: 0.06, max: 0.12 }, tint: 0xd9ff8a, blendMode: 'ADD',
        alpha: { onEmit: (p) => { p.pfxBlink = Math.random() * 6.28; return 0; }, onUpdate: (p, k, t) => Math.max(0, Math.sin(t * Math.PI)) * (0.5 + 0.5 * Math.sin(p.pfxBlink + t * 14)) * this.night }
      }, this.depth + 2).setScrollFactor(0));
    }
    if (o.clock) {
      this.clock = this.track(this.j.ui(this.j.text(16, 16, '', 15, '#ffffff', { body: true, ox: 0, oy: 0, stroke: '#1a1030', strokeThickness: 4 }).setDepth(this.depth + 3)));
    }
    this.onUpdate((t, dt) => {
      if (this.speed) this.hour = (this.hour + (dt / 1000) * this.speed) % 24;
      this.apply(t);
    });
    this.apply(0);
  }

  static colorAt(h) {
    const K = DayNight.TINT;
    let i = 0;
    while (i < K.length - 2 && h >= K[i + 1][0]) i++;
    const f = Phaser.Math.Clamp((h - K[i][0]) / (K[i + 1][0] - K[i][0]), 0, 1);
    const C = Phaser.Display.Color;
    const m = C.Interpolate.ColorWithColor(C.ValueToColor(K[i][1]), C.ValueToColor(K[i + 1][1]), 100, f * 100);
    return C.GetColor(m.r, m.g, m.b);
  }

  static nightAt(h) {
    if (h >= 21 || h < 5) return 1;
    if (h >= 8 && h < 17) return 0;
    if (h < 8) return 1 - (h - 5) / 3;
    return (h - 17) / 4;
  }

  apply(time) {
    const h = this.hour;
    this.night = DayNight.nightAt(h);
    this.overlay.setFillStyle(DayNight.colorAt(h));
    const tt = time / 1000;
    this.stars.forEach((s) => s.setAlpha(this.night * s.base * (Settings.reducedMotion ? 1 : 0.7 + 0.3 * Math.sin(tt * 2 + s.phase))));
    this.lights.forEach((l) => {
      const on = this.night > l.at;
      l.img.setAlpha(on ? Math.min(1, (this.night - l.at) * 3) * l.max : 0);
      if (on !== l.on) { l.on = on; if (on) this.j.pop(l.img, 0.25, 260); }
    });
    const phase = DayNight.PHASES.find(([lim]) => h < lim)[1];
    if (phase !== this.phase) { this.phase = phase; if (this.o.onPhase) this.o.onPhase(phase, h); }
    if (this.clock) {
      const hh = Math.floor(h);
      const mm = Math.floor(((h - hh) * 60) / 15) * 15;
      this.clock.setText(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} · ${phase}`);
    }
  }

  setHour(h) { this.hour = ((h % 24) + 24) % 24; this.apply(this.scene.time.now); return this; }

  /** Smoothly move time forward by `hours`. */
  advance(hours = 6, ms = 1200) {
    const o = { h: this.hour };
    const sp = this.speed;
    this.speed = 0;
    return this.j.tween({ targets: o, h: this.hour + hours, duration: ms, ease: 'Sine.easeInOut', onUpdate: () => this.setHour(o.h), onComplete: () => { this.speed = sp; } });
  }

  /** A world-space light (window, lamp, campfire) that glows at night. */
  addLight(x, y, o = {}) {
    const img = this.track(this.scene.add.image(x, y, 'pfx-glow').setTint(o.color || 0xffc96b).setBlendMode(Phaser.BlendModes.ADD)
      .setScale((o.radius || 60) / 40).setAlpha(0).setDepth(this.depth + 1));
    const l = { img, at: o.at != null ? o.at : Phaser.Math.FloatBetween(0.3, 0.6), max: o.alpha || 0.85, on: false };
    this.lights.push(l);
    this.apply(this.scene.time.now);
    return img;
  }
}
