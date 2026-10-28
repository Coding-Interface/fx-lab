/**
 * TransitionStyle — base class for every transition look.
 *
 * A style only has to answer one question: "what does the screen look like
 * when it is `t` covered?" (t = 0 clear … 1 fully covered). The player tweens
 * t up (cover) and back down (reveal), so every style gets easing, hold,
 * labels, scrubbing in the editor and scene-to-scene support for free.
 *
 *   static id      'wipe'
 *   static label   'Wipe'
 *   static params  [{ key, label, type: 'number'|'select'|'color'|'colors'|'bool'|'text', min, max, step, options, default, showIf }]
 *   static defaultSound / defaultRevealSound   suitable sounds (presets can override)
 *   static requires     device features it needs, e.g. ['postFX'] (else the preset's fallback plays)
 *   static adapt(p, q)  lighten params for lower quality levels (q = Quality profile)
 *   setup()        create objects (screen-space, already at this.depth)
 *   render(t, phase)   phase: 'cover' | 'reveal'
 *   destroy()
 */
class TransitionStyle {
  static id = 'base';
  static label = 'Base';
  static description = '';
  static params = [];
  /** Default colour when the user switches to this style in the editor. */
  static defaultColor = '#000000';
  /** Sound played as the screen covers / uncovers, unless the preset picks its own. */
  static defaultSound = 'whoosh';
  static defaultRevealSound = null;
  /** Device features this style needs ('webgl', 'shaderFX', 'postFX'). Missing → fallback. */
  static requires = [];
  /** Style used when a requirement is missing and the preset names no fallback. */
  static fallbackStyle = 'fade';
  /** Lighten params for lower quality (fewer tiles, bubbles…). q = Quality profile. */
  static adapt() {}
  /** Does this style use a focus point (x, y)? */
  static usesFocus = false;

  constructor(fx, preset, focus) {
    this.fx = fx;
    this.j = fx.juice;
    this.scene = fx.scene;
    this.preset = preset;
    const s = this.j.screen();
    this.w = s.w;
    this.h = s.h;
    this.focus = focus || { x: s.cx, y: s.cy };
    this.depth = preset.depth != null ? preset.depth : this.j.depth(950);
    const c = preset.color;
    this.color = typeof c === 'number' ? c : Phaser.Display.Color.HexStringToColor(c || '#000000').color;
    this.p = {};
    this.constructor.params.forEach((d) => { this.p[d.key] = preset.params && preset.params[d.key] != null ? preset.params[d.key] : d.default; });
    this.constructor.adapt(this.p, Quality.profile());
    this.objs = [];
    this.continues = preset.reveal === 'continue';
  }

  /** Track a screen-space object at this transition's depth. */
  add(obj) {
    obj.setDepth(this.depth);
    this.j.ui(obj);
    this.objs.push(obj);
    return obj;
  }

  graphics() { return this.add(this.scene.add.graphics()); }

  /** Screen rectangle as a polygon. */
  screenPoly() { return [{ x: 0, y: 0 }, { x: this.w, y: 0 }, { x: this.w, y: this.h }, { x: 0, y: this.h }]; }

  /**
   * Clip a convex polygon to the half-plane n·p <= c (keepLess) or >= c.
   * Used for wipes and angled blinds (works for any angle).
   */
  static clip(poly, nx, ny, c, keepLess = true) {
    const out = [];
    const inside = (p) => (keepLess ? nx * p.x + ny * p.y <= c : nx * p.x + ny * p.y >= c);
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      const ia = inside(a);
      const ib = inside(b);
      if (ia) out.push(a);
      if (ia !== ib) {
        const da = nx * a.x + ny * a.y - c;
        const db = nx * b.x + ny * b.y - c;
        const k = da / (da - db);
        out.push({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
      }
    }
    return out;
  }

  /** Projection range of the screen corners onto a direction. */
  range(nx, ny) {
    const v = this.screenPoly().map((p) => nx * p.x + ny * p.y);
    return { min: Math.min(...v), max: Math.max(...v) };
  }

  fillPoly(g, pts) { if (pts.length >= 3) g.fillPoints(pts, true); }

  setup() {}

  render() {}

  destroy() {
    this.objs.forEach((o) => { if (o && o.destroy) o.destroy(); });
    this.objs = [];
  }
}
