/**
 * Combat — hit reactions and damage numbers for any sprite.
 *   await this.fx.hit(enemy, { damage: 12, crit: Math.random() < 0.2, fromX: player.x });
 *   this.fx.damageNumber(x, y, 25, { crit: true });
 * hit(): white flash → knockback squash → sparks → damage number (+ hit-stop and shake on crits).
 * The white flash uses a pre-baked white silhouette, so it works in WebGL and Canvas.
 */
class Combat {
  static async hit(fx, target, o = {}) {
    const j = fx.juice;
    const sc = fx.scene;
    const crit = !!o.crit;
    const c = j.centerOf(target);
    if (crit) { j.sfx('crack'); await j.hitStop(o.hitStop != null ? o.hitStop : 70); if (!sc.sys.isActive() || !target.scene) return; } else j.sfx('hit');

    // 1. white flash
    Combat.flashWhite(fx, target, o.flashMs || 60);

    // 2. knockback squash away from the attacker
    if (target._pfxKnock) { target._pfxKnock.stop(); const b = target._pfxKnockBase; target.setPosition(b.x, target.y).setScale(b.sx, b.sy); }
    const base = { x: target.x, sx: target.scaleX, sy: target.scaleY };
    target._pfxKnockBase = base;
    const dir = o.fromX != null ? (o.fromX < c.x ? 1 : -1) : 1;
    const push = (o.knockback != null ? o.knockback : 14) * (crit ? 1.6 : 1);
    target._pfxKnock = sc.tweens.chain({
      targets: target,
      tweens: [
        { scaleX: base.sx * 1.25, scaleY: base.sy * 0.77, x: base.x + dir * push, duration: 60, ease: 'Quad.easeOut' },
        { scaleX: base.sx, scaleY: base.sy, x: base.x, duration: 380, ease: 'Back.easeOut' }
      ],
      onComplete: () => { target._pfxKnock = null; }
    });
    const hx = o.x != null ? o.x : c.x - dir * c.w * 0.25;
    const hy = o.y != null ? o.y : c.y;
    j.burst(hx, hy, crit ? 'pfx-spark' : 'pfx-dot', {
      speed: { min: 120, max: crit ? 520 : 300 }, lifespan: 350, scale: { start: crit ? 0.8 : 0.4, end: 0 },
      color: crit ? [0xffffff, 0xffd23f] : [0xffffff, o.color || 0xffe0e6], blendMode: 'ADD',
      rotate: { onUpdate: (p) => Phaser.Math.RadToDeg(Math.atan2(p.velocityY, p.velocityX)) }
    }, crit ? 18 : 8, j.above(target, 2));
    if (crit) { j.shake(140, 0.006); j.shockwave(hx, hy, 0xffd23f, 1.4, 320, j.above(target, 2)); }

    // 3. number
    if (o.damage != null && o.number !== false) Combat.damageNumber(fx, c.x, c.y - c.h / 2, o.damage, { crit, depth: j.above(target, 3) });
    await j.wait(440);
  }

  /** Swap to a white silhouette for a few frames (or tintFill in WebGL / alpha blink as fallbacks). */
  static flashWhite(fx, target, ms = 60) {
    const sc = fx.scene;
    if (target.texture && target.texture.key.endsWith('__pfx-white')) return; // already flashing
    if (target.texture && target.setTexture) {
      const key = target.texture.key;
      const frame = target.frame && target.frame.name !== '__BASE' ? target.frame.name : undefined;
      const white = Textures.white(sc, key, frame);
      if (white) {
        target.setTexture(white);
        sc.time.delayedCall(ms, () => { if (target.scene) target.setTexture(key, frame); });
        return;
      }
    }
    if (target.setTintFill && sc.game.renderer.type === Phaser.WEBGL && Device.has('webgl')) {
      target.setTintFill(0xffffff);
      sc.time.delayedCall(ms, () => target.scene && target.clearTint());
      return;
    }
    const a = target.alpha;
    target.setAlpha(a * 0.3);
    sc.time.delayedCall(ms, () => target.scene && target.setAlpha(a));
  }

  /** Damage number that pops up, arcs sideways and falls away. */
  static damageNumber(fx, x, y, value, o = {}) {
    const j = fx.juice;
    const sc = fx.scene;
    const crit = !!o.crit;
    const str = typeof value === 'number' ? (crit ? `${value}!` : String(value)) : value;
    const t = j.text(x + Phaser.Math.Between(-20, 20), y, str, o.size || (crit ? 44 : 30), o.color || (crit ? '#ffd23f' : '#ffffff'), { stroke: '#2a1640', strokeThickness: crit ? 9 : 7 })
      .setDepth(o.depth != null ? o.depth : j.depth(300)).setScale(0.3);
    if (o.screen) t.setScrollFactor(0);
    if (crit && o.critLabel !== false) {
      const wd = j.text(t.x, y - 44, o.critLabel || 'CRIT!', 16, '#ff8a3d', { stroke: '#2a1640', strokeThickness: 5 }).setDepth(t.depth);
      if (o.screen) wd.setScrollFactor(0);
      sc.tweens.add({ targets: wd, y: wd.y - 30, alpha: 0, delay: 400, duration: 400, onComplete: () => wd.destroy() });
    }
    const side = Phaser.Math.Between(40, 90) * (Math.random() < 0.5 ? -1 : 1);
    sc.tweens.add({ targets: t, scale: crit ? 1.6 : 1.2, duration: 120, ease: 'Back.easeOut', onComplete: () => sc.tweens.add({ targets: t, scale: crit ? 1.25 : 1, duration: 120 }) });
    sc.tweens.add({ targets: t, x: t.x + side, duration: 800 });
    sc.tweens.chain({ targets: t, tweens: [{ y: y - 70, duration: 280, ease: 'Quad.easeOut' }, { y: y + 10, alpha: 0, duration: 520, ease: 'Quad.easeIn' }], onComplete: () => t.destroy() });
    return t;
  }
}
