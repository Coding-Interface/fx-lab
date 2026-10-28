/**
 * CodePanel — "Use in game": tabs of ready-to-paste code for the current preset,
 * with Copy and Save file.
 */
class CodePanel {
  constructor(root) {
    this.root = root;
    this.tab = 0;
    this.tabs = [];
  }

  /** tabs: [{ label, code, filename?, note? }] */
  show(tabs) {
    this.tabs = tabs;
    if (this.tab >= tabs.length) this.tab = 0;
    const r = this.root;
    r.innerHTML = `<div class="code-head"><h3>Use in game</h3><div class="code-tabs" role="tablist" aria-label="Code formats"></div><span class="grow"></span>
      <button type="button" class="btn small" id="code-copy">Copy</button><button type="button" class="btn small" id="code-save">Save file</button></div>
      <pre tabindex="0" aria-label="Code"><code></code></pre><p class="note" hidden></p>`;
    const tl = r.querySelector('.code-tabs');
    tabs.forEach((t, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.textContent = t.label;
      b.setAttribute('aria-selected', String(i === this.tab));
      b.addEventListener('click', () => { this.tab = i; this.show(this.tabs); });
      tl.appendChild(b);
    });
    const cur = tabs[this.tab];
    r.querySelector('code').innerHTML = CodePanel.highlight(cur.code);
    const note = r.querySelector('.note');
    if (cur.note) { note.hidden = false; note.textContent = cur.note; }
    r.querySelector('#code-copy').addEventListener('click', () => Exporter.copy(cur.code));
    const save = r.querySelector('#code-save');
    save.hidden = !cur.filename;
    save.addEventListener('click', () => Exporter.download(cur.filename, cur.code));
  }

  static esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  static highlight(src) {
    const re = /(\/\/[^\n]*)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|\b(\d+(?:\.\d+)?)\b|\b(const|let|await|async|new|return|this|function|true|false|null|import|from|class|extends)\b/g;
    let out = '';
    let last = 0;
    let m;
    while ((m = re.exec(src))) {
      out += CodePanel.esc(src.slice(last, m.index));
      const cls = m[1] ? 'tk-c' : m[2] ? 'tk-s' : m[3] ? 'tk-n' : 'tk-k';
      out += `<span class="${cls}">${CodePanel.esc(m[0])}</span>`;
      last = re.lastIndex;
    }
    return out + CodePanel.esc(src.slice(last));
  }
}
