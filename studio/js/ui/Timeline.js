/**
 * Timeline — the Effect editor's track view. One row per step; drag a bar
 * left/right to change when it starts (snaps to 10 ms, hold Shift for 1 ms).
 */
class Timeline {
  constructor(root, cb) {
    this.root = root;
    this.cb = cb;
    this.pxPerMs = 0.22;
    this.selected = -1;
  }

  render(preset, selected) {
    this.preset = preset;
    this.selected = selected;
    const E = PhaserFX.EffectPreset;
    const total = Math.max(2000, E.totalDuration(preset) + 600);
    const width = total * this.pxPerMs;
    const r = this.root;
    r.className = 'timeline';
    r.innerHTML = `<div class="tl-head"><h3>Timeline</h3>
      <span class="stat" id="tl-total">${Math.round(E.totalDuration(preset))} ms</span>
      <span class="grow" style="flex:1"></span>
      <button type="button" class="btn small" id="tl-dup">Duplicate</button>
      <button type="button" class="btn small danger" id="tl-del">Delete</button>
      <span class="seg" role="group" aria-label="Zoom"><button type="button" id="tl-zo" aria-label="Zoom out">−</button><button type="button" id="tl-zi" aria-label="Zoom in">+</button></span></div>
      <div class="tl-scroll"><div class="tl-inner" style="width:${width + 150}px"><div class="tl-ruler"></div><div class="tl-rows"></div><div class="tl-playhead" hidden></div></div></div>
      <div class="palette" aria-label="Add a step"></div>`;
    const ruler = r.querySelector('.tl-ruler');
    const step = this.pxPerMs > 0.3 ? 100 : this.pxPerMs > 0.12 ? 250 : 500;
    for (let ms = 0; ms <= total; ms += step) {
      const x = ms * this.pxPerMs;
      ruler.insertAdjacentHTML('beforeend', `<i style="left:${x}px"></i>${ms % (step * 2) === 0 ? `<span style="left:${x}px">${ms >= 1000 ? `${(ms / 1000).toFixed(ms % 1000 ? 2 : 0)}s` : `${ms}`}</span>` : ''}`);
    }
    const rows = r.querySelector('.tl-rows');
    if (!preset.steps.length) rows.innerHTML = '<div class="tl-empty">No steps yet. Add one from the buttons below: particles, shake, text, sound…</div>';
    preset.steps.forEach((s, i) => {
      const def = E.STEPS[s.type];
      const row = document.createElement('div');
      row.className = 'tl-row';
      row.setAttribute('aria-selected', String(i === selected));
      const lab = document.createElement('div');
      lab.className = 'tl-label';
      lab.tabIndex = 0;
      lab.innerHTML = `<span class="sw" style="background:${def.color}"></span><span>${Timeline.title(s)}</span>`;
      lab.addEventListener('click', () => this.cb.onSelect(i));
      lab.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.cb.onSelect(i); }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); this.cb.onMove(i, Math.max(0, (s.at || 0) + (e.key === 'ArrowLeft' ? -10 : 10)), true); }
        if (e.key === 'Delete' || e.key === 'Backspace') this.cb.onDelete(i);
      });
      const track = document.createElement('div');
      track.className = 'tl-track';
      const bar = document.createElement('div');
      bar.className = 'tl-bar';
      const dur = E.durationOf(s);
      bar.style.left = `${(s.at || 0) * this.pxPerMs}px`;
      bar.style.width = `${Math.max(10, dur * this.pxPerMs)}px`;
      bar.style.background = def.color;
      bar.textContent = `${s.at || 0} ms`;
      bar.title = `${def.label}: starts at ${s.at || 0} ms, lasts about ${Math.round(dur)} ms. Drag to move.`;
      this.drag(bar, i);
      track.appendChild(bar);
      row.append(lab, track);
      rows.appendChild(row);
    });
    const pal = r.querySelector('.palette');
    Object.entries(E.STEPS).forEach(([type, def]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn';
      b.innerHTML = `<span class="sw" style="background:${def.color}"></span>${def.label}`;
      b.title = `Add a ${def.label} step`;
      b.addEventListener('click', () => this.cb.onAdd(type));
      pal.appendChild(b);
    });
    r.querySelector('#tl-del').disabled = selected < 0;
    r.querySelector('#tl-dup').disabled = selected < 0;
    r.querySelector('#tl-del').addEventListener('click', () => this.cb.onDelete(this.selected));
    r.querySelector('#tl-dup').addEventListener('click', () => this.cb.onDuplicate(this.selected));
    r.querySelector('#tl-zi').addEventListener('click', () => { this.pxPerMs = Math.min(1, this.pxPerMs * 1.5); this.render(this.preset, this.selected); });
    r.querySelector('#tl-zo').addEventListener('click', () => { this.pxPerMs = Math.max(0.05, this.pxPerMs / 1.5); this.render(this.preset, this.selected); });
    this.playhead = r.querySelector('.tl-playhead');
  }

  static title(s) {
    const def = PhaserFX.EffectPreset.STEPS[s.type];
    if (s.type === 'particles') return `Particles · ${s.preset && s.preset.name ? s.preset.name : s.preset}`;
    if (s.type === 'text') return `Text · ${s.text}`;
    if (s.type === 'sound') return `Sound · ${s.name}`;
    if (s.type === 'target') return `Target · ${s.action}`;
    if (s.type === 'emote') return `Emote · ${s.emote}`;
    return def.label;
  }

  drag(bar, i) {
    bar.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.cb.onSelect(i, true);
      bar.setPointerCapture(e.pointerId);
      const x0 = e.clientX;
      const at0 = this.preset.steps[i].at || 0;
      const move = (ev) => {
        const raw = at0 + (ev.clientX - x0) / this.pxPerMs;
        const at = Math.max(0, ev.shiftKey ? Math.round(raw) : Math.round(raw / 10) * 10);
        bar.style.left = `${at * this.pxPerMs}px`;
        bar.textContent = `${at} ms`;
        this.cb.onMove(i, at, false);
      };
      const up = () => {
        bar.removeEventListener('pointermove', move);
        bar.removeEventListener('pointerup', up);
        bar.removeEventListener('pointercancel', up);
        this.cb.onMove(i, this.preset.steps[i].at, true);
      };
      bar.addEventListener('pointermove', move);
      bar.addEventListener('pointerup', up);
      bar.addEventListener('pointercancel', up);
    });
  }

  setPlayhead(ms) {
    if (!this.playhead) return;
    if (ms == null) { this.playhead.hidden = true; return; }
    this.playhead.hidden = false;
    this.playhead.style.left = `${ms * this.pxPerMs}px`;
  }
}
