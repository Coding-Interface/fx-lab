/**
 * LockedItem — shows any image as locked (grayscale + chains + padlock) and
 * plays a dramatic unlock: rattle → crack → chains fall → colour floods in.
 *   const locked = this.fx.lock(levelIcon);           // instantly looks locked
 *   …later…
 *   await locked.unlock({ label: 'UNLOCKED!' });
 * Options (lock): chains (true), padlock (true), lockScale (1).
 * Options (unlock): rattles (3), drama (1), color (glow/rays), label, rays (true).
 * Works best on top-level images/sprites (not inside a moving container).
 */
class LockedItem extends Component {
  constructor(fx, target, o = {}) {
    super(fx);
    this.target = target;
    this.locked = true;
    const sc = this.scene;
    const j = this.j;
    const c = j.centerOf(target);
    this.c = c;
    const depth = j.above(target);
    const screen = j.isScreen(target);
    const pin = (obj) => (screen ? j.ui(obj) : obj);

    // gray copy laid exactly over the target (works in WebGL and Canvas)
    const grayKey = target.texture ? Textures.gray(sc, target.texture.key, target.frame && target.frame.name !== '__BASE' ? target.frame.name : undefined) : null;
    if (grayKey) {
      this.gray = this.track(pin(sc.add.image(target.x, target.y, grayKey).setOrigin(target.originX, target.originY)
        .setScale(target.scaleX, target.scaleY).setAngle(target.angle).setFlip(target.flipX, target.flipY).setDepth(depth)));
    } else if (target.preFX && sc.game.renderer.type === Phaser.WEBGL && Device.has('shaderFX')) {
      this.matrix = target.preFX.addColorMatrix();
      this.matrix.grayscale(1);
    } else {
      this.dimmed = target.alpha;
      target.setAlpha(0.45);
    }

    const diag = Math.hypot(c.w, c.h);
    this.chains = o.chains === false ? [] : [38, -38].map((a) => this.track(pin(sc.add.image(c.x, c.y, 'pfx-chain').setAngle(a).setScale(diag / 300, Math.max(0.6, diag / 380)).setDepth(depth + 1))));
    const ls = (o.lockScale || 1) * Phaser.Math.Clamp(Math.min(c.w, c.h) / 220, 0.45, 1.4);
    this.lockGlow = this.track(pin(sc.add.image(c.x, c.y + 10 * ls, 'pfx-glow').setTint(0xffd23f).setBlendMode(Phaser.BlendModes.ADD).setScale(0.9 * ls).setAlpha(0).setDepth(depth + 2)));
    this.lock = this.track(pin(sc.add.container(c.x, c.y + 10 * ls).setDepth(depth + 3).setScale(ls)));
    this.shackle = sc.add.image(0, -36, 'pfx-lock-shackle');
    this.body = sc.add.image(0, 0, 'pfx-lock-body');
    this.lock.add([this.shackle, this.body]);
    if (o.padlock === false) this.lock.setVisible(false);
    this.screen = screen;
    this.ls = ls;
    this.idle = sc.tweens.add({ targets: this.lock, angle: { from: -3, to: 3 }, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  async unlock(o = {}) {
    if (!this.locked || !this.alive) return;
    this.locked = false;
    const j = this.j;
    const sc = this.scene;
    const k = o.drama || 1;
    const color = o.color || 0xffd23f;
    const pin = (obj) => (this.screen && obj ? obj.setScrollFactor(0, 0, true) : obj);
    const { x, y } = this.lock;
    this.idle.stop();

    for (let i = 0; i < (o.rattles != null ? o.rattles : 3); i++) {
      const amp = 8 + i * 5;
      j.sfx('charge', i * 2);
      sc.tweens.add({ targets: this.lockGlow, alpha: Math.min(1, 0.25 + i * 0.22), scale: (0.9 + i * 0.15) * this.ls, duration: 200 });
      if (this.chains.length) sc.tweens.add({ targets: this.chains, y: '+=3', duration: 50, yoyo: true });
      await j.tween({ targets: this.lock, angle: { from: -amp, to: amp }, duration: 70, yoyo: true, repeat: 1, ease: 'Sine.easeInOut' });
      this.lock.angle = 0;
      await j.wait(Math.max(90, 260 - i * 50));
      if (!this.alive) return;
    }
    await j.tween({ targets: this.lock, scale: this.ls * 1.18, duration: 160, ease: 'Quad.easeOut' });
    j.sfx('crack');
    await j.hitStop(70 * k);
    if (!this.alive) return;
    j.flash(140, 0xfff3c4, 0.45);
    j.shake(160, 0.006 * k);
    pin(j.shockwave(x, y, color, 2.2 * k * this.ls, 480, this.lock.depth + 1));
    pin(j.burst(x, y, 'pfx-shard', {
      speed: { min: 180 * k, max: 460 * k }, gravityY: 900, lifespan: { min: 600, max: 1000 }, scale: { min: 0.25, max: 0.6 },
      tint: [0xffd23f, 0xffe58a, 0xd99a12], alpha: { start: 1, end: 0, ease: 'Quint.easeIn' },
      rotate: { onEmit: (p) => { p.pfxSpin = Phaser.Math.FloatBetween(-12, 12); return Phaser.Math.Between(0, 360); }, onUpdate: (p, kk, t, v) => v + p.pfxSpin }
    }, Math.round(22 * k), this.lock.depth + 2));
    this.lockGlow.setAlpha(1);
    sc.tweens.add({ targets: this.lockGlow, alpha: 0, scale: 2.4 * this.ls, duration: 500 });

    // pieces fall, chains slide off
    const bottom = this.screen ? j.screen().h + 80 : sc.cameras.main.worldView.bottom + 80;
    this.lock.remove([this.shackle, this.body]);
    [this.shackle, this.body].forEach((p) => { this.track(pin(p)); p.setScale(this.ls).setDepth(this.lock.depth + 1); });
    this.shackle.setPosition(x, y - 36 * this.ls * 1.18);
    this.body.setPosition(x, y);
    this.lock.setVisible(false);
    sc.tweens.add({ targets: this.shackle, x: x + 120, y: y - 170, angle: 200, duration: 520, ease: 'Quad.easeOut' });
    sc.tweens.add({ targets: this.shackle, y: bottom, delay: 520, duration: 520, ease: 'Quad.easeIn' });
    sc.tweens.add({ targets: this.body, x: x - 60, y: bottom, angle: -140, duration: 900, ease: 'Quad.easeIn' });
    j.sfx('whoosh');
    this.chains.forEach((ch, i) => sc.tweens.add({ targets: ch, x: ch.x + (i ? -120 : 120), y: ch.y + 520, angle: ch.angle + (i ? -25 : 25), alpha: 0, delay: 90 + i * 90, duration: 800, ease: 'Quad.easeIn' }));
    await j.wait(260);
    if (!this.alive) return;

    // colour floods in
    j.sfx('chime');
    if (this.gray) sc.tweens.add({ targets: this.gray, alpha: 0, duration: 650, ease: 'Sine.easeInOut' });
    if (this.matrix) { const m = { a: 1 }; sc.tweens.add({ targets: m, a: 0, duration: 650, onUpdate: () => this.matrix.grayscale(m.a) }); }
    if (this.dimmed != null) sc.tweens.add({ targets: this.target, alpha: this.dimmed, duration: 650 });
    const c = this.c;
    j.shine(c.x, c.y, c.w, c.h, 650, this.lock.depth + 3, 14, this.screen);
    await j.wait(300);
    j.pop(this.target, 0.1, 340);
    if (o.rays !== false) {
      const rays = pin(j.rays(c.x, c.y, color, 12, j.above(this.target, -1)));
      sc.tweens.add({ targets: rays, scale: 0.75 * Math.max(0.4, c.h / 310), duration: 500, ease: 'Back.easeOut' });
      sc.tweens.add({ targets: rays, alpha: 0, delay: o.raysFor || 1800, duration: 600, onComplete: () => rays.destroy() });
    }
    pin(j.burst(c.x, c.y, 'pfx-star', { speed: { min: 90, max: 300 * k }, lifespan: { min: 500, max: 1000 }, scale: { start: 0.7, end: 0 }, rotate: { min: 0, max: 360 }, color: [0xffffff, color], blendMode: 'ADD' }, Math.round(30 * k), this.lock.depth + 4));
    if (o.label !== false) j.floatText(c.x, c.y - c.h / 2 - 20, o.label || 'UNLOCKED!', '#ffc94a', 30, { screen: this.screen });
    await j.wait(900);
    if (this.matrix && this.target.preFX) this.target.preFX.remove(this.matrix);
    this.destroy();
  }
}
