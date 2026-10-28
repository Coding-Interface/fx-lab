/**
 * TransitionsScene — every built-in transition, plus particle and effect
 * presets, each one line of code. Also shows a custom preset made in
 * PhaserFX Studio (plain JSON) registered with PhaserFX.presets.add().
 */
class TransitionsScene extends Phaser.Scene {
  constructor() { super('TransitionsScene'); }

  /** A preset exactly as PhaserFX Studio exports it. */
  static SUNSET_IRIS = {
    format: 'phaserfx-transition', version: 1, name: 'Sunset Iris', style: 'iris', duration: 1000, hold: 1300,
    color: '#2b0f2e', easeIn: 'Quart.easeIn', easeOut: 'Back.easeOut', reveal: 'reverse', sound: 'chime',
    label: 'Later that day…', labelColor: '#ffc94a', labelSize: 34, params: { shape: 'star', spin: 90, pause: 0.12 }
  };

  static MINT_SPARKS = {
    format: 'phaserfx-particles', version: 1, name: 'Mint Sparks',
    layers: [{ name: 'sparks', texture: 'pfx-spark', emit: { count: 36 }, speed: { min: 180, max: 420 }, gravityY: 300,
      lifespan: { min: 400, max: 800 }, scale: { start: 0.8, end: 0 }, rotation: { mode: 'velocity' },
      color: { mode: 'overLife', colors: ['#ffffff', '#7dffc9', '#1f9e7a'] } }]
  };

  create() {
    ExampleArt.generate(this);
    PhaserFX.presets.add([TransitionsScene.SUNSET_IRIS, TransitionsScene.MINT_SPARKS]); // once, by name from now on
    const { width } = this.scale;
    this.room = 0;
    this.roomBg = this.add.graphics();
    this.roomText = this.add.text(width / 2, 345, '', { fontFamily: '"Trebuchet MS", sans-serif', fontSize: '40px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5).setAlpha(0.9);
    this.drawRoom();

    new Button(this, 80, 34, '◀ Menu', () => this.fx.goto('Menu', {}, 'Diagonal Wipe'), { width: 120, height: 40, size: 16 });
    this.add.text(width / 2, 34, 'Transitions & presets', { fontFamily: '"Trebuchet MS", sans-serif', fontSize: '24px', color: '#ffc94a', fontStyle: 'bold' }).setOrigin(0.5);

    const names = [...PhaserFX.presets.list('transitions')];
    names.forEach((name, i) => {
      const col = i % 7;
      const row = Math.floor(i / 7);
      new Button(this, 72 + col * 136, 92 + row * 44, name, (b) => this.go(name, b), { width: 128, height: 36, size: name.length > 14 ? 11 : 13 });
    });

    const label = (y, t) => this.add.text(16, y, t, { fontFamily: '"Trebuchet MS", sans-serif', fontSize: '13px', color: '#9b93c4', fontStyle: 'bold' }).setOrigin(0, 0.5);
    label(470, 'PARTICLES');
    ['Sparkle Burst', 'Explosion', 'Hearts', 'Coin Shower', 'Electric Zap', 'Mint Sparks'].forEach((n, i) => {
      new Button(this, 170 + i * 132, 470, n, () => this.fx.particles(n, 480, 345), { width: 124, height: 34, size: 13, color: 0x1d3b33, edge: 0x2fbf8a });
    });
    label(520, 'EFFECTS');
    this.slime = this.add.image(800, 350, 'slime').setScale(0.9);
    ['Critical Hit', 'Level Up', 'Heal', 'Teleport', 'Victory'].forEach((n, i) => {
      new Button(this, 170 + i * 132, 520, n, async () => {
        this.slime.setAlpha(1).setScale(0.9).setAngle(0);
        await this.fx.play(n, 0, 0, { target: this.slime });
        this.slime.setAlpha(1).setScale(0.9).setAngle(0);
      }, { width: 124, height: 34, size: 13, color: 0x3b1d36, edge: 0xff5fa2 });
    });
    this.add.text(width / 2, 578, 'Make your own in PhaserFX Studio (studio/index.html) and paste the JSON.', { fontFamily: '"Trebuchet MS", sans-serif', fontSize: '13px', color: '#6f689a' }).setOrigin(0.5);
  }

  drawRoom() {
    const rooms = [[0x24305e, 'Room 1 · the hall'], [0x5e2440, 'Room 2 · the garden'], [0x1f5e46, 'Room 3 · the tower']];
    const [c, t] = rooms[this.room % rooms.length];
    this.roomBg.clear().fillStyle(c, 1).fillRect(0, 250, 960, 190);
    this.roomText.setText(t);
  }

  /** One line: cover, swap the room while hidden, reveal. */
  go(name, button) {
    if (this.busy) return;
    this.busy = true;
    this.fx.transition(name, { x: button.x, y: button.y, onCovered: () => { this.room += 1; this.drawRoom(); } })
      .then(() => { this.busy = false; });
  }
}
