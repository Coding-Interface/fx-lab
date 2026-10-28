/**
 * Juice — small, reusable "game feel" helpers shared by every effect.
 *
 * LESSONS in this file:
 *  - tween() / wait() return Promises, so a long sequence reads like a script:
 *      await Juice.tween(scene, { targets: card, y: 300, duration: 400 });
 *      await Juice.wait(scene, 200);
 *  - Screen shake, flash and hit-stop are spices: tiny amounts, short times.
 *  - Everything respects Juice.reduced (reduced motion / no flashing) and
 *    Juice.timeScale (slow motion), so accessibility is built in, not bolted on.
 */
class Juice {
  static reduced = false;   // fewer particles, no shake, soft flashes
  static timeScale = 1;     // < 1 = slow motion for studying an effect
  static sound = null;      // FXSound instance (set in main.js)

  // ------------------------------------------------------------ time
  static wait(scene, ms) {
    return new Promise((resolve) => scene.time.delayedCall(ms, resolve));
  }

  static tween(scene, config) {
    return new Promise((resolve) => {
      scene.tweens.add({ ...config, onComplete: (...a) => { if (config.onComplete) config.onComplete(...a); resolve(); } });
    });
  }

  /** Apply slow motion to the scene clock, tweens and every particle emitter. */
  static applyTimeScale(scene, s = Juice.timeScale) {
    Juice.timeScale = s;
    Juice._scaleAll(scene, s);
  }

  static _scaleAll(scene, s) {
    scene.time.timeScale = s;
    scene.tweens.timeScale = s;
    scene.children.list.forEach((o) => { if (o.type === 'ParticleEmitter') o.timeScale = s; });
  }

  /**
   * Hit-stop: freeze everything for a few frames at the moment of impact.
   * Uses real time (setTimeout) because the scene clock is the thing we freeze.
   * Always `await` it BEFORE spawning the impact particles.
   */
  static hitStop(scene, ms = 80) {
    if (Juice.reduced || ms <= 0) return Promise.resolve();
    Juice._scaleAll(scene, 0.0001);
    return new Promise((resolve) => window.setTimeout(() => {
      if (scene.sys && scene.sys.isActive()) Juice._scaleAll(scene, Juice.timeScale);
      resolve();
    }, ms / Juice.timeScale));
  }

  /**
   * One-shot particle burst: make an emitter, explode it once, clean it up after
   * the particles die. Good for rare events. For things that fire OFTEN, build
   * the emitter once and call emitter.explode() again instead (see SparkBurst).
   */
  static burst(scene, x, y, texture, config, count = 20, depth = 50) {
    const life = typeof config.lifespan === 'number' ? config.lifespan : (config.lifespan && config.lifespan.max) || 1000;
    const em = scene.add.particles(x, y, texture, { ...config, emitting: false }).setDepth(depth);
    em.timeScale = Juice.timeScale;
    em.explode(Juice.amount(count));
    scene.time.delayedCall(life + 300, () => em.destroy());
    return em;
  }

  // ------------------------------------------------------------ camera
  static shake(scene, ms = 150, intensity = 0.006) {
    if (Juice.reduced) return;
    scene.cameras.main.shake(ms / Juice.timeScale, intensity);
  }

  /**
   * Full-screen flash. Reduced mode keeps it gentle (photosensitivity: never more
   * than 3 bright flashes per second, and avoid saturated red flashes).
   */
  static flash(scene, ms = 160, color = 0xffffff, alpha = 0.85) {
    const { width, height } = scene.scale;
    const a = Juice.reduced ? Math.min(alpha, 0.25) : alpha;
    const r = scene.add.rectangle(width / 2, height / 2, width, height, color, a).setDepth(5000).setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({ targets: r, alpha: 0, duration: Juice.reduced ? ms * 2 : ms, ease: 'Quad.easeOut', onComplete: () => r.destroy() });
  }

  // ------------------------------------------------------------ object helpers
  /** Squash & stretch pop: squash first (anticipation), overshoot, settle. */
  static pop(scene, target, amount = 0.25, ms = 360) {
    // If a pop is already running, restart from the ORIGINAL scale, so rapid
    // repeats (a streak counter, fast clicks) never make the object creep bigger.
    if (target._pop && target._pop.isPlaying()) {
      target._pop.stop();
      target.setScale(target._popBase.x, target._popBase.y);
    }
    const sx = target.scaleX;
    const sy = target.scaleY;
    target._popBase = { x: sx, y: sy };
    target._pop = scene.tweens.chain({
      targets: target,
      tweens: [
        { scaleX: sx * (1 + amount), scaleY: sy * (1 - amount), duration: ms * 0.25, ease: 'Quad.easeOut' },
        { scaleX: sx * (1 - amount * 0.4), scaleY: sy * (1 + amount * 0.6), duration: ms * 0.3, ease: 'Quad.easeOut' },
        { scaleX: sx, scaleY: sy, duration: ms * 0.45, ease: 'Back.easeOut' }
      ]
    });
    return target._pop;
  }

  /**
   * Glow around an image. WebGL: uses Phaser's built-in preFX glow (3.60+).
   * Canvas: falls back to a soft additive glow sprite behind the target.
   * Returns { set(strength, ms), destroy() } so both paths work the same.
   */
  static glow(scene, target, color = 0xffd23f, strength = 4) {
    if (target.preFX && scene.game.renderer.type === Phaser.WEBGL) {
      target.preFX.setPadding(28); // room outside the texture for the glow to spread
      const fx = target.preFX.addGlow(color, strength, 0, false, 0.1, 16);
      return {
        set: (to, ms = 300) => scene.tweens.add({ targets: fx, outerStrength: to, duration: ms }),
        pulse: (lo, hi, ms = 700) => scene.tweens.add({ targets: fx, outerStrength: { from: lo, to: hi }, duration: ms, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }),
        destroy: () => { scene.tweens.killTweensOf(fx); if (target.preFX) target.preFX.remove(fx); }
      };
    }
    const size = Math.max(target.displayWidth, target.displayHeight);
    const img = scene.add.image(target.x, target.y, 'fx-glow').setTint(color).setBlendMode(Phaser.BlendModes.ADD)
      .setDisplaySize(size * 1.6, size * 1.6).setAlpha(Math.min(1, strength / 8));
    if (target.parentContainer) {
      target.parentContainer.addAt(img, 0);
      img.setPosition(target.x, target.y);
    } else {
      img.setDepth((target.depth || 0) - 1);
    }
    return {
      set: (to, ms = 300) => scene.tweens.add({ targets: img, alpha: Math.min(1, to / 8), duration: ms }),
      pulse: (lo, hi, ms = 700) => scene.tweens.add({ targets: img, alpha: { from: Math.min(1, lo / 8), to: Math.min(1, hi / 8) }, duration: ms, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }),
      destroy: () => img.destroy()
    };
  }

  /** Rotating god rays behind something important. Returns the container. */
  static rays(scene, x, y, color = 0xffd23f, count = 12, depth = 0) {
    const c = scene.add.container(x, y).setDepth(depth);
    for (let i = 0; i < count; i++) {
      const r = scene.add.image(0, 0, 'fx-ray').setOrigin(0.5, 1).setTint(color).setBlendMode(Phaser.BlendModes.ADD)
        .setAngle((360 / count) * i).setAlpha(i % 2 ? 0.35 : 0.6).setScale(1, i % 2 ? 0.75 : 1);
      c.add(r);
    }
    c.setScale(0);
    scene.tweens.add({ targets: c, angle: 360, duration: Juice.reduced ? 40000 : 16000, repeat: -1 });
    return c;
  }

  /** Expanding ring — the visual "boom" of an impact. */
  static shockwave(scene, x, y, color = 0xffffff, size = 3, ms = 500, depth = 100) {
    const r = scene.add.image(x, y, 'fx-ring').setTint(color).setBlendMode(Phaser.BlendModes.ADD).setScale(0.1).setDepth(depth);
    scene.tweens.add({ targets: r, scale: size, alpha: { from: 1, to: 0 }, duration: ms, ease: 'Cubic.easeOut', onComplete: () => r.destroy() });
    return r;
  }

  /**
   * Shine sweep: a bright diagonal bar slides across a card, clipped to the
   * card's rounded rectangle with a GeometryMask (works in WebGL and Canvas).
   */
  static shine(scene, x, y, w, h, ms = 700, depth = 100, radius = 16) {
    const shape = scene.make.graphics({ x: 0, y: 0 }, false);
    shape.fillStyle(0xffffff).fillRoundedRect(x - w / 2, y - h / 2, w, h, radius);
    const mask = shape.createGeometryMask();
    const bar = scene.add.rectangle(x - w, y, w * 0.26, h * 1.8, 0xffffff, 0.6)
      .setAngle(20).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth).setMask(mask);
    return Juice.tween(scene, {
      targets: bar, x: x + w, duration: ms, ease: 'Sine.easeInOut',
      onComplete: () => { bar.destroy(); shape.destroy(); }
    });
  }

  /** Floating text (+10, "Unlocked!") that rises and fades. */
  static floatText(scene, x, y, text, color = '#ffffff', size = 32) {
    const t = scene.add.text(x, y, text, {
      fontFamily: '"Unbounded", "Trebuchet MS", sans-serif', fontSize: `${size}px`, color, fontStyle: '700', stroke: '#1a1030', strokeThickness: 6
    }).setOrigin(0.5).setDepth(3000).setScale(0.4);
    scene.tweens.add({ targets: t, scale: 1, duration: 220, ease: 'Back.easeOut' });
    scene.tweens.add({ targets: t, y: y - 70, alpha: 0, delay: 500, duration: 700, ease: 'Quad.easeIn', onComplete: () => t.destroy() });
    return t;
  }

  /** Text in the lab's display or body font. */
  static text(scene, x, y, str, size = 24, color = '#ece8ff', opts = {}) {
    const style = {
      fontFamily: opts.body ? '"Manrope", "Trebuchet MS", sans-serif' : '"Unbounded", "Trebuchet MS", sans-serif',
      fontSize: `${size}px`, color, fontStyle: opts.weight || '700', align: 'center'
    };
    if (opts.stroke) { style.stroke = opts.stroke; style.strokeThickness = opts.strokeThickness || 6; }
    if (opts.wrap) style.wordWrap = { width: opts.wrap };
    if (opts.lineSpacing) style.lineSpacing = opts.lineSpacing;
    return scene.add.text(x, y, str, style).setOrigin(opts.ox != null ? opts.ox : 0.5, opts.oy != null ? opts.oy : 0.5);
  }

  /**
   * Count a number up on a Text object. Numbers that roll feel like a reward;
   * numbers that jump feel like a spreadsheet.
   */
  static countUp(scene, textObj, from, to, ms = 600, fmt = (v) => String(Math.round(v))) {
    const o = { v: from };
    return Juice.tween(scene, {
      targets: o, v: to, duration: ms, ease: 'Cubic.easeOut',
      onUpdate: () => textObj.setText(fmt(o.v))
    });
  }

  /** Particle budgets shrink in reduced mode. */
  static amount(n) {
    return Juice.reduced ? Math.max(1, Math.round(n * 0.45)) : n;
  }

  static sfx(name, ...args) {
    if (Juice.sound && typeof Juice.sound[name] === 'function') Juice.sound[name](...args);
  }
}
