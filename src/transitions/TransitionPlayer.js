/**
 * TransitionPlayer — runs one transition preset in one scene:
 *   cover (t 0→1, easeIn) → hold (+ optional label) → reveal (t 1→0, easeOut).
 * Editors use render(t, phase) directly for frame-by-frame scrubbing.
 */
class TransitionPlayer {
  constructor(fx, preset, opts = {}) {
    this.fx = fx;
    this.j = fx.juice;
    this.preset = preset;
    const Style = Transition.STYLES[preset.style] || FadeStyle;
    const focus = opts.x != null && opts.y != null
      ? (opts.screen ? { x: opts.x, y: opts.y } : this.j.toScreen(opts.x, opts.y))
      : null;
    this.focus = focus;
    try {
      this.style = new Style(fx, preset, focus);
      this.style.setup();
    } catch (e) {
      Settings.warn(`transition style "${preset.style}" failed to start; using a fade`, e);
      this.toFade();
    }
    this.t = 0;
  }

  /** Swap a failing style for a plain fade so the transition still finishes. */
  toFade() {
    try { if (this.style) this.style.destroy(); } catch (e) { /* ignore */ }
    this.style = new FadeStyle(this.fx, { ...this.preset, style: 'fade', params: {} }, this.focus);
    this.style.setup();
  }

  render(t, phase = 'cover') {
    this.t = Phaser.Math.Clamp(t, 0, 1);
    try { this.style.render(this.t, phase); } catch (e) {
      Settings.warn(`transition style "${this.preset.style}" failed while drawing; using a fade`, e);
      this.toFade();
      this.style.render(this.t, phase);
    }
  }

  cover() {
    const p = this.preset;
    this.playSound(TransitionPlayer.soundOf(p.sound, this.style.constructor.defaultSound));
    const o = { t: this.t };
    return this.j.tween({ targets: o, t: 1, duration: (p.duration || 900) / 2, ease: p.easeIn || 'Cubic.easeIn', onUpdate: () => this.render(o.t, 'cover') })
      .then(() => this.render(1, 'cover'));
  }

  /** Hold while covered; shows the preset's label (e.g. "Chapter 2") if it has one. */
  async hold(extraWork) {
    const p = this.preset;
    const j = this.j;
    const sc = this.fx.scene;
    let labels = [];
    if (p.label) {
      const { cx, cy } = j.screen();
      const col = p.labelColor || '#ffffff';
      const main = j.ui(j.text(cx, cy - (p.sublabel ? 16 : 0), p.label, p.labelSize || 42, col).setDepth(this.style.depth + 1).setAlpha(0).setScale(0.9));
      labels.push(main);
      if (p.sublabel) labels.push(j.ui(j.text(cx, cy + 34, p.sublabel, Math.round((p.labelSize || 42) * 0.45), '#d8d2f5', { body: true }).setDepth(this.style.depth + 1).setAlpha(0)));
      sc.tweens.add({ targets: labels, alpha: 1, scale: 1, duration: 260, ease: 'Back.easeOut' });
    }
    await Promise.all([j.wait(p.hold != null ? p.hold : 100), extraWork ? Promise.resolve(extraWork()) : null]);
    if (labels.length) {
      await j.tween({ targets: labels, alpha: 0, duration: 200 });
      labels.forEach((l) => l.destroy());
      labels = [];
    }
  }

  reveal() {
    const p = this.preset;
    this.playSound(TransitionPlayer.soundOf(p.revealSound, this.style.constructor.defaultRevealSound));
    const o = { t: this.t };
    return this.j.tween({ targets: o, t: 0, duration: (p.duration || 900) / 2, ease: p.easeOut || 'Cubic.easeOut', onUpdate: () => this.render(o.t, 'reveal') })
      .then(() => this.destroy());
  }

  destroy() { if (this.style) { try { this.style.destroy(); } catch (e) { /* already gone */ } } }

  /** undefined → the style's suitable default; false / 'none' → silent; otherwise the name given. */
  static soundOf(v, fallback) {
    if (v === false || v === 'none' || v === null) return null;
    return v || fallback || null;
  }

  /**
   * Play a built-in sound ('swish', 'shutter'…) sized to this transition, or
   * one of your own audio keys loaded with this.load.audio().
   */
  playSound(name) {
    if (!name) return;
    const sc = this.fx.scene;
    const half = (this.preset.duration || 900) / 2;
    if (typeof Synth[name] !== 'function' && sc.cache && sc.cache.audio && sc.cache.audio.exists(name)) {
      if (Settings.sound && Settings.volume > 0) sc.sound.play(name, { volume: Settings.volume });
      return;
    }
    try {
      if (Synth.TIMED.includes(name)) this.j.sfx(name, half); else this.j.sfx(name);
    } catch (e) { Settings.warn(`sound "${name}" could not play`, e); }
  }
}
