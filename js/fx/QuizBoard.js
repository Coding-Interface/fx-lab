/**
 * QuizBoard — a question with four answer tiles, shared by the answer
 * feedback effects (Correct Answer, Gentle Retry, Streak, Quiz Timer).
 *
 * It only handles layout and simple visual states. Each effect decides HOW
 * to celebrate or respond, which is the part worth studying.
 */
class QuizBoard {
  static QUESTIONS = [
    { q: 'Which word is a noun?', a: ['run', 'happy', 'cat', 'quickly'], c: 2, hint: 'A noun is a thing you can point at.' },
    { q: 'What is 7 × 8?', a: ['54', '56', '64', '48'], c: 1, hint: 'Try 7 × 4 = 28, then double it.' },
    { q: 'Which planet is closest to the Sun?', a: ['Venus', 'Earth', 'Mercury', 'Mars'], c: 2, hint: 'It is also the smallest planet.' },
    { q: 'Which one is a feeling?', a: ['table', 'proud', 'blue', 'seven'], c: 1, hint: 'How might you feel after finishing a hard task?' },
    { q: 'What is the opposite of "brave"?', a: ['bold', 'scared', 'strong', 'kind'], c: 1, hint: 'Think of how you feel in a dark, spooky room.' },
    { q: 'How many sides does a hexagon have?', a: ['5', '8', '6', '7'], c: 2, hint: 'Honeycomb cells are hexagons.' }
  ];

  static COLORS = { tile: 0x241c48, edge: 0x3a3170, correct: 0x2fbf8a, soft: 0xffb44a, hint: 0x4fe0c8 };

  constructor(scene, { x = 480, y = 300, index = 0, tileW = 300, tileH = 74 } = {}) {
    this.scene = scene;
    this.tileW = tileW;
    this.tileH = tileH;
    this.root = scene.add.container(x, y).setDepth(10);
    this.question = Juice.text(scene, 0, -150, '', 26, '#ece8ff', { wrap: 760 });
    this.root.add(this.question);
    this.tiles = [0, 1, 2, 3].map((i) => this.makeTile(i));
    this.setQuestion(index);
  }

  makeTile(i) {
    const s = this.scene;
    const tx = (i % 2 ? 1 : -1) * (this.tileW / 2 + 10);
    const ty = -48 + Math.floor(i / 2) * (this.tileH + 20);
    const c = s.add.container(tx, ty);
    const shadow = s.add.graphics();
    shadow.fillStyle(0x07050f, 0.7).fillRoundedRect(-this.tileW / 2, -this.tileH / 2 + 6, this.tileW, this.tileH, 16);
    const bg = s.add.graphics();
    const fill = s.add.graphics().setAlpha(0);
    const label = Juice.text(s, 0, 0, '', 24, '#ece8ff', { body: true, weight: '800' });
    const mark = s.add.graphics();
    c.add([shadow, bg, fill, label, mark]);
    this.root.add(c);
    const tile = { i, c, bg, fill, label, mark, x: tx, y: ty };
    this.drawBg(tile, QuizBoard.COLORS.edge);
    return tile;
  }

  drawBg(tile, edge, width = 2) {
    const w = this.tileW;
    const h = this.tileH;
    tile.bg.clear().fillStyle(QuizBoard.COLORS.tile, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 16)
      .lineStyle(width, edge, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 16);
  }

  setQuestion(index) {
    const Q = QuizBoard.QUESTIONS[index % QuizBoard.QUESTIONS.length];
    this.data = Q;
    this.correct = Q.c;
    this.question.setText(Q.q);
    this.tiles.forEach((t, i) => t.label.setText(Q.a[i]));
    this.reset();
  }

  reset() {
    this.tiles.forEach((t) => {
      this.scene.tweens.killTweensOf([t.c, t.fill, t.label]);
      t.c.setScale(1).setAlpha(1).setPosition(t.x, t.y).setAngle(0);
      t.fill.setAlpha(0);
      t.mark.clear();
      t.label.setColor('#ece8ff');
      this.drawBg(t, QuizBoard.COLORS.edge);
    });
  }

  /** Index of the tile under a stage point, or -1. */
  tileAt(x, y) {
    const lx = x - this.root.x;
    const ly = y - this.root.y;
    const t = this.tiles.find((tt) => Math.abs(lx - tt.x) < this.tileW / 2 && Math.abs(ly - tt.y) < this.tileH / 2);
    return t ? t.i : -1;
  }

  /** Fill a tile with a colour (fades in). */
  paint(i, color, alpha = 1, ms = 220) {
    const t = this.tiles[i];
    t.fill.clear().fillStyle(color, 1).fillRoundedRect(-this.tileW / 2, -this.tileH / 2, this.tileW, this.tileH, 16);
    this.scene.tweens.add({ targets: t.fill, alpha, duration: ms, ease: 'Quad.easeOut' });
  }

  /** Fade the other tiles back so attention lands on one. */
  dimOthers(i, alpha = 0.4) {
    this.tiles.forEach((t) => { if (t.i !== i) this.scene.tweens.add({ targets: t.c, alpha, scale: 0.97, duration: 260 }); });
  }

  /** Stage position of a tile's centre. */
  pos(i) {
    const t = this.tiles[i];
    return { x: this.root.x + t.x, y: this.root.y + t.y };
  }

  /**
   * Draw a check mark stroke by stroke. Animated strokes ("drawing on") feel
   * hand-made and are easy to follow, so they suit young learners.
   */
  check(i, ms = 320, color = 0xffffff) {
    const g = this.tiles[i].mark;
    const ox = this.tileW / 2 - 40;
    const pts = [[-15, 1], [-4, 12], [17, -13]].map(([x, y]) => [ox + x, y]);
    const lens = [Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]), Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1])];
    const total = lens[0] + lens[1];
    const o = { t: 0 };
    return Juice.tween(this.scene, {
      targets: o, t: 1, duration: ms, ease: 'Sine.easeInOut',
      onUpdate: () => {
        let d = o.t * total;
        g.clear().lineStyle(7, color, 1);
        g.beginPath();
        g.moveTo(pts[0][0], pts[0][1]);
        for (let k = 0; k < 2 && d > 0; k++) {
          const f = Math.min(1, d / lens[k]);
          g.lineTo(pts[k][0] + (pts[k + 1][0] - pts[k][0]) * f, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * f);
          d -= lens[k];
        }
        g.strokePath();
      }
    });
  }

  destroy() { this.root.destroy(); }
}
