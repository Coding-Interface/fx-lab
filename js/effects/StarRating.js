/**
 * StarRating — the end-of-level results screen.
 *
 * LESSONS:
 *  - Reveal results ONE AT A TIME. Three stars appearing together is a
 *    picture; three stars landing one after another, each with a higher
 *    note, is a little story with a climax.
 *  - Count the score up while the panel opens, so the number "earns" itself.
 *  - Show the empty slots from the start: the learner sees what is possible,
 *    and a missed star reads as "next time", not "failed".
 *  - The best result (3 stars) gets an extra layer (confetti); lower results
 *    still end on a warm message.
 */
class StarRating extends BaseEffect {
  static id = 'stars';
  static title = 'Star Rating Results';
  static group = 'rewards';
  static tags = ['learning', 'games'];
  static useFor = 'Level-complete screens, lesson or quiz results, assessment summaries.';
  static mode = 'auto';
  static hint = 'Click to replay. Change "Stars earned" to see each result.';
  static file = 'js/effects/StarRating.js';
  static uses = ['js/fx/UIArt.js', 'js/fx/Juice.js'];
  static summary = 'A results panel pops open, the score rolls up, then stars slam into their slots one at a time with rising notes. Three stars adds confetti.';
  static steps = [
    'Panel: scale 0.6 → 1 with Back.easeOut; the empty star slots are already visible.',
    'Score counts up from 0 (Juice.countUp, Cubic.easeOut so it slows near the end).',
    'Each earned star starts at scale 3 and rotation −40°, then slams in with Cubic.easeIn: a "stamp".',
    'On landing: shockwave ring, star burst, small shake, and a note one step higher than the last.',
    'Missed slots get a faint shimmer and the message invites another try.',
    '3 stars: confetti from both corners and a fanfare.'
  ];
  static params = [
    { key: 'earned', label: 'Stars earned', min: 0, max: 3, step: 1, value: 3 },
    { key: 'score', label: 'Score', min: 0, max: 1000, step: 10, value: 870 },
    { key: 'gap', label: 'Time between stars (ms)', min: 150, max: 900, step: 10, value: 420 }
  ];

  static MESSAGES = ['Good effort! Try again for a star.', 'Nice start! You earned a star.', 'Great work! Two stars!', 'Perfect! All three stars!'];

  start() {
    const s = this.scene;
    this.panel = this.track(s.add.container(this.cx, this.cy).setDepth(10).setScale(0.6).setAlpha(0));
    const g = s.add.graphics();
    g.fillStyle(0x07050f, 0.6).fillRoundedRect(-260, -196, 520, 400, 28);
    g.fillStyle(0x221a44, 1).fillRoundedRect(-260, -204, 520, 400, 28).lineStyle(3, 0x4a3f7c, 1).strokeRoundedRect(-260, -204, 520, 400, 28);
    g.fillStyle(0x2fd48a, 1).fillRoundedRect(-150, -232, 300, 56, 28);
    this.title = Juice.text(s, 0, -204, 'LESSON COMPLETE', 20, '#0b2b20');
    this.slots = [-130, 0, 130].map((x, i) => s.add.image(x, -70 + (i === 1 ? -22 : 0), 'ui-star-empty').setScale(i === 1 ? 1.15 : 0.95));
    this.scoreLbl = Juice.text(s, 0, 52, 'SCORE', 13, '#9b93c4', { body: true, weight: '800' });
    this.scoreText = Juice.text(s, 0, 92, '0', 46, '#ffc94a');
    this.msg = Juice.text(s, 0, 152, '', 18, '#ece8ff', { body: true });
    this.panel.add([g, this.title, ...this.slots, this.scoreLbl, this.scoreText, this.msg]);
  }

  autoPlay() { this.play(); }

  async play() {
    if (this.running) { this.scene.restartEffect(true); return; }
    this.running = true;
    const s = this.scene;
    Juice.sfx('whoosh');
    await Juice.tween(s, { targets: this.panel, scale: 1, alpha: 1, duration: 420, ease: 'Back.easeOut' });
    const counting = Juice.countUp(s, this.scoreText, 0, this.p.score, 900);
    await Juice.wait(s, 300);

    for (let i = 0; i < 3; i++) {
      if (!s.sys.isActive()) return;
      if (i < this.p.earned) await this.slam(i);
      else this.shimmer(i);
      await Juice.wait(s, this.p.gap);
    }
    await counting;
    if (!s.sys.isActive()) return;
    this.msg.setText(StarRating.MESSAGES[this.p.earned]);
    this.msg.setAlpha(0).setY(166);
    s.tweens.add({ targets: this.msg, alpha: 1, y: 152, duration: 300, ease: 'Cubic.easeOut' });
    if (this.p.earned === 3) this.confetti();
  }

  async slam(i) {
    const s = this.scene;
    const slot = this.slots[i];
    const size = i === 1 ? 1.15 : 0.95;
    const star = s.add.image(slot.x, slot.y, 'ui-star').setScale(size * 3).setAngle(-40).setAlpha(0);
    this.panel.add(star);
    await Juice.tween(s, { targets: star, scale: size, angle: 0, alpha: 1, duration: 260, ease: 'Cubic.easeIn' });
    const wx = this.panel.x + slot.x;
    const wy = this.panel.y + slot.y;
    Juice.sfx('tone', [659, 784, 1047][i], 0.25, 'triangle', 0.11);
    Juice.sfx('sparkle');
    Juice.shake(s, 90, 0.003 + i * 0.002);
    Juice.shockwave(s, wx, wy, 0xffd86b, 1.4 + i * 0.3, 420, 20);
    Juice.burst(s, wx, wy, 'fx-star', {
      speed: { min: 100, max: 260 + i * 60 }, lifespan: { min: 400, max: 750 }, scale: { start: 0.55, end: 0 },
      rotate: { min: 0, max: 360 }, color: [0xffffff, 0xffd86b], blendMode: 'ADD'
    }, 14 + i * 8, 21);
    Juice.pop(s, star, 0.18, 280);
  }

  shimmer(i) {
    const slot = this.slots[i];
    this.scene.tweens.add({ targets: slot, alpha: { from: 1, to: 0.55 }, duration: 700, yoyo: true, repeat: 1, ease: 'Sine.easeInOut' });
  }

  confetti() {
    const s = this.scene;
    const conf = {
      tint: [0xff5fa2, 0xffc94a, 0x4fe0c8, 0x7a8cff, 0xffffff], speed: { min: 380, max: 760 }, gravityY: 420, lifespan: 3000,
      rotate: { onEmit: (pt) => { pt.spinSpeed = Phaser.Math.FloatBetween(-8, 8); return Phaser.Math.Between(0, 360); }, onUpdate: (pt, k, t, v) => v + pt.spinSpeed },
      scaleX: { onEmit: (pt) => { pt.wobPhase = Math.random() * 6.28; return 1; }, onUpdate: (pt, k, t) => Math.cos(pt.wobPhase + t * 24) },
      alpha: { start: 1, end: 0, ease: 'Quint.easeIn' }
    };
    Juice.burst(s, 20, s.scale.height, 'fx-confetti', { ...conf, angle: { min: -80, max: -50 } }, 60, 30);
    Juice.burst(s, s.scale.width - 20, s.scale.height, 'fx-confetti', { ...conf, angle: { min: -130, max: -100 } }, 60, 30);
    Juice.sfx('fanfare');
  }
}
