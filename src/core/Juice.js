/**
 * Juice — low-level "game feel" helpers bound to one scene. Every effect is
 * built from these, and they are all available on the plugin too:
 *
 *   await this.fx.tween({ targets: card, y: 300, duration: 400 });
 *   this.fx.shake(150, 0.006);  this.fx.flash();  await this.fx.hitStop(80);
 *   this.fx.pop(button);        this.fx.floatText(x, y, '+10');
 *
 * Coordinates: world-space effects (sparks at x, y) follow the camera like
 * any sprite. Screen-space effects (flash, toasts, titles) use scrollFactor 0.
 */
class Juice {
  constructor(scene) {
    this.scene = scene;
    this.timeScale = 1;
  }

  get reduced() { return Settings.reducedMotion; }

  depth(n = 0) { return Settings.depth + n; }

  /** Camera size and centre in SCREEN space. */
  screen() {
    const c = this.scene.cameras.main;
    return { w: c.width, h: c.height, cx: c.width / 2, cy: c.height / 2 };
  }

  /** World-space centre (and size) of a game object or {x, y}. Works for containers. */
  centerOf(t) {
    if (!t) return { x: 0, y: 0, w: 0, h: 0 };
    // a Container with setSize(): use its own box (its children may not all report bounds)
    if (t.type === 'Container' && t.width > 0 && t.height > 0 && t.getWorldTransformMatrix) {
      const m = t.getWorldTransformMatrix();
      return { x: m.tx, y: m.ty, w: t.width * Math.abs(m.scaleX), h: t.height * Math.abs(m.scaleY) };
    }
    if (typeof t.getBounds === 'function') {
      const b = t.getBounds();
      return { x: b.centerX, y: b.centerY, w: b.width, h: b.height };
    }
    return { x: t.x, y: t.y, w: t.width || 0, h: t.height || 0 };
  }

  /** The top-most container holding an object (or the object itself). */
  root(t) {
    let r = t;
    while (r && r.parentContainer) r = r.parentContainer;
    return r;
  }

  /** Depth to draw just above an object, even when it sits inside containers. */
  above(t, n = 1) { const r = this.root(t); return (r && r.depth ? r.depth : 0) + n; }

  /** True if the object (or its container) is pinned to the screen. */
  isScreen(t) { const r = this.root(t); return !!r && r.scrollFactorX === 0; }

  /** Pin an object to the screen (scrollFactor 0, including container children). */
  ui(obj) {
    if (obj && obj.setScrollFactor) obj.setScrollFactor(0, 0, true);
    return obj;
  }

  // ---------------------------------------------------------------- time
  wait(ms) {
    return new Promise((resolve) => this.scene.time.delayedCall(ms, resolve));
  }

  tween(config) {
    return new Promise((resolve) => {
      this.scene.tweens.add({ ...config, onComplete: (...a) => { if (config.onComplete) config.onComplete(...a); resolve(); } });
    });
  }

  /** Slow motion for this scene: clock, tweens and particles (1 = normal). */
  setTimeScale(s = 1) {
    this.timeScale = s;
    this._scaleAll(s);
  }

  _scaleAll(s) {
    const sc = this.scene;
    sc.time.timeScale = s;
    sc.tweens.timeScale = s;
    sc.children.list.forEach((o) => { if (o.type === 'ParticleEmitter') o.timeScale = s; });
  }

  _physics(pause) {
    if (!Settings.hitStopPausesPhysics) return;
    const sc = this.scene;
    const worlds = [sc.physics && sc.physics.world, sc.matter && sc.matter.world].filter(Boolean);
    worlds.forEach((w) => { try { if (pause) w.pause(); else w.resume(); } catch (e) { /* not running */ } });
  }

  /** Freeze the scene for a few frames at the moment of impact. await it, THEN spawn the impact. */
  hitStop(ms = 80) {
    if (this.reduced || ms <= 0) return Promise.resolve();
    this._scaleAll(0.0001);
    this._physics(true);
    return new Promise((resolve) => setTimeout(() => {
      if (this.scene.sys && this.scene.sys.isActive()) { this._scaleAll(this.timeScale); this._physics(false); }
      resolve();
    }, ms / this.timeScale));
  }

  // ---------------------------------------------------------------- camera
  shake(ms = 150, intensity = 0.006) {
    if (this.reduced) return;
    this.scene.cameras.main.shake(ms / this.timeScale, intensity);
  }

  /** Full-screen flash. Soft in reduced-motion mode (photosensitivity safe). */
  flash(ms = 160, color = 0xffffff, alpha = 0.85) {
    const { w, h, cx, cy } = this.screen();
    const a = this.reduced ? Math.min(alpha, 0.25) : alpha;
    const r = this.ui(this.scene.add.rectangle(cx, cy, w * 3, h * 3, color, a).setDepth(this.depth(900)).setBlendMode(Phaser.BlendModes.ADD));
    this.scene.tweens.add({ targets: r, alpha: 0, duration: this.reduced ? ms * 2 : ms, ease: 'Quad.easeOut', onComplete: () => r.destroy() });
  }

  // ---------------------------------------------------------------- object helpers
  /** Squash & stretch pop. Safe to call repeatedly (never creeps bigger). */
  pop(target, amount = 0.25, ms = 360) {
    if (!target || !target.scene) return null;
    if (target._pfxPop && target._pfxPop.isPlaying()) {
      target._pfxPop.stop();
      target.setScale(target._pfxBase.x, target._pfxBase.y);
    }
    const sx = target.scaleX;
    const sy = target.scaleY;
    target._pfxBase = { x: sx, y: sy };
    const k = this.reduced ? amount * 0.4 : amount;
    target._pfxPop = this.scene.tweens.chain({
      targets: target,
      tweens: [
        { scaleX: sx * (1 + k), scaleY: sy * (1 - k), duration: ms * 0.25, ease: 'Quad.easeOut' },
        { scaleX: sx * (1 - k * 0.4), scaleY: sy * (1 + k * 0.6), duration: ms * 0.3, ease: 'Quad.easeOut' },
        { scaleX: sx, scaleY: sy, duration: ms * 0.45, ease: 'Back.easeOut' }
      ]
    });
    return target._pfxPop;
  }

  /** Small left-right "no" shake. */
  wiggle(target, px = 6, times = 3) {
    if (!target || this.reduced || px <= 0) return Promise.resolve();
    // overlapping wiggles always return to the ORIGINAL x
    if (target._pfxWig) { target._pfxWig.stop(); target.setX(target._pfxWigX); } else target._pfxWigX = target.x;
    const x = target._pfxWigX;
    return new Promise((resolve) => {
      target._pfxWig = this.scene.tweens.add({
        targets: target, x: x + px, duration: 55, yoyo: true, repeat: times - 1, ease: 'Sine.easeInOut',
        onComplete: () => { target.setX(x); target._pfxWig = null; resolve(); },
        onStop: () => resolve()
      });
    });
  }

  /**
   * Glow around an image/sprite/text. WebGL uses preFX glow; Canvas falls back
   * to a soft sprite behind it. Returns { set(strength), pulse(lo, hi), destroy() }.
   */
  glow(target, color = 0xffd23f, strength = 4) {
    const sc = this.scene;
    if (target.preFX && sc.game.renderer.type === Phaser.WEBGL && Device.has('shaderFX')) {
      target.preFX.setPadding(Math.max(target.preFX.padding || 0, 28));
      const fx = target.preFX.addGlow(color, strength, 0, false, 0.1, 16);
      return {
        set: (to, ms = 300) => sc.tweens.add({ targets: fx, outerStrength: to, duration: ms }),
        pulse: (lo, hi, ms = 700) => sc.tweens.add({ targets: fx, outerStrength: { from: lo, to: hi }, duration: ms, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }),
        destroy: () => { sc.tweens.killTweensOf(fx); if (target.preFX) target.preFX.remove(fx); }
      };
    }
    const c = this.centerOf(target);
    const size = Math.max(target.displayWidth || c.w, target.displayHeight || c.h);
    const img = sc.add.image(target.x, target.y, 'pfx-glow').setTint(color).setBlendMode(Phaser.BlendModes.ADD)
      .setDisplaySize(size * 1.6, size * 1.6).setAlpha(Math.min(1, strength / 8));
    if (target.parentContainer) target.parentContainer.addAt(img, Math.max(0, target.parentContainer.getIndex(target)));
    else img.setDepth((target.depth || 0) - 1).setScrollFactor(target.scrollFactorX, target.scrollFactorY);
    return {
      set: (to, ms = 300) => sc.tweens.add({ targets: img, alpha: Math.min(1, to / 8), duration: ms }),
      pulse: (lo, hi, ms = 700) => sc.tweens.add({ targets: img, alpha: { from: Math.min(1, lo / 8), to: Math.min(1, hi / 8) }, duration: ms, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }),
      destroy: () => { sc.tweens.killTweensOf(img); img.destroy(); }
    };
  }

  /** Rotating god rays. Starts at scale 0: tween its scale to show it. */
  rays(x, y, color = 0xffd23f, count = 12, depth = this.depth(-5)) {
    const sc = this.scene;
    const c = sc.add.container(x, y).setDepth(depth);
    for (let i = 0; i < count; i++) {
      c.add(sc.add.image(0, 0, 'pfx-ray').setOrigin(0.5, 1).setTint(color).setBlendMode(Phaser.BlendModes.ADD)
        .setAngle((360 / count) * i).setAlpha(i % 2 ? 0.35 : 0.6).setScale(1, i % 2 ? 0.75 : 1));
    }
    c.setScale(0.001);
    sc.tweens.add({ targets: c, angle: 360, duration: this.reduced ? 40000 : 16000, repeat: -1 });
    c.once('destroy', () => sc.tweens.killTweensOf(c));
    return c;
  }

  /** Expanding ring. */
  shockwave(x, y, color = 0xffffff, size = 3, ms = 500, depth = this.depth(10)) {
    const r = this.scene.add.image(x, y, 'pfx-ring').setTint(color).setBlendMode(Phaser.BlendModes.ADD).setScale(0.1).setDepth(depth);
    this.scene.tweens.add({ targets: r, scale: size, alpha: { from: 1, to: 0 }, duration: ms, ease: 'Cubic.easeOut', onComplete: () => r.destroy() });
    return r;
  }

  /** A bright bar sweeps across a rectangle (a card, a toast…), clipped by a mask. */
  shine(x, y, w, h, ms = 700, depth = this.depth(20), radius = 16, screenSpace = false) {
    const sc = this.scene;
    const shape = sc.make.graphics({ x: 0, y: 0 }, false);
    shape.fillStyle(0xffffff).fillRoundedRect(x - w / 2, y - h / 2, w, h, radius);
    if (screenSpace) shape.setScrollFactor(0);
    const bar = sc.add.rectangle(x - w, y, w * 0.26, h * 1.8, 0xffffff, 0.6)
      .setAngle(20).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth).setMask(shape.createGeometryMask());
    if (screenSpace) bar.setScrollFactor(0);
    return this.tween({ targets: bar, x: x + w, duration: ms, ease: 'Sine.easeInOut', onComplete: () => { bar.destroy(); shape.destroy(); } });
  }

  text(x, y, str, size = 24, color = '#ffffff', opts = {}) {
    const style = { fontFamily: opts.body ? Settings.bodyFont : Settings.font, fontSize: `${size}px`, color, fontStyle: opts.weight || 'bold', align: 'center' };
    if (opts.stroke) { style.stroke = opts.stroke; style.strokeThickness = opts.strokeThickness || 6; }
    if (opts.wrap) style.wordWrap = { width: opts.wrap };
    return this.scene.add.text(x, y, str, style).setOrigin(opts.ox != null ? opts.ox : 0.5, opts.oy != null ? opts.oy : 0.5);
  }

  /** Text that pops, rises and fades ("+10", "Unlocked!"). */
  floatText(x, y, str, color = '#ffffff', size = 30, opts = {}) {
    const sc = this.scene;
    const t = this.text(x, y, str, size, color, { stroke: '#1a1030', strokeThickness: 6 }).setDepth(this.depth(300)).setScale(0.4);
    if (opts.screen) this.ui(t);
    sc.tweens.add({ targets: t, scale: 1, duration: 220, ease: 'Back.easeOut' });
    sc.tweens.add({ targets: t, y: y - (opts.rise || 70), alpha: 0, delay: opts.hold || 500, duration: 700, ease: 'Quad.easeIn', onComplete: () => t.destroy() });
    return t;
  }

  /** Roll a number up on a Text object. */
  countUp(textObj, from, to, ms = 600, format = (v) => String(Math.round(v))) {
    const o = { v: from };
    return this.tween({ targets: o, v: to, duration: ms, ease: 'Cubic.easeOut', onUpdate: () => textObj.setText(format(o.v)) });
  }

  /** One-shot particle burst that cleans itself up. */
  burst(x, y, texture, config, count = 20, depth = this.depth()) {
    const life = typeof config.lifespan === 'number' ? config.lifespan : (config.lifespan && config.lifespan.max) || 1000;
    const em = this.scene.add.particles(x, y, texture, { ...config, emitting: false }).setDepth(depth);
    em.timeScale = this.timeScale;
    const n = Quality.budget(this.scene, Settings.amount(count));
    if (n > 0) em.explode(n);
    this.scene.time.delayedCall(life + 300, () => em.destroy());
    return em;
  }

  /** A particle emitter that respects this scene's slow motion. */
  emitter(x, y, texture, config, depth = this.depth()) {
    const em = this.scene.add.particles(x, y, texture, config).setDepth(depth);
    em.timeScale = this.timeScale;
    return em;
  }

  /**
   * Fly an object (or a new image of `texture`) from a point to a point or a
   * game object, along a curved path. Resolves on arrival.
   */
  flyTo(objOrKey, from, to, opts = {}) {
    const sc = this.scene;
    const obj = typeof objOrKey === 'string' ? sc.add.image(from.x, from.y, objOrKey).setDepth(this.depth(200)) : objOrKey;
    if (opts.scale != null) obj.setScale(opts.scale);
    let sx = from ? from.x : obj.x;
    let sy = from ? from.y : obj.y;
    // world object flying to a HUD element (scrollFactor 0): switch it to screen space first
    if (to && to.scene && this.isScreen(to) && !this.isScreen(obj)) {
      const p = this.toScreen(sx, sy);
      obj.setScrollFactor(0);
      sx = p.x; sy = p.y;
    }
    obj.setPosition(sx, sy);
    const end = to.getBounds ? this.centerOf(to) : to;
    const start = new Phaser.Math.Vector2(sx, sy);
    const arc = opts.arc != null ? opts.arc : Phaser.Math.Between(60, 200);
    const ctrl = new Phaser.Math.Vector2((start.x + end.x) / 2 + Phaser.Math.Between(-120, 120), Math.min(start.y, end.y) - arc);
    const curve = new Phaser.Curves.QuadraticBezier(start, ctrl, new Phaser.Math.Vector2(end.x, end.y));
    const o = { t: 0 };
    const s0 = obj.scaleX;
    return this.tween({
      targets: o, t: 1, duration: opts.duration || 600, delay: opts.delay || 0, ease: opts.ease || 'Cubic.easeIn',
      onUpdate: () => {
        const p = curve.getPoint(o.t);
        obj.setPosition(p.x, p.y);
        if (opts.scaleTo != null) obj.setScale(s0 + (opts.scaleTo - s0) * o.t);
      },
      onComplete: () => { if (opts.destroy !== false && typeof objOrKey === 'string') obj.destroy(); if (opts.onArrive) opts.onArrive(obj); }
    });
  }

  /** World point → screen point for the main camera. */
  toScreen(x, y) {
    const cam = this.scene.cameras.main;
    return { x: (x - cam.worldView.x) * cam.zoom, y: (y - cam.worldView.y) * cam.zoom };
  }

  sfx(name, ...args) { Synth.play(name, ...args); }
}
