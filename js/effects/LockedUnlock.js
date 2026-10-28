/**
 * LockedUnlock — a gray, chained card breaks free and floods with colour.
 *
 * The beats follow the classic animation rule ANTICIPATION → ACTION → FOLLOW-THROUGH:
 *   anticipation  the lock rattles a few times, each rattle stronger and higher-pitched
 *   action        crack! hit-stop, flash, the lock bursts apart
 *   follow-thru   chains slide off, colour washes in, a shine sweeps across, sparkles
 *
 * Players read "this was locked and now it is mine" from the colour change
 * alone. Everything else is there to make that moment feel earned.
 */
class LockedUnlock extends BaseEffect {
  static id = 'unlock';
  static title = 'Locked Card Unlock';
  static group = 'cards';
  static tags = ['games', 'learning'];
  static useFor = 'Unlocking a card, character, level or a new topic in a course.';
  static mode = 'cards';
  static hint = 'Click the card to unlock it. Click again to re-lock.';
  static file = 'js/effects/LockedUnlock.js';
  static uses = ['js/fx/Juice.js', 'js/fx/CardArt.js'];
  static summary = 'Gray card, chains and a padlock. It rattles (anticipation), cracks (action), then the chains fall and colour floods in (follow-through).';
  static steps = [
    'Locked look: the gray texture sits on top of the colour texture (same art, grayscale filter).',
    'Rattle × N: the lock swings with growing angle, each rattle plays a higher "charge" note and brightens the glow.',
    'Crack: hit-stop, a soft flash, a ring, and gold shards burst from the lock.',
    'Break: the shackle flies up and spins, the body drops with Quad.easeIn (gravity feel).',
    'Chains slide off in opposite directions, 90 ms apart.',
    'Colour: the gray layer fades out while a masked shine sweeps across, then a pop, sparkles and "UNLOCKED!".'
  ];
  static params = [
    { key: 'rattles', label: 'Rattles', min: 0, max: 6, step: 1, value: 3 },
    { key: 'drama', label: 'Drama', min: 0.4, max: 2, step: 0.05, value: 1 },
    { key: 'card', label: 'Card (0–3)', min: 0, max: 3, step: 1, value: 2 }
  ];

  start() {
    const s = this.scene;
    const info = CardArt.CARDS[this.p.card] || CardArt.CARDS[2];
    this.info = info;
    this.R = CardArt.RARITY[info.rarity];
    const x = this.cx;
    const y = this.cy - 10;
    this.state = 'locked';

    this.cardBox = this.track(s.add.container(x, y).setDepth(10));
    this.shadow = s.add.image(10, 16, 'card-shadow').setAlpha(0.8);
    this.color = s.add.image(0, 0, `card-${info.id}`);
    this.gray = s.add.image(0, 0, `card-${info.id}-gray`);
    this.cardBox.add([this.shadow, this.color, this.gray]);

    this.chains = [38, -38].map((a) => this.track(s.add.image(x, y, 'fx-chain').setAngle(a).setScale(1.16, 1).setDepth(11)));

    this.lockGlow = this.track(s.add.image(x, y + 20, 'fx-glow').setTint(0xffd23f).setBlendMode(Phaser.BlendModes.ADD).setScale(0.9).setAlpha(0).setDepth(12));
    this.lock = this.track(s.add.container(x, y + 20).setDepth(13));
    this.shackle = s.add.image(0, -36, 'fx-lock-shackle');
    this.body = s.add.image(0, 0, 'fx-lock-body');
    this.lock.add([this.shackle, this.body]);
    // idle: the lock sways a little so it reads as "interactive"
    this.idle = s.tweens.add({ targets: this.lock, angle: { from: -3, to: 3 }, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.caption = this.label(x, y + 190, 'LOCKED · click to unlock', '#9b93c4', 15);
  }

  autoPlay() { this.scene.time.delayedCall(300, () => this.unlock()); }

  play(x, y) {
    if (Math.abs(x - this.cx) > 160 || Math.abs(y - this.cy) > 200) return;
    if (this.state === 'locked') this.unlock();
    else if (this.state === 'unlocked') this.scene.restartEffect(false);
  }

  async unlock() {
    if (this.state !== 'locked') return;
    this.state = 'busy';
    const s = this.scene;
    const k = this.p.drama;
    const { x, y } = this.lock;
    this.idle.stop();
    this.caption.setText('');

    // 1. ANTICIPATION: rattles that build
    for (let i = 0; i < this.p.rattles; i++) {
      const amp = 8 + i * 5;
      Juice.sfx('charge', i * 2);
      s.tweens.add({ targets: this.lockGlow, alpha: Math.min(1, 0.25 + i * 0.22), scale: 0.9 + i * 0.15, duration: 200 });
      s.tweens.add({ targets: this.chains, y: '+=3', duration: 50, yoyo: true });
      await Juice.tween(s, { targets: this.lock, angle: { from: -amp, to: amp }, duration: 70, yoyo: true, repeat: 1, ease: 'Sine.easeInOut' });
      this.lock.angle = 0;
      await Juice.wait(s, Math.max(90, 260 - i * 50));
    }
    // a held breath before the hit
    await Juice.tween(s, { targets: this.lock, scale: 1.18, duration: 160, ease: 'Quad.easeOut' });

    // 2. ACTION: crack
    Juice.sfx('crack');
    await Juice.hitStop(s, 70 * k);
    if (!s.sys.isActive()) return;
    Juice.flash(s, 140, 0xfff3c4, 0.45);
    Juice.shake(s, 160, 0.006 * k);
    Juice.shockwave(s, x, y, 0xffd23f, 2.2 * k, 480, 14);
    Juice.burst(s, x, y, 'fx-shard', {
      speed: { min: 180 * k, max: 460 * k }, gravityY: 900, lifespan: { min: 600, max: 1000 },
      scale: { min: 0.25, max: 0.6 }, tint: [0xffd23f, 0xffe58a, 0xd99a12],
      rotate: { onEmit: (pt) => { pt.spinSpeed = Phaser.Math.FloatBetween(-12, 12); return Phaser.Math.Between(0, 360); }, onUpdate: (pt, key, t, v) => v + pt.spinSpeed },
      alpha: { start: 1, end: 0, ease: 'Quint.easeIn' }
    }, Math.round(22 * k), 15);
    this.lockGlow.setAlpha(1);
    s.tweens.add({ targets: this.lockGlow, alpha: 0, scale: 2.4, duration: 500 });

    // 3. FOLLOW-THROUGH: pieces fall, chains slide off
    const shackle = this.shackle;
    const body = this.body;
    this.lock.remove([shackle, body]);
    shackle.setPosition(x, y - 36 * 1.18).setDepth(16);
    body.setPosition(x, y).setDepth(16);
    this.track(shackle);
    this.track(body);
    this.lock.destroy();
    s.tweens.add({ targets: shackle, x: x + 120, y: y - 170, angle: 200, duration: 520, ease: 'Quad.easeOut' });
    s.tweens.add({ targets: shackle, y: s.scale.height + 80, delay: 520, duration: 520, ease: 'Quad.easeIn' });
    s.tweens.add({ targets: body, x: x - 60, y: s.scale.height + 80, angle: -140, duration: 900, ease: 'Quad.easeIn' });
    Juice.sfx('whoosh');

    this.chains.forEach((c, i) => {
      s.tweens.add({ targets: c, x: c.x + (i ? -120 : 120), y: c.y + 520, angle: c.angle + (i ? -25 : 25), alpha: 0, delay: 90 + i * 90, duration: 800, ease: 'Quad.easeIn' });
    });

    await Juice.wait(s, 260);

    // 4. COLOUR floods in
    Juice.sfx('chime');
    s.tweens.add({ targets: this.gray, alpha: 0, duration: 650, ease: 'Sine.easeInOut' });
    Juice.shine(s, this.cardBox.x, this.cardBox.y, CardArt.W, CardArt.H, 650, 20, 18);
    await Juice.wait(s, 300);
    Juice.pop(s, this.cardBox, 0.1, 340);
    const rays = this.track(Juice.rays(s, this.cardBox.x, this.cardBox.y, this.R.color, 12, 5));
    s.tweens.add({ targets: rays, scale: 0.75, duration: 500, ease: 'Back.easeOut' });
    Juice.burst(s, this.cardBox.x, this.cardBox.y, 'fx-star', {
      speed: { min: 90, max: 300 * k }, lifespan: { min: 500, max: 1000 }, scale: { start: 0.7, end: 0 },
      rotate: { min: 0, max: 360 }, color: [0xffffff, this.R.color], blendMode: 'ADD'
    }, Math.round(30 * k), 21);
    Juice.floatText(s, this.cardBox.x, this.cardBox.y - 190, 'UNLOCKED!', '#ffc94a', 30);
    await Juice.wait(s, 900);
    this.caption.setText(`${this.info.title.toUpperCase()} · ${this.R.label.toUpperCase()} · click to re-lock`).setColor(this.R.css);
    this.state = 'unlocked';
  }
}
