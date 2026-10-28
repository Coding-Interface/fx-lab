/**
 * ParticleEditor — build particle effects from layers. Each layer is one
 * emitter with its own texture, emission, shape, motion, size, rotation,
 * colour and fade. The stage plays it through this.fx.particles(), the same
 * call your game makes.
 */
class ParticleEditor extends BaseEditor {
  constructor(studio) {
    super(studio, 'particles');
    this.li = 0;
    this.pos = { x: 480, y: 320 };
    this.repeat = true;
    this.follow = false;
    this.size = 1;
    this.bg = 'stage-dark';
    this.handle = null;
  }

  normalize(p) { const n = PhaserFX.ParticlePreset.normalize(p); n.fallback = n.fallback || ''; n.heavy = !!n.heavy; return n; }

  blank() {
    return { name: 'My Particles', layers: [{ name: 'Sparks', texture: 'pfx-glow', emit: { mode: 'burst', count: 40 }, speed: { min: 120, max: 320 }, lifespan: { min: 500, max: 900 }, scale: { start: 0.7, end: 0 }, color: { mode: 'overLife', colors: ['#ffffff', '#59d0e3', '#3a4bd8'] } }] };
  }

  output() { return BaseEditor.cleanDevice(PhaserFX.ParticlePreset.clone(this.current)); }

  swatch(p) {
    const L = p.layers && p.layers[0];
    const c = L && L.color && L.color.colors;
    return c && c.length ? Form.gradient(c) : '#fff';
  }

  exampleMeta(p) {
    const stream = (p.layers || []).some((L) => L.emit && L.emit.mode === 'stream');
    return stream ? 'stream' : 'burst';
  }

  onLoad() { this.li = Math.min(this.li, this.current.layers.length - 1); if (this.li < 0) this.li = 0; }

  getSelection() { return this.li; }

  setSelection(i) { this.li = Math.max(0, Math.min(i || 0, this.current.layers.length - 1)); }

  get layer() { return this.current.layers[this.li]; }

  formTarget() { return this.layer || {}; }

  // ------------------------------------------------------------ layers list
  beforeForm(insp) {
    const box = document.createElement('div');
    box.className = 'layers';
    const head = document.createElement('div');
    head.className = 'ins-row';
    head.innerHTML = '<h4 style="margin:0;flex:1">Layers</h4>';
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'btn small';
    add.textContent = '+ Layer';
    add.addEventListener('click', () => {
      this.current.layers.push(PhaserFX.ParticlePreset.layer({ name: `Layer ${this.current.layers.length + 1}` }));
      this.li = this.current.layers.length - 1;
      this.renderInspector();
      this.changed();
    });
    head.appendChild(add);
    box.appendChild(head);
    this.current.layers.forEach((L, i) => {
      const row = document.createElement('div');
      row.className = `layer${L.enabled === false ? ' off' : ''}`;
      row.setAttribute('aria-selected', String(i === this.li));
      const ib = (txt, label, fn, disabled) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'icon-btn';
        b.textContent = txt;
        b.title = label;
        b.setAttribute('aria-label', `${label}: ${L.name}`);
        b.disabled = !!disabled;
        b.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
        return b;
      };
      const vis = ib(L.enabled === false ? '○' : '●', L.enabled === false ? 'Show layer' : 'Hide layer', () => { L.enabled = L.enabled === false; this.renderInspector(); this.changed(); });
      const sw = document.createElement('span');
      sw.className = 'sw';
      sw.style.background = Form.gradient(L.color.colors);
      const name = document.createElement('button');
      name.type = 'button';
      name.className = 'ln';
      name.textContent = L.name;
      name.addEventListener('click', () => { this.li = i; this.renderInspector(); });
      row.append(vis, sw, name,
        ib('↑', 'Move up', () => this.moveLayer(i, -1), i === 0),
        ib('↓', 'Move down', () => this.moveLayer(i, 1), i === this.current.layers.length - 1),
        ib('⧉', 'Duplicate', () => { const c = PhaserFX.ParticlePreset.clone(L); c.name = `${L.name} copy`; this.current.layers.splice(i + 1, 0, c); this.li = i + 1; this.renderInspector(); this.changed(); }),
        ib('×', 'Delete', () => { this.current.layers.splice(i, 1); this.li = Math.max(0, Math.min(this.li, this.current.layers.length - 1)); this.renderInspector(); this.changed(); }, this.current.layers.length < 2));
      box.appendChild(row);
    });
    insp.appendChild(box);
  }

  moveLayer(i, d) {
    const a = this.current.layers;
    const j = i + d;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]];
    this.li = j;
    this.renderInspector();
    this.changed();
  }

  onField(key) {
    const row = this.els.insp.querySelector('.layer[aria-selected="true"]');
    if (row && key === 'name') row.querySelector('.ln').textContent = this.layer.name;
    if (row && key.startsWith('color')) row.querySelector('.sw').style.background = Form.gradient(this.layer.color.colors);
    this.changed();
  }

  // ------------------------------------------------------------ inspector schema (one layer)
  sections() {
    const game = this.studio.game;
    const burst = (o) => o.emit.mode !== 'stream';
    const stream = (o) => o.emit.mode === 'stream';
    const z = (...t) => (o) => t.includes(o.zone.type);
    const sm = (...m) => (o) => m.includes(o.scale.mode);
    const am = (...m) => (o) => m.includes(o.alpha.mode);
    const rm = (...m) => (o) => m.includes(o.rotation.mode);
    return [
      { title: 'Basics', fields: [
        { key: 'name', label: 'Layer name', type: 'text' },
        { key: 'texture', label: 'Texture', type: 'custom', render: (ctl, o, set) => TexturePicker.render(ctl, game, this.current, o.texture, (k) => { set(k); this.renderForm(); }) },
        { key: 'blend', label: 'Blend', type: 'select', options: PhaserFX.ParticlePreset.BLENDS, help: 'ADD glows on dark backgrounds. NORMAL for smoke, leaves, confetti.' },
        { key: 'depth', label: 'Layer depth', type: 'range', min: -10, max: 10, step: 1, help: 'Higher draws on top of other layers.' },
        { key: 'maxParticles', label: 'Max particles', type: 'range', min: 0, max: 2000, step: 10, help: '0 = no limit.' }
      ] },
      { title: 'Emission', fields: [
        { key: 'emit.mode', label: 'Mode', type: 'select', options: [{ value: 'burst', label: 'Burst (all at once)' }, { value: 'stream', label: 'Stream (continuous)' }] },
        { key: 'emit.count', label: 'Particles per burst', type: 'range', min: 1, max: 500, step: 1, show: burst },
        { key: 'emit.bursts', label: 'Bursts', type: 'range', min: 1, max: 20, step: 1, show: burst },
        { key: 'emit.interval', label: 'Between bursts (ms)', type: 'range', min: 0, max: 2000, step: 10, show: (o) => burst(o) && o.emit.bursts > 1 },
        { key: 'emit.frequency', label: 'Every (ms)', type: 'range', min: 1, max: 1000, step: 1, show: stream, help: 'Time between emissions. Lower = denser.' },
        { key: 'emit.quantity', label: 'Particles each time', type: 'range', min: 1, max: 50, step: 1, show: stream },
        { key: 'emit.duration', label: 'Run for (ms)', type: 'range', min: 0, max: 10000, step: 50, show: stream, help: '0 = runs until you call handle.stop().' },
        { key: 'emit.delay', label: 'Start delay (ms)', type: 'range', min: 0, max: 5000, step: 10 }
      ] },
      { title: 'Shape', note: 'where particles appear', fields: [
        { key: 'zone.type', label: 'Emit from', type: 'select', options: [{ value: 'point', label: 'Point' }, { value: 'circle', label: 'Circle' }, { value: 'ring', label: 'Ring (edge)' }, { value: 'rect', label: 'Rectangle' }, { value: 'ellipse', label: 'Ellipse' }, { value: 'line', label: 'Line' }] },
        { key: 'zone.radius', label: 'Radius', type: 'range', min: 1, max: 500, step: 1, show: z('circle', 'ring') },
        { key: 'zone.width', label: 'Width', type: 'range', min: 1, max: 1200, step: 1, show: z('rect', 'ellipse', 'line') },
        { key: 'zone.height', label: 'Height', type: 'range', min: 1, max: 800, step: 1, show: z('rect', 'ellipse') },
        { key: 'zone.edge', label: 'Edge only', type: 'bool', show: z('circle', 'rect', 'ellipse', 'line') },
        { key: 'zone.points', label: 'Edge points', type: 'range', min: 2, max: 200, step: 1, show: (o) => o.zone.type === 'ring' || (o.zone.edge && o.zone.type !== 'point'), help: 'Particles step evenly round the edge.' }
      ] },
      { title: 'Motion', fields: [
        { key: 'speed', label: 'Speed', type: 'minmax', step: 1 },
        { key: 'angle', label: 'Angle (°)', type: 'minmax', step: 1, help: '0 = right, 90 = down, 270 = up. 0–360 = all directions.' },
        { key: 'gravityX', label: 'Gravity X', type: 'range', min: -1500, max: 1500, step: 5 },
        { key: 'gravityY', label: 'Gravity Y', type: 'range', min: -1500, max: 1500, step: 5, help: 'Positive falls, negative rises (fire, bubbles).' },
        { key: 'accelX', label: 'Accel X', type: 'minmax', step: 1 },
        { key: 'accelY', label: 'Accel Y', type: 'minmax', step: 1 },
        { key: 'moveTo.enabled', label: 'Fly to a point', type: 'bool', help: 'Every particle travels to a point over its life (portals, absorb effects).' },
        { key: 'moveTo.x', label: 'Point X (offset)', type: 'range', min: -600, max: 600, step: 1, show: (o) => o.moveTo.enabled },
        { key: 'moveTo.y', label: 'Point Y (offset)', type: 'range', min: -400, max: 400, step: 1, show: (o) => o.moveTo.enabled }
      ] },
      { title: 'Lifetime', fields: [
        { key: 'lifespan', label: 'Life (ms)', type: 'minmax', step: 10 }
      ] },
      { title: 'Size', fields: [
        { key: 'scale.mode', label: 'Mode', type: 'select', options: [{ value: 'overLife', label: 'Start → end' }, { value: 'random', label: 'Random, fixed' }] },
        { key: 'scale.start', label: 'Start', type: 'range', min: 0, max: 4, step: 0.01, show: sm('overLife') },
        { key: 'scale.end', label: 'End', type: 'range', min: 0, max: 4, step: 0.01, show: sm('overLife') },
        { key: 'scale.ease', label: 'Ease', type: 'ease', show: sm('overLife') },
        { key: 'scale.min', label: 'Min', type: 'range', min: 0.01, max: 4, step: 0.01, show: sm('random') },
        { key: 'scale.max', label: 'Max', type: 'range', min: 0.01, max: 4, step: 0.01, show: sm('random') },
        { key: 'flutter', label: 'Flutter', type: 'range', min: 0, max: 20, step: 0.5, help: 'Paper-like flipping for confetti and leaves. 0 = off.' }
      ] },
      { title: 'Rotation', open: false, fields: [
        { key: 'rotation.mode', label: 'Mode', type: 'select', options: [{ value: 'none', label: 'None' }, { value: 'random', label: 'Random angle' }, { value: 'spin', label: 'Spin' }, { value: 'overLife', label: 'Start → end' }, { value: 'velocity', label: 'Face direction of travel' }] },
        { key: 'rotation.min', label: 'Angle from', type: 'range', min: -720, max: 720, step: 1, show: rm('random', 'spin', 'overLife') },
        { key: 'rotation.max', label: 'Angle to', type: 'range', min: -720, max: 720, step: 1, show: rm('random', 'spin', 'overLife') },
        { key: 'rotation.spinMin', label: 'Spin min (°/frame)', type: 'range', min: -30, max: 30, step: 0.5, show: rm('spin') },
        { key: 'rotation.spinMax', label: 'Spin max (°/frame)', type: 'range', min: -30, max: 30, step: 0.5, show: rm('spin') },
        { key: 'rotation.offset', label: 'Offset (°)', type: 'range', min: -180, max: 180, step: 1, show: rm('velocity'), help: 'Use 90 if your texture points up instead of right.' }
      ] },
      { title: 'Colour', fields: [
        { key: 'color.mode', label: 'Mode', type: 'select', options: [{ value: 'single', label: 'Single colour' }, { value: 'random', label: 'Random from list' }, { value: 'overLife', label: 'Gradient over life' }] },
        { key: 'color.colors', label: 'Colours', type: 'colors' },
        { key: 'color.ease', label: 'Gradient ease', type: 'ease', show: (o) => o.color.mode === 'overLife' }
      ] },
      { title: 'Fade', fields: [
        { key: 'alpha.mode', label: 'Mode', type: 'select', options: [{ value: 'overLife', label: 'Start → end' }, { value: 'fadeInOut', label: 'Fade in and out' }, { value: 'random', label: 'Random, fixed' }, { value: 'flicker', label: 'Flicker' }] },
        { key: 'alpha.start', label: 'Start', type: 'range', min: 0, max: 1, step: 0.01, show: am('overLife') },
        { key: 'alpha.end', label: 'End', type: 'range', min: 0, max: 1, step: 0.01, show: am('overLife') },
        { key: 'alpha.ease', label: 'Ease', type: 'ease', show: am('overLife') },
        { key: 'alpha.min', label: 'Min', type: 'range', min: 0, max: 1, step: 0.01, show: am('random', 'flicker') },
        { key: 'alpha.max', label: 'Max', type: 'range', min: 0, max: 1, step: 0.01, show: am('random', 'flicker', 'fadeInOut') }
      ] },
      this.deviceSection()
    ];
  }

  // ------------------------------------------------------------ stage
  buildStage(bar) {
    this.stage.setBackground(this.bg);
    this.button(bar, '▶ Fire', () => this.preview(), 'btn small primary', 'Replay the effect (Space)');
    this.toggle(bar, 'Auto-repeat', this.repeat, (v) => { this.repeat = v; if (v) this.preview(); });
    this.toggle(bar, 'Follow pointer', this.follow, (v) => { this.follow = v; }, 'Move the emitter with your pointer (great for trails)');
    this.sep(bar);
    this.select(bar, 'Size', [0.5, 0.75, 1, 1.5, 2].map((v) => ({ value: v, label: `${v}×` })), this.size, (v) => { this.size = parseFloat(v); this.preview(); });
    this.select(bar, 'Background', StageArt.BACKGROUNDS, this.bg, (v) => { this.bg = v; this.stage.setBackground(v); });
    this.sep(bar);
    this.speedControl(bar);
    this.count = this.stat(bar, '0 particles');
    this.hint('Click the stage to fire it there. Turn on Follow pointer to drag streams around.');

    this.stage.handlers.down = (p) => { this.pos = { x: Math.round(p.x), y: Math.round(p.y) }; this.dragging = true; this.preview(); };
    this.stage.handlers.up = () => { this.dragging = false; };
    this.stage.handlers.move = (p) => {
      if (!(this.follow || (this.dragging && p.isDown))) return;
      this.pos = { x: Math.round(p.x), y: Math.round(p.y) };
      if (this.handle && this.handle.alive) this.handle.setPosition(this.pos.x, this.pos.y);
    };
    let n = 0;
    this.stage.handlers.update = () => {
      if (++n % 8) return;
      const c = this.handle && this.handle.alive ? this.handle.count() : 0;
      this.count.textContent = `${c} particle${c === 1 ? '' : 's'}`;
    };
    this.keys = (e) => {
      if (e.code === 'Space' && !/INPUT|SELECT|TEXTAREA|BUTTON/.test(document.activeElement.tagName)) { e.preventDefault(); this.preview(); }
    };
    document.addEventListener('keydown', this.keys);
  }

  unmount() {
    super.unmount();
    document.removeEventListener('keydown', this.keys);
    if (this.handle) this.handle.destroy();
    this.handle = null;
  }

  preview() {
    if (!this.current) return;
    if (this.handle) this.handle.destroy();
    this.stage.clearFx(this.speed);
    const h = this.fx.particles(this.output(), this.pos.x, this.pos.y, { scale: this.size });
    this.handle = h;
    h.done.then(() => {
      if (this.handle !== h || !this.repeat || this.studio.editor !== this) return;
      this.stage.time.delayedCall(350, () => { if (this.handle === h && this.repeat && this.studio.editor === this) this.preview(); });
    });
  }

  // ------------------------------------------------------------ code
  codeTabs() {
    const p = this.output();
    const id = Exporter.ident(p.name);
    const slim = Exporter.slimParticles(p);
    const stream = p.layers.some((L) => L.enabled !== false && L.emit.mode === 'stream' && !L.emit.duration);
    const isBuiltin = !this.dirty && !this.recordId && this.exampleName === p.name;
    const head = isBuiltin
      ? `// "${p.name}" is built into PhaserFX: no setup needed.\n`
      : `const ${id} = ${Exporter.json(slim)};\n\n// once (e.g. in your Boot scene): register the preset by name\nPhaserFX.presets.add(${id});\n`;
    const use = stream
      ? `// it keeps running, so keep the handle
const h = this.fx.particles('${p.name}', x, y);
h.setPosition(player.x, player.y);   // move it, or pass { follow: player }
h.stop();                             // let it finish and clean up`
      : `// fire it (it cleans itself up)
this.fx.particles('${p.name}', x, y);
this.fx.particles('${p.name}', x, y, { scale: 0.5 });   // smaller / bigger
await this.fx.particles('${p.name}', x, y).done;        // wait until it is gone`;
    return [
      { label: 'PhaserFX', filename: `${id}.particles.js`, code: `${head}\n${use}`, note: 'Needs Phaser 3.60+ and phaser-fx.js with the PhaserFX plugin (mapping: "fx").' },
      { label: 'JSON', filename: `${id}.particles.json`, code: Exporter.json(slim), note: 'Only values that differ from the defaults are listed. Custom textures travel inside the JSON.' },
      { label: 'Plain Phaser', filename: `${id}.phaser.js`, code: Exporter.phaserParticleCode(p), note: 'Standalone Phaser 3.60+ code. A starting point: PhaserFX adds clean-up, sizing and reduced-motion support.' }
    ];
  }
}
