/**
 * PackOpening — shake, tear, fan out, then flip each card with rarity effects.
 *
 * LESSONS:
 *  - "Tells": rarer cards glow faintly through their backs BEFORE you flip.
 *    The player's excitement starts before the reveal.
 *  - Save the best for last: cards are dealt in rarity order, so the
 *    legendary is the final flip and the session ends on a high.
 *  - The tear uses setCrop on two copies of the same pack image, so the top
 *    strip and the body line up perfectly without extra art.
 *  - RarityFX does the per-card reveal, scaled by rarity (see RarityFX.js).
 */
class PackOpening extends BaseEffect {
  static id = 'pack';
  static title = 'Pack Opening';
  static group = 'cards';
  static tags = ['games', 'learning'];
  static useFor = 'Booster packs, daily reward chests, a bundle of new vocabulary cards.';
  static mode = 'cards';
  static hint = 'Click the pack, then click each card.';
  static file = 'js/effects/PackOpening.js';
  static uses = ['js/fx/RarityFX.js', 'js/fx/Card.js', 'js/fx/Juice.js', 'js/fx/CardArt.js'];
  static summary = 'A booster pack that rattles, tears open with a burst of light and deals four cards. Rarer cards glow through their backs, and each flip gets the effect budget its rarity deserves.';
  static steps = [
    'Idle: the pack bobs and glows, which signals that it can be clicked.',
    'Rattle × 3: each shake is stronger, with a rising note.',
    'Tear: two cropped copies of the pack image. The top strip flies off spinning while light bursts out of the opening.',
    'Deal: the cards fly from the pack to a fan with Back.easeOut, 120 ms apart; then the pack drops away.',
    'Tells: rare and better cards pulse a glow in their rarity colour while face-down.',
    'Flip: Card.flip() + RarityFX.play(rarity). Common = puff, Legendary = the full show.'
  ];
  static params = [
    { key: 'rattles', label: 'Rattles', min: 0, max: 5, step: 1, value: 3 },
    { key: 'tells', label: 'Rarity tells (0/1)', min: 0, max: 1, step: 1, value: 1 },
    { key: 'deal', label: 'Deal stagger (ms)', min: 40, max: 400, step: 10, value: 120 }
  ];

  start() {
    const s = this.scene;
    this.state = 'pack';
    this.keep = [];
    this.packGlow = this.track(s.add.image(this.cx, this.cy, 'fx-glow').setTint(0xff5fa2).setBlendMode(Phaser.BlendModes.ADD).setScale(3.4).setAlpha(0.45).setDepth(18));
    this.pack = this.track(s.add.image(this.cx, this.cy, 'fx-pack').setDepth(20));
    this.bob = s.tweens.add({ targets: [this.pack], y: this.cy - 10, angle: { from: -2, to: 2 }, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    s.tweens.add({ targets: this.packGlow, alpha: 0.25, scale: 3.1, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.caption = this.label(this.cx, this.scale().height - 34, 'click the pack', '#9b93c4', 15);
  }

  scale() { return this.scene.scale; }

  autoPlay() { this.scene.time.delayedCall(300, () => this.open()); }

  play(x, y) {
    if (this.state === 'pack') {
      if (Math.abs(x - this.pack.x) < 140 && Math.abs(y - this.pack.y) < 190) this.open();
    } else if (this.state === 'cards') {
      const card = this.cards.find((c) => !c.revealed && c.contains(x, y));
      if (card) this.reveal(card);
    } else if (this.state === 'done') {
      this.scene.restartEffect(true);
    }
  }

  async open() {
    if (this.state !== 'pack') return;
    this.state = 'busy';
    const s = this.scene;
    this.bob.stop();
    s.tweens.killTweensOf(this.packGlow);
    this.caption.setText('');
    const px = this.pack.x;
    const py = this.pack.y;

    // 1. rattle, building up
    for (let i = 0; i < this.p.rattles; i++) {
      Juice.sfx('charge', i * 3);
      s.tweens.add({ targets: this.packGlow, alpha: 0.5 + i * 0.15, scale: 3.4 + i * 0.3, duration: 150 });
      await Juice.tween(s, { targets: this.pack, angle: { from: -(4 + i * 3), to: 4 + i * 3 }, duration: 60, yoyo: true, repeat: 1 });
      this.pack.angle = 0;
      await Juice.wait(s, Math.max(80, 240 - i * 60));
    }
    if (!s.sys.isActive()) return;

    // 2. tear: two cropped copies of the same image
    const TEAR = 74;
    const top = this.track(s.add.image(px, py, 'fx-pack').setCrop(0, 0, 240, TEAR).setDepth(22));
    this.pack.setCrop(0, TEAR, 240, 340 - TEAR);
    Juice.sfx('crack');
    Juice.sfx('whoosh');
    s.tweens.add({ targets: top, x: px - 180, y: py - 260, angle: -70, alpha: 0, duration: 650, ease: 'Quad.easeOut' });
    const tearY = py - 170 + TEAR;
    Juice.flash(s, 160, 0xffffff, 0.35);
    const rays = this.track(Juice.rays(s, px, tearY, 0xfff1b8, 10, 19));
    s.tweens.add({ targets: rays, scale: 0.6, duration: 260, ease: 'Back.easeOut' });
    s.tweens.add({ targets: rays, alpha: 0, delay: 500, duration: 400 });
    Juice.burst(s, px, tearY, 'fx-star', {
      emitZone: { type: 'random', source: new Phaser.Geom.Line(-110, 0, 110, 0) },
      speedY: { min: -360, max: -120 }, speedX: { min: -80, max: 80 }, gravityY: 300, lifespan: 900,
      scale: { start: 0.6, end: 0 }, rotate: { min: 0, max: 360 }, color: [0xffffff, 0xffd86b, 0xff5fa2], blendMode: 'ADD'
    }, 36, 23);
    await Juice.wait(s, 200);

    // 3. deal cards in rarity order (best last)
    const order = CardArt.CARDS.slice().sort((a, b) => CardArt.RARITY[a.rarity].rank - CardArt.RARITY[b.rarity].rank);
    const gap = 214;
    this.cards = order.map((info, i) => {
      const c = this.track(new Card(s, px, tearY, `card-${info.id}`).setScale(0.3).setDepth(10 + i).setAngle(Phaser.Math.Between(-20, 20)));
      c.info = info;
      c.homeY = this.cy + 10;
      return c;
    });
    this.cards.forEach((c, i) => {
      s.tweens.add({
        targets: c, x: this.cx + (i - 1.5) * gap, y: c.homeY, scale: 0.86, angle: 0,
        delay: i * this.p.deal, duration: 520, ease: 'Back.easeOut',
        onStart: () => Juice.sfx('flip')
      });
    });
    s.tweens.add({ targets: [this.pack, this.packGlow], y: '+=420', alpha: 0, delay: 250, duration: 700, ease: 'Quad.easeIn' });
    await Juice.wait(s, this.p.deal * 4 + 560);
    if (!s.sys.isActive()) return;

    // 4. tells: rare+ cards glow through their backs
    if (this.p.tells) {
      this.cards.forEach((c) => {
        const R = CardArt.RARITY[c.info.rarity];
        if (R.rank === 0) return;
        c.tell = Juice.glow(s, c.face, R.color, 1);
        c.tell.pulse(1, 2 + R.rank * 1.5, 900 - R.rank * 150);
      });
    }
    this.state = 'cards';
    this.caption.setText('click each card');
  }

  async reveal(card) {
    const s = this.scene;
    card.revealed = true;
    if (card.tell) { card.tell.destroy(); card.tell = null; }
    await card.flip({ duration: 440 });
    if (!s.sys.isActive()) return;
    this.keep.push(...RarityFX.play(s, card, card.info.rarity));
    if (this.cards.every((c) => c.revealed)) {
      await Juice.wait(s, 900);
      if (!s.sys.isActive()) return;
      this.state = 'done';
      this.caption.setText('click to open another pack');
    }
  }

  destroy() {
    this.keep.forEach((o) => o && o.destroy && o.destroy());
    super.destroy();
  }
}
