/**
 * Quality — scales effects to the device: 'high', 'medium' or 'low'.
 *
 *   PhaserFX.settings.quality = 'auto';    // default: start from the device guess, adapt to frame rate
 *   PhaserFX.settings.quality = 'low';     // or fix it, e.g. from a Graphics option in your menu
 *   PhaserFX.quality.level();              // the level in use right now
 *   PhaserFX.events.on('quality', (level, reason) => …);
 *
 * Lower levels emit fewer particles, cap how many can be alive at once, make
 * heavy transitions lighter, and swap presets marked `heavy` for their `fallback`.
 * In 'auto', a frame-rate watcher steps the level down when the game drops
 * below settings.minFps for 2 seconds, and back up after a long smooth spell.
 */
class Quality {
  static LEVELS = ['low', 'medium', 'high'];

  static PROFILES = {
    high: { particles: 1, maxPerEmitter: 0, liveCap: 1600, tiles: 1 },
    medium: { particles: 0.7, maxPerEmitter: 400, liveCap: 800, tiles: 0.7 },
    low: { particles: 0.4, maxPerEmitter: 150, liveCap: 350, tiles: 0.45 }
  };

  /** Level chosen by 'auto' (device guess, then the frame-rate watcher). */
  static current = 'high';

  static events = new Phaser.Events.EventEmitter();

  static blocked = {};

  /** The level in use: settings.quality when fixed, else the automatic one. */
  static level() {
    const q = Settings.quality;
    return Quality.PROFILES[q] ? q : Quality.current;
  }

  static profile() { return Quality.PROFILES[Quality.level()]; }

  static isLow() { return Quality.level() === 'low'; }

  static set(level, reason = 'set') {
    if (!Quality.PROFILES[level] || level === Quality.current) return;
    Quality.current = level;
    Quality.events.emit('quality', level, reason);
  }

  /** Move the automatic level one step (-1 down, +1 up). */
  static step(dir, reason) {
    const i = Quality.LEVELS.indexOf(Quality.current);
    const next = Quality.LEVELS[Phaser.Math.Clamp(i + dir, 0, Quality.LEVELS.length - 1)];
    if (dir < 0) Quality.blocked[Quality.current] = Date.now() + 60000; // don't climb straight back
    Quality.set(next, reason);
  }

  /** Particle count after quality and reduced motion. */
  static amount(n) {
    let k = Quality.profile().particles;
    if (Settings.reducedMotion) k *= 0.45;
    return Math.max(1, Math.round(n * k));
  }

  /** Live particles in a scene right now. */
  static live(scene) {
    let n = 0;
    scene.children.list.forEach((o) => { if (o.type === 'ParticleEmitter' && o.getAliveParticleCount) n += o.getAliveParticleCount(); });
    return n;
  }

  /** How many of `n` new particles fit under the live cap. */
  static budget(scene, n) {
    const cap = Quality.profile().liveCap;
    return Math.max(0, Math.min(n, cap - Quality.live(scene)));
  }

  /** Watch the frame rate of a game (called once per game by the plugin). */
  static watch(game) {
    if (!game || game.__pfxQuality) return;
    game.__pfxQuality = true;
    const info = Device.detect(game);
    Quality.current = info.tier;
    let last = 0;
    let low = 0;
    let good = 0;
    const started = Date.now();
    game.events.on('step', (time) => {
      if (time - last < 500) return;
      last = time;
      if (Settings.quality !== 'auto' || !Settings.adaptive || Date.now() - started < 3000) { low = 0; good = 0; return; }
      if (typeof document !== 'undefined' && document.hidden) return;
      const fps = game.loop.actualFps;
      if (fps < Settings.minFps) { low += 1; good = 0; } else if (fps >= Math.min(57, (game.loop.targetFps || 60) - 3)) { good += 1; low = 0; } else { low = 0; good = 0; }
      if (low >= 4 && Quality.current !== 'low') { low = 0; Quality.step(-1, `frame rate ${Math.round(fps)} fps`); }
      if (good >= 30 && Quality.current !== 'high') {
        good = 0;
        const up = Quality.LEVELS[Quality.LEVELS.indexOf(Quality.current) + 1];
        if (!(Quality.blocked[up] > Date.now())) Quality.step(1, 'running smoothly');
      }
    });
  }
}
