/*!
 * PhaserFX v1.2.0 — plug-and-play effects for Phaser 3.60+
 * Particles, rewards, answer feedback, cards, story and combat effects.
 * MIT License
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) define(['phaser'], factory);
  else if (typeof module === 'object' && module.exports) module.exports = factory(root.Phaser || require('phaser'));
  else root.PhaserFX = factory(root.Phaser);
}(typeof self !== 'undefined' ? self : this, function (Phaser) {
  'use strict';
  if (!Phaser) throw new Error('PhaserFX: load Phaser 3 before phaser-fx.js');

  // ---- src/core/Settings.js
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

  // ---- src/core/Device.js
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

  // ---- src/core/Quality.js
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

  // ---- src/core/Synth.js
  /**
   * Synth — tiny Web Audio sound effects so every effect has a sound out of the
   * box, with no audio files. Shared by all scenes.
   *
   * Replace or silence it with PhaserFX.settings.soundHandler / .sound.
   */
  class Synth {
    static ctx = null;

    static _ctx() {
      if (!Settings.sound || Settings.volume <= 0) return null;
      if (!Synth.ctx) {
        const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
        if (!AC) return null;
        try { Synth.ctx = new AC(); } catch (e) { return null; }
      }
      if (Synth.ctx.state === 'suspended') Synth.ctx.resume();
      return Synth.ctx;
    }

    /**
     * Browsers (iOS Safari especially) only allow audio after the player taps or
     * presses a key. Start the audio context on the first input, so the first
     * effect sound isn't lost.
     */
    static unlockOnInput() {
      if (Synth._unlockArmed || typeof window === 'undefined') return;
      Synth._unlockArmed = true;
      const events = ['pointerdown', 'touchend', 'keydown'];
      const go = () => {
        const ctx = Synth._ctx();
        if (ctx && ctx.state === 'running') events.forEach((e) => window.removeEventListener(e, go, true));
      };
      events.forEach((e) => window.addEventListener(e, go, true));
    }

    /** Play a named sound ('pop', 'coin', …). Goes through soundHandler first. */
    static play(name, ...args) {
      if (Settings.soundHandler) {
        try { if (Settings.soundHandler(name, ...args) === true) return; } catch (e) { /* user handler failed: fall back */ }
      }
      if (typeof Synth[name] === 'function' && !['play', '_ctx'].includes(name)) Synth[name](...args);
    }

    static tone(freq, dur = 0.15, type = 'sine', vol = 0.12, delay = 0, slideTo = null) {
      const ctx = Synth._ctx();
      if (!ctx) return;
      const t = ctx.currentTime + delay;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * Settings.volume), t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + dur + 0.05);
    }

    static noise(dur = 0.3, vol = 0.15, delay = 0, lowpass = 1200) {
      const ctx = Synth._ctx();
      if (!ctx) return;
      const len = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = lowpass;
      const g = ctx.createGain();
      g.gain.value = vol * Settings.volume;
      src.connect(f).connect(g).connect(ctx.destination);
      src.start(ctx.currentTime + delay);
    }

    /** Filtered noise whose filter sweeps from one frequency to another (swishes, risers). */
    static sweep(dur = 0.4, vol = 0.12, delay = 0, from = 600, to = 5000, type = 'bandpass') {
      const ctx = Synth._ctx();
      if (!ctx) return;
      const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) { const k = i / len; d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * k) ** 1.5; }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.Q.value = 1.4;
      const t = ctx.currentTime + delay;
      f.frequency.setValueAtTime(from, t);
      f.frequency.exponentialRampToValueAtTime(Math.max(40, to), t + dur);
      const g = ctx.createGain();
      g.gain.value = vol * Settings.volume;
      src.connect(f).connect(g).connect(ctx.destination);
      src.start(t);
    }

    // ---------------------------------------------------------- transition sounds
    // These take the length of the cover/reveal half in ms, so they fit the motion.

    /** Sounds that accept a duration (ms) as their first argument. */
    static TIMED = ['swish', 'shutter', 'rumble', 'slide', 'riser', 'bloop', 'glitch', 'tickTock', 'whoosh'];

    /** Sounds made for transitions (the Studio lists these first). */
    static TRANSITION_SOUNDS = ['whoosh', 'swish', 'shutter', 'slide', 'thud', 'rumble', 'riser', 'bloop', 'glitch', 'tickTock', 'chime', 'sparkle', 'fanfare', 'soft', 'pop', 'flip'];

    static swish(ms = 400) { const d = Math.min(1.2, Math.max(0.15, ms / 1000)); Synth.sweep(d, 0.16, 0, 500, 6000); }

    static shutter(ms = 600) {
      const n = 8;
      const span = Math.max(0.2, (ms / 1000) * 0.7);
      Synth.sweep(span + 0.1, 0.07, 0, 800, 4000);
      for (let i = 0; i < n; i++) {
        const at = (i / (n - 1)) * span;
        Synth.noise(0.035, 0.16, at, 6500);
        Synth.tone(240 + i * 14, 0.035, 'square', 0.025, at);
      }
    }

    static rumble(ms = 900) {
      const d = Math.min(2, Math.max(0.3, ms / 1000));
      Synth.tone(72, d, 'sine', 0.2, 0, 52);
      Synth.noise(d, 0.1, 0, 380);
    }

    static slide(ms = 500) {
      const d = Math.min(1.2, Math.max(0.15, ms / 1000));
      Synth.tone(520, d, 'triangle', 0.05, 0, 170);
      Synth.sweep(d, 0.08, 0, 3000, 600);
    }

    static thud() { Synth.tone(95, 0.28, 'sine', 0.3, 0, 45); Synth.noise(0.12, 0.2, 0, 500); }

    static riser(ms = 600) {
      const d = Math.min(1.5, Math.max(0.2, ms / 1000));
      Synth.tone(180, d, 'sawtooth', 0.035, 0, 1100);
      Synth.sweep(d, 0.1, 0, 400, 7000);
    }

    static bloop(ms = 600) {
      const span = Math.max(0.2, (ms / 1000) * 0.8);
      for (let i = 0; i < 7; i++) Synth.tone(380 + Math.random() * 500, 0.09, 'sine', 0.07, (i / 6) * span, 900 + Math.random() * 600);
    }

    static glitch(ms = 500) {
      const span = Math.max(0.15, (ms / 1000) * 0.8);
      for (let i = 0; i < 10; i++) Synth.tone(200 + Math.random() * 1600, 0.03, 'square', 0.025, (i / 9) * span);
    }

    static tickTock(ms = 800) {
      const n = 5;
      const span = Math.max(0.2, (ms / 1000) * 0.85);
      for (let i = 0; i < n; i++) Synth.tone(i % 2 ? 980 : 1320, 0.05, 'square', 0.03, (i / (n - 1)) * span);
    }

    static pop() { Synth.tone(420, 0.1, 'triangle', 0.12, 0, 820); }
    static sparkle() { [1568, 2093, 2637].forEach((f, i) => Synth.tone(f, 0.18, 'sine', 0.05, i * 0.05)); }
    static whoosh(ms = 450) { Synth.noise(Math.min(1, Math.max(0.2, ms / 1000)), 0.12, 0, 2400); }
    static boom() { Synth.tone(110, 0.5, 'sine', 0.3, 0, 40); Synth.noise(0.5, 0.25, 0, 700); }
    static coin() { Synth.tone(1319, 0.07, 'square', 0.03); Synth.tone(1976, 0.12, 'square', 0.03, 0.05); }
    static flip() { Synth.noise(0.12, 0.08, 0, 4000); }
    static crack() { Synth.noise(0.18, 0.3, 0, 5000); Synth.tone(1800, 0.05, 'square', 0.04); }
    static charge(step = 0) { Synth.tone(330 * 2 ** (step / 4), 0.22, 'triangle', 0.08); }
    static fanfare() { [523, 659, 784, 1047].forEach((f, i) => Synth.tone(f, 0.3, 'triangle', 0.1, i * 0.09)); }
    static chime() { [784, 988, 1175, 1568].forEach((f, i) => Synth.tone(f, 0.4, 'sine', 0.06, i * 0.07)); }
    static correct() { Synth.tone(784, 0.14, 'triangle', 0.1); Synth.tone(1175, 0.22, 'triangle', 0.1, 0.09); }
    static soft() { Synth.tone(330, 0.16, 'sine', 0.07); Synth.tone(294, 0.2, 'sine', 0.06, 0.12); }
    static tick(step = 0) { Synth.tone(660 + step * 60, 0.06, 'square', 0.035); }
    static hit() { Synth.tone(180, 0.08, 'square', 0.08, 0, 90); }
    static blip(pitch = 520) { Synth.tone(pitch * (0.92 + Math.random() * 0.16), 0.04, 'square', 0.025); }
  }

  // ---- src/core/Textures.js
  /**
   * Textures — every texture PhaserFX needs, painted on canvas the first time
   * an effect runs (no image files to load). All keys start with "pfx-".
   *
   * Particle textures are WHITE so they can be coloured with tint / color.
   * Use them in your own emitters too, e.g. this.add.particles(x, y, 'pfx-star', {...}).
   */
  class Textures {
    static KEYS = ['pfx-glow', 'pfx-dot', 'pfx-ember', 'pfx-smoke', 'pfx-spark', 'pfx-star', 'pfx-ring', 'pfx-ray', 'pfx-flare',
      'pfx-confetti', 'pfx-shard', 'pfx-coin', 'pfx-drop', 'pfx-leaf', 'pfx-heart', 'pfx-star5', 'pfx-star5-empty',
      'pfx-lock-body', 'pfx-lock-shackle', 'pfx-chain', 'pfx-pack', 'pfx-card-back', 'pfx-card-shadow'];

    /** Generate everything once per game (safe to call often). */
    static ensure(scene) {
      if (scene.textures.exists('pfx-card-shadow')) return;
      const T = Textures;
      T.radial(scene, 'pfx-glow', 128, [[0, 1], [0.25, 0.55], [0.6, 0.15], [1, 0]]);
      T.radial(scene, 'pfx-dot', 24, [[0, 1], [0.45, 0.9], [1, 0]]);
      T.radial(scene, 'pfx-ember', 32, [[0, 1], [0.2, 0.85], [0.5, 0.3], [1, 0]]);
      T.make(scene, 'pfx-smoke', 96, 96, (c, s) => {
        [[0.5, 0.5, 0.42], [0.35, 0.42, 0.28], [0.64, 0.4, 0.26], [0.42, 0.64, 0.27], [0.62, 0.62, 0.25]].forEach(([x, y, r]) => {
          const g = c.createRadialGradient(x * s, y * s, 0, x * s, y * s, r * s);
          g.addColorStop(0, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
          c.fillStyle = g; c.fillRect(0, 0, s, s);
        });
      });
      T.make(scene, 'pfx-spark', 64, 14, (c, w, h) => {
        const g = c.createLinearGradient(0, 0, w, 0);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.7, 'rgba(255,255,255,0.7)'); g.addColorStop(1, '#fff');
        c.fillStyle = g; c.beginPath(); c.moveTo(0, h / 2); c.quadraticCurveTo(w * 0.6, 0, w, h / 2); c.quadraticCurveTo(w * 0.6, h, 0, h / 2); c.fill();
      });
      T.make(scene, 'pfx-star', 48, 48, (c, s) => {
        const r = s / 2;
        const g = c.createRadialGradient(r, r, 0, r, r, r);
        g.addColorStop(0, 'rgba(255,255,255,0.8)'); g.addColorStop(0.35, 'rgba(255,255,255,0.15)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g; c.fillRect(0, 0, s, s);
        c.fillStyle = '#fff'; c.beginPath();
        for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 - Math.PI / 2; const rr = i % 2 ? r * 0.16 : r * 0.95; c.lineTo(r + Math.cos(a) * rr, r + Math.sin(a) * rr); }
        c.closePath(); c.fill();
      });
      T.make(scene, 'pfx-ring', 192, 192, (c, s) => {
        const r = s / 2;
        const g = c.createRadialGradient(r, r, r * 0.62, r, r, r);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.55, '#fff'); g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g; c.fillRect(0, 0, s, s);
      });
      T.make(scene, 'pfx-ray', 90, 420, (c, w, h) => {
        const g = c.createLinearGradient(0, h, 0, 0);
        g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g; c.beginPath(); c.moveTo(w / 2 - 2, h); c.lineTo(0, 0); c.lineTo(w, 0); c.lineTo(w / 2 + 2, h); c.closePath(); c.fill();
      });
      T.make(scene, 'pfx-flare', 256, 24, (c, w, h) => {
        c.save(); c.scale(1, h / w);
        const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
        g.addColorStop(0, '#fff'); g.addColorStop(0.2, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g; c.fillRect(0, 0, w, w); c.restore();
      });
      T.make(scene, 'pfx-confetti', 12, 18, (c, w, h) => { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); });
      T.make(scene, 'pfx-shard', 28, 28, (c) => { c.fillStyle = '#fff'; c.beginPath(); c.moveTo(14, 0); c.lineTo(28, 22); c.lineTo(4, 28); c.closePath(); c.fill(); });
      T.make(scene, 'pfx-coin', 44, 44, (c, s) => {
        const r = s / 2;
        c.fillStyle = '#b8791a'; c.beginPath(); c.arc(r, r + 1.5, r - 2, 0, Math.PI * 2); c.fill();
        const g = c.createLinearGradient(0, 0, s, s);
        g.addColorStop(0, '#fff3b0'); g.addColorStop(0.45, '#ffcc33'); g.addColorStop(1, '#e09b14');
        c.fillStyle = g; c.beginPath(); c.arc(r, r, r - 3, 0, Math.PI * 2); c.fill();
        c.strokeStyle = 'rgba(160,100,10,0.8)'; c.lineWidth = 2; c.beginPath(); c.arc(r, r, r - 9, 0, Math.PI * 2); c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.75)'; c.beginPath(); c.ellipse(r - 6, r - 7, 5, 3, -0.6, 0, Math.PI * 2); c.fill();
      });
      T.make(scene, 'pfx-drop', 4, 36, (c, w, h) => {
        const g = c.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0.9)');
        c.fillStyle = g; c.fillRect(0, 0, w, h);
      });
      T.make(scene, 'pfx-leaf', 26, 16, (c) => {
        c.fillStyle = '#fff'; c.beginPath(); c.moveTo(1, 8); c.quadraticCurveTo(13, -4, 25, 8); c.quadraticCurveTo(13, 20, 1, 8); c.fill();
        c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(2, 8); c.lineTo(24, 8); c.stroke();
      });
      T.make(scene, 'pfx-heart', 28, 26, (c) => {
        c.fillStyle = '#fff'; c.beginPath(); c.moveTo(14, 24);
        c.bezierCurveTo(-6, 10, 4, -4, 14, 7); c.bezierCurveTo(24, -4, 34, 10, 14, 24); c.fill();
      });
      T.star5(scene, 'pfx-star5', true);
      T.star5(scene, 'pfx-star5-empty', false);
      T.lock(scene);
      T.chain(scene);
      T.pack(scene);
      T.cardBack(scene);
      T.make(scene, 'pfx-card-shadow', 280, 370, (c) => {
        c.shadowColor = 'rgba(0,0,0,0.85)'; c.shadowBlur = 22; c.fillStyle = 'rgba(0,0,0,0.55)';
        T.rr(c, 30, 30, 220, 310, 18); c.fill();
      });
    }

    // ------------------------------------------------------------- helpers
    static make(scene, key, w, h, draw) {
      if (scene.textures.exists(key)) return;
      const t = scene.textures.createCanvas(key, w, h);
      draw(t.getContext(), w, h);
      t.refresh();
    }

    static radial(scene, key, size, stops) {
      Textures.make(scene, key, size, size, (c) => {
        const r = size / 2;
        const g = c.createRadialGradient(r, r, 0, r, r, r);
        stops.forEach(([p, a]) => g.addColorStop(p, `rgba(255,255,255,${a})`));
        c.fillStyle = g; c.fillRect(0, 0, size, size);
      });
    }

    static rr(c, x, y, w, h, r) {
      c.beginPath();
      c.moveTo(x + r, y);
      c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
      c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
      c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y);
      c.closePath();
    }

    static starPath(c, x, y, ro, ri) {
      c.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5; const r = i % 2 ? ri : ro; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
      c.closePath();
    }

    static star5(scene, key, filled) {
      Textures.make(scene, key, 112, 112, (c) => {
        c.lineJoin = 'round';
        if (filled) {
          Textures.starPath(c, 56, 60, 50, 22); c.fillStyle = '#c47d0e'; c.fill();
          Textures.starPath(c, 56, 56, 50, 22);
          const g = c.createLinearGradient(0, 10, 0, 100);
          g.addColorStop(0, '#fff3a6'); g.addColorStop(0.5, '#ffc94a'); g.addColorStop(1, '#f39a1a');
          c.fillStyle = g; c.fill(); c.strokeStyle = '#fff7cf'; c.lineWidth = 3; c.stroke();
          c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.ellipse(44, 40, 9, 5, -0.6, 0, Math.PI * 2); c.fill();
        } else {
          Textures.starPath(c, 56, 56, 48, 21); c.fillStyle = 'rgba(20,14,40,0.85)'; c.fill();
          c.strokeStyle = '#4a3f7c'; c.lineWidth = 4; c.stroke();
        }
      });
    }

    /** A medal in any colour with a glyph, e.g. medal(scene, '#4fa3ff', '?'). Returns its key. */
    static medal(scene, color = '#ffc94a', glyph = '★') {
      const key = `pfx-medal-${color.replace('#', '')}-${glyph.codePointAt(0)}`;
      const C = Phaser.Display.Color.HexStringToColor(color);
      const dark = Phaser.Display.Color.RGBToString(Math.round(C.red * 0.55), Math.round(C.green * 0.55), Math.round(C.blue * 0.55));
      Textures.make(scene, key, 120, 150, (c) => {
        c.fillStyle = dark;
        c.beginPath(); c.moveTo(32, 80); c.lineTo(22, 146); c.lineTo(42, 132); c.lineTo(56, 146); c.lineTo(60, 92); c.closePath(); c.fill();
        c.beginPath(); c.moveTo(88, 80); c.lineTo(98, 146); c.lineTo(78, 132); c.lineTo(64, 146); c.lineTo(60, 92); c.closePath(); c.fill();
        c.fillStyle = '#fff3c4'; c.beginPath(); c.arc(60, 60, 54, 0, Math.PI * 2); c.fill();
        const g = c.createLinearGradient(0, 10, 0, 110);
        g.addColorStop(0, color); g.addColorStop(1, dark);
        c.fillStyle = g; c.beginPath(); c.arc(60, 60, 47, 0, Math.PI * 2); c.fill();
        c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 3; c.beginPath(); c.arc(60, 60, 38, 0, Math.PI * 2); c.stroke();
        c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.font = 'bold 44px "Trebuchet MS", sans-serif'; c.fillText(glyph, 60, 63);
      });
      return key;
    }

    static lock(scene) {
      Textures.make(scene, 'pfx-lock-body', 76, 64, (c, w, h) => {
        const g = c.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#ffe58a'); g.addColorStop(1, '#d99a12');
        Textures.rr(c, 2, 2, w - 4, h - 4, 12); c.fillStyle = g; c.fill();
        c.strokeStyle = '#9a6a08'; c.lineWidth = 3; c.stroke();
        c.fillStyle = '#4a3208'; c.beginPath(); c.arc(w / 2, h / 2 - 5, 8, 0, Math.PI * 2); c.fill(); c.fillRect(w / 2 - 3.5, h / 2 - 2, 7, 16);
      });
      Textures.make(scene, 'pfx-lock-shackle', 60, 50, (c, w, h) => {
        c.strokeStyle = '#c9cfdc'; c.lineWidth = 10;
        c.beginPath(); c.moveTo(10, h); c.lineTo(10, 26); c.arc(w / 2, 26, w / 2 - 10, Math.PI, 0); c.lineTo(w - 10, h); c.stroke();
      });
    }

    static chain(scene) {
      Textures.make(scene, 'pfx-chain', 340, 26, (c, w, h) => {
        for (let x = 4, i = 0; x < w - 10; x += 21, i++) {
          c.strokeStyle = '#8b93a8'; c.lineWidth = 5; c.beginPath();
          c.ellipse(x + 13, h / 2, 13, i % 2 ? 2.5 : 8, 0, 0, Math.PI * 2); c.stroke();
          c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 1.5;
          c.beginPath(); c.ellipse(x + 13, h / 2 - 2, 10, 4, 0, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
        }
      });
    }

    static pack(scene) {
      Textures.make(scene, 'pfx-pack', 240, 340, (c, w, h) => {
        const g = c.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, '#ff5fa2'); g.addColorStop(0.5, '#7a4dff'); g.addColorStop(1, '#2fd4c0');
        c.fillStyle = g; c.beginPath(); c.moveTo(0, 12);
        for (let x = 0; x <= w; x += 12) c.lineTo(x, x % 24 ? 0 : 12);
        c.lineTo(w, h - 12);
        for (let x = w; x >= 0; x -= 12) c.lineTo(x, x % 24 ? h : h - 12);
        c.closePath(); c.fill();
        c.save(); c.globalAlpha = 0.18; c.fillStyle = '#fff';
        for (let i = -h; i < w; i += 46) { c.beginPath(); c.moveTo(i, h); c.lineTo(i + 20, h); c.lineTo(i + 20 + h, 0); c.lineTo(i + h, 0); c.closePath(); c.fill(); }
        c.restore();
        c.strokeStyle = 'rgba(255,255,255,0.7)'; c.setLineDash([6, 6]); c.lineWidth = 2;
        c.beginPath(); c.moveTo(6, 74); c.lineTo(w - 6, 74); c.stroke(); c.setLineDash([]);
        c.fillStyle = 'rgba(255,255,255,0.18)'; c.beginPath(); c.arc(w / 2, 182, 58, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.font = 'bold 40px "Trebuchet MS", sans-serif'; c.fillText('★', w / 2, 182);
      });
    }

    static cardBack(scene) {
      Textures.make(scene, 'pfx-card-back', 220, 310, (c, w, h) => {
        Textures.rr(c, 0, 0, w, h, 18); c.fillStyle = '#ffc94a'; c.fill();
        const g = c.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, '#3b2a7a'); g.addColorStop(1, '#1b1240');
        Textures.rr(c, 7, 7, w - 14, h - 14, 13); c.fillStyle = g; c.fill();
        c.save(); Textures.rr(c, 7, 7, w - 14, h - 14, 13); c.clip();
        c.strokeStyle = 'rgba(255,201,74,0.13)'; c.lineWidth = 2;
        for (let i = -h; i < w + h; i += 22) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + h, h); c.stroke(); c.beginPath(); c.moveTo(i + h, 0); c.lineTo(i, h); c.stroke(); }
        c.restore();
        c.fillStyle = '#ffc94a'; c.beginPath(); c.arc(w / 2, h / 2, 52, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#2a1d5e'; c.beginPath(); c.arc(w / 2, h / 2, 45, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#ffc94a'; c.font = 'bold 54px "Trebuchet MS", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('?', w / 2, h / 2 + 3);
      });
    }

    /** Solid white shapes for iris transitions: circle, square, diamond, heart, star. Returns the key. */
    static shape(scene, name = 'circle') {
      const key = `pfx-shape-${name}`;
      Textures.make(scene, key, 256, 256, (c, s) => {
        c.fillStyle = '#ffffff';
        const m = s / 2;
        c.beginPath();
        if (name === 'square') c.rect(0, 0, s, s);
        else if (name === 'diamond') { c.moveTo(m, 0); c.lineTo(s, m); c.lineTo(m, s); c.lineTo(0, m); c.closePath(); }
        else if (name === 'heart') {
          c.moveTo(m, s * 0.92);
          c.bezierCurveTo(-s * 0.2, s * 0.42, s * 0.12, -s * 0.08, m, s * 0.24);
          c.bezierCurveTo(s * 0.88, -s * 0.08, s * 1.2, s * 0.42, m, s * 0.92);
        } else if (name === 'star') Textures.starPath(c, m, m * 1.06, m, m * 0.42);
        else c.arc(m, m, m, 0, Math.PI * 2);
        c.fill();
      });
      return key;
    }

    /**
     * Grayscale copy of any loaded texture (for "locked" items). Returns the new
     * key, or null if the image cannot be read (cross-origin without CORS).
     */
    static gray(scene, key, frame) {
      const out = `${key}${frame != null ? `-${frame}` : ''}__pfx-gray`;
      if (scene.textures.exists(out)) return out;
      const f = scene.textures.getFrame(key, frame);
      if (!f || !f.source || !f.source.image) return null;
      try {
        const t = scene.textures.createCanvas(out, f.cutWidth, f.cutHeight);
        const c = t.getContext();
        c.drawImage(f.source.image, f.cutX, f.cutY, f.cutWidth, f.cutHeight, 0, 0, f.cutWidth, f.cutHeight);
        const img = c.getImageData(0, 0, f.cutWidth, f.cutHeight);
        const d = img.data;
        for (let i = 0; i < d.length; i += 4) {
          const l = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) * 0.62 + 18;
          d[i] = l; d[i + 1] = l; d[i + 2] = l + 6;
        }
        c.putImageData(img, 0, 0);
        t.refresh();
        return out;
      } catch (e) {
        if (scene.textures.exists(out)) scene.textures.remove(out);
        return null;
      }
    }

    /** White silhouette of a texture (classic hit flash that works in Canvas too). */
    static white(scene, key, frame) {
      const out = `${key}${frame != null ? `-${frame}` : ''}__pfx-white`;
      if (scene.textures.exists(out)) return out;
      const f = scene.textures.getFrame(key, frame);
      if (!f || !f.source || !f.source.image) return null;
      try {
        const t = scene.textures.createCanvas(out, f.cutWidth, f.cutHeight);
        const c = t.getContext();
        c.drawImage(f.source.image, f.cutX, f.cutY, f.cutWidth, f.cutHeight, 0, 0, f.cutWidth, f.cutHeight);
        c.globalCompositeOperation = 'source-in';
        c.fillStyle = '#ffffff';
        c.fillRect(0, 0, f.cutWidth, f.cutHeight);
        t.refresh();
        return out;
      } catch (e) {
        if (scene.textures.exists(out)) scene.textures.remove(out);
        return null;
      }
    }
  }

  // ---- src/core/Juice.js
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

  // ---- src/core/Component.js
  /**
   * Component — base for long-lived effects (fire, weather, XP bar, dialogue…).
   * It tracks its game objects, can run per-frame code, and cleans up when you
   * call destroy() or when the scene shuts down.
   */
  class Component {
    constructor(fx) {
      this.fx = fx;
      this.j = fx.juice;
      this.scene = fx.scene;
      this.objects = [];
      this.alive = true;
      this._onShutdown = () => this.destroy();
      this.scene.events.once('shutdown', this._onShutdown);
    }

    track(obj) { this.objects.push(obj); return obj; }

    /** Run fn(time, delta) every frame until destroy(). delta is already slow-mo scaled. */
    onUpdate(fn) {
      this._update = (time, delta) => { if (this.alive) fn(time, delta * this.j.timeScale); };
      this.scene.events.on('update', this._update);
    }

    destroy() {
      if (!this.alive) return;
      this.alive = false;
      if (this._update) this.scene.events.off('update', this._update);
      this.scene.events.off('shutdown', this._onShutdown);
      this.objects.forEach((o) => {
        if (!o) return;
        if (this.scene.tweens) this.scene.tweens.killTweensOf(o);
        if (o.destroy) o.destroy();
      });
      this.objects = [];
    }
  }

  // ---- src/effects/Particles.js
  /**
   * Particles — one-shot particle effects. Called through the plugin:
   *   this.fx.sparks(x, y)   this.fx.confetti()   await this.fx.fireworks(x, y)
   *   await this.fx.impact(x, y)   await this.fx.coins(from, to, { count: 12 })
   * All positions are WORLD coordinates (they scroll with the camera).
   */
  class Particles {
    static COLORS = [0xff5fa2, 0xffc94a, 0x4fe0c8, 0x7a8cff, 0xff8a3d, 0xffffff];

    /** Layered burst: bright core + streak sparks that face their direction + falling embers. */
    static sparks(fx, x, y, o = {}) {
      const j = fx.juice;
      const count = o.count || 40;
      const speed = o.speed || 520;
      const colors = o.colors || [0xffffff, 0xffe680, 0xffa82e, 0xff4a1c];
      const depth = o.depth != null ? o.depth : j.depth(20);
      const core = fx.scene.add.image(x, y, 'pfx-glow').setScale(0.2 * (o.size || 1)).setBlendMode(Phaser.BlendModes.ADD).setTint(colors[1] || 0xffffff).setDepth(depth + 1);
      fx.scene.tweens.add({ targets: core, scale: 1.4 * (o.size || 1), alpha: 0, duration: 180, ease: 'Cubic.easeOut', onComplete: () => core.destroy() });
      j.burst(x, y, 'pfx-spark', {
        speed: { min: speed * 0.35, max: speed }, lifespan: { min: 400, max: o.lifespan || 650 }, gravityY: o.gravity != null ? o.gravity : 600,
        scaleX: { start: 0.9, end: 0.2 }, scaleY: { start: 0.7, end: 0.3 }, color: colors, colorEase: 'Quad.easeIn', blendMode: 'ADD',
        rotate: { onUpdate: (p) => Phaser.Math.RadToDeg(Math.atan2(p.velocityY, p.velocityX)) }
      }, count, depth);
      j.burst(x, y, 'pfx-ember', {
        speed: { min: 30, max: speed * 0.3 }, lifespan: { min: 650, max: 1300 }, gravityY: (o.gravity != null ? o.gravity : 600) * 0.35,
        scale: { start: 0.55, end: 0 }, color: [colors[1] || 0xffe680, 0xff7a1a, 0x80200a], blendMode: 'ADD'
      }, Math.round(count / 3), depth - 1);
      if (o.sound !== false) j.sfx('pop');
    }

    static _confettiConfig(o) {
      const wob = o.flutter || 26;
      return {
        tint: o.colors || Particles.COLORS,
        rotate: { onEmit: (p) => { p.pfxSpin = Phaser.Math.FloatBetween(-8, 8); return Phaser.Math.Between(0, 360); }, onUpdate: (p, k, t, v) => v + p.pfxSpin },
        scaleX: { onEmit: (p) => { p.pfxWob = Math.random() * 6.28; return 1; }, onUpdate: (p, k, t) => Math.cos(p.pfxWob + t * wob) },
        scaleY: { min: 0.7, max: 1.1 },
        alpha: { start: 1, end: 0, ease: 'Quint.easeIn' }
      };
    }

    /**
     * Confetti. With no x/y: two cannons fire from the bottom corners of the
     * SCREEN. With x/y: a burst at that world point.
     */
    static confetti(fx, o = {}) {
      const j = fx.juice;
      const n = o.count || 70;
      const base = { ...Particles._confettiConfig(o), speed: { min: 380, max: 820 }, gravityY: o.gravity || 420, lifespan: 3400 };
      const depth = o.depth != null ? o.depth : j.depth(400);
      if (o.x != null && o.y != null) {
        j.burst(o.x, o.y, 'pfx-confetti', { ...base, speed: { min: 200, max: 600 }, angle: { min: -160, max: -20 } }, n, depth);
      } else {
        const cam = fx.scene.cameras.main;
        const { w, h } = j.screen();
        const left = j.burst(20, h + 10, 'pfx-confetti', { ...base, angle: { min: -80, max: -50 } }, n, depth);
        const right = j.burst(w - 20, h + 10, 'pfx-confetti', { ...base, angle: { min: -130, max: -100 } }, n, depth);
        [left, right].forEach((e) => e.setScrollFactor(0));
        if (cam.zoom !== 1) { /* screen-space bursts are fine at any zoom */ }
      }
      if (o.sound !== false) { j.sfx('pop'); j.sfx('sparkle'); }
    }

    /** Rocket climbs from the bottom of the screen and bursts at x, y. Resolves after the burst. */
    static async fireworks(fx, x, y, o = {}) {
      const j = fx.juice;
      const sc = fx.scene;
      const pal = o.colors || [[0xffffff, 0xffd86b, 0xff7a1a], [0xffffff, 0x9be8ff, 0x4f7bff], [0xffffff, 0xffa8d8, 0xff3f8e], [0xffffff, 0xc3ffb0, 0x2fd48a]][Phaser.Math.Between(0, 3)];
      const size = o.size || 300;
      const count = o.count || 90;
      const depth = o.depth != null ? o.depth : j.depth(30);
      const cam = sc.cameras.main;
      const groundY = cam.worldView.bottom + 10;
      const rocket = sc.add.image(x + Phaser.Math.Between(-40, 40), groundY, 'pfx-glow').setScale(0.16).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth);
      const trail = j.emitter(0, 0, 'pfx-dot', {
        frequency: 12, lifespan: 600, speed: { min: 10, max: 50 }, gravityY: 200,
        scale: { start: 0.45, end: 0 }, color: [0xffffff, pal[1], pal[2]], blendMode: 'ADD'
      }, depth - 1);
      trail.startFollow(rocket);
      j.sfx('whoosh');
      await j.tween({ targets: rocket, x, y, duration: o.climb || 700, ease: 'Quad.easeOut' });
      if (!rocket.scene) return;
      trail.stopFollow(); trail.stop();
      sc.time.delayedCall(800, () => trail.destroy());
      rocket.destroy();
      const flash = sc.add.image(x, y, 'pfx-glow').setScale(0.4).setTint(pal[1]).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth + 2);
      sc.tweens.add({ targets: flash, scale: size / 60, alpha: 0, duration: 420, ease: 'Cubic.easeOut', onComplete: () => flash.destroy() });
      j.shockwave(x, y, pal[1], size / 90, 500, depth + 1);
      const shared = { lifespan: { min: 1040, max: 1300 }, gravityY: o.gravity != null ? o.gravity : 140, color: pal, colorEase: 'Quad.easeIn', blendMode: 'ADD' };
      j.burst(x, y, 'pfx-dot', { ...shared, speed: size * 0.95, scale: { start: 0.6, end: 0 } }, Math.round(count * 0.6), depth + 1);
      j.burst(x, y, 'pfx-ember', { ...shared, speed: { min: 20, max: size * 0.7 }, scale: { start: 0.7, end: 0 } }, Math.round(count * 0.4), depth + 1);
      j.sfx('boom');
      if (o.crackle === false) return;
      await j.wait(350);
      if (!sc.sys.isActive()) return;
      j.burst(x, y, 'pfx-star', {
        emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, size * 0.6) },
        speed: { min: 0, max: 20 }, lifespan: { min: 300, max: 700 }, gravityY: 40,
        scale: { start: 0.4, end: 0.1 }, color: [0xffffff, pal[1]], blendMode: 'ADD',
        alpha: { onUpdate: () => (Settings.reducedMotion ? 0.8 : Math.random()) }
      }, 40, depth + 3);
      j.sfx('sparkle');
    }

    /** Heavy impact: hit-stop → flash → flare → rings → debris → dust → shake → cracks. */
    static async impact(fx, x, y, o = {}) {
      const j = fx.juice;
      const sc = fx.scene;
      const k = o.power || 1;
      const color = o.color || 0x4fe0c8;
      const depth = o.depth != null ? o.depth : j.depth(40);
      j.sfx('boom');
      await j.hitStop(o.hitStop != null ? o.hitStop : 70);
      if (!sc.sys.isActive()) return;
      j.flash(90, 0xffffff, 0.5 * Math.min(1, k));
      const flare = sc.add.image(x, y, 'pfx-flare').setBlendMode(Phaser.BlendModes.ADD).setScale(0.3 * k, 1).setDepth(depth + 5).setTint(0xdffcff);
      sc.tweens.add({ targets: flare, scaleX: 2.6 * k, alpha: 0, duration: 260, ease: 'Cubic.easeOut', onComplete: () => flare.destroy() });
      if (o.target) j.pop(o.target, 0.3 * Math.min(1.5, k), 480);
      [0, 60, 130].forEach((d, i) => sc.time.delayedCall(d, () => j.shockwave(x, y, i === 0 ? 0xffffff : color, (3.6 - i * 0.8) * k, 520 + i * 90, depth + 4)));
      j.burst(x, y, 'pfx-shard', {
        speed: { min: 220 * k, max: 620 * k }, angle: { min: -170, max: -10 }, gravityY: 1300, lifespan: { min: 700, max: 1200 },
        rotate: { onEmit: (p) => { p.pfxSpin = Phaser.Math.FloatBetween(-14, 14); return Phaser.Math.Between(0, 360); }, onUpdate: (p, kk, t, v) => v + p.pfxSpin },
        scale: { min: 0.3, max: 0.8 }, tint: o.debrisColors || [color, 0xffffff, 0x9be8ff], alpha: { start: 1, end: 0, ease: 'Quint.easeIn' }
      }, Math.round(26 * k), depth + 3);
      j.burst(x, y + 10, 'pfx-smoke', {
        speedX: { min: -260 * k, max: 260 * k }, speedY: { min: -60, max: 0 }, lifespan: { min: 900, max: 1500 },
        scale: { start: 0.6, end: 2.2 * k }, alpha: { start: 0.45, end: 0 }, tint: o.dustColor || 0x8a80b0, rotate: { min: 0, max: 360 }
      }, 14, depth + 2);
      j.shake(220, (o.shake != null ? o.shake : 0.01) * k);
      if (o.cracks === false) return;
      const g = sc.add.graphics().setDepth(depth - 1);
      g.lineStyle(3, color, 0.9);
      for (let i = 0; i < 7; i++) {
        const a = Phaser.Math.FloatBetween(Math.PI * 0.05, Math.PI * 0.95) * (Math.random() < 0.5 ? 1 : -1);
        let px = x;
        let py = y;
        g.beginPath(); g.moveTo(px, py);
        for (let s = 0; s < 4; s++) {
          const len = Phaser.Math.Between(18, 46) * k;
          const aa = a + Phaser.Math.FloatBetween(-0.5, 0.5);
          px += Math.cos(aa) * len; py += Math.sin(aa) * len * 0.35;
          g.lineTo(px, py);
        }
        g.strokePath();
      }
      sc.tweens.add({ targets: g, alpha: 0, delay: 400, duration: 1200, onComplete: () => g.destroy() });
    }

    /**
     * Reward pickup: items burst out at `from`, hang, then fly to `to` (a point
     * or a game object such as your score text). onEach(i) fires as each lands,
     * which is the moment to add +1 to your score.
     */
    static coins(fx, from, to, o = {}) {
      const j = fx.juice;
      const sc = fx.scene;
      const n = Settings.amount(o.count || 12);
      const tex = o.texture || 'pfx-coin';
      const spread = o.spread || 160;
      const depth = o.depth != null ? o.depth : j.depth(250);
      const screen = !!o.screen;
      j.sfx('pop');
      j.burst(from.x, from.y, 'pfx-star', { speed: { min: 60, max: 180 }, lifespan: 500, scale: { start: 0.6, end: 0 }, color: [0xffffff, 0xffd23f], blendMode: 'ADD' }, 12, depth);
      const jobs = [];
      for (let i = 0; i < n; i++) {
        const coin = sc.add.image(from.x, from.y, tex).setDepth(depth).setScale(o.scale || 0.9);
        if (screen) coin.setScrollFactor(0);
        const dx = Phaser.Math.Between(-spread, spread);
        const peak = from.y - Phaser.Math.Between(90, 220);
        const land = from.y + Phaser.Math.Between(-30, 50);
        sc.tweens.add({ targets: coin, x: from.x + dx, duration: 620 });
        sc.tweens.chain({ targets: coin, tweens: [{ y: peak, duration: 260, ease: 'Quad.easeOut' }, { y: land, duration: 360, ease: 'Bounce.easeOut' }] });
        if (tex === 'pfx-coin') sc.tweens.add({ targets: coin, scaleX: 0.15, duration: Phaser.Math.Between(110, 170), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        jobs.push(j.wait(760 + i * 45).then(() => {
          if (!coin.scene) return null;
          sc.tweens.killTweensOf(coin);
          coin.setScale(o.scale || 0.9);
          return j.flyTo(coin, { x: coin.x, y: coin.y }, to, { duration: o.duration || 650, scaleTo: (o.scale || 0.9) * 0.6 }).then(() => {
            coin.destroy();
            j.sfx('coin');
            if (to.scene && to !== coin) j.pop(to, 0.2, 140);
            if (o.onEach) o.onEach(i);
          });
        }));
      }
      return Promise.all(jobs);
    }
  }

  // ---- src/components/ConfettiRain.js
  /**
   * ConfettiRain — gentle confetti falling across the screen until stopped.
   *   const rain = this.fx.confettiRain({ density: 5 });
   *   rain.stop();      // let the pieces finish falling
   *   rain.destroy();   // remove now
   */
  class ConfettiRain extends Component {
    constructor(fx, o = {}) {
      super(fx);
      const { w } = this.j.screen();
      const density = o.density || 4;
      this.em = this.track(this.j.emitter(0, -20, 'pfx-confetti', {
        ...Particles._confettiConfig(o),
        alpha: 1,
        emitZone: { type: 'random', source: new Phaser.Geom.Line(0, 0, w, 0) },
        speedY: { min: 40, max: 110 }, speedX: { min: -30, max: 30 }, accelerationX: { min: -20, max: 20 },
        gravityY: o.gravity || 65, lifespan: o.lifespan || 9000,
        frequency: 600 / Settings.amount(density), quantity: 1, maxParticles: 600
      }, o.depth != null ? o.depth : this.j.depth(390)));
      this.em.setScrollFactor(0);
      if (o.duration) this.j.wait(o.duration).then(() => this.stop());
    }

    stop() { if (this.alive) this.em.stop(); return this; }
  }

  // ---- src/components/Trail.js
  /**
   * Trail — a sparkly trail that follows a game object or the pointer.
   *   const t = this.fx.trail(player);                 // follow a sprite
   *   const t = this.fx.trail('pointer', { colors: [0xffffff, 0x7ff7e3] });
   *   t.burst();  t.destroy();
   * Emission rises with speed: standing still makes almost nothing.
   */
  class Trail extends Component {
    constructor(fx, target = 'pointer', o = {}) {
      super(fx);
      const sc = this.scene;
      this.target = target;
      this.density = o.density || 6;
      this.lerp = o.smoothing != null ? o.smoothing : (target === 'pointer' ? 0.25 : 1);
      const colors = o.colors || [0xffffff, 0xffd86b, 0xff5fa2, 0x8a6bff];
      const life = o.lifespan || 800;
      const depth = o.depth != null ? o.depth : this.j.depth(30);
      const p = this.targetPoint();
      this.head = this.track(sc.add.image(p.x, p.y, 'pfx-glow').setScale(o.headSize != null ? o.headSize : 0.4).setBlendMode(Phaser.BlendModes.ADD).setTint(colors[1]).setDepth(depth + 1));
      if (o.head === false) this.head.setVisible(false);
      this.stars = this.track(this.j.emitter(0, 0, 'pfx-star', {
        frequency: 400, lifespan: { min: life * 0.6, max: life }, speed: { min: 5, max: 40 },
        scale: { start: 0.5 * (o.size || 1), end: 0 }, rotate: { start: 0, end: 220 }, color: colors, blendMode: 'ADD', gravityY: 30
      }, depth));
      this.dots = this.track(this.j.emitter(0, 0, 'pfx-glow', {
        frequency: 300, lifespan: life * 0.7, scale: { start: 0.2 * (o.size || 1), end: 0.02 }, alpha: { start: 0.55, end: 0 }, color: colors, blendMode: 'ADD'
      }, depth - 1));
      this.stars.startFollow(this.head);
      this.dots.startFollow(this.head);
      this.prev = { x: p.x, y: p.y };
      this.colors = colors;
      this.onUpdate((t, dt) => this.tick(dt));
    }

    targetPoint() {
      if (this.target === 'pointer') {
        const ptr = this.scene.input.activePointer;
        return { x: ptr.worldX, y: ptr.worldY };
      }
      return this.j.centerOf(this.target);
    }

    tick(dt) {
      if (this.target !== 'pointer' && (!this.target || !this.target.scene)) { this.destroy(); return; }
      const p = this.targetPoint();
      const k = 1 - Math.pow(1 - Math.min(1, this.lerp), dt / 16.67);
      const hx = this.head.x + (p.x - this.head.x) * k;
      const hy = this.head.y + (p.y - this.head.y) * k;
      this.head.setPosition(hx, hy);
      const speed = Phaser.Math.Distance.Between(this.prev.x, this.prev.y, hx, hy) / Math.max(1, dt) * 16.67;
      this.prev = { x: hx, y: hy };
      const d = Settings.reducedMotion ? this.density * 0.5 : this.density;
      if (speed < 0.6) { this.stars.frequency = 400; this.dots.frequency = 300; } else {
        const m = d * Math.min(speed, 30) * 0.12 + 1;
        this.stars.frequency = Math.max(6, 160 / m);
        this.dots.frequency = Math.max(5, 110 / m);
      }
    }

    /** A little sparkle pop at the head. */
    burst() {
      this.j.burst(this.head.x, this.head.y, 'pfx-star', { speed: { min: 60, max: 260 }, scale: { start: 0.8, end: 0 }, lifespan: 700, rotate: { min: 0, max: 360 }, color: this.colors, blendMode: 'ADD' }, 22, this.head.depth + 1);
      this.j.sfx('sparkle');
    }
  }

  // ---- src/components/Fire.js
  /**
   * Fire — campfire / torch flames with smoke, embers and flickering light.
   *   const fire = this.fx.fire(400, 500, { size: 1, wind: 30, smoke: 5 });
   *   fire.setPosition(x, y);  fire.setWind(-80);  fire.destroy();
   * Flames are ADD-blended (light), smoke is NORMAL (matter).
   */
  class Fire extends Component {
    constructor(fx, x, y, o = {}) {
      super(fx);
      const k = o.size || 1;
      const wind = o.wind || 0;
      const smoke = o.smoke != null ? o.smoke : 5;
      const depth = o.depth != null ? o.depth : this.j.depth(15);
      this.k = k;
      this.x = x;
      this.y = y;
      this.light = this.track(this.scene.add.image(x, y - 40 * k, 'pfx-glow').setTint(o.lightColor || 0xff8a2a).setBlendMode(Phaser.BlendModes.ADD).setScale(3.2 * k).setAlpha(o.light === false ? 0 : 0.35).setDepth(depth - 3));
      this.smoke = this.track(this.j.emitter(x, y - 70 * k, 'pfx-smoke', {
        frequency: smoke ? 900 / smoke : -1, lifespan: { min: 2600, max: 3600 }, speedY: { min: -70, max: -40 }, speedX: { min: -12, max: 12 },
        scale: { start: 0.4 * k, end: 2.4 * k }, rotate: { min: 0, max: 360 }, tint: o.smokeColors || [0x3c3550, 0x4a4360, 0x2e2840],
        alpha: { onUpdate: (p, key, t) => Math.sin(t * Math.PI) * 0.4 }
      }, depth - 2));
      this.flame = this.track(this.j.emitter(x, y - 6, 'pfx-ember', {
        frequency: Settings.reducedMotion ? 40 : 22, quantity: 1,
        emitZone: { type: 'random', source: new Phaser.Geom.Ellipse(0, 0, 80 * k, 14 * k) },
        lifespan: { min: 550, max: 950 }, speedY: { min: -200 * k, max: -110 * k }, speedX: { min: -20, max: 20 },
        scale: { start: 1.5 * k, end: 0.15 * k, ease: 'Quad.easeIn' }, alpha: { start: 0.85, end: 0.2 },
        color: o.colors || [0xfff2c0, 0xffc23a, 0xff6a14, 0xb3220c, 0x1a0602], colorEase: 'Sine.easeOut', blendMode: 'ADD'
      }, depth));
      this.embers = this.track(this.j.emitter(x, y - 20, 'pfx-dot', {
        frequency: 140, lifespan: { min: 1600, max: 2600 }, speedY: { min: -160, max: -70 }, speedX: { min: -40, max: 40 },
        accelerationY: { min: -20, max: 10 }, scale: { start: 0.35 * k, end: 0 }, color: [0xffe680, 0xff7a1a, 0x802008], blendMode: 'ADD'
      }, depth + 1));
      this.setWind(wind);
      this.lightOn = o.light !== false;
      this.next = 0;
      this.onUpdate((t) => {
        if (!this.lightOn || t < this.next) return;
        this.next = t + Phaser.Math.Between(60, 140) / this.j.timeScale;
        const a = Settings.reducedMotion ? 0.33 : Phaser.Math.FloatBetween(0.26, 0.42);
        this.scene.tweens.add({ targets: this.light, alpha: a, scale: 3.2 * this.k * Phaser.Math.FloatBetween(0.95, 1.06), duration: 90 });
      });
    }

    /** Wind uses gravityX, so flames and smoke already in the air bend too. */
    setWind(w) {
      this.flame.gravityX = w * 0.3;
      this.smoke.gravityX = w * 0.6;
      this.embers.gravityX = w * 0.45;
      return this;
    }

    setPosition(x, y) {
      const dx = x - this.x;
      const dy = y - this.y;
      [this.flame, this.smoke, this.embers, this.light].forEach((o) => { o.x += dx; o.y += dy; });
      this.x = x; this.y = y;
      return this;
    }

    /** A puff of sparks (e.g. when a log is added). */
    flare() {
      this.j.burst(this.x, this.y - 20, 'pfx-dot', { speed: { min: 80, max: 260 }, angle: { min: -150, max: -30 }, gravityY: 300, lifespan: 900, scale: { start: 0.4, end: 0 }, color: [0xffe680, 0xff7a1a], blendMode: 'ADD' }, 24, this.flame.depth + 2);
      this.j.sfx('whoosh');
    }
  }

  // ---- src/components/Portal.js
  /**
   * Portal — a swirling magic portal.
   *   const portal = this.fx.portal(600, 300, { radius: 120, palette: 'blue' });
   *   portal.pulse();   // e.g. when the player enters
   *   portal.destroy();
   * Palettes: 'blue' | 'green' | 'pink' | 'gold', or an array of 4 colours.
   */
  class Portal extends Component {
    static PALETTES = {
      blue: [0xffffff, 0x9be8ff, 0x7a5cff, 0x2a1f7a],
      green: [0xffffff, 0xb8ffcf, 0x2fd48a, 0x0b4a3a],
      pink: [0xffffff, 0xffc2e0, 0xff4f9a, 0x5a0f3a],
      gold: [0xffffff, 0xffe39a, 0xff9a2a, 0x5a2a05]
    };

    constructor(fx, x, y, o = {}) {
      super(fx);
      const sc = this.scene;
      const r = o.radius || 120;
      const pal = Array.isArray(o.palette) ? o.palette : Portal.PALETTES[o.palette || 'blue'];
      const depth = o.depth != null ? o.depth : this.j.depth(10);
      this.x = x; this.y = y; this.r = r; this.pal = pal;
      this.track(sc.add.image(x, y, 'pfx-glow').setScale(r / 40).setTint(pal[3]).setAlpha(0.8).setDepth(depth));
      this.rings = [1.08, 0.82, 0.56].map((k, i) => {
        const ring = this.track(sc.add.image(x, y, 'pfx-ring').setScale((r * 2 * k) / 192, (r * 2 * k * 0.92) / 192).setTint(pal[i + 1]).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.55).setDepth(depth + 1));
        sc.tweens.add({ targets: ring, angle: i % 2 ? -360 : 360, duration: 3000 + i * 1600, repeat: -1 });
        return ring;
      });
      this.track(this.j.emitter(x, y, 'pfx-dot', {
        emitZone: { type: 'edge', source: new Phaser.Geom.Circle(0, 0, r), quantity: 64 },
        frequency: 16, quantity: Settings.reducedMotion ? 1 : 2, lifespan: o.pull || 900,
        moveToX: 0, moveToY: 0, scale: { start: 0.6 * (r / 170 + 0.4), end: 0.05 }, color: pal, blendMode: 'ADD'
      }, depth + 2));
      this.track(this.j.emitter(x, y, 'pfx-star', {
        emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, r) }, frequency: 90, lifespan: 1200,
        speed: { min: 10, max: 40 }, scale: { start: 0.4, end: 0 }, rotate: { min: 0, max: 360 }, color: [0xffffff, pal[1]], blendMode: 'ADD'
      }, depth + 3));
      this.core = this.track(sc.add.image(x, y, 'pfx-glow').setScale(0.9 * r / 170).setTint(pal[1]).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth + 4));
      sc.tweens.add({ targets: this.core, scale: 1.15 * r / 170, alpha: 0.7, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    pulse() {
      this.scene.tweens.add({ targets: this.rings, scaleX: '*=1.12', scaleY: '*=1.12', duration: 140, yoyo: true, ease: 'Quad.easeOut' });
      this.j.shockwave(this.x, this.y, this.pal[1], (this.r * 2.4) / 96, 600, this.core.depth + 1);
      this.j.burst(this.x, this.y, 'pfx-dot', { speed: { min: 200, max: 480 }, lifespan: 700, scale: { start: 0.7, end: 0 }, color: this.pal, blendMode: 'ADD' }, 50, this.core.depth + 1);
      this.j.sfx('whoosh');
      this.j.sfx('chime');
    }
  }

  // ---- src/components/Weather.js
  /**
   * Weather — screen-space rain, snow, leaves or petals with depth (near + far layers).
   *   const w = this.fx.weather('rain', { amount: 6, wind: 60, lightning: true, ground: 520 });
   *   w.gust();  w.setWind(-120);  w.destroy();
   * Types: 'rain' | 'snow' | 'leaves' | 'petals'. Wind is gravityX, so gusts bend
   * particles already in the air. `ground` (screen y) is where rain splashes.
   */
  class Weather extends Component {
    constructor(fx, type = 'rain', o = {}) {
      super(fx);
      this.type = type;
      this.wind = o.wind != null ? o.wind : 40;
      const { w, h } = this.j.screen();
      this.W = w;
      this.ground = o.ground != null ? o.ground : h;
      const amount = o.amount || 6;
      const depth = o.depth != null ? o.depth : this.j.depth(350);
      this.layers = [this.make(0.5, amount, depth - 2), this.make(1, amount, depth)];
      if (type === 'rain') {
        if (o.splashes !== false) {
          this.splash = this.track(this.j.emitter(0, this.ground, 'pfx-dot', {
            emitZone: { type: 'random', source: new Phaser.Geom.Line(0, 0, w, 0) }, frequency: 140 / amount, lifespan: 260,
            speedY: { min: -120, max: -60 }, speedX: { min: -50, max: 50 }, gravityY: 600, scale: { start: 0.18, end: 0.05 }, alpha: 0.7, tint: 0xbfd6ff
          }, depth - 1).setScrollFactor(0));
          this.splash.windK = 0;
        }
        if (o.lightning) { this.lightning = true; this.nextBolt = 2500; }
      }
      this.setWind(this.wind);
      this.onUpdate((t, dt) => {
        if (!this.lightning) return;
        this.nextBolt -= dt;
        if (this.nextBolt <= 0) { this.bolt(); this.nextBolt = Phaser.Math.Between(4000, 9000); }
      });
    }

    make(k, amount, depth) {
      const near = k === 1;
      const zone = { type: 'random', source: new Phaser.Geom.Line(-300, 0, this.W + 300, 0) };
      let cfg;
      let tex;
      if (this.type === 'rain') {
        tex = 'pfx-drop';
        cfg = {
          emitZone: zone, frequency: 40 / Settings.amount(amount) / k, quantity: near ? 2 : 1, speedY: { min: 950 * k, max: 1150 * k },
          lifespan: ((this.ground + 40) / (1050 * k)) * 1000 * (near ? 1 : 0.8), scaleY: near ? 1.2 : 0.6, scaleX: near ? 1 : 0.6,
          alpha: near ? 0.75 : 0.35, tint: 0xbfd6ff, rotate: { onUpdate: (p) => Phaser.Math.RadToDeg(Math.atan2(p.velocityY, p.velocityX)) - 90 }
        };
      } else if (this.type === 'snow') {
        tex = 'pfx-dot';
        cfg = {
          emitZone: zone, frequency: 120 / Settings.amount(amount) / k, lifespan: 12000, speedY: { min: 30 * k + 20, max: 70 * k + 20 },
          speedX: { min: -20, max: 20 }, accelerationX: { min: -10, max: 10 }, scale: near ? { min: 0.3, max: 0.5 } : { min: 0.1, max: 0.2 }, alpha: near ? 0.95 : 0.55
        };
      } else {
        const leaves = this.type === 'leaves';
        tex = 'pfx-leaf';
        cfg = {
          emitZone: zone, frequency: (leaves ? 420 : 260) / Settings.amount(amount) / k, lifespan: 12000,
          speedY: { min: 50 * k + 20, max: 110 * k + 20 }, speedX: { min: -30, max: 30 },
          tint: leaves ? [0xe8833a, 0xd4572a, 0xf2b84b, 0xa8452a] : [0xffc2d9, 0xff9cc2, 0xffe3ee],
          scale: near ? { min: leaves ? 1.1 : 0.6, max: leaves ? 1.5 : 0.9 } : { min: 0.45, max: 0.7 }, alpha: near ? 1 : 0.55,
          rotate: { onEmit: (p) => { p.pfxSpin = Phaser.Math.FloatBetween(-3, 3); return Phaser.Math.Between(0, 360); }, onUpdate: (p, kk, t, v) => v + p.pfxSpin },
          scaleY: { onEmit: (p) => { p.pfxWob = Math.random() * 6.28; return 1; }, onUpdate: (p, kk, t) => Math.cos(p.pfxWob + t * 40) * (near ? 1.3 : 0.6) }
        };
      }
      const em = this.track(this.j.emitter(0, -30, tex, { maxParticles: 900, ...cfg }, depth).setScrollFactor(0));
      em.windK = this.type === 'rain' ? 0.6 : near ? 1 : 0.6;
      return em;
    }

    setWind(w) {
      this.wind = w;
      [...this.layers, this.splash].filter(Boolean).forEach((em) => { this.scene.tweens.killTweensOf(em); em.gravityX = w * em.windK; });
      return this;
    }

    /** A gust of wind that pushes everything in the air, then settles. */
    gust(strength = 700) {
      const dir = this.wind >= 0 ? 1 : -1;
      this.layers.forEach((em) => {
        const base = this.wind * em.windK;
        this.scene.tweens.add({ targets: em, gravityX: base + dir * strength * em.windK, duration: 500, yoyo: true, hold: 300, ease: 'Sine.easeInOut' });
      });
      this.j.sfx('whoosh');
    }

    /** One lightning strike: flash, a jagged bolt and thunder. */
    bolt() {
      const sc = this.scene;
      const x0 = Phaser.Math.Between(this.W * 0.2, this.W * 0.8);
      const g = this.j.ui(sc.add.graphics().setDepth(this.layers[1].depth + 1));
      let x = x0;
      let y = 0;
      g.lineStyle(4, 0xffffff, 1).beginPath().moveTo(x, y);
      while (y < this.ground * 0.75) { x += Phaser.Math.Between(-40, 40); y += Phaser.Math.Between(30, 60); g.lineTo(x, y); }
      g.strokePath();
      g.lineStyle(12, 0x9fc4ff, 0.35).strokePath();
      this.j.flash(180, 0xdfe8ff, 0.55);
      sc.time.delayedCall(120, () => g.destroy());
      sc.time.delayedCall(400, () => this.j.sfx('boom'));
    }
  }

  // ---- src/components/StarRating.js
  /**
   * StarRating — results panel: score rolls up, stars slam in one by one.
   *   const panel = await this.fx.starRating(2, { score: 870, title: 'LESSON COMPLETE' });
   *   panel.destroy();
   * Options: x, y (screen), score, title, message, gap (ms), confetti (default: on for 3/3),
   * width, height, colors { panel, edge, banner, bannerText }.
   */
  class StarRating extends Component {
    static MESSAGES = ['Good effort! Try again for a star.', 'Nice start! You earned a star.', 'Great work! Two stars!', 'Perfect! All three stars!'];

    constructor(fx, stars, o = {}) {
      super(fx);
      const sc = this.scene;
      const { cx, cy } = this.j.screen();
      const W = o.width || 520;
      const H = o.height || 400;
      const col = { panel: 0x221a44, edge: 0x4a3f7c, banner: 0x2fd48a, bannerText: '#0b2b20', ...(o.colors || {}) };
      this.stars = Phaser.Math.Clamp(stars, 0, 3);
      this.o = o;
      this.panel = this.track(this.j.ui(sc.add.container(o.x != null ? o.x : cx, o.y != null ? o.y : cy).setDepth(this.j.depth(600)).setScale(0.6).setAlpha(0)));
      const g = sc.add.graphics();
      g.fillStyle(0x07050f, 0.6).fillRoundedRect(-W / 2, -H / 2 + 8, W, H, 28);
      g.fillStyle(col.panel, 1).fillRoundedRect(-W / 2, -H / 2, W, H, 28).lineStyle(3, col.edge, 1).strokeRoundedRect(-W / 2, -H / 2, W, H, 28);
      g.fillStyle(col.banner, 1).fillRoundedRect(-150, -H / 2 - 28, 300, 56, 28);
      const title = this.j.text(0, -H / 2, o.title || 'LEVEL COMPLETE', 20, col.bannerText);
      this.slots = [-130, 0, 130].map((x, i) => sc.add.image(x, -H / 2 + 134 + (i === 1 ? -22 : 0), 'pfx-star5-empty').setScale(i === 1 ? 1.15 : 0.95));
      this.panel.add([g, title, ...this.slots]);
      if (o.score != null) {
        this.panel.add(this.j.text(0, H / 2 - 148, o.scoreLabel || 'SCORE', 13, '#9b93c4', { body: true }));
        this.scoreText = this.j.text(0, H / 2 - 108, '0', 46, '#ffc94a');
        this.panel.add(this.scoreText);
      }
      this.msg = this.j.text(0, H / 2 - 48, '', 18, '#ece8ff', { body: true, wrap: W - 60 });
      this.panel.add(this.msg);
      this.done = this.run();
    }

    async run() {
      const j = this.j;
      const o = this.o;
      j.sfx('whoosh');
      await j.tween({ targets: this.panel, scale: 1, alpha: 1, duration: 420, ease: 'Back.easeOut' });
      const counting = this.scoreText ? j.countUp(this.scoreText, 0, o.score, 900) : Promise.resolve();
      await j.wait(300);
      for (let i = 0; i < 3; i++) {
        if (!this.alive) return this;
        if (i < this.stars) await this.slam(i);
        else this.scene.tweens.add({ targets: this.slots[i], alpha: { from: 1, to: 0.55 }, duration: 700, yoyo: true, repeat: 1 });
        await j.wait(o.gap || 420);
      }
      await counting;
      if (!this.alive) return this;
      this.msg.setText(o.message || StarRating.MESSAGES[this.stars]).setAlpha(0);
      this.scene.tweens.add({ targets: this.msg, alpha: 1, duration: 300 });
      if (o.confetti !== false && (o.confetti || this.stars === 3)) Particles.confetti(this.fx, { sound: false });
      if (this.stars === 3) j.sfx('fanfare');
      return this;
    }

    async slam(i) {
      const j = this.j;
      const slot = this.slots[i];
      const size = i === 1 ? 1.15 : 0.95;
      const star = this.scene.add.image(slot.x, slot.y, 'pfx-star5').setScale(size * 3).setAngle(-40).setAlpha(0);
      this.panel.add(star);
      await j.tween({ targets: star, scale: size, angle: 0, alpha: 1, duration: 260, ease: 'Cubic.easeIn' });
      const wx = this.panel.x + slot.x;
      const wy = this.panel.y + slot.y;
      j.sfx('tone', [659, 784, 1047][i], 0.25, 'triangle', 0.11);
      j.sfx('sparkle');
      j.shake(90, 0.003 + i * 0.002);
      j.ui(j.shockwave(wx, wy, 0xffd86b, 1.4 + i * 0.3, 420, this.panel.depth + 1));
      j.ui(j.burst(wx, wy, 'pfx-star', { speed: { min: 100, max: 260 + i * 60 }, lifespan: { min: 400, max: 750 }, scale: { start: 0.55, end: 0 }, rotate: { min: 0, max: 360 }, color: [0xffffff, 0xffd86b], blendMode: 'ADD' }, 14 + i * 8, this.panel.depth + 1));
      j.pop(star, 0.18, 280);
    }

    /** Slide the panel away and remove it. */
    async close() {
      if (!this.alive) return;
      await this.j.tween({ targets: this.panel, scale: 0.8, alpha: 0, duration: 220, ease: 'Back.easeIn' });
      this.destroy();
    }
  }

  // ---- src/components/XPBar.js
  /**
   * XPBar — experience bar with flying orbs and LEVEL UP.
   *   const xp = this.fx.xpBar(80, 40, { width: 300, need: 100, onLevelUp: (lv) => {...} });
   *   xp.add(25, enemy.x, enemy.y);   // orbs fly from a world point into the bar
   *   xp.add(10);                      // no orbs, just fill
   * The bar is screen-space (HUD). x, y = left-centre of the bar.
   */
  class XPBar extends Component {
    constructor(fx, x, y, o = {}) {
      super(fx);
      const sc = this.scene;
      this.o = o;
      this.level = o.level || 1;
      this.need = o.need || 100;
      this.growth = o.growth || 1.25;
      this.xp = o.xp || 0;
      this.shown = this.xp;
      this.x = x; this.y = y;
      this.w = o.width || 300;
      this.h = o.height || 22;
      this.color = o.color || 0x2fbfa8;
      const depth = o.depth != null ? o.depth : this.j.depth(500);
      this.bar = this.track(this.j.ui(sc.add.graphics().setDepth(depth)));
      this.edge = this.track(this.j.ui(sc.add.image(x, y, 'pfx-glow').setTint(0x7ff7e3).setBlendMode(Phaser.BlendModes.ADD).setScale(this.h / 70).setDepth(depth + 1)));
      this.badge = this.track(this.j.ui(sc.add.container(x - this.h * 1.4, y).setDepth(depth + 2)));
      const r = this.h * 1.15;
      const disc = sc.add.graphics().fillStyle(0xffc94a, 1).fillCircle(0, 0, r).fillStyle(0x2a1d5e, 1).fillCircle(0, 0, r * 0.84);
      this.lvl = this.j.text(0, 1, String(this.level), Math.round(r * 0.9), '#ffc94a');
      this.badge.add([disc, this.lvl]);
      this.label = o.label === false ? null : this.track(this.j.ui(this.j.text(x + this.w / 2, y + this.h + 4, '', 13, '#ece8ff', { body: true, oy: 0 }).setDepth(depth)));
      this.onUpdate((t, dt) => {
        const target = Math.min(this.xp, this.need);
        this.shown += (target - this.shown) * (1 - Math.pow(0.88, dt / 16.67));
        this.draw();
      });
      this.draw();
    }

    draw() {
      const g = this.bar;
      const f = Math.min(1, this.shown / this.need);
      const { x, y, w, h } = this;
      g.clear();
      g.fillStyle(0x0b0818, 0.9).fillRoundedRect(x - 3, y - h / 2 - 3, w + 6, h + 6, (h + 6) / 2);
      g.fillStyle(0x241c48, 1).fillRoundedRect(x, y - h / 2, w, h, h / 2);
      if (f > 0.02) {
        const fw = Math.max(h, w * f);
        g.fillStyle(this.color, 1).fillRoundedRect(x, y - h / 2, fw, h, h / 2);
        g.fillStyle(0xffffff, 0.35).fillRoundedRect(x + 4, y - h / 2 + 3, fw - 8, h * 0.28, h * 0.14);
      }
      this.edge.setPosition(x + w * f, y).setVisible(f > 0.02);
      if (this.label) this.label.setText(`${Math.floor(Math.min(this.xp, this.need))} / ${this.need} XP`);
    }

    /** Add XP. With fromX/fromY (world), glowing orbs carry it into the bar. */
    add(amount, fromX, fromY, orbs = 8) {
      if (!this.alive) return Promise.resolve();
      if (fromX == null) { this.gain(amount); return Promise.resolve(); }
      const j = this.j;
      const sc = this.scene;
      const n = Settings.amount(orbs);
      const each = amount / n;
      const start = j.toScreen(fromX, fromY);
      j.sfx('pop');
      const jobs = [];
      for (let i = 0; i < n; i++) {
        const orb = j.ui(sc.add.image(start.x, start.y, 'pfx-glow').setTint(0x4fe0c8).setBlendMode(Phaser.BlendModes.ADD).setScale(0.22).setDepth(this.bar.depth + 3));
        const ang = Math.random() * Math.PI * 2;
        const r = Phaser.Math.Between(30, 80);
        sc.tweens.add({ targets: orb, x: start.x + Math.cos(ang) * r, y: start.y + Math.sin(ang) * r, duration: 220, ease: 'Quad.easeOut' });
        jobs.push(j.wait(240 + i * 55).then(() => j.flyTo(orb, null, { x: this.x + this.w * Math.min(1, this.shown / this.need), y: this.y }, { duration: 520 }))
          .then(() => { orb.destroy(); if (this.alive) { j.sfx('tone', 880 + (i % 8) * 60, 0.05, 'sine', 0.04); this.gain(each); } }));
      }
      return Promise.all(jobs);
    }

    gain(amount) {
      this.xp += amount;
      if (this.xp >= this.need && !this.levelling) this.levelUp();
    }

    async levelUp() {
      const j = this.j;
      this.levelling = true;
      while (this.alive && this.shown < this.need * 0.985) await j.wait(30);
      if (!this.alive) return;
      const white = j.ui(this.scene.add.rectangle(this.x + this.w / 2, this.y, this.w, this.h, 0xffffff).setDepth(this.bar.depth + 1));
      this.scene.tweens.add({ targets: white, alpha: 0, scaleY: 1.8, duration: 380, onComplete: () => white.destroy() });
      j.sfx('fanfare');
      await j.tween({ targets: this.badge, scaleX: 0, duration: 120, ease: 'Cubic.easeIn' });
      this.level += 1;
      this.lvl.setText(String(this.level));
      await j.tween({ targets: this.badge, scaleX: 1, duration: 260, ease: 'Back.easeOut' });
      j.pop(this.badge, 0.25, 320);
      j.ui(j.burst(this.badge.x, this.badge.y, 'pfx-star', { speed: { min: 80, max: 240 }, lifespan: 700, scale: { start: 0.5, end: 0 }, color: [0xffffff, 0xffd86b], blendMode: 'ADD' }, 18, this.badge.depth + 1));
      if (this.o.banner !== false) {
        const { cx, cy } = j.screen();
        const t = j.ui(j.text(cx, cy - 60, this.o.bannerText || 'LEVEL UP!', 48, '#ffc94a', { stroke: '#2a1640', strokeThickness: 10 }).setDepth(this.j.depth(650)).setScale(2.4).setAlpha(0));
        await j.tween({ targets: t, scale: 1, alpha: 1, duration: 220, ease: 'Cubic.easeIn' });
        j.shake(120, 0.004);
        this.scene.tweens.add({ targets: t, y: t.y - 30, alpha: 0, delay: 900, duration: 400, onComplete: () => t.destroy() });
      }
      this.xp -= this.need;
      this.shown = 0;
      this.need = Math.round(this.need * this.growth);
      this.levelling = false;
      if (this.o.onLevelUp) this.o.onLevelUp(this.level);
      if (this.xp >= this.need) this.levelUp();
    }
  }

  // ---- src/components/BadgeToast.js
  /**
   * BadgeToast — "Achievement unlocked" toast with a coin-spinning medal.
   *   await this.fx.badge({ title: 'Curious Mind', description: 'Asked 10 questions', color: '#4fa3ff', glyph: '?' });
   *   await this.fx.badge({ title: 'Boss Slayer', icon: 'my-badge-texture', to: shelfSlotSprite });
   * Options: title, description, color, glyph (or icon = your texture key), hold (ms),
   * spins, to (a game object or {x, y} on screen the medal flies to before the toast leaves).
   */
  class BadgeToast {
    static async show(fx, o = {}) {
      const j = fx.juice;
      const sc = fx.scene;
      const { cx } = j.screen();
      const color = o.color || '#ffc94a';
      const key = o.icon || Textures.medal(sc, color, o.glyph || '★');
      const W = o.width || 470;
      const H = 112;
      const depth = j.depth(700);
      const toast = j.ui(sc.add.container(o.x != null ? o.x : cx, -90).setDepth(depth));
      const g = sc.add.graphics();
      g.fillStyle(0x07050f, 0.6).fillRoundedRect(-W / 2, -H / 2 + 6, W, H, 22);
      g.fillStyle(0x241c48, 1).fillRoundedRect(-W / 2, -H / 2, W, H, 22);
      g.lineStyle(2, Phaser.Display.Color.HexStringToColor(color).color, 1).strokeRoundedRect(-W / 2, -H / 2, W, H, 22);
      const medal = sc.add.image(-W / 2 + 64, 4, key);
      const ms = 76 / Math.max(medal.width, medal.height);
      medal.setScale(ms);
      toast.add([g, medal,
        j.text(-W / 2 + 128, -26, o.eyebrow || 'ACHIEVEMENT UNLOCKED', 12, color, { body: true, ox: 0 }),
        j.text(-W / 2 + 128, 2, o.title || 'Achievement', 22, '#ece8ff', { ox: 0 }),
        j.text(-W / 2 + 128, 30, o.description || '', 14, '#9b93c4', { body: true, ox: 0 })]);
      j.ui(toast);
      j.sfx('whoosh');
      await j.tween({ targets: toast, y: o.y != null ? o.y : 72, duration: 420, ease: 'Back.easeOut' });
      if (!sc.sys.isActive()) return;
      j.sfx('chime');
      const spins = o.spins != null ? o.spins : 3;
      for (let k = 0; k < spins && !Settings.reducedMotion; k++) {
        const d = 60 + k * 40;
        await j.tween({ targets: medal, scaleX: 0, duration: d, ease: 'Sine.easeIn' });
        await j.tween({ targets: medal, scaleX: ms, duration: d, ease: 'Sine.easeOut' });
      }
      j.pop(medal, 0.15, 300);
      j.ui(j.burst(toast.x - W / 2 + 64, toast.y + 4, 'pfx-star', { speed: { min: 60, max: 200 }, lifespan: 600, scale: { start: 0.5, end: 0 }, color: [0xffffff, 0xffd86b], blendMode: 'ADD' }, 16, depth + 1));
      j.shine(toast.x, toast.y, W, H, 600, depth + 2, 22, true);
      await j.wait(o.hold || 1600);
      if (!sc.sys.isActive()) return;
      if (o.to) {
        const fly = j.ui(sc.add.image(toast.x - W / 2 + 64, toast.y + 4, key).setScale(ms).setDepth(depth + 3));
        medal.setVisible(false);
        sc.tweens.add({ targets: toast, y: -100, duration: 320, ease: 'Cubic.easeIn', onComplete: () => toast.destroy() });
        j.sfx('whoosh');
        await j.flyTo(fly, null, o.to, { duration: 650, ease: 'Sine.easeInOut', arc: 160 });
        const p = { x: fly.x, y: fly.y };
        fly.destroy();
        j.ui(j.shockwave(p.x, p.y, Phaser.Display.Color.HexStringToColor(color).color, 1.2, 420, depth + 3));
        if (o.to.scene) j.pop(o.to, 0.2, 320);
        j.sfx('pop');
      } else {
        await j.tween({ targets: toast, y: -100, duration: 320, ease: 'Cubic.easeIn' });
        toast.destroy();
      }
    }
  }

  // ---- src/components/ProgressPath.js
  /**
   * ProgressPath — a lesson/level map: nodes on a smooth path, a token that hops
   * along, a gold trail that draws itself, and locks that lift off.
   *   const map = this.fx.progressPath([[110,470],[250,380],[190,230],[370,150]], {
   *     current: 0, labels: ['Intro', 'Nouns', 'Verbs', 'Quiz'], token: 'hero',  // any texture key
   *     onFinish: () => this.fx.confetti()
   *   });
   *   await map.complete();       // finish the current node and travel to the next
   * Points are world coordinates. A token texture is optional (a glowing dot is used otherwise).
   */
  class ProgressPath extends Component {
    constructor(fx, points, o = {}) {
      super(fx);
      const sc = this.scene;
      this.o = o;
      this.points = points.map((p) => new Phaser.Math.Vector2(p[0] != null ? p[0] : p.x, p[1] != null ? p[1] : p.y));
      this.curve = new Phaser.Curves.Spline(this.points);
      this.n = this.points.length;
      this.samples = Array.from({ length: 301 }, (_, i) => this.curve.getPoint(i / 300));
      this.current = Phaser.Math.Clamp(o.current || 0, 0, this.n - 1);
      this.prog = this.current / (this.n - 1);
      this.color = o.color || 0xffc94a;
      const depth = o.depth != null ? o.depth : this.j.depth(0);
      const dots = this.track(sc.add.graphics().setDepth(depth));
      dots.fillStyle(o.routeColor || 0x3a3170, 1);
      this.samples.forEach((p, i) => { if (i % 6 === 0) dots.fillCircle(p.x, p.y, 3.5); });
      this.trail = this.track(sc.add.graphics().setDepth(depth + 1));
      this.nodes = this.points.map((p, i) => {
        const c = this.track(sc.add.container(p.x, p.y).setDepth(depth + 2));
        const g = sc.add.graphics();
        const lock = sc.add.graphics();
        const lab = o.labels ? o.labels[i] : (i === this.n - 1 ? 'Finish' : `${i + 1}`);
        const label = this.j.text(0, 50, lab || '', 13, '#9b93c4', { body: true });
        c.add([g, lock, label]);
        return { c, g, lock, label };
      });
      this.nodes.forEach((nd, i) => this.setState(i, i < this.current ? 'done' : i === this.current ? 'current' : 'locked'));
      const tp = this.points[this.current];
      this.shadow = this.track(sc.add.ellipse(tp.x, tp.y - 26, 34, 10, 0x000000, 0.35).setDepth(depth + 3));
      this.token = this.track(o.token
        ? sc.add.image(tp.x, tp.y - 30, o.token).setOrigin(0.5, 1).setDepth(depth + 4)
        : sc.add.image(tp.x, tp.y - 40, 'pfx-glow').setScale(0.3).setTint(0xffffff).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth + 4));
      if (o.token && o.tokenSize) this.token.setDisplaySize(o.tokenSize, o.tokenSize * (this.token.height / this.token.width));
      this.tokenOffset = o.token ? 30 : 40;
      this.drawTrail();
    }

    setState(i, state) {
      const nd = this.nodes[i];
      const r = i === this.n - 1 ? 32 : 26;
      const g = nd.g;
      g.clear().fillStyle(0x07050f, 0.6).fillCircle(0, 6, r + 4);
      nd.lock.clear();
      if (state === 'locked') {
        g.fillStyle(0x241c48, 1).fillCircle(0, 0, r).lineStyle(3, 0x3a3170, 1).strokeCircle(0, 0, r);
        nd.lock.fillStyle(0x6f689a, 1).fillRoundedRect(-10, -4, 20, 16, 4).lineStyle(4, 0x6f689a, 1).beginPath().arc(0, -4, 7, Math.PI, 0, false).strokePath();
        nd.label.setColor('#6f689a');
      } else if (state === 'current') {
        g.fillStyle(0xffffff, 1).fillCircle(0, 0, r).lineStyle(5, this.color, 1).strokeCircle(0, 0, r);
        g.fillStyle(this.color, 1).fillTriangle(-7, -10, -7, 10, 11, 0);
        nd.label.setColor('#ffc94a');
      } else {
        g.fillStyle(this.color, 1).fillCircle(0, 0, r).lineStyle(3, 0xfff1b8, 1).strokeCircle(0, 0, r);
        if (!nd.star) { nd.star = this.scene.add.image(0, 0, 'pfx-star5').setScale(0.4); nd.c.add(nd.star); }
        nd.label.setColor('#ece8ff');
      }
      this.scene.tweens.killTweensOf(nd.c);
      nd.c.setScale(1);
      if (state === 'current' && !Settings.reducedMotion) this.scene.tweens.add({ targets: nd.c, scale: 1.1, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    drawTrail() {
      const g = this.trail;
      const upto = Math.floor(this.prog * 300);
      g.clear();
      if (upto < 1) return;
      [[10, 0x000000, 0.35, 3], [7, this.color, 1, 0]].forEach(([w, c, a, dy]) => {
        g.lineStyle(w, c, a).beginPath().moveTo(this.samples[0].x, this.samples[0].y + dy);
        for (let i = 1; i <= upto; i++) g.lineTo(this.samples[i].x, this.samples[i].y + dy);
        g.strokePath();
      });
    }

    /** Complete the current node and travel to the next. Resolves on arrival. */
    async complete() {
      if (this.busy || !this.alive || this.current >= this.n - 1) return;
      this.busy = true;
      const j = this.j;
      const i = this.current;
      const nd = this.nodes[i];
      this.setState(i, 'done');
      nd.star.setScale(2).setAlpha(0);
      await j.tween({ targets: nd.star, scale: 0.4, alpha: 1, duration: 220, ease: 'Cubic.easeIn' });
      j.sfx('chime');
      j.shockwave(nd.c.x, nd.c.y, 0xffd86b, 1.2, 400, nd.c.depth + 1);
      j.burst(nd.c.x, nd.c.y, 'pfx-star', { speed: { min: 80, max: 220 }, lifespan: 600, scale: { start: 0.5, end: 0 }, color: [0xffffff, 0xffd86b], blendMode: 'ADD' }, 16, nd.c.depth + 1);
      await j.wait(200);
      const from = i / (this.n - 1);
      const to = (i + 1) / (this.n - 1);
      const o = { t: from };
      const hops = this.o.hops != null ? this.o.hops : 3;
      j.sfx('whoosh');
      await j.tween({
        targets: o, t: to, duration: this.o.travel || 900, ease: 'Sine.easeInOut',
        onUpdate: () => {
          this.prog = o.t;
          this.drawTrail();
          const p = this.curve.getPoint(o.t);
          const local = (o.t - from) / (to - from);
          const hop = hops && !Settings.reducedMotion ? Math.abs(Math.sin(local * Math.PI * hops)) * 26 : 0;
          this.token.setPosition(p.x, p.y - this.tokenOffset - hop);
          this.shadow.setPosition(p.x, p.y - 26).setScale(1 - hop / 60);
        }
      });
      if (!this.alive) return;
      j.pop(this.token, 0.18, 260);
      const next = this.nodes[i + 1];
      const ghost = this.scene.add.graphics().setDepth(next.c.depth + 2).setPosition(next.c.x, next.c.y);
      ghost.fillStyle(0x9b93c4, 1).fillRoundedRect(-10, -4, 20, 16, 4).lineStyle(4, 0x9b93c4, 1).beginPath().arc(0, -4, 7, Math.PI, 0, false).strokePath();
      this.scene.tweens.add({ targets: ghost, y: next.c.y - 70, angle: 30, alpha: 0, duration: 520, ease: 'Quad.easeOut', onComplete: () => ghost.destroy() });
      j.sfx('pop');
      this.current += 1;
      if (this.current === this.n - 1) {
        this.setState(this.current, 'done');
        j.pop(next.c, 0.25, 360);
        j.sfx('fanfare');
        if (this.o.onFinish) this.o.onFinish();
      } else {
        this.setState(this.current, 'current');
        j.pop(next.c, 0.25, 360);
      }
      if (this.o.onComplete) this.o.onComplete(i, this.current);
      this.busy = false;
    }
  }

  // ---- src/components/Streak.js
  /**
   * Streak — a streak counter whose flame grows with every hit, with a
   * multiplier banner at milestones and a kind reset.
   *   const streak = this.fx.streak(90, 300, { milestone: 3 });
   *   streak.hit();     // correct answer / successful action → returns the new streak
   *   streak.miss();    // ends the streak kindly → returns the run length
   *   streak.value, streak.best, streak.multiplier
   * Screen-space (HUD). x, y = the counter position.
   */
  class Streak extends Component {
    constructor(fx, x, y, o = {}) {
      super(fx);
      const sc = this.scene;
      this.o = o;
      this.value = 0;
      this.best = 0;
      this.multiplier = 1;
      this.milestone = o.milestone || 3;
      this.growth = o.growth || 0.16;
      this.x = x; this.y = y;
      const depth = o.depth != null ? o.depth : this.j.depth(500);
      this.flame = this.track(this.j.emitter(x, y - 50, 'pfx-ember', {
        frequency: 60, lifespan: { min: 380, max: 620 }, emitZone: { type: 'random', source: new Phaser.Geom.Ellipse(0, 0, 26, 8) },
        speedY: { min: -150, max: -80 }, speedX: { min: -14, max: 14 }, scale: { start: 0.9, end: 0.1, ease: 'Quad.easeIn' },
        alpha: { start: 0.9, end: 0.2 }, color: [0xfff2c0, 0xffc23a, 0xff6a14, 0xb3220c], blendMode: 'ADD'
      }, depth).setScrollFactor(0));
      this.glow = this.track(this.j.ui(sc.add.image(x, y - 70, 'pfx-glow').setTint(0xff8a2a).setBlendMode(Phaser.BlendModes.ADD).setScale(0.8).setAlpha(0.4).setDepth(depth - 1)));
      this.count = this.track(this.j.ui(this.j.text(x, y + 6, '0', 40, '#ffc94a').setDepth(depth + 1)));
      this.caption = this.track(this.j.ui(this.j.text(x, y + 40, o.label || 'in a row', 13, '#9b93c4', { body: true }).setDepth(depth + 1)));
      this.multi = this.track(this.j.ui(this.j.text(x, y + 66, '×1', 18, '#ece8ff').setDepth(depth + 1)));
      this.setFlame(0);
    }

    setFlame(n) {
      const k = 1 + n * this.growth;
      const sc = { start: 0.9 * k, end: 0.1, ease: 'Quad.easeIn' };
      this.flame.ops.scaleX.loadConfig({ scaleX: sc });
      this.flame.ops.scaleY.loadConfig({ scaleY: sc });
      this.flame.ops.speedY.loadConfig({ speedY: { min: -150 * Math.sqrt(k), max: -80 * Math.sqrt(k) } });
      this.flame.frequency = Math.max(14, 60 / k);
      this.scene.tweens.add({ targets: this.glow, scale: 0.8 * k, alpha: Math.min(0.9, 0.3 + n * 0.06), duration: 300 });
    }

    hit() {
      if (!this.alive) return this.value;
      const j = this.j;
      this.value += 1;
      this.best = Math.max(this.best, this.value);
      this.count.setText(String(this.value));
      const C = Phaser.Display.Color;
      const warm = C.Interpolate.ColorWithColor(C.ValueToColor(0xffc94a), C.ValueToColor(0xff5fa2), 10, Math.min(10, this.value));
      this.count.setColor(C.RGBToString(warm.r, warm.g, warm.b));
      j.pop(this.count, 0.3, 320);
      this.setFlame(this.value);
      j.sfx('tone', 523 * 2 ** (Math.min(this.value, 12) / 12), 0.16, 'triangle', 0.1);
      j.ui(j.burst(this.x, this.y - 40, 'pfx-dot', { speed: { min: 60, max: 180 }, angle: { min: -150, max: -30 }, lifespan: 500, scale: { start: 0.5, end: 0 }, color: [0xffe680, 0xff7a1a], blendMode: 'ADD' }, 10 + this.value * 2, this.count.depth));
      if (this.value % this.milestone === 0) {
        this.multiplier = 1 + this.value / this.milestone;
        this.multi.setText(`×${this.multiplier}`);
        j.pop(this.multi, 0.4, 360);
        if (this.o.banner !== false) this.banner(this.multiplier);
        if (this.o.onMilestone) this.o.onMilestone(this.value, this.multiplier);
      }
      return this.value;
    }

    async banner(mult) {
      const j = this.j;
      const sc = this.scene;
      const { w, cx, cy } = j.screen();
      const band = j.ui(sc.add.container(-w / 2, cy - 20).setDepth(j.depth(650)));
      band.add([sc.add.rectangle(0, 0, w, 96, this.o.bannerColor || 0xff5fa2, 0.92).setAngle(-4),
        j.text(0, 0, `${this.o.bannerText || 'ON FIRE!'}  ×${mult}`, 46, '#ffffff', { stroke: '#7a1040', strokeThickness: 8 }).setAngle(-4)]);
      j.ui(band);
      j.sfx('fanfare');
      await j.tween({ targets: band, x: cx, duration: 360, ease: 'Back.easeOut' });
      j.ui(j.burst(cx, cy - 20, 'pfx-star', { speed: { min: 150, max: 420 }, lifespan: 700, scale: { start: 0.7, end: 0 }, color: [0xffffff, 0xffd86b, 0xff5fa2], blendMode: 'ADD' }, 30, band.depth + 1));
      await j.wait(650);
      await j.tween({ targets: band, x: w * 1.5, duration: 300, ease: 'Cubic.easeIn' });
      band.destroy();
    }

    /** End the streak kindly. Shows an optional message and returns the run length. */
    miss(message) {
      if (!this.alive) return 0;
      const run = this.value;
      this.value = 0;
      this.multiplier = 1;
      this.count.setText('0').setColor('#ffc94a');
      this.multi.setText('×1');
      this.setFlame(0);
      this.j.sfx('soft');
      const msg = message !== undefined ? message : (run > 1 ? `Streak of ${run}. Great run!` : null);
      if (msg) this.j.floatText(this.x, this.y - 100, msg, '#ffd88a', 16, { screen: true, rise: 30, hold: 900 });
      return run;
    }
  }

  // ---- src/components/HealthBar.js
  /**
   * HealthBar — a bar that drops instantly while a pale "ghost" chunk lingers,
   * then drains, so players can read how much a hit took.
   *   const hp = this.fx.healthBar(400, 60, { width: 300, max: 100 });          // screen-space HUD
   *   const hp = this.fx.healthBar(0, -60, { follow: enemy, width: 80, height: 10 }); // floats above a sprite
   *   hp.damage(12);  hp.heal(20);  hp.set(50);  hp.value
   */
  class HealthBar extends Component {
    constructor(fx, x, y, o = {}) {
      super(fx);
      this.o = o;
      this.max = o.max || 100;
      this.value = o.value != null ? o.value : this.max;
      this.ghost = this.value;
      this.w = o.width || 300;
      this.h = o.height || 18;
      this.x = x; this.y = y;
      this.follow = o.follow || null;
      this.g = this.track(this.scene.add.graphics().setDepth(o.depth != null ? o.depth : this.j.depth(480)));
      if (!this.follow) this.j.ui(this.g);
      this.text = o.showText === false ? null : this.track(this.j.text(0, 0, '', Math.max(11, this.h * 0.75), '#ffffff', { body: true, stroke: '#1a1030', strokeThickness: 3 }).setDepth(this.g.depth + 1));
      if (this.text && !this.follow) this.j.ui(this.text);
      if (this.follow) this.onUpdate(() => this.draw());
      this.draw();
    }

    pos() {
      if (!this.follow) return { x: this.x, y: this.y };
      if (!this.follow.scene) { this.destroy(); return { x: 0, y: 0 }; }
      const c = this.j.centerOf(this.follow);
      return { x: c.x + this.x, y: c.y - c.h / 2 + this.y };
    }

    draw() {
      if (!this.alive) return;
      const { x: cx, y } = this.pos();
      const x = cx - this.w / 2;
      const g = this.g;
      const r = this.h / 2;
      g.clear();
      g.fillStyle(0x0b0818, 1).fillRoundedRect(x - 3, y - 3, this.w + 6, this.h + 6, r + 3);
      g.fillStyle(0x2a2250, 1).fillRoundedRect(x, y, this.w, this.h, r);
      if (this.ghost > 0) g.fillStyle(this.o.ghostColor || 0xffe0e6, 0.9).fillRoundedRect(x, y, Math.max(this.h, (this.w * this.ghost) / this.max), this.h, r);
      if (this.value > 0) g.fillStyle(this.o.color || 0xff5f6d, 1).fillRoundedRect(x, y, Math.max(this.h, (this.w * this.value) / this.max), this.h, r);
      if (this.text) this.text.setPosition(cx, y + this.h / 2).setText(`${Math.ceil(this.value)} / ${this.max}`);
    }

    set(v) {
      const prev = this.value;
      this.value = Phaser.Math.Clamp(v, 0, this.max);
      if (this.value >= prev) { this.ghost = this.value; this.draw(); return this; }
      this.draw();
      if (this.ghostTimer) this.ghostTimer.remove();
      if (this.ghostTween) this.ghostTween.stop();
      this.ghostTimer = this.scene.time.delayedCall(this.o.ghostDelay != null ? this.o.ghostDelay : 450, () => {
        this.ghostTween = this.scene.tweens.add({ targets: this, ghost: this.value, duration: 380, ease: 'Cubic.easeOut', onUpdate: () => this.draw() });
      });
      if (this.value <= 0 && this.o.onEmpty) this.o.onEmpty();
      return this;
    }

    damage(n) { return this.set(this.value - n); }
    heal(n) { this.j.sfx('sparkle'); return this.set(this.value + n); }
  }

  // ---- src/components/QuizTimer.js
  /**
   * QuizTimer — a countdown ring that ramps urgency only at the end.
   *   const timer = this.fx.timer(860, 90, { seconds: 20, urgentAt: 5, onTimeUp: () => this.reveal() });
   *   timer.addTime(5);  timer.pause();  timer.resume();  timer.stop();  timer.left
   * Screen-space (HUD). Signals time with ring, colour, number AND sound,
   * so it never relies on colour alone.
   */
  class QuizTimer extends Component {
    constructor(fx, x, y, o = {}) {
      super(fx);
      const sc = this.scene;
      this.o = o;
      this.total = o.seconds || 10;
      this.left = this.total;
      this.shown = Math.ceil(this.left);
      this.urgent = o.urgentAt != null ? o.urgentAt : 5;
      this.R = o.radius || 46;
      this.x = x; this.y = y;
      this.running = o.autoStart !== false;
      const depth = o.depth != null ? o.depth : this.j.depth(500);
      this.track(this.j.ui(sc.add.circle(x, y, this.R + this.R * 0.18, 0x19142e, 0.95).setDepth(depth)));
      this.glow = this.track(this.j.ui(sc.add.image(x, y, 'pfx-glow').setScale(this.R / 40).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.25).setDepth(depth)));
      this.ring = this.track(this.j.ui(sc.add.graphics().setDepth(depth + 1)));
      this.num = this.track(this.j.ui(this.j.text(x, y, String(this.shown), Math.round(this.R * 0.62), '#ece8ff').setDepth(depth + 2)));
      this.onUpdate((t, dt) => {
        if (this.running) {
          this.left = Math.max(0, this.left - dt / 1000);
          const sec = Math.ceil(this.left);
          if (sec !== this.shown) { this.shown = sec; this.tick(sec); }
          if (this.left <= 0) this.timeUp();
        }
        if (!this.anim) this.draw(this.left / this.total);
      });
      this.draw(1);
    }

    colorFor(f) {
      const C = Phaser.Display.Color;
      const [a, b, c] = (this.o.colors || [0x2fd48a, 0xffc94a, 0xff6b6b]).map((v) => C.ValueToColor(v));
      const m = f > 0.5 ? C.Interpolate.ColorWithColor(b, a, 100, (f - 0.5) * 200) : C.Interpolate.ColorWithColor(c, b, 100, f * 200);
      return C.GetColor(m.r, m.g, m.b);
    }

    draw(frac) {
      const g = this.ring;
      const col = this.colorFor(frac);
      const lw = Math.max(6, this.R * 0.16);
      g.clear().lineStyle(lw, 0x2c2550, 1).beginPath().arc(this.x, this.y, this.R, 0, Math.PI * 2).strokePath();
      if (frac > 0) {
        g.lineStyle(lw, col, 1).beginPath().arc(this.x, this.y, this.R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac, false).strokePath();
        const a = -Math.PI / 2 + Math.PI * 2 * frac;
        g.fillStyle(0xffffff, 1).fillCircle(this.x + Math.cos(a) * this.R, this.y + Math.sin(a) * this.R, lw * 0.32);
      }
      this.glow.setTint(col);
    }

    tick(sec) {
      this.num.setText(String(sec));
      if (this.o.onTick) this.o.onTick(sec);
      if (sec > this.urgent || sec <= 0) return;
      this.j.sfx('tick', this.urgent - sec);
      if (Settings.reducedMotion) return;
      this.scene.tweens.add({ targets: this.num, scale: { from: 1.35, to: 1 }, duration: 260, ease: 'Back.easeOut' });
      this.j.ui(this.j.shockwave(this.x, this.y, this.colorFor(this.left / this.total), this.R / 70, 500, this.ring.depth - 1));
    }

    timeUp() {
      this.running = false;
      this.num.setText('0');
      this.j.sfx('tone', 392, 0.3, 'triangle', 0.08);
      this.j.sfx('tone', 330, 0.4, 'triangle', 0.07, 0.18);
      if (!Settings.reducedMotion) this.scene.tweens.add({ targets: this.num, angle: { from: -8, to: 8 }, duration: 90, yoyo: true, repeat: 2, onComplete: () => this.num.setAngle(0) });
      if (this.o.onTimeUp) this.o.onTimeUp();
    }

    start() { this.running = true; return this; }
    pause() { this.running = false; return this; }
    resume() { if (this.left > 0) this.running = true; return this; }
    stop() { this.running = false; return this; }

    /** Restart from full (optionally with a new length). */
    reset(seconds) {
      if (seconds) this.total = seconds;
      this.left = this.total;
      this.shown = Math.ceil(this.left);
      this.num.setText(String(this.shown));
      this.running = true;
      return this;
    }

    /** Bonus time with a visible refill. */
    async addTime(s = 5) {
      const from = this.left / this.total;
      this.left = Math.min(this.total, this.left + s);
      this.shown = Math.ceil(this.left);
      this.num.setText(String(this.shown));
      this.j.floatText(this.x + this.R, this.y - this.R, `+${s}s`, '#4fe0c8', 24, { screen: true });
      this.j.sfx('sparkle');
      this.anim = true;
      const o = { f: from };
      await this.j.tween({ targets: o, f: this.left / this.total, duration: 420, ease: 'Back.easeOut', onUpdate: () => this.alive && this.draw(Math.min(1, o.f)) });
      this.anim = false;
    }
  }

  // ---- src/effects/Feedback.js
  /**
   * Feedback — answer feedback that works on YOUR answer buttons/tiles
   * (any Image, Sprite, Text, Container, Rectangle…).
   *
   *   await this.fx.correct(tile, { points: 10, scoreText: this.scoreText });
   *   await this.fx.wrong(tile, { message: 'Nice try! A noun is a thing you can point at.' });
   *   const h = this.fx.hint(rightTile);  …  h.stop();
   *   await this.fx.checkmark(x, y);
   *
   * Kind by design: wrong answers never flash red, buzz or shake the screen.
   */
  class Feedback {
    static _overlay(fx, target, color, alpha, ms = 200) {
      const j = fx.juice;
      const b = j.centerOf(target);
      const r = Math.min(18, b.h / 2);
      const g = fx.scene.add.graphics().setAlpha(0);
      // Container (e.g. a button = background + label): slip the overlay between
      // the background and the label, so the label stays readable.
      if (target.type === 'Container' && target.list && target.list.length > 1 && target.width > 0) {
        const w = target.width;
        const h = target.height;
        g.fillStyle(color, 1).fillRoundedRect(-w / 2, -h / 2, w, h, r);
        g.lineStyle(3, color, 1).strokeRoundedRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 6, r + 3);
        target.addAt(g, 1);
      } else {
        g.setDepth(j.above(target));
        g.fillStyle(color, 1).fillRoundedRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, r);
        g.lineStyle(3, color, 1).strokeRoundedRect(b.x - b.w / 2 - 3, b.y - b.h / 2 - 3, b.w + 6, b.h + 6, r + 3);
        if (j.isScreen(target)) g.setScrollFactor(0);
      }
      fx.scene.tweens.add({ targets: g, alpha, duration: ms });
      return g;
    }

    /** Draw a check mark stroke by stroke at (x, y). */
    static checkmark(fx, x, y, o = {}) {
      const s = (o.size || 34) / 30;
      const g = fx.scene.add.graphics().setDepth(o.depth != null ? o.depth : fx.juice.depth(60));
      if (o.screen) g.setScrollFactor(0);
      const pts = [[-15, 1], [-4, 12], [17, -13]].map(([px, py]) => [x + px * s, y + py * s]);
      const lens = [Phaser.Math.Distance.Between(...pts[0], ...pts[1]), Phaser.Math.Distance.Between(...pts[1], ...pts[2])];
      const total = lens[0] + lens[1];
      const t = { v: 0 };
      return fx.juice.tween({
        targets: t, v: 1, duration: o.duration || 320, ease: 'Sine.easeInOut',
        onUpdate: () => {
          let d = t.v * total;
          g.clear().lineStyle(7 * s, o.color || 0xffffff, 1).beginPath().moveTo(pts[0][0], pts[0][1]);
          for (let k = 0; k < 2 && d > 0; k++) {
            const f = Math.min(1, d / lens[k]);
            g.lineTo(pts[k][0] + (pts[k + 1][0] - pts[k][0]) * f, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * f);
            d -= lens[k];
          }
          g.strokePath();
        }
      }).then(() => g);
    }

    /**
     * Right answer: pop, green fill, check mark, stars, then "+points" flies to
     * your score (scoreTarget or scoreText) and scoreText rolls up.
     * Options: points, scoreText (Text), score (current score number → we count up from it),
     * scoreTarget (object to fly to; defaults to scoreText), others (array of tiles to dim),
     * color, keep (leave the green overlay, default true), sound.
     */
    static async correct(fx, target, o = {}) {
      const j = fx.juice;
      const sc = fx.scene;
      const b = j.centerOf(target);
      const color = o.color || 0x2fbf8a;
      j.pop(target, 0.12, 300);
      const overlay = Feedback._overlay(fx, target, color, 0.85, 180);
      if (o.sound !== false) j.sfx('correct');
      const screen = j.isScreen(target);
      const check = Feedback.checkmark(fx, b.x + b.w / 2 - Math.min(40, b.w * 0.2), b.y, { size: Math.min(34, b.h * 0.5), screen, depth: j.above(target, 2) });
      const ring = j.shockwave(b.x, b.y, 0x9dffcf, Math.max(1.2, b.w / 140), 450, j.above(target, 2));
      const stars = j.burst(b.x, b.y, 'pfx-star', {
        speed: { min: 120, max: 340 }, lifespan: { min: 450, max: 800 }, scale: { start: 0.6, end: 0 }, rotate: { min: 0, max: 360 },
        color: [0xffffff, 0xb8ffd8, 0xffd86b], blendMode: 'ADD', gravityY: 200
      }, o.stars != null ? o.stars : 24, j.above(target, 3));
      if (screen) { ring.setScrollFactor(0); stars.setScrollFactor(0); }
      if (o.others) o.others.forEach((t) => { if (t !== target) sc.tweens.add({ targets: t, alpha: 0.4, duration: 260 }); });
      const mark = await check;
      if (o.points && (o.scoreText || o.scoreTarget)) {
        const to = o.scoreTarget || o.scoreText;
        const plus = j.text(b.x, b.y - 10, `+${o.points}`, 30, '#ffc94a', { stroke: '#1a1030' }).setDepth(j.depth(300)).setScale(0.3);
        if (screen) plus.setScrollFactor(0);
        await j.tween({ targets: plus, scale: 1.1, y: b.y - 60, duration: 220, ease: 'Back.easeOut' });
        await j.flyTo(plus, null, to, { duration: 480, scaleTo: 0.5, arc: 120 });
        plus.destroy();
        if (!sc.sys.isActive()) return;
        j.pop(to, 0.18, 260);
        j.sfx('coin');
        if (o.scoreText) {
          const from = o.score != null ? o.score : parseFloat(o.scoreText.text) || 0;
          await j.countUp(o.scoreText, from, from + o.points, 450);
        }
      }
      if (o.keep === false) { overlay.destroy(); mark.destroy(); }
      else { target.once && target.once('destroy', () => { overlay.destroy(); mark.destroy(); }); }
      return { overlay, mark };
    }

    /**
     * Wrong answer, kindly: a small head-shake wiggle, a soft amber tint that
     * stays (so they remember what they tried) and an optional message bubble.
     * Options: message, wiggle (px), color, keep (default true), bubbleY (offset below target).
     */
    static async wrong(fx, target, o = {}) {
      const j = fx.juice;
      const b = j.centerOf(target);
      const overlay = Feedback._overlay(fx, target, o.color || 0xffb44a, 0.35, 260);
      if (o.sound !== false) j.sfx('soft');
      const wig = j.wiggle(target, o.wiggle != null ? o.wiggle : 6, 3);
      let bubble = null;
      if (o.message) bubble = Feedback.say(fx, b.x, b.y + b.h / 2 + (o.bubbleY || 40), o.message, { screen: j.isScreen(target), hold: o.hold });
      await wig;
      if (o.keep === false) overlay.destroy();
      else if (target.once) target.once('destroy', () => overlay.destroy());
      return { overlay, bubble };
    }

    /** A friendly speech bubble that pops in at (x, y) and fades after `hold` ms (0 = stay). */
    static say(fx, x, y, text, o = {}) {
      const j = fx.juice;
      const sc = fx.scene;
      const c = sc.add.container(x, y + 14).setDepth(j.depth(320)).setAlpha(0).setScale(0.9);
      const t = j.text(0, 0, text, o.size || 17, '#1a1030', { body: true, wrap: o.width || 520 });
      const w = t.width + 40;
      const h = t.height + 24;
      const g = sc.add.graphics().fillStyle(0xfff6e0, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 16).fillTriangle(-10, -h / 2, 10, -h / 2, 0, -h / 2 - 12);
      c.add([g, t]);
      if (o.screen) j.ui(c);
      sc.tweens.add({ targets: c, alpha: 1, y, scale: 1, duration: 260, ease: 'Back.easeOut' });
      const hold = o.hold != null ? o.hold : 2600;
      if (hold > 0) sc.tweens.add({ targets: c, alpha: 0, delay: hold, duration: 300, onComplete: () => c.destroy() });
      return c;
    }

    /** Gentle "look here" pulse around an object (scaffolding). Returns { stop() }. */
    static hint(fx, target, o = {}) {
      const j = fx.juice;
      const b = j.centerOf(target);
      const g = fx.scene.add.graphics().setDepth(j.above(target));
      if (j.isScreen(target)) g.setScrollFactor(0);
      const r = Math.min(20, b.h / 2 + 6);
      g.lineStyle(4, o.color || 0x4fe0c8, 1).strokeRoundedRect(b.x - b.w / 2 - 6, b.y - b.h / 2 - 6, b.w + 12, b.h + 12, r);
      fx.scene.tweens.add({ targets: g, alpha: { from: 0.25, to: 1 }, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      let base = null;
      if (!Settings.reducedMotion && o.scale !== false) {
        base = { x: target.scaleX, y: target.scaleY };
        fx.scene.tweens.add({ targets: target, scaleX: base.x * 1.03, scaleY: base.y * 1.03, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
      return {
        stop: () => {
          fx.scene.tweens.killTweensOf(g); g.destroy();
          if (base) { fx.scene.tweens.killTweensOf(target); target.setScale(base.x, base.y); }
        }
      };
    }
  }

  // ---- src/components/Card.js
  /**
   * Card — a two-sided card with a soft shadow that flips with lift and tilt.
   *   const card = this.fx.card(400, 300, 'my-card-front');            // back defaults to a built-in back
   *   const card = this.fx.card(400, 300, 'front', 'back', { faceUp: false, width: 180 });
   *   await card.flip();          card.faceUp
   * Works with any texture size. It is a normal Container: move, scale, add to
   * other containers, make it interactive, etc.
   */
  class Card extends Phaser.GameObjects.Container {
    constructor(fx, x, y, frontKey, backKey = 'pfx-card-back', o = {}) {
      super(fx.scene, x, y);
      this.fx = fx;
      this.frontKey = frontKey;
      this.backKey = backKey || 'pfx-card-back';
      this.faceUp = !!o.faceUp;
      this.shadow = fx.scene.add.image(10, 16, 'pfx-card-shadow').setAlpha(o.shadow === false ? 0 : 0.8);
      this.face = fx.scene.add.image(0, 0, this.faceUp ? frontKey : this.backKey);
      this.add([this.shadow, this.face]);
      this.fitTo(o.width, o.height);
      this.setDepth(o.depth != null ? o.depth : fx.juice.depth(50));
      fx.scene.add.existing(this);
      if (o.screen) this.setScrollFactor(0, 0, true);
    }

    /** Make both faces the same display size (front decides unless width/height are given). */
    fitTo(width, height) {
      const fr = this.scene.textures.getFrame(this.frontKey);
      const w = width || (fr ? fr.width : 220);
      const h = height || (fr ? (fr.height * w) / fr.width : 310);
      this.cardW = w;
      this.cardH = h;
      this.face.setDisplaySize(w, h);
      this.shadow.setDisplaySize(w * (280 / 220), h * (370 / 310));
      this.setSize(w, h);
      return this;
    }

    setFaceUp(up) {
      this.faceUp = up;
      this.face.setTexture(up ? this.frontKey : this.backKey);
      this.face.setDisplaySize(this.cardW, this.cardH);
      return this;
    }

    /** Flip (options: duration, juicy, lift, sound). Resolves when it lands. */
    flip(o = {}) {
      return CardFX.flip(this.fx, this, { ...o, swap: () => this.setFaceUp(!this.faceUp) });
    }

    /** Is a world (or screen, for screen cards) point over the card? */
    contains(x, y) {
      return Math.abs(x - this.x) < (this.cardW * Math.abs(this.scaleX || 1)) / 2 && Math.abs(y - this.y) < (this.cardH * this.scaleY) / 2;
    }
  }

  // ---- src/effects/CardFX.js
  /**
   * CardFX — flips, rarity reveals, legendary reveals and pack openings.
   *
   *   await this.fx.flip(sprite, { to: 'card-front' });     // flip ANY image to a new texture
   *   await this.fx.flip(container, { swap: () => showAnswer() });
   *   this.fx.reveal(card, 'epic');                          // rarity effect budget
   *   const card = await this.fx.legendaryReveal({ front: 'dragon-card' });
   *   const cards = await this.fx.openPack([{ front: 'c1', rarity: 'common' }, …]);
   */
  class CardFX {
    static RARITY = {
      common: { label: 'Common', color: 0x9aa6c8, rank: 0 },
      rare: { label: 'Rare', color: 0x4fa3ff, rank: 1 },
      epic: { label: 'Epic', color: 0xb06bff, rank: 2 },
      legendary: { label: 'Legendary', color: 0xffc94a, rank: 3 }
    };

    /**
     * Fake-3D flip of any game object. The swap happens edge-on (invisible).
     * Options: to (texture key), swap (function), duration, juicy (lift + tilt + shadow), lift, sound.
     */
    static async flip(fx, target, o = {}) {
      if (target._pfxFlipping) return;
      target._pfxFlipping = true;
      const j = fx.juice;
      const sc = fx.scene;
      const half = (o.duration || 460) / 2;
      const juicy = o.juicy !== false;
      let endSX = Math.abs(target.scaleX) || 1;
      const y0 = target.y;
      const dw = target.displayWidth;
      const dh = target.displayHeight;
      if (juicy && !Settings.reducedMotion) {
        sc.tweens.add({ targets: target, y: y0 - (o.lift != null ? o.lift : 28), angle: Phaser.Math.Between(-5, 5), duration: half, ease: 'Sine.easeOut', yoyo: true, hold: 30 });
        if (target.shadow) sc.tweens.add({ targets: target.shadow, x: 22, y: 34, alpha: 0.35, duration: half, ease: 'Sine.easeOut', yoyo: true, hold: 30 });
      }
      await j.tween({ targets: target, scaleX: 0, duration: half, ease: juicy ? 'Cubic.easeIn' : 'Linear' });
      if (o.swap) o.swap();
      else if (o.to && target.setTexture) {
        target.setTexture(o.to);
        if (o.keepSize !== false && dw && dh) {
          // keep the same on-screen size even if the new texture is a different size
          endSX = dw / target.width;
          target.scaleY = dh / target.height;
        }
      }
      if (o.sound !== false) j.sfx('flip');
      await j.tween({ targets: target, scaleX: endSX, duration: half, ease: juicy ? 'Back.easeOut' : 'Linear' });
      if (juicy) await j.wait(40);
      target.angle = 0;
      target.y = y0;
      target._pfxFlipping = false;
    }

    /**
     * Rarity reveal around a card (or anything). Budget grows with rarity:
     * common = pop + puff · rare = + sparkles · epic = + rays, glow, burst · legendary = + hit-stop, flash, shake, banner.
     * rarity: 'common' | 'rare' | 'epic' | 'legendary' or { color, rank }.
     * Returns { destroy() } to remove lingering rays/glow.
     */
    static reveal(fx, target, rarity = 'rare', o = {}) {
      const j = fx.juice;
      const R = typeof rarity === 'string' ? (CardFX.RARITY[rarity] || CardFX.RARITY.common) : rarity;
      const c = j.centerOf(target);
      const screen = j.isScreen(target);
      const depth = j.above(target);
      const keep = [];
      const pin = (obj) => { if (screen && obj) obj.setScrollFactor(0, 0, true); return obj; };
      j.pop(target, 0.12, 320);
      pin(j.burst(c.x, c.y, 'pfx-smoke', { speed: { min: 40, max: 120 }, scale: { start: 0.5, end: 1.4 }, alpha: { start: 0.35, end: 0 }, lifespan: 600, tint: 0xd8dcf0, rotate: { min: 0, max: 360 } }, 10, depth - 2));
      if (R.rank === 0) { j.sfx('pop'); return { destroy: () => {} }; }
      j.sfx('sparkle');
      pin(j.shockwave(c.x, c.y, R.color, 2.2, 520, depth));
      pin(j.burst(c.x, c.y, 'pfx-star', { speed: { min: 80, max: 260 }, scale: { start: 0.7, end: 0 }, lifespan: { min: 500, max: 900 }, rotate: { min: -180, max: 180 }, color: [0xffffff, R.color], blendMode: 'ADD', gravityY: 60 }, 18 + R.rank * 12, depth));
      if (R.rank >= 2) {
        const rays = pin(j.rays(c.x, c.y, R.color, 14, depth - 3));
        fx.scene.tweens.add({ targets: rays, scale: (R.rank === 3 ? 1.15 : 0.8) * Math.max(0.5, c.h / 310), duration: 500, ease: 'Back.easeOut' });
        keep.push(rays);
        const face = target.face || target;
        if (face.preFX || face.setTint) { const glow = j.glow(face, R.color, 2); glow.pulse(2, 6, 800); keep.push(glow); }
        pin(j.burst(c.x, c.y, 'pfx-dot', { speed: { min: 200, max: 520 }, scale: { start: 0.9, end: 0 }, lifespan: { min: 600, max: 1100 }, color: [0xffffff, R.color, 0xff5fa2], blendMode: 'ADD', gravityY: 260 }, 60, depth));
        j.shake(140, 0.004);
      }
      if (R.rank === 2) j.sfx('chime');
      if (R.rank >= 3) {
        j.flash(220, 0xffe7a0, 0.7);
        j.shake(260, 0.008);
        pin(j.shockwave(c.x, c.y, 0xffffff, 3.4, 700, depth));
        j.sfx('fanfare');
        const t = j.floatText(c.x, c.y - c.h * 0.62, o.label || (R.label ? `${R.label.toUpperCase()}!` : 'WOW!'), '#ffc94a', 30);
        if (screen) t.setScrollFactor(0);
      }
      return { destroy: () => keep.forEach((k) => k && k.destroy && k.destroy()) };
    }

    /**
     * The full gacha reveal: drop → anticipation pulses → tension → hit-stop
     * release → flip → shine → stamp → confetti. Screen-space, centred by default.
     * Options: front (texture, required), back, x, y, width, color, title ('LEGENDARY!'),
     * pulses (3), hitStop (90), confetti (80), dim (0.5 backdrop alpha).
     * Resolves with { card, destroy() }.
     */
    static async legendaryReveal(fx, o = {}) {
      const j = fx.juice;
      const sc = fx.scene;
      const cam = sc.cameras.main;
      const { cx, cy, w, h } = j.screen();
      const x = o.x != null ? o.x : cx;
      const y = o.y != null ? o.y : cy - 20;
      const gold = o.color || 0xffc94a;
      const base = j.depth(800);
      const objs = [];
      const keep = (obj) => { objs.push(obj); return obj; };
      const dim = keep(j.ui(sc.add.rectangle(cx, cy, w * 3, h * 3, 0x05030c, 0).setDepth(base - 10)));
      sc.tweens.add({ targets: dim, fillAlpha: o.dim != null ? o.dim : 0.5, duration: 300 });

      const card = keep(new Card(fx, x, -300, o.front, o.back, { width: o.width || 220, depth: base, screen: true }));
      j.sfx('whoosh');
      await j.tween({ targets: card, y, duration: 650, ease: 'Bounce.easeOut' });
      if (!sc.sys.isActive()) return null;
      j.shake(90, 0.003);
      j.ui(j.burst(x, y + card.cardH / 2, 'pfx-smoke', { speedX: { min: -180, max: 180 }, speedY: { min: -40, max: 0 }, lifespan: 700, scale: { start: 0.4, end: 1.3 }, alpha: { start: 0.35, end: 0 }, tint: 0xb0a6d8 }, 10, base - 1));
      await j.wait(250);

      const glow = keep(j.glow(card.face, gold, 0));
      const pull = keep(j.emitter(x, y, 'pfx-dot', {
        emitZone: { type: 'edge', source: new Phaser.Geom.Circle(0, 0, 300), quantity: 40 }, moveToX: 0, moveToY: 0, lifespan: 650,
        frequency: 60, scale: { start: 0.2, end: 0.7 }, alpha: { start: 0, end: 1 }, color: [0xfff1b8, gold], blendMode: 'ADD'
      }, base - 2).setScrollFactor(0));
      const pulses = o.pulses != null ? o.pulses : 3;
      const zoom0 = cam.zoom;
      for (let i = 0; i < pulses; i++) {
        j.sfx('charge', i * 2);
        glow.set(2 + i * 2, 160);
        sc.tweens.add({ targets: card, scale: 1.06, duration: 120, yoyo: true, ease: 'Quad.easeOut' });
        if (!Settings.reducedMotion) sc.tweens.add({ targets: cam, zoom: zoom0 * (1 + (i + 1) * 0.018), duration: 200, ease: 'Quad.easeOut' });
        pull.frequency = Math.max(14, 60 - i * 14);
        await j.wait(Math.max(220, 460 - i * 70));
        if (!sc.sys.isActive()) return null;
      }
      const rays = keep(j.ui(j.rays(x, y, gold, 16, base - 3)));
      sc.tweens.add({ targets: rays, scale: 0.55, duration: 500, ease: 'Sine.easeOut' });
      pull.frequency = 8;
      glow.set(8, 400);
      j.sfx('charge', 10);
      if (!Settings.reducedMotion) await j.tween({ targets: card, x: { from: x - 4, to: x + 4 }, duration: 32, yoyo: true, repeat: 7 });
      else await j.wait(500);
      card.x = x;
      pull.stop();
      j.sfx('boom');
      await j.hitStop(o.hitStop != null ? o.hitStop : 90);
      if (!sc.sys.isActive()) return null;
      j.flash(240, 0xffe7a0, 0.8);
      j.shake(300, 0.01);
      sc.tweens.add({ targets: cam, zoom: zoom0, duration: 320, ease: 'Back.easeOut' });
      j.ui(j.shockwave(x, y, 0xffffff, 3.6, 650, base + 5));
      sc.time.delayedCall(90, () => j.ui(j.shockwave(x, y, gold, 4.6, 800, base + 5)));
      j.ui(j.burst(x, y, 'pfx-star', { speed: { min: 200, max: 640 }, lifespan: { min: 700, max: 1300 }, scale: { start: 0.9, end: 0 }, rotate: { min: 0, max: 360 }, color: [0xffffff, 0xffe680, gold, 0xff8a3d], blendMode: 'ADD', gravityY: 180 }, 70, base + 6));
      sc.tweens.add({ targets: rays, scale: 1.25, duration: 600, ease: 'Back.easeOut' });
      await card.flip({ duration: 520, lift: 40 });
      if (!sc.sys.isActive()) return null;
      j.sfx('sparkle');
      await j.shine(x, y, card.cardW, card.cardH, 600, base + 7, 18, true);
      const stamp = keep(j.ui(j.text(x, y + card.cardH / 2, o.title || 'LEGENDARY!', 44, '#ffc94a', { stroke: '#2a1640', strokeThickness: 10 })
        .setDepth(base + 8).setScale(3).setAlpha(0).setAngle(-8)));
      await j.tween({ targets: stamp, scale: 1, alpha: 1, angle: -4, duration: 220, ease: 'Cubic.easeIn' });
      j.sfx('boom');
      j.shake(120, 0.005);
      j.pop(stamp, 0.12, 300);
      j.sfx('fanfare');
      glow.pulse(4, 9, 900);
      if ((o.confetti != null ? o.confetti : 80) > 0) Particles.confetti(fx, { count: o.confetti || 80, sound: false });
      keep(j.emitter(x, y, 'pfx-star', {
        emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-card.cardW * 0.6, -card.cardH * 0.55, card.cardW * 1.2, card.cardH * 1.1) },
        frequency: 140, lifespan: 900, scale: { start: 0.01, end: 0.5, ease: 'Sine.easeOut' }, alpha: { start: 1, end: 0 }, rotate: { min: 0, max: 90 }, blendMode: 'ADD'
      }, base + 9).setScrollFactor(0));
      await j.wait(800);
      return {
        card,
        destroy: () => { objs.forEach((ob) => { if (ob && ob.destroy) { sc.tweens.killTweensOf(ob); ob.destroy(); } }); cam.setZoom(zoom0); }
      };
    }

    /**
     * Booster pack: rattle, tear, deal, then the player taps each card to flip
     * it with its rarity effect (rarest is dealt last). Screen-space modal.
     * cards: [{ front: 'texKey', rarity: 'common'|'rare'|'epic'|'legendary', back? }]
     * Options: pack (texture, default built-in), x, y, width (card width, 150), autoFlip (ms between auto flips, 0 = player taps),
     * dim (backdrop alpha). Resolves with { cards, destroy() } after every card is revealed.
     */
    static async openPack(fx, cards, o = {}) {
      const j = fx.juice;
      const sc = fx.scene;
      const { cx, cy, w, h } = j.screen();
      const px = o.x != null ? o.x : cx;
      const py = o.y != null ? o.y : cy;
      const base = j.depth(800);
      const objs = [];
      const keep = (ob) => { objs.push(ob); return ob; };
      const dim = keep(j.ui(sc.add.rectangle(cx, cy, w * 3, h * 3, 0x05030c, 0).setDepth(base - 10)));
      sc.tweens.add({ targets: dim, fillAlpha: o.dim != null ? o.dim : 0.55, duration: 300 });
      const packKey = o.pack || 'pfx-pack';
      const pack = keep(j.ui(sc.add.image(px, py, packKey).setDepth(base + 20)));
      const ps = (o.packHeight || Math.min(340, h * 0.6)) / pack.height;
      pack.setScale(ps);
      const glow = keep(j.ui(sc.add.image(px, py, 'pfx-glow').setTint(0xff5fa2).setBlendMode(Phaser.BlendModes.ADD).setScale(3.4 * ps).setAlpha(0.45).setDepth(base + 18)));
      if (!o.auto) {
        const bob = sc.tweens.add({ targets: pack, y: py - 10, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        await new Promise((resolve) => {
          pack.setInteractive({ useHandCursor: true });
          pack.once('pointerdown', resolve);
        });
        bob.stop();
        pack.y = py;
      }
      for (let i = 0; i < (o.rattles != null ? o.rattles : 3); i++) {
        j.sfx('charge', i * 3);
        sc.tweens.add({ targets: glow, alpha: 0.5 + i * 0.15, scale: (3.4 + i * 0.3) * ps, duration: 150 });
        await j.tween({ targets: pack, angle: { from: -(4 + i * 3), to: 4 + i * 3 }, duration: 60, yoyo: true, repeat: 1 });
        pack.angle = 0;
        await j.wait(Math.max(80, 240 - i * 60));
      }
      if (!sc.sys.isActive()) return null;
      const tear = Math.round(pack.height * 0.22);
      const top = keep(j.ui(sc.add.image(px, py, packKey).setScale(ps).setCrop(0, 0, pack.width, tear).setDepth(base + 21)));
      pack.setCrop(0, tear, pack.width, pack.height - tear);
      j.sfx('crack'); j.sfx('whoosh');
      sc.tweens.add({ targets: top, x: px - 180, y: py - 260, angle: -70, alpha: 0, duration: 650, ease: 'Quad.easeOut' });
      const tearY = py - (pack.height * ps) / 2 + tear * ps;
      j.flash(160, 0xffffff, 0.35);
      const rays = keep(j.ui(j.rays(px, tearY, 0xfff1b8, 10, base + 19)));
      sc.tweens.add({ targets: rays, scale: 0.6, duration: 260, ease: 'Back.easeOut' });
      sc.tweens.add({ targets: rays, alpha: 0, delay: 500, duration: 400 });
      j.ui(j.burst(px, tearY, 'pfx-star', {
        emitZone: { type: 'random', source: new Phaser.Geom.Line(-110 * ps, 0, 110 * ps, 0) }, speedY: { min: -360, max: -120 }, speedX: { min: -80, max: 80 },
        gravityY: 300, lifespan: 900, scale: { start: 0.6, end: 0 }, rotate: { min: 0, max: 360 }, color: [0xffffff, 0xffd86b, 0xff5fa2], blendMode: 'ADD'
      }, 36, base + 22));
      await j.wait(200);

      const cw = o.width || Math.min(150, (w - 80) / cards.length - 16);
      const gap = cw + 16;
      const rank = (c) => (CardFX.RARITY[c.rarity] || CardFX.RARITY.common).rank;
      const order = cards.slice().sort((a, b) => rank(a) - rank(b));
      const made = order.map((info, i) => {
        const c = keep(new Card(fx, px, tearY, info.front, info.back, { width: cw, depth: base + i, screen: true }));
        c.setScale(0.3).setAngle(Phaser.Math.Between(-20, 20));
        c.info = info;
        return c;
      });
      const rowY = py + 10;
      made.forEach((c, i) => sc.tweens.add({ targets: c, x: px + (i - (made.length - 1) / 2) * gap, y: rowY, scale: 1, angle: 0, delay: i * (o.deal || 120), duration: 520, ease: 'Back.easeOut', onStart: () => j.sfx('flip') }));
      sc.tweens.add({ targets: [pack, glow], y: '+=420', alpha: 0, delay: 250, duration: 700, ease: 'Quad.easeIn' });
      await j.wait((o.deal || 120) * made.length + 560);
      if (!sc.sys.isActive()) return null;
      made.forEach((c) => {
        const R = CardFX.RARITY[c.info.rarity] || CardFX.RARITY.common;
        if (R.rank > 0 && o.tells !== false) { c.tell = j.glow(c.face, R.color, 1); c.tell.pulse(1, 2 + R.rank * 1.5, 900 - R.rank * 150); }
      });

      const flipOne = async (c) => {
        if (c.revealed) return;
        c.revealed = true;
        if (c.tell) { c.tell.destroy(); c.tell = null; }
        await c.flip({ duration: 440 });
        if (sc.sys.isActive()) keep(CardFX.reveal(fx, c, c.info.rarity));
      };
      if (o.autoFlip) {
        for (const c of made) { await flipOne(c); await j.wait(o.autoFlip); }
      } else {
        await Promise.all(made.map((c) => new Promise((resolve) => {
          c.setInteractive(new Phaser.Geom.Rectangle(-c.cardW / 2, -c.cardH / 2, c.cardW, c.cardH), Phaser.Geom.Rectangle.Contains);
          c.input.cursor = 'pointer';
          c.once('pointerdown', () => flipOne(c).then(resolve));
        })));
      }
      await j.wait(700);
      return { cards: made, destroy: () => objs.forEach((ob) => { if (ob && ob.destroy) { if (ob.scene) sc.tweens.killTweensOf(ob); ob.destroy(); } }) };
    }
  }

  // ---- src/components/LockedItem.js
  /**
   * LockedItem — shows any image as locked (grayscale + chains + padlock) and
   * plays a dramatic unlock: rattle → crack → chains fall → colour floods in.
   *   const locked = this.fx.lock(levelIcon);           // instantly looks locked
   *   …later…
   *   await locked.unlock({ label: 'UNLOCKED!' });
   * Options (lock): chains (true), padlock (true), lockScale (1).
   * Options (unlock): rattles (3), drama (1), color (glow/rays), label, rays (true).
   * Works best on top-level images/sprites (not inside a moving container).
   */
  class LockedItem extends Component {
    constructor(fx, target, o = {}) {
      super(fx);
      this.target = target;
      this.locked = true;
      const sc = this.scene;
      const j = this.j;
      const c = j.centerOf(target);
      this.c = c;
      const depth = j.above(target);
      const screen = j.isScreen(target);
      const pin = (obj) => (screen ? j.ui(obj) : obj);

      // gray copy laid exactly over the target (works in WebGL and Canvas)
      const grayKey = target.texture ? Textures.gray(sc, target.texture.key, target.frame && target.frame.name !== '__BASE' ? target.frame.name : undefined) : null;
      if (grayKey) {
        this.gray = this.track(pin(sc.add.image(target.x, target.y, grayKey).setOrigin(target.originX, target.originY)
          .setScale(target.scaleX, target.scaleY).setAngle(target.angle).setFlip(target.flipX, target.flipY).setDepth(depth)));
      } else if (target.preFX && sc.game.renderer.type === Phaser.WEBGL && Device.has('shaderFX')) {
        this.matrix = target.preFX.addColorMatrix();
        this.matrix.grayscale(1);
      } else {
        this.dimmed = target.alpha;
        target.setAlpha(0.45);
      }

      const diag = Math.hypot(c.w, c.h);
      this.chains = o.chains === false ? [] : [38, -38].map((a) => this.track(pin(sc.add.image(c.x, c.y, 'pfx-chain').setAngle(a).setScale(diag / 300, Math.max(0.6, diag / 380)).setDepth(depth + 1))));
      const ls = (o.lockScale || 1) * Phaser.Math.Clamp(Math.min(c.w, c.h) / 220, 0.45, 1.4);
      this.lockGlow = this.track(pin(sc.add.image(c.x, c.y + 10 * ls, 'pfx-glow').setTint(0xffd23f).setBlendMode(Phaser.BlendModes.ADD).setScale(0.9 * ls).setAlpha(0).setDepth(depth + 2)));
      this.lock = this.track(pin(sc.add.container(c.x, c.y + 10 * ls).setDepth(depth + 3).setScale(ls)));
      this.shackle = sc.add.image(0, -36, 'pfx-lock-shackle');
      this.body = sc.add.image(0, 0, 'pfx-lock-body');
      this.lock.add([this.shackle, this.body]);
      if (o.padlock === false) this.lock.setVisible(false);
      this.screen = screen;
      this.ls = ls;
      this.idle = sc.tweens.add({ targets: this.lock, angle: { from: -3, to: 3 }, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    async unlock(o = {}) {
      if (!this.locked || !this.alive) return;
      this.locked = false;
      const j = this.j;
      const sc = this.scene;
      const k = o.drama || 1;
      const color = o.color || 0xffd23f;
      const pin = (obj) => (this.screen && obj ? obj.setScrollFactor(0, 0, true) : obj);
      const { x, y } = this.lock;
      this.idle.stop();

      for (let i = 0; i < (o.rattles != null ? o.rattles : 3); i++) {
        const amp = 8 + i * 5;
        j.sfx('charge', i * 2);
        sc.tweens.add({ targets: this.lockGlow, alpha: Math.min(1, 0.25 + i * 0.22), scale: (0.9 + i * 0.15) * this.ls, duration: 200 });
        if (this.chains.length) sc.tweens.add({ targets: this.chains, y: '+=3', duration: 50, yoyo: true });
        await j.tween({ targets: this.lock, angle: { from: -amp, to: amp }, duration: 70, yoyo: true, repeat: 1, ease: 'Sine.easeInOut' });
        this.lock.angle = 0;
        await j.wait(Math.max(90, 260 - i * 50));
        if (!this.alive) return;
      }
      await j.tween({ targets: this.lock, scale: this.ls * 1.18, duration: 160, ease: 'Quad.easeOut' });
      j.sfx('crack');
      await j.hitStop(70 * k);
      if (!this.alive) return;
      j.flash(140, 0xfff3c4, 0.45);
      j.shake(160, 0.006 * k);
      pin(j.shockwave(x, y, color, 2.2 * k * this.ls, 480, this.lock.depth + 1));
      pin(j.burst(x, y, 'pfx-shard', {
        speed: { min: 180 * k, max: 460 * k }, gravityY: 900, lifespan: { min: 600, max: 1000 }, scale: { min: 0.25, max: 0.6 },
        tint: [0xffd23f, 0xffe58a, 0xd99a12], alpha: { start: 1, end: 0, ease: 'Quint.easeIn' },
        rotate: { onEmit: (p) => { p.pfxSpin = Phaser.Math.FloatBetween(-12, 12); return Phaser.Math.Between(0, 360); }, onUpdate: (p, kk, t, v) => v + p.pfxSpin }
      }, Math.round(22 * k), this.lock.depth + 2));
      this.lockGlow.setAlpha(1);
      sc.tweens.add({ targets: this.lockGlow, alpha: 0, scale: 2.4 * this.ls, duration: 500 });

      // pieces fall, chains slide off
      const bottom = this.screen ? j.screen().h + 80 : sc.cameras.main.worldView.bottom + 80;
      this.lock.remove([this.shackle, this.body]);
      [this.shackle, this.body].forEach((p) => { this.track(pin(p)); p.setScale(this.ls).setDepth(this.lock.depth + 1); });
      this.shackle.setPosition(x, y - 36 * this.ls * 1.18);
      this.body.setPosition(x, y);
      this.lock.setVisible(false);
      sc.tweens.add({ targets: this.shackle, x: x + 120, y: y - 170, angle: 200, duration: 520, ease: 'Quad.easeOut' });
      sc.tweens.add({ targets: this.shackle, y: bottom, delay: 520, duration: 520, ease: 'Quad.easeIn' });
      sc.tweens.add({ targets: this.body, x: x - 60, y: bottom, angle: -140, duration: 900, ease: 'Quad.easeIn' });
      j.sfx('whoosh');
      this.chains.forEach((ch, i) => sc.tweens.add({ targets: ch, x: ch.x + (i ? -120 : 120), y: ch.y + 520, angle: ch.angle + (i ? -25 : 25), alpha: 0, delay: 90 + i * 90, duration: 800, ease: 'Quad.easeIn' }));
      await j.wait(260);
      if (!this.alive) return;

      // colour floods in
      j.sfx('chime');
      if (this.gray) sc.tweens.add({ targets: this.gray, alpha: 0, duration: 650, ease: 'Sine.easeInOut' });
      if (this.matrix) { const m = { a: 1 }; sc.tweens.add({ targets: m, a: 0, duration: 650, onUpdate: () => this.matrix.grayscale(m.a) }); }
      if (this.dimmed != null) sc.tweens.add({ targets: this.target, alpha: this.dimmed, duration: 650 });
      const c = this.c;
      j.shine(c.x, c.y, c.w, c.h, 650, this.lock.depth + 3, 14, this.screen);
      await j.wait(300);
      j.pop(this.target, 0.1, 340);
      if (o.rays !== false) {
        const rays = pin(j.rays(c.x, c.y, color, 12, j.above(this.target, -1)));
        sc.tweens.add({ targets: rays, scale: 0.75 * Math.max(0.4, c.h / 310), duration: 500, ease: 'Back.easeOut' });
        sc.tweens.add({ targets: rays, alpha: 0, delay: o.raysFor || 1800, duration: 600, onComplete: () => rays.destroy() });
      }
      pin(j.burst(c.x, c.y, 'pfx-star', { speed: { min: 90, max: 300 * k }, lifespan: { min: 500, max: 1000 }, scale: { start: 0.7, end: 0 }, rotate: { min: 0, max: 360 }, color: [0xffffff, color], blendMode: 'ADD' }, Math.round(30 * k), this.lock.depth + 4));
      if (o.label !== false) j.floatText(c.x, c.y - c.h / 2 - 20, o.label || 'UNLOCKED!', '#ffc94a', 30, { screen: this.screen });
      await j.wait(900);
      if (this.matrix && this.target.preFX) this.target.preFX.remove(this.matrix);
      this.destroy();
    }
  }

  // ---- src/components/Dialogue.js
  /**
   * Dialogue — a story dialogue box with typewriter text, voice blips,
   * portraits and animated words.
   *
   *   const talk = this.fx.dialogue({
   *     speakers: {
   *       pip:  { name: 'Pip',  portrait: 'fox', color: '#f08a3c', pitch: 640 },
   *       moss: { name: 'Moss', portrait: 'owl', color: '#b79be0', pitch: 300 }
   *     }
   *   });
   *   await talk.say('pip', 'Something is [wave]glowing[/wave] in the forest!');
   *   await talk.play([['moss', '[shake]Do not[/shake] touch the [color=#ff8ac2]mushrooms[/color].'], ['pip', 'Too late...[pause] oops.']]);
   *   talk.destroy();
   *
   * Markup: [wave]…[/wave]  [shake]…[/shake]  [color=#hex]…[/color]  [pause]
   * Click / tap / Space / Enter: first finishes the line, then advances.
   * Options: x, y, width, height (screen; defaults to the bottom of the screen), cps (38), fontSize (24),
   * colors { box, edge, text }, clickAnywhere (true), blips (true), arrow (true).
   */
  class Dialogue extends Component {
    constructor(fx, o = {}) {
      super(fx);
      const sc = this.scene;
      const { w, h } = this.j.screen();
      this.o = o;
      this.speakers = o.speakers || {};
      this.cps = o.cps || 38;
      this.fontSize = o.fontSize || 24;
      this.W = o.width || Math.min(880, w - 40);
      this.H = o.height || 170;
      this.cx = o.x != null ? o.x : w / 2;
      this.cy = o.y != null ? o.y : h - this.H / 2 - 20;
      this.col = { box: 0xfff6e0, edge: 0x2a1d5e, text: '#21183f', ...(o.colors || {}) };
      this.depth = o.depth != null ? o.depth : this.j.depth(700);
      this.chars = [];
      this.widths = {};
      this.measure = this.track(sc.add.text(-9999, -9999, '', this.style('#000')).setVisible(false));

      const x0 = this.cx - this.W / 2;
      const y0 = this.cy - this.H / 2;
      this.box = this.track(this.j.ui(sc.add.graphics().setDepth(this.depth)));
      this.box.fillStyle(0x07050f, 0.5).fillRoundedRect(x0, y0 + 8, this.W, this.H, 22);
      this.box.fillStyle(this.col.box, 1).fillRoundedRect(x0, y0, this.W, this.H, 22).lineStyle(4, this.col.edge, 1).strokeRoundedRect(x0, y0, this.W, this.H, 22);
      this.hasPortraits = Object.values(this.speakers).some((s) => s.portrait);
      this.pr = Math.min(62, this.H / 2 - 18);
      this.px = x0 + 24 + this.pr;
      if (this.hasPortraits) {
        this.box.fillStyle(this.col.edge, 1).fillCircle(this.px, this.cy, this.pr + 4);
        this.portrait = this.track(this.j.ui(sc.add.image(this.px, this.cy, '__DEFAULT').setDepth(this.depth + 1)));
        const mask = this.track(sc.make.graphics({}, false).fillCircle(this.px, this.cy, this.pr).setScrollFactor(0));
        this.portrait.setMask(mask.createGeometryMask());
      }
      this.textX = this.hasPortraits ? this.px + this.pr + 26 : x0 + 30;
      this.textRight = x0 + this.W - 36;
      this.plate = this.track(this.j.ui(sc.add.graphics().setDepth(this.depth + 1)));
      this.nameText = this.track(this.j.ui(this.j.text(0, y0, '', 18, '#ffffff').setDepth(this.depth + 2)));
      this.arrow = this.track(this.j.ui(this.j.text(x0 + this.W - 30, y0 + this.H - 26, '▼', 18, '#' + this.col.edge.toString(16).padStart(6, '0'), { body: true }).setDepth(this.depth + 2).setVisible(false)));
      sc.tweens.add({ targets: this.arrow, y: this.arrow.y + 6, duration: 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

      this._click = () => this.advance();
      if (o.clickAnywhere !== false) sc.input.on('pointerdown', this._click);
      else { this.box.setInteractive(new Phaser.Geom.Rectangle(x0, y0, this.W, this.H), Phaser.Geom.Rectangle.Contains); this.box.on('pointerdown', this._click); }
      this._key = (e) => { if (e.code === 'Space' || e.code === 'Enter') this.advance(); };
      if (sc.input.keyboard) sc.input.keyboard.on('keydown', this._key);
      this.onUpdate((time, dt) => this.tick(time, dt));
    }

    style(color) { return { fontFamily: Settings.bodyFont, fontSize: `${this.fontSize}px`, color, fontStyle: 'bold' }; }

    cw(ch) {
      if (this.widths[ch] == null) {
        if (ch === ' ') { this.measure.setText('a a'); const ww = this.measure.width; this.widths[ch] = ww - this.cw('a') * 2; }
        else { this.measure.setText(ch); this.widths[ch] = this.measure.width; }
      }
      return this.widths[ch];
    }

    parse(src) {
      const out = [];
      const st = { wave: false, shake: false, color: null };
      const re = /\[(\/?)(wave|shake|pause|color)(?:=([^\]]+))?\]/g;
      let last = 0;
      let m;
      const push = (t) => { for (const ch of t) out.push({ ch, wave: st.wave, shake: st.shake, color: st.color }); };
      while ((m = re.exec(src))) {
        push(src.slice(last, m.index));
        const [, close, tag, val] = m;
        if (tag === 'pause') out.push({ pause: 450 });
        else if (tag === 'color') st.color = close ? null : val;
        else st[tag] = !close;
        last = re.lastIndex;
      }
      push(src.slice(last));
      return out;
    }

    layout(items) {
      const sc = this.scene;
      const lineH = this.fontSize * 1.5;
      let x = this.textX;
      let y = this.cy - this.H / 2 + 40;
      const words = [];
      let cur = [];
      items.forEach((it) => { cur.push(it); if (it.ch === ' ') { words.push(cur); cur = []; } });
      if (cur.length) words.push(cur);
      const chars = [];
      words.forEach((wd) => {
        const width = wd.reduce((a, it) => a + (it.pause ? 0 : this.cw(it.ch)), 0);
        if (x + width > this.textRight && x > this.textX) { x = this.textX; y += lineH; }
        wd.forEach((it) => {
          if (it.pause) { chars.push(it); return; }
          const t = this.j.ui(sc.add.text(x, y, it.ch, this.style(it.color || this.col.text)).setOrigin(0, 0.5).setDepth(this.depth + 2).setVisible(false));
          chars.push({ ...it, t, bx: x, by: y, i: chars.length });
          x += this.cw(it.ch);
        });
      });
      return chars;
    }

    setSpeaker(id) {
      const sp = this.speakers[id] || { name: id || '' };
      this.sp = sp;
      if (this.speakerId === id) return;
      this.speakerId = id;
      const sc = this.scene;
      if (this.portrait) {
        if (sp.portrait) {
          this.portrait.setVisible(true).setTexture(sp.portrait);
          const s = (this.pr * 2.1) / Math.max(this.portrait.width, this.portrait.height);
          this.portrait.setScale(s * 1.12, s * 0.85);
          sc.tweens.add({ targets: this.portrait, scaleX: s, scaleY: s, duration: 320, ease: 'Back.easeOut' });
        } else this.portrait.setVisible(false);
      }
      this.plate.clear();
      this.nameText.setText(sp.name || '');
      if (sp.name) {
        const pw = this.nameText.width + 40;
        const nx = this.textX + pw / 2 - 6;
        const ny = this.cy - this.H / 2;
        this.plate.fillStyle(Phaser.Display.Color.HexStringToColor(sp.color || '#ff5fa2').color, 1).fillRoundedRect(nx - pw / 2, ny - 20, pw, 40, 20);
        this.nameText.setPosition(nx, ny);
        this.j.pop(this.nameText, 0.15, 260);
      }
    }

    /** Show one line. Resolves when the player advances past it. */
    say(speaker, text) {
      if (!this.alive) return Promise.resolve();
      this.chars.forEach((c) => c.t && c.t.destroy());
      this.setSpeaker(speaker);
      this.chars = this.layout(this.parse(text));
      this.idx = 0;
      this.wait = 0;
      this.typing = true;
      this.arrow.setVisible(false);
      return new Promise((resolve) => { this._resolve = resolve; });
    }

    /** Play a whole script: [[speaker, text], …]. */
    async play(lines) {
      for (const [sp, text] of lines) { if (!this.alive) return; await this.say(sp, text); }
    }

    finish() {
      this.chars.forEach((c) => { if (c.t) { this.scene.tweens.killTweensOf(c.t); c.t.setVisible(true).setScale(1).setY(c.by); } });
      this.idx = this.chars.length;
      this.typing = false;
      if (this.o.arrow !== false) this.arrow.setVisible(true);
    }

    /** Same as a click: finish the line, or go to the next one. */
    advance() {
      if (!this.alive || !this._resolve) return;
      if (this.typing) { this.finish(); return; }
      const r = this._resolve;
      this._resolve = null;
      this.j.sfx('tone', 520, 0.05, 'sine', 0.05);
      r();
    }

    tick(time, dt) {
      if (this.typing) {
        this.wait -= dt;
        while (this.wait <= 0 && this.idx < this.chars.length) {
          const c = this.chars[this.idx++];
          if (c.pause) { this.wait += c.pause; break; }
          c.t.setVisible(true).setScale(0.4).setY(c.by + 6);
          this.scene.tweens.add({ targets: c.t, scale: 1, y: c.by, duration: 120, ease: 'Back.easeOut' });
          this.wait += 1000 / this.cps;
          if (',;:'.includes(c.ch)) this.wait += 90;
          if ('.!?'.includes(c.ch)) this.wait += 220;
          if (this.o.blips !== false && c.ch !== ' ' && this.idx % 2 === 0) this.j.sfx('blip', (this.sp && this.sp.pitch) || 520);
        }
        if (this.idx >= this.chars.length) { this.typing = false; if (this.o.arrow !== false) this.arrow.setVisible(true); }
      }
      if (Settings.reducedMotion) return;
      const k = time * 0.008;
      this.chars.forEach((c) => {
        if (!c.t || !c.t.visible) return;
        if (c.wave) c.t.y = c.by + Math.sin(k + c.i * 0.55) * (this.o.waveHeight || 5);
        if (c.shake) c.t.setPosition(c.bx + Phaser.Math.FloatBetween(-1.5, 1.5), c.by + Phaser.Math.FloatBetween(-1.5, 1.5));
      });
    }

    destroy() {
      if (!this.alive) return;
      this.scene.input.off('pointerdown', this._click);
      if (this.scene.input.keyboard) this.scene.input.keyboard.off('keydown', this._key);
      this.chars.forEach((c) => c.t && c.t.destroy());
      if (this._resolve) { const r = this._resolve; this._resolve = null; r(); }
      super.destroy();
    }
  }

  // ---- src/effects/Emote.js
  /**
   * Emote — show how a character feels: a symbol above its head PLUS a body reaction.
   *   await this.fx.emote(npc, 'surprise');
   * Types: 'surprise' | 'confused' | 'love' | 'nervous' | 'annoyed' | 'sleepy' | 'happy' | 'idea'
   * Options: hold (ms the bubble stays, 1200), size (reaction strength, 1), offsetX, offsetY.
   * The character returns to its original position/scale/angle afterwards.
   */
  class Emote {
    static TYPES = ['surprise', 'confused', 'love', 'nervous', 'annoyed', 'sleepy', 'happy', 'idea'];

    static async play(fx, target, type = 'surprise', o = {}) {
      const j = fx.juice;
      const sc = fx.scene;
      const c = j.centerOf(target);
      const k = (o.size || 1) * (Settings.reducedMotion ? 0.4 : 1);
      const hold = o.hold || 1200;
      const screen = j.isScreen(target);
      const pin = (obj) => (screen && obj ? obj.setScrollFactor(0, 0, true) : obj);
      const depth = j.above(target, 20);
      const headX = c.x + (o.offsetX || 0);
      const headY = c.y - c.h / 2 + (o.offsetY || 0);
      const base = { x: target.x, y: target.y, sx: target.scaleX, sy: target.scaleY, a: target.angle };
      const restore = () => { if (target.scene) target.setPosition(base.x, base.y).setScale(base.sx, base.sy).setAngle(base.a); };

      const bubble = (content) => {
        const b = pin(sc.add.container(headX + c.w * 0.35, headY - 44).setDepth(depth).setScale(0.001));
        const g = sc.add.graphics();
        g.fillStyle(0x07050f, 0.4).fillRoundedRect(-38, -32, 76, 70, 26);
        g.fillStyle(0xffffff, 1).fillRoundedRect(-38, -38, 76, 70, 26).fillTriangle(-22, 22, -4, 30, -36, 52);
        b.add(g);
        if (content) b.add(content);
        pin(b);
        j.sfx('pop');
        return j.tween({ targets: b, scale: 1, duration: 260, ease: 'Back.easeOut' })
          .then(() => j.wait(hold))
          .then(() => j.tween({ targets: b, scale: 0.001, duration: 160, ease: 'Back.easeIn' }))
          .then(() => b.destroy());
      };
      const glyph = (str, color) => j.text(0, -4, str, 40, color);
      const jobs = [];

      switch (type) {
        case 'surprise':
          jobs.push(bubble(glyph('!', '#ff5f6d')));
          jobs.push(j.tween({ targets: target, y: base.y - 40 * k, duration: 160, yoyo: true, ease: 'Quad.easeOut' }));
          for (let i = 0; i < 5; i++) {
            const a = -Math.PI / 2 + (i - 2) * 0.45;
            const line = pin(sc.add.rectangle(headX + Math.cos(a) * 60, headY - 20 + Math.sin(a) * 50, 4, 18, 0xffffff).setRotation(a + Math.PI / 2).setDepth(depth));
            sc.tweens.add({ targets: line, alpha: { from: 1, to: 0 }, x: line.x + Math.cos(a) * 20, y: line.y + Math.sin(a) * 20, duration: 360, onComplete: () => line.destroy() });
          }
          j.sfx('tone', 880, 0.12, 'triangle', 0.1);
          break;
        case 'confused':
          jobs.push(bubble(glyph('?', '#4fa3ff')));
          jobs.push(j.tween({ targets: target, angle: { from: base.a - 9 * k, to: base.a + 9 * k }, duration: 420, yoyo: true, repeat: 1, ease: 'Sine.easeInOut' }));
          j.sfx('tone', 440, 0.12, 'sine', 0.08, 0, 560);
          break;
        case 'love':
          jobs.push(bubble(glyph('♥', '#ff5fa2')));
          j.pop(target, 0.12 * k, 420);
          pin(j.burst(headX, headY, 'pfx-heart', { speedY: { min: -120, max: -60 }, speedX: { min: -50, max: 50 }, lifespan: 1400, scale: { start: 0.6, end: 1.1 }, alpha: { start: 1, end: 0 }, tint: [0xff5fa2, 0xff8ac2, 0xffb3d1], rotate: { min: -20, max: 20 } }, 7, depth));
          j.sfx('chime');
          break;
        case 'nervous': {
          jobs.push(j.tween({ targets: target, scaleX: base.sx * 0.95, scaleY: base.sy * 0.93, duration: 200, yoyo: true, hold: 900, ease: 'Quad.easeOut' }));
          const drop = pin(sc.add.graphics().setDepth(depth));
          drop.fillStyle(0x7fc8ff, 1).fillCircle(0, 8, 9).fillTriangle(-8, 5, 8, 5, 0, -12).fillStyle(0xffffff, 0.8).fillCircle(-3, 6, 2.5);
          drop.setPosition(headX + c.w * 0.3, headY + 10).setScale(0.001);
          jobs.push(j.tween({ targets: drop, scale: 1.2, duration: 200, ease: 'Back.easeOut' })
            .then(() => j.tween({ targets: drop, y: headY + 60, duration: 900, ease: 'Quad.easeIn' }))
            .then(() => j.tween({ targets: drop, alpha: 0, duration: 200 })).then(() => drop.destroy()));
          j.sfx('tone', 520, 0.18, 'sine', 0.06, 0, 380);
          break;
        }
        case 'annoyed': {
          const vein = pin(sc.add.graphics().setDepth(depth));
          vein.lineStyle(6, 0xff5f6d, 1);
          [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => vein.beginPath().arc(sx * 9, sy * 9, 8, Math.atan2(-sy, -sx) - 0.9, Math.atan2(-sy, -sx) + 0.9, false).strokePath());
          vein.setPosition(headX + c.w * 0.3, headY - 10);
          jobs.push(j.tween({ targets: vein, scale: { from: 0.8, to: 1.15 }, duration: 160, yoyo: true, repeat: 3 }).then(() => vein.destroy()));
          if (!Settings.reducedMotion) jobs.push(j.tween({ targets: target, x: base.x + 4 * k, duration: 40, yoyo: true, repeat: 7 }));
          pin(j.burst(headX, headY - 10, 'pfx-smoke', { speedY: { min: -90, max: -50 }, speedX: { min: -60, max: 60 }, lifespan: 900, scale: { start: 0.2, end: 0.7 }, alpha: { start: 0.5, end: 0 }, tint: 0xffffff }, 6, depth));
          j.sfx('noise', 0.25, 0.08, 0, 900);
          break;
        }
        case 'sleepy':
          jobs.push(j.tween({ targets: target, angle: base.a + 6 * k, duration: 900, yoyo: true, ease: 'Sine.easeInOut' }));
          for (let i = 0; i < 3; i++) {
            const z = pin(j.text(headX + 30, headY - 10, 'z', 18 + i * 8, '#c9c2ef').setDepth(depth).setAlpha(0));
            jobs.push(j.tween({ targets: z, x: z.x + 40 + i * 14, y: z.y - 70 - i * 10, alpha: { from: 1, to: 0 }, angle: -15, delay: i * 380, duration: 1300, ease: 'Sine.easeOut' }).then(() => z.destroy()));
          }
          j.sfx('tone', 220, 0.6, 'sine', 0.05, 0, 160);
          break;
        case 'happy':
          jobs.push(bubble(glyph('♪', '#2fbf8a')));
          jobs.push(j.tween({ targets: target, y: base.y - 12 * k, duration: 180, yoyo: true, repeat: 3, ease: 'Sine.easeOut' }));
          for (let i = 0; i < 4; i++) {
            const n = pin(j.text(headX, headY, i % 2 ? '♫' : '♪', 26, '#7ff7c8').setDepth(depth).setAlpha(0));
            const dir = i % 2 ? 1 : -1;
            sc.tweens.add({ targets: n, x: n.x + dir * (50 + i * 10), y: n.y - 90, alpha: { from: 1, to: 0 }, delay: i * 220, duration: 1100, ease: 'Sine.easeOut', onComplete: () => n.destroy() });
          }
          [523, 659, 784].forEach((f, i) => j.sfx('tone', f, 0.14, 'triangle', 0.07, i * 0.12));
          break;
        default: { // idea
          const bulb = sc.add.graphics();
          bulb.fillStyle(0xffd23f, 1).fillCircle(0, -8, 14).fillStyle(0x9b93c4, 1).fillRect(-7, 5, 14, 9).fillStyle(0xffffff, 0.8).fillCircle(-5, -13, 4);
          jobs.push(bubble(bulb));
          jobs.push(j.tween({ targets: target, y: base.y - 22 * k, duration: 140, yoyo: true, ease: 'Quad.easeOut' }));
          const rays = pin(j.rays(headX + c.w * 0.35, headY - 48, 0xffd23f, 10, depth - 1));
          sc.tweens.add({ targets: rays, scale: 0.22, duration: 260, ease: 'Back.easeOut' });
          sc.tweens.add({ targets: rays, alpha: 0, delay: hold, duration: 300, onComplete: () => rays.destroy() });
          j.sfx('sparkle');
        }
      }
      await Promise.all(jobs);
      restore();
    }
  }

  // ---- src/effects/ChapterTitle.js
  /**
   * ChapterTitle — cinematic title card: letterbox bars, a chapter label, the
   * title dropping in letter by letter, an underline and a subtitle.
   *   await this.fx.chapterTitle('The Whispering Woods', { chapter: 'CHAPTER 2', subtitle: 'in which Pip follows a light' });
   * Options: chapter, subtitle, hold (1800 ms), stagger (50 ms per letter), bars (true), dim (0.55),
   * color (accent, '#ffc94a'), size (48). Resolves after it has cleared away.
   */
  class ChapterTitle {
    static async show(fx, title, o = {}) {
      const j = fx.juice;
      const sc = fx.scene;
      const { w, h, cx, cy } = j.screen();
      const depth = j.depth(750);
      const accent = o.color || '#ffc94a';
      const accentN = Phaser.Display.Color.HexStringToColor(accent).color;
      const y = o.y != null ? o.y : cy - 10;
      const objs = [];
      const keep = (ob) => { objs.push(j.ui(ob)); return ob; };
      const dim = keep(sc.add.rectangle(cx, cy, w * 3, h * 3, 0x05030c, 0).setDepth(depth));
      const barH = Math.round(h * 0.12);
      const top = keep(sc.add.rectangle(cx, -barH / 2, w * 2, barH, 0x000000).setDepth(depth + 5));
      const bot = keep(sc.add.rectangle(cx, h + barH / 2, w * 2, barH, 0x000000).setDepth(depth + 5));
      j.sfx('whoosh');
      sc.tweens.add({ targets: dim, fillAlpha: o.dim != null ? o.dim : 0.55, duration: 600 });
      if (o.bars !== false) {
        sc.tweens.add({ targets: top, y: barH / 2, duration: 600, ease: 'Cubic.easeOut' });
        await j.tween({ targets: bot, y: h - barH / 2, duration: 600, ease: 'Cubic.easeOut' });
      } else await j.wait(300);
      if (!sc.sys.isActive()) return;

      let label = null;
      if (o.chapter) {
        label = keep(j.text(cx, y - (o.size || 48) * 1.4, o.chapter, 16, accent, { body: true }).setDepth(depth + 2).setAlpha(0));
        label.setLetterSpacing(18);
        const sp = { v: 18 };
        sc.tweens.add({ targets: sp, v: 6, duration: 700, ease: 'Cubic.easeOut', onUpdate: () => label.setLetterSpacing(sp.v) });
        await j.tween({ targets: label, alpha: 1, duration: 400 });
      }

      const style = { fontFamily: Settings.font, fontSize: `${o.size || 48}px`, color: '#ffffff', fontStyle: 'bold' };
      const m = sc.add.text(0, 0, title, style);
      const total = Math.min(m.width, w - 40);
      const fit = Math.min(1, (w - 40) / m.width);
      m.destroy();
      let x = cx - total / 2;
      const stagger = o.stagger != null ? o.stagger : 50;
      const letters = [...title].map((ch, i) => {
        const t = keep(sc.add.text(x, y - 40, ch, style).setScale(fit).setOrigin(0, 0.5).setDepth(depth + 2).setAlpha(0).setAngle(Settings.reducedMotion ? 0 : Phaser.Math.Between(-12, 12)));
        x += t.width * fit;
        sc.tweens.add({ targets: t, y, alpha: 1, angle: 0, delay: i * stagger, duration: 420, ease: 'Back.easeOut' });
        if (ch !== ' ' && i % 2 === 0) sc.time.delayedCall(i * stagger, () => j.sfx('tone', 500 + i * 18, 0.05, 'sine', 0.03));
        return t;
      });
      await j.wait(letters.length * stagger + 300);
      if (!sc.sys.isActive()) return;

      const line = keep(sc.add.graphics().setDepth(depth + 2));
      const lo = { w: 0 };
      const half = Math.min(300, total / 2 + 20);
      sc.tweens.add({ targets: lo, w: half, duration: 500, ease: 'Cubic.easeOut', onUpdate: () => line.clear().fillStyle(accentN, 1).fillRect(cx - lo.w, y + (o.size || 48) * 0.95, lo.w * 2, 3) });
      let sub = null;
      if (o.subtitle) {
        sub = keep(j.text(cx, y + (o.size || 48) * 1.7, o.subtitle, 18, '#d8d2f5', { body: true, wrap: w - 80 }).setDepth(depth + 2).setAlpha(0));
        sc.tweens.add({ targets: sub, alpha: 1, delay: 250, duration: 500 });
      }
      j.sfx('chime');
      await j.wait(700 + (o.hold != null ? o.hold : 1800));
      if (!sc.sys.isActive()) return;

      [...letters].reverse().forEach((t, i) => sc.tweens.add({ targets: t, y: t.y - 30, alpha: 0, delay: i * 18, duration: 360, ease: 'Quad.easeIn' }));
      sc.tweens.add({ targets: [label, sub, line].filter(Boolean), alpha: 0, duration: 400 });
      await j.wait(letters.length * 18 + 300);
      sc.tweens.add({ targets: dim, fillAlpha: 0, duration: 600 });
      sc.tweens.add({ targets: top, y: -barH / 2, duration: 500, ease: 'Cubic.easeIn' });
      await j.tween({ targets: bot, y: h + barH / 2, duration: 500, ease: 'Cubic.easeIn' });
      objs.forEach((ob) => ob.destroy());
    }
  }

  // ---- src/components/DayNight.js
  /**
   * DayNight — time-of-day lighting over YOUR scene, driven by one number (the hour).
   *   const sky = this.fx.dayNight({ hour: 17, speed: 0.5, stars: true, fireflies: true });
   *   sky.addLight(house.x, house.y - 20, { radius: 60, color: 0xffc96b });  // glows at night
   *   sky.setHour(21);   sky.hour   sky.night (0..1)   sky.phase ('Morning'…)
   * It tints the whole camera view with a MULTIPLY overlay (day = no change),
   * fades stars in over the top `skyHeight` px, and fades lights up as night falls.
   * Options: hour (12), speed (game-hours per real second, 0 = still), stars, fireflies,
   * skyHeight (screen px for stars, 45% of height), clock (show a time pill), depth, onPhase(name).
   */
  class DayNight extends Component {
    static TINT = [[0, 0x3a4080], [5, 0x4a4f90], [6.5, 0xffc8c0], [8, 0xffffff], [16.5, 0xffffff], [18, 0xffb080], [19.5, 0x8070c0], [21, 0x3a4080], [24, 0x3a4080]];
    static PHASES = [[5, 'Night'], [8, 'Dawn'], [12, 'Morning'], [17, 'Afternoon'], [20, 'Evening'], [24, 'Night']];

    constructor(fx, o = {}) {
      super(fx);
      const sc = this.scene;
      const { w, h, cx, cy } = this.j.screen();
      this.o = o;
      this.hour = o.hour != null ? o.hour : 12;
      this.speed = o.speed || 0;
      this.depth = o.depth != null ? o.depth : Settings.depth - 100;
      this.overlay = this.track(this.j.ui(sc.add.rectangle(cx, cy, w * 3, h * 3, 0xffffff).setBlendMode(Phaser.BlendModes.MULTIPLY).setDepth(this.depth)));
      this.stars = [];
      if (o.stars !== false) {
        const sky = o.skyHeight != null ? o.skyHeight : h * 0.45;
        for (let i = 0; i < (o.starCount || 60); i++) {
          const s = this.track(this.j.ui(sc.add.image(Phaser.Math.Between(0, w), Phaser.Math.Between(0, sky), 'pfx-star').setScale(Phaser.Math.FloatBetween(0.1, 0.26)).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(this.depth + 1)));
          s.base = Phaser.Math.FloatBetween(0.5, 1);
          s.phase = Math.random() * 6.28;
          this.stars.push(s);
        }
      }
      this.lights = [];
      if (o.fireflies) {
        this.flies = this.track(this.j.emitter(cx, h * 0.75, 'pfx-glow', {
          emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-w / 2, -h * 0.25, w, h * 0.35) }, frequency: 260, lifespan: { min: 2500, max: 4500 },
          speedX: { min: -20, max: 20 }, speedY: { min: -14, max: 8 }, scale: { min: 0.06, max: 0.12 }, tint: 0xd9ff8a, blendMode: 'ADD',
          alpha: { onEmit: (p) => { p.pfxBlink = Math.random() * 6.28; return 0; }, onUpdate: (p, k, t) => Math.max(0, Math.sin(t * Math.PI)) * (0.5 + 0.5 * Math.sin(p.pfxBlink + t * 14)) * this.night }
        }, this.depth + 2).setScrollFactor(0));
      }
      if (o.clock) {
        this.clock = this.track(this.j.ui(this.j.text(16, 16, '', 15, '#ffffff', { body: true, ox: 0, oy: 0, stroke: '#1a1030', strokeThickness: 4 }).setDepth(this.depth + 3)));
      }
      this.onUpdate((t, dt) => {
        if (this.speed) this.hour = (this.hour + (dt / 1000) * this.speed) % 24;
        this.apply(t);
      });
      this.apply(0);
    }

    static colorAt(h) {
      const K = DayNight.TINT;
      let i = 0;
      while (i < K.length - 2 && h >= K[i + 1][0]) i++;
      const f = Phaser.Math.Clamp((h - K[i][0]) / (K[i + 1][0] - K[i][0]), 0, 1);
      const C = Phaser.Display.Color;
      const m = C.Interpolate.ColorWithColor(C.ValueToColor(K[i][1]), C.ValueToColor(K[i + 1][1]), 100, f * 100);
      return C.GetColor(m.r, m.g, m.b);
    }

    static nightAt(h) {
      if (h >= 21 || h < 5) return 1;
      if (h >= 8 && h < 17) return 0;
      if (h < 8) return 1 - (h - 5) / 3;
      return (h - 17) / 4;
    }

    apply(time) {
      const h = this.hour;
      this.night = DayNight.nightAt(h);
      this.overlay.setFillStyle(DayNight.colorAt(h));
      const tt = time / 1000;
      this.stars.forEach((s) => s.setAlpha(this.night * s.base * (Settings.reducedMotion ? 1 : 0.7 + 0.3 * Math.sin(tt * 2 + s.phase))));
      this.lights.forEach((l) => {
        const on = this.night > l.at;
        l.img.setAlpha(on ? Math.min(1, (this.night - l.at) * 3) * l.max : 0);
        if (on !== l.on) { l.on = on; if (on) this.j.pop(l.img, 0.25, 260); }
      });
      const phase = DayNight.PHASES.find(([lim]) => h < lim)[1];
      if (phase !== this.phase) { this.phase = phase; if (this.o.onPhase) this.o.onPhase(phase, h); }
      if (this.clock) {
        const hh = Math.floor(h);
        const mm = Math.floor(((h - hh) * 60) / 15) * 15;
        this.clock.setText(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} · ${phase}`);
      }
    }

    setHour(h) { this.hour = ((h % 24) + 24) % 24; this.apply(this.scene.time.now); return this; }

    /** Smoothly move time forward by `hours`. */
    advance(hours = 6, ms = 1200) {
      const o = { h: this.hour };
      const sp = this.speed;
      this.speed = 0;
      return this.j.tween({ targets: o, h: this.hour + hours, duration: ms, ease: 'Sine.easeInOut', onUpdate: () => this.setHour(o.h), onComplete: () => { this.speed = sp; } });
    }

    /** A world-space light (window, lamp, campfire) that glows at night. */
    addLight(x, y, o = {}) {
      const img = this.track(this.scene.add.image(x, y, 'pfx-glow').setTint(o.color || 0xffc96b).setBlendMode(Phaser.BlendModes.ADD)
        .setScale((o.radius || 60) / 40).setAlpha(0).setDepth(this.depth + 1));
      const l = { img, at: o.at != null ? o.at : Phaser.Math.FloatBetween(0.3, 0.6), max: o.alpha || 0.85, on: false };
      this.lights.push(l);
      this.apply(this.scene.time.now);
      return img;
    }
  }

  // ---- src/components/Spotlight.js
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

  // ---- src/transitions/TransitionStyle.js
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

  // ---- src/transitions/FadeStyle.js
  /** Fade — the screen fills with a colour. Time passes; a calm scene change. */
  class FadeStyle extends TransitionStyle {
    static id = 'fade';
    static defaultSound = 'whoosh';
    static label = 'Fade';
    static description = 'Fade to a colour and back. Best for "time passes" and calm scene changes.';
    static params = [];

    setup() {
      this.rect = this.add(this.scene.add.rectangle(this.w / 2, this.h / 2, this.w * 3, this.h * 3, this.color).setAlpha(0));
    }

    render(t) { this.rect.setAlpha(t); }
  }

  // ---- src/transitions/IrisStyle.js
  /**
   * Iris — the view closes to a shape around a focus point (circle, heart, star…).
   * Darkness is a RenderTexture: fill it, then erase a shape that shrinks.
   */
  class IrisStyle extends TransitionStyle {
    static id = 'iris';
    static defaultSound = 'slide';
    static label = 'Iris (shape)';
    static description = 'The view closes to a shape around a point. Great for focusing on a character.';
    static usesFocus = true;
    static params = [
      { key: 'shape', label: 'Shape', type: 'select', options: ['circle', 'diamond', 'square', 'heart', 'star'], default: 'circle' },
      { key: 'spin', label: 'Spin (°)', type: 'number', min: -720, max: 720, step: 15, default: 0 },
      { key: 'pause', label: 'Pause at small size', type: 'number', min: 0, max: 0.4, step: 0.01, default: 0 }
    ];

    static FACTOR = { circle: 1, square: 1, diamond: 1.45, heart: 1.75, star: 2.7 };

    setup() {
      const key = Textures.shape(this.scene, this.p.shape);
      this.rt = this.add(this.scene.add.renderTexture(0, 0, this.w, this.h).setOrigin(0, 0));
      this.brush = this.scene.make.image({ key }, false);
      const f = this.focus;
      const far = Math.max(...this.screenPoly().map((p) => Math.hypot(p.x - f.x, p.y - f.y)));
      this.maxScale = (far * 2 * (IrisStyle.FACTOR[this.p.shape] || 1)) / 256;
    }

    render(t) {
      const rt = this.rt;
      rt.clear();
      if (t <= 0.0005) return;
      rt.fill(this.color, 1);
      // optional "pause": hold a small hole for a beat before closing (classic cartoon ending)
      const pz = this.p.pause;
      let open = 1 - t;
      if (pz > 0) open = t < 1 - pz ? 1 - t / (1 - pz) * (1 - 0.06) : 0.06 * Math.max(0, (1 - t) / pz);
      const s = open * this.maxScale;
      if (s <= 0.0005) return;
      this.brush.setScale(s).setAngle(this.p.spin * (1 - open));
      rt.erase(this.brush, this.focus.x, this.focus.y);
    }

    destroy() {
      if (this.brush) this.brush.destroy();
      super.destroy();
    }
  }

  // ---- src/transitions/WipeStyle.js
  /**
   * Wipe — a straight edge sweeps across at any angle, with an optional bright edge line.
   * Uses half-plane clipping, so every angle works in WebGL and Canvas.
   */
  class WipeStyle extends TransitionStyle {
    static id = 'wipe';
    static defaultSound = 'swish';
    static label = 'Wipe';
    static description = 'A straight edge sweeps across at any angle. "Continue" makes the reveal carry on the same way.';
    static params = [
      { key: 'angle', label: 'Direction (°)', type: 'number', min: 0, max: 359, step: 1, default: 0 },
      { key: 'edge', label: 'Edge line (px)', type: 'number', min: 0, max: 40, step: 1, default: 0 },
      { key: 'edgeColor', label: 'Edge colour', type: 'color', default: '#ffc94a' }
    ];

    setup() {
      this.g = this.graphics();
      const a = Phaser.Math.DegToRad(this.p.angle);
      this.nx = Math.cos(a);
      this.ny = Math.sin(a);
      this.r = this.range(this.nx, this.ny);
      this.edgeCol = Phaser.Display.Color.HexStringToColor(this.p.edgeColor || '#ffffff').color;
    }

    render(t, phase) {
      const g = this.g;
      g.clear();
      if (t <= 0.0005) return;
      const { min, max } = this.r;
      const span = max - min + this.p.edge * 2;
      const S = TransitionStyle;
      let poly;
      let edgeAt;
      let edgeDir;
      if (phase === 'reveal' && this.continues) {
        const c = min - this.p.edge + (1 - t) * span;
        poly = S.clip(this.screenPoly(), this.nx, this.ny, c, false);
        edgeAt = c; edgeDir = -1;
      } else {
        const c = min - this.p.edge + t * span;
        poly = S.clip(this.screenPoly(), this.nx, this.ny, c, true);
        edgeAt = c; edgeDir = 1;
      }
      g.fillStyle(this.color, 1);
      this.fillPoly(g, poly);
      if (this.p.edge > 0 && t < 0.999) {
        const band = S.clip(S.clip(this.screenPoly(), this.nx, this.ny, edgeAt + (edgeDir > 0 ? this.p.edge : 0), true), this.nx, this.ny, edgeAt - (edgeDir > 0 ? 0 : this.p.edge), false);
        g.fillStyle(this.edgeCol, 1);
        this.fillPoly(g, band);
      }
    }
  }

  // ---- src/transitions/DoorsStyle.js
  /** Doors — two panels slide together from opposite edges and part again. */
  class DoorsStyle extends TransitionStyle {
    static id = 'doors';
    static defaultSound = 'thud';
    static defaultRevealSound = 'slide';
    static label = 'Doors';
    static description = 'Two panels close from opposite sides, like sliding doors or an elevator.';
    static params = [
      { key: 'axis', label: 'Doors move', type: 'select', options: ['horizontal', 'vertical'], default: 'horizontal' },
      { key: 'trim', label: 'Edge trim (px)', type: 'number', min: 0, max: 24, step: 1, default: 6 },
      { key: 'trimColor', label: 'Trim colour', type: 'color', default: '#ffc94a' }
    ];

    setup() {
      this.g = this.graphics();
      this.trimCol = Phaser.Display.Color.HexStringToColor(this.p.trimColor || '#ffffff').color;
    }

    render(t) {
      const g = this.g;
      const { w, h } = this;
      const tr = this.p.trim;
      g.clear();
      if (t <= 0.0005) return;
      g.fillStyle(this.color, 1);
      if (this.p.axis === 'vertical') {
        const s = (h / 2) * t;
        g.fillRect(0, 0, w, s + 1).fillRect(0, h - s - 1, w, s + 1);
        if (tr && t < 0.999) g.fillStyle(this.trimCol, 1).fillRect(0, s - tr, w, tr).fillRect(0, h - s, w, tr);
      } else {
        const s = (w / 2) * t;
        g.fillRect(0, 0, s + 1, h).fillRect(w - s - 1, 0, s + 1, h);
        if (tr && t < 0.999) g.fillStyle(this.trimCol, 1).fillRect(s - tr, 0, tr, h).fillRect(w - s, 0, tr, h);
      }
    }
  }

  // ---- src/transitions/CurtainStyle.js
  /** Curtain — theatre curtains with folds and a scalloped valance. Perfect for stories and shows. */
  class CurtainStyle extends TransitionStyle {
    static id = 'curtain';
    static defaultSound = 'rumble';
    static defaultRevealSound = 'rumble';
    static label = 'Theatre curtain';
    static description = 'Velvet curtains close from both sides under a scalloped valance.';
    static defaultColor = '#8b1e2d';
    static params = [
      { key: 'folds', label: 'Folds', type: 'number', min: 2, max: 30, step: 1, default: 12 },
      { key: 'valance', label: 'Valance', type: 'bool', default: true },
      { key: 'trimColor', label: 'Trim colour', type: 'color', default: '#ffc94a' }
    ];

    setup() {
      this.g = this.graphics();
      const C = Phaser.Display.Color.IntegerToColor(this.color);
      this.dark = Phaser.Display.Color.GetColor(C.red * 0.6, C.green * 0.6, C.blue * 0.6);
      this.light = Phaser.Display.Color.GetColor(Math.min(255, C.red * 1.25 + 20), Math.min(255, C.green * 1.25 + 10), Math.min(255, C.blue * 1.25 + 10));
      this.trim = Phaser.Display.Color.HexStringToColor(this.p.trimColor || '#ffc94a').color;
    }

    panel(g, x0, wPanel, fromLeft) {
      const { h } = this;
      const folds = Math.max(2, Math.round(this.p.folds / 2));
      const fw = wPanel / folds;
      g.fillStyle(this.color, 1).fillRect(x0, 0, wPanel + 1, h);
      for (let i = 0; i < folds; i++) {
        const fx = x0 + i * fw;
        g.fillStyle(this.dark, 0.55).fillRect(fx + fw * 0.62, 0, fw * 0.38, h);
        g.fillStyle(this.light, 0.35).fillRect(fx + fw * 0.12, 0, fw * 0.16, h);
      }
      g.fillStyle(this.trim, 1).fillRect(fromLeft ? x0 + wPanel - 4 : x0, 0, 4, h);
    }

    render(t) {
      const g = this.g;
      const { w } = this;
      g.clear();
      if (t <= 0.0005) return;
      const pw = (w / 2) * t;
      this.panel(g, 0, pw, true);
      this.panel(g, w - pw, pw, false);
      if (this.p.valance) {
        const vh = 46 * Math.min(1, t * 3);
        g.fillStyle(this.dark, 1).fillRect(0, 0, w, vh);
        const n = Math.ceil(w / 60);
        for (let i = 0; i < n; i++) g.fillCircle(i * 60 + 30, vh, 30 * Math.min(1, t * 3));
        g.fillStyle(this.trim, 1).fillRect(0, vh - 4, w, 4);
      }
    }
  }

  // ---- src/transitions/BlindsStyle.js
  /** Blinds — strips grow one after another at any angle (horizontal, vertical, diagonal). */
  class BlindsStyle extends TransitionStyle {
    static id = 'blinds';
    static defaultSound = 'shutter';
    static label = 'Blinds / stripes';
    static description = 'Strips grow one after another. Set an angle for diagonal stripes.';
    static params = [
      { key: 'count', label: 'Strips', type: 'number', min: 2, max: 40, step: 1, default: 10 },
      { key: 'angle', label: 'Angle (°)', type: 'number', min: 0, max: 179, step: 1, default: 0 },
      { key: 'stagger', label: 'Stagger', type: 'number', min: 0, max: 0.9, step: 0.05, default: 0.5 },
      { key: 'from', label: 'Order', type: 'select', options: ['start', 'end', 'center', 'edges', 'random'], default: 'start' }
    ];

    setup() {
      this.g = this.graphics();
      const a = Phaser.Math.DegToRad(this.p.angle + 90);
      this.nx = Math.cos(a);
      this.ny = Math.sin(a);
      this.r = this.range(this.nx, this.ny);
      const n = this.p.count;
      const rnd = new Phaser.Math.RandomDataGenerator(['blinds']);
      this.order = Array.from({ length: n }, (_, i) => {
        const u = n === 1 ? 0 : i / (n - 1);
        switch (this.p.from) {
          case 'end': return 1 - u;
          case 'center': return Math.abs(u - 0.5) * 2;
          case 'edges': return 1 - Math.abs(u - 0.5) * 2;
          case 'random': return rnd.frac();
          default: return u;
        }
      });
    }

    render(t) {
      const g = this.g;
      g.clear();
      if (t <= 0.0005) return;
      g.fillStyle(this.color, 1);
      if (t >= 0.999) { g.fillRect(0, 0, this.w, this.h); return; }
      const { min, max } = this.r;
      const n = this.p.count;
      const sp = (max - min) / n;
      const st = this.p.stagger;
      const S = TransitionStyle;
      for (let i = 0; i < n; i++) {
        const local = Phaser.Math.Clamp((t - this.order[i] * st) / (1 - st), 0, 1);
        if (local <= 0) continue;
        const c = min + (i + 0.5) * sp;
        const half = (sp / 2) * local + 0.5;
        const strip = S.clip(S.clip(this.screenPoly(), this.nx, this.ny, c + half, true), this.nx, this.ny, c - half, false);
        this.fillPoly(g, strip);
      }
    }
  }

  // ---- src/transitions/TilesStyle.js
  /** Tiles — a grid of squares, circles or diamonds pops in by a pattern (diagonal, spiral, random…). */
  class TilesStyle extends TransitionStyle {
    static id = 'tiles';
    static defaultSound = 'shutter';
    static label = 'Tiles / checker';

    /** Fewer, bigger tiles at lower quality. */
    static adapt(p, q) {
      if (q.tiles >= 1) return;
      const k = Math.sqrt(q.tiles);
      p.cols = Math.max(2, Math.round(p.cols * k));
      p.rows = Math.max(2, Math.round(p.rows * k));
    }
    static description = 'A grid of tiles pops in following a pattern. Small random tiles make a pixel dissolve.';
    static params = [
      { key: 'cols', label: 'Columns', type: 'number', min: 2, max: 48, step: 1, default: 12 },
      { key: 'rows', label: 'Rows', type: 'number', min: 2, max: 32, step: 1, default: 8 },
      { key: 'order', label: 'Pattern', type: 'select', options: ['diagonal', 'random', 'spiral', 'center', 'edges', 'rows', 'columns', 'checker'], default: 'diagonal' },
      { key: 'shape', label: 'Tile shape', type: 'select', options: ['square', 'circle', 'diamond'], default: 'square' },
      { key: 'stagger', label: 'Stagger', type: 'number', min: 0, max: 0.9, step: 0.05, default: 0.6 }
    ];

    setup() {
      this.g = this.graphics();
      const { cols, rows } = this.p;
      const rnd = new Phaser.Math.RandomDataGenerator(['tiles']);
      const cx = (cols - 1) / 2;
      const cy = (rows - 1) / 2;
      const maxD = Math.hypot(cx, cy) || 1;
      this.tiles = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          let k;
          const d = Math.hypot(c - cx, r - cy) / maxD;
          switch (this.p.order) {
            case 'random': k = rnd.frac(); break;
            case 'spiral': k = ((Math.atan2(r - cy, c - cx) + Math.PI) / (Math.PI * 2)) * 0.35 + d * 0.65; break;
            case 'center': k = d; break;
            case 'edges': k = 1 - d; break;
            case 'rows': k = r / Math.max(1, rows - 1) * 0.85 + c / Math.max(1, cols - 1) * 0.15; break;
            case 'columns': k = c / Math.max(1, cols - 1) * 0.85 + r / Math.max(1, rows - 1) * 0.15; break;
            case 'checker': k = ((r + c) % 2) * 0.5 + rnd.frac() * 0.2; break;
            default: k = (c + r) / Math.max(1, cols + rows - 2);
          }
          this.tiles.push({ c, r, k: Phaser.Math.Clamp(k, 0, 1) });
        }
      }
    }

    render(t) {
      const g = this.g;
      g.clear();
      if (t <= 0.0005) return;
      g.fillStyle(this.color, 1);
      if (t >= 0.999) { g.fillRect(0, 0, this.w, this.h); return; }
      const tw = this.w / this.p.cols;
      const th = this.h / this.p.rows;
      const st = this.p.stagger;
      this.tiles.forEach((tl) => {
        const local = Phaser.Math.Clamp((t - tl.k * st) / (1 - st), 0, 1);
        if (local <= 0) return;
        const x = tl.c * tw + tw / 2;
        const y = tl.r * th + th / 2;
        if (this.p.shape === 'circle') g.fillCircle(x, y, (Math.hypot(tw, th) / 2 + 0.5) * local);
        else if (this.p.shape === 'diamond') {
          const k = local * 1.0;
          g.fillPoints([{ x, y: y - th * k }, { x: x + tw * k, y }, { x, y: y + th * k }, { x: x - tw * k, y }], true);
        } else g.fillRect(x - (tw / 2) * local - 0.5, y - (th / 2) * local - 0.5, tw * local + 1, th * local + 1);
      });
    }
  }

  // ---- src/transitions/ClockStyle.js
  /** Clock — a radial sweep like a clock hand. Nice for "later that day…" and timers. */
  class ClockStyle extends TransitionStyle {
    static id = 'clock';
    static defaultSound = 'tickTock';
    static label = 'Clock wipe';
    static description = 'A radial sweep like a clock hand. "Continue" keeps sweeping on reveal.';
    static usesFocus = true;
    static params = [
      { key: 'start', label: 'Start angle (°)', type: 'number', min: -180, max: 180, step: 5, default: -90 },
      { key: 'direction', label: 'Direction', type: 'select', options: ['clockwise', 'anticlockwise'], default: 'clockwise' },
      { key: 'sectors', label: 'Hands', type: 'number', min: 1, max: 8, step: 1, default: 1 }
    ];

    setup() {
      this.g = this.graphics();
      const f = this.focus;
      this.R = Math.max(...this.screenPoly().map((p) => Math.hypot(p.x - f.x, p.y - f.y))) + 4;
    }

    render(t, phase) {
      const g = this.g;
      g.clear();
      if (t <= 0.0005) return;
      g.fillStyle(this.color, 1);
      if (t >= 0.999) { g.fillRect(0, 0, this.w, this.h); return; }
      const n = this.p.sectors;
      const seg = (Math.PI * 2) / n;
      const dir = this.p.direction === 'anticlockwise' ? -1 : 1;
      const a0 = Phaser.Math.DegToRad(this.p.start);
      for (let i = 0; i < n; i++) {
        const base = a0 + dir * i * seg;
        let from;
        let to;
        if (phase === 'reveal' && this.continues) { from = base + dir * (1 - t) * seg; to = base + dir * seg; } else { from = base; to = base + dir * t * seg; }
        g.beginPath();
        g.slice(this.focus.x, this.focus.y, this.R, from, to, dir < 0);
        g.fillPath();
      }
    }
  }

  // ---- src/transitions/BubblesStyle.js
  /** Bubbles — circles, stars or hearts burst in until they cover the screen. Playful, kid-friendly. */
  class BubblesStyle extends TransitionStyle {
    static id = 'bubbles';
    static defaultSound = 'bloop';
    static label = 'Bubbles / shapes';

    /** Fewer, bigger shapes at lower quality. */
    static adapt(p, q) { if (q.tiles < 1) p.count = Math.max(8, Math.round(p.count * q.tiles)); }
    static description = 'Playful circles, stars or hearts pop in until they cover the screen.';
    static params = [
      { key: 'count', label: 'Amount', type: 'number', min: 8, max: 160, step: 1, default: 40 },
      { key: 'shape', label: 'Shape', type: 'select', options: ['circle', 'star', 'heart'], default: 'circle' },
      { key: 'stagger', label: 'Stagger', type: 'number', min: 0, max: 0.9, step: 0.05, default: 0.55 },
      { key: 'bounce', label: 'Bouncy', type: 'bool', default: true }
    ];

    setup() {
      this.g = this.graphics();
      const n = this.p.count;
      const aspect = this.w / this.h;
      const rows = Math.max(2, Math.round(Math.sqrt(n / aspect)));
      const cols = Math.max(2, Math.ceil(n / rows));
      const cw = this.w / cols;
      const ch = this.h / rows;
      const rnd = new Phaser.Math.RandomDataGenerator(['bubbles']);
      const k = this.p.shape === 'star' ? 1.9 : this.p.shape === 'heart' ? 1.25 : 0.8;
      this.items = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          this.items.push({
            x: (c + 0.5 + rnd.realInRange(-0.35, 0.35)) * cw,
            y: (r + 0.5 + rnd.realInRange(-0.35, 0.35)) * ch,
            R: Math.hypot(cw, ch) * k * rnd.realInRange(0.9, 1.25),
            k: rnd.frac(),
            rot: rnd.realInRange(0, Math.PI * 2)
          });
        }
      }
    }

    draw(g, it, r) {
      if (this.p.shape === 'circle') { g.fillCircle(it.x, it.y, r); return; }
      const pts = [];
      if (this.p.shape === 'star') {
        for (let i = 0; i < 10; i++) {
          const a = it.rot + (i * Math.PI) / 5;
          const rr = i % 2 ? r * 0.45 : r;
          pts.push({ x: it.x + Math.cos(a) * rr, y: it.y + Math.sin(a) * rr });
        }
      } else {
        for (let i = 0; i < 24; i++) {
          const a = (i / 24) * Math.PI * 2;
          const hx = 16 * Math.sin(a) ** 3;
          const hy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a));
          pts.push({ x: it.x + (hx / 16) * r, y: it.y + (hy / 16) * r });
        }
      }
      g.fillPoints(pts, true);
    }

    render(t) {
      const g = this.g;
      g.clear();
      if (t <= 0.0005) return;
      g.fillStyle(this.color, 1);
      if (t >= 0.999) { g.fillRect(0, 0, this.w, this.h); return; }
      const st = this.p.stagger;
      const ease = this.p.bounce ? Phaser.Math.Easing.Back.Out : (v) => v;
      this.items.forEach((it) => {
        const local = Phaser.Math.Clamp((t - it.k * st) / (1 - st), 0, 1);
        if (local > 0) this.draw(g, it, it.R * ease(local));
      });
    }
  }

  // ---- src/transitions/PixelateStyle.js
  /**
   * Pixelate — the picture breaks into growing pixels, then fades. WebGL uses the
   * camera's pixelate filter; Canvas falls back to a fade.
   */
  class PixelateStyle extends TransitionStyle {
    static id = 'pixelate';
    static defaultSound = 'glitch';
    static label = 'Pixelate';
    static requires = ['postFX'];
    static description = 'The picture breaks into big pixels, then fades. Retro and game-y. Needs WebGL camera effects; other devices play the fallback.';
    static params = [
      { key: 'amount', label: 'Max pixel size', type: 'number', min: 4, max: 80, step: 1, default: 36 },
      { key: 'fadeFrom', label: 'Fade starts at', type: 'number', min: 0, max: 1, step: 0.05, default: 0.55 }
    ];

    setup() {
      const cam = this.scene.cameras.main;
      this.rect = this.add(this.scene.add.rectangle(this.w / 2, this.h / 2, this.w * 3, this.h * 3, this.color).setAlpha(0));
      if (cam.postFX && this.scene.game.renderer.type === Phaser.WEBGL && Device.has('postFX') && !Settings.reducedMotion) this.px = cam.postFX.addPixelate(0);
    }

    render(t) {
      if (this.px) this.px.amount = t * this.p.amount;
      const f = this.px ? this.p.fadeFrom : 0;
      this.rect.setAlpha(Phaser.Math.Clamp((t - f) / Math.max(0.0001, 1 - f), 0, 1));
    }

    destroy() {
      const cam = this.scene.cameras && this.scene.cameras.main;
      if (this.px && cam && cam.postFX) cam.postFX.remove(this.px);
      super.destroy();
    }
  }

  // ---- src/transitions/ZoomStyle.js
  /** Zoom — the camera dives in (optionally spinning) through a flash of colour. */
  class ZoomStyle extends TransitionStyle {
    static id = 'zoom';
    static defaultSound = 'riser';
    static label = 'Zoom / spin';
    static description = 'The camera dives in, optionally spinning, through a flash of colour. Reduced motion keeps just the fade.';
    static defaultColor = '#ffffff';
    static params = [
      { key: 'zoom', label: 'Zoom amount', type: 'number', min: 0, max: 3, step: 0.05, default: 0.6 },
      { key: 'spin', label: 'Spin (°)', type: 'number', min: -360, max: 360, step: 5, default: 0 },
      { key: 'fadeFrom', label: 'Fade starts at', type: 'number', min: 0, max: 1, step: 0.05, default: 0.3 }
    ];

    setup() {
      this.cam = this.scene.cameras.main;
      this.z0 = this.cam.zoom;
      this.r0 = this.cam.rotation;
      this.rect = this.add(this.scene.add.rectangle(this.w / 2, this.h / 2, this.w * 4, this.h * 4, this.color).setAlpha(0));
    }

    render(t) {
      if (!Settings.reducedMotion) {
        this.cam.setZoom(this.z0 * (1 + this.p.zoom * t));
        this.cam.setRotation(this.r0 + Phaser.Math.DegToRad(this.p.spin) * t);
      }
      const f = this.p.fadeFrom;
      this.rect.setAlpha(Phaser.Math.Clamp((t - f) / Math.max(0.0001, 1 - f), 0, 1));
    }

    destroy() {
      if (this.cam) { this.cam.setZoom(this.z0); this.cam.setRotation(this.r0); }
      super.destroy();
    }
  }

  // ---- src/transitions/ShutterStyle.js
  /**
   * Shutter — slanted, coloured bars slide in from alternate sides one after
   * another until they cover the screen, with an optional spinning medallion
   * (a "?" badge, a star, your game's logo letter…) in the middle. On reveal
   * the bars carry on out the other side, or slide back the way they came.
   */
  class ShutterStyle extends TransitionStyle {
    static id = 'shutter';
    static label = 'Shutter bars';
    static description = 'Slanted colourful bars slide in from alternate sides, with an optional spinning medallion. Great for game shows, quizzes and level select.';
    static defaultColor = '#3a2e7a';
    static defaultSound = 'whoosh';
    static defaultRevealSound = 'swish';
    static params = [
      { key: 'palette', label: 'Bar colours', type: 'colors', default: ['#ff5e5b', '#ffc93c', '#2ec4b6', '#3a2e7a', '#ff7eb6', '#4ea8ff'] },
      { key: 'count', label: 'Bars', type: 'number', min: 3, max: 24, step: 1, default: 8 },
      { key: 'angle', label: 'Slant (°)', type: 'number', min: -45, max: 45, step: 1, default: -14 },
      { key: 'stagger', label: 'Stagger', type: 'number', min: 0, max: 0.85, step: 0.05, default: 0.45 },
      { key: 'from', label: 'Bars come from', type: 'select', options: ['alternate', 'top', 'bottom'], default: 'alternate' },
      { key: 'shine', label: 'Highlight stripe', type: 'bool', default: true },
      { key: 'badge', label: 'Medallion', type: 'bool', default: true },
      { key: 'badgeText', label: 'Medallion text', type: 'text', default: '?', showIf: 'badge' },
      { key: 'badgeSize', label: 'Medallion size', type: 'number', min: 0.08, max: 0.4, step: 0.01, default: 0.19, showIf: 'badge' },
      { key: 'badgeFill', label: 'Medallion colour', type: 'color', default: '#fff4dc', showIf: 'badge' },
      { key: 'badgeRing', label: 'Ring colour', type: 'color', default: '#ffc93c', showIf: 'badge' },
      { key: 'badgeTextColor', label: 'Text colour', type: 'color', default: '#ff5e5b', showIf: 'badge' }
    ];

    setup() {
      const P = ParticlePreset;
      const w = this.w;
      const h = this.h;
      const diag = Math.hypot(w, h);
      const n = Math.max(1, Math.round(this.p.count));
      const pal = (this.p.palette && this.p.palette.length ? this.p.palette : [this.color]).map((c) => P.hex(c));
      this.layer = this.add(this.scene.add.container(w / 2, h / 2).setAngle(this.p.angle));
      const barW = (diag * 1.05) / n;
      this.barH = diag * 1.2;
      this.bars = [];
      for (let i = 0; i < n; i++) {
        const x = -diag * 0.525 + barW * (i + 0.5);
        const dir = this.p.from === 'top' ? -1 : this.p.from === 'bottom' ? 1 : (i % 2 === 0 ? -1 : 1);
        const bar = this.scene.add.rectangle(x, dir * this.barH, barW + 3, this.barH, pal[i % pal.length]);
        bar.dir = dir;
        this.layer.add(bar);
        if (this.p.shine) {
          bar.stripe = this.scene.add.rectangle(x - barW * 0.32, bar.y, Math.max(3, barW * 0.06), this.barH, 0xffffff, 0.18);
          this.layer.add(bar.stripe);
        }
        this.bars.push(bar);
      }
      if (this.p.badge) {
        const r = Math.min(w, h) * this.p.badgeSize;
        const medal = this.scene.add.container(0, 0);
        const g = this.scene.add.graphics();
        g.fillStyle(this.color, 1).fillCircle(0, 0, r * 1.17);
        g.fillStyle(P.hex(this.p.badgeFill), 1).fillCircle(0, 0, r);
        g.lineStyle(Math.max(3, r * 0.085), P.hex(this.p.badgeRing), 1).strokeCircle(0, 0, r);
        medal.add(g);
        if (this.p.badgeText) {
          const txt = this.j.text(0, r * 0.06, String(this.p.badgeText), Math.round(r * (String(this.p.badgeText).length > 1 ? 0.75 : 1.35)), this.p.badgeTextColor);
          medal.add(txt);
        }
        medal.setScale(0);
        this.medal = medal;
        this.layer.add(medal);
      }
      this.cubicIn = P.ease('Cubic.easeIn');
      this.cubicOut = P.ease('Cubic.easeOut');
      this.backOut = P.ease('Back.easeOut');
      this.backIn = P.ease('Back.easeIn');
    }

    /** 0…1 progress of bar i when the whole effect is at u (bars start one after another). */
    local(i, u) {
      const n = this.bars.length;
      const S = this.p.stagger;
      const start = n > 1 ? (i / (n - 1)) * S : 0;
      return Phaser.Math.Clamp((u - start) / Math.max(0.0001, 1 - S), 0, 1);
    }

    render(t, phase) {
      const exiting = phase === 'reveal';
      const through = exiting && this.continues;
      const u = exiting ? 1 - t : t; // progress of the current half
      this.bars.forEach((bar, i) => {
        const k = this.local(i, u);
        let y;
        if (!exiting) y = bar.dir * this.barH * (1 - this.cubicOut(k));
        else y = (through ? -bar.dir : bar.dir) * this.barH * this.cubicIn(k);
        bar.y = y;
        if (bar.stripe) bar.stripe.y = y;
      });
      if (this.medal) {
        if (!exiting) {
          const m = Phaser.Math.Clamp((t - 0.3) / 0.62, 0, 1);
          this.medal.setScale(Math.max(0, this.backOut(m))).setAngle(-this.p.angle + 360 * this.cubicOut(m));
        } else {
          const m = Phaser.Math.Clamp(u / 0.3, 0, 1);
          this.medal.setScale(Math.max(0, 1 - this.backIn(m))).setAngle(-this.p.angle);
        }
      }
    }
  }

  // ---- src/transitions/TransitionPlayer.js
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

  // ---- src/presets/PresetLibrary.js
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

  // ---- src/presets/ParticlePreset.js
  /**
   * ParticlePreset — turns a particle preset (JSON) into Phaser emitters.
   *
   *   const h = this.fx.particles('Magic Dust', x, y);               // built-in / added preset by name
   *   const h = this.fx.particles(jsonFromStudio, x, y, { scale: 0.5, follow: player });
   *   h.setPosition(x, y);  h.stop();  h.destroy();  await h.done;
   *
   * A preset has one or more LAYERS; each layer is one emitter:
   * {
   *   format: 'phaserfx-particles', version: 1, name,
   *   textures: { 'my-tex': 'data:image/png;base64,…' },   // optional custom images
   *   layers: [{
   *     name, enabled, texture, blend: 'ADD'|'NORMAL'|'SCREEN'|'MULTIPLY', depth, maxParticles,
   *     emit:     { mode: 'burst'|'stream', count, bursts, interval, frequency, quantity, duration, delay },
   *     zone:     { type: 'point'|'circle'|'ring'|'rect'|'ellipse'|'line', radius, width, height, edge, points },
   *     lifespan: { min, max },   speed: { min, max },   angle: { min, max },
   *     gravityX, gravityY, accelX: { min, max }, accelY: { min, max },
   *     moveTo:   { enabled, x, y },
   *     scale:    { mode: 'overLife'|'random', start, end, min, max, ease },
   *     alpha:    { mode: 'overLife'|'random'|'fadeInOut'|'flicker', start, end, min, max, ease },
   *     rotation: { mode: 'none'|'random'|'spin'|'overLife'|'velocity', min, max, spinMin, spinMax, offset },
   *     color:    { mode: 'single'|'random'|'overLife', colors: ['#ffffff', …], ease },
   *     flutter:  0   // paper-like flip speed (0 = off)
   *   }]
   * }
   */
  class ParticlePreset {
    static DEFAULT_LAYER = {
      name: 'Layer', enabled: true, texture: 'pfx-dot', blend: 'ADD', depth: 0, maxParticles: 0,
      emit: { mode: 'burst', count: 30, bursts: 1, interval: 250, frequency: 40, quantity: 1, duration: 0, delay: 0 },
      zone: { type: 'point', radius: 40, width: 200, height: 100, edge: false, points: 32 },
      lifespan: { min: 500, max: 900 },
      speed: { min: 100, max: 300 },
      angle: { min: 0, max: 360 },
      gravityX: 0, gravityY: 0,
      accelX: { min: 0, max: 0 }, accelY: { min: 0, max: 0 },
      moveTo: { enabled: false, x: 0, y: 0 },
      scale: { mode: 'overLife', start: 1, end: 0, min: 0.5, max: 1, ease: 'Linear' },
      alpha: { mode: 'overLife', start: 1, end: 0, min: 0.4, max: 1, ease: 'Linear' },
      rotation: { mode: 'none', min: 0, max: 360, spinMin: -6, spinMax: 6, offset: 0 },
      color: { mode: 'single', colors: ['#ffffff'], ease: 'Linear' },
      flutter: 0
    };

    static BLENDS = ['ADD', 'NORMAL', 'SCREEN', 'MULTIPLY'];

    static clone(o) { return JSON.parse(JSON.stringify(o)); }

    /** Fill in every missing field with defaults (deep). */
    static layer(l = {}) {
      const d = ParticlePreset.clone(ParticlePreset.DEFAULT_LAYER);
      Object.keys(l).forEach((k) => {
        if (d[k] && typeof d[k] === 'object' && !Array.isArray(d[k]) && l[k] && typeof l[k] === 'object') Object.assign(d[k], l[k]);
        else if (l[k] !== undefined) d[k] = l[k];
      });
      return d;
    }

    static normalize(p) {
      const src = typeof p === 'string' ? PresetLibrary.get('particles', p) : p;
      if (!src) throw new Error(`PhaserFX: unknown particle preset "${p}"`);
      const out = { format: 'phaserfx-particles', version: 1, name: src.name || 'Untitled', textures: src.textures || {}, layers: (src.layers || []).map((l) => ParticlePreset.layer(l)) };
      if (src.fallback) out.fallback = src.fallback;
      if (src.heavy) out.heavy = true;
      return out;
    }

    /** Normalize, then swap a `heavy` preset for its `fallback` at low quality. */
    static pick(preset, depth = 0) {
      const P = ParticlePreset.normalize(preset);
      if (P.heavy && P.fallback && P.fallback !== P.name && Quality.isLow() && depth < 3) {
        Quality.events.emit('fallback', 'particles', P.name, 'heavy at low quality');
        return ParticlePreset.pick(P.fallback, depth + 1);
      }
      return P;
    }

    static hex(c) { return typeof c === 'number' ? c : Phaser.Display.Color.HexStringToColor(c || '#ffffff').color; }

    static ease(name) { return Phaser.Tweens.Builders.GetEaseFunction(name || 'Linear'); }

    static rnd(min, max) { return min + Math.random() * (max - min); }

    /** Phaser ParticleEmitter config for one layer. k = size multiplier. */
    static toConfig(L, k = 1, o = {}) {
      const R = ParticlePreset.rnd;
      const cfg = {
        lifespan: { min: L.lifespan.min, max: Math.max(L.lifespan.min, L.lifespan.max) },
        speed: { min: L.speed.min * k, max: Math.max(L.speed.min, L.speed.max) * k },
        angle: { min: L.angle.min, max: L.angle.max },
        gravityX: L.gravityX * k,
        gravityY: L.gravityY * k,
        blendMode: L.blend || 'ADD'
      };
      if (L.accelX.min || L.accelX.max) cfg.accelerationX = { min: L.accelX.min * k, max: L.accelX.max * k };
      if (L.accelY.min || L.accelY.max) cfg.accelerationY = { min: L.accelY.min * k, max: L.accelY.max * k };
      const cap = Quality.profile().maxPerEmitter;
      if (L.maxParticles > 0 || cap > 0) cfg.maxParticles = cap > 0 && L.maxParticles > 0 ? Math.min(L.maxParticles, cap) : (L.maxParticles || cap);

      // emission
      if (L.emit.mode === 'stream') {
        const density = Quality.profile().particles * (Settings.reducedMotion ? 0.45 : 1);
        cfg.frequency = Math.max(1, L.emit.frequency) / density;
        cfg.quantity = Math.max(1, L.emit.quantity);
        cfg.emitting = false;
      } else cfg.emitting = false;

      // emit zone
      const Z = L.zone;
      if (Z.type && Z.type !== 'point') {
        const G = Phaser.Geom;
        let source;
        if (Z.type === 'circle' || Z.type === 'ring') source = new G.Circle(0, 0, Z.radius * k);
        else if (Z.type === 'rect') source = new G.Rectangle((-Z.width / 2) * k, (-Z.height / 2) * k, Z.width * k, Z.height * k);
        else if (Z.type === 'ellipse') source = new G.Ellipse(0, 0, Z.width * k, Z.height * k);
        else if (Z.type === 'line') source = new G.Line((-Z.width / 2) * k, 0, (Z.width / 2) * k, 0);
        if (source) cfg.emitZone = (Z.edge || Z.type === 'ring') ? { type: 'edge', source, quantity: Math.max(2, Z.points) } : { type: 'random', source };
      }
      if (L.moveTo.enabled) {
        // moveTo is relative to the emission point (the anchor), evaluated per particle
        const a = o.anchor;
        cfg.moveToX = a ? { onEmit: () => a.x + L.moveTo.x * k } : L.moveTo.x * k;
        cfg.moveToY = a ? { onEmit: () => a.y + L.moveTo.y * k } : L.moveTo.y * k;
      }

      // scale (+ flutter)
      const S = L.scale;
      const sMul = k * (o.particleScale || 1);
      const sEase = ParticlePreset.ease(S.ease);
      const baseScale = (p, t) => (S.mode === 'random' ? p.pfxS : (S.start + (S.end - S.start) * sEase(t)) * sMul);
      if (L.flutter > 0) {
        cfg.scaleY = S.mode === 'random' ? { onEmit: (p) => { p.pfxS = R(S.min, S.max) * sMul; return p.pfxS; } } : { start: S.start * sMul, end: S.end * sMul, ease: S.ease };
        cfg.scaleX = {
          onEmit: (p) => { p.pfxWob = Math.random() * 6.28; if (S.mode === 'random') p.pfxS = p.pfxS || R(S.min, S.max) * sMul; return baseScale(p, 0); },
          onUpdate: (p, key, t) => baseScale(p, t) * Math.cos(p.pfxWob + t * L.flutter)
        };
      } else if (S.mode === 'random') cfg.scale = { min: S.min * sMul, max: S.max * sMul };
      else cfg.scale = { start: Math.max(0.01, S.start * sMul), end: S.end * sMul, ease: S.ease };

      // alpha
      const A = L.alpha;
      if (A.mode === 'random') cfg.alpha = { min: A.min, max: A.max };
      else if (A.mode === 'fadeInOut') cfg.alpha = { onUpdate: (p, key, t) => Math.sin(t * Math.PI) * A.max };
      else if (A.mode === 'flicker') cfg.alpha = { onUpdate: () => (Settings.reducedMotion ? (A.min + A.max) / 2 : R(A.min, A.max)) };
      else cfg.alpha = { start: A.start, end: A.end, ease: A.ease };

      // rotation
      const Ro = L.rotation;
      if (Ro.mode === 'random') cfg.rotate = { min: Ro.min, max: Ro.max };
      else if (Ro.mode === 'overLife') cfg.rotate = { start: Ro.min, end: Ro.max };
      else if (Ro.mode === 'spin') cfg.rotate = { onEmit: (p) => { p.pfxSpin = R(Ro.spinMin, Ro.spinMax); return R(Ro.min, Ro.max); }, onUpdate: (p, key, t, v) => v + p.pfxSpin };
      else if (Ro.mode === 'velocity') cfg.rotate = { onUpdate: (p) => Phaser.Math.RadToDeg(Math.atan2(p.velocityY, p.velocityX)) + (Ro.offset || 0) };

      // colour
      const C = L.color;
      const cols = (o.colors || C.colors || ['#ffffff']).map(ParticlePreset.hex);
      if (C.mode === 'overLife' && cols.length > 1) { cfg.color = cols; cfg.colorEase = C.ease || 'Linear'; }
      else if (C.mode === 'random' && cols.length > 1) cfg.tint = cols;
      else cfg.tint = cols[0];
      return cfg;
    }

    /** Load any custom textures the preset carries. Resolves when ready. */
    static prepare(scene, P) {
      const missing = Object.entries(P.textures || {}).filter(([key]) => !scene.textures.exists(key));
      if (!missing.length) return Promise.resolve();
      return Promise.all(missing.map(([key, data]) => new Promise((resolve) => {
        const done = () => resolve();
        scene.textures.once(`addtexture-${key}`, done);
        scene.textures.once('onerror', done);
        scene.textures.addBase64(key, data);
        setTimeout(done, 3000);
      })));
    }

    /** Play a preset. Returns a handle: { setPosition, stop, destroy, count, emitters, done }. */
    static play(fx, preset, x = 0, y = 0, o = {}) {
      let P;
      try { P = ParticlePreset.pick(preset); } catch (e) {
        Settings.warn(String(e.message || e).replace('PhaserFX: ', ''));
        const dead = new ParticleHandle(fx, { layers: [] }, { x, y });
        dead.destroy();
        return dead;
      }
      const sc = fx.scene;
      const anchor = o.follow || { x, y };
      const handle = new ParticleHandle(fx, P, anchor);
      const start = () => {
        if (!handle.alive || !sc.sys.isActive()) return;
        try { ParticlePreset.start(fx, P, handle, anchor, o); } catch (e) { Settings.warn(`particle preset "${P.name}" failed`, e); handle.destroy(); }
      };
      ParticlePreset.prepare(sc, P).then(start, () => start());
      return handle;
    }

    /** Create the emitters and schedule the emission (after textures are ready). */
    static start(fx, P, handle, anchor, o) {
      const j = fx.juice;
      const sc = fx.scene;
      const k = o.scale || 1;
      let end = 0;
      let infinite = false;
      P.layers.filter((L) => L.enabled !== false).forEach((L) => {
        const tex = sc.textures.exists(L.texture) ? L.texture : 'pfx-dot';
        const em = j.emitter(0, 0, tex, ParticlePreset.toConfig(L, k, { ...o, anchor }), (o.depth != null ? o.depth : j.depth(20)) + (L.depth || 0));
        if (o.screen) em.setScrollFactor(0);
        em.startFollow(anchor);
        handle.emitters.push(em);
        const life = Math.max(L.lifespan.min, L.lifespan.max);
        const E = L.emit;
        if (E.mode === 'stream') {
          handle.schedule(E.delay, () => em.start());
          if (E.duration > 0) { handle.schedule(E.delay + E.duration, () => em.stop()); end = Math.max(end, E.delay + E.duration + life); } else infinite = true;
        } else {
          const n = Math.max(1, E.bursts || 1);
          for (let b = 0; b < n; b++) handle.schedule(E.delay + b * (E.interval || 0), () => { const count = Quality.budget(sc, Settings.amount(E.count)); if (count > 0) em.explode(count, anchor.x, anchor.y); });
          end = Math.max(end, E.delay + (n - 1) * (E.interval || 0) + life);
        }
      });
      handle.infinite = infinite;
      if (!infinite && o.keep !== true) handle.schedule(end + 300, () => handle.destroy());
    }
  }

  // ---- src/presets/ParticleHandle.js
  /**
   * ParticleHandle — what fx.particles() returns: move it, burst again, stop or destroy.
   */
  class ParticleHandle {
    constructor(fx, preset, anchor) {
      this.fx = fx;
      this.preset = preset;
      this.anchor = anchor;
      this.emitters = [];
      this.timers = [];
      this.alive = true;
      this.done = new Promise((resolve) => { this._resolve = resolve; });
      this._off = () => this.destroy();
      fx.scene.events.once('shutdown', this._off);
    }

    schedule(ms, fn) { this.timers.push(this.fx.scene.time.delayedCall(Math.max(0, ms), () => { if (this.alive) fn(); })); }

    /** Move where NEW particles appear (live particles stay where they are). */
    setPosition(x, y) { if (!this.anchor.scene) { this.anchor.x = x; this.anchor.y = y; } return this; }

    /** Stop emitting; existing particles finish, then everything is removed. */
    stop() {
      if (!this.alive) return this;
      this.emitters.forEach((e) => e.stop());
      const life = Math.max(0, ...this.preset.layers.map((L) => L.lifespan.max));
      this.schedule(life + 200, () => this.destroy());
      return this;
    }

    /** Burst again (burst layers only), e.g. on every click. */
    burst(x, y) {
      if (x != null) this.setPosition(x, y);
      this.preset.layers.filter((L) => L.enabled !== false).forEach((L, i) => {
        if (L.emit.mode !== 'stream' && this.emitters[i]) { const n = Quality.budget(this.fx.scene, Settings.amount(L.emit.count)); if (n > 0) this.emitters[i].explode(n, this.anchor.x, this.anchor.y); }
      });
      return this;
    }

    count() { return this.emitters.reduce((n, e) => n + (e.getAliveParticleCount ? e.getAliveParticleCount() : 0), 0); }

    destroy() {
      if (!this.alive) return;
      this.alive = false;
      this.timers.forEach((t) => t.remove(false));
      this.emitters.forEach((e) => e.destroy());
      this.emitters = [];
      if (this.fx.scene && this.fx.scene.events) this.fx.scene.events.off('shutdown', this._off);
      this._resolve();
    }
  }

  // ---- src/presets/EffectPreset.js
  /**
   * EffectPreset — plays a composed effect: a timeline of steps (particles, shake,
   * flash, text, sounds, target animations…), each starting at its own time.
   *
   *   await this.fx.play('Level Up', x, y);                         // built-in / added by name
   *   await this.fx.play(jsonFromStudio, 0, 0, { target: hero });   // steps act on / around the target
   *
   * { format: 'phaserfx-effect', version: 1, name, steps: [ { type, at, …params } ] }
   * Step types and their params are listed in EffectPreset.STEPS (the Studio
   * builds its editor from this list). A hit-stop step freezes the timeline too,
   * so the steps after it wait, exactly like a real impact.
   */
  class EffectPreset {
    static SOUNDS = ['pop', 'sparkle', 'whoosh', 'boom', 'coin', 'flip', 'crack', 'charge', 'fanfare', 'chime', 'correct', 'soft', 'tick', 'hit'];

    static TARGET_ACTIONS = ['pop', 'squash', 'wiggle', 'jump', 'spin', 'flash', 'tint', 'fadeOut', 'fadeIn', 'grow', 'shrink', 'float'];

    static STEPS = {
      particles: { label: 'Particles', color: '#ff5fa2', duration: 900, params: [
        { key: 'preset', label: 'Preset', type: 'particlePreset', default: 'Sparkle Burst' },
        { key: 'scale', label: 'Size', type: 'number', min: 0.1, max: 4, step: 0.05, default: 1 },
        { key: 'dx', label: 'Offset X', type: 'number', min: -400, max: 400, step: 1, default: 0 },
        { key: 'dy', label: 'Offset Y', type: 'number', min: -400, max: 400, step: 1, default: 0 },
        { key: 'follow', label: 'Follow target', type: 'bool', default: false },
        { key: 'ms', label: 'Stop streams after (ms)', type: 'number', min: 0, max: 10000, step: 50, default: 1500 }
      ] },
      shake: { label: 'Camera shake', color: '#ff7a5c', params: [
        { key: 'ms', label: 'Duration (ms)', type: 'number', min: 20, max: 2000, step: 10, default: 200 },
        { key: 'intensity', label: 'Intensity', type: 'number', min: 0.001, max: 0.05, step: 0.001, default: 0.006 }
      ] },
      flash: { label: 'Screen flash', color: '#ffffff', params: [
        { key: 'ms', label: 'Duration (ms)', type: 'number', min: 40, max: 1500, step: 10, default: 160 },
        { key: 'color', label: 'Colour', type: 'color', default: '#ffffff' },
        { key: 'alpha', label: 'Strength', type: 'number', min: 0.05, max: 1, step: 0.05, default: 0.7 }
      ] },
      hitStop: { label: 'Hit-stop (freeze)', color: '#9b93c4', params: [
        { key: 'ms', label: 'Freeze (ms)', type: 'number', min: 10, max: 400, step: 5, default: 80 }
      ] },
      slowmo: { label: 'Slow motion', color: '#7fc8ff', params: [
        { key: 'scale', label: 'Speed', type: 'number', min: 0.05, max: 1, step: 0.05, default: 0.3 },
        { key: 'ms', label: 'Duration (real ms)', type: 'number', min: 50, max: 4000, step: 50, default: 600 }
      ] },
      shockwave: { label: 'Shockwave ring', color: '#4fe0c8', params: [
        { key: 'color', label: 'Colour', type: 'color', default: '#ffffff' },
        { key: 'size', label: 'Size', type: 'number', min: 0.2, max: 8, step: 0.1, default: 2.5 },
        { key: 'ms', label: 'Duration (ms)', type: 'number', min: 100, max: 2000, step: 10, default: 500 },
        { key: 'dx', label: 'Offset X', type: 'number', min: -400, max: 400, step: 1, default: 0 },
        { key: 'dy', label: 'Offset Y', type: 'number', min: -400, max: 400, step: 1, default: 0 }
      ] },
      rays: { label: 'God rays', color: '#ffc94a', params: [
        { key: 'color', label: 'Colour', type: 'color', default: '#ffd23f' },
        { key: 'count', label: 'Rays', type: 'number', min: 4, max: 32, step: 1, default: 12 },
        { key: 'size', label: 'Size', type: 'number', min: 0.1, max: 3, step: 0.05, default: 0.8 },
        { key: 'ms', label: 'Visible (ms)', type: 'number', min: 200, max: 6000, step: 50, default: 1400 },
        { key: 'dx', label: 'Offset X', type: 'number', min: -400, max: 400, step: 1, default: 0 },
        { key: 'dy', label: 'Offset Y', type: 'number', min: -400, max: 400, step: 1, default: 0 }
      ] },
      glow: { label: 'Glow on target', color: '#ffd86b', needsTarget: true, params: [
        { key: 'color', label: 'Colour', type: 'color', default: '#ffd23f' },
        { key: 'strength', label: 'Strength', type: 'number', min: 1, max: 16, step: 0.5, default: 6 },
        { key: 'ms', label: 'Duration (ms)', type: 'number', min: 100, max: 6000, step: 50, default: 1200 },
        { key: 'pulse', label: 'Pulse', type: 'bool', default: true }
      ] },
      text: { label: 'Text', color: '#ece8ff', params: [
        { key: 'text', label: 'Text', type: 'text', default: 'AWESOME!' },
        { key: 'style', label: 'Style', type: 'select', options: ['float', 'stamp', 'banner'], default: 'stamp' },
        { key: 'color', label: 'Colour', type: 'color', default: '#ffc94a' },
        { key: 'size', label: 'Size', type: 'number', min: 12, max: 120, step: 1, default: 44 },
        { key: 'ms', label: 'Hold (ms)', type: 'number', min: 200, max: 6000, step: 50, default: 1000 },
        { key: 'dx', label: 'Offset X', type: 'number', min: -400, max: 400, step: 1, default: 0 },
        { key: 'dy', label: 'Offset Y', type: 'number', min: -400, max: 400, step: 1, default: -80 }
      ] },
      sound: { label: 'Sound', color: '#2fd48a', params: [
        { key: 'name', label: 'Sound', type: 'select', options: EffectPreset.SOUNDS, default: 'pop' }
      ] },
      confetti: { label: 'Confetti', color: '#ff8a3d', params: [
        { key: 'mode', label: 'Mode', type: 'select', options: ['cannons', 'burst'], default: 'cannons' },
        { key: 'count', label: 'Pieces', type: 'number', min: 5, max: 300, step: 5, default: 70 }
      ] },
      fireworks: { label: 'Firework', color: '#b06bff', duration: 1400, params: [
        { key: 'size', label: 'Size', type: 'number', min: 80, max: 600, step: 10, default: 280 },
        { key: 'dx', label: 'Offset X', type: 'number', min: -400, max: 400, step: 1, default: 0 },
        { key: 'dy', label: 'Offset Y', type: 'number', min: -400, max: 400, step: 1, default: -150 }
      ] },
      camera: { label: 'Camera zoom', color: '#7fc8ff', params: [
        { key: 'zoom', label: 'Zoom', type: 'number', min: 0.5, max: 2.5, step: 0.01, default: 1.08 },
        { key: 'ms', label: 'In time (ms)', type: 'number', min: 50, max: 3000, step: 10, default: 200 },
        { key: 'hold', label: 'Hold (ms)', type: 'number', min: 0, max: 3000, step: 10, default: 150 },
        { key: 'ease', label: 'Ease', type: 'ease', default: 'Quad.easeOut' }
      ] },
      target: { label: 'Animate target', color: '#ff9ab0', needsTarget: true, params: [
        { key: 'action', label: 'Action', type: 'select', options: EffectPreset.TARGET_ACTIONS, default: 'pop' },
        { key: 'amount', label: 'Amount', type: 'number', min: 0.05, max: 3, step: 0.05, default: 1 },
        { key: 'ms', label: 'Duration (ms)', type: 'number', min: 50, max: 3000, step: 10, default: 400 },
        { key: 'color', label: 'Tint colour', type: 'color', default: '#ff5f6d' }
      ] },
      coins: { label: 'Coins to corner', color: '#ffd23f', duration: 1600, params: [
        { key: 'count', label: 'Coins', type: 'number', min: 1, max: 40, step: 1, default: 10 },
        { key: 'corner', label: 'Fly to', type: 'select', options: ['top-right', 'top-left', 'bottom-right', 'bottom-left'], default: 'top-right' }
      ] },
      emote: { label: 'Emote', color: '#c9b6e6', needsTarget: true, duration: 1600, params: [
        { key: 'emote', label: 'Emote', type: 'select', options: ['surprise', 'confused', 'love', 'nervous', 'annoyed', 'sleepy', 'happy', 'idea'], default: 'happy' }
      ] }
    };

    static clone(o) { return JSON.parse(JSON.stringify(o)); }

    /** A new step of a type with default params. */
    static step(type, at = 0) {
      const def = EffectPreset.STEPS[type];
      const s = { type, at };
      def.params.forEach((p) => { s[p.key] = p.default; });
      return s;
    }

    static normalize(p) {
      const src = typeof p === 'string' ? PresetLibrary.get('effects', p) : p;
      if (!src) throw new Error(`PhaserFX: unknown effect preset "${p}"`);
      const steps = (src.steps || []).filter((s) => EffectPreset.STEPS[s.type]).map((s) => ({ ...EffectPreset.step(s.type, s.at || 0), ...s }));
      const out = { format: 'phaserfx-effect', version: 1, name: src.name || 'Untitled', steps };
      if (src.fallback) out.fallback = src.fallback;
      if (src.heavy) out.heavy = true;
      return out;
    }

    /** Normalize, then swap a `heavy` effect for its `fallback` at low quality. */
    static pick(preset, depth = 0) {
      const P = EffectPreset.normalize(preset);
      if (P.heavy && P.fallback && P.fallback !== P.name && Quality.isLow() && depth < 3) {
        Quality.events.emit('fallback', 'effects', P.name, 'heavy at low quality');
        return EffectPreset.pick(P.fallback, depth + 1);
      }
      return P;
    }

    /** How long a step lasts on the timeline (ms). */
    static durationOf(s) {
      const def = EffectPreset.STEPS[s.type] || {};
      switch (s.type) {
        case 'particles': {
          let P = null;
          try { P = ParticlePreset.normalize(s.preset); } catch (e) { return def.duration; }
          return Math.max(...P.layers.map((L) => (L.emit.mode === 'stream' ? (L.emit.duration || s.ms || 1500) : (L.emit.bursts - 1) * L.emit.interval) + L.emit.delay + L.lifespan.max));
        }
        case 'camera': return (s.ms || 200) * 2 + (s.hold || 0);
        case 'text': return (s.ms || 1000) + 500;
        case 'sound': return 300;
        case 'confetti': return 2500;
        default: return s.ms || def.duration || 400;
      }
    }

    static totalDuration(P) { return Math.max(0, ...P.steps.map((s) => (s.at || 0) + EffectPreset.durationOf(s))); }

    /** Play an effect. Resolves when the last step has finished. */
    static play(fx, preset, x = 0, y = 0, o = {}) {
      let P;
      try { P = EffectPreset.pick(preset); } catch (e) {
        Settings.warn(String(e.message || e).replace('PhaserFX: ', ''));
        return Promise.resolve();
      }
      const j = fx.juice;
      const sc = fx.scene;
      const target = o.target && o.target.scene ? o.target : null;
      const origin = () => (target ? j.centerOf(target) : { x, y, w: 0, h: 0 });
      const live = [];
      P.steps.forEach((s) => sc.time.delayedCall(Math.max(0, s.at || 0), () => {
        if (!sc.sys.isActive()) return;
        if (target && !target.scene) return; // the target was destroyed meanwhile
        try { EffectPreset.run(fx, s, origin(), target, o, live); } catch (e) { console.warn('PhaserFX step failed', s.type, e); }
      }));
      // resolves when the timeline ends, when the scene shuts down, or (as a last resort) after a real-time limit
      const total = EffectPreset.totalDuration(P) + 50;
      return new Promise((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          clearTimeout(guard);
          sc.events.off('shutdown', finish);
          live.forEach((l) => { try { if (l && l.destroy) l.destroy(); } catch (e) { /* gone */ } });
          resolve();
        };
        const guard = setTimeout(finish, total / Math.max(0.05, j.timeScale || 1) * 3 + 3000);
        sc.events.once('shutdown', finish);
        j.wait(total).then(finish);
      });
    }

    static col(c) { return ParticlePreset.hex(c); }

    static run(fx, s, at, target, o, live) {
      const j = fx.juice;
      const sc = fx.scene;
      const px = at.x + (s.dx || 0);
      const py = at.y + (s.dy || 0);
      const depth = o.depth != null ? o.depth : j.depth(40);
      switch (s.type) {
        case 'particles': {
          const h = ParticlePreset.play(fx, s.preset, px, py, { scale: s.scale, follow: s.follow && target ? target : null, depth });
          if (s.ms) sc.time.delayedCall(s.ms, () => h.alive && h.infinite && h.stop());
          live.push({ destroy: () => { if (h.alive && h.infinite) h.stop(); } });
          break;
        }
        case 'shake': j.shake(s.ms, s.intensity); break;
        case 'flash': j.flash(s.ms, EffectPreset.col(s.color), s.alpha); break;
        case 'hitStop': j.hitStop(s.ms); break;
        case 'slowmo': {
          const prev = j.timeScale;
          j.setTimeScale(s.scale);
          setTimeout(() => { if (sc.sys && sc.sys.isActive()) j.setTimeScale(prev); }, s.ms);
          break;
        }
        case 'shockwave': j.shockwave(px, py, EffectPreset.col(s.color), s.size, s.ms, depth + 2); break;
        case 'rays': {
          const r = j.rays(px, py, EffectPreset.col(s.color), s.count, depth - 2);
          sc.tweens.add({ targets: r, scale: s.size, duration: 400, ease: 'Back.easeOut' });
          sc.tweens.add({ targets: r, alpha: 0, delay: Math.max(0, s.ms - 400), duration: 400, onComplete: () => r.destroy() });
          break;
        }
        case 'glow': {
          if (!target) break;
          const face = target.face || target;
          const g = j.glow(face, EffectPreset.col(s.color), s.pulse ? 1 : s.strength);
          if (s.pulse) g.pulse(1, s.strength, 500);
          sc.time.delayedCall(s.ms, () => g.destroy());
          live.push(g);
          break;
        }
        case 'text': EffectPreset.text(fx, s, px, py, depth + 10); break;
        case 'sound': j.sfx(s.name); break;
        case 'confetti':
          if (s.mode === 'burst') Particles.confetti(fx, { x: px, y: py, count: s.count, sound: false });
          else Particles.confetti(fx, { count: s.count, sound: false });
          break;
        case 'fireworks': Particles.fireworks(fx, px, py, { size: s.size, depth }); break;
        case 'camera': {
          if (Settings.reducedMotion) break;
          const cam = sc.cameras.main;
          const z0 = cam.zoom;
          sc.tweens.chain({ targets: cam, tweens: [{ zoom: z0 * s.zoom, duration: s.ms, ease: s.ease }, { zoom: z0, delay: s.hold, duration: s.ms, ease: 'Sine.easeInOut' }] });
          break;
        }
        case 'target': if (target) EffectPreset.animate(fx, target, s); break;
        case 'coins': {
          const { w, h } = j.screen();
          const corner = { 'top-right': { x: w - 40, y: 40 }, 'top-left': { x: 40, y: 40 }, 'bottom-right': { x: w - 40, y: h - 40 }, 'bottom-left': { x: 40, y: h - 40 } }[s.corner] || { x: w - 40, y: 40 };
          const sp = j.toScreen(px, py);
          Particles.coins(fx, sp, corner, { count: s.count, screen: true });
          break;
        }
        case 'emote': if (target) Emote.play(fx, target, s.emote); break;
        default: break;
      }
    }

    static text(fx, s, x, y, depth) {
      const j = fx.juice;
      const sc = fx.scene;
      if (s.style === 'float') { const t = j.floatText(x, y, s.text, s.color, s.size, { hold: s.ms }); t.setDepth(depth); return; }
      const t = j.text(x, y, s.text, s.size, s.color, { stroke: '#2a1640', strokeThickness: Math.max(4, s.size / 5) }).setDepth(depth);
      if (s.style === 'banner') {
        const { w } = j.screen();
        const sp = j.toScreen(x, y);
        j.ui(t).setPosition(-w / 2, sp.y);
        sc.tweens.chain({ targets: t, tweens: [
          { x: w / 2, duration: 360, ease: 'Back.easeOut' },
          { x: w * 1.5, delay: s.ms, duration: 300, ease: 'Cubic.easeIn' }
        ], onComplete: () => t.destroy() });
        return;
      }
      // stamp
      t.setScale(2.6).setAlpha(0).setAngle(-8);
      sc.tweens.chain({ targets: t, tweens: [
        { scale: 1, alpha: 1, angle: -4, duration: 220, ease: 'Cubic.easeIn', onComplete: () => j.pop(t, 0.12, 280) },
        { alpha: 0, y: y - 30, delay: s.ms, duration: 300 }
      ], onComplete: () => t.destroy() });
    }

    static animate(fx, t, s) {
      const j = fx.juice;
      const sc = fx.scene;
      const a = s.amount;
      const ms = s.ms;
      switch (s.action) {
        case 'pop': j.pop(t, 0.25 * a, ms); break;
        case 'squash': {
          const sx = t.scaleX; const sy = t.scaleY;
          sc.tweens.chain({ targets: t, tweens: [{ scaleX: sx * (1 + 0.35 * a), scaleY: sy * (1 - 0.3 * a), duration: ms * 0.2 }, { scaleX: sx, scaleY: sy, duration: ms * 0.8, ease: 'Back.easeOut' }] });
          break;
        }
        case 'wiggle': j.wiggle(t, 8 * a, 3); break;
        case 'jump': { const y = t.y; sc.tweens.add({ targets: t, y: y - 50 * a, duration: ms / 2, yoyo: true, ease: 'Quad.easeOut', onComplete: () => t.setY(y) }); break; }
        case 'spin': { const an = t.angle; sc.tweens.add({ targets: t, angle: an + 360 * a, duration: ms, ease: 'Cubic.easeInOut', onComplete: () => t.setAngle(an) }); break; }
        case 'flash': Combat.flashWhite(fx, t, ms); break;
        case 'tint':
          if (t.setTint) { t.setTint(EffectPreset.col(s.color)); sc.time.delayedCall(ms, () => t.scene && t.clearTint()); }
          break;
        case 'fadeOut': sc.tweens.add({ targets: t, alpha: 0, duration: ms }); break;
        case 'fadeIn': t.setAlpha(0); sc.tweens.add({ targets: t, alpha: 1, duration: ms }); break;
        case 'grow': { const sx = t.scaleX; const sy = t.scaleY; sc.tweens.add({ targets: t, scaleX: sx * (1 + 0.3 * a), scaleY: sy * (1 + 0.3 * a), duration: ms / 2, yoyo: true, ease: 'Back.easeOut', onComplete: () => t.setScale(sx, sy) }); break; }
        case 'shrink': { const sx = t.scaleX; const sy = t.scaleY; sc.tweens.add({ targets: t, scaleX: sx * (1 - 0.3 * a), scaleY: sy * (1 - 0.3 * a), duration: ms / 2, yoyo: true, onComplete: () => t.setScale(sx, sy) }); break; }
        case 'float': { const y = t.y; sc.tweens.add({ targets: t, y: y - 14 * a, duration: ms / 2, yoyo: true, repeat: 1, ease: 'Sine.easeInOut', onComplete: () => t.setY(y) }); break; }
        default: break;
      }
    }
  }

  // ---- src/presets/BuiltinParticles.js
  /**
   * BuiltinParticles — ready-made particle presets (the Particle Editor's examples).
   *   this.fx.particles('Explosion', x, y);
   * Layers only list what differs from ParticlePreset.DEFAULT_LAYER.
   */
  class BuiltinParticles {
    static FIRE = ['#fff2c0', '#ffc23a', '#ff6a14', '#b3220c', '#1a0602'];

    static LIST = [
      { name: 'Sparkle Burst', layers: [
        { name: 'stars', texture: 'pfx-star', emit: { mode: 'burst', count: 24 }, speed: { min: 80, max: 260 }, lifespan: { min: 500, max: 900 }, scale: { start: 0.7, end: 0 }, rotation: { mode: 'spin', spinMin: -4, spinMax: 4 }, color: { mode: 'overLife', colors: ['#ffffff', '#ffd86b'] }, gravityY: 60 },
        { name: 'glints', texture: 'pfx-dot', emit: { mode: 'burst', count: 16 }, speed: { min: 40, max: 160 }, scale: { start: 0.5, end: 0 }, color: { mode: 'random', colors: ['#ffffff', '#ffc94a', '#ff8ac2'] } }
      ] },
      { name: 'Spark Shower', layers: [
        { name: 'sparks', texture: 'pfx-spark', emit: { mode: 'burst', count: 48 }, speed: { min: 180, max: 520 }, lifespan: { min: 400, max: 650 }, gravityY: 600, scale: { start: 0.9, end: 0.2 }, rotation: { mode: 'velocity' }, color: { mode: 'overLife', colors: ['#ffffff', '#ffe680', '#ffa82e', '#ff4a1c'], ease: 'Quad.easeIn' } },
        { name: 'embers', texture: 'pfx-ember', emit: { mode: 'burst', count: 16 }, speed: { min: 30, max: 160 }, lifespan: { min: 700, max: 1300 }, gravityY: 210, scale: { start: 0.55, end: 0 }, color: { mode: 'overLife', colors: ['#ffe680', '#ff7a1a', '#80200a'] } }
      ] },
      { name: 'Fire', layers: [
        { name: 'smoke', texture: 'pfx-smoke', blend: 'NORMAL', depth: -2, emit: { mode: 'stream', frequency: 200 }, zone: { type: 'ellipse', width: 60, height: 10 }, angle: { min: -100, max: -80 }, speed: { min: 40, max: 70 }, lifespan: { min: 2600, max: 3600 }, scale: { start: 0.4, end: 2.4 }, alpha: { mode: 'fadeInOut', max: 0.4 }, rotation: { mode: 'random' }, color: { mode: 'random', colors: ['#3c3550', '#4a4360', '#2e2840'] } },
        { name: 'flames', texture: 'pfx-ember', emit: { mode: 'stream', frequency: 22 }, zone: { type: 'ellipse', width: 80, height: 14 }, angle: { min: -100, max: -80 }, speed: { min: 110, max: 200 }, lifespan: { min: 550, max: 950 }, scale: { start: 1.5, end: 0.15, ease: 'Quad.easeIn' }, alpha: { start: 0.85, end: 0.2 }, color: { mode: 'overLife', colors: BuiltinParticles.FIRE, ease: 'Sine.easeOut' } },
        { name: 'embers', texture: 'pfx-dot', depth: 1, emit: { mode: 'stream', frequency: 140 }, angle: { min: -120, max: -60 }, speed: { min: 70, max: 160 }, lifespan: { min: 1600, max: 2600 }, scale: { start: 0.35, end: 0 }, color: { mode: 'overLife', colors: ['#ffe680', '#ff7a1a', '#802008'] } }
      ] },
      { name: 'Smoke Puff', layers: [
        { name: 'puff', texture: 'pfx-smoke', blend: 'NORMAL', emit: { mode: 'burst', count: 12 }, speed: { min: 30, max: 120 }, lifespan: { min: 700, max: 1200 }, scale: { start: 0.5, end: 1.6 }, alpha: { start: 0.55, end: 0 }, rotation: { mode: 'random' }, color: { mode: 'random', colors: ['#d8dcf0', '#b8bcd0', '#9ea3bb'] } }
      ] },
      { name: 'Magic Dust', layers: [
        { name: 'twinkles', texture: 'pfx-star', emit: { mode: 'stream', frequency: 60 }, zone: { type: 'circle', radius: 60 }, speed: { min: 5, max: 30 }, gravityY: -30, lifespan: { min: 1000, max: 1600 }, scale: { start: 0.5, end: 0 }, alpha: { mode: 'flicker', min: 0.3, max: 1 }, rotation: { mode: 'spin', spinMin: -3, spinMax: 3 }, color: { mode: 'random', colors: ['#ffffff', '#a8f0ff', '#ffb3e6', '#d0b8ff'] } }
      ] },
      { name: 'Confetti Pop', layers: [
        { name: 'paper', texture: 'pfx-confetti', blend: 'NORMAL', emit: { mode: 'burst', count: 60 }, speed: { min: 250, max: 600 }, angle: { min: -160, max: -20 }, gravityY: 500, lifespan: { min: 2200, max: 2800 }, scale: { mode: 'random', min: 0.7, max: 1.1 }, alpha: { start: 1, end: 0, ease: 'Quint.easeIn' }, rotation: { mode: 'spin', spinMin: -8, spinMax: 8 }, flutter: 26, color: { mode: 'random', colors: ['#ff5fa2', '#ffc94a', '#4fe0c8', '#7a8cff', '#ffffff'] } }
      ] },
      { name: 'Snowfall', layers: [
        { name: 'far', texture: 'pfx-dot', blend: 'NORMAL', emit: { mode: 'stream', frequency: 90 }, zone: { type: 'line', width: 1100 }, angle: { min: 80, max: 100 }, speed: { min: 20, max: 45 }, lifespan: { min: 9000, max: 9000 }, accelX: { min: -8, max: 8 }, scale: { mode: 'random', min: 0.1, max: 0.2 }, alpha: { mode: 'random', min: 0.4, max: 0.6 } },
        { name: 'near', texture: 'pfx-dot', blend: 'NORMAL', emit: { mode: 'stream', frequency: 140 }, zone: { type: 'line', width: 1100 }, angle: { min: 80, max: 100 }, speed: { min: 50, max: 90 }, lifespan: { min: 9000, max: 9000 }, accelX: { min: -12, max: 12 }, scale: { mode: 'random', min: 0.3, max: 0.5 }, alpha: { mode: 'random', min: 0.8, max: 1 } }
      ] },
      { name: 'Rain', layers: [
        { name: 'drops', texture: 'pfx-drop', blend: 'NORMAL', emit: { mode: 'stream', frequency: 10, quantity: 2 }, zone: { type: 'line', width: 1200 }, angle: { min: 96, max: 100 }, speed: { min: 900, max: 1100 }, lifespan: { min: 600, max: 650 }, scale: { mode: 'random', min: 0.7, max: 1.2 }, alpha: { mode: 'random', min: 0.4, max: 0.8 }, rotation: { mode: 'velocity', offset: -90 }, color: { mode: 'single', colors: ['#bfd6ff'] } }
      ] },
      { name: 'Explosion', layers: [
        { name: 'flash', texture: 'pfx-glow', emit: { mode: 'burst', count: 1 }, speed: { min: 0, max: 0 }, lifespan: { min: 260, max: 260 }, scale: { start: 0.3, end: 3.2, ease: 'Cubic.easeOut' }, alpha: { start: 1, end: 0 }, color: { mode: 'single', colors: ['#fff1c4'] } },
        { name: 'fireball', texture: 'pfx-ember', emit: { mode: 'burst', count: 40 }, speed: { min: 100, max: 500 }, lifespan: { min: 400, max: 800 }, scale: { start: 1.6, end: 0, ease: 'Quad.easeIn' }, color: { mode: 'overLife', colors: BuiltinParticles.FIRE } },
        { name: 'smoke', texture: 'pfx-smoke', blend: 'NORMAL', depth: -1, emit: { mode: 'burst', count: 14, delay: 80 }, speed: { min: 40, max: 160 }, lifespan: { min: 1200, max: 1800 }, scale: { start: 0.6, end: 2.2 }, alpha: { mode: 'fadeInOut', max: 0.5 }, rotation: { mode: 'random' }, color: { mode: 'random', colors: ['#4a4360', '#3c3550', '#5a5370'] } },
        { name: 'debris', texture: 'pfx-shard', blend: 'NORMAL', emit: { mode: 'burst', count: 18 }, speed: { min: 250, max: 600 }, angle: { min: -170, max: -10 }, gravityY: 1100, lifespan: { min: 800, max: 1200 }, scale: { mode: 'random', min: 0.3, max: 0.7 }, alpha: { start: 1, end: 0, ease: 'Quint.easeIn' }, rotation: { mode: 'spin', spinMin: -14, spinMax: 14 }, color: { mode: 'random', colors: ['#3a2f4a', '#5a4a3a', '#2a2530'] } }
      ] },
      { name: 'Hearts', layers: [
        { name: 'hearts', texture: 'pfx-heart', blend: 'NORMAL', emit: { mode: 'burst', count: 12 }, speed: { min: 60, max: 200 }, angle: { min: -150, max: -30 }, gravityY: -40, lifespan: { min: 1200, max: 1800 }, scale: { start: 0.5, end: 1.1 }, alpha: { start: 1, end: 0, ease: 'Quad.easeIn' }, rotation: { mode: 'random', min: -20, max: 20 }, color: { mode: 'random', colors: ['#ff5fa2', '#ff8ac2', '#ffb3d1'] } }
      ] },
      { name: 'Coin Shower', layers: [
        { name: 'coins', texture: 'pfx-coin', blend: 'NORMAL', emit: { mode: 'burst', count: 20 }, speed: { min: 250, max: 520 }, angle: { min: -125, max: -55 }, gravityY: 900, lifespan: { min: 1300, max: 1500 }, scale: { mode: 'random', min: 0.6, max: 0.9 }, alpha: { start: 1, end: 0, ease: 'Quint.easeIn' }, flutter: 30 }
      ] },
      { name: 'Bubbles', layers: [
        { name: 'bubbles', texture: 'pfx-ring', blend: 'NORMAL', emit: { mode: 'stream', frequency: 120 }, zone: { type: 'line', width: 300 }, angle: { min: -95, max: -85 }, speed: { min: 40, max: 90 }, accelX: { min: -20, max: 20 }, lifespan: { min: 2500, max: 3500 }, scale: { mode: 'random', min: 0.08, max: 0.2 }, alpha: { mode: 'fadeInOut', max: 0.85 }, color: { mode: 'random', colors: ['#bfefff', '#d8f6ff', '#ffffff'] } }
      ] },
      { name: 'Healing Aura', layers: [
        { name: 'rise', texture: 'pfx-star', emit: { mode: 'stream', frequency: 50 }, zone: { type: 'ellipse', width: 120, height: 30 }, angle: { min: -95, max: -85 }, speed: { min: 40, max: 80 }, lifespan: { min: 900, max: 1300 }, scale: { start: 0.6, end: 0 }, alpha: { mode: 'fadeInOut', max: 1 }, color: { mode: 'overLife', colors: ['#ffffff', '#7dffb2', '#2fd48a'] } },
        { name: 'rings', texture: 'pfx-ring', emit: { mode: 'burst', count: 1, bursts: 3, interval: 500 }, speed: { min: 0, max: 0 }, lifespan: { min: 900, max: 900 }, scale: { start: 0.2, end: 1.3, ease: 'Cubic.easeOut' }, alpha: { start: 0.8, end: 0 }, color: { mode: 'single', colors: ['#7dffb2'] } }
      ] },
      { name: 'Portal Swirl', layers: [
        { name: 'pull', texture: 'pfx-dot', emit: { mode: 'stream', frequency: 16, quantity: 2 }, zone: { type: 'ring', radius: 100, points: 48 }, moveTo: { enabled: true, x: 0, y: 0 }, lifespan: { min: 900, max: 900 }, scale: { start: 0.6, end: 0.05 }, alpha: { start: 1, end: 1 }, color: { mode: 'overLife', colors: ['#ffffff', '#9be8ff', '#7a5cff', '#2a1f7a'] } },
        { name: 'halo', texture: 'pfx-star', emit: { mode: 'stream', frequency: 90 }, zone: { type: 'circle', radius: 100 }, speed: { min: 10, max: 40 }, lifespan: { min: 1200, max: 1200 }, scale: { start: 0.4, end: 0 }, rotation: { mode: 'random' }, color: { mode: 'overLife', colors: ['#ffffff', '#9be8ff'] } }
      ] },
      { name: 'Level-Up Pillar', layers: [
        { name: 'pillar', texture: 'pfx-dot', emit: { mode: 'stream', frequency: 8, quantity: 2, duration: 1200 }, zone: { type: 'line', width: 120 }, angle: { min: -92, max: -88 }, speed: { min: 300, max: 600 }, lifespan: { min: 600, max: 900 }, scale: { start: 0.6, end: 0 }, color: { mode: 'overLife', colors: ['#ffffff', '#ffe680', '#ffb02e'] } },
        { name: 'stars', texture: 'pfx-star', emit: { mode: 'burst', count: 30 }, speed: { min: 120, max: 360 }, lifespan: { min: 700, max: 1100 }, gravityY: 120, scale: { start: 0.7, end: 0 }, rotation: { mode: 'spin' }, color: { mode: 'overLife', colors: ['#ffffff', '#ffd86b'] } }
      ] },
      { name: 'Poison Cloud', layers: [
        { name: 'cloud', texture: 'pfx-smoke', blend: 'NORMAL', emit: { mode: 'stream', frequency: 120 }, zone: { type: 'circle', radius: 50 }, speed: { min: 10, max: 40 }, lifespan: { min: 2000, max: 3000 }, scale: { start: 0.4, end: 1.8 }, alpha: { mode: 'fadeInOut', max: 0.45 }, rotation: { mode: 'random' }, color: { mode: 'random', colors: ['#7bd96a', '#4fa846', '#9be37a'] } },
        { name: 'bubbles', texture: 'pfx-dot', emit: { mode: 'stream', frequency: 160 }, zone: { type: 'circle', radius: 50 }, angle: { min: -100, max: -80 }, speed: { min: 20, max: 60 }, lifespan: { min: 900, max: 1400 }, scale: { start: 0.35, end: 0 }, color: { mode: 'single', colors: ['#c8ff9a'] } }
      ] },
      { name: 'Electric Zap', layers: [
        { name: 'bolts', texture: 'pfx-spark', emit: { mode: 'burst', count: 30, bursts: 3, interval: 90 }, speed: { min: 300, max: 800 }, lifespan: { min: 120, max: 260 }, scale: { start: 1, end: 0.2 }, alpha: { mode: 'flicker', min: 0.4, max: 1 }, rotation: { mode: 'velocity' }, color: { mode: 'overLife', colors: ['#ffffff', '#9be8ff', '#4f7bff'] } }
      ] },
      { name: 'Leaf Fall', layers: [
        { name: 'leaves', texture: 'pfx-leaf', blend: 'NORMAL', emit: { mode: 'stream', frequency: 260 }, zone: { type: 'line', width: 1000 }, angle: { min: 80, max: 100 }, speed: { min: 50, max: 110 }, lifespan: { min: 9000, max: 9000 }, accelX: { min: -15, max: 15 }, scale: { mode: 'random', min: 0.9, max: 1.4 }, alpha: { start: 1, end: 1 }, rotation: { mode: 'spin', spinMin: -3, spinMax: 3 }, flutter: 40, color: { mode: 'random', colors: ['#e8833a', '#d4572a', '#f2b84b', '#a8452a'] } }
      ] },
      { name: 'Firefly Swarm', layers: [
        { name: 'flies', texture: 'pfx-glow', emit: { mode: 'stream', frequency: 180 }, zone: { type: 'rect', width: 400, height: 200 }, speed: { min: 5, max: 25 }, accelX: { min: -8, max: 8 }, accelY: { min: -8, max: 8 }, lifespan: { min: 2500, max: 4500 }, scale: { mode: 'random', min: 0.06, max: 0.12 }, alpha: { mode: 'flicker', min: 0.2, max: 1 }, color: { mode: 'single', colors: ['#d9ff8a'] } }
      ] },
      { name: 'Star Trail', layers: [
        { name: 'trail', texture: 'pfx-star', emit: { mode: 'stream', frequency: 24 }, speed: { min: 5, max: 30 }, lifespan: { min: 450, max: 700 }, scale: { start: 0.5, end: 0 }, rotation: { mode: 'overLife', min: 0, max: 220 }, color: { mode: 'overLife', colors: ['#ffffff', '#ffd86b', '#ff5fa2', '#8a6bff'] } }
      ] }
    ];
  }

  // ---- src/presets/BuiltinEffects.js
  /**
   * BuiltinEffects — ready-made composed effects (the Effect Editor's examples).
   *   await this.fx.play('Critical Hit', 0, 0, { target: enemy });
   * Steps list only what differs from each step type's defaults.
   */
  class BuiltinEffects {
    static LIST = [
      { name: 'Correct Answer', steps: [
        { type: 'target', at: 0, action: 'pop', amount: 0.6, ms: 320 },
        { type: 'sound', at: 0, name: 'correct' },
        { type: 'particles', at: 0, preset: 'Sparkle Burst' },
        { type: 'shockwave', at: 0, color: '#9dffcf', size: 1.8, ms: 450 },
        { type: 'text', at: 150, text: '+10', style: 'float', color: '#ffc94a', size: 32, dy: -60, ms: 500 }
      ] },
      { name: 'Gentle Try Again', steps: [
        { type: 'target', at: 0, action: 'wiggle', amount: 0.8 },
        { type: 'sound', at: 0, name: 'soft' },
        { type: 'text', at: 100, text: 'Try again!', style: 'float', color: '#ffd88a', size: 26, dy: -60, ms: 700 }
      ] },
      { name: 'Level Up', steps: [
        { type: 'target', at: 0, action: 'jump', amount: 0.8, ms: 400 },
        { type: 'particles', at: 0, preset: 'Level-Up Pillar' },
        { type: 'rays', at: 100, color: '#ffd23f', size: 0.9, ms: 1800 },
        { type: 'sound', at: 100, name: 'fanfare' },
        { type: 'shake', at: 300, ms: 150, intensity: 0.004 },
        { type: 'text', at: 300, text: 'LEVEL UP!', style: 'stamp', color: '#ffc94a', size: 48, dy: -110, ms: 1100 },
        { type: 'confetti', at: 400, mode: 'burst', count: 50 }
      ] },
      { name: 'Critical Hit', steps: [
        { type: 'sound', at: 0, name: 'crack' },
        { type: 'target', at: 0, action: 'flash', ms: 70 },
        { type: 'hitStop', at: 0, ms: 80 },
        { type: 'sound', at: 80, name: 'boom' },
        { type: 'particles', at: 80, preset: 'Spark Shower' },
        { type: 'shockwave', at: 80, color: '#ffd23f', size: 2.4, ms: 420 },
        { type: 'shake', at: 80, ms: 200, intensity: 0.01 },
        { type: 'target', at: 80, action: 'squash', amount: 1, ms: 420 },
        { type: 'text', at: 120, text: 'CRIT!', style: 'stamp', color: '#ff8a3d', size: 46, dy: -100, ms: 600 }
      ] },
      { name: 'Treasure Open', steps: [
        { type: 'target', at: 0, action: 'squash', amount: 1, ms: 380 },
        { type: 'sound', at: 0, name: 'chime' },
        { type: 'rays', at: 100, color: '#ffd23f', size: 0.7, ms: 1600 },
        { type: 'particles', at: 150, preset: 'Coin Shower' },
        { type: 'particles', at: 150, preset: 'Sparkle Burst', dy: -20 },
        { type: 'coins', at: 500, count: 8, corner: 'top-right' },
        { type: 'text', at: 300, text: '+50', style: 'float', color: '#ffc94a', size: 34, dy: -90, ms: 700 }
      ] },
      { name: 'Power Up', steps: [
        { type: 'sound', at: 0, name: 'charge' },
        { type: 'target', at: 0, action: 'grow', amount: 1, ms: 500 },
        { type: 'glow', at: 0, color: '#4fe0c8', strength: 8, ms: 1600, pulse: true },
        { type: 'particles', at: 0, preset: 'Magic Dust', follow: true, ms: 1500 },
        { type: 'shockwave', at: 250, color: '#4fe0c8', size: 2.2, ms: 500 },
        { type: 'sound', at: 250, name: 'sparkle' },
        { type: 'text', at: 300, text: 'POWER UP!', style: 'float', color: '#7ff7e3', size: 34, dy: -100, ms: 900 }
      ] },
      { name: 'Heal', steps: [
        { type: 'particles', at: 0, preset: 'Healing Aura', follow: true, ms: 1400 },
        { type: 'target', at: 0, action: 'tint', color: '#7dffb2', ms: 300 },
        { type: 'sound', at: 0, name: 'chime' },
        { type: 'text', at: 200, text: '+25', style: 'float', color: '#7dffb2', size: 32, dy: -90, ms: 700 }
      ] },
      { name: 'Teleport', steps: [
        { type: 'sound', at: 0, name: 'whoosh' },
        { type: 'particles', at: 0, preset: 'Portal Swirl', ms: 900 },
        { type: 'target', at: 500, action: 'fadeOut', ms: 300 },
        { type: 'flash', at: 850, ms: 160, color: '#9be8ff', alpha: 0.5 },
        { type: 'particles', at: 900, preset: 'Sparkle Burst' },
        { type: 'sound', at: 900, name: 'chime' },
        { type: 'target', at: 1100, action: 'fadeIn', ms: 300 }
      ] },
      { name: 'Defeat Poof', steps: [
        { type: 'target', at: 0, action: 'squash', amount: 1.2, ms: 200 },
        { type: 'sound', at: 100, name: 'boom' },
        { type: 'particles', at: 120, preset: 'Smoke Puff', scale: 1.4 },
        { type: 'target', at: 150, action: 'fadeOut', ms: 200 },
        { type: 'particles', at: 200, preset: 'Coin Shower' },
        { type: 'text', at: 250, text: 'Defeated!', style: 'float', color: '#9dffcf', size: 30, dy: -100, ms: 700 }
      ] },
      { name: 'Big Explosion', steps: [
        { type: 'hitStop', at: 0, ms: 70 },
        { type: 'sound', at: 0, name: 'boom' },
        { type: 'flash', at: 0, ms: 120, color: '#fff1c4', alpha: 0.7 },
        { type: 'particles', at: 0, preset: 'Explosion', scale: 1.2 },
        { type: 'shockwave', at: 0, color: '#ffffff', size: 3.6, ms: 520 },
        { type: 'shockwave', at: 90, color: '#ff8a3d', size: 2.8, ms: 600 },
        { type: 'shake', at: 0, ms: 300, intensity: 0.012 },
        { type: 'camera', at: 0, zoom: 1.06, ms: 90, hold: 60 }
      ] },
      { name: 'Unlock!', steps: [
        { type: 'target', at: 0, action: 'wiggle', amount: 0.8 },
        { type: 'sound', at: 0, name: 'charge' },
        { type: 'target', at: 300, action: 'wiggle', amount: 1.3 },
        { type: 'sound', at: 600, name: 'crack' },
        { type: 'shockwave', at: 600, color: '#ffd23f', size: 2.2, ms: 480 },
        { type: 'particles', at: 600, preset: 'Sparkle Burst', scale: 1.3 },
        { type: 'rays', at: 600, color: '#ffd23f', size: 0.8, ms: 1600 },
        { type: 'target', at: 620, action: 'pop', amount: 0.8 },
        { type: 'sound', at: 700, name: 'chime' },
        { type: 'text', at: 700, text: 'UNLOCKED!', style: 'stamp', color: '#ffc94a', size: 40, dy: -120, ms: 900 }
      ] },
      { name: 'Love', steps: [
        { type: 'emote', at: 0, emote: 'love' },
        { type: 'particles', at: 0, preset: 'Hearts', dy: -40 },
        { type: 'target', at: 0, action: 'pop', amount: 0.5 }
      ] },
      { name: 'Victory', steps: [
        { type: 'sound', at: 0, name: 'fanfare' },
        { type: 'fireworks', at: 0, dx: -220, dy: -160, size: 260 },
        { type: 'fireworks', at: 300, dx: 220, dy: -190, size: 300 },
        { type: 'fireworks', at: 600, dx: 0, dy: -230, size: 340 },
        { type: 'confetti', at: 200, mode: 'cannons', count: 80 },
        { type: 'text', at: 300, text: 'VICTORY!', style: 'banner', color: '#ffffff', size: 54, dy: 0, ms: 1400 }
      ] }
    ];
  }

  // ---- src/presets/BuiltinTransitions.js
  /**
   * BuiltinTransitions — ready-made transition presets. Use them by name:
   *   this.fx.transition('Heart Iris', { onCovered: () => … });
   *   this.fx.goto('Level2', data, 'Theatre Curtain');
   * Every preset is plain JSON, exactly what PhaserFX Studio exports.
   */
  class BuiltinTransitions {
    static LIST = [
      { name: 'Fade to Black', style: 'fade', duration: 800, hold: 120, color: '#000000' },
      { name: 'Dip to White', style: 'fade', duration: 700, hold: 60, color: '#ffffff', sound: 'sparkle', easeIn: 'Quad.easeIn', easeOut: 'Quad.easeOut' },
      { name: 'Circle Iris', style: 'iris', duration: 900, hold: 120, color: '#000000', params: { shape: 'circle' } },
      { name: 'Heart Iris', style: 'iris', duration: 1000, hold: 150, color: '#2a0f22', sound: 'chime', params: { shape: 'heart', pause: 0.18 } },
      { name: 'Star Spin Iris', style: 'iris', duration: 1100, hold: 120, color: '#120d2e', sound: 'sparkle', revealSound: 'sparkle', params: { shape: 'star', spin: 180 } },
      { name: 'Diagonal Wipe', style: 'wipe', duration: 800, hold: 80, color: '#0f0b1e', reveal: 'continue', params: { angle: 25, edge: 8, edgeColor: '#ffc94a' } },
      { name: 'Slide Left', style: 'wipe', duration: 700, hold: 0, color: '#1b1440', reveal: 'continue', easeIn: 'Cubic.easeIn', easeOut: 'Cubic.easeOut', params: { angle: 180, edge: 0 } },
      { name: 'Sliding Doors', style: 'doors', duration: 900, hold: 150, color: '#23254d', easeIn: 'Bounce.easeOut', easeOut: 'Cubic.easeIn', params: { axis: 'horizontal', trim: 6, trimColor: '#ffc94a' } },
      { name: 'Theatre Curtain', style: 'curtain', duration: 1300, hold: 300, color: '#8b1e2d', revealSound: 'fanfare', easeIn: 'Sine.easeInOut', easeOut: 'Sine.easeInOut', params: { folds: 12, valance: true } },
      { name: 'Blinds', style: 'blinds', duration: 900, hold: 80, color: '#000000', params: { count: 10, angle: 0, stagger: 0.5, from: 'start' } },
      { name: 'Diagonal Stripes', style: 'blinds', duration: 900, hold: 80, color: '#ff5fa2', params: { count: 14, angle: 45, stagger: 0.6, from: 'center' } },
      { name: 'Checker Diagonal', style: 'tiles', duration: 1000, hold: 80, color: '#120d2e', params: { cols: 12, rows: 8, order: 'diagonal', shape: 'square', stagger: 0.6 } },
      { name: 'Pixel Dissolve', style: 'tiles', duration: 900, hold: 60, color: '#000000', sound: 'glitch', params: { cols: 32, rows: 20, order: 'random', shape: 'square', stagger: 0.85 } },
      { name: 'Diamond Spiral', style: 'tiles', duration: 1100, hold: 80, color: '#2a1d5e', sound: 'riser', params: { cols: 14, rows: 9, order: 'spiral', shape: 'diamond', stagger: 0.65 } },
      { name: 'Clock Wipe', style: 'clock', duration: 1000, hold: 100, color: '#000000', reveal: 'continue', params: { start: -90, direction: 'clockwise', sectors: 1 } },
      { name: 'Comic Bubbles', style: 'bubbles', duration: 1000, hold: 100, color: '#ffc94a', params: { count: 40, shape: 'circle', stagger: 0.55, bounce: true } },
      { name: 'Heart Shower', style: 'bubbles', duration: 1100, hold: 120, color: '#ff5fa2', params: { count: 50, shape: 'heart', stagger: 0.6, bounce: true } },
      { name: 'Retro Pixelate', style: 'pixelate', duration: 900, hold: 60, color: '#000000', params: { amount: 40, fadeFrom: 0.55 } },
      { name: 'Zoom Through', style: 'zoom', duration: 800, hold: 40, color: '#ffffff', params: { zoom: 0.8, spin: 0, fadeFrom: 0.3 } },
      { name: 'Spin Dive', style: 'zoom', duration: 1000, hold: 60, color: '#0f0b1e', params: { zoom: 1.6, spin: 120, fadeFrom: 0.4 } },
      { name: 'Chapter Card', style: 'fade', duration: 900, hold: 1400, color: '#0f0b1e', sound: 'rumble', revealSound: 'chime', label: 'Chapter 2', sublabel: 'The Whispering Woods', labelColor: '#ffc94a' },
      // Slanted shutter bars with a spinning "?" medallion (the Pun Intended look)
      { name: 'Mystery Shutter', style: 'shutter', duration: 1500, hold: 160, color: '#3a2e7a', easeIn: 'Linear', easeOut: 'Linear', reveal: 'continue', sound: 'whoosh', revealSound: 'swish',
        params: { palette: ['#ff5e5b', '#ffc93c', '#2ec4b6', '#3a2e7a', '#ff7eb6', '#4ea8ff'], count: 8, angle: -14, stagger: 0.45, from: 'alternate', shine: true, badge: true, badgeText: '?' } },
      { name: 'Candy Stripes', style: 'shutter', duration: 1200, hold: 80, color: '#2a1d5e', easeIn: 'Linear', easeOut: 'Linear', reveal: 'reverse', sound: 'shutter', revealSound: 'swish',
        params: { palette: ['#ff7eb6', '#ffffff', '#ff5fa2', '#ffe3f1'], count: 14, angle: 22, stagger: 0.6, from: 'top', shine: false, badge: false } },
      { name: 'Star Shutter', style: 'shutter', duration: 1400, hold: 300, color: '#120d2e', easeIn: 'Linear', easeOut: 'Linear', reveal: 'continue', sound: 'riser', revealSound: 'sparkle',
        params: { palette: ['#3a4bd8', '#59d0e3', '#7b5cff', '#2a1d5e'], count: 10, angle: -20, stagger: 0.5, from: 'alternate', shine: true, badge: true, badgeText: '★', badgeFill: '#1b1440', badgeRing: '#59d0e3', badgeTextColor: '#ffc94a' } }
    ];

    /** Old short names from PhaserFX 1.0 still work. */
    static ALIASES = { fade: 'Fade to Black', iris: 'Circle Iris', wipe: 'Diagonal Wipe', blinds: 'Blinds', zoom: 'Zoom Through' };
  }

  // ---- src/effects/Transition.js
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

  // ---- src/effects/Combat.js
  /**
   * Combat — hit reactions and damage numbers for any sprite.
   *   await this.fx.hit(enemy, { damage: 12, crit: Math.random() < 0.2, fromX: player.x });
   *   this.fx.damageNumber(x, y, 25, { crit: true });
   * hit(): white flash → knockback squash → sparks → damage number (+ hit-stop and shake on crits).
   * The white flash uses a pre-baked white silhouette, so it works in WebGL and Canvas.
   */
  class Combat {
    static async hit(fx, target, o = {}) {
      const j = fx.juice;
      const sc = fx.scene;
      const crit = !!o.crit;
      const c = j.centerOf(target);
      if (crit) { j.sfx('crack'); await j.hitStop(o.hitStop != null ? o.hitStop : 70); if (!sc.sys.isActive() || !target.scene) return; } else j.sfx('hit');

      // 1. white flash
      Combat.flashWhite(fx, target, o.flashMs || 60);

      // 2. knockback squash away from the attacker
      if (target._pfxKnock) { target._pfxKnock.stop(); const b = target._pfxKnockBase; target.setPosition(b.x, target.y).setScale(b.sx, b.sy); }
      const base = { x: target.x, sx: target.scaleX, sy: target.scaleY };
      target._pfxKnockBase = base;
      const dir = o.fromX != null ? (o.fromX < c.x ? 1 : -1) : 1;
      const push = (o.knockback != null ? o.knockback : 14) * (crit ? 1.6 : 1);
      target._pfxKnock = sc.tweens.chain({
        targets: target,
        tweens: [
          { scaleX: base.sx * 1.25, scaleY: base.sy * 0.77, x: base.x + dir * push, duration: 60, ease: 'Quad.easeOut' },
          { scaleX: base.sx, scaleY: base.sy, x: base.x, duration: 380, ease: 'Back.easeOut' }
        ],
        onComplete: () => { target._pfxKnock = null; }
      });
      const hx = o.x != null ? o.x : c.x - dir * c.w * 0.25;
      const hy = o.y != null ? o.y : c.y;
      j.burst(hx, hy, crit ? 'pfx-spark' : 'pfx-dot', {
        speed: { min: 120, max: crit ? 520 : 300 }, lifespan: 350, scale: { start: crit ? 0.8 : 0.4, end: 0 },
        color: crit ? [0xffffff, 0xffd23f] : [0xffffff, o.color || 0xffe0e6], blendMode: 'ADD',
        rotate: { onUpdate: (p) => Phaser.Math.RadToDeg(Math.atan2(p.velocityY, p.velocityX)) }
      }, crit ? 18 : 8, j.above(target, 2));
      if (crit) { j.shake(140, 0.006); j.shockwave(hx, hy, 0xffd23f, 1.4, 320, j.above(target, 2)); }

      // 3. number
      if (o.damage != null && o.number !== false) Combat.damageNumber(fx, c.x, c.y - c.h / 2, o.damage, { crit, depth: j.above(target, 3) });
      await j.wait(440);
    }

    /** Swap to a white silhouette for a few frames (or tintFill in WebGL / alpha blink as fallbacks). */
    static flashWhite(fx, target, ms = 60) {
      const sc = fx.scene;
      if (target.texture && target.texture.key.endsWith('__pfx-white')) return; // already flashing
      if (target.texture && target.setTexture) {
        const key = target.texture.key;
        const frame = target.frame && target.frame.name !== '__BASE' ? target.frame.name : undefined;
        const white = Textures.white(sc, key, frame);
        if (white) {
          target.setTexture(white);
          sc.time.delayedCall(ms, () => { if (target.scene) target.setTexture(key, frame); });
          return;
        }
      }
      if (target.setTintFill && sc.game.renderer.type === Phaser.WEBGL && Device.has('webgl')) {
        target.setTintFill(0xffffff);
        sc.time.delayedCall(ms, () => target.scene && target.clearTint());
        return;
      }
      const a = target.alpha;
      target.setAlpha(a * 0.3);
      sc.time.delayedCall(ms, () => target.scene && target.setAlpha(a));
    }

    /** Damage number that pops up, arcs sideways and falls away. */
    static damageNumber(fx, x, y, value, o = {}) {
      const j = fx.juice;
      const sc = fx.scene;
      const crit = !!o.crit;
      const str = typeof value === 'number' ? (crit ? `${value}!` : String(value)) : value;
      const t = j.text(x + Phaser.Math.Between(-20, 20), y, str, o.size || (crit ? 44 : 30), o.color || (crit ? '#ffd23f' : '#ffffff'), { stroke: '#2a1640', strokeThickness: crit ? 9 : 7 })
        .setDepth(o.depth != null ? o.depth : j.depth(300)).setScale(0.3);
      if (o.screen) t.setScrollFactor(0);
      if (crit && o.critLabel !== false) {
        const wd = j.text(t.x, y - 44, o.critLabel || 'CRIT!', 16, '#ff8a3d', { stroke: '#2a1640', strokeThickness: 5 }).setDepth(t.depth);
        if (o.screen) wd.setScrollFactor(0);
        sc.tweens.add({ targets: wd, y: wd.y - 30, alpha: 0, delay: 400, duration: 400, onComplete: () => wd.destroy() });
      }
      const side = Phaser.Math.Between(40, 90) * (Math.random() < 0.5 ? -1 : 1);
      sc.tweens.add({ targets: t, scale: crit ? 1.6 : 1.2, duration: 120, ease: 'Back.easeOut', onComplete: () => sc.tweens.add({ targets: t, scale: crit ? 1.25 : 1, duration: 120 }) });
      sc.tweens.add({ targets: t, x: t.x + side, duration: 800 });
      sc.tweens.chain({ targets: t, tweens: [{ y: y - 70, duration: 280, ease: 'Quad.easeOut' }, { y: y + 10, alpha: 0, duration: 520, ease: 'Quad.easeIn' }], onComplete: () => t.destroy() });
      return t;
    }
  }

  // ---- src/FX.js
  /**
   * FX — the PhaserFX API for one scene. Normally installed as a scene plugin so
   * every scene gets `this.fx`:
   *
   *   new Phaser.Game({ …, plugins: { scene: [PhaserFX.plugin] } });
   *   // then in any scene:
   *   this.fx.sparks(x, y);
   *
   * Or without the plugin system, inside a scene's create():
   *   this.fx = PhaserFX.create(this);
   *
   * Every method that plays over time returns a Promise, so effects chain with await.
   * Long-lived effects (fire, weather, xpBar, dialogue…) return an object with destroy().
   */
  class FX extends Phaser.Plugins.ScenePlugin {
    constructor(scene, pluginManager, pluginKey) {
      super(scene, pluginManager || scene.sys.plugins, pluginKey || 'PhaserFX');
      this.juice = new Juice(scene);
    }

    boot() {
      if (this._booted) return;
      this._booted = true;
      FX.prepareGame(this.scene.sys.game);
      const ev = this.systems.events;
      const onStart = () => { this.juice.timeScale = 1; Textures.ensure(this.scene); }; // pfx-* textures ready before preload/create
      const onCreate = () => this._afterCreate();
      ev.on('start', onStart);
      ev.on('create', onCreate);
      ev.once('destroy', () => { ev.off('start', onStart); ev.off('create', onCreate); });
    }

    _afterCreate() {
      Textures.ensure(this.scene);
      Transition.pending(this);
    }

    /** Once per game: detect the device, start the quality watcher, audio unlock and context-loss handling. */
    static prepareGame(game) {
      if (!game || game.__pfxPrepared) return;
      game.__pfxPrepared = true;
      const ready = () => {
        Device.detect(game);
        Quality.watch(game);
        const r = game.renderer;
        if (r && r.on && Phaser.Renderer && Phaser.Renderer.Events) {
          r.on(Phaser.Renderer.Events.LOSE_WEBGL, () => { if (Device.info) Device.info.contextLost = true; Quality.events.emit('contextlost'); });
          r.on(Phaser.Renderer.Events.RESTORE_WEBGL, () => { if (Device.info) Device.info.contextLost = false; Quality.events.emit('contextrestored'); });
        }
      };
      if (game.renderer) ready(); else game.events.once('ready', ready);
      Synth.unlockOnInput();
    }

    /** Use PhaserFX without the plugin system: call inside create(). */
    static create(scene) {
      const fx = new FX(scene, scene.sys.plugins, 'PhaserFX');
      fx.boot();
      fx._afterCreate();
      return fx;
    }

    _ready() { Textures.ensure(this.scene); return this.juice; }

    get j() { return this._ready(); }

    // ======================================================== core juice
    wait(ms) { return this.j.wait(ms); }
    tween(config) { return this.j.tween(config); }
    /** Slow motion for this scene (1 = normal, 0.25 = quarter speed). */
    setTimeScale(s) { this.j.setTimeScale(s); return this; }
    shake(ms, intensity) { this.j.shake(ms, intensity); return this; }
    flash(ms, color, alpha) { this.j.flash(ms, color, alpha); return this; }
    hitStop(ms) { return this.j.hitStop(ms); }
    pop(target, amount, ms) { return this.j.pop(target, amount, ms); }
    wiggle(target, px, times) { return this.j.wiggle(target, px, times); }
    glow(target, color, strength) { return this.j.glow(target, color, strength); }
    rays(x, y, color, count, depth) { return this.j.rays(x, y, color, count, depth); }
    shockwave(x, y, color, size, ms, depth) { return this.j.shockwave(x, y, color, size, ms, depth); }
    /** Shine sweep over a game object, or over a rectangle { x, y, width, height } (centre-based). */
    shine(target, o = {}) {
      const j = this.j;
      const c = target.getBounds ? j.centerOf(target) : { x: target.x, y: target.y, w: target.width, h: target.height };
      return j.shine(c.x, c.y, c.w, c.h, o.duration || 700, o.depth != null ? o.depth : (target.getBounds ? j.above(target, 5) : j.depth(20)), o.radius != null ? o.radius : 16, target.getBounds ? j.isScreen(target) : !!o.screen);
    }
    floatText(x, y, text, color, size, o) { return this.j.floatText(x, y, text, color, size, o); }
    countUp(textObj, from, to, ms, format) { return this.j.countUp(textObj, from, to, ms, format); }
    burst(x, y, texture, config, count, depth) { return this.j.burst(x, y, texture, config, count, depth); }
    flyTo(objOrTexture, from, to, o) { return this.j.flyTo(objOrTexture, from, to, o); }
    sound(name, ...args) { Synth.play(name, ...args); return this; }

    // ======================================================== particles
    sparks(x, y, o) { this._ready(); Particles.sparks(this, x, y, o); return this; }
    confetti(o) { this._ready(); Particles.confetti(this, o); return this; }
    confettiRain(o) { this._ready(); return new ConfettiRain(this, o); }
    fireworks(x, y, o) { this._ready(); return Particles.fireworks(this, x, y, o); }
    impact(x, y, o) { this._ready(); return Particles.impact(this, x, y, o); }
    trail(target, o) { this._ready(); return new Trail(this, target, o); }
    fire(x, y, o) { this._ready(); return new Fire(this, x, y, o); }
    portal(x, y, o) { this._ready(); return new Portal(this, x, y, o); }
    weather(type, o) { this._ready(); return new Weather(this, type, o); }

    // ======================================================== rewards & progress
    coins(from, to, o) { this._ready(); return Particles.coins(this, from, to, o); }
    starRating(stars, o) { this._ready(); const p = new StarRating(this, stars, o); return p.done; }
    xpBar(x, y, o) { this._ready(); return new XPBar(this, x, y, o); }
    badge(o) { this._ready(); return BadgeToast.show(this, o); }
    progressPath(points, o) { this._ready(); return new ProgressPath(this, points, o); }
    streak(x, y, o) { this._ready(); return new Streak(this, x, y, o); }

    // ======================================================== answer feedback
    correct(target, o) { this._ready(); return Feedback.correct(this, target, o); }
    wrong(target, o) { this._ready(); return Feedback.wrong(this, target, o); }
    hint(target, o) { this._ready(); return Feedback.hint(this, target, o); }
    checkmark(x, y, o) { this._ready(); return Feedback.checkmark(this, x, y, o); }
    say(x, y, text, o) { this._ready(); return Feedback.say(this, x, y, text, o); }
    timer(x, y, o) { this._ready(); return new QuizTimer(this, x, y, o); }

    // ======================================================== cards & collectibles
    card(x, y, front, back, o) { this._ready(); return new Card(this, x, y, front, back, o); }
    flip(target, o) { this._ready(); return CardFX.flip(this, target, o); }
    reveal(target, rarity, o) { this._ready(); return CardFX.reveal(this, target, rarity, o); }
    lock(target, o) { this._ready(); return new LockedItem(this, target, o); }
    legendaryReveal(o) { this._ready(); return CardFX.legendaryReveal(this, o); }
    openPack(cards, o) { this._ready(); return CardFX.openPack(this, cards, o); }

    // ======================================================== story & scenes
    dialogue(o) { this._ready(); return new Dialogue(this, o); }
    emote(target, type, o) { this._ready(); return Emote.play(this, target, type, o); }
    chapterTitle(title, o) { this._ready(); return ChapterTitle.show(this, title, o); }
    /** Transition by preset name, preset object (e.g. from Studio) or style id. */
    transition(preset, o) { this._ready(); return Transition.run(this, preset, o); }
    /** Change scene behind a transition: goto('Level2', data, 'Heart Iris') or goto('Level2', data, { type: 'iris' }). */
    goto(sceneKey, data, preset, o) { this._ready(); return Transition.goto(this, sceneKey, data, preset, o); }
    /** A transition you drive yourself: p.render(t) for scrubbing, await p.cover() / p.hold() / p.reveal(). */
    transitionPlayer(preset, o) { this._ready(); return Transition.player(this, preset, o); }

    // ======================================================== presets (PhaserFX Studio)
    /** Play a particle preset (name or JSON). Returns a handle: setPosition, burst, stop, destroy, done. */
    particles(preset, x, y, o) { this._ready(); return ParticlePreset.play(this, preset, x, y, o); }
    /** Play a composed effect preset (name or JSON). Options: { target } to act on a game object. */
    play(preset, x, y, o) { this._ready(); return EffectPreset.play(this, preset, x, y, o); }
    dayNight(o) { this._ready(); return new DayNight(this, o); }
    spotlight(o) { this._ready(); return new Spotlight(this, o); }

    // ======================================================== action & impact
    hit(target, o) { this._ready(); return Combat.hit(this, target, o); }
    damageNumber(x, y, value, o) { this._ready(); return Combat.damageNumber(this, x, y, value, o); }
    healthBar(x, y, o) { this._ready(); return new HealthBar(this, x, y, o); }

    // ======================================================== utilities
    /** Grayscale / white copies of a texture (returns the new key or null). */
    grayTexture(key, frame) { return Textures.gray(this.scene, key, frame); }
    whiteTexture(key, frame) { return Textures.white(this.scene, key, frame); }
    /** A medal texture in any colour with a glyph. Returns its key. */
    medalTexture(color, glyph) { return Textures.medal(this.scene, color, glyph); }
  }

  // ---- src/PhaserFX.js
  /**
   * PhaserFX — the public namespace.
   *
   *   // 1) as a scene plugin (recommended): every scene gets this.fx
   *   new Phaser.Game({ …, plugins: { scene: [PhaserFX.plugin] } });
   *
   *   // 2) per scene, no plugin config needed
   *   create() { this.fx = PhaserFX.create(this); }
   *
   *   // 3) after the game exists (adds this.fx to running and future scenes)
   *   PhaserFX.install(game);
   */
  const PhaserFX = {
    version: '1.2.0',

    /** Scene plugin config: plugins: { scene: [PhaserFX.plugin] } → this.fx */
    plugin: { key: 'PhaserFX', plugin: FX, mapping: 'fx' },

    /** Same as the plugin, with your own property name (e.g. 'juice'). */
    pluginAs(mapping) { return { key: `PhaserFX_${mapping}`, plugin: FX, mapping }; },

    create(scene) { return FX.create(scene); },

    install(game, mapping = 'fx') {
      game.plugins.installScenePlugin('PhaserFX', FX, mapping);
      game.scene.scenes.forEach((s) => { if (s.sys && s.sys.settings.status >= Phaser.Scenes.CREATING && !s[mapping]) s[mapping] = FX.create(s); });
    },

    settings: Settings,

    /** What this device can do: device.info, device.has('postFX'), device.override({ webgl: false }). */
    device: Device,

    /** Effect quality: quality.level(), quality.set('low'). Choose with settings.quality. */
    quality: Quality,

    /** Events: 'quality' (level, reason), 'fallback' (kind, name, reason), 'contextlost', 'contextrestored'. */
    events: Quality.events,

    /** Named presets: PhaserFX.presets.add(json), .get(kind, name), .list(kind). */
    presets: PresetLibrary,

    // building blocks (advanced use / extending)
    FX, Settings, Device, Quality, Synth, Textures, Juice, Component,
    Particles, Feedback, CardFX, Emote, ChapterTitle, Transition, Combat,
    Card, ConfettiRain, Trail, Fire, Portal, Weather, StarRating, XPBar, BadgeToast,
    ProgressPath, Streak, HealthBar, QuizTimer, LockedItem, Dialogue, DayNight, Spotlight,
    PresetLibrary, ParticlePreset, ParticleHandle, EffectPreset, TransitionPlayer, TransitionStyle,
    BuiltinParticles, BuiltinEffects, BuiltinTransitions,
    styles: Transition.STYLES,

    RARITY: CardFX.RARITY,
    EMOTES: Emote.TYPES,
    TRANSITIONS: Transition.TYPES,
    TRANSITION_STYLES: Object.keys(Transition.STYLES),
    STEP_TYPES: Object.keys(EffectPreset.STEPS)
  };

  return PhaserFX;
}));
