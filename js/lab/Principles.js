/** Principles — the written guide shown in the "Principles" view. */
class Principles {
  static html() {
    return `
<article class="guide">
  <header class="guide-head">
    <p class="eyebrow">The guide</p>
    <h2>How great game effects are made</h2>
    <p class="lede">All 29 effects in this lab are built from the same small set of ideas. Learn these and you can design your own instead of copying recipes.</p>
    <nav class="toc" aria-label="Guide sections">
      <a href="#g-beats">Beats</a><a href="#g-timing">Timing</a><a href="#g-easing">Easing</a><a href="#g-layers">Layers</a>
      <a href="#g-tex">Textures & blend</a><a href="#g-rarity">Rarity budget</a><a href="#g-impact">Impact</a>
      <a href="#g-perf">Performance</a><a href="#g-a11y">Accessibility</a><a href="#g-learn">Learning feedback</a><a href="#g-story">Story effects</a><a href="#g-pick">Which effect when?</a><a href="#g-port">Use in your game</a><a href="#g-ex">Exercises</a>
    </nav>
  </header>

  <section id="g-beats">
    <h3>1 · Every effect has three beats</h3>
    <div class="beats">
      <div class="beat"><b>Anticipation</b><span>A wind-up that tells the player something is coming: a squash, a rattle, a glow building, particles being pulled in.</span></div>
      <div class="beat hot"><b>Action</b><span>The moment itself. It should be fast and bright, often only 2 to 6 frames of peak.</span></div>
      <div class="beat"><b>Follow-through</b><span>Things settle: debris falls, smoke drifts, the card overshoots and lands, sparkles linger.</span></div>
    </div>
    <p>A flat effect usually has no anticipation, so the action arrives without warning, and no follow-through, so it stops dead. <em>Locked Card Unlock</em> and <em>Legendary Reveal</em> are built beat by beat; open them in slow motion and watch for each one.</p>
  </section>

  <section id="g-timing">
    <h3>2 · Timing cheat sheet</h3>
    <table>
      <thead><tr><th>Thing</th><th>Typical time</th><th>Notes</th></tr></thead>
      <tbody>
        <tr><td>Button press feedback</td><td>80–150 ms</td><td>Faster than you think; over 200 ms feels laggy.</td></tr>
        <tr><td>Pop-in / toast</td><td>200–350 ms</td><td>Back.easeOut for a friendly overshoot.</td></tr>
        <tr><td>Card flip</td><td>350–550 ms</td><td>Split evenly: half to edge-on, half back.</td></tr>
        <tr><td>Hit-stop</td><td>50–120 ms</td><td>3 to 7 frames. Longer starts to feel like lag.</td></tr>
        <tr><td>Screen shake</td><td>100–300 ms</td><td>Intensity 0.003–0.01. It should decay, never loop.</td></tr>
        <tr><td>Spark lifespan</td><td>300–800 ms</td><td>Short and fast reads as energy.</td></tr>
        <tr><td>Smoke / embers</td><td>1.5–4 s</td><td>Slow and long reads as aftermath.</td></tr>
        <tr><td>Big reveal build-up</td><td>1–2.5 s</td><td>Let the player skip it on repeat views.</td></tr>
      </tbody>
    </table>
  </section>

  <section id="g-easing">
    <h3>3 · Easing: pick by feeling</h3>
    <table>
      <thead><tr><th>Ease</th><th>Feels like</th><th>Use for</th></tr></thead>
      <tbody>
        <tr><td><code>Linear</code></td><td>Robotic</td><td>Rotations that loop forever, progress bars, scrolling.</td></tr>
        <tr><td><code>Sine.easeInOut</code></td><td>Calm, breathing</td><td>Idle bobbing, glows that pulse.</td></tr>
        <tr><td><code>Quad / Cubic.easeOut</code></td><td>Quick then soft</td><td>Things being thrown or flying in; rising against gravity.</td></tr>
        <tr><td><code>Quad / Cubic.easeIn</code></td><td>Building speed</td><td>Falling, being sucked in, a stamp slamming down.</td></tr>
        <tr><td><code>Back.easeOut</code></td><td>Overshoot and settle</td><td>Cards landing, buttons, UI panels, anything "pop".</td></tr>
        <tr><td><code>Elastic.easeOut</code></td><td>Wobbly, jelly</td><td>Cartoon hits, a word that boings. Use rarely.</td></tr>
        <tr><td><code>Bounce.easeOut</code></td><td>Lands and bounces</td><td>Drops onto a surface: coins, a card falling into place.</td></tr>
      </tbody>
    </table>
  </section>

  <section id="g-layers">
    <h3>4 · Layer it, from light to heavy</h3>
    <p>One emitter looks like dots. Great effects stack 3 to 6 simple layers, each with a different speed and lifespan:</p>
    <ol class="layers">
      <li><b>Core flash</b>: one glow image, about 150 ms. Sells the instant.</li>
      <li><b>Fast detail</b>: sparks and streaks, 300–700 ms. Sells energy and direction.</li>
      <li><b>Mid shapes</b>: rings, rays, stars. Sells the shape of the effect.</li>
      <li><b>Slow aftermath</b>: smoke, embers, dust, falling debris, 1–4 s. Sells weight.</li>
      <li><b>Light</b>: a big soft tinted glow behind everything. Sells heat and magic.</li>
      <li><b>Screen</b>: shake, flash, zoom, hit-stop. Sparingly, for the big moments only.</li>
    </ol>
  </section>

  <section id="g-tex">
    <h3>5 · Textures, tint and blend modes</h3>
    <ul>
      <li><b>Soft, white textures.</b> A radial gradient fading to transparent is the most useful particle texture there is. Keep textures white and colour them with <code>tint</code> or <code>color</code> so one texture serves every colour.</li>
      <li><b>ADD for light</b> (fire, sparks, magic, glows): colours add up and overlapping particles get brighter. <b>NORMAL for matter</b> (smoke, dust, confetti, debris): it should block what is behind it.</li>
      <li><b>Colour over life</b> (<code>color: [white, yellow, orange, red]</code>) does more for fire than any texture. Under ADD, fading to near-black means fading out.</li>
      <li><b>Fade in AND out</b> for slow things like smoke (alpha follows <code>sin(π·t)</code>) so puffs never pop into existence.</li>
      <li>Bake art into textures once (canvas or RenderTexture) instead of redrawing Graphics every frame.</li>
    </ul>
  </section>

  <section id="g-rarity">
    <h3>6 · The rarity budget</h3>
    <p>If every card explodes, nothing feels special. Give each tier a budget and only <em>add</em> layers as rarity goes up. That is what <code>RarityFX.js</code> does:</p>
    <table>
      <thead><tr><th>Tier</th><th>Adds</th><th>Length</th></tr></thead>
      <tbody>
        <tr><td><span class="gem" style="--g:#9aa6c8"></span>Common</td><td>pop + puff</td><td>~0.3 s</td></tr>
        <tr><td><span class="gem" style="--g:#4fa3ff"></span>Rare</td><td>+ sparkles + ring + chime</td><td>~0.6 s</td></tr>
        <tr><td><span class="gem" style="--g:#b06bff"></span>Epic</td><td>+ rays + glow + burst + light shake</td><td>~1 s</td></tr>
        <tr><td><span class="gem" style="--g:#ffc94a"></span>Legendary</td><td>+ hit-stop + flash + big shake + stamp + fanfare</td><td>~1.6 s+</td></tr>
      </tbody>
    </table>
    <p>Add <b>tells</b>: let rare cards glow faintly before they are flipped (see <em>Pack Opening</em>). And deal the best card last.</p>
  </section>

  <section id="g-impact">
    <h3>7 · Hit-stop, shake and flash</h3>
    <ul>
      <li><b>Hit-stop</b> freezes the world for a few frames at the moment of contact. The brain gets time to register the hit. Freeze <em>before</em> spawning the impact particles.</li>
      <li><b>Shake</b> should be short, decay to zero and never loop. Small games need very little: 0.004 is already a lot on a phone.</li>
      <li><b>Flash</b> one frame bright, then fade fast. Use a warm white or the effect's colour, not saturated red.</li>
      <li>Save all three for the moments that matter. If the coin pickup shakes the screen, the boss hit cannot feel bigger.</li>
    </ul>
  </section>

  <section id="g-perf">
    <h3>8 · Performance</h3>
    <ul>
      <li><b>Create emitters once</b>, then <code>explode()</code> them again and again (see <em>Spark Burst</em>). Creating and destroying emitters every click wastes work.</li>
      <li>Set <code>maxParticles</code> on emitters that can be spammed.</li>
      <li><b>Pool</b> sprites you animate by hand (coins) with <code>group.get()</code> and <code>killAndHide()</code>.</li>
      <li>Particles live in the emitter's <em>local</em> space (Phaser 3.60+). Use <code>startFollow()</code> for trails; moving the emitter drags every live particle along with it.</li>
      <li>Phones: aim for a few hundred live particles at once. Large ADD particles that cover the screen cost more than many small ones.</li>
      <li>Canvas renderer gotcha: a particle drawn at scale exactly <code>0</code> can break the 2D canvas. Start "grow-in" particles at <code>0.01</code>, not <code>0</code>.</li>
      <li><code>preFX</code> (glow, shine) is WebGL only. Always have a Canvas fallback like <code>Juice.glow()</code>.</li>
    </ul>
  </section>

  <section id="g-a11y">
    <h3>9 · Accessibility is part of the design</h3>
    <ul>
      <li><b>Respect <code>prefers-reduced-motion</code></b>: fewer particles, no shake, no zoom, softer flashes. In this lab, everything reads <code>Juice.reduced</code>. Try the Reduce motion button.</li>
      <li><b>Flashing</b>: never more than 3 bright flashes per second, and avoid large saturated red flashes (WCAG 2.3.1).</li>
      <li><b>Let players skip</b> long reveals after the first time, or tap to fast-forward.</li>
      <li><b>Never rely on colour alone</b>: these cards show rarity as a colour, a gem and a written label.</li>
      <li>Keep sound optional and short, and make sure effects never hide text the player needs to read.</li>
    </ul>
  </section>

  <section id="g-learn">
    <h3>10 · Feedback that helps people learn</h3>
    <p>In a learning game, effects are part of the teaching. The goal is to keep learners trying, not to make them feel judged.</p>
    <ul>
      <li><b>Right answers:</b> confirm on the tile they touched, then send the reward to where it is counted (<em>Correct Answer</em>). Keep it under a second, because they will see it many times.</li>
      <li><b>Wrong answers:</b> no red flash, buzzer or shake. Use a soft colour, a small "head-shake" wiggle and a <em>useful</em> hint (<em>Gentle Retry</em>). Show tries as neutral dots, not lost lives.</li>
      <li><b>Scaffold:</b> after a couple of tries, gently highlight the right answer so nobody gets stuck. The learner still taps it.</li>
      <li><b>Reward effort and habits</b> as well as scores: "Asked 10 questions" and "Kept going" badges (<em>Badge Unlock</em>).</li>
      <li><b>Show progress as a journey</b> (<em>Progress Map</em>, <em>XP Bar</em>). Seeing how far you have come motivates more than a percentage.</li>
      <li><b>Streaks:</b> make them grow visibly, and end them kindly ("Great run of 4!") (<em>Streak & Combo</em>).</li>
      <li><b>Timers:</b> ramp urgency only in the last seconds, use more than colour, and offer an untimed mode (<em>Quiz Timer</em>).</li>
      <li><b>Results:</b> reveal stars one at a time and always show the empty slots, so a missed star reads as "next time" (<em>Star Rating</em>).</li>
    </ul>
  </section>

  <section id="g-story">
    <h3>11 · Effects for storytelling</h3>
    <ul>
      <li><b>Text is the star.</b> Typewriter text should always be skippable: the first click finishes the line, the second advances. Give each speaker a voice blip pitch (<em>Typewriter Dialogue</em>).</li>
      <li><b>Show feelings, do not tell them.</b> An emote is a symbol plus a body reaction (<em>Emotion Bubbles</em>). In SEL stories, pause and ask "How does Pip feel?"</li>
      <li><b>Mark the chapters.</b> Letterbox bars plus a staggered title (<em>Chapter Title</em>) tell the audience a new part begins. Hold long enough to read.</li>
      <li><b>Pick transitions by meaning:</b> fade = time passes, iris = focus on someone, push = travel, zoom = diving in, wipe/blinds = playful breaks (<em>Scene Transitions</em>).</li>
      <li><b>Atmosphere carries mood:</b> rain before a sad moment, snow for a cosy one, a sunset for an ending (<em>Weather</em>, <em>Day & Night</em>). Drive the whole scene from one value, such as the hour.</li>
      <li><b>Limited vision makes curiosity:</b> a torch beam (<em>Spotlight Search</em>) turns any picture into an exploration.</li>
      <li>Keep ambient effects calm and slow. They should support the story, never compete with the text.</li>
    </ul>
  </section>

  <section id="g-pick">
    <h3>12 · Which effect when?</h3>
    <table>
      <thead><tr><th>Moment</th><th>Try</th></tr></thead>
      <tbody>
        <tr><td>Learner answers right</td><td>Correct Answer → Coin Fountain or XP Bar</td></tr>
        <tr><td>Learner answers wrong</td><td>Gentle Retry (never Shockwave)</td></tr>
        <tr><td>End of a lesson or level</td><td>Star Rating, then Confetti for 3 stars</td></tr>
        <tr><td>New topic, level or character unlocked</td><td>Progress Map, Locked Card Unlock</td></tr>
        <tr><td>Habit or milestone</td><td>Badge Unlock, Streak & Combo</td></tr>
        <tr><td>Rare reward</td><td>Legendary Reveal, Pack Opening</td></tr>
        <tr><td>Combat or "quiz battle"</td><td>Hit & Damage Numbers, Impact Shockwave</td></tr>
        <tr><td>Story begins or a chapter changes</td><td>Chapter Title, Scene Transitions</td></tr>
        <tr><td>Characters talk</td><td>Typewriter Dialogue + Emotion Bubbles</td></tr>
        <tr><td>Setting the mood</td><td>Weather, Day & Night, Fire & Smoke</td></tr>
        <tr><td>Exploring or searching</td><td>Spotlight Search, Magic Trail</td></tr>
      </tbody>
    </table>
  </section>

  <section id="g-port">
    <h3>13 · Use it in your game (Phaser 3.60+)</h3>
    <ol>
      <li>Copy <code>js/fx/</code> (Juice, FXTextures, Card, CardArt, RarityFX, UIArt, QuizBoard) and <code>js/core/FXSound.js</code> into your project, and load them after Phaser.</li>
      <li>In your boot or preload scene, call <code>FXTextures.generate(this)</code> once (plus <code>UIArt.generate(this)</code> for stars, badges and characters). Swap <code>CardArt</code> for your own card textures.</li>
      <li>Set <code>Juice.sound = new FXSound()</code> (or wire <code>Juice.sfx</code> to your own audio) and <code>Juice.reduced</code> from your settings.</li>
      <li>Copy any effect class you like from <code>js/effects/</code>: each one is self-contained. Its <code>start()</code> builds the effect and <code>play(x, y)</code> triggers it. Then, anywhere:</li>
    </ol>
<pre class="snippet"><code>// a card the player just won
const card = new Card(this, 480, 300, 'card-holy-guac');
await card.flip();
RarityFX.play(this, card, 'epic');

// a quick reward
Juice.burst(this, x, y, 'fx-star', {
  speed: { min: 80, max: 260 }, lifespan: 700,
  scale: { start: 0.7, end: 0 }, blendMode: 'ADD'
}, 20);</code></pre>
    <p>Older Phaser (3.55 and earlier) used <code>this.add.particles(key).createEmitter(config)</code>. The config keys are mostly the same, but positions were in world space.</p>
  </section>

  <section id="g-ex">
    <h3>14 · Exercises</h3>
    <ol>
      <li><b>Feel the difference.</b> In <em>Impact Shockwave</em>, set hit-stop to 0 and click. Then set it to 90. Which one hits harder?</li>
      <li><b>Remove a layer.</b> In <code>SparkBurst.js</code>, delete the embers emitter. What is missing?</li>
      <li><b>New tier.</b> Add a "mythic" rarity to <code>CardArt.RARITY</code> and give it a budget in <code>RarityFX.play()</code> that tops legendary without being longer.</li>
      <li><b>Pun-themed burst.</b> Make a texture shaped like a tiny cat face and use it for the common card's puff.</li>
      <li><b>Skip button.</b> Let a second click during <em>Legendary Reveal</em> jump straight to the Reveal beat.</li>
      <li><b>Reduced motion.</b> Design a version of the unlock that uses no movement at all: only colour, glow and sound.</li>
      <li><b>Kind feedback.</b> In <code>GentleRetry.js</code>, write three new encouraging lines, and make the hint appear only on the second try.</li>
      <li><b>New emote.</b> Add a "proud" emote to <code>EmotionBubbles.js</code>: chest-out squash, a small sparkle and a star in the bubble.</li>
      <li><b>Story beat.</b> Chain Chapter Title → Scene Transitions (iris on the fox) → Typewriter Dialogue to build a 20-second story intro.</li>
    </ol>
  </section>
</article>`;
  }
}
