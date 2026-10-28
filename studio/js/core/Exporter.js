/**
 * Exporter — turns presets into things you paste or save: JSON, PhaserFX code,
 * and plain Phaser code (for particle presets, no PhaserFX needed).
 */
class Exporter {
  static json(o) { return JSON.stringify(o, null, 2); }

  static ident(name) {
    const s = (name || 'preset').replace(/[^a-zA-Z0-9]+(.)?/g, (m, c) => (c ? c.toUpperCase() : '')).replace(/^[^a-zA-Z_]+/, '');
    return (s.charAt(0).toLowerCase() + s.slice(1)) || 'preset';
  }

  /** JSON with only the fields that differ from defaults (smaller, easier to read). */
  static slimParticles(p) {
    const D = PhaserFX.ParticlePreset.DEFAULT_LAYER;
    const diff = (a, d) => {
      if (Array.isArray(a) || typeof a !== 'object' || a === null) return JSON.stringify(a) === JSON.stringify(d) ? undefined : a;
      const out = {};
      Object.keys(a).forEach((k) => { const v = diff(a[k], d ? d[k] : undefined); if (v !== undefined) out[k] = v; });
      return Object.keys(out).length ? out : undefined;
    };
    const out = { format: 'phaserfx-particles', version: 1, name: p.name, layers: p.layers.map((l) => ({ name: l.name, ...(diff(l, D) || {}) })) };
    if (p.fallback) out.fallback = p.fallback;
    if (p.heavy) out.heavy = true;
    if (p.textures && Object.keys(p.textures).length) out.textures = p.textures;
    return out;
  }

  static async copy(text) {
    try { await navigator.clipboard.writeText(text); Toast.show('Copied to clipboard'); return true; } catch (e) {
      Toast.show('Copy blocked here: select the code and copy it');
      return false;
    }
  }

  /** Save a file: the claude.ai downloads capability when present, else a normal browser download. */
  static async download(filename, text) {
    try {
      const dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null;
      if (dl) {
        await dl.save({ filename, data: text });
        Toast.show(`Saved ${filename}`);
        return;
      }
    } catch (e) {
      if (e && e.code === 'declined') return;
      if (e && e.code && e.code !== 'unavailable' && e.code !== 'not_granted') { Toast.show(`Could not save: ${e.message || e.code}`); return; }
    }
    try {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    } catch (e) {
      Toast.show('Download is not available here. Use Copy instead.');
    }
  }

  // ------------------------------------------------ plain Phaser code for particle presets
  static val(v) { return typeof v === 'string' ? `'${v}'` : JSON.stringify(v); }

  static phaserParticleCode(p) {
    const P = PhaserFX.ParticlePreset.normalize(p);
    const hex = (c) => `0x${PhaserFX.ParticlePreset.hex(c).toString(16).padStart(6, '0')}`;
    const lines = [];
    lines.push(`// "${P.name}" as plain Phaser 3.60+ code (no PhaserFX needed).`);
    lines.push('// Textures named pfx-* come from PhaserFX. Without it, swap them for your own (a soft white dot works for most).');
    lines.push(`function play${Exporter.ident(P.name).replace(/^./, (c) => c.toUpperCase())}(scene, x, y) {`);
    lines.push('  const R = (a, b) => a + Math.random() * (b - a);');
    lines.push('  const emitters = [];');
    P.layers.filter((L) => L.enabled !== false).forEach((L, i) => {
      const c = [];
      c.push(`lifespan: { min: ${L.lifespan.min}, max: ${L.lifespan.max} }`);
      c.push(`speed: { min: ${L.speed.min}, max: ${L.speed.max} }`);
      c.push(`angle: { min: ${L.angle.min}, max: ${L.angle.max} }`);
      if (L.gravityX) c.push(`gravityX: ${L.gravityX}`);
      if (L.gravityY) c.push(`gravityY: ${L.gravityY}`);
      if (L.accelX.min || L.accelX.max) c.push(`accelerationX: { min: ${L.accelX.min}, max: ${L.accelX.max} }`);
      if (L.accelY.min || L.accelY.max) c.push(`accelerationY: { min: ${L.accelY.min}, max: ${L.accelY.max} }`);
      c.push(`blendMode: '${L.blend}'`);
      if (L.maxParticles) c.push(`maxParticles: ${L.maxParticles}`);
      if (L.emit.mode === 'stream') { c.push(`frequency: ${L.emit.frequency}`); c.push(`quantity: ${L.emit.quantity}`); }
      c.push('emitting: false');
      const Z = L.zone;
      if (Z.type !== 'point') {
        const src = { circle: `new Phaser.Geom.Circle(0, 0, ${Z.radius})`, ring: `new Phaser.Geom.Circle(0, 0, ${Z.radius})`, rect: `new Phaser.Geom.Rectangle(${-Z.width / 2}, ${-Z.height / 2}, ${Z.width}, ${Z.height})`, ellipse: `new Phaser.Geom.Ellipse(0, 0, ${Z.width}, ${Z.height})`, line: `new Phaser.Geom.Line(${-Z.width / 2}, 0, ${Z.width / 2}, 0)` }[Z.type];
        c.push((Z.edge || Z.type === 'ring') ? `emitZone: { type: 'edge', source: ${src}, quantity: ${Z.points} }` : `emitZone: { type: 'random', source: ${src} }`);
      }
      if (L.moveTo.enabled) { c.push(`moveToX: x + ${L.moveTo.x}`); c.push(`moveToY: y + ${L.moveTo.y}`); }
      const S = L.scale;
      if (L.flutter > 0) {
        c.push(S.mode === 'random' ? `scaleY: { min: ${S.min}, max: ${S.max} }` : `scaleY: { start: ${S.start}, end: ${S.end}, ease: '${S.ease}' }`);
        c.push(`scaleX: { onEmit: (p) => { p.wob = Math.random() * 6.28; return 1; }, onUpdate: (p, k, t) => Math.cos(p.wob + t * ${L.flutter}) * ${S.mode === 'random' ? (S.min + S.max) / 2 : `(${S.start} + (${S.end - S.start}) * t)`} }`);
      } else c.push(S.mode === 'random' ? `scale: { min: ${S.min}, max: ${S.max} }` : `scale: { start: ${Math.max(0.01, S.start)}, end: ${S.end}, ease: '${S.ease}' }`);
      const A = L.alpha;
      if (A.mode === 'random') c.push(`alpha: { min: ${A.min}, max: ${A.max} }`);
      else if (A.mode === 'fadeInOut') c.push(`alpha: { onUpdate: (p, k, t) => Math.sin(t * Math.PI) * ${A.max} }`);
      else if (A.mode === 'flicker') c.push(`alpha: { onUpdate: () => R(${A.min}, ${A.max}) }`);
      else c.push(`alpha: { start: ${A.start}, end: ${A.end}, ease: '${A.ease}' }`);
      const Ro = L.rotation;
      if (Ro.mode === 'random') c.push(`rotate: { min: ${Ro.min}, max: ${Ro.max} }`);
      else if (Ro.mode === 'overLife') c.push(`rotate: { start: ${Ro.min}, end: ${Ro.max} }`);
      else if (Ro.mode === 'spin') c.push(`rotate: { onEmit: (p) => { p.spin = R(${Ro.spinMin}, ${Ro.spinMax}); return R(${Ro.min}, ${Ro.max}); }, onUpdate: (p, k, t, v) => v + p.spin }`);
      else if (Ro.mode === 'velocity') c.push(`rotate: { onUpdate: (p) => Phaser.Math.RadToDeg(Math.atan2(p.velocityY, p.velocityX))${Ro.offset ? ` + ${Ro.offset}` : ''} }`);
      const cols = L.color.colors.map(hex);
      if (L.color.mode === 'overLife' && cols.length > 1) { c.push(`color: [${cols.join(', ')}]`); c.push(`colorEase: '${L.color.ease}'`); }
      else if (L.color.mode === 'random' && cols.length > 1) c.push(`tint: [${cols.join(', ')}]`);
      else c.push(`tint: ${cols[0]}`);
      lines.push(`  // layer ${i + 1}: ${L.name}`);
      lines.push(`  const e${i} = scene.add.particles(x, y, '${L.texture}', {\n    ${c.join(',\n    ')}\n  });`);
      if (L.emit.mode === 'stream') {
        lines.push(`  scene.time.delayedCall(${L.emit.delay}, () => e${i}.start());`);
        if (L.emit.duration) lines.push(`  scene.time.delayedCall(${L.emit.delay + L.emit.duration}, () => e${i}.stop());`);
      } else {
        for (let b = 0; b < Math.max(1, L.emit.bursts); b++) lines.push(`  scene.time.delayedCall(${L.emit.delay + b * L.emit.interval}, () => e${i}.explode(${L.emit.count}));`);
      }
      lines.push(`  emitters.push(e${i});`);
    });
    lines.push('  return emitters; // call .destroy() on each when finished');
    lines.push('}');
    return lines.join('\n');
  }
}
