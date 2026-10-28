/**
 * StreakCombo — answers in a row grow a flame and unlock multipliers.
 *
 * LESSONS:
 *  - Make momentum VISIBLE and growing: the flame's size and emission rate
 *    are driven by the streak number, so the reward is continuous, not only
 *    at milestones.
 *  - Milestones (3, 6, 9…) get a bigger beat: a banner sweeps across with
 *    the new multiplier.
 *  - When the streak ends, be kind: report the best run ("4 in a row!")
 *    instead of a fail sound. The flame shrinks to a small ember that keeps
 *    glowing, ready to grow again.
 */
class StreakCombo extends BaseEffect {
  static id = 'streak';
  static title = 'Streak & Combo';
  static group = 'rewards';
  static tags = ['learning', 'games'];
  static useFor = 'Practice drills, daily streaks, combo systems in arcade and puzzle games.';
  static mode = 'tap';
  static hint = 'Answer correctly to grow the streak. Pick a wrong answer to see a kind reset.';
  static file = 'js/effects/StreakCombo.js';
  static uses = ['js/fx/QuizBoard.js', 'js/fx/Juice.js'];
  static summary = 'A flame beside the streak counter grows with every right answer; every few answers a multiplier banner sweeps in. A miss ends the streak kindly.';
  static steps = [
    'Flame emitter: scale and frequency are recalculated from the streak each time it changes.',
    'The counter pops and its number rolls; the colour warms from amber toward pink.',
    'Every N correct: a full-width banner slides in (Back.easeOut), holds, and slides out; multiplier ×2, ×3…',
    'Wrong answer: the streak resets, the flame tweens down to an ember (it never fully goes out).',
    'A gentle message celebrates the best run so far.'
  ];
  static params = [
    { key: 'milestone', label: 'Milestone every', min: 2, max: 6, step: 1, value: 3 },
    { key: 'growth', label: 'Flame growth', min: 0.05, max: 0.4, step: 0.01, value: 0.16 }
  ];

  start() {
    const s = this.scene;
    this.streak = 0;
    this.best = 0;
    this.qi = 0;
    this.board = this.track(new QuizBoard(s, { x: this.cx + 80, y: this.cy + 40, index: 0, tileW: 260 }));
    // streak pill (left)
    const px = 112;
    const py = this.cy + 30;
    this.flamePos = { x: px, y: py - 30 };
    this.flame = this.emitter(px, py - 30, 'fx-ember', {
      frequency: 60, quantity: 1, lifespan: { min: 380, max: 620 },
      emitZone: { type: 'random', source: new Phaser.Geom.Ellipse(0, 0, 26, 8) },
      speedY: { min: -150, max: -80 }, speedX: { min: -14, max: 14 },
      scale: { start: 0.9, end: 0.1, ease: 'Quad.easeIn' }, alpha: { start: 0.9, end: 0.2 },
      color: [0xfff2c0, 0xffc23a, 0xff6a14, 0xb3220c], blendMode: 'ADD'
    }, 6);
    this.flameGlow = this.track(s.add.image(px, py - 50, 'fx-glow').setTint(0xff8a2a).setBlendMode(Phaser.BlendModes.ADD).setScale(0.8).setAlpha(0.4).setDepth(5));
    this.count = this.track(Juice.text(s, px, py + 30, '0', 44, '#ffc94a'));
    this.track(Juice.text(s, px, py + 66, 'in a row', 14, '#9b93c4', { body: true }));
    this.multi = this.track(Juice.text(s, px, py + 100, '×1', 20, '#ece8ff'));
    this.note = this.track(Juice.text(s, this.cx + 80, s.scale.height - 42, '', 16, '#ffd88a', { body: true }));
    this.setFlame(0);
  }

  setFlame(n) {
    const k = 1 + n * this.p.growth;
    // "scale" is really two ops (scaleX + scaleY); loadConfig swaps their settings on a live emitter
    const sc = { start: 0.9 * k, end: 0.1, ease: 'Quad.easeIn' };
    this.flame.ops.scaleX.loadConfig({ scaleX: sc });
    this.flame.ops.scaleY.loadConfig({ scaleY: sc });
    this.flame.ops.speedY.loadConfig({ speedY: { min: -150 * Math.sqrt(k), max: -80 * Math.sqrt(k) } });
    this.flame.frequency = Math.max(14, 60 / k);
    this.scene.tweens.add({ targets: this.flameGlow, scale: 0.8 * k, alpha: Math.min(0.9, 0.3 + n * 0.06), duration: 300 });
  }

  autoPlay() {
    for (let k = 0; k < 3; k++) {
      this.scene.time.delayedCall(400 + k * 1100, () => { const p = this.board.pos(this.board.correct); this.play(p.x, p.y); });
    }
  }

  play(x, y) {
    if (this.busy) return;
    const i = this.board.tileAt(x, y);
    if (i < 0) return;
    if (i === this.board.correct) this.right(i);
    else this.wrong(i);
  }

  async right(i) {
    const s = this.scene;
    const b = this.board;
    this.busy = true;
    this.streak += 1;
    this.best = Math.max(this.best, this.streak);
    b.paint(i, QuizBoard.COLORS.correct, 1, 150);
    Juice.pop(s, b.tiles[i].c, 0.1, 260);
    b.check(i, 240);
    Juice.sfx('tone', 523 * 2 ** (Math.min(this.streak, 12) / 12), 0.16, 'triangle', 0.1);
    // counter
    this.count.setText(String(this.streak));
    const warm = Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(0xffc94a), Phaser.Display.Color.ValueToColor(0xff5fa2), 10, Math.min(10, this.streak));
    this.count.setColor(Phaser.Display.Color.RGBToString(warm.r, warm.g, warm.b));
    Juice.pop(s, this.count, 0.3, 320);
    this.setFlame(this.streak);
    Juice.burst(s, this.flamePos.x, this.flamePos.y, 'fx-dot', { speed: { min: 60, max: 180 }, angle: { min: -150, max: -30 }, lifespan: 500, scale: { start: 0.5, end: 0 }, color: [0xffe680, 0xff7a1a], blendMode: 'ADD' }, 10 + this.streak * 2, 7);
    if (this.streak % this.p.milestone === 0) await this.banner(1 + this.streak / this.p.milestone);
    await Juice.wait(s, 420);
    if (!s.sys.isActive()) return;
    this.qi += 1;
    b.setQuestion(this.qi);
    this.busy = false;
  }

  async banner(mult) {
    const s = this.scene;
    this.multi.setText(`×${mult}`);
    Juice.pop(s, this.multi, 0.4, 360);
    const band = s.add.container(-500, this.cy - 20).setDepth(100);
    const bg = s.add.rectangle(0, 0, 960, 96, 0xff5fa2, 0.92).setAngle(-4);
    const t = Juice.text(s, 0, 0, `ON FIRE!  ×${mult}`, 46, '#ffffff', { stroke: '#7a1040', strokeThickness: 8 }).setAngle(-4);
    band.add([bg, t]);
    Juice.sfx('fanfare');
    await Juice.tween(s, { targets: band, x: this.cx, duration: 360, ease: 'Back.easeOut' });
    Juice.burst(s, this.cx, this.cy - 20, 'fx-star', { speed: { min: 150, max: 420 }, lifespan: 700, scale: { start: 0.7, end: 0 }, color: [0xffffff, 0xffd86b, 0xff5fa2], blendMode: 'ADD' }, 30, 101);
    await Juice.wait(s, 650);
    await Juice.tween(s, { targets: band, x: s.scale.width + 520, duration: 300, ease: 'Cubic.easeIn' });
    band.destroy();
  }

  async wrong(i) {
    const s = this.scene;
    const b = this.board;
    this.busy = true;
    const run = this.streak;
    b.paint(i, QuizBoard.COLORS.soft, 0.32, 200);
    Juice.sfx('tone', 330, 0.18, 'sine', 0.07);
    this.streak = 0;
    this.count.setText('0').setColor('#ffc94a');
    this.multi.setText('×1');
    this.setFlame(0);
    this.note.setText(run > 1 ? `Streak ended at ${run}. Great run! Best so far: ${this.best}` : 'No worries. A new streak starts now!');
    this.note.setAlpha(0);
    s.tweens.add({ targets: this.note, alpha: 1, duration: 300 });
    await Juice.wait(s, 900);
    if (!s.sys.isActive()) return;
    b.setQuestion(++this.qi);
    this.busy = false;
  }
}
