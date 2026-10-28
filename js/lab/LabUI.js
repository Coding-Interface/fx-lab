/**
 * LabUI — the HTML around the game canvas: purpose filter, grouped effect
 * list, toolbar, sliders, steps, code viewer and the Principles view.
 */
class LabUI {
  static PURPOSE_LABEL = { games: 'Games', learning: 'Learning', stories: 'Stories' };

  constructor(game) {
    this.game = game;
    this.values = {};
    this.purpose = 'all';
    try { this.purpose = localStorage.getItem('fxlab-purpose') || 'all'; } catch (e) { /* storage blocked */ }
    this.$ = (sel) => document.querySelector(sel);
    this.code = new CodeView(this.$('#tab-code'));
    this.$('#view-principles').innerHTML = Principles.html();
    this.buildFilter();
    this.buildList();
    this.applyFilter();
    this.bindToolbar();
    this.bindTabs();
    this.bindKeys();
    const fromHash = (location.hash || '').replace('#fx-', '');
    this.pending = EffectRegistry.list.some((e) => e.id === fromHash) ? fromHash : 'legendary';
    if (game.isBooted) this.boot();
    else game.events.once('ready', () => this.boot());
  }

  boot() {
    this.game.scene.add('LabScene', LabScene, false);
    this.select(this.pending);
  }

  scene() { return this.game.scene.getScene('LabScene'); }

  // ---------------------------------------------------------------- purpose filter
  buildFilter() {
    const root = this.$('#purpose-filter');
    root.innerHTML = '';
    EffectRegistry.PURPOSES.forEach((p) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.purpose = p.id;
      const n = EffectRegistry.list.filter((E) => EffectRegistry.matches(E, p.id)).length;
      b.innerHTML = `${p.title} <span class="n">${n}</span>`;
      b.addEventListener('click', () => {
        this.purpose = p.id;
        try { localStorage.setItem('fxlab-purpose', p.id); } catch (e) { /* storage blocked */ }
        this.applyFilter();
      });
      root.appendChild(b);
    });
  }

  applyFilter() {
    document.querySelectorAll('#purpose-filter button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.purpose === this.purpose)));
    document.querySelectorAll('.grp').forEach((sec) => {
      let shown = 0;
      sec.querySelectorAll('.fx-item').forEach((b) => {
        const ok = EffectRegistry.matches(EffectRegistry.get(b.dataset.id), this.purpose);
        b.hidden = !ok;
        if (ok) shown += 1;
      });
      sec.hidden = shown === 0;
      sec.querySelector('.grp-n').textContent = shown;
    });
  }

  // ---------------------------------------------------------------- effect list
  buildList() {
    const root = this.$('#effect-list');
    root.innerHTML = '';
    EffectRegistry.GROUPS.forEach((g) => {
      const effects = EffectRegistry.list.filter((e) => e.group === g.id);
      if (!effects.length) return;
      const sec = document.createElement('section');
      sec.className = 'grp';
      sec.dataset.group = g.id;
      sec.innerHTML = `<h3 class="group"><span class="dot dot-${g.id}"></span>${g.title}<span class="grp-n">${effects.length}</span></h3><p class="blurb">${g.blurb}</p>`;
      effects.forEach((E) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'fx-item';
        b.dataset.id = E.id;
        b.innerHTML = `<span class="dot dot-${g.id}"></span><span class="t">${E.title}</span>`;
        b.addEventListener('click', () => { this.showView('lab'); this.select(E.id); });
        sec.appendChild(b);
      });
      root.appendChild(sec);
    });
  }

  select(id) {
    const E = EffectRegistry.get(id);
    this.current = E;
    if (!this.values[E.id]) this.values[E.id] = {};
    const list = this.$('#effect-list');
    document.querySelectorAll('.fx-item').forEach((b) => {
      const on = b.dataset.id === E.id;
      b.setAttribute('aria-current', String(on));
      // on narrow screens the list is a horizontal strip: keep the active chip in view
      if (on && list.scrollWidth > list.clientWidth + 4) list.scrollLeft = b.offsetLeft - list.clientWidth / 2 + b.offsetWidth / 2;
    });
    const G = EffectRegistry.group(E.group);
    this.$('#fx-group').textContent = G.title;
    this.$('#fx-group').className = `eyebrow eb-${G.id}`;
    this.$('#fx-title').textContent = E.title;
    this.$('#fx-hint').textContent = E.hint;
    this.$('#fx-tags').innerHTML = E.tags.map((t) => `<span class="tag-chip tc-${t}">${LabUI.PURPOSE_LABEL[t]}</span>`).join('');
    this.$('#fx-use').textContent = E.useFor;
    this.$('#fx-summary').textContent = E.summary;
    const ol = this.$('#fx-steps');
    ol.innerHTML = '';
    E.steps.forEach((s) => { const li = document.createElement('li'); li.textContent = s; ol.appendChild(li); });
    this.buildSliders(E);
    this.code.show([E.file, ...E.uses.filter((f) => f !== E.file)]);
    try { history.replaceState(null, '', `#fx-${E.id}`); } catch (e) { /* sandboxed */ }
    this.restart(true);
  }

  restart(autoPlay = true) {
    const data = { effectId: this.current.id, params: { ...this.values[this.current.id] }, autoPlay };
    const sm = this.game.scene;
    if (sm.isActive('LabScene') || sm.isPaused('LabScene')) this.scene().scene.restart(data);
    else sm.start('LabScene', data);
  }

  // ---------------------------------------------------------------- sliders
  buildSliders(E) {
    const root = this.$('#fx-params');
    root.innerHTML = '';
    const vals = this.values[E.id];
    E.params.forEach((d) => {
      const id = `p-${E.id}-${d.key}`;
      const row = document.createElement('div');
      row.className = 'param';
      const v = vals[d.key] != null ? vals[d.key] : d.value;
      row.innerHTML = `<label for="${id}">${d.label}</label><output id="${id}-out" for="${id}">${LabUI.fmt(v, d.step)}</output>
        <input type="range" id="${id}" min="${d.min}" max="${d.max}" step="${d.step}" value="${v}">`;
      const input = row.querySelector('input');
      const out = row.querySelector('output');
      input.addEventListener('input', () => {
        const n = parseFloat(input.value);
        vals[d.key] = n;
        out.textContent = LabUI.fmt(n, d.step);
        clearTimeout(this.debounce);
        this.debounce = setTimeout(() => this.restart(true), 260);
      });
      root.appendChild(row);
    });
    this.$('#fx-reset').hidden = !E.params.length;
  }

  static fmt(v, step) {
    const dec = String(step).includes('.') ? String(step).split('.')[1].length : 0;
    return Number(v).toFixed(dec);
  }

  // ---------------------------------------------------------------- toolbar
  bindToolbar() {
    const slow = this.$('#btn-slow');
    const reduce = this.$('#btn-reduce');
    const sound = this.$('#btn-sound');
    reduce.setAttribute('aria-pressed', String(Juice.reduced));
    this.$('#btn-replay').addEventListener('click', () => this.restart(true));
    slow.addEventListener('click', () => this.toggleSlow());
    reduce.addEventListener('click', () => {
      Juice.reduced = !Juice.reduced;
      reduce.setAttribute('aria-pressed', String(Juice.reduced));
      this.restart(true);
    });
    sound.addEventListener('click', () => {
      Juice.sound.muted = !Juice.sound.muted;
      sound.setAttribute('aria-pressed', String(!Juice.sound.muted));
      sound.querySelector('.lbl').textContent = Juice.sound.muted ? 'Sound off' : 'Sound on';
    });
    this.$('#fx-reset').addEventListener('click', () => {
      this.values[this.current.id] = {};
      this.buildSliders(this.current);
      this.restart(true);
    });
  }

  toggleSlow() {
    const on = Juice.timeScale === 1;
    const s = this.scene();
    if (s) Juice.applyTimeScale(s, on ? 0.25 : 1);
    else Juice.timeScale = on ? 0.25 : 1;
    this.$('#btn-slow').setAttribute('aria-pressed', String(on));
  }

  bindTabs() {
    document.querySelectorAll('.panel-tabs [role="tab"]').forEach((t) => {
      t.addEventListener('click', () => {
        document.querySelectorAll('.panel-tabs [role="tab"]').forEach((o) => {
          const sel = o === t;
          o.setAttribute('aria-selected', String(sel));
          this.$(`#${o.getAttribute('aria-controls')}`).hidden = !sel;
        });
      });
    });
    document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => this.showView(b.dataset.view)));
  }

  showView(v) {
    document.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
    this.$('#view-lab').hidden = v !== 'lab';
    this.$('#view-principles').hidden = v !== 'principles';
    if (v === 'principles') this.$('#view-principles').scrollTop = 0;
  }

  bindKeys() {
    document.addEventListener('keydown', (e) => {
      if (e.target.closest && e.target.closest('input, textarea, select')) return;
      if (this.$('#view-lab').hidden) return;
      if (e.key === 'r' || e.key === 'R') { this.restart(true); e.preventDefault(); }
      if (e.key === 's' || e.key === 'S') { this.toggleSlow(); e.preventDefault(); }
    });
  }
}
