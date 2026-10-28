/**
 * RarityFX — the "effect budget" for card reveals.
 *
 * LESSON: if every card explodes, nothing feels special. Decide a budget per
 * tier and only ADD layers as rarity goes up:
 *
 *   common     pop + puff                         (~0.3 s, quiet)
 *   rare       + blue sparkles + ring             (~0.6 s)
 *   epic       + purple burst + rays + glow       (~1.0 s)
 *   legendary  + hit-stop + flash + shake + stamp (~1.6 s, the full show)
 *
 * Returns the long-lived objects it created (rays, glows) so callers can clean up.
 */
class RarityFX {
  static play(scene, card, rarity) {
    const R = CardArt.RARITY[rarity] || CardArt.RARITY.common;
    const x = card.x;
    const y = card.y;
    const keep = [];
    const depth = (card.depth || 0) + 1;

    // Every tier: squash pop + soft puff
    Juice.pop(scene, card, 0.12, 320);
    Juice.burst(scene, x, y, 'fx-smoke', {
      speed: { min: 40, max: 120 }, scale: { start: 0.5, end: 1.4 }, alpha: { start: 0.35, end: 0 },
      lifespan: 600, tint: 0xd8dcf0, rotate: { min: 0, max: 360 }
    }, 10, depth - 2);

    if (R.rank === 0) { Juice.sfx('pop'); return keep; }

    // Rare and up: sparkles + ring
    Juice.sfx('sparkle');
    Juice.shockwave(scene, x, y, R.color, 2.2, 520, depth);
    Juice.burst(scene, x, y, 'fx-star', {
      speed: { min: 80, max: 260 }, scale: { start: 0.7, end: 0 }, lifespan: { min: 500, max: 900 },
      rotate: { min: -180, max: 180 }, color: [0xffffff, R.color], blendMode: 'ADD', gravityY: 60
    }, 18 + R.rank * 12, depth);

    if (R.rank === 1) return keep;

    // Epic and up: rays behind, glow, bigger burst
    const rays = Juice.rays(scene, x, y, R.color, 14, depth - 3);
    scene.tweens.add({ targets: rays, scale: R.rank === 3 ? 1.15 : 0.8, duration: 500, ease: 'Back.easeOut' });
    keep.push(rays);
    const glow = Juice.glow(scene, card.face, R.color, 2);
    glow.pulse(2, 6, 800);
    keep.push(glow);
    Juice.burst(scene, x, y, 'fx-dot', {
      speed: { min: 200, max: 520 }, scale: { start: 0.9, end: 0 }, lifespan: { min: 600, max: 1100 },
      color: [0xffffff, R.color, 0xff5fa2], blendMode: 'ADD', gravityY: 260
    }, 60, depth);
    Juice.shake(scene, 140, 0.004);

    if (R.rank === 2) { Juice.sfx('chime'); return keep; }

    // Legendary: the full show
    Juice.flash(scene, 220, 0xffe7a0, 0.7);
    Juice.shake(scene, 260, 0.008);
    Juice.shockwave(scene, x, y, 0xffffff, 3.4, 700, depth);
    Juice.sfx('fanfare');
    Juice.floatText(scene, x, y - CardArt.H * 0.62, 'LEGENDARY!', '#ffc94a', 30);
    return keep;
  }
}
