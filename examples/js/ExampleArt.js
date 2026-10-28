/**
 * ExampleArt — placeholder art for the examples (your game uses its own).
 * Draws a fox, an owl, a slime, a chest, a star and four pun cards on canvas.
 */
class ExampleArt {
  static generate(scene) {
    if (scene.textures.exists('fox')) return;
    const make = (key, w, h, draw) => { const t = scene.textures.createCanvas(key, w, h); draw(t.getContext(), w, h); t.refresh(); };
    const circle = (c, x, y, r, f) => { c.fillStyle = f; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); };

    make('fox', 140, 170, (c) => {
      circle(c, 70, 128, 38, '#f08a3c'); circle(c, 70, 136, 24, '#fff1e2');
      c.fillStyle = '#f08a3c';
      c.beginPath(); c.moveTo(24, 40); c.lineTo(30, 4); c.lineTo(56, 26); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(116, 40); c.lineTo(110, 4); c.lineTo(84, 26); c.closePath(); c.fill();
      circle(c, 70, 58, 44, '#f08a3c');
      c.fillStyle = '#fff1e2'; c.beginPath(); c.moveTo(30, 66); c.quadraticCurveTo(70, 112, 110, 66); c.quadraticCurveTo(70, 82, 30, 66); c.fill();
      circle(c, 52, 56, 7, '#2b1d3a'); circle(c, 88, 56, 7, '#2b1d3a'); circle(c, 54, 53, 2.4, '#fff'); circle(c, 90, 53, 2.4, '#fff');
      circle(c, 70, 74, 5, '#2b1d3a');
    });
    make('owl', 140, 170, (c) => {
      c.fillStyle = '#7a5c9e'; c.beginPath(); c.ellipse(70, 104, 50, 62, 0, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.moveTo(26, 56); c.lineTo(30, 18); c.lineTo(52, 44); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(114, 56); c.lineTo(110, 18); c.lineTo(88, 44); c.closePath(); c.fill();
      c.fillStyle = '#c9b6e6'; c.beginPath(); c.ellipse(70, 128, 30, 34, 0, 0, Math.PI * 2); c.fill();
      circle(c, 50, 74, 20, '#fff6e0'); circle(c, 90, 74, 20, '#fff6e0'); circle(c, 50, 76, 9, '#2b1d3a'); circle(c, 90, 76, 9, '#2b1d3a');
      c.fillStyle = '#ffb02e'; c.beginPath(); c.moveTo(62, 90); c.lineTo(78, 90); c.lineTo(70, 104); c.closePath(); c.fill();
    });
    make('slime', 150, 120, (c, w, h) => {
      c.beginPath(); c.moveTo(10, h - 8); c.bezierCurveTo(4, 40, 40, 6, 75, 6); c.bezierCurveTo(110, 6, 146, 40, 140, h - 8); c.quadraticCurveTo(75, h + 2, 10, h - 8); c.closePath();
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#9dffcf'); g.addColorStop(1, '#2fbf8a'); c.fillStyle = g; c.fill();
      circle(c, 56, 62, 8, '#1d3b33'); circle(c, 94, 62, 8, '#1d3b33'); circle(c, 58, 59, 2.6, '#fff'); circle(c, 96, 59, 2.6, '#fff');
      c.strokeStyle = '#1d3b33'; c.lineWidth = 3; c.beginPath(); c.arc(75, 74, 9, 0.3, Math.PI - 0.3); c.stroke();
    });
    make('chest', 120, 90, (c) => {
      c.fillStyle = '#7a4a22'; c.fillRect(10, 30, 100, 56); c.fillStyle = '#5a3416'; c.fillRect(6, 14, 108, 22);
      c.fillStyle = '#ffc94a'; c.fillRect(6, 34, 108, 6); c.fillRect(52, 26, 16, 22);
    });
    const cards = [['purrfect', 'Purrfect', '#9aa6c8', '♥'], ['bee', 'Bee Happy', '#4fa3ff', '✿'], ['guac', 'Holy Guac', '#b06bff', '♣'], ['sun', 'Sun-sational', '#ffc94a', '☀']];
    cards.forEach(([key, title, color, glyph]) => make(`card-${key}`, 220, 310, (c, w, h) => {
      const rr = (x, y, ww, hh, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + ww, y, x + ww, y + hh, r); c.arcTo(x + ww, y + hh, x, y + hh, r); c.arcTo(x, y + hh, x, y, r); c.arcTo(x, y, x + ww, y, r); c.closePath(); };
      rr(0, 0, w, h, 18); c.fillStyle = color; c.fill();
      rr(8, 8, w - 16, h - 16, 13); c.fillStyle = '#fff8ec'; c.fill();
      c.fillStyle = '#21183f'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = 'bold 22px "Trebuchet MS", sans-serif'; c.fillText(title, w / 2, 34);
      circle(c, w / 2, 150, 70, color);
      c.fillStyle = '#ffffff'; c.font = 'bold 72px "Trebuchet MS", sans-serif'; c.fillText(glyph, w / 2, 156);
    }));
  }
}
