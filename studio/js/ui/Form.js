/**
 * Form — builds inspector controls from a schema and writes changes straight
 * into the edited object (by dotted path). Every editor uses it.
 *
 * Section: { title, open, note, fields: [Field] }
 * Field:   { key: 'emit.count', label, type, min, max, step, options, help, show(obj) }
 * Types:   range · number · minmax · select · ease · color · colors · bool · text · custom(render)
 */
class Form {
  static EASES = ['Linear', 'Sine.easeIn', 'Sine.easeOut', 'Sine.easeInOut', 'Quad.easeIn', 'Quad.easeOut', 'Quad.easeInOut',
    'Cubic.easeIn', 'Cubic.easeOut', 'Cubic.easeInOut', 'Quart.easeIn', 'Quart.easeOut', 'Quint.easeIn', 'Quint.easeOut',
    'Expo.easeIn', 'Expo.easeOut', 'Back.easeIn', 'Back.easeOut', 'Back.easeInOut', 'Elastic.easeOut', 'Bounce.easeOut', 'Circ.easeOut'];

  static uid = 0;

  static get(o, path) { return path.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o); }

  static set(o, path, v) {
    const ks = path.split('.');
    let t = o;
    ks.slice(0, -1).forEach((k) => { if (t[k] == null || typeof t[k] !== 'object') t[k] = {}; t = t[k]; });
    t[ks[ks.length - 1]] = v;
  }

  constructor(root, onChange) {
    this.root = root;
    this.onChange = onChange;
    this.rows = [];
  }

  render(sections, obj, openState = {}) {
    this.obj = obj;
    this.rows = [];
    this.root.innerHTML = '';
    sections.forEach((sec) => {
      const d = document.createElement('details');
      d.className = 'sec';
      d.open = openState[sec.title] != null ? openState[sec.title] : sec.open !== false;
      d.addEventListener('toggle', () => { openState[sec.title] = d.open; });
      const s = document.createElement('summary');
      s.textContent = sec.title;
      if (sec.note) { const n = document.createElement('span'); n.className = 'sum-note'; n.textContent = sec.note; s.appendChild(n); }
      d.appendChild(s);
      const body = document.createElement('div');
      body.className = 'sec-body';
      if (sec.desc) { const p = document.createElement('p'); p.className = 'desc'; p.textContent = sec.desc; body.appendChild(p); }
      sec.fields.forEach((f) => body.appendChild(this.field(f)));
      d.appendChild(body);
      this.root.appendChild(d);
    });
    this.refresh();
  }

  /** Re-check which fields are visible (e.g. after a mode change). */
  refresh() { this.rows.forEach(({ el, f }) => { el.hidden = f.show ? !f.show(this.obj) : false; }); }

  change(f, v) {
    Form.set(this.obj, f.key, v);
    if (f.onSet) f.onSet(v, this.obj);
    this.refresh();
    this.onChange(f.key, v);
  }

  field(f) {
    const id = `f${++Form.uid}`;
    const row = document.createElement('div');
    row.className = `f ${f.type}`;
    const lab = document.createElement('label');
    lab.textContent = f.label;
    lab.htmlFor = id;
    const ctl = document.createElement('div');
    ctl.className = 'ctl';
    const v = Form.get(this.obj, f.key);
    const num = (val) => { const n = parseFloat(val); return Number.isFinite(n) ? n : 0; };

    switch (f.type) {
      case 'range': case 'number': {
        const r = document.createElement('input');
        r.type = 'range'; r.min = f.min; r.max = f.max; r.step = f.step || 1; r.value = v; r.id = id;
        const n = document.createElement('input');
        n.type = 'number'; n.step = f.step || 1; n.value = v; n.setAttribute('aria-label', `${f.label} value`);
        r.addEventListener('input', () => { n.value = r.value; this.change(f, num(r.value)); });
        n.addEventListener('change', () => { r.value = n.value; this.change(f, num(n.value)); });
        ctl.append(r, n);
        break;
      }
      case 'minmax': {
        const a = document.createElement('input');
        const b = document.createElement('input');
        [a, b].forEach((el, i) => { el.type = 'number'; el.step = f.step || 1; el.value = (v || {})[i ? 'max' : 'min']; el.setAttribute('aria-label', `${f.label} ${i ? 'max' : 'min'}`); });
        a.id = id;
        const upd = () => this.change(f, { min: num(a.value), max: num(b.value) });
        a.addEventListener('change', upd);
        b.addEventListener('change', upd);
        const dash = document.createElement('span');
        dash.textContent = '–';
        dash.style.color = 'var(--faint)';
        ctl.append(a, dash, b);
        break;
      }
      case 'select': case 'ease': {
        const s = document.createElement('select');
        s.id = id;
        const opts = typeof f.options === 'function' ? f.options(this.obj) : (f.type === 'ease' ? Form.EASES : f.options);
        opts.forEach((o) => {
          const op = document.createElement('option');
          const val = typeof o === 'object' ? o.value : o;
          op.value = val;
          op.textContent = typeof o === 'object' ? o.label : o;
          s.appendChild(op);
        });
        s.value = v;
        s.addEventListener('change', () => this.change(f, s.value));
        ctl.appendChild(s);
        break;
      }
      case 'color': {
        const c = document.createElement('input');
        c.type = 'color'; c.id = id; c.value = Form.toHex(v);
        const t = document.createElement('input');
        t.type = 'text'; t.value = Form.toHex(v); t.setAttribute('aria-label', `${f.label} hex`); t.style.fontFamily = 'var(--mono)';
        c.addEventListener('input', () => { t.value = c.value; this.change(f, c.value); });
        t.addEventListener('change', () => { if (/^#[0-9a-f]{6}$/i.test(t.value)) { c.value = t.value; this.change(f, t.value); } });
        ctl.append(c, t);
        break;
      }
      case 'colors': {
        const wrap = document.createElement('div');
        wrap.className = 'colors';
        const grad = document.createElement('div');
        grad.className = 'gradient';
        const draw = () => {
          wrap.innerHTML = '';
          const arr = Form.get(this.obj, f.key) || [];
          arr.forEach((col, i) => {
            const chip = document.createElement('span');
            chip.className = 'chip';
            const c = document.createElement('input');
            c.type = 'color'; c.value = Form.toHex(col); c.setAttribute('aria-label', `Colour ${i + 1}`);
            if (i === 0) c.id = id;
            c.addEventListener('input', () => { arr[i] = c.value; grad.style.background = Form.gradient(arr); this.change(f, arr); });
            chip.appendChild(c);
            if (arr.length > 1) {
              const x = document.createElement('button');
              x.type = 'button'; x.className = 'x'; x.textContent = '×'; x.setAttribute('aria-label', `Remove colour ${i + 1}`);
              x.addEventListener('click', () => { arr.splice(i, 1); draw(); this.change(f, arr); });
              chip.appendChild(x);
            }
            wrap.appendChild(chip);
          });
          if (arr.length < 8) {
            const add = document.createElement('button');
            add.type = 'button'; add.className = 'btn small'; add.textContent = '+ colour';
            add.addEventListener('click', () => { arr.push(arr[arr.length - 1] || '#ffffff'); draw(); this.change(f, arr); });
            wrap.appendChild(add);
          }
          grad.style.background = Form.gradient(arr);
        };
        draw();
        ctl.appendChild(wrap);
        row.append(lab, ctl, grad);
        this.rows.push({ el: row, f });
        if (f.help) row.appendChild(Form.help(f.help));
        return row;
      }
      case 'bool': {
        const sw = document.createElement('span');
        sw.className = 'switch';
        const c = document.createElement('input');
        c.type = 'checkbox'; c.id = id; c.checked = !!v; c.setAttribute('role', 'switch');
        c.addEventListener('change', () => this.change(f, c.checked));
        sw.append(c, document.createElement('span'));
        ctl.appendChild(sw);
        break;
      }
      case 'text': {
        const t = document.createElement('input');
        t.type = 'text'; t.id = id; t.value = v == null ? '' : v;
        t.addEventListener('input', () => this.change(f, t.value));
        ctl.appendChild(t);
        break;
      }
      case 'custom': f.render(ctl, this.obj, (val) => this.change(f, val), id); break;
      default: break;
    }
    row.append(lab, ctl);
    if (f.help) row.appendChild(Form.help(f.help));
    this.rows.push({ el: row, f });
    return row;
  }

  static help(text) { const h = document.createElement('div'); h.className = 'help-t'; h.textContent = text; return h; }

  static toHex(v) {
    if (typeof v === 'number') return `#${v.toString(16).padStart(6, '0')}`;
    if (typeof v === 'string' && /^#[0-9a-f]{3}$/i.test(v)) return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
    return typeof v === 'string' && v.startsWith('#') ? v.slice(0, 7) : '#ffffff';
  }

  static gradient(arr) {
    if (!arr || !arr.length) return 'transparent';
    if (arr.length === 1) return Form.toHex(arr[0]);
    return `linear-gradient(90deg, ${arr.map(Form.toHex).join(', ')})`;
  }
}
