/**
 * Button — a simple rounded button for the examples, made juicy with PhaserFX:
 * it pops when pressed and grows a little on hover.
 */
class Button extends Phaser.GameObjects.Container {
  constructor(scene, x, y, label, onClick, o = {}) {
    super(scene, x, y);
    const w = o.width || 220;
    const h = o.height || 56;
    this.bg = scene.add.graphics();
    this.color = o.color || 0x2a2056;
    this.edge = o.edge || 0x4a3f8c;
    this.w = w;
    this.h = h;
    this.draw(this.color);
    this.label = scene.add.text(0, 0, label, { fontFamily: '"Trebuchet MS", sans-serif', fontSize: `${o.size || 20}px`, color: o.textColor || '#ece8ff', fontStyle: 'bold' }).setOrigin(0.5);
    this.add([this.bg, this.label]);
    this.setSize(w, h);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerover', () => { scene.tweens.add({ targets: this, scale: 1.05, duration: 120 }); this.draw(Phaser.Display.Color.ValueToColor(this.color).lighten(10).color); });
    this.on('pointerout', () => { scene.tweens.add({ targets: this, scale: 1, duration: 120 }); this.draw(this.color); });
    this.on('pointerdown', () => { if (scene.fx) scene.fx.pop(this, 0.12, 240); if (onClick) onClick(this); });
    scene.add.existing(this);
  }

  draw(fill) {
    const { w, h } = this;
    this.bg.clear().fillStyle(0x07050f, 0.5).fillRoundedRect(-w / 2, -h / 2 + 5, w, h, 16)
      .fillStyle(fill, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 16).lineStyle(2, this.edge, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 16);
  }

  setText(t) { this.label.setText(t); return this; }
}
