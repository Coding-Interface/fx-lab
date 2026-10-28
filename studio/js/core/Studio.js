/**
 * Studio — the app shell. Owns the store, the single preview game, the
 * library column and the three editors, and switches between them.
 */
class Studio {
  constructor() {
    this.store = new Store();
    this.editors = {
      transitions: new TransitionEditor(this),
      particles: new ParticleEditor(this),
      effects: new EffectEditor(this)
    };
    this.editor = null;
    this.library = new Library(this, document.getElementById('library'));
  }

  async start() {
    await this.store.init();
    this.syncLibrary();
    await this.bootGame();
    this.bindChrome();
    this.bindPreviewAs();
    const fromHash = (location.hash || '').replace('#', '');
    let last = null;
    try { last = localStorage.getItem('pfx-studio-tab'); } catch (e) { /* storage blocked */ }
    this.select(this.editors[fromHash] ? fromHash : this.editors[last] ? last : 'particles');
  }

  bootGame() {
    return new Promise((resolve) => {
      this.game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: 'stage',
        width: 960,
        height: 600,
        backgroundColor: '#0b0e15',
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        plugins: { scene: [PhaserFX.plugin] },
        scene: [StageScene],
        banner: false
      });
      this.game.events.once('stage-ready', (scene) => { this.stage = scene; resolve(); });
    });
  }

  bindChrome() {
    document.querySelectorAll('.tabs [data-editor]').forEach((b) => b.addEventListener('click', () => this.select(b.dataset.editor)));
    const tabs = [...document.querySelectorAll('.tabs [data-editor]')];
    tabs.forEach((b, i) => b.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      n.focus();
      this.select(n.dataset.editor);
    }));
    const help = document.getElementById('help');
    const hb = document.getElementById('btn-help');
    hb.addEventListener('click', () => { help.hidden = !help.hidden; hb.setAttribute('aria-expanded', String(!help.hidden)); this.game.scale.refresh(); });
    document.addEventListener('keydown', (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod || !this.editor) return;
      const k = e.key.toLowerCase();
      if (k === 's') { e.preventDefault(); this.editor.save(); return; }
      // text boxes keep their own typing undo
      const el = document.activeElement;
      const typing = el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && /^(text|number|search)$/.test(el.type)));
      if (typing || document.querySelector('.modal')) return;
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); this.editor.undo(); }
      else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); this.editor.redo(); }
    });
    window.addEventListener('hashchange', () => { const k = location.hash.replace('#', ''); if (this.editors[k] && this.editor !== this.editors[k]) this.select(k); });
  }

  /** "Preview as": see presets as they play on other devices and quality levels. */
  static PREVIEWS = [
    { value: 'auto', label: 'This device' },
    { value: 'high', label: 'High quality' },
    { value: 'medium', label: 'Medium quality' },
    { value: 'low', label: 'Low quality (slow phones)' },
    { value: 'nowebgl', label: 'No WebGL (older devices)' },
    { value: 'reduced', label: 'Reduced motion' }
  ];

  bindPreviewAs() {
    const S = PhaserFX.settings;
    this.baseReduced = S.reducedMotion;
    S.adaptive = false; // the editor UI shouldn't change the preview level by itself
    const sel = document.getElementById('preview-as');
    const tier = PhaserFX.device.info ? PhaserFX.device.info.tier : 'high';
    Studio.PREVIEWS.forEach((o) => { const op = document.createElement('option'); op.value = o.value; op.textContent = o.value === 'auto' ? `This device (${tier})` : o.label; sel.appendChild(op); });
    let saved = 'auto';
    try { saved = localStorage.getItem('pfx-studio-preview') || 'auto'; } catch (e) { /* storage blocked */ }
    sel.value = Studio.PREVIEWS.some((o) => o.value === saved) ? saved : 'auto';
    sel.addEventListener('change', () => { this.applyPreview(sel.value); if (this.editor) this.editor.refresh(true); });
    this.applyPreview(sel.value);
  }

  applyPreview(mode) {
    const S = PhaserFX.settings;
    S.quality = ['high', 'medium', 'low'].includes(mode) ? mode : 'auto';
    PhaserFX.device.override(mode === 'nowebgl' ? { webgl: false } : {});
    S.reducedMotion = mode === 'reduced' ? true : this.baseReduced;
    this.preview = mode;
    document.querySelector('.preview-as').classList.toggle('active', mode !== 'auto');
    try { localStorage.setItem('pfx-studio-preview', mode); } catch (e) { /* storage blocked */ }
    if (mode !== 'auto') Toast.show(`Previewing as: ${Studio.PREVIEWS.find((o) => o.value === mode).label}`);
  }

  select(kind) {
    const ed = this.editors[kind];
    if (!ed) return;
    if (this.editor) this.editor.unmount();
    this.stage.reset();
    this.editor = ed;
    document.querySelectorAll('.tabs [data-editor]').forEach((b) => { const on = b.dataset.editor === kind; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
    document.getElementById('studio').dataset.editor = kind;
    try { localStorage.setItem('pfx-studio-tab', kind); } catch (e) { /* storage blocked */ }
    if (location.hash.replace('#', '') !== kind) { try { history.replaceState(null, '', `#${kind}`); } catch (e) { /* sandboxed */ } }
    this.library.render();
    ed.mount();
  }

  /** Register every saved preset with PhaserFX so previews and other editors can use them by name. */
  syncLibrary() {
    Object.values(PhaserFX.presets.store).forEach((m) => m.clear());
    this.store.items.forEach((r) => { const p = this.store.preset(r); if (p) PhaserFX.presets.add(p); });
  }

  /** From the Effect editor: jump to the particle preset a step uses. */
  editParticles(name) {
    this.select('particles');
    const ed = this.editors.particles;
    const rec = this.store.list('particles').find((r) => r.name === name);
    if (rec) { ed.openRecord(rec); return; }
    const ex = ed.examples().find((p) => p.name === name);
    if (ex) ed.openExample(ex);
  }

  setSaveState(text) {
    const el = document.getElementById('save-state');
    if (el.textContent !== text) el.textContent = text;
  }
}
