/**
 * HitDamage — hit flash, knockback, damage numbers and a health bar with a
 * delayed "ghost" chunk.
 *
 * LESSONS:
 *  - Hit flash = swap to a pre-baked WHITE silhouette for ~2 frames. It works
 *    in WebGL and Canvas, and it is the clearest "I hit it" signal there is.
 *  - Damage numbers pop UP and arc sideways, then fall and fade. Random
 *    offsets stop them stacking into an unreadable pile.
 *  - Crits must look different in 3 ways at once: bigger, a different
 *    colour, and a word ("CRIT!"), plus a brief hit-stop.
 *  - The health bar drops instantly, but a pale "ghost" chunk lingers then
 *    drains. Players can read how much that hit took.
 */
class HitDamage extends BaseEffect {
  static id = 'hit';
  static title = 'Hit & Damage Numbers';
  static group = 'action';
  static tags = ['games'];
  static useFor = 'Combat, boss fights, clicker games, "answer to attack" quiz battles.';
  static mode = 'tap';
  static hint = 'Click the training slime. Some hits are critical.';
  static file = 'js/effects/HitDamage.js';
  static uses = ['js/fx/Juice.js', 'js/fx/UIArt.js'];
  static summary = 'The slime flashes white, squashes away from the hit, spits a damage number and loses health with a lingering ghost chunk. Crits add hit-stop, a bigger yellow number and a shake.';
  static steps = [
    'Flash: setTexture to the white silhouette for 60 ms, then back.',
    'Knockback: squash (scaleX up, scaleY down) and slide 14 px away from the click, spring back with Back.easeOut.',
    'Number: a Text pops to 1.2 scale, arcs up and sideways on two tweens, then falls and fades.',
    'Crit (chance slider): hit-stop, yellow "CRIT!" number at 1.6×, sparks, shake.',
    'Health: the red bar snaps to the new value; the pale ghost bar waits, then eases down to match.',
    'At 0 HP the slime poofs into smoke and coins, then bounces back in at full health.'
  ];
  static params = [
    { key: 'damage', label: 'Base damage', min: 1, max: 60, step: 1, value: 14 },
    { key: 'crit', label: 'Crit chance (%)', min: 0, max: 100, step: 1, value: 25 },
    { key: 'ghost', label: 'Ghost bar delay (ms)', min: 0, max: 1200, step: 50, value: 450 }
  ];

  start() {
    const s = this.scene;
    this.max = 100;
    this.hp = 100;
    this.ghost = 100;
    this.sx = this.cx;
    this.sy = this.cy + 140;
    this.track(s.add.ellipse(this.sx, this.sy + 4, 170, 30, 0x000000, 0.35).setDepth(1));
    this.slime = this.track(s.add.image(this.sx, this.sy, 'ui-slime').setOrigin(0.5, 1).setScale(1.3).setDepth(5));
    this.idle = s.tweens.add({ targets: this.slime, scaleY: 1.38, scaleX: 1.24, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.track(Juice.text(s, this.cx, 66, 'TRAINING SLIME', 14, '#9b93c4', { body: true, weight: '800' }));
    this.bar = this.track(s.add.graphics().setDepth(20));
    this.hpText = this.track(Juice.text(s, this.cx, 132, '', 15, '#ece8ff', { body: true, weight: '800' }).setDepth(21));
    this.drawBar();
  }

  drawBar() {
    const g = this.bar;
    const w = 360;
    const x = this.cx - w / 2;
    const y = 96;
    g.clear();
    g.fillStyle(0x0b0818, 1).fillRoundedRect(x - 4, y - 4, w + 8, 26, 13);
    g.fillStyle(0x2a2250, 1).fillRoundedRect(x, y, w, 18, 9);
    if (this.ghost > 0) g.fillStyle(0xffe0e6, 0.9).fillRoundedRect(x, y, Math.max(18, (w * this.ghost) / this.max), 18, 9);
    if (this.hp > 0) g.fillStyle(0xff5f6d, 1).fillRoundedRect(x, y, Math.max(18, (w * this.hp) / this.max), 18, 9);
    this.hpText.setText(`${Math.ceil(this.hp)} / ${this.max}`);
  }

  autoPlay() {
    [0, 450, 900, 1350].forEach((d, i) => this.scene.time.delayedCall(250 + d, () => this.play(this.sx + (i % 2 ? 40 : -40), this.sy - 70)));
  }

  async play(x, y) {
    const s = this.scene;
    if (this.dead) return;
    if (Math.abs(x - this.sx) > 130 || y < this.sy - 190 || y > this.sy + 20) return;
    const crit = Math.random() * 100 < this.p.crit;
    const dmg = Math.round(this.p.damage * (crit ? 2 : 1) * Phaser.Math.FloatBetween(0.85, 1.15));

    if (crit) { Juice.sfx('crack'); await Juice.hitStop(s, 70); if (!s.sys.isActive()) return; } else Juice.sfx('tone', 180, 0.08, 'square', 0.08, 0, 90);

    // 1. flash white for a few frames
    this.slime.setTexture('ui-slime-white');
    s.time.delayedCall(60, () => this.slime.setTexture('ui-slime'));

    // 2. knockback squash, away from the hit
    const dir = x < this.sx ? 1 : -1;
    this.idle.pause();
    if (this.knock) this.knock.stop(); // stop only the last knockback, not the idle breathing
    this.slime.setScale(1.3).setX(this.sx);
    this.knock = s.tweens.chain({
      targets: this.slime,
      tweens: [
        { scaleX: 1.62, scaleY: 1.0, x: this.sx + dir * 14, duration: 60, ease: 'Quad.easeOut' },
        { scaleX: 1.3, scaleY: 1.3, x: this.sx, duration: 380, ease: 'Back.easeOut' }
      ],
      onComplete: () => { if (!this.dead) this.idle.resume(); }
    });
    Juice.burst(s, x, y, crit ? 'fx-spark' : 'fx-dot', {
      speed: { min: 120, max: crit ? 520 : 300 }, lifespan: 350, scale: { start: crit ? 0.8 : 0.4, end: 0 },
      color: crit ? [0xffffff, 0xffd23f] : [0xffffff, 0x9dffcf], blendMode: 'ADD',
      rotate: { onUpdate: (pt) => Phaser.Math.RadToDeg(Math.atan2(pt.velocityY, pt.velocityX)) }
    }, crit ? 18 : 8, 30);
    if (crit) { Juice.shake(s, 140, 0.006); Juice.shockwave(s, x, y, 0xffd23f, 1.4, 320, 30); }

    // 3. damage number
    this.number(x, y - 20, dmg, crit);

    // 4. health + ghost
    this.hp = Math.max(0, this.hp - dmg);
    if (this.ghostTween) this.ghostTween.stop();
    this.drawBar();
    if (this.ghostTimer) this.ghostTimer.remove();
    this.ghostTimer = s.time.delayedCall(this.p.ghost, () => {
      this.ghostTween = s.tweens.add({ targets: this, ghost: this.hp, duration: 380, ease: 'Cubic.easeOut', onUpdate: () => this.drawBar() });
    });
    if (this.hp <= 0) this.defeat();
  }

  number(x, y, dmg, crit) {
    const s = this.scene;
    const t = Juice.text(s, x + Phaser.Math.Between(-20, 20), y, crit ? `${dmg}!` : String(dmg), crit ? 44 : 30, crit ? '#ffd23f' : '#ffffff', { stroke: '#2a1640', strokeThickness: crit ? 9 : 7 }).setDepth(40).setScale(0.3);
    if (crit) {
      const w = Juice.text(s, t.x, y - 44, 'CRIT!', 16, '#ff8a3d', { stroke: '#2a1640', strokeThickness: 5 }).setDepth(40);
      s.tweens.add({ targets: w, y: w.y - 30, alpha: 0, delay: 400, duration: 400, onComplete: () => w.destroy() });
    }
    const side = Phaser.Math.Between(40, 90) * (Math.random() < 0.5 ? -1 : 1);
    s.tweens.add({ targets: t, scale: crit ? 1.6 : 1.2, duration: 120, ease: 'Back.easeOut', onComplete: () => s.tweens.add({ targets: t, scale: crit ? 1.25 : 1, duration: 120 }) });
    s.tweens.add({ targets: t, x: t.x + side, duration: 800, ease: 'Linear' });
    s.tweens.chain({
      targets: t,
      tweens: [
        { y: y - 70, duration: 280, ease: 'Quad.easeOut' },
        { y: y + 10, alpha: 0, duration: 520, ease: 'Quad.easeIn' }
      ],
      onComplete: () => t.destroy()
    });
  }

  async defeat() {
    const s = this.scene;
    this.dead = true;
    this.idle.pause();
    await Juice.wait(s, 200);
    Juice.sfx('boom');
    Juice.burst(s, this.sx, this.sy - 60, 'fx-smoke', { speed: { min: 60, max: 200 }, lifespan: 800, scale: { start: 0.6, end: 1.6 }, alpha: { start: 0.6, end: 0 }, tint: 0xc8ffe4 }, 14, 30);
    Juice.burst(s, this.sx, this.sy - 60, 'fx-coin', { speed: { min: 200, max: 380 }, angle: { min: -150, max: -30 }, gravityY: 900, lifespan: 1100, scale: 0.6, rotate: { min: 0, max: 360 } }, 10, 31);
    s.tweens.add({ targets: this.slime, scaleX: 2, scaleY: 0.1, alpha: 0, duration: 200, ease: 'Quad.easeIn' });
    Juice.floatText(s, this.sx, this.sy - 160, 'Defeated!', '#9dffcf', 30);
    await Juice.wait(s, 1300);
    if (!s.sys.isActive()) return;
    this.hp = this.max;
    this.ghost = this.max;
    this.drawBar();
    this.slime.setAlpha(1).setScale(0.2, 2).setY(this.sy - 200);
    await Juice.tween(s, { targets: this.slime, y: this.sy, scaleX: 1.3, scaleY: 1.3, duration: 600, ease: 'Bounce.easeOut' });
    Juice.sfx('pop');
    this.dead = false;
    this.idle.resume();
  }
}
