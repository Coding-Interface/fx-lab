/**
 * TransitionEditor — design a scene transition: pick a style, tune its options,
 * timing and colour, then preview it between two scenes, or scrub it frame by
 * frame. The stage runs the same TransitionPlayer your game uses.
 */
class TransitionEditor extends BaseEditor {
  constructor(studio) {
    super(studio, 'transitions');
    this.focus = { x: 480, y: 300 };
    this.scrubT = null;
    this.phase = 'cover';
    this.autoplay = true;
    this.loop = false;
    this.playing = false;
    this.clock = null;
  }

  /** Built-in sounds: the transition ones first, then everything else PhaserFX can play. */
  static soundList() {
    const S = PhaserFX.Synth;
    const rest = ['boom', 'coin', 'crack', 'charge', 'correct', 'tick', 'hit'].filter((n) => typeof S[n] === 'function');
    return [...S.TRANSITION_SOUNDS, ...rest.filter((n) => !S.TRANSITION_SOUNDS.includes(n))];
  }

  static clone(v) { return v && typeof v === 'object' ? JSON.parse(JSON.stringify(v)) : v; }

  styleOf(p = this.current) { return PhaserFX.styles[p.style] || PhaserFX.styles.fade; }

  // ------------------------------------------------------------ preset shape
  normalize(p) {
    const Style = PhaserFX.styles[p.style] || PhaserFX.styles.fade;
    const params = {};
    (Style.params || []).forEach((d) => { params[d.key] = TransitionEditor.clone(d.default); });
    Object.assign(params, TransitionEditor.clone(p.params || {}));
    const snd = (v, def) => (v === false || v === null || v === 'none' ? 'none' : (v || def || 'none'));
    return {
      format: 'phaserfx-transition', version: 1, name: p.name || 'Untitled', style: Style.id,
      duration: p.duration != null ? p.duration : 900, hold: p.hold != null ? p.hold : 100,
      color: p.color || Style.defaultColor || '#000000',
      easeIn: p.easeIn || 'Cubic.easeIn', easeOut: p.easeOut || 'Cubic.easeOut',
      reveal: p.reveal || 'reverse',
      sound: snd(p.sound, Style.defaultSound),
      revealSound: snd(p.revealSound, Style.defaultRevealSound),
      label: p.label || '', sublabel: p.sublabel || '', labelColor: p.labelColor || '#ffffff', labelSize: p.labelSize || 42,
      params, fallback: p.fallback || '', heavy: !!p.heavy
    };
  }

  blank() { return { name: 'My Transition', style: 'iris', duration: 900, hold: 120, color: '#000000', params: { shape: 'circle' } }; }

  /** The clean preset that plays and exports (no empty fields). */
  output() {
    const c = PhaserFX.ParticlePreset.clone(this.current);
    if (c.sound === 'none') c.sound = false;
    if (c.revealSound === 'none') c.revealSound = false;
    ['label', 'sublabel'].forEach((k) => { if (!c[k]) delete c[k]; });
    if (!c.label) { delete c.labelColor; delete c.labelSize; }
    if (!Object.keys(c.params).length) delete c.params;
    return BaseEditor.cleanDevice(c);
  }

  swatch(p) { return p.color || '#000'; }

  exampleMeta(p) {
    const S = PhaserFX.styles[p.style];
    return `${p.style}${S && S.requires && S.requires.length ? ' · WebGL' : ''}`;
  }

  requirements() { return (this.styleOf().requires || []).slice(); }

  onRestore() { this.graph.draw(this.current, null); this.updateFocusUI(); }

  onLoad() { this.scrubT = null; this.killPlayer(); this.syncScrub(); }

  // ------------------------------------------------------------ inspector
  sections() {
    const Style = this.styleOf();
    const styleOpts = Object.values(PhaserFX.styles).map((S) => ({ value: S.id, label: S.label || S.id }));
    const paramFields = (Style.params || []).map((d) => {
      const f = { key: `params.${d.key}`, label: d.label, help: d.help };
      if (d.showIf) f.show = (o) => !!(o.params && o.params[d.showIf]);
      if (d.type === 'select') return { ...f, type: 'select', options: d.options };
      if (d.type === 'text') return { ...f, type: 'text' };
      if (d.type === 'colors') return { ...f, type: 'colors' };
      if (d.type === 'color') return { ...f, type: 'color' };
      if (d.type === 'bool') return { ...f, type: 'bool' };
      return { ...f, type: 'range', min: d.min, max: d.max, step: d.step || 1 };
    });
    return [
      { title: 'Style', desc: Style.description, fields: [
        { key: 'style', label: 'Style', type: 'select', options: styleOpts,
          onSet: (v, o) => {
            const Old = PhaserFX.styles[this.prevStyle] || Style;
            const New = PhaserFX.styles[v];
            const params = {};
            (New.params || []).forEach((d) => { params[d.key] = TransitionEditor.clone(d.default); });
            o.params = params;
            // keep sounds the user picked; swap ones that were just the old style's default
            if (o.sound === (Old.defaultSound || 'none')) o.sound = New.defaultSound || 'none';
            if (o.revealSound === (Old.defaultRevealSound || 'none')) o.revealSound = New.defaultRevealSound || 'none';
            if (!o.color || o.color.toLowerCase() === (Old.defaultColor || '#000000').toLowerCase()) o.color = New.defaultColor || '#000000';
          } },
        { key: 'color', label: 'Colour', type: 'color' }
      ] },
      ...(paramFields.length ? [{ title: `${Style.label} options`, fields: paramFields }] : []),
      { title: 'Timing', fields: [
        { key: 'duration', label: 'Duration (ms)', type: 'range', min: 100, max: 4000, step: 10, help: 'Cover + reveal together. Each half takes half of this.' },
        { key: 'hold', label: 'Hold (ms)', type: 'range', min: 0, max: 4000, step: 10, help: 'How long the screen stays covered. Your scene swap happens here.' },
        { key: 'easeIn', label: 'Cover ease', type: 'ease' },
        { key: 'easeOut', label: 'Reveal ease', type: 'ease' },
        { key: 'reveal', label: 'Reveal', type: 'select', options: [{ value: 'reverse', label: 'Reverse (go back the way it came)' }, { value: 'continue', label: 'Continue (carry on through)' }] }
      ] },
      { title: 'Title card', open: !!this.current.label, note: 'optional', fields: [
        { key: 'label', label: 'Title', type: 'text', help: 'Shown while covered, e.g. "Chapter 2". Leave empty for none.' },
        { key: 'sublabel', label: 'Subtitle', type: 'text', show: (o) => !!o.label },
        { key: 'labelColor', label: 'Title colour', type: 'color', show: (o) => !!o.label },
        { key: 'labelSize', label: 'Title size', type: 'range', min: 16, max: 96, step: 1, show: (o) => !!o.label }
      ] },
      { title: 'Sound', desc: `Each style starts with a sound that suits it (${Style.label}: ${Style.defaultSound || 'none'}${Style.defaultRevealSound ? ` / ${Style.defaultRevealSound}` : ''}). Pick any built-in sound, or your own audio key.`, fields: [
        this.soundField('sound', 'Cover sound', 'Plays as the screen covers.'),
        this.soundField('revealSound', 'Reveal sound', 'Plays as the next scene is uncovered.')
      ] },
      this.deviceSection()
    ];
  }

  /** Sound picker: built-in list, "your own audio key", and a ▶ button to hear it. */
  soundField(key, label, help) {
    return { key, label, help, type: 'custom', render: (ctl, o, set, id) => {
      const known = TransitionEditor.soundList();
      const sel = document.createElement('select');
      sel.id = id;
      const add = (value, text) => { const op = document.createElement('option'); op.value = value; op.textContent = text; sel.appendChild(op); };
      add('none', 'No sound');
      known.forEach((n) => add(n, n));
      add('__custom', 'Your own audio key…');
      const txt = document.createElement('input');
      txt.type = 'text';
      txt.placeholder = 'audio key, e.g. sfx-door';
      txt.setAttribute('aria-label', `${label}: your audio key`);
      const v = o[key];
      const custom = v && v !== 'none' && !known.includes(v);
      sel.value = custom ? '__custom' : v;
      txt.value = custom ? v : '';
      txt.hidden = !custom;
      const play = document.createElement('button');
      play.type = 'button';
      play.className = 'btn small';
      play.textContent = '▶';
      play.title = 'Hear it';
      play.setAttribute('aria-label', `Hear the ${label.toLowerCase()}`);
      play.addEventListener('click', () => this.hear(o[key]));
      sel.addEventListener('change', () => {
        if (sel.value === '__custom') { txt.hidden = false; txt.focus(); if (txt.value.trim()) set(txt.value.trim()); return; }
        txt.hidden = true;
        set(sel.value);
        this.hear(sel.value);
      });
      txt.addEventListener('change', () => set(txt.value.trim() || 'none'));
      ctl.append(sel, play, txt);
    } };
  }

  hear(name) {
    if (!name || name === 'none') return;
    const S = PhaserFX.Synth;
    if (typeof S[name] !== 'function') { Toast.show(`"${name}" is your own sound: it plays in your game once loaded with this.load.audio('${name}', …).`, 3600); return; }
    if (S.TIMED.includes(name)) S.play(name, (this.current.duration || 900) / 2); else S.play(name);
  }

  renderForm() { this.prevStyle = this.current.style; super.renderForm(); }

  onField(key) {
    if (key === 'style') { this.renderForm(); this.updateFocusUI(); }
    if (key === 'duration' || key === 'hold' || key.startsWith('ease')) this.graph.draw(this.current, null);
    this.changed();
  }

  // ------------------------------------------------------------ stage
  buildStage(bar) {
    this.stage.setBackground('stage-dark');
    this.stage.showStory('a');
    this.button(bar, '▶ Play', () => this.play(), 'btn small primary', 'Cover Scene A, swap, reveal Scene B (Space)');
    this.button(bar, 'Cover', () => this.half('cover'), 'btn small', 'Play only the cover half');
    this.button(bar, 'Reveal', () => this.half('reveal'), 'btn small', 'Play only the reveal half');
    this.toggle(bar, 'Loop', this.loop, (v) => { this.loop = v; if (v && !this.playing) this.play(); });
    this.toggle(bar, 'Auto-play edits', this.autoplay, (v) => { this.autoplay = v; }, 'Replay after each change');
    this.sep(bar);
    this.speedControl(bar);
    this.sep(bar);
    this.status = this.stat(bar, '');

    const below = this.els.below;
    const scrub = document.createElement('div');
    scrub.className = 'scrub';
    scrub.innerHTML = `<span class="seg" role="group" aria-label="Scrub phase"><button type="button" data-ph="cover" aria-pressed="true">Cover</button><button type="button" data-ph="reveal" aria-pressed="false">Reveal</button></span>
      <label for="tr-scrub">Scrub</label><input type="range" id="tr-scrub" min="0" max="1" step="0.001" value="0"><output id="tr-scrub-v">—</output>
      <button type="button" class="btn small" id="tr-scrub-x">Done</button>`;
    below.appendChild(scrub);
    const range = scrub.querySelector('#tr-scrub');
    range.addEventListener('input', () => { this.scrubT = parseFloat(range.value); this.renderScrub(); });
    scrub.querySelectorAll('[data-ph]').forEach((b) => b.addEventListener('click', () => {
      this.phase = b.dataset.ph;
      scrub.querySelectorAll('[data-ph]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      if (this.scrubT == null) this.scrubT = this.phase === 'cover' ? 0.5 : 0.5;
      this.renderScrub();
    }));
    scrub.querySelector('#tr-scrub-x').addEventListener('click', () => { this.scrubT = null; this.killPlayer(); this.stage.showStory('a'); this.syncScrub(); });
    this.scrubEls = { range, out: scrub.querySelector('#tr-scrub-v') };
    const g = document.createElement('div');
    below.appendChild(g);
    this.graph = new TimingGraph(g);

    this.stage.handlers.down = (p) => {
      this.focus = { x: Math.round(p.x), y: Math.round(p.y) };
      this.updateFocusUI();
      if (this.scrubT != null) this.renderScrub(true); else this.play();
    };
    this.stage.handlers.update = (t, d) => {
      if (this.clock != null) {
        this.clock += d * this.speed;
        this.graph.draw(this.current, this.clock);
      }
    };
    this.keys = (e) => {
      if (e.code === 'Space' && !/INPUT|SELECT|TEXTAREA|BUTTON/.test(document.activeElement.tagName)) { e.preventDefault(); this.play(); }
    };
    document.addEventListener('keydown', this.keys);
    this.updateFocusUI();
  }

  unmount() {
    super.unmount();
    document.removeEventListener('keydown', this.keys);
    this.killPlayer();
    this.loop = false;
  }

  updateFocusUI() {
    const uses = this.current ? this.styleOf().usesFocus : false;
    this.stage.setCross(this.focus.x, this.focus.y, !!uses);
    this.hint(uses ? `Click the stage to set where the ${this.styleOf().label.toLowerCase()} centres (${this.focus.x}, ${this.focus.y}), e.g. on your hero.` : 'Click the stage to play. Scenes swap while the screen is covered.');
  }

  killPlayer() {
    this.token = (this.token || 0) + 1;
    if (this.player) { try { this.player.destroy(); } catch (e) { /* already gone */ } }
    this.player = null;
    this.playing = false;
    this.clock = null;
    if (this.stage) this.stage.clearFx(this.speed, []);
    if (this.stage && this.current) this.stage.setCross(this.focus.x, this.focus.y, !!this.styleOf().usesFocus);
  }

  makePlayer() {
    const p = this.fx.transitionPlayer(this.output(), { x: this.focus.x, y: this.focus.y, screen: true });
    this.updateFocusUI();
    if (p.preset.fellBackFrom) {
      const what = p.preset.name && p.preset.name !== this.current.name ? `"${p.preset.name}"` : `a ${p.preset.style}`;
      this.hint(`This preview can't run ${this.styleOf().label.toLowerCase()} (${this.studio.preview === 'nowebgl' ? 'no WebGL' : 'low quality'}), so it plays ${what} instead, as players' devices would.`);
    }
    return p;
  }

  async play() {
    this.scrubT = null;
    this.syncScrub();
    this.killPlayer();
    const token = this.token;
    this.stage.showStory('a');
    this.playing = true;
    this.clock = 0;
    this.status.textContent = 'covering…';
    const p = this.makePlayer();
    this.player = p;
    await p.cover();
    if (token !== this.token) return;
    this.stage.showStory('b');
    this.status.textContent = this.current.hold ? 'covered: scene swapped' : 'swapped';
    await p.hold();
    if (token !== this.token) return;
    this.status.textContent = 'revealing…';
    await p.reveal();
    if (token !== this.token) return;
    this.player = null;
    this.playing = false;
    this.clock = null;
    this.graph.draw(this.current, null);
    this.status.textContent = `done · ${Math.round(this.current.duration + this.current.hold)} ms`;
    if (this.loop) this.stage.time.delayedCall(700, () => { if (token === this.token && this.loop) this.play(); });
  }

  async half(which) {
    this.scrubT = null;
    this.syncScrub();
    this.killPlayer();
    const token = this.token;
    const p = this.makePlayer();
    this.player = p;
    this.playing = true;
    if (which === 'cover') {
      this.stage.showStory('a');
      this.status.textContent = 'covering…';
      this.clock = 0;
      await p.cover();
      if (token !== this.token) return;
      this.clock = null;
      this.status.textContent = 'covered. Press Reveal';
      this.playing = false;
    } else {
      p.render(1, 'cover');
      this.stage.showStory('b');
      this.status.textContent = 'revealing…';
      this.clock = this.current.duration / 2 + this.current.hold;
      await p.reveal();
      if (token !== this.token) return;
      this.player = null;
      this.clock = null;
      this.playing = false;
      this.status.textContent = 'done';
    }
    this.graph.draw(this.current, null);
  }

  // ------------------------------------------------------------ scrubbing
  syncScrub() {
    if (!this.scrubEls) return;
    this.scrubEls.range.value = this.scrubT == null ? 0 : this.scrubT;
    this.scrubEls.out.textContent = this.scrubT == null ? '—' : `${Math.round(this.scrubT * 100)}% covered`;
  }

  renderScrub(rebuild) {
    if (this.scrubT == null) return;
    if (this.playing || !this.player || rebuild) {
      this.killPlayer();
      this.player = this.makePlayer();
    }
    this.stage.showStory(this.phase === 'cover' ? 'a' : 'b');
    this.player.render(this.scrubT, this.phase);
    const half = this.current.duration / 2;
    const ms = this.phase === 'cover'
      ? this.inverseEase(this.current.easeIn, this.scrubT) * half
      : half + this.current.hold + (1 - this.inverseEase(this.current.easeOut, 1 - this.scrubT, true)) * half;
    this.graph.draw(this.current, ms);
    this.syncScrub();
    this.status.textContent = `scrubbing ${this.phase}`;
  }

  /** Find the time fraction where the ease reaches coverage v (for the graph marker). */
  inverseEase(name, v, reveal) {
    const e = PhaserFX.ParticlePreset.ease(name);
    let best = 0;
    let err = 9;
    for (let i = 0; i <= 200; i++) {
      const t = i / 200;
      const y = reveal ? 1 - e(t) : e(t);
      const d = Math.abs(y - (reveal ? 1 - v : v));
      if (d < err) { err = d; best = t; }
    }
    return reveal ? 1 - best : best;
  }

  // ------------------------------------------------------------ preview + code
  preview() {
    this.graph.draw(this.current, null);
    this.updateFocusUI();
    if (this.scrubT != null) { this.renderScrub(true); return; }
    if (this.autoplay || this.loop) this.play();
  }

  codeTabs() {
    const p = this.output();
    const id = Exporter.ident(p.name);
    const isBuiltin = !this.dirty && !this.recordId && this.exampleName === p.name;
    const focus = this.styleOf().usesFocus ? `, x: hero.x, y: hero.y` : '';
    const add = isBuiltin ? `// "${p.name}" is built into PhaserFX: no setup needed.` : `// once (e.g. in your Boot scene): register the preset by name\nPhaserFX.presets.add(${id});`;
    const def = isBuiltin ? '' : `const ${id} = ${Exporter.json(p)};\n\n`;
    return [
      { label: 'PhaserFX', filename: `${id}.transition.js`, code: `${def}${add}

// A) cover the screen, change things while covered, reveal
await this.fx.transition('${p.name}', {${focus ? ` ${focus.slice(2)},` : ''} onCovered: () => {
  this.loadRoom(2);              // runs while the screen is hidden
} });

// B) move to another scene behind it (the reveal plays there by itself)
this.fx.goto('NextScene', { level: 2 }, '${p.name}');`,
      note: 'Needs Phaser 3.60+ and phaser-fx.js with the PhaserFX plugin (mapping: "fx"). Option B also works if NextScene has the plugin.' },
      { label: 'JSON', filename: `${id}.transition.json`, code: Exporter.json(p), note: 'Load it with this.load.json(…) then PhaserFX.presets.add(this.cache.json.get(…)).' },
      { label: 'Scrub / custom', code: `// Drive it yourself, e.g. tied to a drag, a door opening or a cutscene
const t = this.fx.transitionPlayer('${p.name}', { x: 480, y: 300, screen: true });
t.render(0.5, 'cover');          // 0 = clear … 1 = fully covered
await t.cover();                  // or animate the halves yourself
await t.hold();
await t.reveal();                 // removes itself when finished` }
    ];
  }
}
