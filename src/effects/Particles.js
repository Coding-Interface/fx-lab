/**
 * Particles — one-shot particle effects. Called through the plugin:
 *   this.fx.sparks(x, y)   this.fx.confetti()   await this.fx.fireworks(x, y)
 *   await this.fx.impact(x, y)   await this.fx.coins(from, to, { count: 12 })
 * All positions are WORLD coordinates (they scroll with the camera).
 */
class Particles {
  static COLORS = [0xff5fa2, 0xffc94a, 0x4fe0c8, 0x7a8cff, 0xff8a3d, 0xffffff];

  /** Layered burst: bright core + streak sparks that face their direction + falling embers. */
  static sparks(fx, x, y, o = {}) {
    const j = fx.juice;
    const count = o.count || 40;
    const speed = o.speed || 520;
    const colors = o.colors || [0xffffff, 0xffe680, 0xffa82e, 0xff4a1c];
    const depth = o.depth != null ? o.depth : j.depth(20);
    const core = fx.scene.add.image(x, y, 'pfx-glow').setScale(0.2 * (o.size || 1)).setBlendMode(Phaser.BlendModes.ADD).setTint(colors[1] || 0xffffff).setDepth(depth + 1);
    fx.scene.tweens.add({ targets: core, scale: 1.4 * (o.size || 1), alpha: 0, duration: 180, ease: 'Cubic.easeOut', onComplete: () => core.destroy() });
    j.burst(x, y, 'pfx-spark', {
      speed: { min: speed * 0.35, max: speed }, lifespan: { min: 400, max: o.lifespan || 650 }, gravityY: o.gravity != null ? o.gravity : 600,
      scaleX: { start: 0.9, end: 0.2 }, scaleY: { start: 0.7, end: 0.3 }, color: colors, colorEase: 'Quad.easeIn', blendMode: 'ADD',
      rotate: { onUpdate: (p) => Phaser.Math.RadToDeg(Math.atan2(p.velocityY, p.velocityX)) }
    }, count, depth);
    j.burst(x, y, 'pfx-ember', {
      speed: { min: 30, max: speed * 0.3 }, lifespan: { min: 650, max: 1300 }, gravityY: (o.gravity != null ? o.gravity : 600) * 0.35,
      scale: { start: 0.55, end: 0 }, color: [colors[1] || 0xffe680, 0xff7a1a, 0x80200a], blendMode: 'ADD'
    }, Math.round(count / 3), depth - 1);
    if (o.sound !== false) j.sfx('pop');
  }

  static _confettiConfig(o) {
    const wob = o.flutter || 26;
    return {
      tint: o.colors || Particles.COLORS,
      rotate: { onEmit: (p) => { p.pfxSpin = Phaser.Math.FloatBetween(-8, 8); return Phaser.Math.Between(0, 360); }, onUpdate: (p, k, t, v) => v + p.pfxSpin },
      scaleX: { onEmit: (p) => { p.pfxWob = Math.random() * 6.28; return 1; }, onUpdate: (p, k, t) => Math.cos(p.pfxWob + t * wob) },
      scaleY: { min: 0.7, max: 1.1 },
      alpha: { start: 1, end: 0, ease: 'Quint.easeIn' }
    };
  }

  /**
   * Confetti. With no x/y: two cannons fire from the bottom corners of the
   * SCREEN. With x/y: a burst at that world point.
   */
  static confetti(fx, o = {}) {
    const j = fx.juice;
    const n = o.count || 70;
    const base = { ...Particles._confettiConfig(o), speed: { min: 380, max: 820 }, gravityY: o.gravity || 420, lifespan: 3400 };
    const depth = o.depth != null ? o.depth : j.depth(400);
    if (o.x != null && o.y != null) {
      j.burst(o.x, o.y, 'pfx-confetti', { ...base, speed: { min: 200, max: 600 }, angle: { min: -160, max: -20 } }, n, depth);
    } else {
      const cam = fx.scene.cameras.main;
      const { w, h } = j.screen();
      const left = j.burst(20, h + 10, 'pfx-confetti', { ...base, angle: { min: -80, max: -50 } }, n, depth);
      const right = j.burst(w - 20, h + 10, 'pfx-confetti', { ...base, angle: { min: -130, max: -100 } }, n, depth);
      [left, right].forEach((e) => e.setScrollFactor(0));
      if (cam.zoom !== 1) { /* screen-space bursts are fine at any zoom */ }
    }
    if (o.sound !== false) { j.sfx('pop'); j.sfx('sparkle'); }
  }

  /** Rocket climbs from the bottom of the screen and bursts at x, y. Resolves after the burst. */
  static async fireworks(fx, x, y, o = {}) {
    const j = fx.juice;
    const sc = fx.scene;
    const pal = o.colors || [[0xffffff, 0xffd86b, 0xff7a1a], [0xffffff, 0x9be8ff, 0x4f7bff], [0xffffff, 0xffa8d8, 0xff3f8e], [0xffffff, 0xc3ffb0, 0x2fd48a]][Phaser.Math.Between(0, 3)];
    const size = o.size || 300;
    const count = o.count || 90;
    const depth = o.depth != null ? o.depth : j.depth(30);
    const cam = sc.cameras.main;
    const groundY = cam.worldView.bottom + 10;
    const rocket = sc.add.image(x + Phaser.Math.Between(-40, 40), groundY, 'pfx-glow').setScale(0.16).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth);
    const trail = j.emitter(0, 0, 'pfx-dot', {
      frequency: 12, lifespan: 600, speed: { min: 10, max: 50 }, gravityY: 200,
      scale: { start: 0.45, end: 0 }, color: [0xffffff, pal[1], pal[2]], blendMode: 'ADD'
    }, depth - 1);
    trail.startFollow(rocket);
    j.sfx('whoosh');
    await j.tween({ targets: rocket, x, y, duration: o.climb || 700, ease: 'Quad.easeOut' });
    if (!rocket.scene) return;
    trail.stopFollow(); trail.stop();
    sc.time.delayedCall(800, () => trail.destroy());
    rocket.destroy();
    const flash = sc.add.image(x, y, 'pfx-glow').setScale(0.4).setTint(pal[1]).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth + 2);
    sc.tweens.add({ targets: flash, scale: size / 60, alpha: 0, duration: 420, ease: 'Cubic.easeOut', onComplete: () => flash.destroy() });
    j.shockwave(x, y, pal[1], size / 90, 500, depth + 1);
    const shared = { lifespan: { min: 1040, max: 1300 }, gravityY: o.gravity != null ? o.gravity : 140, color: pal, colorEase: 'Quad.easeIn', blendMode: 'ADD' };
    j.burst(x, y, 'pfx-dot', { ...shared, speed: size * 0.95, scale: { start: 0.6, end: 0 } }, Math.round(count * 0.6), depth + 1);
    j.burst(x, y, 'pfx-ember', { ...shared, speed: { min: 20, max: size * 0.7 }, scale: { start: 0.7, end: 0 } }, Math.round(count * 0.4), depth + 1);
    j.sfx('boom');
    if (o.crackle === false) return;
    await j.wait(350);
    if (!sc.sys.isActive()) return;
    j.burst(x, y, 'pfx-star', {
      emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, size * 0.6) },
      speed: { min: 0, max: 20 }, lifespan: { min: 300, max: 700 }, gravityY: 40,
      scale: { start: 0.4, end: 0.1 }, color: [0xffffff, pal[1]], blendMode: 'ADD',
      alpha: { onUpdate: () => (Settings.reducedMotion ? 0.8 : Math.random()) }
    }, 40, depth + 3);
    j.sfx('sparkle');
  }

  /** Heavy impact: hit-stop → flash → flare → rings → debris → dust → shake → cracks. */
  static async impact(fx, x, y, o = {}) {
    const j = fx.juice;
    const sc = fx.scene;
    const k = o.power || 1;
    const color = o.color || 0x4fe0c8;
    const depth = o.depth != null ? o.depth : j.depth(40);
    j.sfx('boom');
    await j.hitStop(o.hitStop != null ? o.hitStop : 70);
    if (!sc.sys.isActive()) return;
    j.flash(90, 0xffffff, 0.5 * Math.min(1, k));
    const flare = sc.add.image(x, y, 'pfx-flare').setBlendMode(Phaser.BlendModes.ADD).setScale(0.3 * k, 1).setDepth(depth + 5).setTint(0xdffcff);
    sc.tweens.add({ targets: flare, scaleX: 2.6 * k, alpha: 0, duration: 260, ease: 'Cubic.easeOut', onComplete: () => flare.destroy() });
    if (o.target) j.pop(o.target, 0.3 * Math.min(1.5, k), 480);
    [0, 60, 130].forEach((d, i) => sc.time.delayedCall(d, () => j.shockwave(x, y, i === 0 ? 0xffffff : color, (3.6 - i * 0.8) * k, 520 + i * 90, depth + 4)));
    j.burst(x, y, 'pfx-shard', {
      speed: { min: 220 * k, max: 620 * k }, angle: { min: -170, max: -10 }, gravityY: 1300, lifespan: { min: 700, max: 1200 },
      rotate: { onEmit: (p) => { p.pfxSpin = Phaser.Math.FloatBetween(-14, 14); return Phaser.Math.Between(0, 360); }, onUpdate: (p, kk, t, v) => v + p.pfxSpin },
      scale: { min: 0.3, max: 0.8 }, tint: o.debrisColors || [color, 0xffffff, 0x9be8ff], alpha: { start: 1, end: 0, ease: 'Quint.easeIn' }
    }, Math.round(26 * k), depth + 3);
    j.burst(x, y + 10, 'pfx-smoke', {
      speedX: { min: -260 * k, max: 260 * k }, speedY: { min: -60, max: 0 }, lifespan: { min: 900, max: 1500 },
      scale: { start: 0.6, end: 2.2 * k }, alpha: { start: 0.45, end: 0 }, tint: o.dustColor || 0x8a80b0, rotate: { min: 0, max: 360 }
    }, 14, depth + 2);
    j.shake(220, (o.shake != null ? o.shake : 0.01) * k);
    if (o.cracks === false) return;
    const g = sc.add.graphics().setDepth(depth - 1);
    g.lineStyle(3, color, 0.9);
    for (let i = 0; i < 7; i++) {
      const a = Phaser.Math.FloatBetween(Math.PI * 0.05, Math.PI * 0.95) * (Math.random() < 0.5 ? 1 : -1);
      let px = x;
      let py = y;
      g.beginPath(); g.moveTo(px, py);
      for (let s = 0; s < 4; s++) {
        const len = Phaser.Math.Between(18, 46) * k;
        const aa = a + Phaser.Math.FloatBetween(-0.5, 0.5);
        px += Math.cos(aa) * len; py += Math.sin(aa) * len * 0.35;
        g.lineTo(px, py);
      }
      g.strokePath();
    }
    sc.tweens.add({ targets: g, alpha: 0, delay: 400, duration: 1200, onComplete: () => g.destroy() });
  }

  /**
   * Reward pickup: items burst out at `from`, hang, then fly to `to` (a point
   * or a game object such as your score text). onEach(i) fires as each lands,
   * which is the moment to add +1 to your score.
   */
  static coins(fx, from, to, o = {}) {
    const j = fx.juice;
    const sc = fx.scene;
    const n = Settings.amount(o.count || 12);
    const tex = o.texture || 'pfx-coin';
    const spread = o.spread || 160;
    const depth = o.depth != null ? o.depth : j.depth(250);
    const screen = !!o.screen;
    j.sfx('pop');
    j.burst(from.x, from.y, 'pfx-star', { speed: { min: 60, max: 180 }, lifespan: 500, scale: { start: 0.6, end: 0 }, color: [0xffffff, 0xffd23f], blendMode: 'ADD' }, 12, depth);
    const jobs = [];
    for (let i = 0; i < n; i++) {
      const coin = sc.add.image(from.x, from.y, tex).setDepth(depth).setScale(o.scale || 0.9);
      if (screen) coin.setScrollFactor(0);
      const dx = Phaser.Math.Between(-spread, spread);
      const peak = from.y - Phaser.Math.Between(90, 220);
      const land = from.y + Phaser.Math.Between(-30, 50);
      sc.tweens.add({ targets: coin, x: from.x + dx, duration: 620 });
      sc.tweens.chain({ targets: coin, tweens: [{ y: peak, duration: 260, ease: 'Quad.easeOut' }, { y: land, duration: 360, ease: 'Bounce.easeOut' }] });
      if (tex === 'pfx-coin') sc.tweens.add({ targets: coin, scaleX: 0.15, duration: Phaser.Math.Between(110, 170), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      jobs.push(j.wait(760 + i * 45).then(() => {
        if (!coin.scene) return null;
        sc.tweens.killTweensOf(coin);
        coin.setScale(o.scale || 0.9);
        return j.flyTo(coin, { x: coin.x, y: coin.y }, to, { duration: o.duration || 650, scaleTo: (o.scale || 0.9) * 0.6 }).then(() => {
          coin.destroy();
          j.sfx('coin');
          if (to.scene && to !== coin) j.pop(to, 0.2, 140);
          if (o.onEach) o.onEach(i);
        });
      }));
    }
    return Promise.all(jobs);
  }
}
