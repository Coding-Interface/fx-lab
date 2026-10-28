/** Zoom — the camera dives in (optionally spinning) through a flash of colour. */
class ZoomStyle extends TransitionStyle {
  static id = 'zoom';
  static defaultSound = 'riser';
  static label = 'Zoom / spin';
  static description = 'The camera dives in, optionally spinning, through a flash of colour. Reduced motion keeps just the fade.';
  static defaultColor = '#ffffff';
  static params = [
    { key: 'zoom', label: 'Zoom amount', type: 'number', min: 0, max: 3, step: 0.05, default: 0.6 },
    { key: 'spin', label: 'Spin (°)', type: 'number', min: -360, max: 360, step: 5, default: 0 },
    { key: 'fadeFrom', label: 'Fade starts at', type: 'number', min: 0, max: 1, step: 0.05, default: 0.3 }
  ];

  setup() {
    this.cam = this.scene.cameras.main;
    this.z0 = this.cam.zoom;
    this.r0 = this.cam.rotation;
    this.rect = this.add(this.scene.add.rectangle(this.w / 2, this.h / 2, this.w * 4, this.h * 4, this.color).setAlpha(0));
  }

  render(t) {
    if (!Settings.reducedMotion) {
      this.cam.setZoom(this.z0 * (1 + this.p.zoom * t));
      this.cam.setRotation(this.r0 + Phaser.Math.DegToRad(this.p.spin) * t);
    }
    const f = this.p.fadeFrom;
    this.rect.setAlpha(Phaser.Math.Clamp((t - f) / Math.max(0.0001, 1 - f), 0, 1));
  }

  destroy() {
    if (this.cam) { this.cam.setZoom(this.z0); this.cam.setRotation(this.r0); }
    super.destroy();
  }
}
