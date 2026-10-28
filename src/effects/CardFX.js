/**
 * CardFX — flips, rarity reveals, legendary reveals and pack openings.
 *
 *   await this.fx.flip(sprite, { to: 'card-front' });     // flip ANY image to a new texture
 *   await this.fx.flip(container, { swap: () => showAnswer() });
 *   this.fx.reveal(card, 'epic');                          // rarity effect budget
 *   const card = await this.fx.legendaryReveal({ front: 'dragon-card' });
 *   const cards = await this.fx.openPack([{ front: 'c1', rarity: 'common' }, …]);
 */
class CardFX {
  static RARITY = {
    common: { label: 'Common', color: 0x9aa6c8, rank: 0 },
    rare: { label: 'Rare', color: 0x4fa3ff, rank: 1 },
    epic: { label: 'Epic', color: 0xb06bff, rank: 2 },
    legendary: { label: 'Legendary', color: 0xffc94a, rank: 3 }
  };

  /**
   * Fake-3D flip of any game object. The swap happens edge-on (invisible).
   * Options: to (texture key), swap (function), duration, juicy (lift + tilt + shadow), lift, sound.
   */
  static async flip(fx, target, o = {}) {
    if (target._pfxFlipping) return;
    target._pfxFlipping = true;
    const j = fx.juice;
    const sc = fx.scene;
    const half = (o.duration || 460) / 2;
    const juicy = o.juicy !== false;
    let endSX = Math.abs(target.scaleX) || 1;
    const y0 = target.y;
    const dw = target.displayWidth;
    const dh = target.displayHeight;
    if (juicy && !Settings.reducedMotion) {
      sc.tweens.add({ targets: target, y: y0 - (o.lift != null ? o.lift : 28), angle: Phaser.Math.Between(-5, 5), duration: half, ease: 'Sine.easeOut', yoyo: true, hold: 30 });
      if (target.shadow) sc.tweens.add({ targets: target.shadow, x: 22, y: 34, alpha: 0.35, duration: half, ease: 'Sine.easeOut', yoyo: true, hold: 30 });
    }
    await j.tween({ targets: target, scaleX: 0, duration: half, ease: juicy ? 'Cubic.easeIn' : 'Linear' });
    if (o.swap) o.swap();
    else if (o.to && target.setTexture) {
      target.setTexture(o.to);
      if (o.keepSize !== false && dw && dh) {
        // keep the same on-screen size even if the new texture is a different size
        endSX = dw / target.width;
        target.scaleY = dh / target.height;
      }
    }
    if (o.sound !== false) j.sfx('flip');
    await j.tween({ targets: target, scaleX: endSX, duration: half, ease: juicy ? 'Back.easeOut' : 'Linear' });
    if (juicy) await j.wait(40);
    target.angle = 0;
    target.y = y0;
    target._pfxFlipping = false;
  }

  /**
   * Rarity reveal around a card (or anything). Budget grows with rarity:
   * common = pop + puff · rare = + sparkles · epic = + rays, glow, burst · legendary = + hit-stop, flash, shake, banner.
   * rarity: 'common' | 'rare' | 'epic' | 'legendary' or { color, rank }.
   * Returns { destroy() } to remove lingering rays/glow.
   */
  static reveal(fx, target, rarity = 'rare', o = {}) {
    const j = fx.juice;
    const R = typeof rarity === 'string' ? (CardFX.RARITY[rarity] || CardFX.RARITY.common) : rarity;
    const c = j.centerOf(target);
    const screen = j.isScreen(target);
    const depth = j.above(target);
    const keep = [];
    const pin = (obj) => { if (screen && obj) obj.setScrollFactor(0, 0, true); return obj; };
    j.pop(target, 0.12, 320);
    pin(j.burst(c.x, c.y, 'pfx-smoke', { speed: { min: 40, max: 120 }, scale: { start: 0.5, end: 1.4 }, alpha: { start: 0.35, end: 0 }, lifespan: 600, tint: 0xd8dcf0, rotate: { min: 0, max: 360 } }, 10, depth - 2));
    if (R.rank === 0) { j.sfx('pop'); return { destroy: () => {} }; }
    j.sfx('sparkle');
    pin(j.shockwave(c.x, c.y, R.color, 2.2, 520, depth));
    pin(j.burst(c.x, c.y, 'pfx-star', { speed: { min: 80, max: 260 }, scale: { start: 0.7, end: 0 }, lifespan: { min: 500, max: 900 }, rotate: { min: -180, max: 180 }, color: [0xffffff, R.color], blendMode: 'ADD', gravityY: 60 }, 18 + R.rank * 12, depth));
    if (R.rank >= 2) {
      const rays = pin(j.rays(c.x, c.y, R.color, 14, depth - 3));
      fx.scene.tweens.add({ targets: rays, scale: (R.rank === 3 ? 1.15 : 0.8) * Math.max(0.5, c.h / 310), duration: 500, ease: 'Back.easeOut' });
      keep.push(rays);
      const face = target.face || target;
      if (face.preFX || face.setTint) { const glow = j.glow(face, R.color, 2); glow.pulse(2, 6, 800); keep.push(glow); }
      pin(j.burst(c.x, c.y, 'pfx-dot', { speed: { min: 200, max: 520 }, scale: { start: 0.9, end: 0 }, lifespan: { min: 600, max: 1100 }, color: [0xffffff, R.color, 0xff5fa2], blendMode: 'ADD', gravityY: 260 }, 60, depth));
      j.shake(140, 0.004);
    }
    if (R.rank === 2) j.sfx('chime');
    if (R.rank >= 3) {
      j.flash(220, 0xffe7a0, 0.7);
      j.shake(260, 0.008);
      pin(j.shockwave(c.x, c.y, 0xffffff, 3.4, 700, depth));
      j.sfx('fanfare');
      const t = j.floatText(c.x, c.y - c.h * 0.62, o.label || (R.label ? `${R.label.toUpperCase()}!` : 'WOW!'), '#ffc94a', 30);
      if (screen) t.setScrollFactor(0);
    }
    return { destroy: () => keep.forEach((k) => k && k.destroy && k.destroy()) };
  }

  /**
   * The full gacha reveal: drop → anticipation pulses → tension → hit-stop
   * release → flip → shine → stamp → confetti. Screen-space, centred by default.
   * Options: front (texture, required), back, x, y, width, color, title ('LEGENDARY!'),
   * pulses (3), hitStop (90), confetti (80), dim (0.5 backdrop alpha).
   * Resolves with { card, destroy() }.
   */
  static async legendaryReveal(fx, o = {}) {
    const j = fx.juice;
    const sc = fx.scene;
    const cam = sc.cameras.main;
    const { cx, cy, w, h } = j.screen();
    const x = o.x != null ? o.x : cx;
    const y = o.y != null ? o.y : cy - 20;
    const gold = o.color || 0xffc94a;
    const base = j.depth(800);
    const objs = [];
    const keep = (obj) => { objs.push(obj); return obj; };
    const dim = keep(j.ui(sc.add.rectangle(cx, cy, w * 3, h * 3, 0x05030c, 0).setDepth(base - 10)));
    sc.tweens.add({ targets: dim, fillAlpha: o.dim != null ? o.dim : 0.5, duration: 300 });

    const card = keep(new Card(fx, x, -300, o.front, o.back, { width: o.width || 220, depth: base, screen: true }));
    j.sfx('whoosh');
    await j.tween({ targets: card, y, duration: 650, ease: 'Bounce.easeOut' });
    if (!sc.sys.isActive()) return null;
    j.shake(90, 0.003);
    j.ui(j.burst(x, y + card.cardH / 2, 'pfx-smoke', { speedX: { min: -180, max: 180 }, speedY: { min: -40, max: 0 }, lifespan: 700, scale: { start: 0.4, end: 1.3 }, alpha: { start: 0.35, end: 0 }, tint: 0xb0a6d8 }, 10, base - 1));
    await j.wait(250);

    const glow = keep(j.glow(card.face, gold, 0));
    const pull = keep(j.emitter(x, y, 'pfx-dot', {
      emitZone: { type: 'edge', source: new Phaser.Geom.Circle(0, 0, 300), quantity: 40 }, moveToX: 0, moveToY: 0, lifespan: 650,
      frequency: 60, scale: { start: 0.2, end: 0.7 }, alpha: { start: 0, end: 1 }, color: [0xfff1b8, gold], blendMode: 'ADD'
    }, base - 2).setScrollFactor(0));
    const pulses = o.pulses != null ? o.pulses : 3;
    const zoom0 = cam.zoom;
    for (let i = 0; i < pulses; i++) {
      j.sfx('charge', i * 2);
      glow.set(2 + i * 2, 160);
      sc.tweens.add({ targets: card, scale: 1.06, duration: 120, yoyo: true, ease: 'Quad.easeOut' });
      if (!Settings.reducedMotion) sc.tweens.add({ targets: cam, zoom: zoom0 * (1 + (i + 1) * 0.018), duration: 200, ease: 'Quad.easeOut' });
      pull.frequency = Math.max(14, 60 - i * 14);
      await j.wait(Math.max(220, 460 - i * 70));
      if (!sc.sys.isActive()) return null;
    }
    const rays = keep(j.ui(j.rays(x, y, gold, 16, base - 3)));
    sc.tweens.add({ targets: rays, scale: 0.55, duration: 500, ease: 'Sine.easeOut' });
    pull.frequency = 8;
    glow.set(8, 400);
    j.sfx('charge', 10);
    if (!Settings.reducedMotion) await j.tween({ targets: card, x: { from: x - 4, to: x + 4 }, duration: 32, yoyo: true, repeat: 7 });
    else await j.wait(500);
    card.x = x;
    pull.stop();
    j.sfx('boom');
    await j.hitStop(o.hitStop != null ? o.hitStop : 90);
    if (!sc.sys.isActive()) return null;
    j.flash(240, 0xffe7a0, 0.8);
    j.shake(300, 0.01);
    sc.tweens.add({ targets: cam, zoom: zoom0, duration: 320, ease: 'Back.easeOut' });
    j.ui(j.shockwave(x, y, 0xffffff, 3.6, 650, base + 5));
    sc.time.delayedCall(90, () => j.ui(j.shockwave(x, y, gold, 4.6, 800, base + 5)));
    j.ui(j.burst(x, y, 'pfx-star', { speed: { min: 200, max: 640 }, lifespan: { min: 700, max: 1300 }, scale: { start: 0.9, end: 0 }, rotate: { min: 0, max: 360 }, color: [0xffffff, 0xffe680, gold, 0xff8a3d], blendMode: 'ADD', gravityY: 180 }, 70, base + 6));
    sc.tweens.add({ targets: rays, scale: 1.25, duration: 600, ease: 'Back.easeOut' });
    await card.flip({ duration: 520, lift: 40 });
    if (!sc.sys.isActive()) return null;
    j.sfx('sparkle');
    await j.shine(x, y, card.cardW, card.cardH, 600, base + 7, 18, true);
    const stamp = keep(j.ui(j.text(x, y + card.cardH / 2, o.title || 'LEGENDARY!', 44, '#ffc94a', { stroke: '#2a1640', strokeThickness: 10 })
      .setDepth(base + 8).setScale(3).setAlpha(0).setAngle(-8)));
    await j.tween({ targets: stamp, scale: 1, alpha: 1, angle: -4, duration: 220, ease: 'Cubic.easeIn' });
    j.sfx('boom');
    j.shake(120, 0.005);
    j.pop(stamp, 0.12, 300);
    j.sfx('fanfare');
    glow.pulse(4, 9, 900);
    if ((o.confetti != null ? o.confetti : 80) > 0) Particles.confetti(fx, { count: o.confetti || 80, sound: false });
    keep(j.emitter(x, y, 'pfx-star', {
      emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-card.cardW * 0.6, -card.cardH * 0.55, card.cardW * 1.2, card.cardH * 1.1) },
      frequency: 140, lifespan: 900, scale: { start: 0.01, end: 0.5, ease: 'Sine.easeOut' }, alpha: { start: 1, end: 0 }, rotate: { min: 0, max: 90 }, blendMode: 'ADD'
    }, base + 9).setScrollFactor(0));
    await j.wait(800);
    return {
      card,
      destroy: () => { objs.forEach((ob) => { if (ob && ob.destroy) { sc.tweens.killTweensOf(ob); ob.destroy(); } }); cam.setZoom(zoom0); }
    };
  }

  /**
   * Booster pack: rattle, tear, deal, then the player taps each card to flip
   * it with its rarity effect (rarest is dealt last). Screen-space modal.
   * cards: [{ front: 'texKey', rarity: 'common'|'rare'|'epic'|'legendary', back? }]
   * Options: pack (texture, default built-in), x, y, width (card width, 150), autoFlip (ms between auto flips, 0 = player taps),
   * dim (backdrop alpha). Resolves with { cards, destroy() } after every card is revealed.
   */
  static async openPack(fx, cards, o = {}) {
    const j = fx.juice;
    const sc = fx.scene;
    const { cx, cy, w, h } = j.screen();
    const px = o.x != null ? o.x : cx;
    const py = o.y != null ? o.y : cy;
    const base = j.depth(800);
    const objs = [];
    const keep = (ob) => { objs.push(ob); return ob; };
    const dim = keep(j.ui(sc.add.rectangle(cx, cy, w * 3, h * 3, 0x05030c, 0).setDepth(base - 10)));
    sc.tweens.add({ targets: dim, fillAlpha: o.dim != null ? o.dim : 0.55, duration: 300 });
    const packKey = o.pack || 'pfx-pack';
    const pack = keep(j.ui(sc.add.image(px, py, packKey).setDepth(base + 20)));
    const ps = (o.packHeight || Math.min(340, h * 0.6)) / pack.height;
    pack.setScale(ps);
    const glow = keep(j.ui(sc.add.image(px, py, 'pfx-glow').setTint(0xff5fa2).setBlendMode(Phaser.BlendModes.ADD).setScale(3.4 * ps).setAlpha(0.45).setDepth(base + 18)));
    if (!o.auto) {
      const bob = sc.tweens.add({ targets: pack, y: py - 10, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      await new Promise((resolve) => {
        pack.setInteractive({ useHandCursor: true });
        pack.once('pointerdown', resolve);
      });
      bob.stop();
      pack.y = py;
    }
    for (let i = 0; i < (o.rattles != null ? o.rattles : 3); i++) {
      j.sfx('charge', i * 3);
      sc.tweens.add({ targets: glow, alpha: 0.5 + i * 0.15, scale: (3.4 + i * 0.3) * ps, duration: 150 });
      await j.tween({ targets: pack, angle: { from: -(4 + i * 3), to: 4 + i * 3 }, duration: 60, yoyo: true, repeat: 1 });
      pack.angle = 0;
      await j.wait(Math.max(80, 240 - i * 60));
    }
    if (!sc.sys.isActive()) return null;
    const tear = Math.round(pack.height * 0.22);
    const top = keep(j.ui(sc.add.image(px, py, packKey).setScale(ps).setCrop(0, 0, pack.width, tear).setDepth(base + 21)));
    pack.setCrop(0, tear, pack.width, pack.height - tear);
    j.sfx('crack'); j.sfx('whoosh');
    sc.tweens.add({ targets: top, x: px - 180, y: py - 260, angle: -70, alpha: 0, duration: 650, ease: 'Quad.easeOut' });
    const tearY = py - (pack.height * ps) / 2 + tear * ps;
    j.flash(160, 0xffffff, 0.35);
    const rays = keep(j.ui(j.rays(px, tearY, 0xfff1b8, 10, base + 19)));
    sc.tweens.add({ targets: rays, scale: 0.6, duration: 260, ease: 'Back.easeOut' });
    sc.tweens.add({ targets: rays, alpha: 0, delay: 500, duration: 400 });
    j.ui(j.burst(px, tearY, 'pfx-star', {
      emitZone: { type: 'random', source: new Phaser.Geom.Line(-110 * ps, 0, 110 * ps, 0) }, speedY: { min: -360, max: -120 }, speedX: { min: -80, max: 80 },
      gravityY: 300, lifespan: 900, scale: { start: 0.6, end: 0 }, rotate: { min: 0, max: 360 }, color: [0xffffff, 0xffd86b, 0xff5fa2], blendMode: 'ADD'
    }, 36, base + 22));
    await j.wait(200);

    const cw = o.width || Math.min(150, (w - 80) / cards.length - 16);
    const gap = cw + 16;
    const rank = (c) => (CardFX.RARITY[c.rarity] || CardFX.RARITY.common).rank;
    const order = cards.slice().sort((a, b) => rank(a) - rank(b));
    const made = order.map((info, i) => {
      const c = keep(new Card(fx, px, tearY, info.front, info.back, { width: cw, depth: base + i, screen: true }));
      c.setScale(0.3).setAngle(Phaser.Math.Between(-20, 20));
      c.info = info;
      return c;
    });
    const rowY = py + 10;
    made.forEach((c, i) => sc.tweens.add({ targets: c, x: px + (i - (made.length - 1) / 2) * gap, y: rowY, scale: 1, angle: 0, delay: i * (o.deal || 120), duration: 520, ease: 'Back.easeOut', onStart: () => j.sfx('flip') }));
    sc.tweens.add({ targets: [pack, glow], y: '+=420', alpha: 0, delay: 250, duration: 700, ease: 'Quad.easeIn' });
    await j.wait((o.deal || 120) * made.length + 560);
    if (!sc.sys.isActive()) return null;
    made.forEach((c) => {
      const R = CardFX.RARITY[c.info.rarity] || CardFX.RARITY.common;
      if (R.rank > 0 && o.tells !== false) { c.tell = j.glow(c.face, R.color, 1); c.tell.pulse(1, 2 + R.rank * 1.5, 900 - R.rank * 150); }
    });

    const flipOne = async (c) => {
      if (c.revealed) return;
      c.revealed = true;
      if (c.tell) { c.tell.destroy(); c.tell = null; }
      await c.flip({ duration: 440 });
      if (sc.sys.isActive()) keep(CardFX.reveal(fx, c, c.info.rarity));
    };
    if (o.autoFlip) {
      for (const c of made) { await flipOne(c); await j.wait(o.autoFlip); }
    } else {
      await Promise.all(made.map((c) => new Promise((resolve) => {
        c.setInteractive(new Phaser.Geom.Rectangle(-c.cardW / 2, -c.cardH / 2, c.cardW, c.cardH), Phaser.Geom.Rectangle.Contains);
        c.input.cursor = 'pointer';
        c.once('pointerdown', () => flipOne(c).then(resolve));
      })));
    }
    await j.wait(700);
    return { cards: made, destroy: () => objs.forEach((ob) => { if (ob && ob.destroy) { if (ob.scene) sc.tweens.killTweensOf(ob); ob.destroy(); } }) };
  }
}
