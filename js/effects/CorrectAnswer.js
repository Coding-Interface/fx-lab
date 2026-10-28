/**
 * CorrectAnswer — the "yes!" moment in a quiz.
 *
 * LESSONS:
 *  - Confirm on the THING the learner touched: the tile itself pops, turns
 *    green and draws a check mark. Their eyes are already there.
 *  - Then move attention to the reward: "+10" flies from the tile to the
 *    score, and the score rolls up when it lands. This links the action to
 *    the progress.
 *  - Dim the other answers so the right one stands out (a quiet way to
 *    reinforce the correct answer for learners who guessed).
 *  - Keep it short (~0.8 s). A learner will see it 20 times in a lesson.
 */
class CorrectAnswer extends BaseEffect {
  static id = 'correct';
  static title = 'Correct Answer';
  static group = 'feedback';
  static tags = ['learning', 'games'];
  static useFor = 'Quizzes, assessments, flashcard drills and trivia: any moment a learner gets it right.';
  static mode = 'tap';
  static hint = 'Click an answer. The correct tile celebrates; wrong tiles just wiggle.';
  static file = 'js/effects/CorrectAnswer.js';
  static uses = ['js/fx/QuizBoard.js', 'js/fx/Juice.js'];
  static summary = 'Pop, green fill, a hand-drawn check, a star burst, then "+10" flies to the score, which rolls up. Short enough to repeat 20 times a lesson.';
  static steps = [
    'Squash-pop the chosen tile (Juice.pop): instant feedback right under the finger.',
    'Fade a green fill in and draw a check mark stroke by stroke (QuizBoard.check).',
    'Burst stars and a ring from the tile; play a bright two-note chime.',
    'Dim the other tiles to 40% so the right answer is what stays in memory.',
    '"+10" travels to the score pill on a curve; the score counts up when it arrives and the pill pops.',
    'After a pause, move on to the next question.'
  ];
  static params = [
    { key: 'points', label: 'Points', min: 1, max: 100, step: 1, value: 10 },
    { key: 'stars', label: 'Star burst', min: 0, max: 60, step: 1, value: 24 },
    { key: 'dim', label: 'Dim others (0/1)', min: 0, max: 1, step: 1, value: 1 }
  ];

  start() {
    const s = this.scene;
    this.qi = 0;
    this.score = 0;
    this.busy = false;
    this.board = this.track(new QuizBoard(s, { x: this.cx, y: this.cy + 40, index: 0 }));
    this.pill = this.track(s.add.container(s.scale.width - 110, 44).setDepth(50));
    const bg = s.add.graphics().fillStyle(0x19142e, 0.95).fillRoundedRect(-84, -24, 168, 48, 24).lineStyle(2, 0xffc94a, 0.6).strokeRoundedRect(-84, -24, 168, 48, 24);
    this.pillStar = s.add.image(-56, 0, 'ui-star').setScale(0.32);
    this.scoreText = Juice.text(s, 6, 1, '0', 22, '#ffc94a');
    this.pill.add([bg, this.pillStar, this.scoreText]);
  }

  autoPlay() {
    const p = this.board.pos(this.board.correct);
    this.scene.time.delayedCall(350, () => this.play(p.x, p.y));
  }

  play(x, y) {
    if (this.busy) return;
    const i = this.board.tileAt(x, y);
    if (i < 0) return;
    if (i === this.board.correct) this.celebrate(i);
    else this.wiggle(i);
  }

  wiggle(i) {
    const t = this.board.tiles[i].c;
    this.scene.tweens.add({ targets: t, x: t.x + 6, duration: 50, yoyo: true, repeat: 2, ease: 'Sine.easeInOut' });
    Juice.sfx('tone', 300, 0.12, 'sine', 0.06);
  }

  async celebrate(i) {
    this.busy = true;
    const s = this.scene;
    const b = this.board;
    const tile = b.tiles[i];
    const { x, y } = b.pos(i);

    // 1. on the tile
    Juice.pop(s, tile.c, 0.12, 300);
    b.paint(i, QuizBoard.COLORS.correct, 1, 180);
    b.drawBg(tile, 0x9dffcf, 3);
    Juice.sfx('tone', 784, 0.14, 'triangle', 0.1);
    Juice.sfx('tone', 1175, 0.22, 'triangle', 0.1, 0.09);
    const checked = b.check(i, 300);
    Juice.shockwave(s, x, y, 0x9dffcf, 2.2, 450, 20);
    if (this.p.stars) {
      Juice.burst(s, x, y, 'fx-star', {
        speed: { min: 120, max: 340 }, lifespan: { min: 450, max: 800 }, scale: { start: 0.6, end: 0 },
        rotate: { min: 0, max: 360 }, color: [0xffffff, 0xb8ffd8, 0xffd86b], blendMode: 'ADD', gravityY: 200
      }, this.p.stars, 21);
    }
    if (this.p.dim) b.dimOthers(i, 0.4);
    await checked;

    // 2. reward travels to the score
    const plus = Juice.text(s, x, y - 10, `+${this.p.points}`, 30, '#ffc94a', { stroke: '#1a1030' }).setDepth(60).setScale(0.3);
    await Juice.tween(s, { targets: plus, scale: 1.1, y: y - 60, duration: 220, ease: 'Back.easeOut' });
    const end = { x: this.pill.x + 6, y: this.pill.y };
    const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(plus.x, plus.y), new Phaser.Math.Vector2((plus.x + end.x) / 2, Math.min(plus.y, end.y) - 120), new Phaser.Math.Vector2(end.x, end.y));
    const o = { t: 0 };
    await Juice.tween(s, {
      targets: o, t: 1, duration: 480, ease: 'Cubic.easeIn',
      onUpdate: () => { const pt = curve.getPoint(o.t); plus.setPosition(pt.x, pt.y).setScale(1.1 - o.t * 0.6); }
    });
    plus.destroy();
    if (!s.sys.isActive()) return;
    const from = this.score;
    this.score += this.p.points;
    Juice.pop(s, this.pill, 0.18, 260);
    Juice.sfx('coin');
    Juice.burst(s, this.pill.x - 56, this.pill.y, 'fx-star', { speed: { min: 30, max: 120 }, lifespan: 400, scale: { start: 0.45, end: 0 }, color: [0xffffff, 0xffd23f], blendMode: 'ADD' }, 6, 60);
    await Juice.countUp(s, this.scoreText, from, this.score, 450);

    // 3. next question
    await Juice.wait(s, 650);
    if (!s.sys.isActive()) return;
    this.qi += 1;
    await Juice.tween(s, { targets: b.root, alpha: 0, x: this.cx - 40, duration: 180, ease: 'Quad.easeIn' });
    b.setQuestion(this.qi);
    b.root.setX(this.cx + 40);
    await Juice.tween(s, { targets: b.root, alpha: 1, x: this.cx, duration: 240, ease: 'Cubic.easeOut' });
    this.busy = false;
  }
}
