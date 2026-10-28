/**
 * BadgeUnlock — an achievement toast that delivers its badge to a shelf.
 *
 * LESSONS:
 *  - Toasts slide in from an edge with Back.easeOut and leave the way they
 *    came. They must never block play, so keep them short and off-centre.
 *  - A medal "coin-spins" in: scaleX tweens 1 → 0 → 1 a few times, faster
 *    then slower, like a coin settling on a table.
 *  - Deliver the badge to its home (the shelf). Watching it land in the
 *    collection teaches players where to find it again.
 *  - Name the behaviour you are rewarding ("Asked 10 questions"). In
 *    learning games, praise effort and habits, not only scores.
 */
class BadgeUnlock extends BaseEffect {
  static id = 'badge';
  static title = 'Badge Unlock Toast';
  static group = 'rewards';
  static tags = ['learning', 'games'];
  static useFor = 'Achievements, learning habits (curiosity, kindness, persistence), course milestones.';
  static mode = 'tap';
  static hint = 'Click to unlock the next badge.';
  static file = 'js/effects/BadgeUnlock.js';
  static uses = ['js/fx/UIArt.js', 'js/fx/Juice.js'];
  static summary = 'A toast slides down, the medal coin-spins in, a shine sweeps the toast, then the badge flies into its slot on the shelf and the toast slides away.';
  static steps = [
    'Toast container slides from y −90 to 72 with Back.easeOut; a chime plays as it arrives.',
    'Medal: scaleX tweens 1 → 0 → 1 three times with growing durations (coin settling).',
    'Shine: Juice.shine sweeps a masked bar across the toast.',
    'After the hold, a copy of the medal flies on a bezier to its shelf slot and pops in with sparkles.',
    'The toast slides back up. Each new badge gets its own colour.'
  ];
  static params = [
    { key: 'hold', label: 'Hold (ms)', min: 600, max: 4000, step: 100, value: 1600 },
    { key: 'spins', label: 'Coin spins', min: 0, max: 5, step: 1, value: 3 }
  ];

  start() {
    const s = this.scene;
    this.next = 0;
    this.busy = false;
    // shelf
    this.slots = UIArt.BADGES.map((b, i) => {
      const x = this.cx + (i - 1) * 150;
      const y = s.scale.height - 120;
      this.track(s.add.graphics().fillStyle(0x19142e, 1).fillRoundedRect(x - 60, y - 70, 120, 140, 18).lineStyle(2, 0x2c2550, 1).strokeRoundedRect(x - 60, y - 70, 120, 140, 18));
      const ghost = this.track(s.add.image(x, y - 6, `ui-badge-${i}`).setScale(0.62).setAlpha(0.12));
      this.track(Juice.text(s, x, y + 58, b.name, 11, '#6f689a', { body: true, weight: '800' }));
      return { x, y: y - 6, ghost };
    });
    this.track(Juice.text(s, this.cx, s.scale.height - 214, 'YOUR BADGES', 13, '#9b93c4', { body: true, weight: '800' }));
  }

  autoPlay() { this.scene.time.delayedCall(250, () => this.play()); }

  async play() {
    if (this.busy) return;
    if (this.next >= UIArt.BADGES.length) { this.scene.restartEffect(true); return; }
    this.busy = true;
    const s = this.scene;
    const i = this.next++;
    const b = UIArt.BADGES[i];
    const W = 470;
    const H = 112;

    // 1. toast
    const toast = s.add.container(this.cx, -90).setDepth(100);
    const g = s.add.graphics();
    g.fillStyle(0x07050f, 0.6).fillRoundedRect(-W / 2, -H / 2 + 6, W, H, 22);
    g.fillStyle(0x241c48, 1).fillRoundedRect(-W / 2, -H / 2, W, H, 22);
    g.lineStyle(2, Phaser.Display.Color.HexStringToColor(b.color).color, 1).strokeRoundedRect(-W / 2, -H / 2, W, H, 22);
    const medal = s.add.image(-W / 2 + 64, 4, `ui-badge-${i}`).setScale(0.6);
    const eyebrow = Juice.text(s, -W / 2 + 128, -26, 'ACHIEVEMENT UNLOCKED', 12, b.color, { body: true, weight: '800', ox: 0 });
    const name = Juice.text(s, -W / 2 + 128, 2, b.name, 22, '#ece8ff', { ox: 0 });
    const desc = Juice.text(s, -W / 2 + 128, 30, b.desc, 14, '#9b93c4', { body: true, ox: 0 });
    toast.add([g, medal, eyebrow, name, desc]);
    Juice.sfx('whoosh');
    await Juice.tween(s, { targets: toast, y: 72, duration: 420, ease: 'Back.easeOut' });
    if (!s.sys.isActive()) return;
    Juice.sfx('chime');

    // 2. coin spin, slowing down
    for (let k = 0; k < this.p.spins; k++) {
      const d = 60 + k * 40;
      await Juice.tween(s, { targets: medal, scaleX: 0, duration: d, ease: 'Sine.easeIn' });
      await Juice.tween(s, { targets: medal, scaleX: 0.6, duration: d, ease: 'Sine.easeOut' });
    }
    Juice.pop(s, medal, 0.15, 300);
    Juice.burst(s, toast.x - W / 2 + 64, toast.y + 4, 'fx-star', { speed: { min: 60, max: 200 }, lifespan: 600, scale: { start: 0.5, end: 0 }, color: [0xffffff, 0xffd86b], blendMode: 'ADD' }, 16, 101);

    // 3. shine
    Juice.shine(s, toast.x, toast.y, W, H, 600, 102, 22);
    await Juice.wait(s, this.p.hold);
    if (!s.sys.isActive()) return;

    // 4. deliver to the shelf
    const slot = this.slots[i];
    const fly = s.add.image(toast.x - W / 2 + 64, toast.y + 4, `ui-badge-${i}`).setScale(0.6).setDepth(110);
    medal.setVisible(false);
    s.tweens.add({ targets: toast, y: -100, duration: 320, ease: 'Cubic.easeIn', onComplete: () => toast.destroy() });
    const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(fly.x, fly.y), new Phaser.Math.Vector2(fly.x - 160, slot.y - 260), new Phaser.Math.Vector2(slot.x, slot.y));
    const o = { t: 0 };
    Juice.sfx('whoosh');
    await Juice.tween(s, { targets: o, t: 1, duration: 650, ease: 'Sine.easeInOut', onUpdate: () => { const p = curve.getPoint(o.t); fly.setPosition(p.x, p.y).setAngle(Math.sin(o.t * Math.PI) * -20); } });
    if (!s.sys.isActive()) return;
    this.track(fly);
    fly.setAngle(0);
    slot.ghost.setVisible(false);
    Juice.pop(s, fly, 0.2, 320);
    Juice.shockwave(s, slot.x, slot.y, Phaser.Display.Color.HexStringToColor(b.color).color, 1.2, 420, 109);
    Juice.burst(s, slot.x, slot.y, 'fx-star', { speed: { min: 60, max: 180 }, lifespan: 600, scale: { start: 0.5, end: 0 }, color: [0xffffff, 0xffd86b], blendMode: 'ADD' }, 14, 111);
    Juice.sfx('pop');
    this.busy = false;
  }
}
