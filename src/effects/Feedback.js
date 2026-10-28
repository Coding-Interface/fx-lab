/**
 * Feedback — answer feedback that works on YOUR answer buttons/tiles
 * (any Image, Sprite, Text, Container, Rectangle…).
 *
 *   await this.fx.correct(tile, { points: 10, scoreText: this.scoreText });
 *   await this.fx.wrong(tile, { message: 'Nice try! A noun is a thing you can point at.' });
 *   const h = this.fx.hint(rightTile);  …  h.stop();
 *   await this.fx.checkmark(x, y);
 *
 * Kind by design: wrong answers never flash red, buzz or shake the screen.
 */
class Feedback {
  static _overlay(fx, target, color, alpha, ms = 200) {
    const j = fx.juice;
    const b = j.centerOf(target);
    const r = Math.min(18, b.h / 2);
    const g = fx.scene.add.graphics().setAlpha(0);
    // Container (e.g. a button = background + label): slip the overlay between
    // the background and the label, so the label stays readable.
    if (target.type === 'Container' && target.list && target.list.length > 1 && target.width > 0) {
      const w = target.width;
      const h = target.height;
      g.fillStyle(color, 1).fillRoundedRect(-w / 2, -h / 2, w, h, r);
      g.lineStyle(3, color, 1).strokeRoundedRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 6, r + 3);
      target.addAt(g, 1);
    } else {
      g.setDepth(j.above(target));
      g.fillStyle(color, 1).fillRoundedRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, r);
      g.lineStyle(3, color, 1).strokeRoundedRect(b.x - b.w / 2 - 3, b.y - b.h / 2 - 3, b.w + 6, b.h + 6, r + 3);
      if (j.isScreen(target)) g.setScrollFactor(0);
    }
    fx.scene.tweens.add({ targets: g, alpha, duration: ms });
    return g;
  }

  /** Draw a check mark stroke by stroke at (x, y). */
  static checkmark(fx, x, y, o = {}) {
    const s = (o.size || 34) / 30;
    const g = fx.scene.add.graphics().setDepth(o.depth != null ? o.depth : fx.juice.depth(60));
    if (o.screen) g.setScrollFactor(0);
    const pts = [[-15, 1], [-4, 12], [17, -13]].map(([px, py]) => [x + px * s, y + py * s]);
    const lens = [Phaser.Math.Distance.Between(...pts[0], ...pts[1]), Phaser.Math.Distance.Between(...pts[1], ...pts[2])];
    const total = lens[0] + lens[1];
    const t = { v: 0 };
    return fx.juice.tween({
      targets: t, v: 1, duration: o.duration || 320, ease: 'Sine.easeInOut',
      onUpdate: () => {
        let d = t.v * total;
        g.clear().lineStyle(7 * s, o.color || 0xffffff, 1).beginPath().moveTo(pts[0][0], pts[0][1]);
        for (let k = 0; k < 2 && d > 0; k++) {
          const f = Math.min(1, d / lens[k]);
          g.lineTo(pts[k][0] + (pts[k + 1][0] - pts[k][0]) * f, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * f);
          d -= lens[k];
        }
        g.strokePath();
      }
    }).then(() => g);
  }

  /**
   * Right answer: pop, green fill, check mark, stars, then "+points" flies to
   * your score (scoreTarget or scoreText) and scoreText rolls up.
   * Options: points, scoreText (Text), score (current score number → we count up from it),
   * scoreTarget (object to fly to; defaults to scoreText), others (array of tiles to dim),
   * color, keep (leave the green overlay, default true), sound.
   */
  static async correct(fx, target, o = {}) {
    const j = fx.juice;
    const sc = fx.scene;
    const b = j.centerOf(target);
    const color = o.color || 0x2fbf8a;
    j.pop(target, 0.12, 300);
    const overlay = Feedback._overlay(fx, target, color, 0.85, 180);
    if (o.sound !== false) j.sfx('correct');
    const screen = j.isScreen(target);
    const check = Feedback.checkmark(fx, b.x + b.w / 2 - Math.min(40, b.w * 0.2), b.y, { size: Math.min(34, b.h * 0.5), screen, depth: j.above(target, 2) });
    const ring = j.shockwave(b.x, b.y, 0x9dffcf, Math.max(1.2, b.w / 140), 450, j.above(target, 2));
    const stars = j.burst(b.x, b.y, 'pfx-star', {
      speed: { min: 120, max: 340 }, lifespan: { min: 450, max: 800 }, scale: { start: 0.6, end: 0 }, rotate: { min: 0, max: 360 },
      color: [0xffffff, 0xb8ffd8, 0xffd86b], blendMode: 'ADD', gravityY: 200
    }, o.stars != null ? o.stars : 24, j.above(target, 3));
    if (screen) { ring.setScrollFactor(0); stars.setScrollFactor(0); }
    if (o.others) o.others.forEach((t) => { if (t !== target) sc.tweens.add({ targets: t, alpha: 0.4, duration: 260 }); });
    const mark = await check;
    if (o.points && (o.scoreText || o.scoreTarget)) {
      const to = o.scoreTarget || o.scoreText;
      const plus = j.text(b.x, b.y - 10, `+${o.points}`, 30, '#ffc94a', { stroke: '#1a1030' }).setDepth(j.depth(300)).setScale(0.3);
      if (screen) plus.setScrollFactor(0);
      await j.tween({ targets: plus, scale: 1.1, y: b.y - 60, duration: 220, ease: 'Back.easeOut' });
      await j.flyTo(plus, null, to, { duration: 480, scaleTo: 0.5, arc: 120 });
      plus.destroy();
      if (!sc.sys.isActive()) return;
      j.pop(to, 0.18, 260);
      j.sfx('coin');
      if (o.scoreText) {
        const from = o.score != null ? o.score : parseFloat(o.scoreText.text) || 0;
        await j.countUp(o.scoreText, from, from + o.points, 450);
      }
    }
    if (o.keep === false) { overlay.destroy(); mark.destroy(); }
    else { target.once && target.once('destroy', () => { overlay.destroy(); mark.destroy(); }); }
    return { overlay, mark };
  }

  /**
   * Wrong answer, kindly: a small head-shake wiggle, a soft amber tint that
   * stays (so they remember what they tried) and an optional message bubble.
   * Options: message, wiggle (px), color, keep (default true), bubbleY (offset below target).
   */
  static async wrong(fx, target, o = {}) {
    const j = fx.juice;
    const b = j.centerOf(target);
    const overlay = Feedback._overlay(fx, target, o.color || 0xffb44a, 0.35, 260);
    if (o.sound !== false) j.sfx('soft');
    const wig = j.wiggle(target, o.wiggle != null ? o.wiggle : 6, 3);
    let bubble = null;
    if (o.message) bubble = Feedback.say(fx, b.x, b.y + b.h / 2 + (o.bubbleY || 40), o.message, { screen: j.isScreen(target), hold: o.hold });
    await wig;
    if (o.keep === false) overlay.destroy();
    else if (target.once) target.once('destroy', () => overlay.destroy());
    return { overlay, bubble };
  }

  /** A friendly speech bubble that pops in at (x, y) and fades after `hold` ms (0 = stay). */
  static say(fx, x, y, text, o = {}) {
    const j = fx.juice;
    const sc = fx.scene;
    const c = sc.add.container(x, y + 14).setDepth(j.depth(320)).setAlpha(0).setScale(0.9);
    const t = j.text(0, 0, text, o.size || 17, '#1a1030', { body: true, wrap: o.width || 520 });
    const w = t.width + 40;
    const h = t.height + 24;
    const g = sc.add.graphics().fillStyle(0xfff6e0, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 16).fillTriangle(-10, -h / 2, 10, -h / 2, 0, -h / 2 - 12);
    c.add([g, t]);
    if (o.screen) j.ui(c);
    sc.tweens.add({ targets: c, alpha: 1, y, scale: 1, duration: 260, ease: 'Back.easeOut' });
    const hold = o.hold != null ? o.hold : 2600;
    if (hold > 0) sc.tweens.add({ targets: c, alpha: 0, delay: hold, duration: 300, onComplete: () => c.destroy() });
    return c;
  }

  /** Gentle "look here" pulse around an object (scaffolding). Returns { stop() }. */
  static hint(fx, target, o = {}) {
    const j = fx.juice;
    const b = j.centerOf(target);
    const g = fx.scene.add.graphics().setDepth(j.above(target));
    if (j.isScreen(target)) g.setScrollFactor(0);
    const r = Math.min(20, b.h / 2 + 6);
    g.lineStyle(4, o.color || 0x4fe0c8, 1).strokeRoundedRect(b.x - b.w / 2 - 6, b.y - b.h / 2 - 6, b.w + 12, b.h + 12, r);
    fx.scene.tweens.add({ targets: g, alpha: { from: 0.25, to: 1 }, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    let base = null;
    if (!Settings.reducedMotion && o.scale !== false) {
      base = { x: target.scaleX, y: target.scaleY };
      fx.scene.tweens.add({ targets: target, scaleX: base.x * 1.03, scaleY: base.y * 1.03, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    return {
      stop: () => {
        fx.scene.tweens.killTweensOf(g); g.destroy();
        if (base) { fx.scene.tweens.killTweensOf(target); target.setScale(base.x, base.y); }
      }
    };
  }
}
