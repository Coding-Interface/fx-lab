/**
 * Dialogue — a story dialogue box with typewriter text, voice blips,
 * portraits and animated words.
 *
 *   const talk = this.fx.dialogue({
 *     speakers: {
 *       pip:  { name: 'Pip',  portrait: 'fox', color: '#f08a3c', pitch: 640 },
 *       moss: { name: 'Moss', portrait: 'owl', color: '#b79be0', pitch: 300 }
 *     }
 *   });
 *   await talk.say('pip', 'Something is [wave]glowing[/wave] in the forest!');
 *   await talk.play([['moss', '[shake]Do not[/shake] touch the [color=#ff8ac2]mushrooms[/color].'], ['pip', 'Too late...[pause] oops.']]);
 *   talk.destroy();
 *
 * Markup: [wave]…[/wave]  [shake]…[/shake]  [color=#hex]…[/color]  [pause]
 * Click / tap / Space / Enter: first finishes the line, then advances.
 * Options: x, y, width, height (screen; defaults to the bottom of the screen), cps (38), fontSize (24),
 * colors { box, edge, text }, clickAnywhere (true), blips (true), arrow (true).
 */
class Dialogue extends Component {
  constructor(fx, o = {}) {
    super(fx);
    const sc = this.scene;
    const { w, h } = this.j.screen();
    this.o = o;
    this.speakers = o.speakers || {};
    this.cps = o.cps || 38;
    this.fontSize = o.fontSize || 24;
    this.W = o.width || Math.min(880, w - 40);
    this.H = o.height || 170;
    this.cx = o.x != null ? o.x : w / 2;
    this.cy = o.y != null ? o.y : h - this.H / 2 - 20;
    this.col = { box: 0xfff6e0, edge: 0x2a1d5e, text: '#21183f', ...(o.colors || {}) };
    this.depth = o.depth != null ? o.depth : this.j.depth(700);
    this.chars = [];
    this.widths = {};
    this.measure = this.track(sc.add.text(-9999, -9999, '', this.style('#000')).setVisible(false));

    const x0 = this.cx - this.W / 2;
    const y0 = this.cy - this.H / 2;
    this.box = this.track(this.j.ui(sc.add.graphics().setDepth(this.depth)));
    this.box.fillStyle(0x07050f, 0.5).fillRoundedRect(x0, y0 + 8, this.W, this.H, 22);
    this.box.fillStyle(this.col.box, 1).fillRoundedRect(x0, y0, this.W, this.H, 22).lineStyle(4, this.col.edge, 1).strokeRoundedRect(x0, y0, this.W, this.H, 22);
    this.hasPortraits = Object.values(this.speakers).some((s) => s.portrait);
    this.pr = Math.min(62, this.H / 2 - 18);
    this.px = x0 + 24 + this.pr;
    if (this.hasPortraits) {
      this.box.fillStyle(this.col.edge, 1).fillCircle(this.px, this.cy, this.pr + 4);
      this.portrait = this.track(this.j.ui(sc.add.image(this.px, this.cy, '__DEFAULT').setDepth(this.depth + 1)));
      const mask = this.track(sc.make.graphics({}, false).fillCircle(this.px, this.cy, this.pr).setScrollFactor(0));
      this.portrait.setMask(mask.createGeometryMask());
    }
    this.textX = this.hasPortraits ? this.px + this.pr + 26 : x0 + 30;
    this.textRight = x0 + this.W - 36;
    this.plate = this.track(this.j.ui(sc.add.graphics().setDepth(this.depth + 1)));
    this.nameText = this.track(this.j.ui(this.j.text(0, y0, '', 18, '#ffffff').setDepth(this.depth + 2)));
    this.arrow = this.track(this.j.ui(this.j.text(x0 + this.W - 30, y0 + this.H - 26, '▼', 18, '#' + this.col.edge.toString(16).padStart(6, '0'), { body: true }).setDepth(this.depth + 2).setVisible(false)));
    sc.tweens.add({ targets: this.arrow, y: this.arrow.y + 6, duration: 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this._click = () => this.advance();
    if (o.clickAnywhere !== false) sc.input.on('pointerdown', this._click);
    else { this.box.setInteractive(new Phaser.Geom.Rectangle(x0, y0, this.W, this.H), Phaser.Geom.Rectangle.Contains); this.box.on('pointerdown', this._click); }
    this._key = (e) => { if (e.code === 'Space' || e.code === 'Enter') this.advance(); };
    if (sc.input.keyboard) sc.input.keyboard.on('keydown', this._key);
    this.onUpdate((time, dt) => this.tick(time, dt));
  }

  style(color) { return { fontFamily: Settings.bodyFont, fontSize: `${this.fontSize}px`, color, fontStyle: 'bold' }; }

  cw(ch) {
    if (this.widths[ch] == null) {
      if (ch === ' ') { this.measure.setText('a a'); const ww = this.measure.width; this.widths[ch] = ww - this.cw('a') * 2; }
      else { this.measure.setText(ch); this.widths[ch] = this.measure.width; }
    }
    return this.widths[ch];
  }

  parse(src) {
    const out = [];
    const st = { wave: false, shake: false, color: null };
    const re = /\[(\/?)(wave|shake|pause|color)(?:=([^\]]+))?\]/g;
    let last = 0;
    let m;
    const push = (t) => { for (const ch of t) out.push({ ch, wave: st.wave, shake: st.shake, color: st.color }); };
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
    const sc = this.scene;
    const lineH = this.fontSize * 1.5;
    let x = this.textX;
    let y = this.cy - this.H / 2 + 40;
    const words = [];
    let cur = [];
    items.forEach((it) => { cur.push(it); if (it.ch === ' ') { words.push(cur); cur = []; } });
    if (cur.length) words.push(cur);
    const chars = [];
    words.forEach((wd) => {
      const width = wd.reduce((a, it) => a + (it.pause ? 0 : this.cw(it.ch)), 0);
      if (x + width > this.textRight && x > this.textX) { x = this.textX; y += lineH; }
      wd.forEach((it) => {
        if (it.pause) { chars.push(it); return; }
        const t = this.j.ui(sc.add.text(x, y, it.ch, this.style(it.color || this.col.text)).setOrigin(0, 0.5).setDepth(this.depth + 2).setVisible(false));
        chars.push({ ...it, t, bx: x, by: y, i: chars.length });
        x += this.cw(it.ch);
      });
    });
    return chars;
  }

  setSpeaker(id) {
    const sp = this.speakers[id] || { name: id || '' };
    this.sp = sp;
    if (this.speakerId === id) return;
    this.speakerId = id;
    const sc = this.scene;
    if (this.portrait) {
      if (sp.portrait) {
        this.portrait.setVisible(true).setTexture(sp.portrait);
        const s = (this.pr * 2.1) / Math.max(this.portrait.width, this.portrait.height);
        this.portrait.setScale(s * 1.12, s * 0.85);
        sc.tweens.add({ targets: this.portrait, scaleX: s, scaleY: s, duration: 320, ease: 'Back.easeOut' });
      } else this.portrait.setVisible(false);
    }
    this.plate.clear();
    this.nameText.setText(sp.name || '');
    if (sp.name) {
      const pw = this.nameText.width + 40;
      const nx = this.textX + pw / 2 - 6;
      const ny = this.cy - this.H / 2;
      this.plate.fillStyle(Phaser.Display.Color.HexStringToColor(sp.color || '#ff5fa2').color, 1).fillRoundedRect(nx - pw / 2, ny - 20, pw, 40, 20);
      this.nameText.setPosition(nx, ny);
      this.j.pop(this.nameText, 0.15, 260);
    }
  }

  /** Show one line. Resolves when the player advances past it. */
  say(speaker, text) {
    if (!this.alive) return Promise.resolve();
    this.chars.forEach((c) => c.t && c.t.destroy());
    this.setSpeaker(speaker);
    this.chars = this.layout(this.parse(text));
    this.idx = 0;
    this.wait = 0;
    this.typing = true;
    this.arrow.setVisible(false);
    return new Promise((resolve) => { this._resolve = resolve; });
  }

  /** Play a whole script: [[speaker, text], …]. */
  async play(lines) {
    for (const [sp, text] of lines) { if (!this.alive) return; await this.say(sp, text); }
  }

  finish() {
    this.chars.forEach((c) => { if (c.t) { this.scene.tweens.killTweensOf(c.t); c.t.setVisible(true).setScale(1).setY(c.by); } });
    this.idx = this.chars.length;
    this.typing = false;
    if (this.o.arrow !== false) this.arrow.setVisible(true);
  }

  /** Same as a click: finish the line, or go to the next one. */
  advance() {
    if (!this.alive || !this._resolve) return;
    if (this.typing) { this.finish(); return; }
    const r = this._resolve;
    this._resolve = null;
    this.j.sfx('tone', 520, 0.05, 'sine', 0.05);
    r();
  }

  tick(time, dt) {
    if (this.typing) {
      this.wait -= dt;
      while (this.wait <= 0 && this.idx < this.chars.length) {
        const c = this.chars[this.idx++];
        if (c.pause) { this.wait += c.pause; break; }
        c.t.setVisible(true).setScale(0.4).setY(c.by + 6);
        this.scene.tweens.add({ targets: c.t, scale: 1, y: c.by, duration: 120, ease: 'Back.easeOut' });
        this.wait += 1000 / this.cps;
        if (',;:'.includes(c.ch)) this.wait += 90;
        if ('.!?'.includes(c.ch)) this.wait += 220;
        if (this.o.blips !== false && c.ch !== ' ' && this.idx % 2 === 0) this.j.sfx('blip', (this.sp && this.sp.pitch) || 520);
      }
      if (this.idx >= this.chars.length) { this.typing = false; if (this.o.arrow !== false) this.arrow.setVisible(true); }
    }
    if (Settings.reducedMotion) return;
    const k = time * 0.008;
    this.chars.forEach((c) => {
      if (!c.t || !c.t.visible) return;
      if (c.wave) c.t.y = c.by + Math.sin(k + c.i * 0.55) * (this.o.waveHeight || 5);
      if (c.shake) c.t.setPosition(c.bx + Phaser.Math.FloatBetween(-1.5, 1.5), c.by + Phaser.Math.FloatBetween(-1.5, 1.5));
    });
  }

  destroy() {
    if (!this.alive) return;
    this.scene.input.off('pointerdown', this._click);
    if (this.scene.input.keyboard) this.scene.input.keyboard.off('keydown', this._key);
    this.chars.forEach((c) => c.t && c.t.destroy());
    if (this._resolve) { const r = this._resolve; this._resolve = null; r(); }
    super.destroy();
  }
}
