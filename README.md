# PhaserFX

PhaserFX is a set of **plug-and-play special effects for any Phaser 3.60+ game**. Add one script and every scene gets `this.fx`, with **50+ ready effects** for games, gamified learning and storytelling.

```js
this.fx.sparks(x, y);
await this.fx.correct(answerButton, { points: 10, scoreText });
await this.fx.legendaryReveal({ front: 'dragon-card' });
this.fx.goto('Level2', {}, { type: 'iris' });
```

- **Ships everything it needs.** Every texture is generated at runtime and every sound is synthesised (both replaceable), so there are no assets to load.
- **Works with any renderer and camera.** WebGL and Canvas are both supported, and effects work with scrolling and zoomed cameras.
- **Chainable.** Timed effects return Promises you can `await`, and long-lived effects return objects with `destroy()`.
- **Accessible.** It follows the player's "reduce motion" setting, keeps flashes photosensitivity-safe and gives learners kind feedback by default.

---

## 1. Install

### Script tag (any project, no build tools)

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/phaser/3.80.1/phaser.min.js"></script>
<script src="phaser-fx.min.js"></script>   <!-- from dist/ -->
```

```js
new Phaser.Game({
  // …your config…
  plugins: { scene: [PhaserFX.plugin] }   // every scene now has this.fx
});
```

### npm / bundler (Vite, webpack…)

Copy `dist/` into your project (or `npm i ./phaser-fx`), then:

```js
import Phaser from 'phaser';
import PhaserFX from './phaser-fx/dist/phaser-fx.esm.js';

new Phaser.Game({ /* … */ plugins: { scene: [PhaserFX.plugin] } });
```

TypeScript: `dist/phaser-fx.d.ts` gives full autocomplete and types `this.fx` on every scene.

### Without plugin config

```js
create() {
  this.fx = PhaserFX.create(this);   // per scene
}
// or once, after the game exists:
PhaserFX.install(game);              // running + future scenes get this.fx
```

Want a different name? Use `plugins: { scene: [PhaserFX.pluginAs('juice')] }`, then call `this.juice.sparks(…)`.

---

## 2. Settings

```js
PhaserFX.settings.reducedMotion = true;   // default: the OS "reduce motion" setting
PhaserFX.settings.sound = false;          // mute the built-in synth
PhaserFX.settings.volume = 0.6;
PhaserFX.settings.font = '"Fredoka", sans-serif';      // titles, banners, numbers
PhaserFX.settings.bodyFont = '"Nunito", sans-serif';   // dialogue, messages
PhaserFX.settings.depth = 1000;            // base depth of effect objects
PhaserFX.settings.hitStopPausesPhysics = true;

// Use your own audio files instead of the synth:
PhaserFX.settings.soundHandler = (name) => {
  if (game.cache.audio.exists(name)) { game.sound.play(name); return true; }  // handled
  return false;                                                              // fall back to synth
};
```

Sound names: `pop, sparkle, whoosh, boom, coin, flip, crack, charge, fanfare, chime, correct, soft, tick, hit, blip`.

---

## 3. API

Coordinates are **world** coordinates, the same ones your sprites use. HUD-style effects (toasts, timers, XP bar, title cards, transitions) are pinned to the **screen**. Anywhere a method takes a `target`, you can pass your own Image, Sprite, Text, Container or Rectangle.

### Core juice

| Call | What it does |
|---|---|
| `await fx.wait(ms)` | Pause a sequence (respects slow motion). |
| `await fx.tween(config)` | `scene.tweens.add` that you can await. |
| `fx.shake(ms?, intensity?)` | Camera shake (skipped with reduced motion). |
| `fx.flash(ms?, color?, alpha?)` | Full-screen flash (soft with reduced motion). |
| `await fx.hitStop(ms?)` | Freeze time, tweens, particles and physics for a few frames. |
| `fx.pop(target, amount?, ms?)` | Squash-and-stretch pop. Safe to spam. |
| `await fx.wiggle(target, px?, times?)` | Small "no" shake. |
| `fx.glow(target, color?, strength?)` | Returns `{ set(), pulse(lo, hi), destroy() }`. |
| `fx.rays(x, y, color?, count?)` | Spinning god rays (tween its `scale` to show them). |
| `fx.shockwave(x, y, color?, size?, ms?)` | Expanding ring. |
| `await fx.shine(target)` | Bright sweep across an object. |
| `fx.floatText(x, y, '+10', color?, size?)` | Text that pops, rises and fades. |
| `await fx.countUp(text, from, to, ms?)` | Rolling number. |
| `await fx.flyTo(objOrTexture, from, to, opts?)` | Curved flight to a point or object (handles world → HUD). |
| `fx.burst(x, y, texture, emitterConfig, count)` | One-shot particle burst that cleans itself up. |
| `fx.setTimeScale(0.25)` | Slow motion for the scene. |

### Particles & elements

```js
fx.sparks(x, y, { count: 40, colors: [0xffffff, 0x7ff7e3, 0x2fd4c0] });
fx.confetti();                         // cannons from the bottom corners
fx.confetti({ x, y, count: 60 });      // burst at a point
const rain = fx.confettiRain({ density: 4, duration: 5000 });
await fx.fireworks(x, y, { size: 300 });
await fx.impact(x, y, { power: 1.2, hitStop: 80 });

const trail  = fx.trail(player);                       // or fx.trail('pointer')
const fire   = fx.fire(x, y, { size: 0.8, wind: 30 }); // fire.setWind(-60); fire.setPosition(x, y); fire.flare();
const portal = fx.portal(x, y, { radius: 100, palette: 'pink' }); // portal.pulse()
const sky    = fx.weather('rain', { amount: 6, wind: 60, lightning: true, ground: 520 }); // 'snow' | 'leaves' | 'petals'; sky.gust()
// …later: trail.destroy(); fire.destroy(); portal.destroy(); sky.destroy();
```

### Rewards & progress

```js
await fx.coins({ x: chest.x, y: chest.y }, coinIcon, { count: 12, onEach: () => addCoin(1) });

const panel = await fx.starRating(2, { score: 870, title: 'LEVEL COMPLETE' });  // panel.close()

const xp = fx.xpBar(80, 40, { width: 300, need: 100, onLevelUp: (lv) => unlockSkin(lv) });
xp.add(25, enemy.x, enemy.y);   // orbs fly from the enemy into the bar

await fx.badge({ title: 'Curious Mind', description: 'Asked 10 questions', color: '#4fa3ff', glyph: '?', to: shelfSlot });

const map = fx.progressPath([[110, 470], [250, 380], [190, 230], [370, 150]], { labels: ['Intro', 'Nouns', 'Verbs', 'Quiz'], token: 'hero' });
await map.complete();           // stamp a star, draw the trail, hop to the next node, unlock it

const streak = fx.streak(80, 300, { milestone: 3 });
streak.hit();  streak.miss();  streak.multiplier;
```

### Answer feedback (quizzes and assessments)

```js
// your own answer buttons (any game object)
await fx.correct(btn, { points: 10, scoreText: this.scoreText, others: allButtons });
await fx.wrong(btn, { message: 'Nice try! A noun is a thing you can point at.' });
const h = fx.hint(rightButton);   // calm pulse after a few tries … h.stop()
await fx.checkmark(x, y);
fx.say(x, y, 'Great thinking!');  // friendly speech bubble

const timer = fx.timer(880, 80, { seconds: 20, urgentAt: 5, onTimeUp: () => showAnswer() });
timer.addTime(5); timer.pause(); timer.resume(); timer.reset(15);
```

These are kind by design: wrong answers never flash red, buzz or shake, and the timer ramps up urgency only in the last seconds.

### Cards & collectibles

```js
const card = fx.card(400, 300, 'card-front');     // built-in back, or pass your own
await card.flip();
fx.reveal(card, 'epic');                          // 'common' | 'rare' | 'epic' | 'legendary'

await fx.flip(anySprite, { to: 'other-texture' }); // flip ANY image to a new texture
await fx.flip(container, { swap: () => showBack() });

const locked = fx.lock(levelIcon);                // grayscale + chains + padlock
await locked.unlock({ label: 'NEW LEVEL!' });

const r = await fx.legendaryReveal({ front: 'dragon-card', title: 'LEGENDARY!' }); // r.destroy()
const pack = await fx.openPack([
  { front: 'c1', rarity: 'common' }, { front: 'c2', rarity: 'rare' },
  { front: 'c3', rarity: 'epic' },   { front: 'c4', rarity: 'legendary' }
]);                                   // resolves after the player has flipped every card; pack.destroy()
```

### Story & scenes

```js
await fx.chapterTitle('The Whispering Woods', { chapter: 'CHAPTER 2', subtitle: 'in which Pip follows a light' });

const talk = fx.dialogue({ speakers: {
  pip:  { name: 'Pip',  portrait: 'fox', color: '#f08a3c', pitch: 640 },
  moss: { name: 'Moss', portrait: 'owl', color: '#b79be0', pitch: 300 }
}});
await talk.say('pip', 'Something is [wave]glowing[/wave] in the woods!');
await talk.play([['moss', '[shake]Do not[/shake] touch the [color=#ff8ac2]mushrooms[/color].'], ['pip', 'Too late...[pause] oops.']]);
talk.destroy();

await fx.emote(npc, 'surprise');   // confused, love, nervous, annoyed, sleepy, happy, idea

await fx.transition('Heart Iris', { x: hero.x, y: hero.y, onCovered: () => this.loadRoom(2) });
fx.goto('NextScene', { score }, 'Theatre Curtain');   // 24 built-in transitions, see "Presets" below

const sky = fx.dayNight({ hour: 18, speed: 0.5, fireflies: true, clock: true });
sky.addLight(window.x, window.y, { radius: 50 });   sky.setHour(22);   await sky.advance(6);

const torch = fx.spotlight({ follow: 'pointer', radius: 130 });
torch.watch(hiddenKey, () => this.found('key'));   torch.flash();   await torch.lightUp();
```

Dialogue markup: `[wave]…[/wave]`, `[shake]…[/shake]`, `[color=#hex]…[/color]` and `[pause]`. Clicking, tapping, Space or Enter first finishes the line, then advances to the next one.

### Presets: transitions, particles and effects (PhaserFX Studio)

Every transition, particle effect and composed effect is a small JSON **preset**. Use a built-in one by name, or design your own in **PhaserFX Studio** (`studio/index.html`) and paste what it exports.

```js
// built-ins, by name
await fx.transition('Diamond Spiral', { onCovered: () => this.loadLevel(2) });
fx.goto('Level2', { score }, 'Sliding Doors');
const fire = fx.particles('Fire', 400, 500);         // returns a handle
fire.setPosition(x, y);  fire.stop();
await fx.play('Critical Hit', 0, 0, { target: enemy });

// your own (JSON from Studio): register once, then use by name anywhere
PhaserFX.presets.add(myPack);                        // a preset, an array, or an exported pack
this.load.json('fx-pack', 'assets/my-fx.json');      // …or load it as a file
PhaserFX.presets.add(this.cache.json.get('fx-pack'));
fx.particles('Blue Sparkle', x, y, { scale: 0.5, follow: player });

// or pass the object straight in
await fx.transition({ style: 'iris', duration: 900, params: { shape: 'star', spin: 180 } });

// drive a transition yourself (scrubbing, cutscenes)
const t = fx.transitionPlayer('Clock Wipe', { x: 480, y: 300, screen: true });
t.render(0.4, 'cover');   await t.cover();   await t.hold();   await t.reveal();
```

**Transition styles** (each has its own options, all editable in Studio): `fade`, `iris` (circle, diamond, square, heart, star; spin, pause), `wipe` (any angle, glowing edge), `doors`, `curtain`, `blinds` (count, angle, stagger order), `tiles` (grid size, 8 patterns, square/circle/diamond), `clock`, `bubbles` (circle/star/heart), `pixelate` (WebGL), `zoom` and `shutter` (slanted colourful bars from alternate sides with a spinning medallion; bar colours, count, slant, medallion text and colours). Every preset also has duration, hold, colour, cover/reveal eases, `reveal: 'reverse' | 'continue'`, sounds, and an optional title card (`label`, `sublabel`).

**Transition sounds.** `sound` plays as the screen covers and `revealSound` as it uncovers. Each style has a suitable default (wipe: swish, blinds and shutter: shutter clacks, doors: thud then slide, curtain: rumble, clock: tick-tock, bubbles: bloop, pixelate: glitch, zoom: riser…), and timed sounds stretch to fit the transition. Change them per preset or per call, use `false` for silence, or name your own audio key:

```js
fx.transition('Mystery Shutter', { sound: 'riser', revealSound: false });
this.load.audio('door-creak', 'sfx/door.mp3');                     // your own file…
fx.goto('Castle', {}, 'Sliding Doors', { revealSound: 'door-creak' }); // …works by key
```

New transition sounds: `swish, shutter, slide, thud, rumble, riser, bloop, glitch, tickTock` (plus all the others: whoosh, chime, sparkle, fanfare…).

**Built-in transitions:** Fade to Black, Dip to White, Circle Iris, Heart Iris, Star Spin Iris, Diagonal Wipe, Slide Left, Sliding Doors, Theatre Curtain, Blinds, Diagonal Stripes, Checker Diagonal, Pixel Dissolve, Diamond Spiral, Clock Wipe, Comic Bubbles, Heart Shower, Retro Pixelate, Zoom Through, Spin Dive, Chapter Card, Mystery Shutter, Candy Stripes, Star Shutter. The 1.0 names (`fade`, `iris`, `wipe`, `blinds`, `zoom`) still work.

**Built-in particles:** Sparkle Burst, Spark Shower, Fire, Smoke Puff, Magic Dust, Confetti Pop, Snowfall, Rain, Explosion, Hearts, Coin Shower, Bubbles, Healing Aura, Portal Swirl, Level-Up Pillar, Poison Cloud, Electric Zap, Leaf Fall, Firefly Swarm, Star Trail.

**Built-in effects:** Correct Answer, Gentle Try Again, Level Up, Critical Hit, Treasure Open, Power Up, Heal, Teleport, Defeat Poof, Big Explosion, Unlock!, Love, Victory.

**Preset formats**

| format | shape |
|---|---|
| `phaserfx-transition` | `{ name, style, duration, hold, color, easeIn, easeOut, reveal, sound, revealSound, label, sublabel, labelColor, labelSize, params }` |
| `phaserfx-particles` | `{ name, textures?, layers: [{ texture, blend, emit, zone, lifespan, speed, angle, gravityX/Y, accelX/Y, moveTo, scale, alpha, rotation, color, flutter }] }` (one layer = one emitter; custom images ride along as data URLs in `textures`) |
| `phaserfx-effect` | `{ name, steps: [{ type, at, …params }] }`, step types: particles, shake, flash, hitStop, slowmo, shockwave, rays, glow, text, sound, confetti, fireworks, camera, target, coins, emote |
| `phaserfx-pack` | `{ name, presets: [ … ] }` |

Your own transition style: `class Ripple extends PhaserFX.TransitionStyle { static id = 'ripple'; render(t, phase) { … } }` then `PhaserFX.Transition.register(Ripple)`.

#### PhaserFX Studio

Open `studio/index.html` (served, like the examples). Three editors share one live Phaser stage:

- **Transitions:** pick a style, tune its options, timing, colour and cover/reveal sounds (▶ to hear them); play it between two scenes, play only the cover or reveal half, or scrub it frame by frame. Click the stage to set the iris/clock centre. A graph shows screen coverage over time.
- **Particles:** layers (show/hide, reorder, duplicate), texture picker with uploads, burst or stream emission, emit shapes, speed/angle/gravity/acceleration, fly-to-point, size/rotation/colour/fade over life, flutter. Click to fire, follow the pointer, change background and size, slow motion, live particle count. Exports PhaserFX code, JSON and plain Phaser code.
- **Effects:** a timeline of steps you drag in time, played on a stand-in target (card, character, button, chest, enemy). Exports a pack that includes any of your own particle presets it uses.

Every editor has Undo / Redo (Ctrl/⌘+Z, Ctrl/⌘+Shift+Z or Ctrl+Y); a slider drag counts as one step, and each editor keeps its history when you switch tabs. Examples are read-only; saving makes your own copy under "My presets". Export all gives you one pack JSON for your game.

### Action & impact

```js
await fx.hit(enemy, { damage: 12, crit: Math.random() < 0.2, fromX: player.x });
fx.damageNumber(x, y, 'MISS');
const hp = fx.healthBar(0, -20, { follow: enemy, width: 80, height: 10 });  // or a HUD bar: fx.healthBar(400, 30)
hp.damage(12); hp.heal(5);
```

### Utilities

```js
fx.grayTexture('hero')        // → 'hero__pfx-gray'  (locked/disabled look)
fx.whiteTexture('hero')       // → 'hero__pfx-white' (hit flash)
fx.medalTexture('#ff5fa2', '♥')
```

Built-in textures are available from `create()` onward: `pfx-glow, pfx-dot, pfx-ember, pfx-smoke, pfx-spark, pfx-star, pfx-ring, pfx-ray, pfx-flare, pfx-confetti, pfx-shard, pfx-coin, pfx-drop, pfx-leaf, pfx-heart, pfx-star5, pfx-star5-empty, pfx-card-back, pfx-pack…`. You can use them in your own emitters too.

---

## 4. Recipes

**A right answer that feels great**
```js
async onAnswer(btn, isRight) {
  if (isRight) {
    this.streak.hit();
    this.xp.add(20, btn.x, btn.y);
    await this.fx.correct(btn, { points: 10 * this.streak.multiplier, scoreText: this.scoreText, others: this.buttons });
    this.nextQuestion();
  } else {
    this.streak.miss();
    await this.fx.wrong(btn, { message: `Nice try! ${this.q.hint}` });
    if (++this.tries === 2) this.hintHandle = this.fx.hint(this.correctButton);
  }
}
```

**Level complete**
```js
const panel = await this.fx.starRating(stars, { score });
if (stars === 3) await this.fx.badge({ title: 'Perfectionist', description: '3 stars on every level', glyph: '★' });
this.fx.goto('Map', { completed: level }, { type: 'iris' });
```

**Boss hit**
```js
await this.fx.hit(boss, { damage, crit, fromX: hero.x });
if (bossHp.value <= 0) {
  await this.fx.impact(boss.x, boss.y, { power: 1.6 });
  await this.fx.coins(boss, coinIcon, { count: 20 });
  this.fx.fireworks(boss.x, boss.y - 150);
}
```

**Story intro in 4 lines**
```js
await this.fx.transition('fade', { duration: 600 });
await this.fx.chapterTitle('Chapter 1', { subtitle: 'The day everything changed' });
this.fx.emote(pip, 'surprise');
await this.fx.dialogue({ speakers }).play(script);
```

**Unlock the next lesson**
```js
const locked = this.fx.lock(lessonIcon);
// …when the previous lesson is done:
await locked.unlock({ label: 'NEW LESSON!' });
```

---

## 5. Good to know

- **Depth:** effects use `settings.depth` (1000) plus small offsets, and modals sit around 1600–1950. If your HUD is higher, raise `settings.depth`.
- **Containers:** feedback, reveal and emote effects work on objects inside containers. `fx.lock()` works best on top-level images.
- **Scene changes:** components clean themselves up when the scene shuts down. Call `destroy()` yourself to remove one earlier.
- **Physics:** `hitStop` pauses Arcade or Matter worlds while it freezes. Turn this off with `settings.hitStopPausesPhysics = false`.
- **Performance:** one-shot bursts create an emitter, explode it and remove it. For something you fire many times a second, build your own emitter once with the `pfx-*` textures.
- **Canvas renderer:** everything works. `glow` falls back to a soft sprite and `lock` uses a baked grayscale texture.
- **Cross-origin images:** `grayTexture` and `whiteTexture` (used by `lock` and `hit`) need readable pixels. Serve images from the same origin or with CORS. Otherwise `lock()` dims the image instead and `hit()` blinks.

### Every device: quality levels, fallbacks and fail-safes

PhaserFX checks the device once at start-up (`PhaserFX.device.info`: WebGL, camera and object effects, audio, memory, cores, a first quality guess) and scales effects to it.

```js
PhaserFX.settings.quality = 'auto';   // default: device guess, then adapts to frame rate
PhaserFX.settings.quality = 'low';    // or fix it from a Graphics option: 'high' | 'medium' | 'low'
PhaserFX.events.on('quality', (level, reason) => console.log(level, reason));  // e.g. 'medium', 'frame rate 38 fps'
PhaserFX.events.on('fallback', (kind, name, reason) => …);                       // a preset swapped for its fallback
```

| Level | Particles | Cap per emitter | Live cap | Tiles / bubbles |
|---|---|---|---|---|
| high | 100% | none | 1600 | 100% |
| medium | 70% | 400 | 800 | 70% |
| low | 40% | 150 | 350 | 45% |

- **Adaptive:** in `'auto'`, if the game runs under `settings.minFps` (45) for 2 seconds, quality steps down; after a long smooth spell it steps back up (`settings.adaptive = false` turns this off).
- **Fallbacks:** a style that needs something the device lacks (the `pixelate` transition needs WebGL camera effects) plays the preset's `fallback`, or a simple fade. Any preset can be marked `heavy: true` with a `fallback` to swap at low quality: `{ name: 'Mega Boom', heavy: true, fallback: 'Explosion', … }`. Glow, the locked grey look and the white hit flash already use Canvas-safe versions.
- **Fail-safes:** a transition that errors or stalls still runs `onCovered` once and resolves; `goto()` always starts the next scene (a second `goto` while leaving is ignored); `play()` always resolves, even if the scene closes; unknown preset names warn and skip instead of throwing (`settings.warnings = false` silences the console).
- **Audio** starts on the player's first tap or key press, so the first sound isn't lost on iOS. Lost WebGL contexts raise `contextlost` / `contextrestored` events.
- **Test it:** `PhaserFX.device.override({ webgl: false })` pretends to be an older device. In the Studio, use **Preview as** (High, Medium, Low, No WebGL, Reduced motion) and the **Devices** section of each preset.

### Accessibility

- With `reducedMotion` on, particle counts drop by about 55%, and shake, zoom, hit-stop, wobble and pulses stop. Flashes become soft.
- No effect produces more than 3 bright flashes per second.
- Wrong-answer feedback is kind and useful (see `wrong` and `hint`).
- Timers use the ring, colour, number and sound together, so they never rely on colour alone. Offer an untimed mode for learners who need it.

---

## 6. Files

```
dist/
  phaser-fx.js        script tag / CommonJS / AMD (readable)
  phaser-fx.min.js    minified script tag build
  phaser-fx.esm.js    ES module (import PhaserFX from …)
  phaser-fx.d.ts      TypeScript types (also gives JS autocomplete)
src/                  source, one class per file
  core/               Settings, Synth, Textures, Juice, Component
  effects/            one-shot effects (Particles, Feedback, CardFX, Emote, ChapterTitle, Transition, Combat)
  transitions/        TransitionStyle base, 11 styles, TransitionPlayer
  presets/            PresetLibrary, ParticlePreset/Handle, EffectPreset, Builtin* preset lists
  components/         long-lived effects (Fire, Weather, XPBar, Dialogue, DayNight, Spotlight, …)
  FX.js               the scene plugin (the this.fx API)
  PhaserFX.js         the public namespace
examples/             a small game showing every feature (Quiz, Battle, Cards, Story, Transitions)
studio/               PhaserFX Studio: transition, particle and effect editors
tools/build.mjs       rebuilds dist/ from src/
```

To rebuild after editing `src/`, run `node tools/build.mjs` (add `npm i -D terser` to also produce the `.min.js`).

To run the examples or Studio, serve the folder (for example with `python3 -m http.server`) and open `/examples/` or `/studio/`.

MIT License.
