/**
 * Pixelate — the picture breaks into growing pixels, then fades. WebGL uses the
 * camera's pixelate filter; Canvas falls back to a fade.
 */
class PixelateStyle extends TransitionStyle {
  static id = 'pixelate';
  static defaultSound = 'glitch';
  static label = 'Pixelate';
  static requires = ['postFX'];
  static description = 'The picture breaks into big pixels, then fades. Retro and game-y. Needs WebGL camera effects; other devices play the fallback.';
  static params = [
    { key: 'amount', label: 'Max pixel size', type: 'number', min: 4, max: 80, step: 1, default: 36 },
    { key: 'fadeFrom', label: 'Fade starts at', type: 'number', min: 0, max: 1, step: 0.05, default: 0.55 }
  ];

  setup() {
    const cam = this.scene.cameras.main;
    this.rect = this.add(this.scene.add.rectangle(this.w / 2, this.h / 2, this.w * 3, this.h * 3, this.color).setAlpha(0));
    if (cam.postFX && this.scene.game.renderer.type === Phaser.WEBGL && Device.has('postFX') && !Settings.reducedMotion) this.px = cam.postFX.addPixelate(0);
  }

  render(t) {
    if (this.px) this.px.amount = t * this.p.amount;
    const f = this.px ? this.p.fadeFrom : 0;
    this.rect.setAlpha(Phaser.Math.Clamp((t - f) / Math.max(0.0001, 1 - f), 0, 1));
  }

  destroy() {
    const cam = this.scene.cameras && this.scene.cameras.main;
    if (this.px && cam && cam.postFX) cam.postFX.remove(this.px);
    super.destroy();
  }
}
