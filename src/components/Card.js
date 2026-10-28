/**
 * Card — a two-sided card with a soft shadow that flips with lift and tilt.
 *   const card = this.fx.card(400, 300, 'my-card-front');            // back defaults to a built-in back
 *   const card = this.fx.card(400, 300, 'front', 'back', { faceUp: false, width: 180 });
 *   await card.flip();          card.faceUp
 * Works with any texture size. It is a normal Container: move, scale, add to
 * other containers, make it interactive, etc.
 */
class Card extends Phaser.GameObjects.Container {
  constructor(fx, x, y, frontKey, backKey = 'pfx-card-back', o = {}) {
    super(fx.scene, x, y);
    this.fx = fx;
    this.frontKey = frontKey;
    this.backKey = backKey || 'pfx-card-back';
    this.faceUp = !!o.faceUp;
    this.shadow = fx.scene.add.image(10, 16, 'pfx-card-shadow').setAlpha(o.shadow === false ? 0 : 0.8);
    this.face = fx.scene.add.image(0, 0, this.faceUp ? frontKey : this.backKey);
    this.add([this.shadow, this.face]);
    this.fitTo(o.width, o.height);
    this.setDepth(o.depth != null ? o.depth : fx.juice.depth(50));
    fx.scene.add.existing(this);
    if (o.screen) this.setScrollFactor(0, 0, true);
  }

  /** Make both faces the same display size (front decides unless width/height are given). */
  fitTo(width, height) {
    const fr = this.scene.textures.getFrame(this.frontKey);
    const w = width || (fr ? fr.width : 220);
    const h = height || (fr ? (fr.height * w) / fr.width : 310);
    this.cardW = w;
    this.cardH = h;
    this.face.setDisplaySize(w, h);
    this.shadow.setDisplaySize(w * (280 / 220), h * (370 / 310));
    this.setSize(w, h);
    return this;
  }

  setFaceUp(up) {
    this.faceUp = up;
    this.face.setTexture(up ? this.frontKey : this.backKey);
    this.face.setDisplaySize(this.cardW, this.cardH);
    return this;
  }

  /** Flip (options: duration, juicy, lift, sound). Resolves when it lands. */
  flip(o = {}) {
    return CardFX.flip(this.fx, this, { ...o, swap: () => this.setFaceUp(!this.faceUp) });
  }

  /** Is a world (or screen, for screen cards) point over the card? */
  contains(x, y) {
    return Math.abs(x - this.x) < (this.cardW * Math.abs(this.scaleX || 1)) / 2 && Math.abs(y - this.y) < (this.cardH * this.scaleY) / 2;
  }
}
