/**
 * LabScene — hosts one effect at a time. Changing effect or a slider restarts
 * the scene with new data, which is the simplest way to guarantee a clean slate.
 */
class LabScene extends Phaser.Scene {
  constructor() { super('LabScene'); }

  init(data) {
    this.effectId = data.effectId || EffectRegistry.list[0].id;
    this.values = data.params || {};
    this.autoStart = !!data.autoPlay;
  }

  create() {
    FXTextures.generate(this);
    CardArt.generate(this);
    UIArt.generate(this);
    this.cameras.main.setZoom(1).resetFX();
    this.add.image(480, 300, 'lab-bg').setDepth(-1000);

    const Effect = EffectRegistry.get(this.effectId);
    this.effect = new Effect(this, this.values);
    this.effect.start();
    Juice.applyTimeScale(this, Juice.timeScale);
    if (this.autoStart) this.effect.autoPlay();

    this.input.on('pointerdown', (p) => this.effect.play(p.x, p.y));
    this.input.on('pointermove', (p) => this.effect.pointerMove(p));
    this.events.once('shutdown', () => { this.effect.destroy(); this.input.off('pointerdown'); this.input.off('pointermove'); });
    this.game.events.emit('lab-ready', this.effect);
  }

  /** Restart the current effect (used by "Replay" and by card effects to reset). */
  restartEffect(autoPlay = true) {
    this.scene.restart({ effectId: this.effectId, params: this.values, autoPlay });
  }

  update(time, delta) {
    if (this.effect) this.effect.update(time, delta);
  }
}
