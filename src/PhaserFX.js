/**
 * PhaserFX — the public namespace.
 *
 *   // 1) as a scene plugin (recommended): every scene gets this.fx
 *   new Phaser.Game({ …, plugins: { scene: [PhaserFX.plugin] } });
 *
 *   // 2) per scene, no plugin config needed
 *   create() { this.fx = PhaserFX.create(this); }
 *
 *   // 3) after the game exists (adds this.fx to running and future scenes)
 *   PhaserFX.install(game);
 */
const PhaserFX = {
  version: '1.2.0',

  /** Scene plugin config: plugins: { scene: [PhaserFX.plugin] } → this.fx */
  plugin: { key: 'PhaserFX', plugin: FX, mapping: 'fx' },

  /** Same as the plugin, with your own property name (e.g. 'juice'). */
  pluginAs(mapping) { return { key: `PhaserFX_${mapping}`, plugin: FX, mapping }; },

  create(scene) { return FX.create(scene); },

  install(game, mapping = 'fx') {
    game.plugins.installScenePlugin('PhaserFX', FX, mapping);
    game.scene.scenes.forEach((s) => { if (s.sys && s.sys.settings.status >= Phaser.Scenes.CREATING && !s[mapping]) s[mapping] = FX.create(s); });
  },

  settings: Settings,

  /** What this device can do: device.info, device.has('postFX'), device.override({ webgl: false }). */
  device: Device,

  /** Effect quality: quality.level(), quality.set('low'). Choose with settings.quality. */
  quality: Quality,

  /** Events: 'quality' (level, reason), 'fallback' (kind, name, reason), 'contextlost', 'contextrestored'. */
  events: Quality.events,

  /** Named presets: PhaserFX.presets.add(json), .get(kind, name), .list(kind). */
  presets: PresetLibrary,

  // building blocks (advanced use / extending)
  FX, Settings, Device, Quality, Synth, Textures, Juice, Component,
  Particles, Feedback, CardFX, Emote, ChapterTitle, Transition, Combat,
  Card, ConfettiRain, Trail, Fire, Portal, Weather, StarRating, XPBar, BadgeToast,
  ProgressPath, Streak, HealthBar, QuizTimer, LockedItem, Dialogue, DayNight, Spotlight,
  PresetLibrary, ParticlePreset, ParticleHandle, EffectPreset, TransitionPlayer, TransitionStyle,
  BuiltinParticles, BuiltinEffects, BuiltinTransitions,
  styles: Transition.STYLES,

  RARITY: CardFX.RARITY,
  EMOTES: Emote.TYPES,
  TRANSITIONS: Transition.TYPES,
  TRANSITION_STYLES: Object.keys(Transition.STYLES),
  STEP_TYPES: Object.keys(EffectPreset.STEPS)
};
