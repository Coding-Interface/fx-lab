/**
 * Emote — show how a character feels: a symbol above its head PLUS a body reaction.
 *   await this.fx.emote(npc, 'surprise');
 * Types: 'surprise' | 'confused' | 'love' | 'nervous' | 'annoyed' | 'sleepy' | 'happy' | 'idea'
 * Options: hold (ms the bubble stays, 1200), size (reaction strength, 1), offsetX, offsetY.
 * The character returns to its original position/scale/angle afterwards.
 */
class Emote {
  static TYPES = ['surprise', 'confused', 'love', 'nervous', 'annoyed', 'sleepy', 'happy', 'idea'];

  static async play(fx, target, type = 'surprise', o = {}) {
    const j = fx.juice;
    const sc = fx.scene;
    const c = j.centerOf(target);
    const k = (o.size || 1) * (Settings.reducedMotion ? 0.4 : 1);
    const hold = o.hold || 1200;
    const screen = j.isScreen(target);
    const pin = (obj) => (screen && obj ? obj.setScrollFactor(0, 0, true) : obj);
    const depth = j.above(target, 20);
    const headX = c.x + (o.offsetX || 0);
    const headY = c.y - c.h / 2 + (o.offsetY || 0);
    const base = { x: target.x, y: target.y, sx: target.scaleX, sy: target.scaleY, a: target.angle };
    const restore = () => { if (target.scene) target.setPosition(base.x, base.y).setScale(base.sx, base.sy).setAngle(base.a); };

    const bubble = (content) => {
      const b = pin(sc.add.container(headX + c.w * 0.35, headY - 44).setDepth(depth).setScale(0.001));
      const g = sc.add.graphics();
      g.fillStyle(0x07050f, 0.4).fillRoundedRect(-38, -32, 76, 70, 26);
      g.fillStyle(0xffffff, 1).fillRoundedRect(-38, -38, 76, 70, 26).fillTriangle(-22, 22, -4, 30, -36, 52);
      b.add(g);
      if (content) b.add(content);
      pin(b);
      j.sfx('pop');
      return j.tween({ targets: b, scale: 1, duration: 260, ease: 'Back.easeOut' })
        .then(() => j.wait(hold))
        .then(() => j.tween({ targets: b, scale: 0.001, duration: 160, ease: 'Back.easeIn' }))
        .then(() => b.destroy());
    };
    const glyph = (str, color) => j.text(0, -4, str, 40, color);
    const jobs = [];

    switch (type) {
      case 'surprise':
        jobs.push(bubble(glyph('!', '#ff5f6d')));
        jobs.push(j.tween({ targets: target, y: base.y - 40 * k, duration: 160, yoyo: true, ease: 'Quad.easeOut' }));
        for (let i = 0; i < 5; i++) {
          const a = -Math.PI / 2 + (i - 2) * 0.45;
          const line = pin(sc.add.rectangle(headX + Math.cos(a) * 60, headY - 20 + Math.sin(a) * 50, 4, 18, 0xffffff).setRotation(a + Math.PI / 2).setDepth(depth));
          sc.tweens.add({ targets: line, alpha: { from: 1, to: 0 }, x: line.x + Math.cos(a) * 20, y: line.y + Math.sin(a) * 20, duration: 360, onComplete: () => line.destroy() });
        }
        j.sfx('tone', 880, 0.12, 'triangle', 0.1);
        break;
      case 'confused':
        jobs.push(bubble(glyph('?', '#4fa3ff')));
        jobs.push(j.tween({ targets: target, angle: { from: base.a - 9 * k, to: base.a + 9 * k }, duration: 420, yoyo: true, repeat: 1, ease: 'Sine.easeInOut' }));
        j.sfx('tone', 440, 0.12, 'sine', 0.08, 0, 560);
        break;
      case 'love':
        jobs.push(bubble(glyph('♥', '#ff5fa2')));
        j.pop(target, 0.12 * k, 420);
        pin(j.burst(headX, headY, 'pfx-heart', { speedY: { min: -120, max: -60 }, speedX: { min: -50, max: 50 }, lifespan: 1400, scale: { start: 0.6, end: 1.1 }, alpha: { start: 1, end: 0 }, tint: [0xff5fa2, 0xff8ac2, 0xffb3d1], rotate: { min: -20, max: 20 } }, 7, depth));
        j.sfx('chime');
        break;
      case 'nervous': {
        jobs.push(j.tween({ targets: target, scaleX: base.sx * 0.95, scaleY: base.sy * 0.93, duration: 200, yoyo: true, hold: 900, ease: 'Quad.easeOut' }));
        const drop = pin(sc.add.graphics().setDepth(depth));
        drop.fillStyle(0x7fc8ff, 1).fillCircle(0, 8, 9).fillTriangle(-8, 5, 8, 5, 0, -12).fillStyle(0xffffff, 0.8).fillCircle(-3, 6, 2.5);
        drop.setPosition(headX + c.w * 0.3, headY + 10).setScale(0.001);
        jobs.push(j.tween({ targets: drop, scale: 1.2, duration: 200, ease: 'Back.easeOut' })
          .then(() => j.tween({ targets: drop, y: headY + 60, duration: 900, ease: 'Quad.easeIn' }))
          .then(() => j.tween({ targets: drop, alpha: 0, duration: 200 })).then(() => drop.destroy()));
        j.sfx('tone', 520, 0.18, 'sine', 0.06, 0, 380);
        break;
      }
      case 'annoyed': {
        const vein = pin(sc.add.graphics().setDepth(depth));
        vein.lineStyle(6, 0xff5f6d, 1);
        [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => vein.beginPath().arc(sx * 9, sy * 9, 8, Math.atan2(-sy, -sx) - 0.9, Math.atan2(-sy, -sx) + 0.9, false).strokePath());
        vein.setPosition(headX + c.w * 0.3, headY - 10);
        jobs.push(j.tween({ targets: vein, scale: { from: 0.8, to: 1.15 }, duration: 160, yoyo: true, repeat: 3 }).then(() => vein.destroy()));
        if (!Settings.reducedMotion) jobs.push(j.tween({ targets: target, x: base.x + 4 * k, duration: 40, yoyo: true, repeat: 7 }));
        pin(j.burst(headX, headY - 10, 'pfx-smoke', { speedY: { min: -90, max: -50 }, speedX: { min: -60, max: 60 }, lifespan: 900, scale: { start: 0.2, end: 0.7 }, alpha: { start: 0.5, end: 0 }, tint: 0xffffff }, 6, depth));
        j.sfx('noise', 0.25, 0.08, 0, 900);
        break;
      }
      case 'sleepy':
        jobs.push(j.tween({ targets: target, angle: base.a + 6 * k, duration: 900, yoyo: true, ease: 'Sine.easeInOut' }));
        for (let i = 0; i < 3; i++) {
          const z = pin(j.text(headX + 30, headY - 10, 'z', 18 + i * 8, '#c9c2ef').setDepth(depth).setAlpha(0));
          jobs.push(j.tween({ targets: z, x: z.x + 40 + i * 14, y: z.y - 70 - i * 10, alpha: { from: 1, to: 0 }, angle: -15, delay: i * 380, duration: 1300, ease: 'Sine.easeOut' }).then(() => z.destroy()));
        }
        j.sfx('tone', 220, 0.6, 'sine', 0.05, 0, 160);
        break;
      case 'happy':
        jobs.push(bubble(glyph('♪', '#2fbf8a')));
        jobs.push(j.tween({ targets: target, y: base.y - 12 * k, duration: 180, yoyo: true, repeat: 3, ease: 'Sine.easeOut' }));
        for (let i = 0; i < 4; i++) {
          const n = pin(j.text(headX, headY, i % 2 ? '♫' : '♪', 26, '#7ff7c8').setDepth(depth).setAlpha(0));
          const dir = i % 2 ? 1 : -1;
          sc.tweens.add({ targets: n, x: n.x + dir * (50 + i * 10), y: n.y - 90, alpha: { from: 1, to: 0 }, delay: i * 220, duration: 1100, ease: 'Sine.easeOut', onComplete: () => n.destroy() });
        }
        [523, 659, 784].forEach((f, i) => j.sfx('tone', f, 0.14, 'triangle', 0.07, i * 0.12));
        break;
      default: { // idea
        const bulb = sc.add.graphics();
        bulb.fillStyle(0xffd23f, 1).fillCircle(0, -8, 14).fillStyle(0x9b93c4, 1).fillRect(-7, 5, 14, 9).fillStyle(0xffffff, 0.8).fillCircle(-5, -13, 4);
        jobs.push(bubble(bulb));
        jobs.push(j.tween({ targets: target, y: base.y - 22 * k, duration: 140, yoyo: true, ease: 'Quad.easeOut' }));
        const rays = pin(j.rays(headX + c.w * 0.35, headY - 48, 0xffd23f, 10, depth - 1));
        sc.tweens.add({ targets: rays, scale: 0.22, duration: 260, ease: 'Back.easeOut' });
        sc.tweens.add({ targets: rays, alpha: 0, delay: hold, duration: 300, onComplete: () => rays.destroy() });
        j.sfx('sparkle');
      }
    }
    await Promise.all(jobs);
    restore();
  }
}
