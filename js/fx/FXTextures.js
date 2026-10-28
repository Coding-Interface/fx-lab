/**
 * FXTextures — every particle texture the lab uses, painted once at boot on
 * canvas textures (works in WebGL and Canvas renderers, no image files).
 *
 * LESSON: particles look "cheap" when they are hard-edged squares. Almost every
 * good effect texture is SOFT: a white radial gradient that fades to transparent.
 * Keep textures WHITE and colour them with tint / color-over-life, so one texture
 * serves every colour.
 */
class FXTextures {
  static generate(scene) {
    const T = FXTextures;
    T.radial(scene, 'fx-glow', 128, [[0, 1], [0.25, 0.55], [0.6, 0.15], [1, 0]]);
    T.radial(scene, 'fx-dot', 24, [[0, 1], [0.45, 0.9], [1, 0]]);
    T.radial(scene, 'fx-ember', 32, [[0, 1], [0.2, 0.85], [0.5, 0.3], [1, 0]]);
    T.smoke(scene, 'fx-smoke', 96);
    T.spark(scene, 'fx-spark', 64, 14);
    T.star(scene, 'fx-star', 48);
    T.ring(scene, 'fx-ring', 192);
    T.ray(scene, 'fx-ray', 90, 420);
    T.flare(scene, 'fx-flare', 256, 24);
    T.shape(scene, 'fx-confetti', 12, 18, (c, w, h) => { c.fillRect(0, 0, w, h); });
    T.shape(scene, 'fx-shard', 28, 28, (c) => {
      c.beginPath(); c.moveTo(14, 0); c.lineTo(28, 22); c.lineTo(4, 28); c.closePath(); c.fill();
    });
    T.coin(scene, 'fx-coin', 44);
    // weather & story shapes
    T.shape(scene, 'fx-drop', 4, 36, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0.9)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
    });
    T.shape(scene, 'fx-leaf', 26, 16, (c) => {
      c.beginPath(); c.moveTo(1, 8); c.quadraticCurveTo(13, -4, 25, 8); c.quadraticCurveTo(13, 20, 1, 8); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(2, 8); c.lineTo(24, 8); c.stroke();
    });
    T.shape(scene, 'fx-heart', 28, 26, (c) => {
      c.beginPath(); c.moveTo(14, 24);
      c.bezierCurveTo(-6, 10, 4, -4, 14, 7);
      c.bezierCurveTo(24, -4, 34, 10, 14, 24);
      c.fill();
    });
  }

  static canvas(scene, key, w, h) {
    if (scene.textures.exists(key)) return null;
    return scene.textures.createCanvas(key, w, h);
  }

  /** White radial gradient. stops: [[position 0..1, alpha], ...] */
  static radial(scene, key, size, stops) {
    const t = FXTextures.canvas(scene, key, size, size);
    if (!t) return;
    const c = t.getContext();
    const r = size / 2;
    const g = c.createRadialGradient(r, r, 0, r, r, r);
    stops.forEach(([p, a]) => g.addColorStop(p, `rgba(255,255,255,${a})`));
    c.fillStyle = g;
    c.fillRect(0, 0, size, size);
    t.refresh();
  }

  /** Cloudy puff: several overlapping soft blobs, so smoke never looks like a perfect circle. */
  static smoke(scene, key, size) {
    const t = FXTextures.canvas(scene, key, size, size);
    if (!t) return;
    const c = t.getContext();
    const blobs = [[0.5, 0.5, 0.42], [0.35, 0.42, 0.28], [0.64, 0.4, 0.26], [0.42, 0.64, 0.27], [0.62, 0.62, 0.25]];
    blobs.forEach(([x, y, r]) => {
      const g = c.createRadialGradient(x * size, y * size, 0, x * size, y * size, r * size);
      g.addColorStop(0, 'rgba(255,255,255,0.45)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, size, size);
    });
    t.refresh();
  }

  /** A streak, bright at the front: used for sparks that point along their velocity. */
  static spark(scene, key, w, h) {
    const t = FXTextures.canvas(scene, key, w, h);
    if (!t) return;
    const c = t.getContext();
    const g = c.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.7, 'rgba(255,255,255,0.7)');
    g.addColorStop(1, 'rgba(255,255,255,1)');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(0, h / 2);
    c.quadraticCurveTo(w * 0.6, 0, w, h / 2);
    c.quadraticCurveTo(w * 0.6, h, 0, h / 2);
    c.fill();
    t.refresh();
  }

  /** 4-point twinkle star with a soft halo. */
  static star(scene, key, s) {
    const t = FXTextures.canvas(scene, key, s, s);
    if (!t) return;
    const c = t.getContext();
    const r = s / 2;
    const g = c.createRadialGradient(r, r, 0, r, r, r);
    g.addColorStop(0, 'rgba(255,255,255,0.8)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.15)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, s, s);
    c.fillStyle = '#fff';
    c.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const rr = i % 2 ? r * 0.16 : r * 0.95;
      c.lineTo(r + Math.cos(a) * rr, r + Math.sin(a) * rr);
    }
    c.closePath();
    c.fill();
    t.refresh();
  }

  static ring(scene, key, s) {
    const t = FXTextures.canvas(scene, key, s, s);
    if (!t) return;
    const c = t.getContext();
    const r = s / 2;
    const g = c.createRadialGradient(r, r, r * 0.62, r, r, r);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.55, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, s, s);
    t.refresh();
  }

  /** God ray: narrow at the bottom (the centre), wide and faded at the top. */
  static ray(scene, key, w, h) {
    const t = FXTextures.canvas(scene, key, w, h);
    if (!t) return;
    const c = t.getContext();
    const g = c.createLinearGradient(0, h, 0, 0);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(w / 2 - 2, h);
    c.lineTo(0, 0);
    c.lineTo(w, 0);
    c.lineTo(w / 2 + 2, h);
    c.closePath();
    c.fill();
    t.refresh();
  }

  /** Horizontal lens flare streak for impacts. */
  static flare(scene, key, w, h) {
    const t = FXTextures.canvas(scene, key, w, h);
    if (!t) return;
    const c = t.getContext();
    // squash a round gradient into a thin ellipse
    c.save();
    c.scale(1, h / w);
    const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.2, 'rgba(255,255,255,0.5)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, w);
    c.restore();
    t.refresh();
  }

  static shape(scene, key, w, h, draw) {
    const t = FXTextures.canvas(scene, key, w, h);
    if (!t) return;
    const c = t.getContext();
    c.fillStyle = '#fff';
    draw(c, w, h);
    t.refresh();
  }

  static coin(scene, key, s) {
    const t = FXTextures.canvas(scene, key, s, s);
    if (!t) return;
    const c = t.getContext();
    const r = s / 2;
    c.fillStyle = '#b8791a';
    c.beginPath(); c.arc(r, r + 1.5, r - 2, 0, Math.PI * 2); c.fill();
    const g = c.createLinearGradient(0, 0, s, s);
    g.addColorStop(0, '#fff3b0');
    g.addColorStop(0.45, '#ffcc33');
    g.addColorStop(1, '#e09b14');
    c.fillStyle = g;
    c.beginPath(); c.arc(r, r, r - 3, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(160,100,10,0.8)';
    c.lineWidth = 2;
    c.beginPath(); c.arc(r, r, r - 9, 0, Math.PI * 2); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.75)';
    c.beginPath(); c.ellipse(r - 6, r - 7, 5, 3, -0.6, 0, Math.PI * 2); c.fill();
    t.refresh();
  }
}
