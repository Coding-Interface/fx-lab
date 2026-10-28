/**
 * CodeView — shows the real source file behind each effect, with a tiny
 * syntax highlighter (comments, strings, keywords, numbers).
 */
class CodeView {
  static KEYWORDS = new Set(('class extends static const let var return if else for of in new async await this super ' +
    'true false null undefined function switch case break continue typeof while do try catch').split(' '));

  constructor(root) {
    this.root = root;
    this.tabs = root.querySelector('.code-files');
    this.pre = root.querySelector('code');
    this.copyBtn = root.querySelector('.code-copy');
    this.cache = {};
    this.text = '';
    this.copyBtn.addEventListener('click', () => this.copy());
  }

  show(files) {
    this.tabs.innerHTML = '';
    files.forEach((f, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = f.split('/').pop();
      b.title = f;
      b.addEventListener('click', () => this.load(f, b));
      this.tabs.appendChild(b);
      if (i === 0) this.load(f, b);
    });
  }

  async load(file, btn) {
    this.tabs.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === btn)));
    this.current = file;
    this.pre.textContent = 'Loading…';
    try {
      if (!this.cache[file]) {
        const r = await fetch(file);
        if (!r.ok) throw new Error(r.status);
        this.cache[file] = await r.text();
      }
      if (this.current !== file) return;
      this.text = this.cache[file];
      this.pre.innerHTML = CodeView.highlight(this.text);
    } catch (e) {
      this.text = '';
      this.pre.textContent = `Could not load ${file}. Open the project folder with a local web server to read the code here.`;
    }
  }

  async copy() {
    if (!this.text) return;
    try {
      await navigator.clipboard.writeText(this.text);
      this.copyBtn.textContent = 'Copied';
    } catch (e) {
      this.copyBtn.textContent = 'Select & copy';
    }
    setTimeout(() => { this.copyBtn.textContent = 'Copy'; }, 1400);
  }

  static esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  static highlight(src) {
    const re = /(\/\*[\s\S]*?\*\/|\/\/[^\n]*)|('(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`)|\b(0x[0-9a-fA-F]+|\d+(?:\.\d+)?)\b|([A-Za-z_$][\w$]*)/g;
    let out = '';
    let last = 0;
    let m;
    while ((m = re.exec(src))) {
      out += CodeView.esc(src.slice(last, m.index));
      const [tok, com, str, num, word] = m;
      if (com) out += `<span class="tk-c">${CodeView.esc(tok)}</span>`;
      else if (str) out += `<span class="tk-s">${CodeView.esc(tok)}</span>`;
      else if (num) out += `<span class="tk-n">${tok}</span>`;
      else if (word && CodeView.KEYWORDS.has(word)) out += `<span class="tk-k">${tok}</span>`;
      else if (word && /^(Juice|Phaser|CardArt|Card|RarityFX|FXTextures|BaseEffect)$/.test(word)) out += `<span class="tk-t">${tok}</span>`;
      else out += CodeView.esc(tok);
      last = re.lastIndex;
    }
    return out + CodeView.esc(src.slice(last));
  }
}
