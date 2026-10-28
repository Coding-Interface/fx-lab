/**
 * TypewriterDialogue — story dialogue with typed text, voice blips and
 * animated words.
 *
 * LESSONS:
 *  - Each character is its own Text object, so single words can WAVE, SHAKE
 *    or change colour. Mark them up in the script:
 *        "something is [wave]glowing[/wave]"   "[shake]don't[/shake]"
 *        "[color=#ff8ac2]pink[/color]"         "Too late...[pause] why?"
 *  - Rhythm sells the voice: commas and full stops add small pauses, and a
 *    short "blip" per letter (pitched per character) gives each speaker a voice
 *    without recording audio.
 *  - ALWAYS let players skip: the first click finishes the line, the next
 *    click advances. Readers are faster than typewriters.
 */
class TypewriterDialogue extends BaseEffect {
  static id = 'dialogue';
  static title = 'Typewriter Dialogue';
  static group = 'story';
  static tags = ['stories', 'learning'];
  static useFor = 'Story scenes, tutorials, character hints, narrated lessons and visual novels.';
  static mode = 'tap';
  static hint = 'Click to finish the line, click again for the next one.';
  static file = 'js/effects/TypewriterDialogue.js';
  static uses = ['js/fx/Juice.js', 'js/fx/UIArt.js'];
  static summary = 'Text types in letter by letter with per-character voice blips and natural pauses. Marked-up words wave, shake or change colour. Clicks skip, then advance.';
  static steps = [
    'Parse the line: [wave], [shake], [color=…] and [pause] tags become per-character flags.',
    'Lay out word by word: measure each character once (cached), wrap when a word would overflow.',
    'Reveal at N characters per second; each letter pops from 40% scale and drops 6 px into place.',
    'Punctuation adds a beat: ", " +90 ms, ". ! ?" +220 ms, [pause] +450 ms.',
    'Each frame, wave letters follow sin(time + index) and shake letters jitter by ±1.5 px.',
    'Line done: a bobbing ▼ appears. The portrait and name plate switch with a small squash per speaker.'
  ];
  static params = [
    { key: 'cps', label: 'Characters / second', min: 10, max: 90, step: 1, value: 38 },
    { key: 'wave', label: 'Wave height', min: 0, max: 12, step: 0.5, value: 5 },
    { key: 'blip', label: 'Voice blips (0/1)', min: 0, max: 1, step: 1, value: 1 }
  ];

  static SPEAKERS = {
    pip: { name: 'Pip', tex: 'ui-fox', color: '#f08a3c', pitch: 640 },
    moss: { name: 'Moss', tex: 'ui-owl', color: '#b79be0', pitch: 300 }
  };

  static SCRIPT = [
    ['pip', 'Psst... did you hear that? Something is [wave]glowing[/wave] in the forest!'],
    ['moss', 'Stay close, little one. And [shake]do not[/shake] touch the [color=#ff8ac2]pink mushrooms[/color].'],
    ['pip', 'Too late...[pause] Why is everything [wave][color=#ffc94a]sparkly[/color][/wave] now?'],
    ['moss', 'Hoo. Well. [pause]That is a lesson for another day.']
  ];

  start() {
    const s = this.scene;
    this.line = -1;
    this.chars = [];
    this.widthCache = {};
    this.measure = s.add.text(-1000, -1000, '', this.style('#fff')).setVisible(false);
    this.track(this.measure);

    // a simple backdrop: night forest silhouettes
    const bg = this.track(s.add.graphics().setDepth(0));
    bg.fillStyle(0x1b1440, 1).fillRect(0, 300, 960, 300);
    for (let i = 0; i < 9; i++) {
      const x = 40 + i * 115;
      bg.fillStyle(i % 2 ? 0x150f33 : 0x1d1645, 1).fillTriangle(x, 330, x - 60, 330 + 0, x, 120 + (i % 3) * 30).fillTriangle(x, 330, x + 60, 330, x, 120 + (i % 3) * 30);
    }
    this.emitter(480, 220, 'fx-dot', {
      emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-460, -160, 920, 200) },
      frequency: 260, lifespan: 3000, speed: { min: 4, max: 18 }, scale: { start: 0.25, end: 0.05 },
      alpha: { onUpdate: (pt, k, t) => Math.sin(t * Math.PI) }, tint: 0xd9ff8a, blendMode: 'ADD'
    }, 1);

    // dialogue box
    this.box = this.track(s.add.container(0, 0).setDepth(10));
    const g = s.add.graphics();
    g.fillStyle(0x07050f, 0.6).fillRoundedRect(40, 396, 880, 182, 24);
    g.fillStyle(0xfff6e0, 1).fillRoundedRect(40, 388, 880, 182, 24);
    g.lineStyle(4, 0x2a1d5e, 1).strokeRoundedRect(40, 388, 880, 182, 24);
    g.fillStyle(0x2a1d5e, 1).fillCircle(140, 478, 66);
    this.portrait = s.add.image(140, 520, 'ui-fox').setOrigin(0.5, 1).setScale(0.66);
    const mask = s.make.graphics({}, false).fillCircle(140, 478, 62);
    this.portrait.setMask(mask.createGeometryMask());
    this.track(mask);
    this.plate = s.add.graphics();
    this.nameText = Juice.text(s, 300, 386, '', 18, '#ffffff', { ox: 0.5 });
    this.arrow = Juice.text(s, 884, 540, '▼', 18, '#2a1d5e', { body: true }).setVisible(false);
    this.box.add([g, this.portrait, this.plate, this.nameText, this.arrow]);
    s.tweens.add({ targets: this.arrow, y: 548, duration: 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.next();
  }

  style(color) {
    return { fontFamily: '"Manrope", "Trebuchet MS", sans-serif', fontSize: '24px', color, fontStyle: '700' };
  }

  charWidth(ch) {
    if (this.widthCache[ch] == null) { this.measure.setText(ch === ' ' ? 'a a' : ch); this.widthCache[ch] = ch === ' ' ? this.measure.width - this.charWidth('a') * 2 : this.measure.width; }
    return this.widthCache[ch];
  }

  /** "[wave]hi[/wave] there" → [{ ch, wave, shake, color } | { pause }] */
  parse(src) {
    const out = [];
    const st = { wave: false, shake: false, color: null };
    const re = /\[(\/?)(wave|shake|pause|color)(?:=([^\]]+))?\]/g;
    let last = 0;
    let m;
    const push = (text) => { for (const ch of text) out.push({ ch, wave: st.wave, shake: st.shake, color: st.color }); };
    while ((m = re.exec(src))) {
      push(src.slice(last, m.index));
      const [, close, tag, val] = m;
      if (tag === 'pause') out.push({ pause: 450 });
      else if (tag === 'color') st.color = close ? null : val;
      else st[tag] = !close;
      last = re.lastIndex;
    }
    push(src.slice(last));
    return out;
  }

  layout(items) {
    const s = this.scene;
    const x0 = 230;
    const maxX = 880;
    let x = x0;
    let y = 440;
    const lineH = 36;
    // group into words so wrapping never splits a word
    const words = [];
    let cur = [];
    items.forEach((it) => {
      if (it.pause) { cur.push(it); return; }
      cur.push(it);
      if (it.ch === ' ') { words.push(cur); cur = []; }
    });
    if (cur.length) words.push(cur);
    const chars = [];
    words.forEach((w) => {
      const width = w.reduce((a, it) => a + (it.pause ? 0 : this.charWidth(it.ch)), 0);
      if (x + width > maxX && x > x0) { x = x0; y += lineH; }
      w.forEach((it) => {
        if (it.pause) { chars.push(it); return; }
        const t = s.add.text(x, y, it.ch, this.style(it.color || '#21183f')).setOrigin(0, 0.5).setDepth(11).setVisible(false);
        chars.push({ ...it, t, bx: x, by: y, i: chars.length });
        x += this.charWidth(it.ch);
      });
    });
    return chars;
  }

  next() {
    const s = this.scene;
    this.chars.forEach((c) => c.t && c.t.destroy());
    this.line = (this.line + 1) % TypewriterDialogue.SCRIPT.length;
    const [who, text] = TypewriterDialogue.SCRIPT[this.line];
    const sp = TypewriterDialogue.SPEAKERS[who];
    if (this.speaker !== who) {
      this.speaker = who;
      this.portrait.setTexture(sp.tex);
      this.portrait.setScale(0.75, 0.55);
      s.tweens.add({ targets: this.portrait, scaleX: 0.66, scaleY: 0.66, duration: 320, ease: 'Back.easeOut' });
      const col = Phaser.Display.Color.HexStringToColor(sp.color).color;
      this.plate.clear().fillStyle(col, 1).fillRoundedRect(230, 366, 140, 40, 20);
      this.nameText.setText(sp.name).setX(300);
      Juice.pop(s, this.nameText, 0.15, 260);
    }
    this.chars = this.layout(this.parse(text));
    this.idx = 0;
    this.wait = 0;
    this.typing = true;
    this.arrow.setVisible(false);
  }

  reveal(c, animate) {
    c.t.setVisible(true);
    if (!animate) { this.scene.tweens.killTweensOf(c.t); c.t.setScale(1).setY(c.by); return; }
    c.t.setScale(0.4).setY(c.by + 6);
    this.scene.tweens.add({ targets: c.t, scale: 1, y: c.by, duration: 120, ease: 'Back.easeOut' });
  }

  finish() {
    this.chars.forEach((c) => { if (c.t) this.reveal(c, false); });
    this.idx = this.chars.length;
    this.typing = false;
    this.arrow.setVisible(true);
  }

  play() {
    if (this.typing) this.finish();
    else { Juice.sfx('tone', 520, 0.05, 'sine', 0.05); this.next(); }
  }

  autoPlay() {}

  update(time, delta) {
    const dt = delta * Juice.timeScale;
    if (this.typing) {
      this.wait -= dt;
      while (this.wait <= 0 && this.idx < this.chars.length) {
        const c = this.chars[this.idx++];
        if (c.pause) { this.wait += c.pause; break; }
        this.reveal(c, true);
        this.wait += 1000 / this.p.cps;
        if (',;:'.includes(c.ch)) this.wait += 90;
        if ('.!?'.includes(c.ch)) this.wait += 220;
        if (this.p.blip && c.ch !== ' ' && this.idx % 2 === 0) {
          Juice.sfx('tone', TypewriterDialogue.SPEAKERS[this.speaker].pitch * Phaser.Math.FloatBetween(0.92, 1.08), 0.04, 'square', 0.025);
        }
      }
      if (this.idx >= this.chars.length) { this.typing = false; this.arrow.setVisible(true); }
    }
    // living text
    const k = time * 0.008 * Juice.timeScale;
    this.chars.forEach((c) => {
      if (!c.t || !c.t.visible) return;
      if (c.wave && this.p.wave > 0 && !Juice.reduced) c.t.y = c.by + Math.sin(k + c.i * 0.55) * this.p.wave;
      if (c.shake && !Juice.reduced) c.t.setPosition(c.bx + Phaser.Math.FloatBetween(-1.5, 1.5), c.by + Phaser.Math.FloatBetween(-1.5, 1.5));
    });
  }

  destroy() {
    this.chars.forEach((c) => c.t && c.t.destroy());
    super.destroy();
  }
}
