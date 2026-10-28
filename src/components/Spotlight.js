/**
 * Spotlight — darkness with a torch beam that follows the pointer or a sprite.
 *   const torch = this.fx.spotlight({ follow: 'pointer', radius: 130, darkness: 0.94 });
 *   torch.watch(hiddenKey, () => this.foundKey());   // fires once when the beam finds it
 *   torch.flash();      // a moment of extra light
 *   torch.lightUp();    // fade the darkness away (e.g. everything found)
 * follow: 'pointer' | a game object. Options: radius, darkness, smoothing (0.15), color (darkness colour), depth.
 */
class Spotlight extends Component {
  constructor(fx, o = {}) {
    super(fx);
    const sc = this.scene;
    const { w, h } = this.j.screen();
    this.o = o;
    this.follow = o.follow || 'pointer';
    this.radius = o.radius || 130;
    this.darkness = o.darkness != null ? o.darkness : 0.94;
    this.color = o.color != null ? o.color : 0x05030c;
    this.flare = 1;
    this.watched = [];
    this.rt = this.track(this.j.ui(sc.add.renderTexture(0, 0, w, h).setOrigin(0, 0).setDepth(o.depth != null ? o.depth : this.j.depth(600))));
    this.brush = this.track(sc.make.image({ key: 'pfx-glow' }, false));
    const p = this.targetScreen();
    this.head = { x: p.x, y: p.y };
    this.onUpdate((t, dt) => this.tick(dt));
  }

  targetScreen() {
    if (this.follow === 'pointer') { const ptr = this.scene.input.activePointer; return { x: ptr.x, y: ptr.y }; }
    if (!this.follow.scene) return this.head || { x: 0, y: 0 };
    const c = this.j.centerOf(this.follow);
    return this.j.isScreen(this.follow) ? c : this.j.toScreen(c.x, c.y);
  }

  /** Call onFound(obj) once when the beam reaches obj. */
  watch(obj, onFound, o = {}) {
    this.watched.push({ obj, onFound, found: false, sparkle: o.sparkle !== false });
    return this;
  }

  flash(scale = 2.2, ms = 700) {
    const o = { f: scale };
    this.flare = scale;
    this.j.sfx('whoosh');
    return this.j.tween({ targets: o, f: 1, duration: ms, ease: 'Cubic.easeOut', onUpdate: () => { this.flare = o.f; } });
  }

  lightUp(ms = 1200) { return this.j.tween({ targets: this, darkness: 0, duration: ms }); }

  setRadius(r) { this.radius = r; return this; }

  tick(dt) {
    const p = this.targetScreen();
    const k = 1 - Math.pow(1 - (this.o.smoothing != null ? this.o.smoothing : 0.15), dt / 16.67);
    this.head.x += (p.x - this.head.x) * k;
    this.head.y += (p.y - this.head.y) * k;
    const r = this.radius * this.flare;
    this.brush.setScale((r * 2) / 128);
    this.rt.clear();
    if (this.darkness > 0.001) {
      this.rt.fill(this.color, this.darkness);
      this.rt.erase(this.brush, this.head.x, this.head.y);
      this.rt.erase(this.brush, this.head.x, this.head.y);
    }
    this.watched.forEach((wt) => {
      if (wt.found || !wt.obj.scene) return;
      const c = this.j.centerOf(wt.obj);
      const s = this.j.isScreen(wt.obj) ? c : this.j.toScreen(c.x, c.y);
      if (Phaser.Math.Distance.Between(s.x, s.y, this.head.x, this.head.y) < r * 0.45) {
        wt.found = true;
        if (wt.sparkle) {
          wt.obj.setDepth(this.rt.depth + 1);
          this.j.pop(wt.obj, 0.3, 360);
          this.j.burst(c.x, c.y, 'pfx-star', { speed: { min: 60, max: 200 }, lifespan: 600, scale: { start: 0.5, end: 0 }, color: [0xffffff, 0xffd86b], blendMode: 'ADD' }, 14, this.rt.depth + 2);
          this.j.sfx('chime');
        }
        if (wt.onFound) wt.onFound(wt.obj);
      }
    });
  }
}
