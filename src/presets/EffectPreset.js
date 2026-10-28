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
