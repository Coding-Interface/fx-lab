/**
 * EmotionBubbles — tiny "emotes" that tell the player how a character feels.
 *
 * LESSONS:
 *  - An emote is TWO things working together: a symbol (bubble, heart,
 *    sweat drop…) AND a body reaction (jump, tilt, shrink, shake). The body
 *    reaction is what makes it read at a glance, even on a phone.
 *  - Use the manga/comic vocabulary players already know: ! surprise,
 *    ? confusion, ♥ love, sweat drop = nervous, vein = annoyed, Zzz = sleepy,
 *    ♪ = happy, bulb = idea.
 *  - In SEL stories this is how you SHOW feelings instead of telling them,
 *    which gives learners a face to name ("How do you think Pip feels?").
 */
class EmotionBubbles extends BaseEffect {
  static id = 'emotes';
  static title = 'Emotion Bubbles';
  static group = 'story';
  static tags = ['stories', 'learning', 'games'];
  static useFor = 'Character reactions in stories, SEL "name the feeling" moments, NPC hints in games.';
  static mode = 'tap';
  static hint = 'Click a character to cycle through their emotions.';
  static file = 'js/effects/EmotionBubbles.js';
  static uses = ['js/fx/Juice.js', 'js/fx/UIArt.js'];
  static summary = 'Eight emotes, each a symbol plus a body reaction: surprise jumps, confusion tilts, love floats hearts, nervous sweats, annoyed shakes, sleepy drifts Zzz, happy bobs to music, an idea lights a bulb.';
  static steps = [
    'Idle: characters breathe (scaleY 1 → 1.03, Sine yoyo), so they feel alive between emotes.',
    'Bubble: a white rounded bubble with a tail pops in (Back.easeOut), holds, then pops out.',
    'Body reactions: jump (surprise, idea), tilt (confused), squash-bounce (love), shrink (nervous), jitter (annoyed), sway (sleepy), bob (happy).',
    'Extra particles carry the feeling outward: hearts rise, steam puffs, Zz drift, notes arc.',
    'The feeling name appears under the character as a caption, which is useful for SEL discussion.'
  ];
  static params = [
    { key: 'hold', label: 'Bubble hold (ms)', min: 400, max: 3000, step: 50, value: 1200 },
    { key: 'size', label: 'Reaction size', min: 0.3, max: 2, step: 0.05, value: 1 }
  ];

  static EMOTES = [
    { id: 'surprise', label: 'Surprised', glyph: '!', color: '#ff5f6d' },
    { id: 'confused', label: 'Confused', glyph: '?', color: '#4fa3ff' },
    { id: 'love', label: 'Loving', glyph: '♥', color: '#ff5fa2' },
    { id: 'nervous', label: 'Nervous', glyph: null, color: '#4fa3ff' },
    { id: 'annoyed', label: 'Annoyed', glyph: null, color: '#ff5f6d' },
    { id: 'sleepy', label: 'Sleepy', glyph: 'z', color: '#9b93c4' },
    { id: 'happy', label: 'Happy', glyph: '♪', color: '#2fbf8a' },
    { id: 'idea', label: 'Got an idea!', glyph: null, color: '#ffc94a' }
  ];

  start() {
    const s = this.scene;
    const ground = this.track(s.add.graphics().setDepth(0));
    ground.fillStyle(0x1f2b52, 1).fillEllipse(this.cx, 520, 900, 120);
    ground.fillStyle(0x24345e, 1).fillEllipse(this.cx, 510, 760, 80);
    this.chars = [
      { tex: 'ui-fox', x: this.cx - 170, name: 'Pip' },
      { tex: 'ui-owl', x: this.cx + 170, name: 'Moss' }
    ].map((c, k) => {
      const shadow = this.track(s.add.ellipse(c.x, 508, 110, 22, 0x000000, 0.3).setDepth(1));
      const img = this.track(s.add.image(c.x, 505, c.tex).setOrigin(0.5, 1).setDepth(5));
      const cap = this.track(Juice.text(s, c.x, 548, c.name, 16, '#9b93c4', { body: true, weight: '800' }));
      const breathe = s.tweens.add({ targets: img, scaleY: 1.03, duration: 1100 + k * 200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      return { ...c, img, shadow, cap, breathe, next: k * 3, homeY: 505 };
    });
  }

  autoPlay() {
    this.react(this.chars[0], 0);
    this.scene.time.delayedCall(900, () => this.react(this.chars[1], 1));
    this.scene.time.delayedCall(2200, () => this.react(this.chars[0], 2));
  }

  play(x, y) {
    const c = this.chars.find((ch) => Math.abs(x - ch.x) < 110 && y > 260 && y < 560);
    if (!c) return;
    this.react(c, c.next);
  }

  bubble(c, content) {
    const s = this.scene;
    const bx = c.x + 70;
    const by = c.homeY - 210;
    const b = s.add.container(bx, by).setDepth(20).setScale(0);
    const g = s.add.graphics();
    g.fillStyle(0x07050f, 0.4).fillRoundedRect(-38, -32, 76, 70, 26);
    g.fillStyle(0xffffff, 1).fillRoundedRect(-38, -38, 76, 70, 26);
    g.fillTriangle(-22, 22, -4, 30, -36, 52);
    b.add(g);
    if (content) b.add(content);
    return b;
  }

  async showBubble(c, content) {
    const s = this.scene;
    const b = this.bubble(c, content);
    Juice.sfx('pop');
    await Juice.tween(s, { targets: b, scale: 1, duration: 260, ease: 'Back.easeOut' });
    await Juice.wait(s, this.p.hold);
    await Juice.tween(s, { targets: b, scale: 0, duration: 160, ease: 'Back.easeIn' });
    b.destroy();
  }

  caption(c, e) {
    c.cap.setText(`${c.name} feels ${e.label.toLowerCase()}`).setColor(e.color);
    if (e.id === 'idea') c.cap.setText(`${c.name}: ${e.label}`);
    Juice.pop(this.scene, c.cap, 0.12, 260);
  }

  react(c, index) {
    const s = this.scene;
    const e = EmotionBubbles.EMOTES[index % EmotionBubbles.EMOTES.length];
    c.next = (index + 1) % EmotionBubbles.EMOTES.length;
    const k = this.p.size * (Juice.reduced ? 0.4 : 1);
    const img = c.img;
    s.tweens.killTweensOf(img);
    img.setPosition(c.x, c.homeY).setAngle(0).setScale(1);
    c.breathe = s.tweens.add({ targets: img, scaleY: 1.03, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.caption(c, e);
    const headX = c.x;
    const headY = c.homeY - 120;
    const glyph = e.glyph ? Juice.text(s, 0, -4, e.glyph, 40, e.color) : null;

    switch (e.id) {
      case 'surprise':
        this.showBubble(c, glyph);
        s.tweens.add({ targets: img, y: c.homeY - 40 * k, duration: 160, yoyo: true, ease: 'Quad.easeOut' });
        for (let i = 0; i < 5; i++) {
          const a = -Math.PI / 2 + (i - 2) * 0.45;
          const line = s.add.rectangle(headX + Math.cos(a) * 80, headY - 50 + Math.sin(a) * 60, 4, 18, 0xffffff).setRotation(a + Math.PI / 2).setDepth(19).setAlpha(0);
          s.tweens.add({ targets: line, alpha: { from: 1, to: 0 }, x: line.x + Math.cos(a) * 20, y: line.y + Math.sin(a) * 20, duration: 360, onComplete: () => line.destroy() });
        }
        Juice.sfx('tone', 880, 0.12, 'triangle', 0.1);
        break;
      case 'confused':
        this.showBubble(c, glyph);
        s.tweens.add({ targets: img, angle: { from: -9 * k, to: 9 * k }, duration: 420, yoyo: true, repeat: 1, ease: 'Sine.easeInOut', onComplete: () => img.setAngle(0) });
        Juice.sfx('tone', 440, 0.12, 'sine', 0.08, 0, 560);
        break;
      case 'love':
        this.showBubble(c, glyph);
        Juice.pop(s, img, 0.12 * k, 420);
        Juice.burst(s, headX, headY - 30, 'fx-heart', {
          speedY: { min: -120, max: -60 }, speedX: { min: -50, max: 50 }, lifespan: 1400, scale: { start: 0.6, end: 1.1 },
          alpha: { start: 1, end: 0 }, tint: [0xff5fa2, 0xff8ac2, 0xffb3d1], rotate: { min: -20, max: 20 }
        }, 7, 19);
        Juice.sfx('chime');
        break;
      case 'nervous': {
        s.tweens.add({ targets: img, scaleX: 0.95, scaleY: 0.93, duration: 200, yoyo: true, hold: 900, ease: 'Quad.easeOut' });
        const drop = s.add.graphics().setDepth(21);
        drop.fillStyle(0x7fc8ff, 1).fillCircle(0, 8, 9).fillTriangle(-8, 5, 8, 5, 0, -12);
        drop.fillStyle(0xffffff, 0.8).fillCircle(-3, 6, 2.5);
        drop.setPosition(headX + 52, headY - 40).setScale(0);
        s.tweens.chain({ targets: drop, tweens: [
          { scale: 1.2, duration: 200, ease: 'Back.easeOut' },
          { y: headY + 6, duration: 900, ease: 'Quad.easeIn' },
          { alpha: 0, duration: 200 }
        ], onComplete: () => drop.destroy() });
        Juice.sfx('tone', 520, 0.18, 'sine', 0.06, 0, 380);
        break;
      }
      case 'annoyed': {
        const vein = s.add.graphics().setDepth(21);
        vein.lineStyle(6, 0xff5f6d, 1);
        [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => {
          vein.beginPath().arc(sx * 9, sy * 9, 8, Math.atan2(-sy, -sx) - 0.9, Math.atan2(-sy, -sx) + 0.9, false).strokePath();
        });
        vein.setPosition(headX + 46, headY - 56);
        s.tweens.add({ targets: vein, scale: { from: 0.8, to: 1.15 }, duration: 160, yoyo: true, repeat: 3, onComplete: () => vein.destroy() });
        if (!Juice.reduced) s.tweens.add({ targets: img, x: c.x + 4 * k, duration: 40, yoyo: true, repeat: 7, onComplete: () => img.setX(c.x) });
        Juice.burst(s, headX, headY - 70, 'fx-smoke', { speedY: { min: -90, max: -50 }, speedX: { min: -60, max: 60 }, lifespan: 900, scale: { start: 0.2, end: 0.7 }, alpha: { start: 0.5, end: 0 }, tint: 0xffffff }, 6, 19);
        Juice.sfx('noise', 0.25, 0.08, 0, 900);
        break;
      }
      case 'sleepy':
        s.tweens.add({ targets: img, angle: 6 * k, duration: 900, yoyo: true, ease: 'Sine.easeInOut' });
        for (let i = 0; i < 3; i++) {
          const z = Juice.text(s, headX + 40, headY - 50, 'z', 18 + i * 8, '#c9c2ef').setDepth(21).setAlpha(0);
          s.tweens.add({ targets: z, x: z.x + 40 + i * 14, y: z.y - 70 - i * 10, alpha: { from: 1, to: 0 }, angle: -15, delay: i * 380, duration: 1300, ease: 'Sine.easeOut', onComplete: () => z.destroy() });
        }
        Juice.sfx('tone', 220, 0.6, 'sine', 0.05, 0, 160);
        break;
      case 'happy':
        this.showBubble(c, glyph);
        s.tweens.add({ targets: img, y: c.homeY - 12 * k, duration: 180, yoyo: true, repeat: 3, ease: 'Sine.easeOut' });
        for (let i = 0; i < 4; i++) {
          const n = Juice.text(s, headX, headY - 40, i % 2 ? '♫' : '♪', 26, '#7ff7c8').setDepth(21).setAlpha(0);
          const dir = i % 2 ? 1 : -1;
          s.tweens.add({ targets: n, x: n.x + dir * (50 + i * 10), y: n.y - 90, alpha: { from: 1, to: 0 }, delay: i * 220, duration: 1100, ease: 'Sine.easeOut', onComplete: () => n.destroy() });
        }
        [523, 659, 784].forEach((f, i) => Juice.sfx('tone', f, 0.14, 'triangle', 0.07, i * 0.12));
        break;
      default: { // idea
        const bulb = s.add.container(0, -2);
        const g = s.add.graphics();
        g.fillStyle(0xffd23f, 1).fillCircle(0, -6, 14).fillStyle(0x9b93c4, 1).fillRect(-7, 7, 14, 9);
        g.fillStyle(0xffffff, 0.8).fillCircle(-5, -11, 4);
        bulb.add(g);
        this.showBubble(c, bulb);
        s.tweens.add({ targets: img, y: c.homeY - 22 * k, duration: 140, yoyo: true, ease: 'Quad.easeOut' });
        const rays = Juice.rays(s, c.x + 70, c.homeY - 214, 0xffd23f, 10, 18);
        s.tweens.add({ targets: rays, scale: 0.22, duration: 260, ease: 'Back.easeOut' });
        s.tweens.add({ targets: rays, alpha: 0, delay: this.p.hold, duration: 300, onComplete: () => { s.tweens.killTweensOf(rays); rays.destroy(); } });
        Juice.sfx('sparkle');
      }
    }
  }
}
