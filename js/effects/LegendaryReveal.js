/**
 * LegendaryReveal — the full "gacha" reveal, beat by beat.
 *
 * The beat chips at the bottom light up as each stage plays, so you can see
 * the structure. Slow motion helps a lot here.
 *
 *   Drop → Anticipate → Tension → Release → Reveal → Shine → Stamp → Celebrate
 *
 * LESSON: the reveal is mostly WAITING. Roughly 60% of the time is build-up
 * (drop, pulses, tension) and only 10% is the explosion. The build-up is what
 * makes the explosion feel big.
 */
class LegendaryReveal extends BaseEffect {
  static id = 'legendary';
  static title = 'Legendary Reveal';
  static group = 'cards';
  static tags = ['games'];
  static useFor = 'Rare drops, gacha pulls, a once-per-session grand reward.';
  static mode = 'cards';
  static hint = 'Click to summon. Click again when it finishes to replay.';
  static file = 'js/effects/LegendaryReveal.js';
  static uses = ['js/fx/Juice.js', 'js/fx/Card.js', 'js/fx/CardArt.js'];
  static summary = 'A complete legendary card reveal in eight beats. The build-up takes most of the time; the explosion is short. Watch the beat chips.';
  static steps = [
    'Drop: the card back falls in with Bounce.easeOut; a dust puff and a tiny shake on landing.',
    'Anticipate: N pulses, each with a rising note, more glow, a slight camera zoom and particles pulled inward.',
    'Tension: the card jitters, god rays fade in, the inward pull gets faster.',
    'Release: hit-stop → gold flash → two rings → star burst → boom, and the zoom snaps back.',
    'Reveal: a juicy flip to the legendary face.',
    'Shine: a bright bar sweeps across, clipped by a GeometryMask.',
    'Stamp: "LEGENDARY!" slams down from scale 3 → 1 with a thud and dust.',
    'Celebrate: confetti cannons, a pulsing glow and ambient sparkles.'
  ];
  static params = [
    { key: 'pulses', label: 'Anticipation pulses', min: 0, max: 6, step: 1, value: 3 },
    { key: 'hitstop', label: 'Hit-stop (ms)', min: 0, max: 200, step: 5, value: 90 },
    { key: 'confetti', label: 'Confetti', min: 0, max: 160, step: 5, value: 80 }
  ];

  static BEATS = ['Drop', 'Anticipate', 'Tension', 'Release', 'Reveal', 'Shine', 'Stamp', 'Celebrate'];

  start() {
    const s = this.scene;
    this.state = 'idle';
    this.cardY = this.cy - 30;
    this.makeBeats();
    this.summon = this.track(s.add.image(this.cx, this.cardY, 'fx-ring').setTint(0xffc94a).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.5).setScale(1.3).setDepth(2));
    s.tweens.add({ targets: this.summon, scale: 1.45, alpha: 0.25, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.caption = this.label(this.cx, this.cardY, 'click to summon', '#ffc94a', 16);
  }

  makeBeats() {
    const s = this.scene;
    const n = LegendaryReveal.BEATS.length;
    const w = 104;
    const x0 = this.cx - ((n - 1) * (w + 8)) / 2;
    this.chips = LegendaryReveal.BEATS.map((name, i) => {
      const c = this.track(s.add.container(x0 + i * (w + 8), s.scale.height - 34).setDepth(200));
      const bg = s.add.rectangle(0, 0, w, 30, 0x19142e).setStrokeStyle(1.5, 0x2c2550);
      const t = s.add.text(0, 0, `${i + 1} ${name}`, { fontFamily: '"Manrope", "Trebuchet MS", sans-serif', fontSize: '13px', color: '#6f689a', fontStyle: '700' }).setOrigin(0.5);
      c.add([bg, t]);
      return { c, bg, t };
    });
  }

  beat(i) {
    this.chips.forEach((ch, j) => {
      const on = j === i;
      const past = j < i;
      ch.bg.setFillStyle(on ? 0xffc94a : past ? 0x2a2250 : 0x19142e).setStrokeStyle(1.5, on ? 0xffc94a : 0x2c2550);
      ch.t.setColor(on ? '#1a1030' : past ? '#c9c2ef' : '#6f689a');
    });
    if (i >= 0) this.scene.tweens.add({ targets: this.chips[i].c, scale: { from: 1.15, to: 1 }, duration: 220, ease: 'Back.easeOut' });
  }

  autoPlay() { this.scene.time.delayedCall(250, () => this.reveal()); }

  play() {
    if (this.state === 'idle') this.reveal();
    else if (this.state === 'done') this.scene.restartEffect(true);
  }

  alive() { return this.scene.sys.isActive() && this.state !== 'dead'; }

  async reveal() {
    if (this.state !== 'idle') return;
    this.state = 'playing';
    const s = this.scene;
    const cam = s.cameras.main;
    const x = this.cx;
    const y = this.cardY;
    const gold = CardArt.RARITY.legendary.color;
    this.caption.destroy();
    s.tweens.add({ targets: this.summon, alpha: 0, duration: 300 });

    // 1. DROP
    this.beat(0);
    const card = this.track(new Card(s, x, -220, 'card-sun-sational').setDepth(10));
    card.homeY = y;
    Juice.sfx('whoosh');
    await Juice.tween(s, { targets: card, y, duration: 650, ease: 'Bounce.easeOut' });
    if (!this.alive()) return;
    Juice.shake(s, 90, 0.003);
    Juice.burst(s, x, y + 150, 'fx-smoke', { speedX: { min: -180, max: 180 }, speedY: { min: -40, max: 0 }, lifespan: 700, scale: { start: 0.4, end: 1.3 }, alpha: { start: 0.35, end: 0 }, tint: 0xb0a6d8 }, 10, 9);
    await Juice.wait(s, 250);

    // 2. ANTICIPATE
    this.beat(1);
    const glow = Juice.glow(s, card.face, gold, 0);
    this.track(glow);
    const pull = this.emitter(x, y, 'fx-dot', {
      emitZone: { type: 'edge', source: new Phaser.Geom.Circle(0, 0, 300), quantity: 40 },
      moveToX: 0, moveToY: 0, lifespan: 650, frequency: 60, quantity: 1,
      scale: { start: 0.2, end: 0.7 }, alpha: { start: 0, end: 1 }, color: [0xfff1b8, gold], blendMode: 'ADD'
    }, 8);
    for (let i = 0; i < this.p.pulses; i++) {
      Juice.sfx('charge', i * 2);
      glow.set(2 + i * 2, 160);
      s.tweens.add({ targets: card, scale: 1.06, duration: 120, yoyo: true, ease: 'Quad.easeOut' });
      if (!Juice.reduced) s.tweens.add({ targets: cam, zoom: 1 + (i + 1) * 0.018, duration: 200, ease: 'Quad.easeOut' });
      pull.frequency = Math.max(14, 60 - i * 14);
      await Juice.wait(s, Math.max(220, 460 - i * 70));
      if (!this.alive()) return;
    }

    // 3. TENSION
    this.beat(2);
    const rays = this.track(Juice.rays(s, x, y, gold, 16, 5));
    s.tweens.add({ targets: rays, scale: 0.55, duration: 500, ease: 'Sine.easeOut' });
    pull.frequency = 8;
    glow.set(8, 400);
    Juice.sfx('charge', 10);
    if (!Juice.reduced) await Juice.tween(s, { targets: card, x: { from: x - 4, to: x + 4 }, duration: 32, yoyo: true, repeat: 7 });
    else await Juice.wait(s, 500);
    card.x = x;
    if (!this.alive()) return;

    // 4. RELEASE
    this.beat(3);
    pull.stop();
    Juice.sfx('boom');
    await Juice.hitStop(s, this.p.hitstop);
    if (!this.alive()) return;
    Juice.flash(s, 240, 0xffe7a0, 0.8);
    Juice.shake(s, 300, 0.01);
    s.tweens.add({ targets: cam, zoom: 1, duration: 320, ease: 'Back.easeOut' });
    Juice.shockwave(s, x, y, 0xffffff, 3.6, 650, 30);
    s.time.delayedCall(90, () => Juice.shockwave(s, x, y, gold, 4.6, 800, 30));
    Juice.burst(s, x, y, 'fx-star', {
      speed: { min: 200, max: 640 }, lifespan: { min: 700, max: 1300 }, scale: { start: 0.9, end: 0 },
      rotate: { min: 0, max: 360 }, color: [0xffffff, 0xffe680, gold, 0xff8a3d], blendMode: 'ADD', gravityY: 180
    }, 70, 31);
    Juice.burst(s, x, y, 'fx-spark', {
      speed: { min: 400, max: 900 }, lifespan: 500, scaleX: { start: 1, end: 0.2 }, scaleY: 0.6,
      rotate: { onUpdate: (pt) => Phaser.Math.RadToDeg(Math.atan2(pt.velocityY, pt.velocityX)) },
      color: [0xffffff, gold], blendMode: 'ADD'
    }, 40, 31);
    s.tweens.add({ targets: rays, scale: 1.25, duration: 600, ease: 'Back.easeOut' });

    // 5. REVEAL
    this.beat(4);
    await card.flip({ duration: 520, lift: 40 });
    if (!this.alive()) return;

    // 6. SHINE
    this.beat(5);
    Juice.sfx('sparkle');
    await Juice.shine(s, card.x, card.y, CardArt.W, CardArt.H, 600, 40, 18);
    if (!this.alive()) return;

    // 7. STAMP
    this.beat(6);
    const stamp = this.track(s.add.text(x, y + 158, 'LEGENDARY!', {
      fontFamily: '"Unbounded", "Trebuchet MS", sans-serif', fontSize: '46px', color: '#ffc94a', fontStyle: '900',
      stroke: '#2a1640', strokeThickness: 10
    }).setOrigin(0.5).setDepth(60).setScale(3).setAlpha(0).setAngle(-8));
    await Juice.tween(s, { targets: stamp, scale: 1, alpha: 1, angle: -4, duration: 220, ease: 'Cubic.easeIn' });
    if (!this.alive()) return;
    Juice.sfx('boom');
    Juice.shake(s, 120, 0.005);
    Juice.burst(s, x, y + 175, 'fx-smoke', { speedX: { min: -220, max: 220 }, speedY: { min: -30, max: 10 }, lifespan: 600, scale: { start: 0.3, end: 1 }, alpha: { start: 0.4, end: 0 }, tint: 0xffe7a0 }, 12, 59);
    Juice.pop(s, stamp, 0.12, 300);

    // 8. CELEBRATE
    this.beat(7);
    Juice.sfx('fanfare');
    glow.pulse(4, 9, 900);
    const n = Juice.amount(this.p.confetti);
    if (n > 0) {
      const confetti = {
        tint: [0xff5fa2, 0xffc94a, 0x4fe0c8, 0x7a8cff, 0xffffff], speed: { min: 420, max: 820 }, gravityY: 420, lifespan: 3200,
        rotate: { onEmit: (pt) => { pt.spinSpeed = Phaser.Math.FloatBetween(-8, 8); return Phaser.Math.Between(0, 360); }, onUpdate: (pt, key, t, v) => v + pt.spinSpeed },
        scaleX: { onEmit: (pt) => { pt.wobPhase = Math.random() * 6.28; return 1; }, onUpdate: (pt, key, t) => Math.cos(pt.wobPhase + t * 26) },
        alpha: { start: 1, end: 0, ease: 'Quint.easeIn' }
      };
      Juice.burst(s, 20, s.scale.height, 'fx-confetti', { ...confetti, angle: { min: -80, max: -50 } }, n, 70);
      Juice.burst(s, s.scale.width - 20, s.scale.height, 'fx-confetti', { ...confetti, angle: { min: -130, max: -100 } }, n, 70);
    }
    this.emitter(x, y, 'fx-star', {
      emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-130, -170, 260, 340) },
      frequency: 140, lifespan: 900, scale: { start: 0.01, end: 0.5, ease: 'Sine.easeOut' }, alpha: { start: 1, end: 0 },
      rotate: { min: 0, max: 90 }, blendMode: 'ADD'
    }, 41);
    await Juice.wait(s, 1200);
    if (!this.alive()) return;
    this.state = 'done';
    this.caption = this.label(x, s.scale.height - 66, 'click to replay', '#9b93c4', 14);
  }

  destroy() {
    this.state = 'dead';
    if (this.scene.cameras && this.scene.cameras.main) this.scene.cameras.main.setZoom(1);
    super.destroy();
  }
}
