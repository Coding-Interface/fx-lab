// Type definitions for PhaserFX 1.2 — gives autocomplete in VS Code for JS and TS projects.
import type Phaser from 'phaser';

type GO = Phaser.GameObjects.GameObject & { x: number; y: number };
type Point = { x: number; y: number };
type Color = number;

export interface Destroyable { destroy(): void; }
export interface GlowHandle extends Destroyable { set(strength: number, ms?: number): void; pulse(lo: number, hi: number, ms?: number): void; }

export interface SparksOptions { count?: number; speed?: number; gravity?: number; lifespan?: number; colors?: Color[]; size?: number; depth?: number; sound?: boolean; }
export interface ConfettiOptions { x?: number; y?: number; count?: number; colors?: Color[]; gravity?: number; flutter?: number; depth?: number; sound?: boolean; }
export interface FireworksOptions { size?: number; count?: number; gravity?: number; colors?: Color[]; crackle?: boolean; climb?: number; depth?: number; }
export interface ImpactOptions { power?: number; hitStop?: number; shake?: number; color?: Color; debrisColors?: Color[]; dustColor?: Color; cracks?: boolean; target?: GO; depth?: number; }
export interface CoinsOptions { count?: number; texture?: string; spread?: number; scale?: number; duration?: number; screen?: boolean; depth?: number; onEach?: (i: number) => void; }

export declare class ConfettiRain implements Destroyable { stop(): this; destroy(): void; }
export declare class Trail implements Destroyable { burst(): void; destroy(): void; }
export declare class Fire implements Destroyable { setWind(w: number): this; setPosition(x: number, y: number): this; flare(): void; destroy(): void; }
export declare class Portal implements Destroyable { pulse(): void; destroy(): void; }
export declare class Weather implements Destroyable { gust(strength?: number): void; setWind(w: number): this; bolt(): void; destroy(): void; }
export declare class StarRating implements Destroyable { close(): Promise<void>; destroy(): void; }
export declare class XPBar implements Destroyable { level: number; xp: number; need: number; add(amount: number, fromX?: number, fromY?: number, orbs?: number): Promise<void>; destroy(): void; }
export declare class ProgressPath implements Destroyable { current: number; complete(): Promise<void>; destroy(): void; }
export declare class Streak implements Destroyable { value: number; best: number; multiplier: number; hit(): number; miss(message?: string | null): number; destroy(): void; }
export declare class HealthBar implements Destroyable { value: number; max: number; set(v: number): this; damage(n: number): this; heal(n: number): this; destroy(): void; }
export declare class QuizTimer implements Destroyable { left: number; total: number; start(): this; pause(): this; resume(): this; stop(): this; reset(seconds?: number): this; addTime(s?: number): Promise<void>; destroy(): void; }
export declare class Card extends Phaser.GameObjects.Container { faceUp: boolean; cardW: number; cardH: number; flip(o?: FlipOptions): Promise<void>; setFaceUp(up: boolean): this; contains(x: number, y: number): boolean; }
export declare class LockedItem implements Destroyable { locked: boolean; unlock(o?: { rattles?: number; drama?: number; color?: Color; label?: string | false; rays?: boolean }): Promise<void>; destroy(): void; }
export declare class Dialogue implements Destroyable { say(speaker: string, text: string): Promise<void>; play(lines: [string, string][]): Promise<void>; advance(): void; finish(): void; destroy(): void; }
export declare class DayNight implements Destroyable { hour: number; night: number; phase: string; speed: number; setHour(h: number): this; advance(hours?: number, ms?: number): Promise<void>; addLight(x: number, y: number, o?: { radius?: number; color?: Color; at?: number; alpha?: number }): Phaser.GameObjects.Image; destroy(): void; }
export declare class Spotlight implements Destroyable { radius: number; darkness: number; watch(obj: GO, onFound?: (obj: GO) => void, o?: { sparkle?: boolean }): this; flash(scale?: number, ms?: number): Promise<void>; lightUp(ms?: number): Promise<void>; setRadius(r: number): this; destroy(): void; }

export interface FlipOptions { to?: string; swap?: () => void; duration?: number; juicy?: boolean; lift?: number; sound?: boolean; keepSize?: boolean; }
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | { color: Color; rank: 0 | 1 | 2 | 3; label?: string };
export type EmoteType = 'surprise' | 'confused' | 'love' | 'nervous' | 'annoyed' | 'sleepy' | 'happy' | 'idea';
export type TransitionType = 'fade' | 'iris' | 'wipe' | 'blinds' | 'zoom';
export type TransitionStyleId = 'fade' | 'iris' | 'wipe' | 'doors' | 'curtain' | 'blinds' | 'tiles' | 'clock' | 'bubbles' | 'pixelate' | 'zoom' | 'shutter';
export type BuiltinTransition = 'Fade to Black' | 'Dip to White' | 'Circle Iris' | 'Heart Iris' | 'Star Spin Iris' | 'Diagonal Wipe' | 'Slide Left' | 'Sliding Doors' | 'Theatre Curtain' | 'Blinds' | 'Diagonal Stripes' | 'Checker Diagonal' | 'Pixel Dissolve' | 'Diamond Spiral' | 'Clock Wipe' | 'Comic Bubbles' | 'Heart Shower' | 'Retro Pixelate' | 'Zoom Through' | 'Spin Dive' | 'Chapter Card' | 'Mystery Shutter' | 'Candy Stripes' | 'Star Shutter';
/** Built-in sounds (any audio key you loaded with this.load.audio also works for transitions). */
export type SoundName = 'whoosh' | 'swish' | 'shutter' | 'slide' | 'thud' | 'rumble' | 'riser' | 'bloop' | 'glitch' | 'tickTock' | 'chime' | 'sparkle' | 'fanfare' | 'soft' | 'pop' | 'flip' | 'boom' | 'coin' | 'crack' | 'charge' | 'correct' | 'tick' | 'hit';
export type BuiltinParticles = 'Sparkle Burst' | 'Spark Shower' | 'Fire' | 'Smoke Puff' | 'Magic Dust' | 'Confetti Pop' | 'Snowfall' | 'Rain' | 'Explosion' | 'Hearts' | 'Coin Shower' | 'Bubbles' | 'Healing Aura' | 'Portal Swirl' | 'Level-Up Pillar' | 'Poison Cloud' | 'Electric Zap' | 'Leaf Fall' | 'Firefly Swarm' | 'Star Trail';
export type BuiltinEffect = 'Correct Answer' | 'Gentle Try Again' | 'Level Up' | 'Critical Hit' | 'Treasure Open' | 'Power Up' | 'Heal' | 'Teleport' | 'Defeat Poof' | 'Big Explosion' | 'Unlock!' | 'Love' | 'Victory';

/** A transition preset (what PhaserFX Studio exports). */
export interface TransitionPreset {
  format?: 'phaserfx-transition'; version?: number; name?: string;
  style: TransitionStyleId | string; duration?: number; hold?: number; color?: string;
  easeIn?: string; easeOut?: string; reveal?: 'reverse' | 'continue';
  /** Plays as it covers. Omit for the style's suitable default; false for silence. */
  sound?: SoundName | string | false;
  /** Plays as it uncovers. Omit for the style's default (often none). */
  revealSound?: SoundName | string | false;
  label?: string; sublabel?: string; labelColor?: string; labelSize?: number;
  params?: Record<string, number | string | boolean | string[]>;
  /** Played instead when this device can't run the style, or when heavy and quality is low. */
  fallback?: string;
  /** Use the fallback at low quality. */
  heavy?: boolean;
}
export interface TransitionOptions { x?: number; y?: number; screen?: boolean; duration?: number; hold?: number; color?: string | number; sound?: SoundName | string | false; revealSound?: SoundName | string | false; type?: TransitionType; onCovered?: () => void | Promise<void>; }

type MinMax = { min: number; max: number };
export interface ParticleLayer {
  name?: string; enabled?: boolean; texture?: string; blend?: 'ADD' | 'NORMAL' | 'SCREEN' | 'MULTIPLY'; depth?: number; maxParticles?: number;
  emit?: { mode?: 'burst' | 'stream'; count?: number; bursts?: number; interval?: number; frequency?: number; quantity?: number; duration?: number; delay?: number };
  zone?: { type?: 'point' | 'circle' | 'ring' | 'rect' | 'ellipse' | 'line'; radius?: number; width?: number; height?: number; edge?: boolean; points?: number };
  lifespan?: MinMax; speed?: MinMax; angle?: MinMax; gravityX?: number; gravityY?: number; accelX?: MinMax; accelY?: MinMax;
  moveTo?: { enabled?: boolean; x?: number; y?: number };
  scale?: { mode?: 'overLife' | 'random'; start?: number; end?: number; min?: number; max?: number; ease?: string };
  alpha?: { mode?: 'overLife' | 'random' | 'fadeInOut' | 'flicker'; start?: number; end?: number; min?: number; max?: number; ease?: string };
  rotation?: { mode?: 'none' | 'random' | 'spin' | 'overLife' | 'velocity'; min?: number; max?: number; spinMin?: number; spinMax?: number; offset?: number };
  color?: { mode?: 'single' | 'random' | 'overLife'; colors?: string[]; ease?: string };
  flutter?: number;
}
/** A particle preset (what PhaserFX Studio exports). */
export interface ParticlePreset { format?: 'phaserfx-particles'; version?: number; name: string; textures?: Record<string, string>; layers: ParticleLayer[]; fallback?: string; heavy?: boolean; }
export interface EffectStep { type: 'particles' | 'shake' | 'flash' | 'hitStop' | 'slowmo' | 'shockwave' | 'rays' | 'glow' | 'text' | 'sound' | 'confetti' | 'fireworks' | 'camera' | 'target' | 'coins' | 'emote'; at?: number; [param: string]: unknown; }
/** A composed effect preset (what PhaserFX Studio exports). */
export interface EffectPreset { format?: 'phaserfx-effect'; version?: number; name: string; steps: EffectStep[]; fallback?: string; heavy?: boolean; }

export type QualityLevel = 'high' | 'medium' | 'low';
export type DeviceFeature = 'webgl' | 'shaderFX' | 'postFX' | 'audio' | 'touch';
export interface DeviceInfo { webgl: boolean; shaderFX: boolean; postFX: boolean; audio: boolean; touch: boolean; mobile: boolean; memory: number | null; cores: number | null; maxTexture: number; pixelRatio: number; contextLost: boolean; tier: QualityLevel; }
export interface DeviceAPI { info: DeviceInfo | null; has(feature: DeviceFeature): boolean; supports(requires?: DeviceFeature[]): boolean; missing(requires?: DeviceFeature[]): DeviceFeature[]; override(o?: Partial<Record<DeviceFeature, boolean>>): DeviceAPI; }
export interface QualityAPI { level(): QualityLevel; current: QualityLevel; set(level: QualityLevel, reason?: string): void; isLow(): boolean; PROFILES: Record<QualityLevel, { particles: number; maxPerEmitter: number; liveCap: number; tiles: number }>; }
export interface PresetPack { format: 'phaserfx-pack'; version?: number; name?: string; presets: Array<ParticlePreset | EffectPreset | TransitionPreset>; }

export declare class ParticleHandle implements Destroyable {
  emitters: Phaser.GameObjects.Particles.ParticleEmitter[]; alive: boolean; infinite: boolean; done: Promise<void>;
  setPosition(x: number, y: number): this; stop(): this; burst(x?: number, y?: number): this; count(): number; destroy(): void;
}
export declare class TransitionPlayer implements Destroyable {
  render(t: number, phase?: 'cover' | 'reveal'): void; cover(): Promise<void>; hold(extraWork?: () => unknown): Promise<void>; reveal(): Promise<void>; destroy(): void;
}
export interface PresetLibraryAPI {
  add(p: ParticlePreset | EffectPreset | TransitionPreset | PresetPack | unknown[]): number;
  get(kind: 'particles' | 'effects' | 'transitions', name: string): object | null;
  list(kind: 'particles' | 'effects' | 'transitions'): string[];
  remove(kind: 'particles' | 'effects' | 'transitions', name: string): boolean;
  builtins(kind: 'particles' | 'effects' | 'transitions'): object[];
  pack(presets: object[], name?: string): PresetPack;
  kindOf(p: unknown): 'particles' | 'effects' | 'transitions' | null;
}
export type WeatherType = 'rain' | 'snow' | 'leaves' | 'petals';

export declare class FX extends Phaser.Plugins.ScenePlugin {
  static create(scene: Phaser.Scene): FX;
  // core juice
  wait(ms: number): Promise<void>;
  tween(config: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void>;
  setTimeScale(s: number): this;
  shake(ms?: number, intensity?: number): this;
  flash(ms?: number, color?: Color, alpha?: number): this;
  hitStop(ms?: number): Promise<void>;
  pop(target: GO, amount?: number, ms?: number): Phaser.Tweens.TweenChain | null;
  wiggle(target: GO, px?: number, times?: number): Promise<void>;
  glow(target: GO, color?: Color, strength?: number): GlowHandle;
  rays(x: number, y: number, color?: Color, count?: number, depth?: number): Phaser.GameObjects.Container;
  shockwave(x: number, y: number, color?: Color, size?: number, ms?: number, depth?: number): Phaser.GameObjects.Image;
  shine(target: GO | { x: number; y: number; width: number; height: number }, o?: { duration?: number; depth?: number; radius?: number; screen?: boolean }): Promise<void>;
  floatText(x: number, y: number, text: string, color?: string, size?: number, o?: { screen?: boolean; rise?: number; hold?: number }): Phaser.GameObjects.Text;
  countUp(textObj: Phaser.GameObjects.Text, from: number, to: number, ms?: number, format?: (v: number) => string): Promise<void>;
  burst(x: number, y: number, texture: string, config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig, count?: number, depth?: number): Phaser.GameObjects.Particles.ParticleEmitter;
  flyTo(objOrTexture: GO | string, from: Point | null, to: Point | GO, o?: { duration?: number; arc?: number; ease?: string; scale?: number; scaleTo?: number; delay?: number; destroy?: boolean; onArrive?: (o: GO) => void }): Promise<void>;
  sound(name: string, ...args: unknown[]): this;
  // particles & elements
  sparks(x: number, y: number, o?: SparksOptions): this;
  confetti(o?: ConfettiOptions): this;
  confettiRain(o?: { density?: number; duration?: number; colors?: Color[]; gravity?: number; lifespan?: number; depth?: number }): ConfettiRain;
  fireworks(x: number, y: number, o?: FireworksOptions): Promise<void>;
  impact(x: number, y: number, o?: ImpactOptions): Promise<void>;
  trail(target: GO | 'pointer', o?: { colors?: Color[]; density?: number; lifespan?: number; size?: number; smoothing?: number; head?: boolean; headSize?: number; depth?: number }): Trail;
  fire(x: number, y: number, o?: { size?: number; wind?: number; smoke?: number; colors?: Color[]; light?: boolean; lightColor?: Color; depth?: number }): Fire;
  portal(x: number, y: number, o?: { radius?: number; palette?: 'blue' | 'green' | 'pink' | 'gold' | Color[]; pull?: number; depth?: number }): Portal;
  weather(type: WeatherType, o?: { amount?: number; wind?: number; lightning?: boolean; ground?: number; splashes?: boolean; depth?: number }): Weather;
  // rewards & progress
  coins(from: Point, to: Point | GO, o?: CoinsOptions): Promise<void[]>;
  starRating(stars: 0 | 1 | 2 | 3, o?: { score?: number; title?: string; message?: string; scoreLabel?: string; gap?: number; confetti?: boolean; x?: number; y?: number; width?: number; height?: number; colors?: { panel?: Color; edge?: Color; banner?: Color; bannerText?: string } }): Promise<StarRating>;
  xpBar(x: number, y: number, o?: { width?: number; height?: number; need?: number; level?: number; xp?: number; growth?: number; color?: Color; label?: boolean; banner?: boolean; bannerText?: string; depth?: number; onLevelUp?: (level: number) => void }): XPBar;
  badge(o: { title: string; description?: string; color?: string; glyph?: string; icon?: string; eyebrow?: string; hold?: number; spins?: number; to?: Point | GO; x?: number; y?: number; width?: number }): Promise<void>;
  progressPath(points: Array<[number, number] | Point>, o?: { current?: number; labels?: string[]; token?: string; tokenSize?: number; color?: Color; routeColor?: Color; travel?: number; hops?: number; depth?: number; onComplete?: (done: number, current: number) => void; onFinish?: () => void }): ProgressPath;
  streak(x: number, y: number, o?: { milestone?: number; growth?: number; label?: string; banner?: boolean; bannerText?: string; bannerColor?: Color; depth?: number; onMilestone?: (value: number, multiplier: number) => void }): Streak;
  // answer feedback
  correct(target: GO, o?: { points?: number; scoreText?: Phaser.GameObjects.Text; score?: number; scoreTarget?: GO; others?: GO[]; color?: Color; keep?: boolean; stars?: number; sound?: boolean }): Promise<{ overlay: Phaser.GameObjects.Graphics; mark: Phaser.GameObjects.Graphics }>;
  wrong(target: GO, o?: { message?: string; wiggle?: number; color?: Color; keep?: boolean; hold?: number; bubbleY?: number; sound?: boolean }): Promise<{ overlay: Phaser.GameObjects.Graphics; bubble: Phaser.GameObjects.Container | null }>;
  hint(target: GO, o?: { color?: Color; scale?: boolean }): { stop(): void };
  checkmark(x: number, y: number, o?: { size?: number; color?: Color; duration?: number; screen?: boolean; depth?: number }): Promise<Phaser.GameObjects.Graphics>;
  say(x: number, y: number, text: string, o?: { hold?: number; size?: number; width?: number; screen?: boolean }): Phaser.GameObjects.Container;
  timer(x: number, y: number, o?: { seconds?: number; urgentAt?: number; radius?: number; colors?: [Color, Color, Color]; autoStart?: boolean; depth?: number; onTick?: (sec: number) => void; onTimeUp?: () => void }): QuizTimer;
  // cards & collectibles
  card(x: number, y: number, front: string, back?: string | null, o?: { faceUp?: boolean; width?: number; height?: number; shadow?: boolean; screen?: boolean; depth?: number }): Card;
  flip(target: GO, o?: FlipOptions): Promise<void>;
  reveal(target: GO, rarity?: Rarity, o?: { label?: string }): Destroyable;
  lock(target: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite, o?: { chains?: boolean; padlock?: boolean; lockScale?: number }): LockedItem;
  legendaryReveal(o: { front: string; back?: string; x?: number; y?: number; width?: number; color?: Color; title?: string; pulses?: number; hitStop?: number; confetti?: number; dim?: number }): Promise<{ card: Card; destroy(): void } | null>;
  openPack(cards: Array<{ front: string; rarity?: 'common' | 'rare' | 'epic' | 'legendary'; back?: string }>, o?: { pack?: string; x?: number; y?: number; width?: number; packHeight?: number; auto?: boolean; autoFlip?: number; rattles?: number; deal?: number; tells?: boolean; dim?: number }): Promise<{ cards: Card[]; destroy(): void } | null>;
  // story & scenes
  dialogue(o?: { speakers?: Record<string, { name?: string; portrait?: string; color?: string; pitch?: number }>; x?: number; y?: number; width?: number; height?: number; cps?: number; fontSize?: number; colors?: { box?: Color; edge?: Color; text?: string }; clickAnywhere?: boolean; blips?: boolean; arrow?: boolean; waveHeight?: number; depth?: number }): Dialogue;
  emote(target: GO, type?: EmoteType, o?: { hold?: number; size?: number; offsetX?: number; offsetY?: number }): Promise<void>;
  chapterTitle(title: string, o?: { chapter?: string; subtitle?: string; hold?: number; stagger?: number; bars?: boolean; dim?: number; color?: string; size?: number; y?: number }): Promise<void>;
  /** Cover → onCovered → reveal. preset: a built-in name ('Heart Iris'), your added preset's name, a style id, or a preset object. */
  transition(preset?: BuiltinTransition | TransitionType | TransitionStyleId | string | TransitionPreset, o?: TransitionOptions): Promise<void>;
  /** Change scene behind a transition; the reveal plays in the new scene. */
  goto(sceneKey: string, data?: object, preset?: BuiltinTransition | string | TransitionPreset | TransitionOptions, o?: TransitionOptions): Promise<void>;
  /** A transition you drive yourself (scrubbing, cutscenes). */
  transitionPlayer(preset?: BuiltinTransition | string | TransitionPreset, o?: TransitionOptions): TransitionPlayer;
  /** Play a particle preset (built-in name, added name, or Studio JSON). */
  particles(preset: BuiltinParticles | string | ParticlePreset, x: number, y: number, o?: { scale?: number; follow?: GO; depth?: number; screen?: boolean; keep?: boolean }): ParticleHandle;
  /** Play a composed effect (built-in name, added name, or Studio JSON). Resolves when finished. */
  play(preset: BuiltinEffect | string | EffectPreset, x: number, y: number, o?: { target?: GO; depth?: number }): Promise<void>;
  dayNight(o?: { hour?: number; speed?: number; stars?: boolean; starCount?: number; skyHeight?: number; fireflies?: boolean; clock?: boolean; depth?: number; onPhase?: (phase: string, hour: number) => void }): DayNight;
  spotlight(o?: { follow?: GO | 'pointer'; radius?: number; darkness?: number; smoothing?: number; color?: Color; depth?: number }): Spotlight;
  // action & impact
  hit(target: GO, o?: { damage?: number; crit?: boolean; fromX?: number; x?: number; y?: number; knockback?: number; hitStop?: number; number?: boolean; color?: Color; flashMs?: number }): Promise<void>;
  damageNumber(x: number, y: number, value: number | string, o?: { crit?: boolean; color?: string; size?: number; critLabel?: string | false; screen?: boolean; depth?: number }): Phaser.GameObjects.Text;
  healthBar(x: number, y: number, o?: { width?: number; height?: number; max?: number; value?: number; follow?: GO; color?: Color; ghostColor?: Color; ghostDelay?: number; showText?: boolean; depth?: number; onEmpty?: () => void }): HealthBar;
  // utilities
  grayTexture(key: string, frame?: string | number): string | null;
  whiteTexture(key: string, frame?: string | number): string | null;
  medalTexture(color?: string, glyph?: string): string;
}

export interface PhaserFXSettings {
  reducedMotion: boolean; sound: boolean; volume: number; depth: number; font: string; bodyFont: string;
  hitStopPausesPhysics: boolean; soundHandler: null | ((name: string, ...args: unknown[]) => boolean | void);
  /** 'auto' (default) picks from the device and adapts to frame rate. */
  quality: 'auto' | QualityLevel; adaptive: boolean; minFps: number; warnings: boolean;
}

declare const PhaserFX: {
  version: string;
  plugin: { key: string; plugin: typeof FX; mapping: 'fx' };
  pluginAs(mapping: string): { key: string; plugin: typeof FX; mapping: string };
  create(scene: Phaser.Scene): FX;
  install(game: Phaser.Game, mapping?: string): void;
  settings: PhaserFXSettings;
  FX: typeof FX;
  RARITY: Record<'common' | 'rare' | 'epic' | 'legendary', { label: string; color: Color; rank: number }>;
  EMOTES: EmoteType[];
  TRANSITIONS: TransitionType[];
  TRANSITION_STYLES: TransitionStyleId[];
  presets: PresetLibraryAPI;
  device: DeviceAPI;
  quality: QualityAPI;
  /** 'quality' (level, reason) · 'fallback' (kind, name, reason) · 'contextlost' · 'contextrestored' */
  events: Phaser.Events.EventEmitter;
  [key: string]: unknown;
};
export default PhaserFX;
export { PhaserFX };

// `this.fx` inside scenes when using the plugin
declare global {
  namespace Phaser {
    interface Scene { fx: FX; }
  }
}
