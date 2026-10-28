/**
 * Textures — every texture PhaserFX needs, painted on canvas the first time
 * an effect runs (no image files to load). All keys start with "pfx-".
 *
 * Particle textures are WHITE so they can be coloured with tint / color.
 * Use them in your own emitters too, e.g. this.add.particles(x, y, 'pfx-star', {...}).
 */
class Textures {
  static KEYS = ['pfx-glow', 'pfx-dot', 'pfx-ember', 'pfx-smoke', 'pfx-spark', 'pfx-star', 'pfx-ring', 'pfx-ray', 'pfx-flare',
    'pfx-confetti', 'pfx-shard', 'pfx-coin', 'pfx-drop', 'pfx-leaf', 'pfx-heart', 'pfx-star5', 'pfx-star5-empty',
    'pfx-lock-body', 'pfx-lock-shackle', 'pfx-chain', 'pfx-pack', 'pfx-card-back', 'pfx-card-shadow'];

  /** Generate everything once per game (safe to call often). */
  static ensure(scene) {
    if (scene.textures.exists('pfx-card-shadow')) return;
    const T = Textures;
    T.radial(scene, 'pfx-glow', 128, [[0, 1], [0.25, 0.55], [0.6, 0.15], [1, 0]]);
    T.radial(scene, 'pfx-dot', 24, [[0, 1], [0.45, 0.9], [1, 0]]);
    T.radial(scene, 'pfx-ember', 32, [[0, 1], [0.2, 0.85], [0.5, 0.3], [1, 0]]);
    T.make(scene, 'pfx-smoke', 96, 96, (c, s) => {
      [[0.5, 0.5, 0.42], [0.35, 0.42, 0.28], [0.64, 0.4, 0.26], [0.42, 0.64, 0.27], [0.62, 0.62, 0.25]].forEach(([x, y, r]) => {
        const g = c.createRadialGradient(x * s, y * s, 0, x * s, y * s, r * s);
        g.addColorStop(0, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g; c.fillRect(0, 0, s, s);
      });
    });
    T.make(scene, 'pfx-spark', 64, 14, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.7, 'rgba(255,255,255,0.7)'); g.addColorStop(1, '#fff');
      c.fillStyle = g; c.beginPath(); c.moveTo(0, h / 2); c.quadraticCurveTo(w * 0.6, 0, w, h / 2); c.quadraticCurveTo(w * 0.6, h, 0, h / 2); c.fill();
    });
    T.make(scene, 'pfx-star', 48, 48, (c, s) => {
      const r = s / 2;
      const g = c.createRadialGradient(r, r, 0, r, r, r);
      g.addColorStop(0, 'rgba(255,255,255,0.8)'); g.addColorStop(0.35, 'rgba(255,255,255,0.15)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, s, s);
      c.fillStyle = '#fff'; c.beginPath();
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 - Math.PI / 2; const rr = i % 2 ? r * 0.16 : r * 0.95; c.lineTo(r + Math.cos(a) * rr, r + Math.sin(a) * rr); }
      c.closePath(); c.fill();
    });
    T.make(scene, 'pfx-ring', 192, 192, (c, s) => {
      const r = s / 2;
      const g = c.createRadialGradient(r, r, r * 0.62, r, r, r);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.55, '#fff'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, s, s);
    });
    T.make(scene, 'pfx-ray', 90, 420, (c, w, h) => {
      const g = c.createLinearGradient(0, h, 0, 0);
      g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(w / 2 - 2, h); c.lineTo(0, 0); c.lineTo(w, 0); c.lineTo(w / 2 + 2, h); c.closePath(); c.fill();
    });
    T.make(scene, 'pfx-flare', 256, 24, (c, w, h) => {
      c.save(); c.scale(1, h / w);
      const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      g.addColorStop(0, '#fff'); g.addColorStop(0.2, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, w); c.restore();
    });
    T.make(scene, 'pfx-confetti', 12, 18, (c, w, h) => { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); });
    T.make(scene, 'pfx-shard', 28, 28, (c) => { c.fillStyle = '#fff'; c.beginPath(); c.moveTo(14, 0); c.lineTo(28, 22); c.lineTo(4, 28); c.closePath(); c.fill(); });
    T.make(scene, 'pfx-coin', 44, 44, (c, s) => {
      const r = s / 2;
      c.fillStyle = '#b8791a'; c.beginPath(); c.arc(r, r + 1.5, r - 2, 0, Math.PI * 2); c.fill();
      const g = c.createLinearGradient(0, 0, s, s);
      g.addColorStop(0, '#fff3b0'); g.addColorStop(0.45, '#ffcc33'); g.addColorStop(1, '#e09b14');
      c.fillStyle = g; c.beginPath(); c.arc(r, r, r - 3, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(160,100,10,0.8)'; c.lineWidth = 2; c.beginPath(); c.arc(r, r, r - 9, 0, Math.PI * 2); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.75)'; c.beginPath(); c.ellipse(r - 6, r - 7, 5, 3, -0.6, 0, Math.PI * 2); c.fill();
    });
    T.make(scene, 'pfx-drop', 4, 36, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0.9)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
    });
    T.make(scene, 'pfx-leaf', 26, 16, (c) => {
      c.fillStyle = '#fff'; c.beginPath(); c.moveTo(1, 8); c.quadraticCurveTo(13, -4, 25, 8); c.quadraticCurveTo(13, 20, 1, 8); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(2, 8); c.lineTo(24, 8); c.stroke();
    });
    T.make(scene, 'pfx-heart', 28, 26, (c) => {
      c.fillStyle = '#fff'; c.beginPath(); c.moveTo(14, 24);
      c.bezierCurveTo(-6, 10, 4, -4, 14, 7); c.bezierCurveTo(24, -4, 34, 10, 14, 24); c.fill();
    });
    T.star5(scene, 'pfx-star5', true);
    T.star5(scene, 'pfx-star5-empty', false);
    T.lock(scene);
    T.chain(scene);
    T.pack(scene);
    T.cardBack(scene);
    T.make(scene, 'pfx-card-shadow', 280, 370, (c) => {
      c.shadowColor = 'rgba(0,0,0,0.85)'; c.shadowBlur = 22; c.fillStyle = 'rgba(0,0,0,0.55)';
      T.rr(c, 30, 30, 220, 310, 18); c.fill();
    });
  }

  // ------------------------------------------------------------- helpers
  static make(scene, key, w, h, draw) {
    if (scene.textures.exists(key)) return;
    const t = scene.textures.createCanvas(key, w, h);
    draw(t.getContext(), w, h);
    t.refresh();
  }

  static radial(scene, key, size, stops) {
    Textures.make(scene, key, size, size, (c) => {
      const r = size / 2;
      const g = c.createRadialGradient(r, r, 0, r, r, r);
      stops.forEach(([p, a]) => g.addColorStop(p, `rgba(255,255,255,${a})`));
      c.fillStyle = g; c.fillRect(0, 0, size, size);
    });
  }

  static rr(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }

  static starPath(c, x, y, ro, ri) {
    c.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5; const r = i % 2 ? ri : ro; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    c.closePath();
  }

  static star5(scene, key, filled) {
    Textures.make(scene, key, 112, 112, (c) => {
      c.lineJoin = 'round';
      if (filled) {
        Textures.starPath(c, 56, 60, 50, 22); c.fillStyle = '#c47d0e'; c.fill();
        Textures.starPath(c, 56, 56, 50, 22);
        const g = c.createLinearGradient(0, 10, 0, 100);
        g.addColorStop(0, '#fff3a6'); g.addColorStop(0.5, '#ffc94a'); g.addColorStop(1, '#f39a1a');
        c.fillStyle = g; c.fill(); c.strokeStyle = '#fff7cf'; c.lineWidth = 3; c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.ellipse(44, 40, 9, 5, -0.6, 0, Math.PI * 2); c.fill();
      } else {
        Textures.starPath(c, 56, 56, 48, 21); c.fillStyle = 'rgba(20,14,40,0.85)'; c.fill();
        c.strokeStyle = '#4a3f7c'; c.lineWidth = 4; c.stroke();
      }
    });
  }

  /** A medal in any colour with a glyph, e.g. medal(scene, '#4fa3ff', '?'). Returns its key. */
  static medal(scene, color = '#ffc94a', glyph = '★') {
    const key = `pfx-medal-${color.replace('#', '')}-${glyph.codePointAt(0)}`;
    const C = Phaser.Display.Color.HexStringToColor(color);
    const dark = Phaser.Display.Color.RGBToString(Math.round(C.red * 0.55), Math.round(C.green * 0.55), Math.round(C.blue * 0.55));
    Textures.make(scene, key, 120, 150, (c) => {
      c.fillStyle = dark;
      c.beginPath(); c.moveTo(32, 80); c.lineTo(22, 146); c.lineTo(42, 132); c.lineTo(56, 146); c.lineTo(60, 92); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(88, 80); c.lineTo(98, 146); c.lineTo(78, 132); c.lineTo(64, 146); c.lineTo(60, 92); c.closePath(); c.fill();
      c.fillStyle = '#fff3c4'; c.beginPath(); c.arc(60, 60, 54, 0, Math.PI * 2); c.fill();
      const g = c.createLinearGradient(0, 10, 0, 110);
      g.addColorStop(0, color); g.addColorStop(1, dark);
      c.fillStyle = g; c.beginPath(); c.arc(60, 60, 47, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 3; c.beginPath(); c.arc(60, 60, 38, 0, Math.PI * 2); c.stroke();
      c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = 'bold 44px "Trebuchet MS", sans-serif'; c.fillText(glyph, 60, 63);
    });
    return key;
  }

  static lock(scene) {
    Textures.make(scene, 'pfx-lock-body', 76, 64, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#ffe58a'); g.addColorStop(1, '#d99a12');
      Textures.rr(c, 2, 2, w - 4, h - 4, 12); c.fillStyle = g; c.fill();
      c.strokeStyle = '#9a6a08'; c.lineWidth = 3; c.stroke();
      c.fillStyle = '#4a3208'; c.beginPath(); c.arc(w / 2, h / 2 - 5, 8, 0, Math.PI * 2); c.fill(); c.fillRect(w / 2 - 3.5, h / 2 - 2, 7, 16);
    });
    Textures.make(scene, 'pfx-lock-shackle', 60, 50, (c, w, h) => {
      c.strokeStyle = '#c9cfdc'; c.lineWidth = 10;
      c.beginPath(); c.moveTo(10, h); c.lineTo(10, 26); c.arc(w / 2, 26, w / 2 - 10, Math.PI, 0); c.lineTo(w - 10, h); c.stroke();
    });
  }

  static chain(scene) {
    Textures.make(scene, 'pfx-chain', 340, 26, (c, w, h) => {
      for (let x = 4, i = 0; x < w - 10; x += 21, i++) {
        c.strokeStyle = '#8b93a8'; c.lineWidth = 5; c.beginPath();
        c.ellipse(x + 13, h / 2, 13, i % 2 ? 2.5 : 8, 0, 0, Math.PI * 2); c.stroke();
        c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 1.5;
        c.beginPath(); c.ellipse(x + 13, h / 2 - 2, 10, 4, 0, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
      }
    });
  }

  static pack(scene) {
    Textures.make(scene, 'pfx-pack', 240, 340, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#ff5fa2'); g.addColorStop(0.5, '#7a4dff'); g.addColorStop(1, '#2fd4c0');
      c.fillStyle = g; c.beginPath(); c.moveTo(0, 12);
      for (let x = 0; x <= w; x += 12) c.lineTo(x, x % 24 ? 0 : 12);
      c.lineTo(w, h - 12);
      for (let x = w; x >= 0; x -= 12) c.lineTo(x, x % 24 ? h : h - 12);
      c.closePath(); c.fill();
      c.save(); c.globalAlpha = 0.18; c.fillStyle = '#fff';
      for (let i = -h; i < w; i += 46) { c.beginPath(); c.moveTo(i, h); c.lineTo(i + 20, h); c.lineTo(i + 20 + h, 0); c.lineTo(i + h, 0); c.closePath(); c.fill(); }
      c.restore();
      c.strokeStyle = 'rgba(255,255,255,0.7)'; c.setLineDash([6, 6]); c.lineWidth = 2;
      c.beginPath(); c.moveTo(6, 74); c.lineTo(w - 6, 74); c.stroke(); c.setLineDash([]);
      c.fillStyle = 'rgba(255,255,255,0.18)'; c.beginPath(); c.arc(w / 2, 182, 58, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = 'bold 40px "Trebuchet MS", sans-serif'; c.fillText('★', w / 2, 182);
    });
  }

  static cardBack(scene) {
    Textures.make(scene, 'pfx-card-back', 220, 310, (c, w, h) => {
      Textures.rr(c, 0, 0, w, h, 18); c.fillStyle = '#ffc94a'; c.fill();
      const g = c.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#3b2a7a'); g.addColorStop(1, '#1b1240');
      Textures.rr(c, 7, 7, w - 14, h - 14, 13); c.fillStyle = g; c.fill();
      c.save(); Textures.rr(c, 7, 7, w - 14, h - 14, 13); c.clip();
      c.strokeStyle = 'rgba(255,201,74,0.13)'; c.lineWidth = 2;
      for (let i = -h; i < w + h; i += 22) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + h, h); c.stroke(); c.beginPath(); c.moveTo(i + h, 0); c.lineTo(i, h); c.stroke(); }
      c.restore();
      c.fillStyle = '#ffc94a'; c.beginPath(); c.arc(w / 2, h / 2, 52, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#2a1d5e'; c.beginPath(); c.arc(w / 2, h / 2, 45, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#ffc94a'; c.font = 'bold 54px "Trebuchet MS", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('?', w / 2, h / 2 + 3);
    });
  }

  /** Solid white shapes for iris transitions: circle, square, diamond, heart, star. Returns the key. */
  static shape(scene, name = 'circle') {
    const key = `pfx-shape-${name}`;
    Textures.make(scene, key, 256, 256, (c, s) => {
      c.fillStyle = '#ffffff';
      const m = s / 2;
      c.beginPath();
      if (name === 'square') c.rect(0, 0, s, s);
      else if (name === 'diamond') { c.moveTo(m, 0); c.lineTo(s, m); c.lineTo(m, s); c.lineTo(0, m); c.closePath(); }
      else if (name === 'heart') {
        c.moveTo(m, s * 0.92);
        c.bezierCurveTo(-s * 0.2, s * 0.42, s * 0.12, -s * 0.08, m, s * 0.24);
        c.bezierCurveTo(s * 0.88, -s * 0.08, s * 1.2, s * 0.42, m, s * 0.92);
      } else if (name === 'star') Textures.starPath(c, m, m * 1.06, m, m * 0.42);
      else c.arc(m, m, m, 0, Math.PI * 2);
      c.fill();
    });
    return key;
  }

  /**
   * Grayscale copy of any loaded texture (for "locked" items). Returns the new
   * key, or null if the image cannot be read (cross-origin without CORS).
   */
  static gray(scene, key, frame) {
    const out = `${key}${frame != null ? `-${frame}` : ''}__pfx-gray`;
    if (scene.textures.exists(out)) return out;
    const f = scene.textures.getFrame(key, frame);
    if (!f || !f.source || !f.source.image) return null;
    try {
      const t = scene.textures.createCanvas(out, f.cutWidth, f.cutHeight);
      const c = t.getContext();
      c.drawImage(f.source.image, f.cutX, f.cutY, f.cutWidth, f.cutHeight, 0, 0, f.cutWidth, f.cutHeight);
      const img = c.getImageData(0, 0, f.cutWidth, f.cutHeight);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const l = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) * 0.62 + 18;
        d[i] = l; d[i + 1] = l; d[i + 2] = l + 6;
      }
      c.putImageData(img, 0, 0);
      t.refresh();
      return out;
    } catch (e) {
      if (scene.textures.exists(out)) scene.textures.remove(out);
      return null;
    }
  }

  /** White silhouette of a texture (classic hit flash that works in Canvas too). */
  static white(scene, key, frame) {
    const out = `${key}${frame != null ? `-${frame}` : ''}__pfx-white`;
    if (scene.textures.exists(out)) return out;
    const f = scene.textures.getFrame(key, frame);
    if (!f || !f.source || !f.source.image) return null;
    try {
      const t = scene.textures.createCanvas(out, f.cutWidth, f.cutHeight);
      const c = t.getContext();
      c.drawImage(f.source.image, f.cutX, f.cutY, f.cutWidth, f.cutHeight, 0, 0, f.cutWidth, f.cutHeight);
      c.globalCompositeOperation = 'source-in';
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, f.cutWidth, f.cutHeight);
      t.refresh();
      return out;
    } catch (e) {
      if (scene.textures.exists(out)) scene.textures.remove(out);
      return null;
    }
  }
}
