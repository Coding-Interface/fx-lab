/**
 * SceneTransitions — six ways to move between two scenes.
 *
 * LESSONS:
 *  - Every transition has a COVER half and a REVEAL half. Swap the scene
 *    content at the exact moment it is hidden (the midpoint).
 *  - Ease in on the cover (Cubic.easeIn: it accelerates away) and out on the
 *    reveal (Cubic.easeOut: it settles), so the midpoint is the fastest part.
 *  - Match the transition to the story beat: fade = time passes, iris = focus
 *    on someone, push = moving through space, blinds/wipe = playful chapter
 *    breaks, zoom = diving in.
 *  - The iris closes on the click point. In a real game, close it on the
 *    character the next scene is about.
 */
class SceneTransitions extends BaseEffect {
  static id = 'transitions';
  static title = 'Scene Transitions';
  static group = 'story';
  static tags = ['stories', 'games', 'learning'];
  static useFor = 'Changing scenes, levels or slides; moving between lesson steps; story time skips.';
  static mode = 'tap';
  static hint = 'Click to transition. With "Cycle" on, each click uses the next style.';
  static file = 'js/effects/SceneTransitions.js';
  static uses = ['js/fx/Juice.js'];
  static summary = 'Fade, iris, diagonal wipe, blinds, push and zoom between two hand-drawn scenes. Each has a cover half and a reveal half, with the swap hidden at the midpoint.';
  static steps = [
    'Fade: a black rectangle fades to 1, the scenes swap, it fades back to 0.',
    'Iris: a GeometryMask circle shrinks to the click point (cover), the scenes swap, it grows on the new scene (reveal).',
    'Wipe: a rotated black band sweeps across; the scenes swap while the band covers the screen.',
    'Blinds: 10 bars grow (scaleY) one after another, then shrink in the same order.',
    'Push: the new scene slides in from the right while the old one slides out to the left, with Cubic.easeInOut.',
    'Zoom: the old scene scales up and fades to white, and the new scene settles from 1.15 to 1.'
  ];
  static params = [
    { key: 'type', label: 'Style (0 fade · 1 iris · 2 wipe · 3 blinds · 4 push · 5 zoom)', min: 0, max: 5, step: 1, value: 1 },
    { key: 'cycle', label: 'Cycle styles (0/1)', min: 0, max: 1, step: 1, value: 1 },
    { key: 'duration', label: 'Duration (ms)', min: 300, max: 2400, step: 50, value: 900 }
  ];

  static NAMES = ['Fade', 'Iris', 'Wipe', 'Blinds', 'Push', 'Zoom'];

  start() {
    const s = this.scene;
    this.track(s.add.rectangle(480, 300, 960, 600, 0x000000).setDepth(0));
    this.scenes = [this.meadow(), this.castle()];
    this.scenes[1].setVisible(false);
    this.cur = 0;
    this.type = this.p.type;
    this.tag = this.track(s.add.container(18, 18).setDepth(200));
    const bg = s.add.graphics().fillStyle(0x0f0b1e, 0.85).fillRoundedRect(0, 0, 210, 40, 20);
    this.tagText = Juice.text(s, 105, 20, '', 15, '#ffc94a', { body: true, weight: '800' });
    this.tag.add([bg, this.tagText]);
    this.updateTag();
  }

  updateTag() { this.tagText.setText(`Next: ${SceneTransitions.NAMES[this.type]}`); }

  meadow() {
    const s = this.scene;
    const c = this.track(s.add.container(0, 0).setDepth(1));
    const g = s.add.graphics();
    g.fillStyle(0x8fd3ff, 1).fillRect(0, 0, 960, 600);
    g.fillStyle(0xfff1a6, 1).fillCircle(170, 120, 56);
    g.fillStyle(0xffffff, 0.9).fillEllipse(620, 110, 170, 52).fillEllipse(680, 92, 120, 52).fillEllipse(360, 170, 130, 40);
    g.fillStyle(0x7fd36b, 1).fillEllipse(240, 600, 900, 360);
    g.fillStyle(0x5fbf55, 1).fillEllipse(760, 620, 900, 380);
    g.fillStyle(0x7a4a22, 1).fillRect(700, 300, 22, 120);
    g.fillStyle(0x3fa64b, 1).fillCircle(711, 290, 64).fillCircle(670, 320, 44).fillCircle(752, 320, 44);
    [[160, 470], [260, 500], [420, 480], [560, 520]].forEach(([x, y]) => g.fillStyle(0xff8ac2, 1).fillCircle(x, y, 8).fillStyle(0xffe066, 1).fillCircle(x, y, 3.5));
    const fox = s.add.image(380, 470, 'ui-fox').setOrigin(0.5, 1).setScale(0.8);
    const t = Juice.text(s, 480, 560, 'Sunny Meadow', 26, '#1f4a2a');
    c.add([g, fox, t]);
    return c;
  }

  castle() {
    const s = this.scene;
    const c = this.track(s.add.container(0, 0).setDepth(1));
    const g = s.add.graphics();
    g.fillStyle(0x141a3e, 1).fillRect(0, 0, 960, 600);
    for (let i = 0; i < 60; i++) g.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.3, 0.9)).fillCircle(Phaser.Math.Between(0, 960), Phaser.Math.Between(0, 330), Phaser.Math.FloatBetween(0.8, 2));
    g.fillStyle(0xf6f1d8, 1).fillCircle(780, 110, 44).fillStyle(0x141a3e, 1).fillCircle(798, 98, 40);
    g.fillStyle(0x0b0f26, 1).fillEllipse(480, 620, 1200, 300);
    g.fillStyle(0x23254d, 1);
    g.fillRect(340, 250, 280, 230).fillRect(300, 190, 70, 290).fillRect(590, 190, 70, 290).fillRect(450, 150, 60, 120);
    [300, 590].forEach((x) => g.fillTriangle(x - 8, 190, x + 78, 190, x + 35, 120));
    g.fillTriangle(442, 150, 518, 150, 480, 80);
    for (let i = 0; i < 7; i++) g.fillRect(340 + i * 40, 236, 22, 16);
    g.fillStyle(0xffd86b, 1);
    [[320, 260], [620, 260], [470, 190], [400, 330], [540, 330]].forEach(([x, y]) => g.fillRoundedRect(x, y, 18, 28, 8));
    g.fillStyle(0x0b0f26, 1).fillRoundedRect(450, 390, 60, 90, { tl: 30, tr: 30, bl: 0, br: 0 });
    const owl = s.add.image(220, 500, 'ui-owl').setOrigin(0.5, 1).setScale(0.8);
    const t = Juice.text(s, 480, 560, 'Moonlit Castle', 26, '#c9c2ef');
    c.add([g, owl, t]);
    return c;
  }

  autoPlay() { this.scene.time.delayedCall(400, () => this.play(380, 400)); }

  async play(x, y) {
    if (this.busy) return;
    this.busy = true;
    const from = this.scenes[this.cur];
    const to = this.scenes[1 - this.cur];
    const d = this.p.duration / 2;
    const fn = ['fade', 'iris', 'wipe', 'blinds', 'push', 'zoom'][this.type];
    Juice.sfx('whoosh');
    await this[fn](from, to, d, x, y);
    if (!this.scene.sys.isActive()) return;
    this.cur = 1 - this.cur;
    if (this.p.cycle) this.type = (this.type + 1) % 6;
    this.updateTag();
    this.busy = false;
  }

  swap(from, to) { from.setVisible(false); to.setVisible(true); }

  async fade(from, to, d) {
    const s = this.scene;
    const r = s.add.rectangle(480, 300, 960, 600, 0x000000, 1).setAlpha(0).setDepth(100);
    await Juice.tween(s, { targets: r, alpha: 1, duration: d, ease: 'Sine.easeIn' });
    this.swap(from, to);
    await Juice.wait(s, 80); // a short hold on black reads as "time passed"
    await Juice.tween(s, { targets: r, alpha: 0, duration: d, ease: 'Sine.easeOut' });
    r.destroy();
  }

  async iris(from, to, d, x, y) {
    const s = this.scene;
    const shape = s.make.graphics({}, false);
    const mask = shape.createGeometryMask();
    const o = { r: 640 };
    const draw = () => shape.clear().fillStyle(0xffffff).fillCircle(x, y, Math.max(0.1, o.r));
    draw();
    from.setMask(mask);
    await Juice.tween(s, { targets: o, r: 0, duration: d, ease: 'Cubic.easeIn', onUpdate: draw });
    from.clearMask();
    this.swap(from, to);
    to.setMask(mask);
    await Juice.wait(s, 120);
    await Juice.tween(s, { targets: o, r: 1150, duration: d, ease: 'Cubic.easeOut', onUpdate: draw });
    to.clearMask();
    shape.destroy();
  }

  async wipe(from, to, d) {
    const s = this.scene;
    const band = s.add.rectangle(-900, 300, 1300, 1600, 0x000000).setAngle(20).setDepth(100);
    await Juice.tween(s, { targets: band, x: 480, duration: d, ease: 'Cubic.easeIn' });
    this.swap(from, to);
    await Juice.tween(s, { targets: band, x: 1860, duration: d, ease: 'Cubic.easeOut' });
    band.destroy();
  }

  async blinds(from, to, d) {
    const s = this.scene;
    const n = 10;
    const h = 600 / n;
    const bars = Array.from({ length: n }, (_, i) => s.add.rectangle(480, h * i + h / 2, 960, h + 1, 0x000000).setScale(1, 0).setDepth(100));
    const st = (d * 0.5) / n;
    bars.forEach((b, i) => s.tweens.add({ targets: b, scaleY: 1, delay: i * st, duration: d * 0.5, ease: 'Cubic.easeIn' }));
    await Juice.wait(s, d + 20);
    this.swap(from, to);
    bars.forEach((b, i) => s.tweens.add({ targets: b, scaleY: 0, delay: i * st, duration: d * 0.5, ease: 'Cubic.easeOut' }));
    await Juice.wait(s, d + 20);
    bars.forEach((b) => b.destroy());
  }

  async push(from, to, d) {
    const s = this.scene;
    to.setVisible(true).setX(960);
    s.tweens.add({ targets: from, x: -960, duration: d * 2, ease: 'Cubic.easeInOut' });
    await Juice.tween(s, { targets: to, x: 0, duration: d * 2, ease: 'Cubic.easeInOut' });
    from.setVisible(false).setX(0);
  }

  async zoom(from, to, d) {
    const s = this.scene;
    const white = s.add.rectangle(480, 300, 960, 600, 0xffffff).setAlpha(0).setDepth(100);
    // scale around the centre: containers scale from (0,0), so move while scaling
    const z = Juice.reduced ? 1.08 : 1.35;
    s.tweens.add({ targets: from, scale: z, x: -480 * (z - 1), y: -300 * (z - 1), duration: d, ease: 'Cubic.easeIn' });
    await Juice.tween(s, { targets: white, alpha: 0.9, duration: d, ease: 'Cubic.easeIn' });
    this.swap(from, to);
    from.setScale(1).setPosition(0, 0);
    to.setScale(1.15).setPosition(-480 * 0.15, -300 * 0.15);
    s.tweens.add({ targets: to, scale: 1, x: 0, y: 0, duration: d, ease: 'Cubic.easeOut' });
    await Juice.tween(s, { targets: white, alpha: 0, duration: d, ease: 'Cubic.easeOut' });
    white.destroy();
  }
}
