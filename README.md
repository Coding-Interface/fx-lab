# FX Lab

FX Lab is an interactive Phaser 3 playground with **29 special effects** for games, gamified learning or assessments, and storytelling. You can play any effect, slow it to 0.25×, adjust its sliders, and read its real source code beside the stage. A Principles guide explains the ideas behind every effect.

## Run it

Serve the folder with any static server (the page loads separate script files):

```bash
cd fx-lab
python3 -m http.server 8000
# open http://localhost:8000
```

Phaser 3.80.1 loads from cdnjs and the fonts from Google Fonts. Nothing needs installing.

**Controls:**
- Click the stage to trigger the effect.
- Press **R** to replay and **S** for slow motion.
- *Reduce motion* is on automatically when the OS asks for reduced motion.
- The **Show effects for** filter (All / Games / Learning / Stories) narrows the list.

## How it is organised

Effects are grouped by **what they are**, and each one is tagged with **what it is for** (Games, Learning or Stories). Each effect also has a "Use it for" line.

| Group | Effects |
|---|---|
| **Foundations** | Easing & Squash |
| **Particles & Elements** | Spark Burst · Confetti · Magic Trail · Fire & Smoke · Portal Vortex · Fireworks · Weather (rain + lightning, snow, leaves, petals) |
| **Action & Impact** | Impact Shockwave · Hit & Damage Numbers |
| **Rewards & Progress** | Coin Fountain · Star Rating Results · XP Bar & Level Up · Badge Unlock Toast · Progress Map · Streak & Combo |
| **Answer Feedback** | Correct Answer · Gentle Retry · Quiz Timer |
| **Cards & Collectibles** | Card Flip (flat vs juicy) · Locked Card Unlock · Legendary Reveal · Pack Opening |
| **Story & Scenes** | Typewriter Dialogue · Emotion Bubbles · Chapter Title Card · Scene Transitions (fade, iris, wipe, blinds, push, zoom) · Day & Night Cycle · Spotlight Search |

### Quick chooser

| Moment | Try |
|---|---|
| Learner answers right | Correct Answer → Coin Fountain / XP Bar |
| Learner answers wrong | Gentle Retry |
| End of lesson / level | Star Rating (+ Confetti for 3 stars) |
| Unlocking the next topic | Progress Map, Locked Card Unlock |
| Habits and milestones | Badge Unlock, Streak & Combo |
| Quiz battles | Hit & Damage Numbers |
| Story intro / chapter change | Chapter Title, Scene Transitions |
| Characters talking | Typewriter Dialogue + Emotion Bubbles |
| Mood and setting | Weather, Day & Night, Fire & Smoke |
| Exploring / searching | Spotlight Search, Magic Trail |

## Folder map

```
index.html              page shell (filter, grouped list, toolbar, stage, panels)
css/lab.css             all styling (one dark theme, responsive)
js/core/FXSound.js      synthesised Web Audio sound effects
js/fx/                  ← reusable toolkit, copy into your game
  FXTextures.js         soft particle textures (glow, spark, star, ring, drop, leaf, heart…)
  Juice.js              shake, flash, hit-stop, pop, glow, rays, shine, burst, text, countUp, tween/wait promises
  CardArt.js            pun card fronts/backs, gray variants, lock, chain, pack
  UIArt.js              stars, badges, story characters (fox, owl), training slime + white hit-flash copy
  Card.js               flippable card container
  RarityFX.js           reveal effects scaled by rarity
  QuizBoard.js          question + 4 answer tiles used by the feedback effects
js/effects/             one class per effect (extends BaseEffect)
js/lab/                 the lab: registry (groups + purposes), scene, UI, code viewer, guide
js/main.js              boot
```

## Use the toolkit in your game (Phaser 3.60+)

1. Copy `js/fx/` and `js/core/FXSound.js`, and load them after Phaser.
2. In your boot scene, call `FXTextures.generate(this); UIArt.generate(this);` (and `CardArt.generate(this)` or your own card art).
3. Set `Juice.sound = new FXSound();` and `Juice.reduced` from your settings.
4. Copy any effect class from `js/effects/`. Each one is self-contained: `start()` builds it and `play(x, y)` triggers it.

```js
const card = new Card(this, 480, 300, 'card-holy-guac');
await card.flip();
RarityFX.play(this, card, 'epic');
```

## Add your own effect

1. Create `js/effects/MyEffect.js` with `class MyEffect extends BaseEffect`, and fill in its static fields (`id`, `title`, `group`, `tags`, `useFor`, `summary`, `steps`, `params`, `file`).
2. Add a `<script>` tag before `EffectRegistry.js` in `index.html`.
3. Add the class to `EffectRegistry.list`.

## Accessibility notes

- Reduced motion halves particle counts and removes shake, zoom, hit-stop, pulses and wobble. Flashes are softened.
- Lightning and flashes stay under 3 per second.
- Feedback for learners never uses red flashes or buzzers (see Gentle Retry).
- Timers use several signals (ring, number, colour, sound), and the guide recommends offering an untimed mode.
- Rarity and states are never shown by colour alone.
