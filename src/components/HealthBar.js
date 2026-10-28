/**
 * HealthBar — a bar that drops instantly while a pale "ghost" chunk lingers,
 * then drains, so players can read how much a hit took.
 *   const hp = this.fx.healthBar(400, 60, { width: 300, max: 100 });          // screen-space HUD
 *   const hp = this.fx.healthBar(0, -60, { follow: enemy, width: 80, height: 10 }); // floats above a sprite
 *   hp.damage(12);  hp.heal(20);  hp.set(50);  hp.value
 */
class HealthBar extends Component {
  constructor(fx, x, y, o = {}) {
    super(fx);
    this.o = o;
    this.max = o.max || 100;
    this.value = o.value != null ? o.value : this.max;
    this.ghost = this.value;
    this.w = o.width || 300;
    this.h = o.height || 18;
    this.x = x; this.y = y;
    this.follow = o.follow || null;
    this.g = this.track(this.scene.add.graphics().setDepth(o.depth != null ? o.depth : this.j.depth(480)));
    if (!this.follow) this.j.ui(this.g);
    this.text = o.showText === false ? null : this.track(this.j.text(0, 0, '', Math.max(11, this.h * 0.75), '#ffffff', { body: true, stroke: '#1a1030', strokeThickness: 3 }).setDepth(this.g.depth + 1));
    if (this.text && !this.follow) this.j.ui(this.text);
    if (this.follow) this.onUpdate(() => this.draw());
    this.draw();
  }

  pos() {
    if (!this.follow) return { x: this.x, y: this.y };
    if (!this.follow.scene) { this.destroy(); return { x: 0, y: 0 }; }
    const c = this.j.centerOf(this.follow);
    return { x: c.x + this.x, y: c.y - c.h / 2 + this.y };
  }

  draw() {
    if (!this.alive) return;
    const { x: cx, y } = this.pos();
    const x = cx - this.w / 2;
    const g = this.g;
    const r = this.h / 2;
    g.clear();
    g.fillStyle(0x0b0818, 1).fillRoundedRect(x - 3, y - 3, this.w + 6, this.h + 6, r + 3);
    g.fillStyle(0x2a2250, 1).fillRoundedRect(x, y, this.w, this.h, r);
    if (this.ghost > 0) g.fillStyle(this.o.ghostColor || 0xffe0e6, 0.9).fillRoundedRect(x, y, Math.max(this.h, (this.w * this.ghost) / this.max), this.h, r);
    if (this.value > 0) g.fillStyle(this.o.color || 0xff5f6d, 1).fillRoundedRect(x, y, Math.max(this.h, (this.w * this.value) / this.max), this.h, r);
    if (this.text) this.text.setPosition(cx, y + this.h / 2).setText(`${Math.ceil(this.value)} / ${this.max}`);
  }

  set(v) {
    const prev = this.value;
    this.value = Phaser.Math.Clamp(v, 0, this.max);
    if (this.value >= prev) { this.ghost = this.value; this.draw(); return this; }
    this.draw();
    if (this.ghostTimer) this.ghostTimer.remove();
    if (this.ghostTween) this.ghostTween.stop();
    this.ghostTimer = this.scene.time.delayedCall(this.o.ghostDelay != null ? this.o.ghostDelay : 450, () => {
      this.ghostTween = this.scene.tweens.add({ targets: this, ghost: this.value, duration: 380, ease: 'Cubic.easeOut', onUpdate: () => this.draw() });
    });
    if (this.value <= 0 && this.o.onEmpty) this.o.onEmpty();
    return this;
  }

  damage(n) { return this.set(this.value - n); }
  heal(n) { this.j.sfx('sparkle'); return this.set(this.value + n); }
}
