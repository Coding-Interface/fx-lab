/**
 * FX — the PhaserFX API for one scene. Normally installed as a scene plugin so
 * every scene gets `this.fx`:
 *
 *   new Phaser.Game({ …, plugins: { scene: [PhaserFX.plugin] } });
 *   // then in any scene:
 *   this.fx.sparks(x, y);
 *
 * Or without the plugin system, inside a scene's create():
 *   this.fx = PhaserFX.create(this);
 *
 * Every method that plays over time returns a Promise, so effects chain with await.
 * Long-lived effects (fire, weather, xpBar, dialogue…) return an object with destroy().
 */
class FX extends Phaser.Plugins.ScenePlugin {
  constructor(scene, pluginManager, pluginKey) {
    super(scene, pluginManager || scene.sys.plugins, pluginKey || 'PhaserFX');
    this.juice = new Juice(scene);
  }

  boot() {
    if (this._booted) return;
    this._booted = true;
    FX.prepareGame(this.scene.sys.game);
    const ev = this.systems.events;
    const onStart = () => { this.juice.timeScale = 1; Textures.ensure(this.scene); }; // pfx-* textures ready before preload/create
    const onCreate = () => this._afterCreate();
    ev.on('start', onStart);
    ev.on('create', onCreate);
    ev.once('destroy', () => { ev.off('start', onStart); ev.off('create', onCreate); });
  }

  _afterCreate() {
    Textures.ensure(this.scene);
    Transition.pending(this);
  }

  /** Once per game: detect the device, start the quality watcher, audio unlock and context-loss handling. */
  static prepareGame(game) {
    if (!game || game.__pfxPrepared) return;
    game.__pfxPrepared = true;
    const ready = () => {
      Device.detect(game);
      Quality.watch(game);
      const r = game.renderer;
      if (r && r.on && Phaser.Renderer && Phaser.Renderer.Events) {
        r.on(Phaser.Renderer.Events.LOSE_WEBGL, () => { if (Device.info) Device.info.contextLost = true; Quality.events.emit('contextlost'); });
        r.on(Phaser.Renderer.Events.RESTORE_WEBGL, () => { if (Device.info) Device.info.contextLost = false; Quality.events.emit('contextrestored'); });
      }
    };
    if (game.renderer) ready(); else game.events.once('ready', ready);
    Synth.unlockOnInput();
  }

  /** Use PhaserFX without the plugin system: call inside create(). */
  static create(scene) {
    const fx = new FX(scene, scene.sys.plugins, 'PhaserFX');
    fx.boot();
    fx._afterCreate();
    return fx;
  }

  _ready() { Textures.ensure(this.scene); return this.juice; }

  get j() { return this._ready(); }

  // ======================================================== core juice
  wait(ms) { return this.j.wait(ms); }
  tween(config) { return this.j.tween(config); }
  /** Slow motion for this scene (1 = normal, 0.25 = quarter speed). */
  setTimeScale(s) { this.j.setTimeScale(s); return this; }
  shake(ms, intensity) { this.j.shake(ms, intensity); return this; }
  flash(ms, color, alpha) { this.j.flash(ms, color, alpha); return this; }
  hitStop(ms) { return this.j.hitStop(ms); }
  pop(target, amount, ms) { return this.j.pop(target, amount, ms); }
  wiggle(target, px, times) { return this.j.wiggle(target, px, times); }
  glow(target, color, strength) { return this.j.glow(target, color, strength); }
  rays(x, y, color, count, depth) { return this.j.rays(x, y, color, count, depth); }
  shockwave(x, y, color, size, ms, depth) { return this.j.shockwave(x, y, color, size, ms, depth); }
  /** Shine sweep over a game object, or over a rectangle { x, y, width, height } (centre-based). */
  shine(target, o = {}) {
    const j = this.j;
    const c = target.getBounds ? j.centerOf(target) : { x: target.x, y: target.y, w: target.width, h: target.height };
    return j.shine(c.x, c.y, c.w, c.h, o.duration || 700, o.depth != null ? o.depth : (target.getBounds ? j.above(target, 5) : j.depth(20)), o.radius != null ? o.radius : 16, target.getBounds ? j.isScreen(target) : !!o.screen);
  }
  floatText(x, y, text, color, size, o) { return this.j.floatText(x, y, text, color, size, o); }
  countUp(textObj, from, to, ms, format) { return this.j.countUp(textObj, from, to, ms, format); }
  burst(x, y, texture, config, count, depth) { return this.j.burst(x, y, texture, config, count, depth); }
  flyTo(objOrTexture, from, to, o) { return this.j.flyTo(objOrTexture, from, to, o); }
  sound(name, ...args) { Synth.play(name, ...args); return this; }

  // ======================================================== particles
  sparks(x, y, o) { this._ready(); Particles.sparks(this, x, y, o); return this; }
  confetti(o) { this._ready(); Particles.confetti(this, o); return this; }
  confettiRain(o) { this._ready(); return new ConfettiRain(this, o); }
  fireworks(x, y, o) { this._ready(); return Particles.fireworks(this, x, y, o); }
  impact(x, y, o) { this._ready(); return Particles.impact(this, x, y, o); }
  trail(target, o) { this._ready(); return new Trail(this, target, o); }
  fire(x, y, o) { this._ready(); return new Fire(this, x, y, o); }
  portal(x, y, o) { this._ready(); return new Portal(this, x, y, o); }
  weather(type, o) { this._ready(); return new Weather(this, type, o); }

  // ======================================================== rewards & progress
  coins(from, to, o) { this._ready(); return Particles.coins(this, from, to, o); }
  starRating(stars, o) { this._ready(); const p = new StarRating(this, stars, o); return p.done; }
  xpBar(x, y, o) { this._ready(); return new XPBar(this, x, y, o); }
  badge(o) { this._ready(); return BadgeToast.show(this, o); }
  progressPath(points, o) { this._ready(); return new ProgressPath(this, points, o); }
  streak(x, y, o) { this._ready(); return new Streak(this, x, y, o); }

  // ======================================================== answer feedback
  correct(target, o) { this._ready(); return Feedback.correct(this, target, o); }
  wrong(target, o) { this._ready(); return Feedback.wrong(this, target, o); }
  hint(target, o) { this._ready(); return Feedback.hint(this, target, o); }
  checkmark(x, y, o) { this._ready(); return Feedback.checkmark(this, x, y, o); }
  say(x, y, text, o) { this._ready(); return Feedback.say(this, x, y, text, o); }
  timer(x, y, o) { this._ready(); return new QuizTimer(this, x, y, o); }

  // ======================================================== cards & collectibles
  card(x, y, front, back, o) { this._ready(); return new Card(this, x, y, front, back, o); }
  flip(target, o) { this._ready(); return CardFX.flip(this, target, o); }
  reveal(target, rarity, o) { this._ready(); return CardFX.reveal(this, target, rarity, o); }
  lock(target, o) { this._ready(); return new LockedItem(this, target, o); }
  legendaryReveal(o) { this._ready(); return CardFX.legendaryReveal(this, o); }
  openPack(cards, o) { this._ready(); return CardFX.openPack(this, cards, o); }

  // ======================================================== story & scenes
  dialogue(o) { this._ready(); return new Dialogue(this, o); }
  emote(target, type, o) { this._ready(); return Emote.play(this, target, type, o); }
  chapterTitle(title, o) { this._ready(); return ChapterTitle.show(this, title, o); }
  /** Transition by preset name, preset object (e.g. from Studio) or style id. */
  transition(preset, o) { this._ready(); return Transition.run(this, preset, o); }
  /** Change scene behind a transition: goto('Level2', data, 'Heart Iris') or goto('Level2', data, { type: 'iris' }). */
  goto(sceneKey, data, preset, o) { this._ready(); return Transition.goto(this, sceneKey, data, preset, o); }
  /** A transition you drive yourself: p.render(t) for scrubbing, await p.cover() / p.hold() / p.reveal(). */
  transitionPlayer(preset, o) { this._ready(); return Transition.player(this, preset, o); }

  // ======================================================== presets (PhaserFX Studio)
  /** Play a particle preset (name or JSON). Returns a handle: setPosition, burst, stop, destroy, done. */
  particles(preset, x, y, o) { this._ready(); return ParticlePreset.play(this, preset, x, y, o); }
  /** Play a composed effect preset (name or JSON). Options: { target } to act on a game object. */
  play(preset, x, y, o) { this._ready(); return EffectPreset.play(this, preset, x, y, o); }
  dayNight(o) { this._ready(); return new DayNight(this, o); }
  spotlight(o) { this._ready(); return new Spotlight(this, o); }

  // ======================================================== action & impact
  hit(target, o) { this._ready(); return Combat.hit(this, target, o); }
  damageNumber(x, y, value, o) { this._ready(); return Combat.damageNumber(this, x, y, value, o); }
  healthBar(x, y, o) { this._ready(); return new HealthBar(this, x, y, o); }

  // ======================================================== utilities
  /** Grayscale / white copies of a texture (returns the new key or null). */
  grayTexture(key, frame) { return Textures.gray(this.scene, key, frame); }
  whiteTexture(key, frame) { return Textures.white(this.scene, key, frame); }
  /** A medal texture in any colour with a glyph. Returns its key. */
  medalTexture(color, glyph) { return Textures.medal(this.scene, color, glyph); }
}
