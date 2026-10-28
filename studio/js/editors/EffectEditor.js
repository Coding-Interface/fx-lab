/**
 * EffectEditor — compose an effect on a timeline: particles, shake, flash,
 * hit-stop, text, sounds, target animations… each step starts at its own
 * time. The stage plays it with this.fx.play(), the same call your game makes,
 * on a stand-in target (card, character, button…).
 */
class EffectEditor extends BaseEditor {
  constructor(studio) {
    super(studio, 'effects');
    this.si = -1;
    this.pos = { x: 480, y: 300 };
    this.targetKey = 'tgt-card';
    this.bg = 'stage-dark';
    this.loop = false;
    this.clock = null;
  }

  normalize(p) { const n = PhaserFX.EffectPreset.normalize(p); n.fallback = n.fallback || ''; n.heavy = !!n.heavy; return n; }

  blank() {
    const E = PhaserFX.EffectPreset;
    return { name: 'My Effect', steps: [E.step('target', 0), E.step('sound', 0), E.step('particles', 0), { ...E.step('text', 120), text: 'Nice!' }] };
  }

  output() { return BaseEditor.cleanDevice(PhaserFX.ParticlePreset.clone(this.current)); }

  swatch(p) {
    const cols = (p.steps || []).slice(0, 4).map((s) => (PhaserFX.EffectPreset.STEPS[s.type] || {}).color).filter(Boolean);
    return cols.length > 1 ? `linear-gradient(90deg, ${cols.join(', ')})` : cols[0] || '#fff';
  }

  exampleMeta(p) { return `${(p.steps || []).length} steps`; }

  onLoad() { this.si = this.current.steps.length ? 0 : -1; this.renderTimeline(); }

  getSelection() { return this.si; }

  setSelection(i) { this.si = Math.min(i == null ? -1 : i, this.current.steps.length - 1); }

  onRestore() { this.renderTimeline(); }

  get step() { return this.current.steps[this.si] || null; }

  formTarget() { return this.step || {}; }

  // ------------------------------------------------------------ inspector
  sections() {
    const s = this.step;
    if (!s) return [{ title: 'Step', desc: 'Select a step on the timeline, or add one with the buttons under it.', fields: [] }, this.deviceSection()];
    const def = PhaserFX.EffectPreset.STEPS[s.type];
    const fields = [{ key: 'at', label: 'Starts at (ms)', type: 'range', min: 0, max: 5000, step: 10 }];
    def.params.forEach((d) => {
      const f = { key: d.key, label: d.label };
      if (d.type === 'particlePreset') fields.push({ ...f, type: 'select', options: () => PhaserFX.presets.list('particles'), help: 'Built-in particle presets plus the ones you saved in the Particles editor.' });
      else if (d.type === 'select') fields.push({ ...f, type: 'select', options: d.options });
      else if (d.type === 'ease') fields.push({ ...f, type: 'ease' });
      else if (d.type === 'color') fields.push({ ...f, type: 'color' });
      else if (d.type === 'bool') fields.push({ ...f, type: 'bool' });
      else if (d.type === 'text') fields.push({ ...f, type: 'text' });
      else fields.push({ ...f, type: 'range', min: d.min, max: d.max, step: d.step || 1 });
    });
    const secs = [{ title: `${def.label} step`, desc: def.needsTarget ? 'Acts on the target. In your game pass { target: sprite } to fx.play().' : '', fields }];
    if (s.type === 'particles') {
      secs.push({ title: 'Particles', open: true, fields: [{ key: 'preset', label: '', type: 'custom', render: (ctl) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn small';
        b.textContent = 'Edit this particle preset ↗';
        b.addEventListener('click', () => this.studio.editParticles(s.preset));
        ctl.appendChild(b);
      } }] });
    }
    secs.push(this.deviceSection());
    return secs;
  }

  onField(key) {
    const s = this.step;
    if (key === 'at' || key === 'preset' || key === 'text' || key === 'name' || key === 'action' || key === 'emote' || key === 'ms') this.renderTimeline();
    if (s && key === 'at') s.at = Math.max(0, Math.round(s.at));
    this.changed();
  }

  // ------------------------------------------------------------ timeline
  renderTimeline() {
    if (!this.timeline) return;
    this.timeline.render(this.current, this.si);
  }

  selectStep(i, fromDrag) {
    this.si = i;
    if (fromDrag) {
      this.els.below.querySelectorAll('.tl-row').forEach((r, k) => r.setAttribute('aria-selected', String(k === i)));
    } else this.renderTimeline();
    this.renderForm();
  }

  // ------------------------------------------------------------ stage
  buildStage(bar) {
    this.stage.setBackground(this.bg);
    this.button(bar, '▶ Play', () => this.preview(true), 'btn small primary', 'Play the effect (Space)');
    this.toggle(bar, 'Loop', this.loop, (v) => { this.loop = v; if (v) this.preview(true); });
    this.sep(bar);
    this.selectCtl = this.select(bar, 'Target', StageArt.TARGETS, this.targetKey, (v) => { this.targetKey = v; this.preview(true); });
    this.select(bar, 'Background', StageArt.BACKGROUNDS, this.bg, (v) => { this.bg = v; this.stage.setBackground(v); });
    this.sep(bar);
    this.speedControl(bar);
    this.status = this.stat(bar, '');
    this.hint('Click the stage to move the target (or the effect point) and play there.');

    const tl = document.createElement('div');
    this.els.below.appendChild(tl);
    const E = PhaserFX.EffectPreset;
    this.timeline = new Timeline(tl, {
      onSelect: (i, fromDrag) => this.selectStep(i, fromDrag),
      onMove: (i, at, final) => {
        this.current.steps[i].at = at;
        if (final) { this.renderTimeline(); this.renderForm(); this.changed(); }
      },
      onAdd: (type) => {
        const at = this.step ? this.step.at : 0;
        this.current.steps.push(E.step(type, at));
        this.si = this.current.steps.length - 1;
        this.renderTimeline();
        this.renderForm();
        this.changed();
        if (E.STEPS[type].needsTarget && this.targetKey === 'none') Toast.show('This step acts on a target. Pick one in the Target menu to see it.');
      },
      onDelete: (i) => {
        if (i < 0) return;
        this.current.steps.splice(i, 1);
        this.si = Math.min(i, this.current.steps.length - 1);
        this.renderTimeline();
        this.renderForm();
        this.changed();
      },
      onDuplicate: (i) => {
        if (i < 0) return;
        const c = PhaserFX.ParticlePreset.clone(this.current.steps[i]);
        c.at = (c.at || 0) + 100;
        this.current.steps.splice(i + 1, 0, c);
        this.si = i + 1;
        this.renderTimeline();
        this.renderForm();
        this.changed();
      }
    });

    this.stage.handlers.down = (p) => { this.pos = { x: Math.round(p.x), y: Math.round(p.y) }; this.preview(true); };
    this.stage.handlers.update = (t, d) => {
      if (this.clock == null) return;
      this.clock += d * this.fx.juice.timeScale;
      this.timeline.setPlayhead(this.clock);
    };
    this.keys = (e) => {
      if (e.code === 'Space' && !/INPUT|SELECT|TEXTAREA|BUTTON/.test(document.activeElement.tagName)) { e.preventDefault(); this.preview(true); }
    };
    document.addEventListener('keydown', this.keys);
  }

  unmount() {
    super.unmount();
    document.removeEventListener('keydown', this.keys);
    this.timeline = null;
    this.loop = false;
  }

  preview() {
    if (!this.current) return;
    this.token = (this.token || 0) + 1;
    const token = this.token;
    this.stage.clearFx(this.speed);
    const target = this.stage.setTarget(this.targetKey, this.pos.x, this.pos.y);
    this.stage.setCross(this.pos.x, this.pos.y, !target);
    this.clock = 0;
    const total = PhaserFX.EffectPreset.totalDuration(this.current);
    this.status.textContent = `${Math.round(total)} ms`;
    this.fx.play(this.output(), this.pos.x, this.pos.y, { target }).then(() => {
      if (token !== this.token) return;
      this.clock = null;
      if (this.timeline) this.timeline.setPlayhead(null);
      if (this.loop && this.studio.editor === this) this.stage.time.delayedCall(600, () => { if (token === this.token && this.loop) this.preview(); });
    });
  }

  // ------------------------------------------------------------ code
  /** The effect plus any of YOUR particle presets it uses (built-ins need nothing). */
  pack() {
    const p = this.output();
    const builtin = new Set(PhaserFX.presets.builtins('particles').map((b) => b.name));
    const names = [...new Set(p.steps.filter((s) => s.type === 'particles' && typeof s.preset === 'string' && !builtin.has(s.preset)).map((s) => s.preset))];
    const extra = names.map((n) => PhaserFX.presets.get('particles', n)).filter(Boolean).map((x) => Exporter.slimParticles(PhaserFX.ParticlePreset.normalize(x)));
    return { p, extra, pack: PhaserFX.presets.pack([...extra, p], p.name) };
  }

  codeTabs() {
    const { p, extra, pack } = this.pack();
    const id = Exporter.ident(p.name);
    const isBuiltin = !this.dirty && !this.recordId && this.exampleName === p.name;
    const needsTarget = p.steps.some((s) => (PhaserFX.EffectPreset.STEPS[s.type] || {}).needsTarget);
    const head = isBuiltin
      ? `// "${p.name}" is built into PhaserFX: no setup needed.\n`
      : `const ${id}Pack = ${Exporter.json(pack)};\n\n// once (e.g. in your Boot scene)${extra.length ? `: adds the effect and the ${extra.length} particle preset${extra.length > 1 ? 's' : ''} it uses` : ''}\nPhaserFX.presets.add(${id}Pack);\n`;
    return [
      { label: 'PhaserFX', filename: `${id}.effect.js`, code: `${head}
${needsTarget ? `// on a game object (steps like glow / animate target act on it)
await this.fx.play('${p.name}', 0, 0, { target: card });

// or at a point` : '// at a point'}
this.fx.play('${p.name}', x, y);`, note: 'fx.play() returns a promise that resolves when the last step has finished.' },
      { label: 'JSON pack', filename: `${id}.effect.json`, code: Exporter.json(pack), note: extra.length ? `Includes your particle preset${extra.length > 1 ? 's' : ''}: ${extra.map((e) => e.name).join(', ')}.` : 'Load with this.load.json(…) then PhaserFX.presets.add(this.cache.json.get(…)).' }
    ];
  }
}
