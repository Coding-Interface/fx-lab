/**
 * CardsScene — collectible card moments:
 *   fx.card + card.flip + fx.reveal    flip a card and play its rarity effect
 *   fx.lock + unlock()                  a locked card breaks free
 *   fx.legendaryReveal                  the full gacha reveal
 *   fx.openPack                         booster pack with rarity tells
 */
class CardsScene extends Phaser.Scene {
  constructor() { super('CardsScene'); }

  create() {
    const { width, height } = this.scale;
    new Button(this, 80, 34, '◀ Menu', () => this.fx.goto('Menu', {}, { type: 'blinds' }), { width: 120, height: 40, size: 16 });
    this.add.text(width / 2, 70, 'Click a card to flip it', { fontFamily: '"Trebuchet MS", sans-serif', fontSize: '18px', color: '#c9c2ef' }).setOrigin(0.5);

    const deck = [['card-purrfect', 'common'], ['card-bee', 'rare'], ['card-guac', 'epic']];
    deck.forEach(([key, rarity], i) => {
      const card = this.fx.card(200 + i * 190, 260, key, null, { width: 160 });
      card.setInteractive({ useHandCursor: true });
      card.on('pointerdown', async () => {
        if (card.faceUp) return;
        await card.flip();
        this.fx.reveal(card, rarity);
      });
    });

    // a locked card
    this.lockedImg = this.add.image(width - 170, 260, 'card-sun').setDisplaySize(160, 225);
    this.locked = this.fx.lock(this.lockedImg);
    new Button(this, width - 170, 410, 'Unlock', async (b) => { b.setVisible(false); await this.locked.unlock(); }, { width: 140, height: 44, size: 17 });

    new Button(this, width / 2 - 140, height - 60, 'Legendary reveal', async () => {
      const r = await this.fx.legendaryReveal({ front: 'card-sun', title: 'SUN-SATIONAL!' });
      if (r) { await this.fx.wait(1500); r.destroy(); }
    }, { width: 240, height: 50, size: 18 });
    new Button(this, width / 2 + 140, height - 60, 'Open a pack', async () => {
      const pack = await this.fx.openPack([
        { front: 'card-purrfect', rarity: 'common' }, { front: 'card-bee', rarity: 'rare' },
        { front: 'card-guac', rarity: 'epic' }, { front: 'card-sun', rarity: 'legendary' }
      ]);
      if (pack) { await this.fx.wait(1500); pack.destroy(); }
    }, { width: 240, height: 50, size: 18 });
  }
}
