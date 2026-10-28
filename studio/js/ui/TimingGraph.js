/**
 * TimingGraph — draws how much of the screen a transition covers over time:
 * cover (easeIn) → hold → reveal (easeOut). A live marker follows previews.
 */
class TimingGraph {
  constructor(root) {
    this.root = root;
    root.className = 'graph';
    root.innerHTML = '<canvas aria-label="Coverage over time"></canvas><div class="legend"><span id="tg-c">cover</span><span id="tg-h">hold</span><span id="tg-r">reveal</span><span id="tg-t"></span></div>';
    this.canvas = root.querySelector('canvas');
    this.marker = null;
  }

  draw(preset, marker) {
    const c = this.canvas;
    const dpr = window.devicePixelRatio || 1;
    const W = c.clientWidth || 600;
    const H = c.clientHeight || 90;
    c.width = W * dpr; c.height = H * dpr;
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    const half = (preset.duration || 900) / 2;
    const hold = preset.hold || 0;
    const total = half * 2 + hold;
    const ease = (n) => PhaserFX.ParticlePreset.ease(n);
    const ei = ease(preset.easeIn || 'Cubic.easeIn');
    const eo = ease(preset.easeOut || 'Cubic.easeOut');
    const pad = 6;
    const X = (ms) => pad + (ms / total) * (W - pad * 2);
    const Y = (v) => H - pad - v * (H - pad * 2);
    g.clearRect(0, 0, W, H);
    g.strokeStyle = 'rgba(141,149,171,0.18)';
    g.lineWidth = 1;
    [0, 0.5, 1].forEach((v) => { g.beginPath(); g.moveTo(pad, Y(v)); g.lineTo(W - pad, Y(v)); g.stroke(); });
    g.fillStyle = 'rgba(245,181,68,0.12)';
    g.fillRect(X(half), pad, X(half + hold) - X(half), H - pad * 2);
    g.beginPath();
    for (let i = 0; i <= 60; i++) { const t = i / 60; g.lineTo(X(t * half), Y(ei(t))); }
    g.lineTo(X(half + hold), Y(1));
    for (let i = 0; i <= 60; i++) { const t = i / 60; g.lineTo(X(half + hold + t * half), Y(1 - eo(t))); }
    g.strokeStyle = '#f5b544';
    g.lineWidth = 2;
    g.stroke();
    if (marker != null) {
      g.strokeStyle = '#ff6b7a';
      g.beginPath(); g.moveTo(X(marker), pad); g.lineTo(X(marker), H - pad); g.stroke();
    }
    this.root.querySelector('#tg-c').textContent = `cover ${Math.round(half)} ms · ${preset.easeIn || 'Cubic.easeIn'}`;
    this.root.querySelector('#tg-h').textContent = `hold ${hold} ms`;
    this.root.querySelector('#tg-r').textContent = `reveal ${Math.round(half)} ms · ${preset.easeOut || 'Cubic.easeOut'}`;
    this.root.querySelector('#tg-t').textContent = `total ${Math.round(total)} ms`;
  }
}
