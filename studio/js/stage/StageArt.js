/**
 * StageArt — backdrops and stand-in game objects for previews: two story
 * scenes (for transitions), particle backgrounds, and effect targets.
 */
class StageArt {
  static generate(scene) {
    if (scene.textures.exists('stage-a')) return;
    const make = (key, w, h, draw) => { const t = scene.textures.createCanvas(key, w, h); draw(t.getContext(), w, h); t.refresh(); };
    const circle = (c, x, y, r, f) => { c.fillStyle = f; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); };

    make('stage-a', 960, 600, (c, w, h) => {
      const sky = c.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#7cc6ff'); sky.addColorStop(1, '#cdeeff');
      c.fillStyle = sky; c.fillRect(0, 0, w, h);
      circle(c, 170, 120, 56, '#fff1a6');
      c.fillStyle = 'rgba(255,255,255,0.9)';
      [[620, 110, 85], [680, 95, 60], [360, 170, 65]].forEach(([x, y, r]) => { c.beginPath(); c.ellipse(x, y, r, r * 0.32, 0, 0, Math.PI * 2); c.fill(); });
      c.fillStyle = '#7fd36b'; c.beginPath(); c.ellipse(240, 600, 450, 180, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#5fbf55'; c.beginPath(); c.ellipse(760, 620, 450, 190, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#7a4a22'; c.fillRect(700, 300, 22, 120);
      circle(c, 711, 290, 64, '#3fa64b'); circle(c, 670, 320, 44, '#3fa64b'); circle(c, 752, 320, 44, '#3fa64b');
      [[160, 470], [260, 500], [420, 480], [560, 520]].forEach(([x, y]) => { circle(c, x, y, 8, '#ff8ac2'); circle(c, x, y, 3.5, '#ffe066'); });
      c.fillStyle = '#1f4a2a'; c.font = 'bold 28px "Trebuchet MS", sans-serif'; c.textAlign = 'center'; c.fillText('Scene A · Sunny Meadow', w / 2, h - 34);
    });
    make('stage-b', 960, 600, (c, w, h) => {
      const sky = c.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#0d1236'); sky.addColorStop(1, '#2a2160');
      c.fillStyle = sky; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 70; i++) { c.fillStyle = `rgba(255,255,255,${0.3 + Math.random() * 0.6})`; c.beginPath(); c.arc(Math.random() * w, Math.random() * 330, Math.random() * 1.8 + 0.4, 0, Math.PI * 2); c.fill(); }
      circle(c, 780, 110, 44, '#f6f1d8'); circle(c, 798, 98, 40, '#151a40');
      c.fillStyle = '#0b0f26'; c.beginPath(); c.ellipse(480, 620, 600, 150, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#23254d';
      c.fillRect(340, 250, 280, 230); c.fillRect(300, 190, 70, 290); c.fillRect(590, 190, 70, 290); c.fillRect(450, 150, 60, 120);
      [[300, 190], [590, 190]].forEach(([x, y]) => { c.beginPath(); c.moveTo(x - 8, y); c.lineTo(x + 78, y); c.lineTo(x + 35, y - 70); c.closePath(); c.fill(); });
      c.beginPath(); c.moveTo(442, 150); c.lineTo(518, 150); c.lineTo(480, 80); c.closePath(); c.fill();
      c.fillStyle = '#ffd86b';
      [[320, 260], [620, 260], [470, 190], [400, 330], [540, 330]].forEach(([x, y]) => c.fillRect(x, y, 18, 28));
      c.fillStyle = '#c9c2ef'; c.font = 'bold 28px "Trebuchet MS", sans-serif'; c.textAlign = 'center'; c.fillText('Scene B · Moonlit Castle', w / 2, h - 34);
    });
    make('stage-dark', 960, 600, (c, w, h) => {
      const g = c.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w * 0.7);
      g.addColorStop(0, '#1c2233'); g.addColorStop(1, '#090b11');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(141,149,171,0.07)'; c.lineWidth = 1;
      for (let x = 0; x <= w; x += 40) { c.beginPath(); c.moveTo(x + 0.5, 0); c.lineTo(x + 0.5, h); c.stroke(); }
      for (let y = 0; y <= h; y += 40) { c.beginPath(); c.moveTo(0, y + 0.5); c.lineTo(w, y + 0.5); c.stroke(); }
    });
    make('stage-light', 960, 600, (c, w, h) => {
      c.fillStyle = '#e9ecf4'; c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(40,48,68,0.08)';
      for (let x = 0; x <= w; x += 40) { c.beginPath(); c.moveTo(x + 0.5, 0); c.lineTo(x + 0.5, h); c.stroke(); }
      for (let y = 0; y <= h; y += 40) { c.beginPath(); c.moveTo(0, y + 0.5); c.lineTo(w, y + 0.5); c.stroke(); }
    });
    make('stage-checker', 960, 600, (c, w, h) => {
      for (let y = 0; y < h; y += 24) for (let x = 0; x < w; x += 24) { c.fillStyle = ((x + y) / 24) % 2 ? '#3a3f4f' : '#2b2f3c'; c.fillRect(x, y, 24, 24); }
    });

    // effect targets
    make('tgt-card', 160, 225, (c, w, h) => {
      const rr = (x, y, ww, hh, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + ww, y, x + ww, y + hh, r); c.arcTo(x + ww, y + hh, x, y + hh, r); c.arcTo(x, y + hh, x, y, r); c.arcTo(x, y, x + ww, y, r); c.closePath(); };
      rr(0, 0, w, h, 14); c.fillStyle = '#ffc94a'; c.fill();
      rr(6, 6, w - 12, h - 12, 10); c.fillStyle = '#fff8ec'; c.fill();
      c.fillStyle = '#21183f'; c.textAlign = 'center'; c.font = 'bold 18px "Trebuchet MS", sans-serif'; c.fillText('Sun-sational', w / 2, 30);
      circle(c, w / 2, 112, 48, '#ffc94a');
      c.fillStyle = '#fff'; c.font = 'bold 54px "Trebuchet MS", sans-serif'; c.textBaseline = 'middle'; c.fillText('☀', w / 2, 114);
      c.fillStyle = '#7a6a9a'; c.font = 'bold 11px "Trebuchet MS", sans-serif'; c.fillText('LEGENDARY', w / 2, 200);
    });
    make('tgt-fox', 140, 170, (c) => {
      circle(c, 70, 128, 38, '#f08a3c'); circle(c, 70, 136, 24, '#fff1e2');
      c.fillStyle = '#f08a3c';
      c.beginPath(); c.moveTo(24, 40); c.lineTo(30, 4); c.lineTo(56, 26); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(116, 40); c.lineTo(110, 4); c.lineTo(84, 26); c.closePath(); c.fill();
      circle(c, 70, 58, 44, '#f08a3c');
      c.fillStyle = '#fff1e2'; c.beginPath(); c.moveTo(30, 66); c.quadraticCurveTo(70, 112, 110, 66); c.quadraticCurveTo(70, 82, 30, 66); c.fill();
      circle(c, 52, 56, 7, '#2b1d3a'); circle(c, 88, 56, 7, '#2b1d3a'); circle(c, 54, 53, 2.4, '#fff'); circle(c, 90, 53, 2.4, '#fff'); circle(c, 70, 74, 5, '#2b1d3a');
    });
    make('tgt-button', 260, 74, (c, w, h) => {
      c.fillStyle = '#0a0d14'; c.beginPath(); c.roundRect ? c.roundRect(0, 6, w, h - 6, 18) : c.rect(0, 6, w, h - 6); c.fill();
      c.fillStyle = '#3a4bd8'; c.beginPath(); c.roundRect ? c.roundRect(0, 0, w, h - 8, 18) : c.rect(0, 0, w, h - 8); c.fill();
      c.fillStyle = '#ffffff'; c.font = 'bold 26px "Trebuchet MS", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('cat', w / 2, (h - 8) / 2);
    });
    make('tgt-chest', 150, 120, (c) => {
      c.fillStyle = '#7a4a22'; c.fillRect(12, 46, 126, 70); c.fillStyle = '#5a3416'; c.fillRect(6, 18, 138, 34);
      c.fillStyle = '#ffc94a'; c.fillRect(6, 48, 138, 8); c.fillRect(64, 38, 22, 30); c.fillRect(12, 18, 10, 98); c.fillRect(128, 18, 10, 98);
    });
    make('tgt-slime', 150, 120, (c, w, h) => {
      c.beginPath(); c.moveTo(10, h - 8); c.bezierCurveTo(4, 40, 40, 6, 75, 6); c.bezierCurveTo(110, 6, 146, 40, 140, h - 8); c.quadraticCurveTo(75, h + 2, 10, h - 8); c.closePath();
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#9dffcf'); g.addColorStop(1, '#2fbf8a'); c.fillStyle = g; c.fill();
      circle(c, 56, 62, 8, '#1d3b33'); circle(c, 94, 62, 8, '#1d3b33'); circle(c, 58, 59, 2.6, '#fff'); circle(c, 96, 59, 2.6, '#fff');
    });
  }

  static BACKGROUNDS = [
    { value: 'stage-dark', label: 'Dark grid' }, { value: 'stage-light', label: 'Light grid' }, { value: 'stage-checker', label: 'Checker' },
    { value: 'stage-a', label: 'Meadow scene' }, { value: 'stage-b', label: 'Night scene' }
  ];

  static TARGETS = [
    { value: 'tgt-card', label: 'Card' }, { value: 'tgt-fox', label: 'Character' }, { value: 'tgt-button', label: 'Answer button' },
    { value: 'tgt-chest', label: 'Chest' }, { value: 'tgt-slime', label: 'Enemy' }, { value: 'none', label: 'No target' }
  ];
}
