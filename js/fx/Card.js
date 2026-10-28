/**
 * Card — a container with a soft shadow and a face image that can flip.
 *
 * LESSON: a 2D card flip is a FAKE 3D flip. Squash scaleX to 0, swap the
 * texture while it is edge-on (invisible), then stretch back to full width.
 * What makes it feel physical is everything AROUND that:
 *   - lift the card (y up) and grow/fade its shadow, as if it leaves the table
 *   - ease in to the edge (Cubic.In) and overshoot out of it (Back.Out)
 *   - a little tilt and a sound on the swap frame
 */
class Card extends Phaser.GameObjects.Container {
  constructor(scene, x, y, frontKey, { faceUp = false, backKey = 'card-back' } = {}) {
    super(scene, x, y);
    this.frontKey = frontKey;
    this.backKey = backKey;
    this.faceUp = faceUp;
    this.homeY = y;
    this.shadow = scene.add.image(10, 16, 'card-shadow').setAlpha(0.8);
    this.face = scene.add.image(0, 0, faceUp ? frontKey : backKey);
    this.add([this.shadow, this.face]);
    this.setSize(CardArt.W, CardArt.H);
    scene.add.existing(this);
  }

  contains(x, y) {
    const w = CardArt.W * Math.abs(this.scaleX || 1) * 0.5;
    const h = CardArt.H * this.scaleY * 0.5;
    return Math.abs(x - this.x) < w && Math.abs(y - this.y) < h;
  }

  setFaceUp(up) {
    this.faceUp = up;
    this.face.setTexture(up ? this.frontKey : this.backKey);
    return this;
  }

  /**
   * Flip with options so you can compare "flat", "eased" and "juicy" side by side.
   *   juicy: lift + shadow + tilt     eased: Cubic in / Back out (defaults to juicy)
   * @returns {Promise} resolves when the card has landed
   */
  async flip({ duration = 460, juicy = true, eased = juicy, lift = 28, sound = true } = {}) {
    if (this.flipping) return;
    this.flipping = true;
    const scene = this.scene;
    const half = duration / 2;
    const sx = Math.abs(this.scaleX) || 1;

    if (juicy) {
      scene.tweens.add({ targets: this, y: this.homeY - lift, angle: Phaser.Math.Between(-5, 5), duration: half, ease: 'Sine.easeOut', yoyo: true, hold: 30 });
      scene.tweens.add({ targets: this.shadow, x: 22, y: 34, alpha: 0.35, scale: 1.08, duration: half, ease: 'Sine.easeOut', yoyo: true, hold: 30 });
    }
    await Juice.tween(scene, { targets: this, scaleX: 0, duration: half, ease: eased ? 'Cubic.easeIn' : 'Linear' });
    this.setFaceUp(!this.faceUp);
    if (sound) Juice.sfx('flip');
    await Juice.tween(scene, { targets: this, scaleX: sx, duration: half, ease: eased ? 'Back.easeOut' : 'Linear' });
    if (juicy) await Juice.wait(scene, 40);
    this.angle = 0;
    this.flipping = false;
  }
}
