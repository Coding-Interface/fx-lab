/**
 * StageScene — the one Phaser scene behind every editor's preview. Editors
 * drive it: background, two story scenes, a target object, a crosshair, and
 * pointer callbacks. Effects play through this.fx exactly as in a game.
 */
class StageScene extends Phaser.Scene {
  constructor() { super('Stage'); }

  create() {
    StageArt.generate(this);
    this.bg = this.add.image(480, 300, 'stage-dark').setDepth(-1000);
    this.sceneA = this.add.image(480, 300, 'stage-a').setDepth(-900).setVisible(false);
    this.sceneB = this.add.image(480, 300, 'stage-b').setDepth(-900).setVisible(false);
    this.cross = this.add.graphics().setDepth(5000).setVisible(false);
    this.cross.lineStyle(1.5, 0xf5b544, 0.9).strokeCircle(0, 0, 10).lineBetween(-16, 0, -5, 0).lineBetween(5, 0, 16, 0).lineBetween(0, -16, 0, -5).lineBetween(0, 5, 0, 16);
    this.handlers = {};
    this.input.on('pointerdown', (p) => this.handlers.down && this.handlers.down(p));
    this.input.on('pointermove', (p) => this.handlers.move && this.handlers.move(p));
    this.input.on('pointerup', (p) => this.handlers.up && this.handlers.up(p));
    this.events.on('update', (t, d) => this.handlers.update && this.handlers.update(t, d));
    this.game.events.emit('stage-ready', this);
  }

  /** Reset to a blank stage for an editor. */
  reset() {
    this.handlers = {};
    this.tweens.killAll();
    this.clearTimers();
    this.cameras.main.setZoom(1).setRotation(0).resetFX();
    if (this.cameras.main.postFX) this.cameras.main.postFX.clear();
    this.fx.setTimeScale(1);
    this.children.list.slice().forEach((o) => { if (![this.bg, this.sceneA, this.sceneB, this.cross].includes(o)) o.destroy(); });
    this.sceneA.setVisible(false);
    this.sceneB.setVisible(false);
    this.cross.setVisible(false);
    this.target = null;
  }

  /** Remove everything a previous preview left behind, keep the editor's handlers. */
  clearFx(speed = 1, keep = []) {
    this.tweens.killAll();
    this.clearTimers();
    const cam = this.cameras.main;
    cam.setZoom(1).setRotation(0).resetFX();
    if (cam.postFX) cam.postFX.clear();
    this.children.list.slice().forEach((o) => { if (![this.bg, this.sceneA, this.sceneB, this.cross, ...keep].includes(o)) o.destroy(); });
    if (this.target && !keep.includes(this.target)) this.target = null;
    this.fx.setTimeScale(speed);
  }

  /** removeAllEvents() misses timers added this frame, so drop those too. */
  clearTimers() {
    const T = this.time;
    T.removeAllEvents();
    if (Array.isArray(T._pendingInsertion)) { T._pendingInsertion.forEach((e) => e.destroy && e.destroy()); T._pendingInsertion.length = 0; }
  }

  setBackground(key) { this.bg.setTexture(key); }

  showStory(which = 'a') {
    this.sceneA.setVisible(which === 'a');
    this.sceneB.setVisible(which === 'b');
    this.story = which;
  }

  swapStory() { this.showStory(this.story === 'a' ? 'b' : 'a'); }

  setCross(x, y, visible = true) { this.cross.setPosition(x, y).setVisible(visible); }

  /** Put a stand-in target (card, character…) at the centre, fresh each time. */
  setTarget(key, x = 480, y = 300) {
    if (this.target) { this.tweens.killTweensOf(this.target); this.target.destroy(); }
    this.target = null;
    if (!key || key === 'none') return null;
    this.target = this.add.image(x, y, key).setDepth(500);
    return this.target;
  }
}
