/**
 * BaseEditor — what the three editors share: opening examples / saved presets,
 * the inspector header (name, Save, Duplicate, Delete), the stage toolbar
 * helpers, dirty state, an autosaved draft, and the debounced live preview.
 *
 * A subclass sets `kind` and implements:
 *   normalize(p)  blank()  output()  sections()  buildStage(bar)  preview()  codeTabs()  swatch(p)
 * and may override getSelection() / setSelection(sel) / onRestore() so undo
 * also brings back which layer or step was selected.
 */
class BaseEditor {
  constructor(studio, kind) {
    this.studio = studio;
    this.kind = kind;
    this.current = null;
    this.recordId = null;
    this.exampleName = null;
    this.dirty = false;
    this.openState = {};
    this.speed = 1;
    this.timer = null;
    this.savedJSON = null;
    this.history = new History();
    this.history.onChange(() => this.updateHistoryButtons());
  }

  get stage() { return this.studio.stage; }
  get fx() { return this.studio.stage.fx; }
  get store() { return this.studio.store; }

  // ------------------------------------------------------------ lifecycle
  mount() {
    this.els = {
      bar: document.getElementById('stage-bar'),
      hint: document.getElementById('stage-hint'),
      below: document.getElementById('below-stage'),
      insp: document.getElementById('inspector'),
      code: document.getElementById('code')
    };
    this.codePanel = new CodePanel(this.els.code);
    this.els.bar.innerHTML = '';
    this.els.below.innerHTML = '';
    this.els.hint.textContent = '';
    this.buildStage(this.els.bar);
    const draft = this.current ? null : this.readDraft();
    if (this.current) {
      // coming back to this tab: keep the preset and its undo history
      this.onLoad();
      this.renderInspector();
      this.studio.library.renderLists();
      this.refresh(true);
    } else if (draft && draft.preset) {
      this.recordId = draft.recordId && this.store.get(draft.recordId) ? draft.recordId : null;
      this.exampleName = draft.exampleName || null;
      this.load(draft.preset, { keepDirty: !!draft.dirty });
      const rec = this.recordId && this.store.get(this.recordId);
      if (rec && this.store.preset(rec)) this.savedJSON = JSON.stringify(this.normalize(this.store.preset(rec)));
    } else {
      this.openExample(this.examples()[0]);
    }
  }

  unmount() {
    this.history.flush();
    clearTimeout(this.timer);
    this.timer = null;
  }

  // ------------------------------------------------------------ library contract
  examples() { return PhaserFX.presets.builtins(this.kind); }

  exampleMeta() { return ''; }

  openExample(p) {
    if (!this.confirmLeave()) return;
    this.recordId = null;
    this.exampleName = p.name;
    this.load(PhaserFX.ParticlePreset.clone(p));
  }

  openRecord(r) {
    if (!this.confirmLeave()) return;
    const p = this.store.preset(r);
    if (!p) { Toast.show('That preset could not be read.'); return; }
    this.recordId = r.id;
    this.exampleName = null;
    this.load(p);
  }

  newPreset() {
    if (!this.confirmLeave()) return;
    this.recordId = null;
    this.exampleName = null;
    this.load(this.blank(), { keepDirty: true });
  }

  /** Switching away from unsaved work keeps it as the draft, so nothing is lost; we just say so. */
  confirmLeave() {
    if (this.dirty && this.current) Toast.show(`Unsaved changes to "${this.current.name}" were discarded. Save before switching to keep them.`, 3200);
    return true;
  }

  load(p, o = {}) {
    this.current = this.normalize(p);
    this.dirty = !!o.keepDirty;
    this.savedJSON = o.keepDirty ? null : JSON.stringify(this.current);
    this.onLoad();
    this.history.reset(this.snapshot());
    this.renderInspector();
    this.studio.library.renderLists();
    this.refresh(true);
  }

  /** Hook for subclasses (reset selection etc.). */
  onLoad() {}

  // ------------------------------------------------------------ inspector
  renderInspector() {
    const insp = this.els.insp;
    insp.innerHTML = '';
    const head = document.createElement('div');
    head.className = 'ins-head';
    const name = document.createElement('input');
    name.type = 'text';
    name.className = 'name';
    name.value = this.current.name;
    name.setAttribute('aria-label', 'Preset name');
    name.addEventListener('input', () => { this.current.name = name.value || 'Untitled'; this.changed(); });
    const badge = document.createElement('span');
    badge.className = 'badge';
    this.badge = badge;
    head.append(name, badge);
    insp.appendChild(head);

    const row = document.createElement('div');
    row.className = 'ins-row';
    const b = (label, fn, cls = 'btn small') => { const x = document.createElement('button'); x.type = 'button'; x.className = cls; x.textContent = label; x.addEventListener('click', fn); row.appendChild(x); return x; };
    b('Save', () => this.save(), 'btn small primary').title = 'Save to My presets (Ctrl/⌘ + S)';
    b('Save as copy', () => this.save(true));
    const sp = document.createElement('span');
    sp.style.flex = '1';
    row.appendChild(sp);
    this.undoBtn = b('↶ Undo', () => this.undo(), 'btn small');
    this.undoBtn.title = 'Undo (Ctrl/⌘ + Z)';
    this.redoBtn = b('↷ Redo', () => this.redo(), 'btn small');
    this.redoBtn.title = 'Redo (Ctrl/⌘ + Shift + Z or Ctrl + Y)';
    if (this.recordId) b('Delete', () => this.remove(), 'btn small danger');
    insp.appendChild(row);

    this.beforeForm(insp);
    const formRoot = document.createElement('div');
    insp.appendChild(formRoot);
    this.form = new Form(formRoot, (key) => this.onField(key));
    this.renderForm();
    this.updateBadge();
    this.updateHistoryButtons();
  }

  renderForm() { this.form.render(this.sections(), this.formTarget(), this.openState); }

  /** Object the form edits (the preset by default; a layer or step in subclasses). */
  formTarget() { return this.current; }

  /** Extra inspector content above the form (layers list, etc.). */
  beforeForm() {}

  onField() { this.changed(); }

  updateBadge() {
    if (!this.badge) return;
    const ex = !this.recordId && this.exampleName && this.exampleName === this.current.name;
    this.badge.className = `badge ${this.dirty ? 'dirty' : ex ? 'example' : ''}`;
    this.badge.textContent = this.dirty ? 'unsaved' : ex ? 'example' : this.recordId ? 'saved' : 'new';
    this.studio.setSaveState(this.dirty ? 'Unsaved changes' : '');
  }

  // ------------------------------------------------------------ change → preview + code
  changed() {
    this.history.touch(() => this.snapshot());
    this.dirty = true;
    this.updateBadge();
    this.refresh(false);
  }

  refresh(immediate) {
    clearTimeout(this.timer);
    const run = () => {
      this.writeDraft();
      try { this.codePanel.show(this.withDeviceNote(this.codeTabs())); } catch (e) { console.warn(e); }
      try { this.preview(); } catch (e) { console.warn('Preview failed', e); Toast.show(`Preview error: ${e.message}`); }
    };
    if (immediate) run(); else this.timer = setTimeout(run, 220);
  }

  // ------------------------------------------------------------ devices (fallback + heavy)
  /** Device features this preset needs (transitions override). */
  requirements() { return []; }

  static FEATURE_NAMES = { webgl: 'WebGL', shaderFX: 'WebGL object effects', postFX: 'WebGL camera effects' };

  /** Inspector section: what to play on devices or quality levels that can't run this preset. */
  deviceSection() {
    const req = this.requirements();
    const names = req.map((f) => BaseEditor.FEATURE_NAMES[f] || f).join(', ');
    const c = this.current;
    const desc = (req.length ? `Needs ${names}. Devices without it play the fallback below (or a simple version). ` : 'Runs on every device. ')
      + 'Mark it heavy to play the fallback when PhaserFX runs at low quality (slow phones, or a player who picks Low).';
    return { title: 'Devices', open: !!(c.fallback || c.heavy || req.length), note: req.length ? 'needs WebGL' : (c.fallback ? `fallback: ${c.fallback}` : ''), desc, fields: [
      { key: '__fallback', label: 'Fallback', type: 'custom', help: 'Another preset of the same kind, played instead when needed.', render: (ctl, o, set, id) => {
        const sel = document.createElement('select');
        sel.id = id;
        const add = (v, t) => { const op = document.createElement('option'); op.value = v; op.textContent = t; sel.appendChild(op); };
        add('', req.length ? 'Automatic (a simple version)' : 'None');
        PhaserFX.presets.list(this.kind).filter((n) => n !== c.name).forEach((n) => add(n, n));
        if (c.fallback && ![...sel.options].some((op) => op.value === c.fallback)) add(c.fallback, `${c.fallback} (not found)`);
        sel.value = c.fallback || '';
        sel.addEventListener('change', () => { this.current.fallback = sel.value; this.changed(); });
        ctl.appendChild(sel);
      } },
      { key: '__heavy', label: 'Heavy', type: 'custom', render: (ctl, o, set, id) => {
        const sw = document.createElement('span');
        sw.className = 'switch';
        const cb = document.createElement('input');
        cb.type = 'checkbox'; cb.id = id; cb.checked = !!c.heavy; cb.setAttribute('role', 'switch');
        cb.addEventListener('change', () => { this.current.heavy = cb.checked; this.changed(); });
        sw.append(cb, document.createElement('span'));
        ctl.appendChild(sw);
      } }
    ] };
  }

  /** Clean fallback/heavy for output: drop empty values. */
  static cleanDevice(p) {
    if (!p.fallback) delete p.fallback;
    if (!p.heavy) delete p.heavy;
    return p;
  }

  /** Add a line to the code panel about how this preset behaves on other devices. */
  withDeviceNote(tabs) {
    const req = this.requirements();
    const c = this.current;
    let note = '';
    if (req.length && !c.fallback) note = `Needs ${req.map((f) => BaseEditor.FEATURE_NAMES[f] || f).join(', ')}: devices without it play a simple fade. Pick a Fallback under Devices to choose.`;
    else if (req.length) note = `Devices without ${req.map((f) => BaseEditor.FEATURE_NAMES[f] || f).join(', ')} play "${c.fallback}".`;
    else if (c.heavy && c.fallback) note = `Heavy: plays "${c.fallback}" at low quality.`;
    else if (c.heavy) note = 'Marked heavy, but no fallback is set, so it plays as is at low quality.';
    if (note && tabs[0]) tabs[0] = { ...tabs[0], note: tabs[0].note ? `${tabs[0].note} ${note}` : note };
    return tabs;
  }

  // ------------------------------------------------------------ undo / redo
  /** Which layer / step is selected; subclasses override. */
  getSelection() { return null; }

  setSelection() {}

  /** Hook after undo/redo (re-render a timeline, etc.). */
  onRestore() {}

  snapshot() { return JSON.stringify({ preset: this.current, sel: this.getSelection() }); }

  undo() { this.restore(this.history.undo()); }

  redo() { this.restore(this.history.redo()); }

  restore(snap) {
    if (!snap) return;
    const { preset, sel } = JSON.parse(snap);
    this.current = preset;
    this.setSelection(sel);
    this.dirty = JSON.stringify(this.current) !== this.savedJSON;
    this.renderInspector();
    this.onRestore();
    this.refresh(true);
  }

  updateHistoryButtons() {
    if (this.undoBtn) this.undoBtn.disabled = !this.history.canUndo();
    if (this.redoBtn) this.redoBtn.disabled = !this.history.canRedo();
  }

  // ------------------------------------------------------------ saving
  async save(asCopy) {
    this.history.flush();
    const p = this.output();
    let id = asCopy ? null : this.recordId;
    const builtin = this.examples().some((e) => e.name === p.name);
    const taken = this.store.list(this.kind).some((r) => r.name === p.name && r.id !== id);
    if (!id && (builtin || taken)) {
      let n = 2;
      const base = builtin && !asCopy ? `${p.name} (mine)` : p.name;
      let name = base;
      while (this.examples().some((e) => e.name === name) || this.store.list(this.kind).some((r) => r.name === name)) name = `${base} ${n++}`;
      p.name = name;
      this.current.name = name;
    }
    const rec = await this.store.save(this.kind, p, id);
    this.recordId = rec.id;
    this.exampleName = null;
    this.dirty = false;
    this.savedJSON = JSON.stringify(this.current);
    this.history.present = this.snapshot(); // a rename on save is part of the current step
    this.studio.syncLibrary();
    this.renderInspector();
    this.studio.library.renderLists();
    this.writeDraft();
    this.codePanel.show(this.withDeviceNote(this.codeTabs()));
    Toast.show(`Saved "${rec.name}"${this.store.backend === 'cloud' ? '' : ' in this browser'}`);
    id = rec.id;
    return id;
  }

  async remove() {
    if (!this.recordId) return;
    const rec = this.store.get(this.recordId);
    if (!rec) return;
    if (this.pendingDelete !== rec.id) {
      this.pendingDelete = rec.id;
      Toast.show(`Press Delete again to remove "${rec.name}"`, 2600);
      setTimeout(() => { this.pendingDelete = null; }, 2600);
      return;
    }
    this.pendingDelete = null;
    await this.store.remove(rec.id);
    this.studio.syncLibrary();
    Toast.show(`Deleted "${rec.name}"`);
    this.dirty = false;
    this.recordId = null;
    this.openExample(this.examples()[0]);
  }

  // ------------------------------------------------------------ draft (per editor, this browser)
  draftKey() { return `pfx-studio-draft-${this.kind}`; }

  readDraft() {
    try { return JSON.parse(localStorage.getItem(this.draftKey()) || 'null'); } catch (e) { return null; }
  }

  writeDraft() {
    try { localStorage.setItem(this.draftKey(), JSON.stringify({ recordId: this.recordId, exampleName: this.exampleName, dirty: this.dirty, preset: this.current })); } catch (e) { /* storage blocked */ }
  }

  // ------------------------------------------------------------ stage toolbar helpers
  button(bar, label, fn, cls = 'btn small', title) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    b.textContent = label;
    if (title) b.title = title;
    b.addEventListener('click', fn);
    bar.appendChild(b);
    return b;
  }

  toggle(bar, label, value, fn, title) {
    const b = this.button(bar, label, () => { const v = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(v)); fn(v); }, 'btn small', title);
    b.setAttribute('aria-pressed', String(!!value));
    return b;
  }

  select(bar, label, options, value, fn) {
    const wrap = document.createElement('label');
    wrap.className = 'mode';
    const t = document.createElement('span');
    t.textContent = label;
    const s = document.createElement('select');
    options.forEach((o) => { const op = document.createElement('option'); op.value = o.value; op.textContent = o.label; s.appendChild(op); });
    s.value = value;
    s.addEventListener('change', () => fn(s.value));
    wrap.append(t, s);
    bar.appendChild(wrap);
    return s;
  }

  seg(bar, label, options, value, fn) {
    const g = document.createElement('span');
    g.className = 'seg';
    g.setAttribute('role', 'group');
    g.setAttribute('aria-label', label);
    const btns = options.map((o) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = o.label;
      b.setAttribute('aria-pressed', String(o.value === value));
      b.addEventListener('click', () => { btns.forEach((x) => x.setAttribute('aria-pressed', String(x === b))); fn(o.value); });
      g.appendChild(b);
      return b;
    });
    bar.appendChild(g);
    return g;
  }

  sep(bar) { const s = document.createElement('span'); s.className = 'sep'; bar.appendChild(s); }

  stat(bar, text) { const s = document.createElement('span'); s.className = 'stat'; s.textContent = text; bar.appendChild(s); return s; }

  speedControl(bar) {
    this.seg(bar, 'Playback speed', [{ value: 1, label: '1×' }, { value: 0.5, label: '½×' }, { value: 0.2, label: '⅕×' }], this.speed, (v) => {
      this.speed = v;
      this.fx.setTimeScale(v);
    });
  }

  hint(text) { this.els.hint.textContent = text; }

  /** Keep a number field and the object in sync without rebuilding the form. */
  static round(v, step = 1) { return Math.round(v / step) * step; }
}
