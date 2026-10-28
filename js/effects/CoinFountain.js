/**
 * CoinFountain — coins burst out, hang for a beat, then fly into the wallet.
 *
 * LESSONS:
 *  - Rewards should TRAVEL to where they are counted. Seeing coins land in
 *    the counter teaches the player where their reward went.
 *  - Particles cannot follow a curve, so coins are pooled images and each one
 *    flies along its own QuadraticBezier (tween a number 0 → 1, sample the curve).
 *  - Stagger arrivals and tick the counter per coin, with a small pop each
 *    time. Rapid little rewards feel better than one big jump.
 */
class CoinFountain extends BaseEffect {
  static id = 'coins';
  static title = 'Coin Fountain';
  static group = 'rewards';
  static tags = ['games', 'learning'];
  static useFor = 'Any reward that is counted: coins, gems, points, stars earned in a lesson.';
  static mode = 'tap';
  static hint = 'Click anywhere to spill coins';
  static file = 'js/effects/CoinFountain.js';
  static uses = ['js/fx/Juice.js'];
  static summary = 'Coins pop out with a fake-physics arc, spin, then fly along bezier curves into the counter, which ticks up with a pop for each coin.';
  static steps = [
    'Burst: each coin gets a random angle and speed; a Quad.easeOut rise then Bounce.easeOut fall fakes gravity.',
    'Spin: scaleX yoyos between 1 and 0.15, so the coin looks like it is turning.',
    'Fly: after a short hang, a bezier curve with a random control point carries the coin to the counter.',
    'Arrive: counter number +1, counter icon pops, a few sparkles.',
    'Coins come from a pool (group.get / killAndHide), so nothing is created or destroyed in the loop.'
  ];
  static params = [
    { key: 'coins', label: 'Coins', min: 3, max: 40, step: 1, value: 16 },
    { key: 'spread', label: 'Spread', min: 40, max: 300, step: 5, value: 160 },
    { key: 'fly', label: 'Fly time (ms)', min: 250, max: 1500, step: 25, value: 650 }
  ];

  start() {
    const s = this.scene;
    this.total = 0;
    this.pool = this.track(s.add.group({ classType: Phaser.GameObjects.Image, defaultKey: 'fx-coin', maxSize: 80 }));
    this.hud = this.track(s.add.container(s.scale.width - 120, 46).setDepth(100));
    const bg = s.add.rectangle(0, 0, 170, 52, 0x19142e, 0.92).setStrokeStyle(2, 0xffc94a, 0.6);
    this.icon = s.add.image(-56, 0, 'fx-coin').setScale(0.8);
    this.count = s.add.text(-28, 0, '0', { fontFamily: '"Unbounded", "Trebuchet MS", sans-serif', fontSize: '26px', color: '#ffc94a', fontStyle: '700' }).setOrigin(0, 0.5);
    this.hud.add([bg, this.icon, this.count]);
    this.chestY = s.scale.height - 110;
    this.chest = this.track(s.add.graphics().setDepth(10));
    this.drawChest(this.cx, this.chestY);
  }

  drawChest(x, y) {
    const g = this.chest;
    g.clear();
    g.fillStyle(0x7a4a22, 1).fillRoundedRect(x - 70, y - 10, 140, 70, 10);
    g.fillStyle(0x5a3416, 1).fillRoundedRect(x - 76, y - 34, 152, 30, 10);
    g.fillStyle(0xffc94a, 1).fillRect(x - 76, y - 8, 152, 6).fillRoundedRect(x - 12, y - 16, 24, 28, 5);
  }

  autoPlay() { this.play(this.cx, this.chestY - 30); }

  play(x, y) {
    const s = this.scene;
    const n = Juice.amount(this.p.coins);
    Juice.sfx('pop');
    Juice.burst(s, x, y, 'fx-star', { speed: { min: 60, max: 180 }, lifespan: 500, scale: { start: 0.6, end: 0 }, color: [0xffffff, 0xffd23f], blendMode: 'ADD' }, 14, 40);
    for (let i = 0; i < n; i++) this.spawn(x, y, i);
  }

  spawn(x, y, i) {
    const s = this.scene;
    const coin = this.pool.get(x, y);
    if (!coin) return;
    coin.setActive(true).setVisible(true).setDepth(50).setScale(0.9).setAlpha(1).setAngle(0);

    // 1. burst arc: up then down (two tweens = fake gravity)
    const dx = Phaser.Math.Between(-this.p.spread, this.p.spread);
    const peak = y - Phaser.Math.Between(90, 220);
    const land = y + Phaser.Math.Between(-30, 50);
    s.tweens.add({ targets: coin, x: x + dx, duration: 620, ease: 'Linear' });
    s.tweens.chain({
      targets: coin,
      tweens: [
        { y: peak, duration: 260, ease: 'Quad.easeOut' },
        { y: land, duration: 360, ease: 'Bounce.easeOut' }
      ]
    });
    // spin
    s.tweens.add({ targets: coin, scaleX: 0.15, duration: Phaser.Math.Between(110, 170), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // 2. after a hang, fly along a bezier to the counter
    s.time.delayedCall(760 + i * 45, () => {
      if (!coin.active) return;
      const start = new Phaser.Math.Vector2(coin.x, coin.y);
      const end = new Phaser.Math.Vector2(this.hud.x - 56, this.hud.y);
      const ctrl = new Phaser.Math.Vector2(Phaser.Math.Between(start.x - 200, start.x + 200), Math.min(start.y, end.y) - Phaser.Math.Between(40, 220));
      const curve = new Phaser.Curves.QuadraticBezier(start, ctrl, end);
      const prog = { t: 0 };
      s.tweens.add({
        targets: prog, t: 1, duration: this.p.fly, ease: 'Cubic.easeIn',
        onUpdate: () => {
          const pt = curve.getPoint(prog.t);
          coin.setPosition(pt.x, pt.y);
          coin.scaleY = 0.9 - prog.t * 0.35;
        },
        onComplete: () => this.arrive(coin)
      });
    });
  }

  arrive(coin) {
    const s = this.scene;
    s.tweens.killTweensOf(coin);
    this.pool.killAndHide(coin);
    this.total += 1;
    this.count.setText(String(this.total));
    s.tweens.killTweensOf(this.icon);
    this.icon.setScale(0.8);
    s.tweens.add({ targets: this.icon, scale: 1.15, duration: 70, yoyo: true, ease: 'Quad.easeOut' });
    Juice.sfx('coin');
    Juice.burst(s, this.hud.x - 56, this.hud.y, 'fx-star', { speed: { min: 30, max: 120 }, lifespan: 380, scale: { start: 0.45, end: 0 }, color: [0xffffff, 0xffd23f], blendMode: 'ADD' }, 4, 120);
  }
}
