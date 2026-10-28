/**
 * BattleScene — a tiny clicker battle:
 *   fx.hit + fx.healthBar      hit flash, knockback, damage numbers, ghost health
 *   fx.impact + fx.coins       defeat explosion, coins fly to the HUD
 *   fx.fire, fx.weather        ambience
 *   fx.portal + fx.transition  the exit
 */
class BattleScene extends Phaser.Scene {
  constructor() { super('BattleScene'); }

  create() {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height - 60, width, 120, 0x141a2e);
    new Button(this, 80, 34, '◀ Menu', () => this.fx.goto('Menu', {}, { type: 'wipe' }), { width: 120, height: 40, size: 16 });

    // HUD: coins
    this.coins = 0;
    this.coinIcon = this.add.image(width - 120, 34, 'pfx-coin').setScale(0.8);
    this.coinText = this.add.text(width - 96, 34, '0', { fontFamily: '"Trebuchet MS", sans-serif', fontSize: '26px', color: '#ffc94a', fontStyle: 'bold' }).setOrigin(0, 0.5);

    // ambience: torches + light rain
    this.fx.fire(110, height - 120, { size: 0.55, smoke: 3 });
    this.fx.fire(width - 110, height - 120, { size: 0.55, smoke: 3 });
    this.rain = this.fx.weather('rain', { amount: 3, wind: 40, ground: height - 100, lightning: false });

    this.hero = this.add.image(250, height - 120, 'fox').setOrigin(0.5, 1);
    this.spawnSlime();
    this.add.text(width / 2, 90, 'Click the slime! (some hits are critical)', { fontFamily: '"Trebuchet MS", sans-serif', fontSize: '18px', color: '#c9c2ef' }).setOrigin(0.5);
    new Button(this, width / 2, height - 30, 'Gust of wind', () => this.rain.gust(), { width: 170, height: 38, size: 15 });
  }

  spawnSlime() {
    const { width, height } = this.scale;
    this.slime = this.add.image(width / 2 + 160, height - 120, 'slime').setOrigin(0.5, 1).setScale(1.2).setInteractive({ useHandCursor: true });
    this.hp = this.fx.healthBar(0, -24, { follow: this.slime, width: 140, height: 14, max: 100 });
    this.slime.on('pointerdown', (p) => this.attack(p));
    this.slime.setScale(0.2, 2).setY(height - 320);
    this.tweens.add({ targets: this.slime, y: height - 120, scaleX: 1.2, scaleY: 1.2, duration: 600, ease: 'Bounce.easeOut' });
  }

  async attack(pointer) {
    if (!this.slime || this.hp.value <= 0) return;
    const target = this.slime;
    const crit = Math.random() < 0.25;
    const damage = Phaser.Math.Between(8, 16) * (crit ? 2 : 1);
    this.tweens.killTweensOf(this.hero);
    this.hero.x = 250;
    this.tweens.add({ targets: this.hero, x: 280, duration: 80, yoyo: true });
    this.hp.damage(damage);
    await this.fx.hit(target, { damage, crit, fromX: this.hero.x, x: pointer.worldX, y: pointer.worldY });
    if (this.hp.value <= 0) this.defeat();
  }

  async defeat() {
    if (!this.slime) return; // several hits can land on the final frame
    const s = this.slime;
    this.slime = null;
    const { x, y } = s;
    this.hp.destroy();
    await this.fx.impact(x, y - 50, { power: 1, color: 0x9dffcf });
    this.tweens.add({ targets: s, scaleX: 2, scaleY: 0.1, alpha: 0, duration: 200, onComplete: () => s.destroy() });
    this.fx.floatText(x, y - 160, 'Defeated!', '#9dffcf', 30);
    await this.fx.coins({ x, y: y - 50 }, this.coinIcon, { count: 10, onEach: () => this.coinText.setText(String(++this.coins)) });
    if (!this.portal) {
      this.portal = this.fx.portal(this.scale.width - 220, 260, { radius: 70, palette: 'green' });
      const hit = this.add.circle(this.scale.width - 220, 260, 70, 0, 0).setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => { this.portal.pulse(); this.fx.goto('StoryScene', {}, { type: 'iris', x: hit.x, y: hit.y }); });
      this.fx.say(this.scale.width - 220, 360, 'A portal! Click it to travel.', { hold: 2500 });
    }
    await this.fx.wait(800);
    this.spawnSlime();
  }
}
