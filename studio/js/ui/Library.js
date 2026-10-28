/**
 * Library — the left column: actions, "My presets" and built-in examples for
 * the current editor. Examples are read-only; editing one starts a copy.
 */
class Library {
  constructor(studio, root) {
    this.studio = studio;
    this.root = root;
    this.filter = '';
  }

  render() {
    const ed = this.studio.editor;
    const root = this.root;
    root.innerHTML = '';

    const actions = document.createElement('div');
    actions.className = 'lib-actions';
    const btn = (label, fn, cls = 'btn small') => { const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.textContent = label; b.addEventListener('click', fn); actions.appendChild(b); return b; };
    btn('New', () => ed.newPreset(), 'btn small primary');
    btn('Import', () => this.importDialog());
    btn('Export all', () => this.exportAll());
    root.appendChild(actions);

    const search = document.createElement('input');
    search.type = 'text';
    search.id = 'lib-search';
    search.className = 'lib-search';
    search.placeholder = 'Filter presets';
    search.value = this.filter;
    search.setAttribute('aria-label', 'Filter presets');
    search.addEventListener('input', () => { this.filter = search.value.toLowerCase(); this.renderLists(); search.focus(); });
    root.appendChild(search);

    this.lists = document.createElement('div');
    root.appendChild(this.lists);
    this.renderLists();
  }

  renderLists() {
    const ed = this.studio.editor;
    const store = this.studio.store;
    const box = this.lists;
    box.innerHTML = '';
    const match = (n) => !this.filter || n.toLowerCase().includes(this.filter);

    const mine = store.list(ed.kind).filter((r) => match(r.name));
    box.appendChild(this.group(`My presets`, store.backend === 'cloud' ? 'synced' : 'this browser', mine.map((r) => ({
      name: r.name, current: ed.recordId === r.id, color: ed.swatch(store.preset(r) || {}), meta: '',
      open: () => ed.openRecord(r)
    })), 'Nothing saved yet. Edit an example or press New, then Save.'));

    const ex = ed.examples().filter((p) => match(p.name));
    box.appendChild(this.group('Examples', `${ex.length}`, ex.map((p) => ({
      name: p.name, current: !ed.recordId && ed.exampleName === p.name, color: ed.swatch(p), meta: ed.exampleMeta(p),
      open: () => ed.openExample(p)
    }))));
  }

  group(title, note, items, empty) {
    const g = document.createElement('div');
    g.className = 'lib-group';
    const h = document.createElement('h4');
    h.innerHTML = `<span>${title}</span><span>${note}</span>`;
    g.appendChild(h);
    if (!items.length && empty) { const e = document.createElement('div'); e.className = 'lib-empty'; e.textContent = empty; g.appendChild(e); }
    items.forEach((it) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'lib-item';
      b.setAttribute('aria-current', String(!!it.current));
      const sw = document.createElement('span');
      sw.className = 'sw';
      sw.style.background = it.color || 'var(--line-2)';
      const t = document.createElement('span');
      t.textContent = it.name;
      b.append(sw, t);
      if (it.meta) { const m = document.createElement('span'); m.className = 'meta'; m.textContent = it.meta; b.appendChild(m); }
      b.addEventListener('click', it.open);
      g.appendChild(b);
    });
    return g;
  }

  exportAll() {
    const ed = this.studio.editor;
    const presets = this.studio.store.list(ed.kind).map((r) => this.studio.store.preset(r)).filter(Boolean);
    if (!presets.length) { Toast.show('Save a preset first, then export.'); return; }
    Exporter.download(`phaserfx-${ed.kind}.json`, Exporter.json(PhaserFX.presets.pack(presets, `My ${ed.kind}`)));
  }

  importDialog() {
    const m = document.createElement('div');
    m.className = 'modal';
    m.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="imp-h">
      <h3 id="imp-h">Import presets</h3>
      <p class="desc">Paste preset JSON (a single preset or an exported pack), or choose a .json file. Presets go to "My presets" under the matching editor.</p>
      <textarea id="imp-text" rows="10" placeholder='{ "format": "phaserfx-particles", "name": "…", "layers": [ … ] }'></textarea>
      <div class="row"><label class="btn"><input type="file" id="imp-file" accept=".json,application/json" hidden>Choose file…</label>
      <span style="flex:1"></span><button type="button" class="btn" id="imp-cancel">Cancel</button><button type="button" class="btn primary" id="imp-ok">Import</button></div></div>`;
    document.body.appendChild(m);
    const ta = m.querySelector('#imp-text');
    ta.focus();
    m.querySelector('#imp-file').addEventListener('change', (e) => { const f = e.target.files[0]; if (f) f.text().then((t) => { ta.value = t; }); });
    const close = () => m.remove();
    m.querySelector('#imp-cancel').addEventListener('click', close);
    m.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    m.querySelector('#imp-ok').addEventListener('click', async () => {
      let data;
      try { data = JSON.parse(ta.value); } catch (e) { Toast.show('That is not valid JSON. Check for a missing bracket or comma.'); return; }
      const list = Array.isArray(data) ? data : data.presets || [data];
      let n = 0;
      for (const p of list) {
        const kind = PhaserFX.presets.kindOf(p);
        if (!kind || !p.name) continue;
        await this.studio.store.save(kind, p);
        n += 1;
      }
      close();
      Toast.show(n ? `Imported ${n} preset${n > 1 ? 's' : ''}` : 'No PhaserFX presets found in that JSON');
      this.studio.syncLibrary();
      this.renderLists();
    });
  }
}
