/**
 * UIArt — textures for the learning, reward and story effects: stars, badges,
 * story characters and a training slime. Painted once on canvas, like CardArt.
 *
 * LESSON: the slime also gets a pure-white SILHOUETTE copy. Swapping to the
 * white texture for 2 frames is the classic "hit flash", and it works in both
 * WebGL and Canvas (tintFill is WebGL only).
 */
class UIArt {
  static BADGES = [
    { name: 'Curious Mind', desc: 'Asked 10 questions', color: '#4fa3ff', dark: '#1d5fb0', glyph: '?' },
    { name: 'Kind Helper', desc: 'Helped a friend 5 times', color: '#ff5fa2', dark: '#a8245f', glyph: '♥' },
    { name: 'Word Wizard', desc: 'Solved 20 puns', color: '#ffc94a', dark: '#b07a10', glyph: '✦' }
  ];

  static generate(scene) {
    if (scene.textures.exists('ui-star')) return;
    UIArt.star(scene, 'ui-star', true);
    UIArt.star(scene, 'ui-star-empty', false);
    UIArt.BADGES.forEach((b, i) => UIArt.badge(scene, `ui-badge-${i}`, b));
    UIArt.fox(scene);
    UIArt.owl(scene);
    UIArt.slime(scene, 'ui-slime', false);
    UIArt.slime(scene, 'ui-slime-white', true);
  }

  static make(scene, key, w, h, draw) {
    if (scene.textures.exists(key)) return;
    const t = scene.textures.createCanvas(key, w, h);
    draw(t.getContext(), w, h);
    t.refresh();
  }

  static starPath(c, x, y, ro, ri) {
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 ? ri : ro;
      c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    c.closePath();
  }

  static star(scene, key, filled) {
    UIArt.make(scene, key, 112, 112, (c) => {
      c.lineJoin = 'round';
      if (filled) {
        UIArt.starPath(c, 56, 60, 50, 22);
        c.fillStyle = '#c47d0e'; c.fill();
        UIArt.starPath(c, 56, 56, 50, 22);
        const g = c.createLinearGradient(0, 10, 0, 100);
        g.addColorStop(0, '#fff3a6'); g.addColorStop(0.5, '#ffc94a'); g.addColorStop(1, '#f39a1a');
        c.fillStyle = g; c.fill();
        c.strokeStyle = '#fff7cf'; c.lineWidth = 3; c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.55)';
        c.beginPath(); c.ellipse(44, 40, 9, 5, -0.6, 0, Math.PI * 2); c.fill();
      } else {
        UIArt.starPath(c, 56, 56, 48, 21);
        c.fillStyle = 'rgba(20,14,40,0.85)'; c.fill();
        c.strokeStyle = '#4a3f7c'; c.lineWidth = 4; c.stroke();
      }
    });
  }

  static badge(scene, key, b) {
    UIArt.make(scene, key, 120, 150, (c) => {
      // ribbons
      c.fillStyle = b.dark;
      c.beginPath(); c.moveTo(32, 80); c.lineTo(22, 146); c.lineTo(42, 132); c.lineTo(56, 146); c.lineTo(60, 92); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(88, 80); c.lineTo(98, 146); c.lineTo(78, 132); c.lineTo(64, 146); c.lineTo(60, 92); c.closePath(); c.fill();
      // medal
      c.fillStyle = '#fff3c4'; c.beginPath(); c.arc(60, 60, 54, 0, Math.PI * 2); c.fill();
      const g = c.createLinearGradient(0, 10, 0, 110);
      g.addColorStop(0, b.color); g.addColorStop(1, b.dark);
      c.fillStyle = g; c.beginPath(); c.arc(60, 60, 47, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 3;
      c.beginPath(); c.arc(60, 60, 38, 0, Math.PI * 2); c.stroke();
      c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = 'bold 44px "Trebuchet MS", sans-serif';
      c.fillText(b.glyph, 60, 63);
    });
  }

  static circle(c, x, y, r, fill) { c.fillStyle = fill; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }

  /** Pip the fox: head on a little round body. Origin at feet works well (0.5, 1). */
  static fox(scene) {
    UIArt.make(scene, 'ui-fox', 140, 170, (c) => {
      UIArt.circle(c, 70, 128, 38, '#f08a3c');
      UIArt.circle(c, 70, 136, 24, '#fff1e2');
      c.fillStyle = '#f08a3c';
      c.beginPath(); c.moveTo(24, 40); c.lineTo(30, 4); c.lineTo(56, 26); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(116, 40); c.lineTo(110, 4); c.lineTo(84, 26); c.closePath(); c.fill();
      c.fillStyle = '#3a2033';
      c.beginPath(); c.moveTo(31, 30); c.lineTo(33, 12); c.lineTo(46, 25); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(109, 30); c.lineTo(107, 12); c.lineTo(94, 25); c.closePath(); c.fill();
      UIArt.circle(c, 70, 58, 44, '#f08a3c');
      c.fillStyle = '#fff1e2';
      c.beginPath(); c.moveTo(30, 66); c.quadraticCurveTo(70, 112, 110, 66); c.quadraticCurveTo(70, 82, 30, 66); c.fill();
      UIArt.circle(c, 52, 56, 7, '#2b1d3a'); UIArt.circle(c, 88, 56, 7, '#2b1d3a');
      UIArt.circle(c, 54, 53, 2.4, '#fff'); UIArt.circle(c, 90, 53, 2.4, '#fff');
      UIArt.circle(c, 70, 74, 5, '#2b1d3a');
      UIArt.circle(c, 40, 72, 6, 'rgba(255,110,140,0.45)'); UIArt.circle(c, 100, 72, 6, 'rgba(255,110,140,0.45)');
    });
  }

  /** Moss the owl. */
  static owl(scene) {
    UIArt.make(scene, 'ui-owl', 140, 170, (c) => {
      c.fillStyle = '#7a5c9e';
      c.beginPath(); c.ellipse(70, 104, 50, 62, 0, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.moveTo(26, 56); c.lineTo(30, 18); c.lineTo(52, 44); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(114, 56); c.lineTo(110, 18); c.lineTo(88, 44); c.closePath(); c.fill();
      c.fillStyle = '#c9b6e6';
      c.beginPath(); c.ellipse(70, 128, 30, 34, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(122,92,158,0.6)'; c.lineWidth = 2;
      for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(70, 116 + i * 14, 9, 0.2, Math.PI - 0.2); c.stroke(); }
      UIArt.circle(c, 50, 74, 20, '#fff6e0'); UIArt.circle(c, 90, 74, 20, '#fff6e0');
      UIArt.circle(c, 50, 76, 9, '#2b1d3a'); UIArt.circle(c, 90, 76, 9, '#2b1d3a');
      UIArt.circle(c, 53, 72, 3, '#fff'); UIArt.circle(c, 93, 72, 3, '#fff');
      c.fillStyle = '#ffb02e';
      c.beginPath(); c.moveTo(62, 90); c.lineTo(78, 90); c.lineTo(70, 104); c.closePath(); c.fill();
    });
  }

  static slime(scene, key, white) {
    UIArt.make(scene, key, 150, 120, (c, w, h) => {
      const body = () => {
        c.beginPath();
        c.moveTo(10, h - 8);
        c.bezierCurveTo(4, 40, 40, 6, 75, 6);
        c.bezierCurveTo(110, 6, 146, 40, 140, h - 8);
        c.quadraticCurveTo(75, h + 2, 10, h - 8);
        c.closePath();
      };
      body();
      if (white) { c.fillStyle = '#ffffff'; c.fill(); return; }
      const g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#9dffcf'); g.addColorStop(1, '#2fbf8a');
      c.fillStyle = g; c.fill();
      c.fillStyle = 'rgba(255,255,255,0.6)';
      c.beginPath(); c.ellipse(44, 34, 14, 8, -0.5, 0, Math.PI * 2); c.fill();
      UIArt.circle(c, 56, 62, 8, '#1d3b33'); UIArt.circle(c, 94, 62, 8, '#1d3b33');
      UIArt.circle(c, 58, 59, 2.6, '#fff'); UIArt.circle(c, 96, 59, 2.6, '#fff');
      c.strokeStyle = '#1d3b33'; c.lineWidth = 3; c.lineCap = 'round';
      c.beginPath(); c.arc(75, 74, 9, 0.3, Math.PI - 0.3); c.stroke();
      UIArt.circle(c, 42, 78, 6, 'rgba(255,120,150,0.45)'); UIArt.circle(c, 108, 78, 6, 'rgba(255,120,150,0.45)');
    });
  }
}
