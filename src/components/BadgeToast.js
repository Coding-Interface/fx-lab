/**
 * BadgeToast — "Achievement unlocked" toast with a coin-spinning medal.
 *   await this.fx.badge({ title: 'Curious Mind', description: 'Asked 10 questions', color: '#4fa3ff', glyph: '?' });
 *   await this.fx.badge({ title: 'Boss Slayer', icon: 'my-badge-texture', to: shelfSlotSprite });
 * Options: title, description, color, glyph (or icon = your texture key), hold (ms),
 * spins, to (a game object or {x, y} on screen the medal flies to before the toast leaves).
 */
class BadgeToast {
  static async show(fx, o = {}) {
    const j = fx.juice;
    const sc = fx.scene;
    const { cx } = j.screen();
    const color = o.color || '#ffc94a';
    const key = o.icon || Textures.medal(sc, color, o.glyph || '★');
    const W = o.width || 470;
    const H = 112;
    const depth = j.depth(700);
    const toast = j.ui(sc.add.container(o.x != null ? o.x : cx, -90).setDepth(depth));
    const g = sc.add.graphics();
    g.fillStyle(0x07050f, 0.6).fillRoundedRect(-W / 2, -H / 2 + 6, W, H, 22);
    g.fillStyle(0x241c48, 1).fillRoundedRect(-W / 2, -H / 2, W, H, 22);
    g.lineStyle(2, Phaser.Display.Color.HexStringToColor(color).color, 1).strokeRoundedRect(-W / 2, -H / 2, W, H, 22);
    const medal = sc.add.image(-W / 2 + 64, 4, key);
    const ms = 76 / Math.max(medal.width, medal.height);
    medal.setScale(ms);
    toast.add([g, medal,
      j.text(-W / 2 + 128, -26, o.eyebrow || 'ACHIEVEMENT UNLOCKED', 12, color, { body: true, ox: 0 }),
      j.text(-W / 2 + 128, 2, o.title || 'Achievement', 22, '#ece8ff', { ox: 0 }),
      j.text(-W / 2 + 128, 30, o.description || '', 14, '#9b93c4', { body: true, ox: 0 })]);
    j.ui(toast);
    j.sfx('whoosh');
    await j.tween({ targets: toast, y: o.y != null ? o.y : 72, duration: 420, ease: 'Back.easeOut' });
    if (!sc.sys.isActive()) return;
    j.sfx('chime');
    const spins = o.spins != null ? o.spins : 3;
    for (let k = 0; k < spins && !Settings.reducedMotion; k++) {
      const d = 60 + k * 40;
      await j.tween({ targets: medal, scaleX: 0, duration: d, ease: 'Sine.easeIn' });
      await j.tween({ targets: medal, scaleX: ms, duration: d, ease: 'Sine.easeOut' });
    }
    j.pop(medal, 0.15, 300);
    j.ui(j.burst(toast.x - W / 2 + 64, toast.y + 4, 'pfx-star', { speed: { min: 60, max: 200 }, lifespan: 600, scale: { start: 0.5, end: 0 }, color: [0xffffff, 0xffd86b], blendMode: 'ADD' }, 16, depth + 1));
    j.shine(toast.x, toast.y, W, H, 600, depth + 2, 22, true);
    await j.wait(o.hold || 1600);
    if (!sc.sys.isActive()) return;
    if (o.to) {
      const fly = j.ui(sc.add.image(toast.x - W / 2 + 64, toast.y + 4, key).setScale(ms).setDepth(depth + 3));
      medal.setVisible(false);
      sc.tweens.add({ targets: toast, y: -100, duration: 320, ease: 'Cubic.easeIn', onComplete: () => toast.destroy() });
      j.sfx('whoosh');
      await j.flyTo(fly, null, o.to, { duration: 650, ease: 'Sine.easeInOut', arc: 160 });
      const p = { x: fly.x, y: fly.y };
      fly.destroy();
      j.ui(j.shockwave(p.x, p.y, Phaser.Display.Color.HexStringToColor(color).color, 1.2, 420, depth + 3));
      if (o.to.scene) j.pop(o.to, 0.2, 320);
      j.sfx('pop');
    } else {
      await j.tween({ targets: toast, y: -100, duration: 320, ease: 'Cubic.easeIn' });
      toast.destroy();
    }
  }
}
