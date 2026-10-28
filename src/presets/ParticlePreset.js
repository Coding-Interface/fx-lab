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
