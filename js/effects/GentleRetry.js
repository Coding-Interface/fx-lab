/**
 * GentleRetry — feedback for a wrong answer that keeps learners trying.
 *
 * LESSONS (these matter more than the visuals):
 *  - No red flash, no buzzer, no screen shake. Those read as punishment and
 *    make anxious learners stop guessing. A soft amber and a small
 *    "head-shake" wiggle say "not that one" without shame.
 *  - Say something kind AND useful: a hint, not just "Wrong".
 *  - Scaffold: after N tries, gently highlight the right answer (a calm teal
 *    pulse) so nobody gets stuck. The learner still taps it themselves.
 *  - Show attempts as neutral dots, not lost lives.
 */
class GentleRetry extends BaseEffect {
  static id = 'retry';
  static title = 'Gentle Retry';
  static group = 'feedback';
  static tags = ['learning'];
  static useFor = 'Wrong answers in learning games, especially for young or anxious learners and SEL content.';
  static mode = 'tap';
  static hint = 'Click a WRONG answer to see the feedback. Try twice to get a hint.';
  static file = 'js/effects/GentleRetry.js';
  static uses = ['js/fx/QuizBoard.js', 'js/fx/Juice.js'];
  static summary = 'A wrong answer gets a soft amber wiggle and a kind, useful hint. After a couple of tries, the right answer starts to glow so nobody gets stuck.';
  static steps = [
    'Wiggle the chosen tile left-right (a "head-shake"), only ±6 px, three times.',
    'Fade in a soft amber fill (not red) and keep it, so the learner remembers what they tried.',
    'A speech bubble rises with an encouraging line plus the question\'s hint.',
    'An attempt dot fills in. Dots are neutral: they are not lives.',
    'After N wrong tries, the correct tile gets a calm teal outline pulse (scaffolding).',
    'The correct answer still gets a small, warm success, never a "finally".'
  ];
  static params = [
    { key: 'hintAfter', label: 'Highlight after N tries', min: 1, max: 3, step: 1, value: 2 },
    { key: 'wiggle', label: 'Wiggle (px)', min: 0, max: 16, step: 1, value: 6 }
  ];

  static LINES = ['Nice try!', 'So close. Have another look.', 'Good thinking. Try a different one!'];

  start() {
    const s = this.scene;
    this.qi = 0;
    this.tries = 0;
    this.board = this.track(new QuizBoard(s, { x: this.cx, y: this.cy + 10, index: 0 }));
    this.dots = [0, 1, 2].map((i) => this.track(s.add.circle(this.cx - 24 + i * 24, this.cy + 172, 7, 0x2c2550).setStrokeStyle(2, 0x5a4f8c)));
    this.bubble = this.track(s.add.container(this.cx, this.cy + 236).setDepth(40).setAlpha(0));
    this.bubbleBg = s.add.graphics();
    this.bubbleText = Juice.text(s, 0, 0, '', 17, '#1a1030', { body: true, weight: '700', wrap: 560 });
    this.bubble.add([this.bubbleBg, this.bubbleText]);
  }

  autoPlay() {
    const wrong = [0, 1, 2, 3].filter((i) => i !== this.board.correct);
    wrong.slice(0, 2).forEach((w, k) => {
      const p = this.board.pos(w);
      this.scene.time.delayedCall(400 + k * 1600, () => this.play(p.x, p.y));
    });
  }

  play(x, y) {
    if (this.done) return;
    const i = this.board.tileAt(x, y);
    if (i < 0 || this.board.tiles[i].tried) return;
    if (i === this.board.correct) this.success(i);
    else this.miss(i);
  }

  say(text) {
    const s = this.scene;
    this.bubbleText.setText(text);
    const w = Math.min(600, this.bubbleText.width + 44);
    const h = this.bubbleText.height + 26;
    this.bubbleBg.clear().fillStyle(0xfff6e0, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 18)
      .fillTriangle(-10, -h / 2, 10, -h / 2, 0, -h / 2 - 12);
    s.tweens.killTweensOf(this.bubble);
    this.bubble.setAlpha(0).setY(this.cy + 252).setScale(0.9);
    s.tweens.add({ targets: this.bubble, alpha: 1, y: this.cy + 236, scale: 1, duration: 260, ease: 'Back.easeOut' });
  }

  miss(i) {
    const s = this.scene;
    const b = this.board;
    const tile = b.tiles[i];
    tile.tried = true;
    this.tries += 1;
    // 1. head-shake wiggle
    if (this.p.wiggle > 0 && !Juice.reduced) {
      s.tweens.add({ targets: tile.c, x: tile.x + this.p.wiggle, duration: 55, yoyo: true, repeat: 2, ease: 'Sine.easeInOut', onComplete: () => tile.c.setX(tile.x) });
    }
    // 2. soft amber, kept
    b.paint(i, QuizBoard.COLORS.soft, 0.32, 260);
    b.drawBg(tile, QuizBoard.COLORS.soft, 2);
    tile.label.setColor('#ffe2b0');
    // a soft, low "hm" instead of a buzzer
    Juice.sfx('tone', 330, 0.16, 'sine', 0.07);
    Juice.sfx('tone', 294, 0.2, 'sine', 0.06, 0.12);
    // 3. kind + useful words
    const line = GentleRetry.LINES[(this.tries - 1) % GentleRetry.LINES.length];
    this.say(`${line}  ${b.data.hint}`);
    // 4. attempt dot
    const d = this.dots[Math.min(this.tries, 3) - 1];
    if (d) { d.setFillStyle(0xffb44a).setStrokeStyle(2, 0xffd88a); Juice.pop(s, d, 0.3, 260); }
    // 5. scaffold
    if (this.tries >= this.p.hintAfter && !this.hinting) this.hint();
  }

  hint() {
    const s = this.scene;
    const b = this.board;
    this.hinting = true;
    const t = b.tiles[b.correct];
    const ring = s.add.graphics();
    ring.lineStyle(4, QuizBoard.COLORS.hint, 1).strokeRoundedRect(-b.tileW / 2 - 6, -b.tileH / 2 - 6, b.tileW + 12, b.tileH + 12, 20);
    t.c.add(ring);
    this.ring = ring;
    s.tweens.add({ targets: ring, alpha: { from: 0.25, to: 1 }, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    if (!Juice.reduced) s.tweens.add({ targets: t.c, scale: 1.03, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  async success(i) {
    const s = this.scene;
    const b = this.board;
    this.done = true;
    if (this.ring) { s.tweens.killTweensOf(this.ring); this.ring.destroy(); }
    s.tweens.killTweensOf(b.tiles[i].c);
    b.tiles[i].c.setScale(1);
    Juice.pop(s, b.tiles[i].c, 0.1, 280);
    b.paint(i, QuizBoard.COLORS.correct, 1, 200);
    b.check(i, 300);
    const { x, y } = b.pos(i);
    Juice.burst(s, x, y, 'fx-star', { speed: { min: 80, max: 220 }, lifespan: 650, scale: { start: 0.5, end: 0 }, color: [0xffffff, 0xb8ffd8], blendMode: 'ADD' }, 16, 21);
    Juice.sfx('chime');
    this.say(this.tries ? 'Yes! You kept going and got it.' : 'Yes! Spot on.');
    await Juice.wait(s, 1800);
    if (!s.sys.isActive()) return;
    this.qi += 1;
    this.tries = 0;
    this.hinting = false;
    this.done = false;
    b.tiles.forEach((t) => { t.tried = false; });
    this.dots.forEach((d) => d.setFillStyle(0x2c2550).setStrokeStyle(2, 0x5a4f8c));
    s.tweens.add({ targets: this.bubble, alpha: 0, duration: 200 });
    b.setQuestion(this.qi);
    Juice.pop(s, b.root, 0.04, 260);
  }
}
