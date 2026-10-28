// Build PhaserFX: concatenates src/ (one class per file) into
//   dist/phaser-fx.js      UMD: <script> tag (window.PhaserFX), CommonJS, AMD
//   dist/phaser-fx.esm.js  ES module: import PhaserFX from './phaser-fx.esm.js'
//   dist/phaser-fx.min.js  minified UMD (when terser is installed)
// Usage: node tools/build.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORDER = [
  'core/Settings', 'core/Device', 'core/Quality', 'core/Synth', 'core/Textures', 'core/Juice', 'core/Component',
  'effects/Particles',
  'components/ConfettiRain', 'components/Trail', 'components/Fire', 'components/Portal', 'components/Weather',
  'components/StarRating', 'components/XPBar', 'components/BadgeToast', 'components/ProgressPath', 'components/Streak',
  'components/HealthBar', 'components/QuizTimer',
  'effects/Feedback',
  'components/Card', 'effects/CardFX', 'components/LockedItem',
  'components/Dialogue', 'effects/Emote', 'effects/ChapterTitle',
  'components/DayNight', 'components/Spotlight',
  'transitions/TransitionStyle', 'transitions/FadeStyle', 'transitions/IrisStyle', 'transitions/WipeStyle', 'transitions/DoorsStyle',
  'transitions/CurtainStyle', 'transitions/BlindsStyle', 'transitions/TilesStyle', 'transitions/ClockStyle', 'transitions/BubblesStyle',
  'transitions/PixelateStyle', 'transitions/ZoomStyle', 'transitions/ShutterStyle', 'transitions/TransitionPlayer',
  'presets/PresetLibrary', 'presets/ParticlePreset', 'presets/ParticleHandle', 'presets/EffectPreset',
  'presets/BuiltinParticles', 'presets/BuiltinEffects', 'presets/BuiltinTransitions',
  'effects/Transition',
  'effects/Combat',
  'FX', 'PhaserFX'
];

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const banner = `/*!\n * PhaserFX v${pkg.version} — plug-and-play effects for Phaser 3.60+\n * Particles, rewards, answer feedback, cards, story and combat effects.\n * MIT License\n */\n`;
const body = ORDER.map((f) => `// ---- src/${f}.js\n${readFileSync(join(root, 'src', `${f}.js`), 'utf8').trim()}\n`).join('\n');
const indent = (s) => s.split('\n').map((l) => (l ? `  ${l}` : l)).join('\n');

const umd = `${banner}(function (root, factory) {
  if (typeof define === 'function' && define.amd) define(['phaser'], factory);
  else if (typeof module === 'object' && module.exports) module.exports = factory(root.Phaser || require('phaser'));
  else root.PhaserFX = factory(root.Phaser);
}(typeof self !== 'undefined' ? self : this, function (Phaser) {
  'use strict';
  if (!Phaser) throw new Error('PhaserFX: load Phaser 3 before phaser-fx.js');

${indent(body)}
  return PhaserFX;
}));
`;

const names = ['PresetLibrary', 'ParticlePreset', 'ParticleHandle', 'EffectPreset', 'TransitionPlayer', 'TransitionStyle', 'FX', 'Settings', 'Device', 'Quality', 'Synth', 'Textures', 'Juice', 'Component', 'Particles', 'Feedback', 'CardFX', 'Emote', 'ChapterTitle',
  'Transition', 'Combat', 'Card', 'ConfettiRain', 'Trail', 'Fire', 'Portal', 'Weather', 'StarRating', 'XPBar', 'BadgeToast',
  'ProgressPath', 'Streak', 'HealthBar', 'QuizTimer', 'LockedItem', 'Dialogue', 'DayNight', 'Spotlight'];
const esm = `${banner}import Phaser from 'phaser';

${body}
export default PhaserFX;
export { PhaserFX, ${names.join(', ')} };
`;

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist', 'phaser-fx.js'), umd);
writeFileSync(join(root, 'dist', 'phaser-fx.esm.js'), esm);
// optional minified build (npm i -D terser)
try {
  const { minify } = await import('terser');
  const min = await minify(umd, { compress: true, mangle: true, format: { comments: /^!/ } });
  writeFileSync(join(root, 'dist', 'phaser-fx.min.js'), min.code);
  console.log(`built dist/phaser-fx.min.js (${(min.code.length / 1024).toFixed(1)} KB)`);
} catch (e) {
  console.log('skipped phaser-fx.min.js (install terser to build it)');
}
console.log(`built dist/phaser-fx.js (${(umd.length / 1024).toFixed(1)} KB) and dist/phaser-fx.esm.js from ${ORDER.length} files`);
