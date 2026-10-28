/**
 * ChapterTitle — a cinematic title card between story chapters.
 *
 * LESSONS:
 *  - Letterbox bars are the cheapest way to say "this is a cinematic moment".
 *    They also tell the player that input is paused.
 *  - Stagger the letters (each one 40–60 ms after the last) with Back.easeOut,
 *    so the title "arrives" rather than appears.
 *  - Give it a beginning, middle and end: build in, HOLD long enough to read
 *    comfortably (about 1 s per 3 words), then clear out in a different way
 *    than it came in.
 */
class ChapterTitle extends BaseEffect {
  static id = 'chapter';
  static title = 'Chapter Title Card';
  static group = 'story';
  static tags = ['stories', 'learning', 'games'];
  static useFor = 'Chapter or level intros, module titles in a course, boss names, day/episode cards.';
  static mode = 'auto';
  static hint = 'Click to replay.';
  static file = 'js/effects/ChapterTitle.js';
  static uses = ['js/fx/Juice.js'];
  static summary = 'Letterbox bars slide in, a chapter label fades up, the title letters drop in one by one, an underline draws from the centre, then everything lifts away.';
  static steps = [
    'Bars: two black rectangles slide in from top and bottom (Cubic.easeOut) while the scene dims.',
    '"CHAPTER 2" fades in with letter-spacing that tightens as it appears.',
    'Title: each letter is its own Text; they drop from −40 px with a little rotation, 50 ms apart.',
    'Underline: a Graphics line grows from the centre outward; the subtitle fades in below.',
    'Hold, then the letters float up and fade in reverse order, and the bars slide away.',
    'Dust motes drift the whole time, so the frame is never completely still.'
  ];
  static params = [
    { key: 'stagger', label: 'Letter stagger (ms)', min: 10, max: 150, step: 5, value: 50 },
    { key: 'hold', label: 'Hold (ms)', min: 500, max: 4000, step: 100, value: 1800 }
  ];

  static TITLE = 'The Whispering Woods';

  start() {
    const s = this.scene;
    // a stand-in "scene" behind the card
    const g = this.track(s.add.graphics().setDepth(0));
    g.fillStyle(0x2a3a6b, 1).fillRect(0, 0, 960, 600);
    g.fillStyle(0x1f2c55, 1).fillEllipse(200, 560, 700, 300).fillEllipse(760, 580, 760, 320);
    g.fillStyle(0xfff1c4, 1).fillCircle(760, 120, 46);
    this.dim = this.track(s.add.rectangle(480, 300, 960, 600, 0x05030c, 0).setDepth(5));
    this.top = this.track(s.add.rectangle(480, -50, 960, 100, 0x000000).setDepth(50));
    this.bot = this.track(s.add.rectangle(480, 650, 960, 100, 0x000000).setDepth(50));
    this.emitter(480, 300, 'fx-dot', {
      emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-480, -300, 960, 600) },
      frequency: 120, lifespan: 4000, speedY: { min: -14, max: -4 }, speedX: { min: -8, max: 8 },
      scale: { start: 0.12, end: 0.3 }, alpha: { onUpdate: (pt, k, t) => Math.sin(t * Math.PI) * 0.6 }, tint: 0xfff1c4, blendMode: 'ADD'
    }, 6);
  }

  autoPlay() { this.play(); }

  async play() {
    if (this.running) { this.scene.restartEffect(true); return; }
    this.running = true;
    const s = this.scene;
    const y = this.cy - 10;

    // 1. bars + dim
    Juice.sfx('whoosh');
    s.tweens.add({ targets: this.dim, fillAlpha: 0.55, duration: 600 });
    s.tweens.add({ targets: this.top, y: 40, duration: 600, ease: 'Cubic.easeOut' });
    await Juice.tween(s, { targets: this.bot, y: 560, duration: 600, ease: 'Cubic.easeOut' });
    if (!s.sys.isActive()) return;

    // 2. chapter label
    const label = this.track(Juice.text(s, this.cx, y - 70, 'CHAPTER 2', 16, '#ffc94a', { body: true, weight: '800' }).setDepth(20).setAlpha(0));
    label.setLetterSpacing(18);
    const sp = { v: 18 };
    s.tweens.add({ targets: sp, v: 6, duration: 700, ease: 'Cubic.easeOut', onUpdate: () => label.setLetterSpacing(sp.v) });
    await Juice.tween(s, { targets: label, alpha: 1, duration: 400 });

    // 3. letters
    const letters = this.layoutTitle(ChapterTitle.TITLE, y);
    letters.forEach((t, i) => {
      s.tweens.add({ targets: t, y: y, alpha: 1, angle: 0, delay: i * this.p.stagger, duration: 420, ease: 'Back.easeOut' });
      if (t.text !== ' ' && i % 2 === 0) s.time.delayedCall(i * this.p.stagger, () => Juice.sfx('tone', 500 + i * 18, 0.05, 'sine', 0.03));
    });
    await Juice.wait(s, letters.length * this.p.stagger + 300);
    if (!s.sys.isActive()) return;

    // 4. underline + subtitle
    const line = this.track(s.add.graphics().setDepth(20));
    const o = { w: 0 };
    s.tweens.add({ targets: o, w: 300, duration: 500, ease: 'Cubic.easeOut', onUpdate: () => line.clear().fillStyle(0xffc94a, 1).fillRect(this.cx - o.w, y + 46, o.w * 2, 3) });
    const sub = this.track(Juice.text(s, this.cx, y + 82, 'in which Pip follows a strange light', 18, '#c9c2ef', { body: true, weight: '600' }).setDepth(20).setAlpha(0));
    s.tweens.add({ targets: sub, alpha: 1, delay: 250, duration: 500 });
    Juice.sfx('chime');
    await Juice.wait(s, 700 + this.p.hold);
    if (!s.sys.isActive()) return;

    // 5. clear out (different from the way in)
    [...letters].reverse().forEach((t, i) => s.tweens.add({ targets: t, y: t.y - 30, alpha: 0, delay: i * 18, duration: 360, ease: 'Quad.easeIn' }));
    s.tweens.add({ targets: [label, sub, line], alpha: 0, duration: 400 });
    await Juice.wait(s, letters.length * 18 + 300);
    s.tweens.add({ targets: this.dim, fillAlpha: 0, duration: 600 });
    s.tweens.add({ targets: this.top, y: -50, duration: 500, ease: 'Cubic.easeIn' });
    await Juice.tween(s, { targets: this.bot, y: 650, duration: 500, ease: 'Cubic.easeIn' });
    this.running = false;
  }

  layoutTitle(str, y) {
    const s = this.scene;
    const style = { fontFamily: '"Unbounded", "Trebuchet MS", sans-serif', fontSize: '48px', color: '#ffffff', fontStyle: '800' };
    const m = s.add.text(0, 0, str, style).setVisible(false);
    const total = m.width;
    m.destroy();
    let x = this.cx - total / 2;
    return [...str].map((ch) => {
      const t = this.track(s.add.text(x, y - 40, ch, style).setOrigin(0, 0.5).setDepth(20).setAlpha(0).setAngle(Phaser.Math.Between(-12, 12)));
      x += t.width;
      return t;
    });
  }
}
