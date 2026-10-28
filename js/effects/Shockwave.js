/**
 * Shockwave — a heavy impact. This is where timing matters most.
 *
 * The order (each beat is only a few frames):
 *   1. hit-stop   freeze the world for ~70 ms, so the brain registers the hit
 *   2. flash      one bright frame
 *   3. squash     the target squashes, then springs back
 *   4. rings      2–3 expanding rings, staggered
 *   5. debris     shards fly out and fall; dust puffs linger
 *   6. shake      short and sharp, it decays on its own
 *   7. cracks     ground cracks fade out slowly (the "memory" of the hit)
 */
class Shockwave extends BaseEffect {
  static id = 'shockwave';
  static title = 'Impact Shockwave';
  static group = 'action';
  static tags = ['games'];
  static useFor = 'Boss hits, ground slams, explosions, a heavy object landing.';
  static mode = 'tap';
  static hint = 'Click anywhere to slam';
  static file = 'js/effects/Shockwave.js';
  static uses = ['js/fx/Juice.js'];
  static summary = 'Hit-stop, flash, squash, rings, debris, dust, shake and cracks, in that order. Try hit-stop at 0 and then at 90 to feel the difference.';
  static steps = [
    'await Juice.hitStop(): time and tweens freeze for a few frames before anything spawns.',
    'Flash + horizontal flare streak, both ADD and very short.',
    'The crystal squashes (scaleY down, scaleX up) and springs back with Back.easeOut.',
    'Three shockwave rings 60 ms apart; the first is the brightest.',
    'Shards: gravity, random spin, fade at the end. Dust: NORMAL blend, slow and wide.',
    'Camera shake ~200 ms, and crack lines drawn with Graphics fade over 1.2 s.'
  ];
  static params = [
    { key: 'power', label: 'Power', min: 0.3, max: 2, step: 0.05, value: 1 },
    { key: 'hitstop', label: 'Hit-stop (ms)', min: 0, max: 200, step: 5, value: 70 },
    { key: 'shake', label: 'Shake', min: 0, max: 0.03, step: 0.001, value: 0.01 }
  ];

  start() {
    const s = this.scene;
    this.ground = this.track(s.add.rectangle(this.cx, s.scale.height - 60, s.scale.width, 120, 0x120d26).setDepth(1));
    this.crystal = this.track(s.add.image(this.cx, s.scale.height - 120, 'fx-shard').setScale(3.4).setTint(0x4fe0c8).setOrigin(0.5, 1).setDepth(5));
    this.crystalGlow = this.track(s.add.image(this.cx, s.scale.height - 165, 'fx-glow').setScale(1.1).setTint(0x4fe0c8).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.35).setDepth(4));
    this.busy = false;
  }

  autoPlay() { this.play(this.cx, this.scene.scale.height - 140); }

  async play(x, y) {
    const s = this.scene;
    const k = this.p.power;
    Juice.sfx('boom');

    // 1. hit-stop: freeze BEFORE the impact visuals appear
    await Juice.hitStop(s, this.p.hitstop);
    if (!s.sys.isActive()) return;

    // 2. flash + flare
    Juice.flash(s, 90, 0xffffff, 0.5 * Math.min(1, k));
    const flare = s.add.image(x, y, 'fx-flare').setBlendMode(Phaser.BlendModes.ADD).setScale(0.3 * k, 1).setDepth(60).setTint(0xbff8ff);
    s.tweens.add({ targets: flare, scaleX: 2.6 * k, alpha: 0, duration: 260, ease: 'Cubic.easeOut', onComplete: () => flare.destroy() });

    // 3. squash the crystal (if the hit was near it)
    if (Math.abs(x - this.crystal.x) < 260) {
      s.tweens.killTweensOf(this.crystal);
      this.crystal.setScale(3.4);
      s.tweens.chain({
        targets: this.crystal,
        tweens: [
          { scaleX: 3.4 * (1 + 0.35 * k), scaleY: 3.4 * (1 - 0.3 * k), duration: 60, ease: 'Quad.easeOut' },
          { scaleX: 3.4, scaleY: 3.4, duration: 420, ease: 'Back.easeOut' }
        ]
      });
      s.tweens.add({ targets: this.crystalGlow, alpha: { from: 1, to: 0.35 }, duration: 600 });
    }

    // 4. rings, staggered
    [0, 60, 130].forEach((d, i) => s.time.delayedCall(d, () => Juice.shockwave(s, x, y, i === 0 ? 0xffffff : 0x4fe0c8, (3.6 - i * 0.8) * k, 520 + i * 90, 55)));

    // 5. debris + dust
    Juice.burst(s, x, y, 'fx-shard', {
      speed: { min: 220 * k, max: 620 * k }, angle: { min: -170, max: -10 }, gravityY: 1300,
      lifespan: { min: 700, max: 1200 },
      // spin: onEmit picks a start angle and a spin speed, onUpdate keeps adding it
      rotate: {
        onEmit: (pt) => { pt.spinSpeed = Phaser.Math.FloatBetween(-14, 14); return Phaser.Math.Between(0, 360); },
        onUpdate: (pt, key, t, v) => v + pt.spinSpeed
      },
      scale: { min: 0.3, max: 0.8 }, tint: [0x4fe0c8, 0x9be8ff, 0x2a8f84],
      alpha: { start: 1, end: 0, ease: 'Quint.easeIn' }
    }, Math.round(26 * k), 50);
    Juice.burst(s, x, y + 10, 'fx-smoke', {
      speedX: { min: -260 * k, max: 260 * k }, speedY: { min: -60, max: 0 },
      lifespan: { min: 900, max: 1500 }, scale: { start: 0.6, end: 2.2 * k },
      alpha: { start: 0.45, end: 0 }, tint: 0x8a80b0, rotate: { min: 0, max: 360 }
    }, 14, 45);

    // 6. shake (decays by itself)
    if (this.p.shake > 0) Juice.shake(s, 220, this.p.shake * k);

    // 7. cracks
    this.cracks(x, y, k);
  }

  cracks(x, y, k) {
    const s = this.scene;
    const g = s.add.graphics().setDepth(2);
    g.lineStyle(3, 0x4fe0c8, 0.9);
    for (let i = 0; i < 7; i++) {
      const a = Phaser.Math.FloatBetween(Math.PI * 0.05, Math.PI * 0.95) * (Math.random() < 0.5 ? 1 : -1);
      let px = x;
      let py = y;
      g.beginPath();
      g.moveTo(px, py);
      for (let j = 0; j < 4; j++) {
        const len = Phaser.Math.Between(18, 46) * k;
        const aa = a + Phaser.Math.FloatBetween(-0.5, 0.5);
        px += Math.cos(aa) * len;
        py += Math.sin(aa) * len * 0.35;
        g.lineTo(px, py);
      }
      g.strokePath();
    }
    s.tweens.add({ targets: g, alpha: 0, delay: 400, duration: 1200, onComplete: () => g.destroy() });
  }
}
