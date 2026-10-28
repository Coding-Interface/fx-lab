/**
 * StoryScene — a short story beat:
 *   fx.dayNight        evening light, stars, a glowing window
 *   fx.chapterTitle    cinematic title card
 *   fx.dialogue        typewriter dialogue with portraits and animated words
 *   fx.emote           characters react between lines
 *   fx.weather         falling leaves
 *   fx.spotlight       a "find the stars" mini-game in the dark
 */
class StoryScene extends Phaser.Scene {
  constructor() { super('StoryScene'); }

  create() {
    const { width, height } = this.scale;
    // simple scenery (your game has its own)
    this.add.rectangle(width / 2, height / 2, width, height, 0x8fd3ff);
    this.add.ellipse(220, height + 40, 900, 360, 0x5fae6b);
    this.add.ellipse(760, height + 60, 900, 340, 0x4c9a5c);
    this.add.rectangle(760, 330, 150, 110, 0xe8d6b0);
    this.add.triangle(760, 250, -90, 50, 90, 50, 0, -30, 0xb5523b);
    this.add.rectangle(760, 330, 26, 30, 0x3a2f4a);
    this.fox = this.add.image(300, 470, 'fox').setOrigin(0.5, 1);
    this.owl = this.add.image(470, 470, 'owl').setOrigin(0.5, 1);
    new Button(this, 80, 34, '◀ Menu', () => this.fx.goto('Menu', {}, { type: 'fade' }), { width: 120, height: 40, size: 16 }).setDepth(2000);

    this.sky = this.fx.dayNight({ hour: 16, speed: 0.6, clock: true, fireflies: true });
    this.sky.addLight(760, 330, { radius: 50, at: 0.3 });
    this.leaves = this.fx.weather('leaves', { amount: 2, wind: 30 });
    this.play();
  }

  async play() {
    await this.fx.chapterTitle('The Whispering Woods', { chapter: 'CHAPTER 1', subtitle: 'in which Pip notices something strange', hold: 1400 });
    const talk = this.fx.dialogue({
      speakers: {
        pip: { name: 'Pip', portrait: 'fox', color: '#f08a3c', pitch: 640 },
        moss: { name: 'Moss', portrait: 'owl', color: '#9b7bd0', pitch: 300 }
      }
    });
    this.fx.emote(this.fox, 'surprise');
    await talk.say('pip', 'Psst... did you see that? Something is [wave]glowing[/wave] in the woods!');
    this.fx.emote(this.owl, 'confused');
    await talk.say('moss', 'Hoo? It is getting dark, little one. [shake]Stay close.[/shake]');
    this.fx.emote(this.fox, 'idea');
    await talk.say('pip', 'I know! Let us look for the [color=#ffc94a]fallen stars[/color] with your lantern.');
    this.fx.emote(this.owl, 'happy');
    await talk.say('moss', 'Very well.[pause] Move the light to find all three.');
    talk.destroy();
    this.findStars();
  }

  findStars() {
    const spots = [[150, 200], [620, 140], [880, 470]];
    let found = 0;
    const stars = spots.map(([x, y]) => this.add.image(x, y, 'pfx-star5').setScale(0.35));
    const torch = this.fx.spotlight({ follow: 'pointer', radius: 120, darkness: 0.93 });
    const counter = this.add.text(this.scale.width / 2, 90, 'Found 0 / 3', { fontFamily: '"Trebuchet MS", sans-serif', fontSize: '22px', color: '#ffc94a', fontStyle: 'bold' }).setOrigin(0.5).setDepth(5000);
    stars.forEach((s) => torch.watch(s, async () => {
      found += 1;
      counter.setText(`Found ${found} / 3`);
      this.fx.pop(counter);
      if (found === stars.length) {
        await torch.lightUp(900);
        torch.destroy();
        this.fx.emote(this.fox, 'love');
        this.fx.confetti();
        counter.setText('You found every star!');
      }
    }));
  }
}
