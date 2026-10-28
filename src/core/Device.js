/**
 * Device — what this device and renderer can do, detected once when the
 * first scene with PhaserFX boots. Effects ask Device instead of checking the
 * renderer themselves, so every fallback follows the same rules.
 *
 *   PhaserFX.device.info          // { webgl, shaderFX, postFX, audio, mobile, memory, cores, tier, … }
 *   PhaserFX.device.has('postFX') // true / false
 *   PhaserFX.device.override({ webgl: false });   // pretend (testing, Studio "Preview as")
 *
 * Features: webgl · shaderFX (per-object glow / colour effects) · postFX (camera effects
 * such as pixelate) · audio · touch.
 */
class Device {
  static info = null;

  /** Forced values for testing: { webgl: false } makes every WebGL-only effect use its fallback. */
  static overrides = {};

  static detect(game) {
    if (Device.info && Device.info.game === game) return Device.info;
    const nav = typeof navigator !== 'undefined' ? navigator : {};
    const win = typeof window !== 'undefined' ? window : {};
    const ua = nav.userAgent || '';
    const r = game && game.renderer;
    const webgl = !!r && r.type === Phaser.WEBGL;
    const cfg = (game && game.config) || {};
    let maxTexture = 4096;
    try { if (webgl && r.gl) maxTexture = r.gl.getParameter(r.gl.MAX_TEXTURE_SIZE) || maxTexture; } catch (e) { /* lost context */ }
    const info = {
      game,
      webgl,
      shaderFX: webgl && !cfg.disablePreFX,
      postFX: webgl && !cfg.disablePostFX,
      audio: !!(win.AudioContext || win.webkitAudioContext),
      touch: !!(nav.maxTouchPoints > 0 || 'ontouchstart' in win),
      mobile: /Android|iPhone|iPad|iPod|Mobile|Silk|Kindle/i.test(ua) || (/Macintosh/.test(ua) && nav.maxTouchPoints > 1),
      memory: typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null,
      cores: typeof nav.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : null,
      maxTexture,
      pixelRatio: win.devicePixelRatio || 1,
      contextLost: false
    };
    info.tier = Device.guessTier(info);
    Device.info = info;
    return info;
  }

  /** A first guess at 'high' | 'medium' | 'low'. The frame-rate watcher corrects it while playing. */
  static guessTier(i) {
    let score = 0;
    if (!i.webgl) score -= 2;
    if (i.memory != null) score -= i.memory <= 2 ? 2 : i.memory <= 4 ? 1 : 0;
    if (i.cores != null) score -= i.cores <= 2 ? 2 : i.cores <= 4 ? 1 : 0;
    if (i.mobile) score -= 1;
    if (i.maxTexture < 4096) score -= 1;
    return score <= -3 ? 'low' : score <= -1 ? 'medium' : 'high';
  }

  static has(feature) {
    if (Object.prototype.hasOwnProperty.call(Device.overrides, feature)) return !!Device.overrides[feature];
    if (feature === 'shaderFX' || feature === 'postFX') {
      if (Object.prototype.hasOwnProperty.call(Device.overrides, 'webgl') && !Device.overrides.webgl) return false;
    }
    if (!Device.info) return feature !== 'webgl' && feature !== 'shaderFX' && feature !== 'postFX';
    if (Device.info.contextLost && (feature === 'webgl' || feature === 'shaderFX' || feature === 'postFX')) return false;
    return !!Device.info[feature];
  }

  /** True when every listed feature is available. */
  static supports(requires) { return !requires || requires.every((f) => Device.has(f)); }

  /** Which of the listed features are missing. */
  static missing(requires) { return (requires || []).filter((f) => !Device.has(f)); }

  /** Pretend features are (un)available. Pass {} to clear. */
  static override(o = {}) { Device.overrides = { ...o }; return Device; }
}
