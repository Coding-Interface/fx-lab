/**
 * CardArt — paints Pun-Intended-style picture-pun cards onto canvas textures.
 *
 * LESSONS:
 *  - Bake art into textures ONCE (at boot). Animating a single image is far
 *    cheaper than animating 40 Graphics shapes every frame.
 *  - A "locked" card is just the same art run through a grayscale filter
 *    (getImageData → luminance → putImageData). Unlocking = cross-fading the
 *    colour texture over the gray one.
 */
class CardArt {
  static W = 220;
  static H = 310;

  static RARITY = {
    common:    { label: 'Common',    color: 0x9aa6c8, css: '#9aa6c8', rank: 0 },
    rare:      { label: 'Rare',      color: 0x4fa3ff, css: '#4fa3ff', rank: 1 },
    epic:      { label: 'Epic',      color: 0xb06bff, css: '#b06bff', rank: 2 },
    legendary: { label: 'Legendary', color: 0xffc94a, css: '#ffc94a', rank: 3 }
  };

  static CARDS = [
    { id: 'purrfect',    title: 'Purrfect',       pun: "You've got to be kitten me!", rarity: 'common',    art: 'cat',     bg: ['#e9edf8', '#c3cbe3'] },
    { id: 'bee-happy',   title: 'Bee Happy',      pun: 'Un-bee-lievably good vibes.', rarity: 'rare',      art: 'bee',     bg: ['#dff0ff', '#9fd0ff'] },
    { id: 'holy-guac',   title: 'Holy Guacamole', pun: 'An avo-cuddle a day.',        rarity: 'epic',      art: 'avocado', bg: ['#f3e6ff', '#d2b0ff'] },
    { id: 'sun-sational', title: 'Sun-sational',  pun: 'Too cool to be a star.',      rarity: 'legendary', art: 'sun',     bg: ['#fff6d6', '#ffd978'] }
  ];

  static card(id) { return CardArt.CARDS.find((c) => c.id === id); }

  static generate(scene) {
    if (scene.textures.exists('card-back')) return;
    CardArt.background(scene);
    CardArt.shadow(scene);
    CardArt.back(scene);
    CardArt.CARDS.forEach((c) => {
      CardArt.front(scene, `card-${c.id}`, c, false);
      CardArt.front(scene, `card-${c.id}-gray`, c, true);
    });
    CardArt.lock(scene);
    CardArt.chain(scene);
    CardArt.pack(scene);
  }

  // ---------------------------------------------------------------- helpers
  static rr(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }

  static make(scene, key, w, h, draw) {
    if (scene.textures.exists(key)) return;
    const t = scene.textures.createCanvas(key, w, h);
    const c = t.getContext();
    draw(c, w, h);
    t.refresh();
  }

  static grayscale(c, w, h) {
    const img = c.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const l = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) * 0.62 + 18;
      d[i] = l; d[i + 1] = l; d[i + 2] = l + 6;
    }
    c.putImageData(img, 0, 0);
  }

  static circle(c, x, y, r, fill) { c.fillStyle = fill; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }

  // ---------------------------------------------------------------- textures
  static background(scene) {
    CardArt.make(scene, 'lab-bg', 960, 600, (c, w, h) => {
      const g = c.createRadialGradient(w / 2, h * 0.42, 40, w / 2, h / 2, w * 0.7);
      g.addColorStop(0, '#2a1f52');
      g.addColorStop(0.55, '#171130');
      g.addColorStop(1, '#0a0716');
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
      // faint star dust so ADD-blended effects have something to glow over
      for (let i = 0; i < 140; i++) {
        c.fillStyle = `rgba(220,210,255,${0.05 + Math.random() * 0.18})`;
        c.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
      }
    });
  }

  static shadow(scene) {
    CardArt.make(scene, 'card-shadow', CardArt.W + 60, CardArt.H + 60, (c) => {
      c.shadowColor = 'rgba(0,0,0,0.85)';
      c.shadowBlur = 22;
      c.fillStyle = 'rgba(0,0,0,0.55)';
      CardArt.rr(c, 30, 30, CardArt.W, CardArt.H, 18);
      c.fill();
    });
  }

  static back(scene) {
    CardArt.make(scene, 'card-back', CardArt.W, CardArt.H, (c, w, h) => {
      CardArt.rr(c, 0, 0, w, h, 18);
      c.fillStyle = '#ffc94a'; c.fill();
      const g = c.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#3b2a7a'); g.addColorStop(1, '#1b1240');
      CardArt.rr(c, 7, 7, w - 14, h - 14, 13);
      c.fillStyle = g; c.fill();
      c.save();
      CardArt.rr(c, 7, 7, w - 14, h - 14, 13); c.clip();
      c.strokeStyle = 'rgba(255,201,74,0.13)'; c.lineWidth = 2;
      for (let i = -h; i < w + h; i += 22) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + h, h); c.stroke(); c.beginPath(); c.moveTo(i + h, 0); c.lineTo(i, h); c.stroke(); }
      c.restore();
      CardArt.circle(c, w / 2, h / 2, 52, '#ffc94a');
      CardArt.circle(c, w / 2, h / 2, 45, '#2a1d5e');
      c.fillStyle = '#ffc94a';
      c.font = 'bold 54px "Trebuchet MS", sans-serif';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('?', w / 2, h / 2 + 3);
      c.font = 'bold 15px "Trebuchet MS", sans-serif';
      c.fillText('PUN INTENDED', w / 2, h - 34);
    });
  }

  static front(scene, key, card, gray) {
    const R = CardArt.RARITY[card.rarity];
    CardArt.make(scene, key, CardArt.W, CardArt.H, (c, w, h) => {
      CardArt.rr(c, 0, 0, w, h, 18);
      c.fillStyle = R.css; c.fill();
      const g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, card.bg[0]); g.addColorStop(1, card.bg[1]);
      CardArt.rr(c, 7, 7, w - 14, h - 14, 13);
      c.fillStyle = g; c.fill();
      // title
      c.fillStyle = '#21183f';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = `bold ${card.title.length > 12 ? 19 : 23}px "Trebuchet MS", sans-serif`;
      c.fillText(card.title, w / 2, 30);
      // art window
      CardArt.rr(c, 18, 50, w - 36, 150, 12);
      c.fillStyle = 'rgba(255,255,255,0.65)'; c.fill();
      c.save();
      CardArt.rr(c, 18, 50, w - 36, 150, 12); c.clip();
      CardArt[`art_${card.art}`](c, w / 2, 126);
      c.restore();
      // pun line
      c.fillStyle = '#3a2f60';
      c.font = 'italic 13px "Trebuchet MS", sans-serif';
      c.fillText(card.pun, w / 2, 222);
      // rarity gem + label
      c.fillStyle = R.css;
      c.beginPath(); c.moveTo(w / 2, 248); c.lineTo(w / 2 + 11, 260); c.lineTo(w / 2, 272); c.lineTo(w / 2 - 11, 260); c.closePath(); c.fill();
      c.fillStyle = '#21183f';
      c.font = 'bold 12px "Trebuchet MS", sans-serif';
      c.fillText(R.label.toUpperCase(), w / 2, 288);
      if (gray) CardArt.grayscale(c, w, h);
    });
  }

  // ---------------------------------------------------------------- art
  static art_cat(c, x, y) {
    c.fillStyle = '#f4a259';
    [[-1], [1]].forEach(([s]) => { c.beginPath(); c.moveTo(x + s * 50, y - 22); c.lineTo(x + s * 40, y - 70); c.lineTo(x + s * 10, y - 44); c.closePath(); c.fill(); });
    c.fillStyle = '#ffc7d6';
    [[-1], [1]].forEach(([s]) => { c.beginPath(); c.moveTo(x + s * 42, y - 30); c.lineTo(x + s * 38, y - 58); c.lineTo(x + s * 20, y - 42); c.closePath(); c.fill(); });
    CardArt.circle(c, x, y, 52, '#f4a259');
    c.fillStyle = '#e07b39';
    c.fillRect(x - 4, y - 52, 8, 18); c.fillRect(x - 18, y - 50, 6, 13); c.fillRect(x + 12, y - 50, 6, 13);
    CardArt.circle(c, x - 20, y - 6, 9, '#2b1d3a'); CardArt.circle(c, x + 20, y - 6, 9, '#2b1d3a');
    CardArt.circle(c, x - 17, y - 9, 3, '#fff'); CardArt.circle(c, x + 23, y - 9, 3, '#fff');
    c.fillStyle = '#ff7aa2'; c.beginPath(); c.moveTo(x - 6, y + 10); c.lineTo(x + 6, y + 10); c.lineTo(x, y + 17); c.closePath(); c.fill();
    c.strokeStyle = '#2b1d3a'; c.lineWidth = 2.5; c.lineCap = 'round';
    c.beginPath(); c.arc(x - 7, y + 19, 7, 0.1, Math.PI - 0.3); c.stroke();
    c.beginPath(); c.arc(x + 7, y + 19, 7, 0.3, Math.PI - 0.1); c.stroke();
    c.lineWidth = 1.6;
    [[-1], [1]].forEach(([s]) => { for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(x + s * 28, y + 12 + i * 6); c.lineTo(x + s * 64, y + 8 + i * 11); c.stroke(); } });
    CardArt.circle(c, x - 32, y + 16, 7, 'rgba(255,120,150,0.35)'); CardArt.circle(c, x + 32, y + 16, 7, 'rgba(255,120,150,0.35)');
  }

  static art_bee(c, x, y) {
    c.fillStyle = 'rgba(200,235,255,0.85)';
    c.strokeStyle = '#7fb7e6'; c.lineWidth = 2;
    [[-1], [1]].forEach(([s]) => { c.beginPath(); c.ellipse(x + s * 24, y - 38, 22, 30, s * -0.5, 0, Math.PI * 2); c.fill(); c.stroke(); });
    c.fillStyle = '#ffd23f';
    c.beginPath(); c.ellipse(x, y + 4, 58, 44, 0, 0, Math.PI * 2); c.fill();
    c.save(); c.beginPath(); c.ellipse(x, y + 4, 58, 44, 0, 0, Math.PI * 2); c.clip();
    c.fillStyle = '#2b1d3a';
    [-14, 14, 40].forEach((dx) => c.fillRect(x + dx - 7, y - 50, 14, 110));
    c.restore();
    CardArt.circle(c, x - 44, y - 2, 8, '#2b1d3a'); CardArt.circle(c, x - 41, y - 5, 2.5, '#fff');
    c.strokeStyle = '#2b1d3a'; c.lineWidth = 2.5; c.lineCap = 'round';
    c.beginPath(); c.arc(x - 38, y + 10, 8, 0.2, Math.PI - 0.6); c.stroke();
    c.beginPath(); c.moveTo(x - 40, y - 34); c.quadraticCurveTo(x - 50, y - 60, x - 62, y - 62); c.stroke();
    CardArt.circle(c, x - 62, y - 62, 4, '#2b1d3a');
    c.fillStyle = '#2b1d3a'; c.beginPath(); c.moveTo(x + 56, y); c.lineTo(x + 72, y + 6); c.lineTo(x + 56, y + 12); c.closePath(); c.fill();
    CardArt.circle(c, x - 30, y + 18, 6, 'rgba(255,120,150,0.4)');
  }

  static art_avocado(c, x, y) {
    c.strokeStyle = '#ffd23f'; c.lineWidth = 6;
    c.beginPath(); c.ellipse(x, y - 64, 30, 8, 0, 0, Math.PI * 2); c.stroke();
    const body = () => { c.beginPath(); c.moveTo(x, y - 54); c.bezierCurveTo(x + 34, y - 54, x + 26, y - 8, x + 46, y + 26); c.bezierCurveTo(x + 62, y + 66, x - 62, y + 66, x - 46, y + 26); c.bezierCurveTo(x - 26, y - 8, x - 34, y - 54, x, y - 54); c.closePath(); };
    body(); c.fillStyle = '#3f7d2c'; c.fill();
    c.save(); c.translate(x, y + 6); c.scale(0.84, 0.86); c.translate(-x, -y); body(); c.fillStyle = '#d8ef8f'; c.fill(); c.restore();
    CardArt.circle(c, x, y + 30, 25, '#8a5a2b');
    CardArt.circle(c, x - 7, y + 22, 6, 'rgba(255,255,255,0.25)');
    CardArt.circle(c, x - 9, y + 28, 3.6, '#2b1d3a'); CardArt.circle(c, x + 9, y + 28, 3.6, '#2b1d3a');
    c.strokeStyle = '#2b1d3a'; c.lineWidth = 2.5; c.lineCap = 'round';
    c.beginPath(); c.arc(x, y + 34, 7, 0.2, Math.PI - 0.2); c.stroke();
    CardArt.circle(c, x - 17, y + 36, 4, 'rgba(255,120,150,0.5)'); CardArt.circle(c, x + 17, y + 36, 4, 'rgba(255,120,150,0.5)');
  }

  static art_sun(c, x, y) {
    c.fillStyle = '#ff9f1c';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      c.beginPath();
      c.moveTo(x + Math.cos(a - 0.14) * 46, y + Math.sin(a - 0.14) * 46);
      c.lineTo(x + Math.cos(a) * 74, y + Math.sin(a) * 74);
      c.lineTo(x + Math.cos(a + 0.14) * 46, y + Math.sin(a + 0.14) * 46);
      c.closePath(); c.fill();
    }
    const g = c.createRadialGradient(x - 12, y - 14, 4, x, y, 50);
    g.addColorStop(0, '#fff3a6'); g.addColorStop(1, '#ffc21a');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, 48, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#21183f';
    CardArt.rr(c, x - 40, y - 14, 34, 22, 8); c.fill();
    CardArt.rr(c, x + 6, y - 14, 34, 22, 8); c.fill();
    c.fillRect(x - 8, y - 10, 16, 5);
    c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(x - 34, y - 10, 10, 4); c.fillRect(x + 12, y - 10, 10, 4);
    c.strokeStyle = '#21183f'; c.lineWidth = 3; c.lineCap = 'round';
    c.beginPath(); c.arc(x + 2, y + 16, 14, 0.25, Math.PI - 0.5); c.stroke();
  }

  // ---------------------------------------------------------------- lock, chain, pack
  static lock(scene) {
    CardArt.make(scene, 'fx-lock-body', 76, 64, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#ffe58a'); g.addColorStop(1, '#d99a12');
      CardArt.rr(c, 2, 2, w - 4, h - 4, 12); c.fillStyle = g; c.fill();
      c.strokeStyle = '#9a6a08'; c.lineWidth = 3; c.stroke();
      CardArt.circle(c, w / 2, h / 2 - 5, 8, '#4a3208');
      c.fillStyle = '#4a3208'; c.fillRect(w / 2 - 3.5, h / 2 - 2, 7, 16);
    });
    CardArt.make(scene, 'fx-lock-shackle', 60, 50, (c, w, h) => {
      c.strokeStyle = '#c9cfdc'; c.lineWidth = 10; c.lineCap = 'butt';
      c.beginPath(); c.moveTo(10, h); c.lineTo(10, 26); c.arc(w / 2, 26, w / 2 - 10, Math.PI, 0); c.lineTo(w - 10, h); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(8, h); c.lineTo(8, 26); c.arc(w / 2, 26, w / 2 - 12, Math.PI, Math.PI * 1.5); c.stroke();
    });
  }

  static chain(scene) {
    CardArt.make(scene, 'fx-chain', 340, 26, (c, w, h) => {
      for (let x = 4, i = 0; x < w - 10; x += 21, i++) {
        c.strokeStyle = '#8b93a8'; c.lineWidth = 5;
        c.beginPath();
        if (i % 2 === 0) c.ellipse(x + 13, h / 2, 13, 8, 0, 0, Math.PI * 2);
        else c.ellipse(x + 13, h / 2, 13, 2.5, 0, 0, Math.PI * 2);
        c.stroke();
        c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 1.5;
        c.beginPath(); c.ellipse(x + 13, h / 2 - 2, 10, 4, 0, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
      }
    });
  }

  static pack(scene) {
    CardArt.make(scene, 'fx-pack', 240, 340, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#ff5fa2'); g.addColorStop(0.5, '#7a4dff'); g.addColorStop(1, '#2fd4c0');
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(0, 12);
      for (let x = 0; x <= w; x += 12) c.lineTo(x, x % 24 ? 0 : 12);
      c.lineTo(w, h - 12);
      for (let x = w; x >= 0; x -= 12) c.lineTo(x, x % 24 ? h : h - 12);
      c.closePath(); c.fill();
      // foil shine stripes
      c.save(); c.globalAlpha = 0.18; c.fillStyle = '#fff';
      for (let i = -h; i < w; i += 46) { c.beginPath(); c.moveTo(i, h); c.lineTo(i + 20, h); c.lineTo(i + 20 + h, 0); c.lineTo(i + h, 0); c.closePath(); c.fill(); }
      c.restore();
      // tear line
      c.strokeStyle = 'rgba(255,255,255,0.7)'; c.setLineDash([6, 6]); c.lineWidth = 2;
      c.beginPath(); c.moveTo(6, 74); c.lineTo(w - 6, 74); c.stroke(); c.setLineDash([]);
      CardArt.circle(c, w / 2, 182, 58, 'rgba(255,255,255,0.18)');
      c.fillStyle = '#fff';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = 'bold 34px "Trebuchet MS", sans-serif';
      c.fillText('PUN', w / 2, 166);
      c.fillText('PACK', w / 2, 202);
      c.font = 'bold 13px "Trebuchet MS", sans-serif';
      c.fillText('4 PICTURE PUNS', w / 2, 284);
    });
  }
}
