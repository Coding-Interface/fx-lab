/**
 * Spotlight — a torch beam in a dark room, for search-and-find moments.
 *
 * LESSONS:
 *  - Darkness is a RenderTexture laid over the scene. Each frame: clear it,
 *    fill it dark, then ERASE a soft glow texture where the light is. The
 *    soft edge comes free from the radial gradient texture.
 *  - Things you have found move ABOVE the darkness layer and keep a little
 *    glow, so progress stays visible.
 *  - Smooth the beam with a lerp, so it sweeps like a real torch.
 *  - Limited vision creates curiosity. Use it for "find the hidden word",
 *    escape rooms, spooky story beats, or revealing a diagram step by step.
 */
class Spotlight extends BaseEffect {
  static id = 'spotlight';
  static title = 'Spotlight Search';
  static group = 'story';
  static tags = ['stories', 'learning', 'games'];
  static useFor = 'Hidden-object and "find it" activities, escape rooms, spooky scenes, guided reveals of a diagram.';
  static mode = 'continuous';
  static hint = 'Move the pointer to shine the torch. Click for a flash of light.';
  static file = 'js/effects/Spotlight.js';
  static uses = ['js/fx/Juice.js'];
  static summary = 'A RenderTexture of darkness with a soft hole erased at the torch every frame. Items light up and stay visible once the beam finds them.';
  static steps = [
    'Scene: an attic drawn with Graphics, with five items hidden around it.',
    'Darkness: rt.clear() → rt.fill(dark, alpha) → rt.erase(glowBrush, x, y) every frame.',
    'The beam lerps toward the pointer; after 2 s idle, an autopilot sweeps the room.',
    'Found: when the beam centre comes within reach, the item moves above the darkness, pops, sparkles and chimes.',
    'Click: the brush scales up for a moment, a "flash" that reveals more.',
    'A counter tracks progress (Found 3 / 5) and the last find gets a celebration.'
  ];
  static params = [
    { key: 'radius', label: 'Beam radius', min: 60, max: 260, step: 5, value: 130 },
    { key: 'dark', label: 'Darkness', min: 0.5, max: 1, step: 0.01, value: 0.94 }
  ];

  static ITEMS = [
    { tex: 'ui-star', x: 150, y: 170, s: 0.42, name: 'star' },
    { tex: 'fx-coin', x: 790, y: 440, s: 1, name: 'coin' },
    { tex: 'ui-badge-1', x: 440, y: 120, s: 0.38, name: 'medal' },
    { tex: 'fx-heart', x: 640, y: 210, s: 1.4, name: 'heart', tint: 0xff5fa2 },
    { tex: 'ui-badge-0', x: 300, y: 450, s: 0.38, name: 'badge' }
  ];

  start() {
    const s = this.scene;
    // the room
    const g = this.track(s.add.graphics().setDepth(1));
    g.fillStyle(0x4a3424, 1).fillRect(0, 0, 960, 600);
    for (let x = 0; x < 960; x += 80) g.fillStyle(x % 160 ? 0x553b28 : 0x4f3626, 1).fillRect(x, 0, 80, 600);
    g.fillStyle(0x6e4a2e, 1).fillRect(60, 210, 260, 14).fillRect(560, 250, 300, 14).fillRect(380, 160, 140, 12);
    g.fillStyle(0x8a6a4a, 1).fillRect(80, 470, 140, 90).fillRect(700, 470, 160, 100).fillRect(250, 500, 120, 70);
    g.lineStyle(3, 0x5a3d26, 1).strokeRect(80, 470, 140, 90).strokeRect(700, 470, 160, 100).strokeRect(250, 500, 120, 70);
    g.fillStyle(0x9fc4ff, 0.25).fillRect(420, 30, 120, 90);
    g.lineStyle(6, 0x3a2414, 1).strokeRect(420, 30, 120, 90).lineBetween(480, 30, 480, 120).lineBetween(420, 75, 540, 75);

    this.items = Spotlight.ITEMS.map((it) => {
      const img = this.track(s.add.image(it.x, it.y, it.tex).setScale(it.s).setDepth(2));
      if (it.tint) img.setTint(it.tint);
      return { ...it, img, found: false };
    });

    this.rt = this.track(s.add.renderTexture(0, 0, 960, 600).setOrigin(0, 0).setDepth(10));
    this.brush = this.track(s.make.image({ key: 'fx-glow' }, false));
    this.flare = 1;
    this.head = new Phaser.Math.Vector2(this.cx, this.cy);
    this.target = new Phaser.Math.Vector2(this.cx, this.cy);
    this.lastInput = -99999;
    this.found = 0;
    this.counter = this.track(Juice.text(s, this.cx, 36, `Found 0 / ${this.items.length}`, 20, '#ffc94a').setDepth(30));
  }

  autoPlay() {}

  pointerMove(p) { this.target.set(p.x, p.y); this.lastInput = this.scene.time.now; }

  play(x, y) {
    this.target.set(x, y);
    this.lastInput = this.scene.time.now;
    const o = { f: 2.2 };
    this.flare = 2.2;
    this.scene.tweens.add({ targets: o, f: 1, duration: 700, ease: 'Cubic.easeOut', onUpdate: () => { this.flare = o.f; } });
    Juice.sfx('whoosh');
  }

  find(it) {
    const s = this.scene;
    it.found = true;
    it.img.setDepth(20);
    const glow = this.track(s.add.image(it.x, it.y, 'fx-glow').setTint(0xffe7a0).setBlendMode(Phaser.BlendModes.ADD).setScale(0.7).setAlpha(0.5).setDepth(19));
    s.tweens.add({ targets: glow, alpha: 0.25, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    Juice.pop(s, it.img, 0.3, 360);
    Juice.burst(s, it.x, it.y, 'fx-star', { speed: { min: 60, max: 200 }, lifespan: 600, scale: { start: 0.5, end: 0 }, color: [0xffffff, 0xffd86b], blendMode: 'ADD' }, 14, 21);
    Juice.floatText(s, it.x, it.y - 40, `a ${it.name}!`, '#ffffff', 20);
    this.found += 1;
    this.counter.setText(`Found ${this.found} / ${this.items.length}`);
    Juice.pop(s, this.counter, 0.15, 280);
    Juice.sfx('chime');
    if (this.found === this.items.length) {
      Juice.sfx('fanfare');
      this.darkness = this.p.dark;
      s.tweens.add({ targets: this, darkness: 0.25, duration: 1200 });
      this.counter.setText('You found everything!');
    }
  }

  update(time, delta) {
    if (time - this.lastInput > 2000) {
      const t = time / 1000;
      this.target.set(this.cx + Math.sin(t * 0.7) * 380, this.cy + Math.sin(t * 1.3) * 200);
    }
    const k = 1 - Math.pow(0.85, (delta * Juice.timeScale) / 16.67);
    this.head.x += (this.target.x - this.head.x) * k;
    this.head.y += (this.target.y - this.head.y) * k;

    const dark = this.darkness != null ? this.darkness : this.p.dark;
    const r = this.p.radius * this.flare;
    this.brush.setScale((r * 2) / 128);
    this.rt.clear();
    this.rt.fill(0x05030c, dark);
    this.rt.erase(this.brush, this.head.x, this.head.y);
    this.rt.erase(this.brush, this.head.x, this.head.y); // twice = brighter core

    this.items.forEach((it) => {
      if (!it.found && Phaser.Math.Distance.Between(it.x, it.y, this.head.x, this.head.y) < r * 0.45) this.find(it);
    });
  }
}
