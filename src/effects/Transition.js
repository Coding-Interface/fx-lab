/**
 * Transition — cover the screen, do something, uncover it. Or move to another scene.
 *
 *   await this.fx.transition('Heart Iris', { x: hero.x, y: hero.y, onCovered: () => this.loadRoom(2) });
 *   await this.fx.transition({ style: 'wipe', duration: 700, params: { angle: 45 } });
 *   this.fx.goto('Level2', { score }, 'Theatre Curtain');   // cover here, reveal in Level2 automatically
 *
 * A transition is a preset: a built-in name, an object, or JSON exported from PhaserFX Studio:
 *   { style, duration, hold, color, easeIn, easeOut, reveal: 'reverse'|'continue', sound,
 *     revealSound, label, sublabel, labelColor, labelSize, params: { …style options } }
 * Styles: fade · iris · wipe · doors · curtain · blinds · tiles · clock · bubbles · pixelate · zoom · shutter
 * Sounds: `sound` plays as it covers, `revealSound` as it uncovers. Leave them out for the
 * style's suitable default, false for silence, or name any built-in or loaded audio key.
 */
class Transition {
  static STYLES = {
    fade: FadeStyle, iris: IrisStyle, wipe: WipeStyle, doors: DoorsStyle, curtain: CurtainStyle,
    blinds: BlindsStyle, tiles: TilesStyle, clock: ClockStyle, bubbles: BubblesStyle, pixelate: PixelateStyle, zoom: ZoomStyle,
    shutter: ShutterStyle
  };

  static TYPES = Object.keys(BuiltinTransitions.ALIASES);
  static KEY = '__phaserfx_reveal';

  /** Register your own style class (extends PhaserFX.TransitionStyle). */
  static register(StyleClass) { Transition.STYLES[StyleClass.id] = StyleClass; }

  /**
   * Turn a name / alias / style id / object into a full preset. Extra options
   * (duration, color, hold…) override the preset; `type` is the 1.0 option name.
   * If the device can't run the style (or the preset is `heavy` and quality is
   * low), the preset's `fallback` is used instead, else the style's fallback look.
   */
  static normalize(p, o = {}, depth = 0) {
    let base = null;
    const pick = (name) => {
      if (!name) return null;
      const n = BuiltinTransitions.ALIASES[name] || name;
      return PresetLibrary.get('transitions', n) || BuiltinTransitions.LIST.find((b) => b.name === n)
        || (Transition.STYLES[n] ? { name: n, style: n } : null);
    };
    if (typeof p === 'string') {
      base = pick(p);
      if (!base) Settings.warn(`unknown transition "${p}", using a fade`);
    } else if (p && typeof p === 'object') base = p.style ? p : pick(p.type) || p;
    if (!base && o.type) base = pick(o.type);
    base = base || BuiltinTransitions.LIST[0];
    const out = { duration: 900, hold: 100, color: '#000000', easeIn: 'Cubic.easeIn', easeOut: 'Cubic.easeOut', reveal: 'reverse', ...base, params: { ...(base.params || {}) } };
    ['duration', 'hold', 'color', 'easeIn', 'easeOut', 'reveal', 'sound', 'revealSound', 'label', 'sublabel', 'labelColor', 'depth'].forEach((k) => { if (o[k] != null) out[k] = o[k]; });
    if (o.params) Object.assign(out.params, o.params);
    return Transition.resolve(out, o, depth);
  }

  /** Swap in the fallback when this device can't run the style, or it is heavy and quality is low. */
  static resolve(out, o, depth) {
    const Style = Transition.STYLES[out.style];
    if (!Style) { Settings.warn(`unknown transition style "${out.style}", using a fade`); return { ...out, style: 'fade', params: {} }; }
    const missing = Device.missing(Style.requires);
    const heavy = out.heavy && Quality.isLow();
    if (!missing.length && !heavy) return out;
    const reason = missing.length ? `needs ${missing.join(', ')}` : 'heavy at low quality';
    Quality.events.emit('fallback', 'transitions', out.name || out.style, reason);
    // keep the original's sounds and title card
    const keep = { sound: out.sound !== undefined ? out.sound : Style.defaultSound, revealSound: out.revealSound !== undefined ? out.revealSound : Style.defaultRevealSound };
    ['label', 'sublabel', 'labelColor', 'labelSize'].forEach((k) => { if (out[k] != null) keep[k] = out[k]; });
    if (out.fallback && out.fallback !== out.name && depth < 3) {
      const fb = Transition.normalize(out.fallback, o, depth + 1);
      return { ...keep, ...fb, label: fb.label || keep.label, sublabel: fb.sublabel || keep.sublabel, fellBackFrom: out.name || out.style };
    }
    return { ...out, ...keep, style: Style.fallbackStyle || 'fade', params: {}, fellBackFrom: out.name || out.style };
  }

  /** A player you control yourself (render(t) for scrubbing, cover(), hold(), reveal()). */
  static player(fx, p, o = {}) { return new TransitionPlayer(fx, Transition.normalize(p, o), o); }

  /** Longest a phase may take in real time before we give up waiting (slow motion included). */
  static limit(fx, preset, extra = 0) {
    const ts = Math.max(0.05, fx.juice.timeScale || 1);
    return ((preset.duration || 900) / 2 + extra) / ts * 2 + 2500;
  }

  /** Wait for a promise, but never longer than ms (real time), and never throw. */
  static settle(promise, ms) {
    return new Promise((resolve) => {
      const t = setTimeout(resolve, ms);
      Promise.resolve(promise).then(() => { clearTimeout(t); resolve(); }, (e) => { clearTimeout(t); Settings.warn('a transition failed and was skipped', e); resolve(); });
    });
  }

  /**
   * Cover → onCovered → reveal. Never strands the player: if anything fails or
   * stalls, onCovered still runs (once) and the promise still resolves.
   */
  static async run(fx, p = 'fade', o = {}) {
    if (p && typeof p === 'object' && !p.style && !p.name && !p.type && o.onCovered == null) { o = p; p = o.type || o.preset || 'fade'; }
    let covered = false;
    const doCovered = async () => {
      if (covered) return;
      covered = true;
      if (!o.onCovered) return;
      try { await o.onCovered(); } catch (e) { Settings.warn('onCovered threw an error; revealing anyway', e); }
    };
    let player = null;
    try { player = Transition.player(fx, p, o); } catch (e) { Settings.warn('could not start the transition; changing without it', e); }
    if (!player) { await doCovered(); return; }
    const P = player.preset;
    const alive = () => fx.scene.sys && fx.scene.sys.isActive();
    await Transition.settle(player.cover(), Transition.limit(fx, P));
    if (!alive()) { await doCovered(); return; }
    await Promise.all([Transition.settle(player.hold(), Transition.limit(fx, P, P.hold || 0) + 1000), doCovered()]);
    if (!alive()) return;
    await Transition.settle(player.reveal(), Transition.limit(fx, P));
    try { player.destroy(); } catch (e) { /* already gone */ }
  }

  /** Cover the current scene, start another, and reveal there. The new scene always starts. */
  static async goto(fx, key, data, p = 'fade', o = {}) {
    if (p && typeof p === 'object' && !p.style && !p.name) { o = p; p = o.type || o.preset || 'fade'; }
    if (fx._going) return; // a second click while leaving: ignore
    fx._going = true;
    let preset = null;
    try {
      preset = Transition.normalize(p, o);
      const player = new TransitionPlayer(fx, preset, o);
      await Transition.settle(player.cover(), Transition.limit(fx, preset));
    } catch (e) {
      Settings.warn('could not play the transition; changing scene without it', e);
    }
    fx._going = false;
    if (preset) fx.scene.registry.set(Transition.KEY, { preset, at: Date.now() });
    fx.scene.scene.start(key, data);
  }

  /** Called by the plugin when a scene starts: finishes a goto() reveal if one is pending. */
  static pending(fx) {
    const entry = fx.scene.registry.get(Transition.KEY);
    if (!entry) return null;
    fx.scene.registry.remove(Transition.KEY);
    const preset = entry.preset || entry;
    if (entry.at && Date.now() - entry.at > 10000) return null; // stale: the scene in between had no plugin
    let player;
    try {
      player = new TransitionPlayer(fx, preset, {});
      player.render(1, 'cover');
    } catch (e) { Settings.warn('could not play the reveal', e); return null; }
    return Transition.settle(player.hold(), Transition.limit(fx, preset, preset.hold || 0) + 1000)
      .then(() => Transition.settle(player.reveal(), Transition.limit(fx, preset)))
      .then(() => { try { player.destroy(); } catch (e) { /* gone */ } });
  }

  // ------------------------------------------------- 1.0 compatibility
  static async cover(fx, type = 'fade', o = {}) {
    const player = Transition.player(fx, type, o);
    await Transition.settle(player.cover(), Transition.limit(fx, player.preset));
    return player;
  }

  static reveal(fx, type, o, player) { return (player || Transition.player(fx, type, o)).reveal(); }
}
