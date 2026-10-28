/**
 * MenuScene — picks an example. Shows fx.goto() with named transition presets,
 * fx.confettiRain() and fx.trail('pointer').
 */
class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    ExampleArt.generate(this);
    const { width, height } = this.scale;
    this.add.text(width / 2, 90, 'PhaserFX', { fontFamily: '"Trebuchet MS", sans-serif', fontSize: '56px', color: '#ffc94a', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(width / 2, 140, 'Plug-and-play effects for any Phaser 3 game', { fontFamily: '"Trebuchet MS", sans-serif', fontSize: '18px', color: '#c9c2ef' }).setOrigin(0.5);

    const items = [
      ['Quiz', 'QuizScene', 'Answer feedback, streak, timer, XP, stars, badge', 'Circle Iris'],
      ['Battle', 'BattleScene', 'Hits, damage numbers, health, coins, fire, portal', 'Diagonal Wipe'],
      ['Cards', 'CardsScene', 'Flip, rarity reveal, unlock, legendary, packs', 'Checker Diagonal'],
      ['Story', 'StoryScene', 'Chapter title, dialogue, emotes, day/night, spotlight', 'Theatre Curtain'],
      ['Transitions', 'TransitionsScene', '24 scene transitions, particle and effect presets', 'Mystery Shutter']
    ];
    items.forEach(([label, key, desc, type], i) => {
      const y = 215 + i * 70;
      new Button(this, width / 2 - 170, y, label, (b) => this.fx.goto(key, {}, type, { x: b.x, y: b.y }), { width: 200 });
      this.add.text(width / 2 - 50, y, desc, { fontFamily: '"Trebuchet MS", sans-serif', fontSize: '15px', color: '#9b93c4' }).setOrigin(0, 0.5);
    });
    this.add.text(width / 2, height - 30, 'Every effect here is one line of code: see the README.', { fontFamily: '"Trebuchet MS", sans-serif', fontSize: '13px', color: '#6f689a' }).setOrigin(0.5);

    this.fx.confettiRain({ density: 2 });
    this.fx.trail('pointer', { density: 4 });
  }
}
