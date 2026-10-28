/** Fade — the screen fills with a colour. Time passes; a calm scene change. */
class FadeStyle extends TransitionStyle {
  static id = 'fade';
  static defaultSound = 'whoosh';
  static label = 'Fade';
  static description = 'Fade to a colour and back. Best for "time passes" and calm scene changes.';
  static params = [];

  setup() {
    this.rect = this.add(this.scene.add.rectangle(this.w / 2, this.h / 2, this.w * 3, this.h * 3, this.color).setAlpha(0));
  }

  render(t) { this.rect.setAlpha(t); }
}
