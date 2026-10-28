/**
 * CardFlip — the same flip three ways, side by side.
 *
 *   Flat    Linear easing, no lift, no sound           (works, feels like a slideshow)
 *   Eased   Cubic in / Back out                        (already much better)
 *   Juicy   eased + lift + shadow + tilt + sound + sparkle on land
 *
 * Click each card and compare. This is the whole idea of "juice": the logic is
 * identical, only the presentation changes.
 */
class CardFlip extends BaseEffect {
  static id = 'flip';
  static title = 'Card Flip: flat vs juicy';
  static group = 'cards';
  static tags = ['games', 'learning'];
  static useFor = 'Memory/matching games, flashcards, revealing an answer, turn-based card games.';
  static mode = 'cards';
  static hint = 'Click a card to flip it. Replay flips all three.';
  static file = 'js/effects/CardFlip.js';
  static uses = ['js/fx/Card.js', 'js/fx/Juice.js', 'js/fx/CardArt.js'];
  static summary = 'One flip, three levels of polish. The logic is the same, only the presentation changes. That difference is what "juice" means.';
  static steps = [
    'Fake 3D: tween scaleX to 0, swap the texture while edge-on, tween scaleX back.',
    'Easing: Cubic.easeIn into the edge (accelerating), Back.easeOut out of it (overshoot).',
    'Lift: the card rises while flipping and its shadow drifts away and fades, as if it left the table.',
    'Tilt: a random ±5° angle during the flip breaks the perfectly mechanical look.',
    'Land: a small squash pop plus a few sparkles and a sound on the swap frame.'
  ];
  static params = [
    { key: 'duration', label: 'Flip time (ms)', min: 150, max: 1500, step: 10, value: 460 },
    { key: 'lift', label: 'Lift (px)', min: 0, max: 80, step: 1, value: 28 }
  ];

  start() {
    const s = this.scene;
    const y = this.cy - 10;
    const keys = ['card-purrfect', 'card-bee-happy', 'card-holy-guac'];
    this.cards = [this.cx - 270, this.cx, this.cx + 270].map((x, i) => this.track(new Card(s, x, y, keys[i]).setScale(0.92)));
    this.cards.forEach((c) => { c.homeY = y; });
    this.label(this.cx - 270, y + 172, 'FLAT', '#9b93c4', 16);
    this.label(this.cx, y + 172, 'EASED', '#ece8ff', 16);
    this.label(this.cx + 270, y + 172, 'JUICY', '#ffc94a', 16);
    this.label(this.cx - 270, y + 194, 'Linear, no lift', '#6f689a', 12);
    this.label(this.cx, y + 194, 'Cubic in · Back out', '#6f689a', 12);
    this.label(this.cx + 270, y + 194, 'eased + lift + tilt + sparkle', '#6f689a', 12);
  }

  autoPlay() {
    this.cards.forEach((c, i) => this.scene.time.delayedCall(250 + i * 650, () => this.flipCard(i)));
  }

  play(x, y) {
    const i = this.cards.findIndex((c) => c.contains(x, y));
    if (i >= 0) this.flipCard(i);
  }

  async flipCard(i) {
    const card = this.cards[i];
    if (card.flipping) return;
    const d = this.p.duration;
    if (i === 0) {
      await card.flip({ duration: d, juicy: false, sound: false });
    } else if (i === 1) {
      await card.flip({ duration: d, juicy: false, eased: true, sound: false });
    } else {
      await card.flip({ duration: d, juicy: true, lift: this.p.lift });
      Juice.pop(this.scene, card, 0.06, 260);
      Juice.burst(this.scene, card.x, card.y - 40, 'fx-star', {
        speed: { min: 60, max: 200 }, lifespan: 600, scale: { start: 0.6, end: 0 },
        rotate: { min: 0, max: 360 }, color: [0xffffff, 0xffd86b], blendMode: 'ADD'
      }, 14, 30);
    }
  }
}
