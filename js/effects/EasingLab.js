/**
 * EasingLab — the same move with six different easing curves, plus a ball
 * bouncing with and without squash & stretch.
 *
 * Watch it in slow motion: Linear looks robotic, Sine is calm, Cubic feels
 * weighty, Back overshoots ("boing"), Elastic wobbles, Bounce lands.
 */
class EasingLab extends BaseEffect {
  static id = 'easing';
  static title = 'Easing & Squash';
  static group = 'foundations';
  static tags = ['games', 'learning', 'stories'];
  static useFor = 'Every button, pop-up, card and character move. Pick the ease before anything else.';
  static mode = 'auto';
  static hint = 'Click to replay. Try slow motion.';
  static file = 'js/effects/EasingLab.js';
  static uses = ['js/fx/Juice.js'];
  static summary = 'Easing is the shape of a movement over time. It is the cheapest way to make anything feel alive, and every effect in this lab uses it.';
  static steps = [
    'Each lane tweens a dot from left to right in the same time, with a different ease.',
    'Back.easeOut overshoots then settles: great for pop-ups, buttons and cards landing.',
    'The right-hand ball squashes on impact and stretches while falling fast.',
    'Squash keeps the area roughly the same: wider means shorter (scaleX up, scaleY down).'
  ];
  static params = [
    { key: 'duration', label: 'Duration (ms)', min: 300, max: 3000, step: 50, value: 1100 }
  ];

  static EASES = ['Linear', 'Sine.easeInOut', 'Cubic.easeOut', 'Back.easeOut', 'Elastic.easeOut', 'Bounce.easeOut'];

  start() {
    const s = this.scene;
    this.lanes = EasingLab.EASES.map((ease, i) => {
      const y = 90 + i * 74;
      this.track(s.add.rectangle(330, y, 500, 2, 0x2c2550));
      this.label(80, y, ease, '#ece8ff', 14).setOrigin(0, 0.5);
      const dot = this.track(s.add.image(110, y, 'fx-dot').setScale(1.6).setTint(0xffc94a));
      const glow = this.track(s.add.image(110, y, 'fx-glow').setScale(0.35).setTint(0xffc94a).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.6));
      return { ease, dot, glow, y };
    });

    // squash & stretch comparison
    this.track(s.add.rectangle(780, 520, 320, 3, 0x5a4f8c));
    this.label(710, 552, 'no squash', '#9b93c4', 13);
    this.label(850, 552, 'squash & stretch', '#ffc94a', 13);
    this.flat = this.track(s.add.image(710, 160, 'fx-dot').setScale(3).setTint(0x4fe0c8).setOrigin(0.5, 1));
    this.juicy = this.track(s.add.image(850, 160, 'fx-dot').setScale(3).setTint(0xff5fa2).setOrigin(0.5, 1));
    this.autoPlay();
  }

  autoPlay() { this.play(); }

  play() {
    const s = this.scene;
    const d = this.p.duration;
    this.lanes.forEach((l) => {
      s.tweens.killTweensOf([l.dot, l.glow]);
      l.dot.x = l.glow.x = 110;
      s.tweens.add({ targets: [l.dot, l.glow], x: 560, duration: d, ease: l.ease, delay: 200, hold: 500, yoyo: true, repeat: -1, repeatDelay: 300 });
    });
    this.bounce(this.flat, false);
    this.bounce(this.juicy, true);
  }

  /** Gravity-like fall (Quad.easeIn) and rise (Quad.easeOut), with optional squash. */
  bounce(ball, squash) {
    const s = this.scene;
    s.tweens.killTweensOf(ball);
    ball.setPosition(ball.x, 160).setScale(3);
    const fall = this.p.duration * 0.45;
    const tweens = [
      { y: 518, duration: fall, ease: 'Quad.easeIn', scaleX: squash ? 2.5 : 3, scaleY: squash ? 3.7 : 3 },   // stretch while falling
      { scaleX: squash ? 4.1 : 3, scaleY: squash ? 1.9 : 3, duration: squash ? 70 : 1, ease: 'Quad.easeOut' }, // squash on impact
      { scaleX: squash ? 2.6 : 3, scaleY: squash ? 3.5 : 3, duration: squash ? 90 : 1, ease: 'Quad.easeOut' }, // spring back
      { y: 160, duration: fall, ease: 'Quad.easeOut', scaleX: 3, scaleY: 3 }                                    // rise and relax
    ];
    s.tweens.chain({ targets: ball, tweens, loop: -1 });
  }
}
