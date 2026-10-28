/**
 * PresetLibrary — named particle, effect and transition presets you can use
 * anywhere by name. Built-in examples are always available; add your own
 * (for example JSON exported from PhaserFX Studio):
 *
 *   PhaserFX.presets.add(myParticleJson);                       // one preset
 *   PhaserFX.presets.add(this.cache.json.get('my-fx-pack'));    // a whole pack
 *   this.fx.particles('Blue Sparkle', x, y);
 *   PhaserFX.presets.list('effects');                           // names
 */
class PresetLibrary {
  static store = { particles: new Map(), effects: new Map(), transitions: new Map() };

  static FORMATS = { 'phaserfx-particles': 'particles', 'phaserfx-effect': 'effects', 'phaserfx-transition': 'transitions' };

  static kindOf(p) {
    if (!p || typeof p !== 'object') return null;
    if (PresetLibrary.FORMATS[p.format]) return PresetLibrary.FORMATS[p.format];
    if (Array.isArray(p.layers)) return 'particles';
    if (Array.isArray(p.steps)) return 'effects';
    if (p.style) return 'transitions';
    return null;
  }

  static builtins(kind) {
    if (kind === 'particles') return BuiltinParticles.LIST;
    if (kind === 'effects') return BuiltinEffects.LIST;
    if (kind === 'transitions') return BuiltinTransitions.LIST;
    return [];
  }

  /** Add a preset, an array of presets, or a pack { format: 'phaserfx-pack', presets: [...] }. Returns the count added. */
  static add(p) {
    if (!p) return 0;
    if (Array.isArray(p)) return p.reduce((n, x) => n + PresetLibrary.add(x), 0);
    if (p.format === 'phaserfx-pack' || Array.isArray(p.presets)) return PresetLibrary.add(p.presets || []);
    const kind = PresetLibrary.kindOf(p);
    if (!kind || !p.name) return 0;
    PresetLibrary.store[kind].set(p.name, p);
    return 1;
  }

  /** Your presets win over built-ins with the same name. */
  static get(kind, name) {
    if (!name) return null;
    return PresetLibrary.store[kind].get(name) || PresetLibrary.builtins(kind).find((b) => b.name === name) || null;
  }

  static list(kind) {
    const names = new Set(PresetLibrary.builtins(kind).map((b) => b.name));
    PresetLibrary.store[kind].forEach((v, k) => names.add(k));
    return [...names];
  }

  static remove(kind, name) { return PresetLibrary.store[kind].delete(name); }

  /** Bundle presets into one JSON pack (what Studio's "Export all" produces). */
  static pack(presets, name = 'My PhaserFX pack') { return { format: 'phaserfx-pack', version: 1, name, presets }; }
}
