/**
 * Example game boot. The one line that matters for PhaserFX is the plugins
 * entry: every scene now has this.fx.
 */
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 960,
  height: 600,
  backgroundColor: '#130e26',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [MenuScene, QuizScene, BattleScene, CardsScene, StoryScene, TransitionsScene],
  plugins: { scene: [PhaserFX.plugin] }   // ← PhaserFX: this.fx in every scene
});
window.game = game;
