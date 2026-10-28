/**
 * Store — saves "My presets". Inside claude.ai it uses the page's private
 * per-person database (your presets follow you across devices); opened as a
 * local file it falls back to this browser's localStorage.
 *
 * Records: { id, kind: 'particles'|'effects'|'transitions', name, json, updatedAt }
 */
class Store {
  constructor() {
    this.items = [];
    this.backend = 'local';
    this.listeners = [];
  }

  async init() {
    this.items = this.readLocal();
    try {
      if (window.claude && typeof window.claude.use === 'function') {
        const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
        const id = user ? await user.id() : null;
        if (db && id) {
          this.col = db.collection(`data/users/${id}`);
          const snap = await this.col.limit(1000).get();
          const remote = snap.docs.map((d) => d.data()).filter((r) => r && r.kind && r.json);
          // first run in the cloud: carry over anything saved locally before
          if (!remote.length && this.items.length) await Promise.all(this.items.map((r) => this.col.doc(r.id).set(r)));
          else this.items = remote;
          this.backend = 'cloud';
        }
      }
    } catch (e) {
      this.backend = 'local';
    }
    this.emit();
    return this;
  }

  readLocal() {
    try { return JSON.parse(localStorage.getItem('pfx-studio-presets') || '[]'); } catch (e) { return []; }
  }

  writeLocal() {
    try { localStorage.setItem('pfx-studio-presets', JSON.stringify(this.items)); } catch (e) { /* storage blocked */ }
  }

  onChange(fn) { this.listeners.push(fn); }
  emit() { this.listeners.forEach((fn) => fn(this.items)); }

  list(kind) { return this.items.filter((r) => r.kind === kind).sort((a, b) => a.name.localeCompare(b.name)); }

  get(id) { return this.items.find((r) => r.id === id) || null; }

  static newId(kind) { return `${kind}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`; }

  /** Insert or update. Returns the record. */
  async save(kind, preset, id) {
    const rec = { id: id || Store.newId(kind), kind, name: preset.name || 'Untitled', json: JSON.stringify(preset), updatedAt: Date.now() };
    const i = this.items.findIndex((r) => r.id === rec.id);
    if (i >= 0) this.items[i] = rec; else this.items.push(rec);
    this.writeLocal();
    if (this.col) {
      try { await this.col.doc(rec.id).set(rec); } catch (e) { Toast.show(`Saved in this browser only (${e.code || 'cloud unavailable'})`); }
    }
    this.emit();
    return rec;
  }

  async remove(id) {
    this.items = this.items.filter((r) => r.id !== id);
    this.writeLocal();
    if (this.col) { try { await this.col.doc(id).delete(); } catch (e) { /* ignore */ } }
    this.emit();
  }

  preset(rec) { try { return JSON.parse(rec.json); } catch (e) { return null; } }
}
