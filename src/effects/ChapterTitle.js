/**
 * ChapterTitle — cinematic title card: letterbox bars, a chapter label, the
 * title dropping in letter by letter, an underline and a subtitle.
 *   await this.fx.chapterTitle('The Whispering Woods', { chapter: 'CHAPTER 2', subtitle: 'in which Pip follows a light' });
 * Options: chapter, subtitle, hold (1800 ms), stagger (50 ms per letter), bars (true), dim (0.55),
 * color (accent, '#ffc94a'), size (48). Resolves after it has cleared away.
 */
class ChapterTitle {
  static async show(fx, title, o = {}) {
    const j = fx.juice;
    const sc = fx.scene;
    const { w, h, cx, cy } = j.screen();
    const depth = j.depth(750);
    const accent = o.color || '#ffc94a';
    const accentN = Phaser.Display.Color.HexStringToColor(accent).color;
    const y = o.y != null ? o.y : cy - 10;
    const objs = [];
    const keep = (ob) => { objs.push(j.ui(ob)); return ob; };
    const dim = keep(sc.add.rectangle(cx, cy, w * 3, h * 3, 0x05030c, 0).setDepth(depth));
    const barH = Math.round(h * 0.12);
    const top = keep(sc.add.rectangle(cx, -barH / 2, w * 2, barH, 0x000000).setDepth(depth + 5));
    const bot = keep(sc.add.rectangle(cx, h + barH / 2, w * 2, barH, 0x000000).setDepth(depth + 5));
    j.sfx('whoosh');
    sc.tweens.add({ targets: dim, fillAlpha: o.dim != null ? o.dim : 0.55, duration: 600 });
    if (o.bars !== false) {
      sc.tweens.add({ targets: top, y: barH / 2, duration: 600, ease: 'Cubic.easeOut' });
      await j.tween({ targets: bot, y: h - barH / 2, duration: 600, ease: 'Cubic.easeOut' });
    } else await j.wait(300);
    if (!sc.sys.isActive()) return;

    let label = null;
    if (o.chapter) {
      label = keep(j.text(cx, y - (o.size || 48) * 1.4, o.chapter, 16, accent, { body: true }).setDepth(depth + 2).setAlpha(0));
      label.setLetterSpacing(18);
      const sp = { v: 18 };
      sc.tweens.add({ targets: sp, v: 6, duration: 700, ease: 'Cubic.easeOut', onUpdate: () => label.setLetterSpacing(sp.v) });
      await j.tween({ targets: label, alpha: 1, duration: 400 });
    }

    const style = { fontFamily: Settings.font, fontSize: `${o.size || 48}px`, color: '#ffffff', fontStyle: 'bold' };
    const m = sc.add.text(0, 0, title, style);
    const total = Math.min(m.width, w - 40);
    const fit = Math.min(1, (w - 40) / m.width);
    m.destroy();
    let x = cx - total / 2;
    const stagger = o.stagger != null ? o.stagger : 50;
    const letters = [...title].map((ch, i) => {
      const t = keep(sc.add.text(x, y - 40, ch, style).setScale(fit).setOrigin(0, 0.5).setDepth(depth + 2).setAlpha(0).setAngle(Settings.reducedMotion ? 0 : Phaser.Math.Between(-12, 12)));
      x += t.width * fit;
      sc.tweens.add({ targets: t, y, alpha: 1, angle: 0, delay: i * stagger, duration: 420, ease: 'Back.easeOut' });
      if (ch !== ' ' && i % 2 === 0) sc.time.delayedCall(i * stagger, () => j.sfx('tone', 500 + i * 18, 0.05, 'sine', 0.03));
      return t;
    });
    await j.wait(letters.length * stagger + 300);
    if (!sc.sys.isActive()) return;

    const line = keep(sc.add.graphics().setDepth(depth + 2));
    const lo = { w: 0 };
    const half = Math.min(300, total / 2 + 20);
    sc.tweens.add({ targets: lo, w: half, duration: 500, ease: 'Cubic.easeOut', onUpdate: () => line.clear().fillStyle(accentN, 1).fillRect(cx - lo.w, y + (o.size || 48) * 0.95, lo.w * 2, 3) });
    let sub = null;
    if (o.subtitle) {
      sub = keep(j.text(cx, y + (o.size || 48) * 1.7, o.subtitle, 18, '#d8d2f5', { body: true, wrap: w - 80 }).setDepth(depth + 2).setAlpha(0));
      sc.tweens.add({ targets: sub, alpha: 1, delay: 250, duration: 500 });
    }
    j.sfx('chime');
    await j.wait(700 + (o.hold != null ? o.hold : 1800));
    if (!sc.sys.isActive()) return;

    [...letters].reverse().forEach((t, i) => sc.tweens.add({ targets: t, y: t.y - 30, alpha: 0, delay: i * 18, duration: 360, ease: 'Quad.easeIn' }));
    sc.tweens.add({ targets: [label, sub, line].filter(Boolean), alpha: 0, duration: 400 });
    await j.wait(letters.length * 18 + 300);
    sc.tweens.add({ targets: dim, fillAlpha: 0, duration: 600 });
    sc.tweens.add({ targets: top, y: -barH / 2, duration: 500, ease: 'Cubic.easeIn' });
    await j.tween({ targets: bot, y: h + barH / 2, duration: 500, ease: 'Cubic.easeIn' });
    objs.forEach((ob) => ob.destroy());
  }
}
