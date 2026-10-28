/**
 * QuizScene — a gamified quiz using your own answer buttons plus:
 *   fx.correct / fx.wrong / fx.hint     answer feedback
 *   fx.streak                           streak + multiplier
 *   fx.timer                            countdown per question
 *   fx.xpBar                            XP from every right answer
 *   fx.starRating + fx.badge            results at the end
 */
class QuizScene extends Phaser.Scene {
  constructor() { super('QuizScene'); }

  static QUESTIONS = [
    { q: 'Which word is a noun?', a: ['run', 'happy', 'cat', 'quickly'], c: 2, hint: 'A noun is a thing you can point at.' },
    { q: 'What is 7 × 8?', a: ['54', '56', '64', '48'], c: 1, hint: 'Try 7 × 4 = 28, then double it.' },
    { q: 'Which planet is closest to the Sun?', a: ['Venus', 'Earth', 'Mercury', 'Mars'], c: 2, hint: 'It is also the smallest planet.' },
    { q: 'Which one is a feeling?', a: ['table', 'proud', 'blue', 'seven'], c: 1, hint: 'How do you feel after finishing something hard?' },
    { q: 'How many sides does a hexagon have?', a: ['5', '8', '6', '7'], c: 2, hint: 'Honeycomb cells are hexagons.' }
  ];

  create() {
    const { width } = this.scale;
    this.index = 0;
    this.correctCount = 0;
    this.tries = 0;
    new Button(this, 80, 34, '◀ Menu', () => this.fx.goto('Menu', {}, { type: 'iris' }), { width: 120, height: 40, size: 16 });

    // HUD
    this.scoreText = this.add.text(width - 40, 34, '0', { fontFamily: '"Trebuchet MS", sans-serif', fontSize: '28px', color: '#ffc94a', fontStyle: 'bold' }).setOrigin(1, 0.5);
    this.add.image(width - 40 - 70, 34, 'pfx-star5').setScale(0.3);
    this.streak = this.fx.streak(80, 300, { milestone: 3 });
    this.xp = this.fx.xpBar(width / 2 - 150, 34, { width: 300, need: 60, height: 18 });

    // question + 4 answer buttons (your own UI; PhaserFX decorates it)
    this.question = this.add.text(width / 2, 150, '', { fontFamily: '"Trebuchet MS", sans-serif', fontSize: '28px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    this.buttons = [0, 1, 2, 3].map((i) => new Button(this, width / 2 + (i % 2 ? 160 : -160), 260 + Math.floor(i / 2) * 96, '', () => this.answer(i), { width: 290, height: 72, size: 24 }));
    this.ask();
  }

  ask() {
    const Q = QuizScene.QUESTIONS[this.index];
    this.tries = 0;
    this.locked = false;
    this.question.setText(`${this.index + 1}/${QuizScene.QUESTIONS.length} · ${Q.q}`);
    this.buttons.forEach((b, i) => { b.setText(Q.a[i]).setAlpha(1).setVisible(true); b.draw(b.color); });
    this.fx.pop(this.question, 0.08);
    if (this.timer) this.timer.destroy();
    this.timer = this.fx.timer(this.scale.width - 70, 140, { seconds: 15, urgentAt: 5, radius: 40, onTimeUp: () => this.timeUp() });
  }

  async answer(i) {
    if (this.locked) return;
    const Q = QuizScene.QUESTIONS[this.index];
    const btn = this.buttons[i];
    if (i === Q.c) {
      this.locked = true;
      this.timer.stop();
      if (this.hintHandle) { this.hintHandle.stop(); this.hintHandle = null; }
      if (this.tries === 0) this.correctCount += 1;
      this.streak.hit();
      const points = 10 * this.streak.multiplier;
      this.xp.add(20, btn.x, btn.y, 6);
      await this.fx.correct(btn, { points, scoreText: this.scoreText, others: this.buttons, keep: false });
      await this.fx.wait(500);
      this.next();
    } else {
      this.tries += 1;
      this.streak.miss();
      await this.fx.wrong(btn, { message: `Nice try! ${Q.hint}`, keep: false, hold: 2400 });
      if (this.tries >= 2 && !this.hintHandle) this.hintHandle = this.fx.hint(this.buttons[Q.c]);
    }
  }

  async timeUp() {
    this.locked = true;
    const Q = QuizScene.QUESTIONS[this.index];
    this.fx.say(this.scale.width / 2, 470, "Time's up! Here is the answer.", { hold: 1600 });
    const h = this.fx.hint(this.buttons[Q.c]);
    await this.fx.wait(1800);
    h.stop();
    this.next();
  }

  async next() {
    this.index += 1;
    if (this.index < QuizScene.QUESTIONS.length) { this.ask(); return; }
    this.timer.destroy();
    this.buttons.forEach((b) => b.setVisible(false));
    this.question.setText('');
    const stars = this.correctCount >= 5 ? 3 : this.correctCount >= 3 ? 2 : this.correctCount >= 1 ? 1 : 0;
    const panel = await this.fx.starRating(stars, { score: Number(this.scoreText.text), title: 'QUIZ COMPLETE' });
    await this.fx.badge({ title: 'Curious Mind', description: 'Finished your first quiz', color: '#4fa3ff', glyph: '?' });
    new Button(this, this.scale.width / 2, this.scale.height - 40, 'Play again', () => { panel.destroy(); this.scene.restart(); }, { width: 200, height: 44, size: 18 });
  }
}
