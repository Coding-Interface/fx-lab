/**
 * Settings — global switches for every PhaserFX effect in every scene.
 *
 *   PhaserFX.settings.reducedMotion = true;   // fewer particles, no shake/zoom/hit-stop, soft flashes
 *   PhaserFX.settings.sound = false;          // mute built-in synth sounds
 *   PhaserFX.settings.volume = 0.5;
 *   PhaserFX.settings.font = '"Fredoka", sans-serif';
 *   PhaserFX.settings.depth = 5000;           // base depth for effect objects
 *   PhaserFX.settings.soundHandler = (name) => { scene.sound.play(name); return true; };
 *   PhaserFX.settings.quality = 'low';        // 'auto' (default) | 'high' | 'medium' | 'low'
 */
class Settings {
  /** Defaults to the player's OS "reduce motion" preference. */
  static reducedMotion = !!(typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  static sound = true;
  static volume = 1;

  /** Base depth for effect objects. UI-style effects sit a little higher. */
  static depth = 1000;

  /** Fonts used by text effects (floating text, banners, dialogue…). */
  static font = '"Trebuchet MS", "Arial Rounded MT Bold", Arial, sans-serif';
  static bodyFont = '"Trebuchet MS", Arial, sans-serif';

  /**
   * Effect quality: 'auto' picks from the device and adapts to the frame rate;
   * 'high' | 'medium' | 'low' fixes it (e.g. a Graphics option in your settings menu).
   */
  static quality = 'auto';

  /** In 'auto', lower the quality when the game runs below minFps for 2 seconds. */
  static adaptive = true;
  static minFps = 45;

  /** Report effect errors in the console (they never stop the game). */
  static warnings = true;

  /** Hit-stop also pauses Arcade/Matter physics when true. */
  static hitStopPausesPhysics = true;

  /**
   * Optional: route effect sounds to your own audio. Called as
   * soundHandler(name) with names like 'pop', 'sparkle', 'coin', 'boom'.
   * Return true to say "handled" (the built-in synth then stays silent).
   */
  static soundHandler = null;

  /** Particle budget helper: scaled by the quality level; reduced motion keeps ~45%. */
  static amount(n) {
    if (typeof Quality !== 'undefined') return Quality.amount(n);
    return Settings.reducedMotion ? Math.max(1, Math.round(n * 0.45)) : n;
  }

  /** Log a problem once per message without stopping the game. */
  static warn(msg, err) {
    if (!Settings.warnings) return;
    Settings._seen = Settings._seen || new Set();
    if (Settings._seen.has(msg)) return;
    Settings._seen.add(msg);
    if (typeof console !== 'undefined') console.warn(`PhaserFX: ${msg}`, err || '');
  }
}
