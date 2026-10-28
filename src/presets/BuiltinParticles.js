/**
 * BuiltinParticles — ready-made particle presets (the Particle Editor's examples).
 *   this.fx.particles('Explosion', x, y);
 * Layers only list what differs from ParticlePreset.DEFAULT_LAYER.
 */
class BuiltinParticles {
  static FIRE = ['#fff2c0', '#ffc23a', '#ff6a14', '#b3220c', '#1a0602'];

  static LIST = [
    { name: 'Sparkle Burst', layers: [
      { name: 'stars', texture: 'pfx-star', emit: { mode: 'burst', count: 24 }, speed: { min: 80, max: 260 }, lifespan: { min: 500, max: 900 }, scale: { start: 0.7, end: 0 }, rotation: { mode: 'spin', spinMin: -4, spinMax: 4 }, color: { mode: 'overLife', colors: ['#ffffff', '#ffd86b'] }, gravityY: 60 },
      { name: 'glints', texture: 'pfx-dot', emit: { mode: 'burst', count: 16 }, speed: { min: 40, max: 160 }, scale: { start: 0.5, end: 0 }, color: { mode: 'random', colors: ['#ffffff', '#ffc94a', '#ff8ac2'] } }
    ] },
    { name: 'Spark Shower', layers: [
      { name: 'sparks', texture: 'pfx-spark', emit: { mode: 'burst', count: 48 }, speed: { min: 180, max: 520 }, lifespan: { min: 400, max: 650 }, gravityY: 600, scale: { start: 0.9, end: 0.2 }, rotation: { mode: 'velocity' }, color: { mode: 'overLife', colors: ['#ffffff', '#ffe680', '#ffa82e', '#ff4a1c'], ease: 'Quad.easeIn' } },
      { name: 'embers', texture: 'pfx-ember', emit: { mode: 'burst', count: 16 }, speed: { min: 30, max: 160 }, lifespan: { min: 700, max: 1300 }, gravityY: 210, scale: { start: 0.55, end: 0 }, color: { mode: 'overLife', colors: ['#ffe680', '#ff7a1a', '#80200a'] } }
    ] },
    { name: 'Fire', layers: [
      { name: 'smoke', texture: 'pfx-smoke', blend: 'NORMAL', depth: -2, emit: { mode: 'stream', frequency: 200 }, zone: { type: 'ellipse', width: 60, height: 10 }, angle: { min: -100, max: -80 }, speed: { min: 40, max: 70 }, lifespan: { min: 2600, max: 3600 }, scale: { start: 0.4, end: 2.4 }, alpha: { mode: 'fadeInOut', max: 0.4 }, rotation: { mode: 'random' }, color: { mode: 'random', colors: ['#3c3550', '#4a4360', '#2e2840'] } },
      { name: 'flames', texture: 'pfx-ember', emit: { mode: 'stream', frequency: 22 }, zone: { type: 'ellipse', width: 80, height: 14 }, angle: { min: -100, max: -80 }, speed: { min: 110, max: 200 }, lifespan: { min: 550, max: 950 }, scale: { start: 1.5, end: 0.15, ease: 'Quad.easeIn' }, alpha: { start: 0.85, end: 0.2 }, color: { mode: 'overLife', colors: BuiltinParticles.FIRE, ease: 'Sine.easeOut' } },
      { name: 'embers', texture: 'pfx-dot', depth: 1, emit: { mode: 'stream', frequency: 140 }, angle: { min: -120, max: -60 }, speed: { min: 70, max: 160 }, lifespan: { min: 1600, max: 2600 }, scale: { start: 0.35, end: 0 }, color: { mode: 'overLife', colors: ['#ffe680', '#ff7a1a', '#802008'] } }
    ] },
    { name: 'Smoke Puff', layers: [
      { name: 'puff', texture: 'pfx-smoke', blend: 'NORMAL', emit: { mode: 'burst', count: 12 }, speed: { min: 30, max: 120 }, lifespan: { min: 700, max: 1200 }, scale: { start: 0.5, end: 1.6 }, alpha: { start: 0.55, end: 0 }, rotation: { mode: 'random' }, color: { mode: 'random', colors: ['#d8dcf0', '#b8bcd0', '#9ea3bb'] } }
    ] },
    { name: 'Magic Dust', layers: [
      { name: 'twinkles', texture: 'pfx-star', emit: { mode: 'stream', frequency: 60 }, zone: { type: 'circle', radius: 60 }, speed: { min: 5, max: 30 }, gravityY: -30, lifespan: { min: 1000, max: 1600 }, scale: { start: 0.5, end: 0 }, alpha: { mode: 'flicker', min: 0.3, max: 1 }, rotation: { mode: 'spin', spinMin: -3, spinMax: 3 }, color: { mode: 'random', colors: ['#ffffff', '#a8f0ff', '#ffb3e6', '#d0b8ff'] } }
    ] },
    { name: 'Confetti Pop', layers: [
      { name: 'paper', texture: 'pfx-confetti', blend: 'NORMAL', emit: { mode: 'burst', count: 60 }, speed: { min: 250, max: 600 }, angle: { min: -160, max: -20 }, gravityY: 500, lifespan: { min: 2200, max: 2800 }, scale: { mode: 'random', min: 0.7, max: 1.1 }, alpha: { start: 1, end: 0, ease: 'Quint.easeIn' }, rotation: { mode: 'spin', spinMin: -8, spinMax: 8 }, flutter: 26, color: { mode: 'random', colors: ['#ff5fa2', '#ffc94a', '#4fe0c8', '#7a8cff', '#ffffff'] } }
    ] },
    { name: 'Snowfall', layers: [
      { name: 'far', texture: 'pfx-dot', blend: 'NORMAL', emit: { mode: 'stream', frequency: 90 }, zone: { type: 'line', width: 1100 }, angle: { min: 80, max: 100 }, speed: { min: 20, max: 45 }, lifespan: { min: 9000, max: 9000 }, accelX: { min: -8, max: 8 }, scale: { mode: 'random', min: 0.1, max: 0.2 }, alpha: { mode: 'random', min: 0.4, max: 0.6 } },
      { name: 'near', texture: 'pfx-dot', blend: 'NORMAL', emit: { mode: 'stream', frequency: 140 }, zone: { type: 'line', width: 1100 }, angle: { min: 80, max: 100 }, speed: { min: 50, max: 90 }, lifespan: { min: 9000, max: 9000 }, accelX: { min: -12, max: 12 }, scale: { mode: 'random', min: 0.3, max: 0.5 }, alpha: { mode: 'random', min: 0.8, max: 1 } }
    ] },
    { name: 'Rain', layers: [
      { name: 'drops', texture: 'pfx-drop', blend: 'NORMAL', emit: { mode: 'stream', frequency: 10, quantity: 2 }, zone: { type: 'line', width: 1200 }, angle: { min: 96, max: 100 }, speed: { min: 900, max: 1100 }, lifespan: { min: 600, max: 650 }, scale: { mode: 'random', min: 0.7, max: 1.2 }, alpha: { mode: 'random', min: 0.4, max: 0.8 }, rotation: { mode: 'velocity', offset: -90 }, color: { mode: 'single', colors: ['#bfd6ff'] } }
    ] },
    { name: 'Explosion', layers: [
      { name: 'flash', texture: 'pfx-glow', emit: { mode: 'burst', count: 1 }, speed: { min: 0, max: 0 }, lifespan: { min: 260, max: 260 }, scale: { start: 0.3, end: 3.2, ease: 'Cubic.easeOut' }, alpha: { start: 1, end: 0 }, color: { mode: 'single', colors: ['#fff1c4'] } },
      { name: 'fireball', texture: 'pfx-ember', emit: { mode: 'burst', count: 40 }, speed: { min: 100, max: 500 }, lifespan: { min: 400, max: 800 }, scale: { start: 1.6, end: 0, ease: 'Quad.easeIn' }, color: { mode: 'overLife', colors: BuiltinParticles.FIRE } },
      { name: 'smoke', texture: 'pfx-smoke', blend: 'NORMAL', depth: -1, emit: { mode: 'burst', count: 14, delay: 80 }, speed: { min: 40, max: 160 }, lifespan: { min: 1200, max: 1800 }, scale: { start: 0.6, end: 2.2 }, alpha: { mode: 'fadeInOut', max: 0.5 }, rotation: { mode: 'random' }, color: { mode: 'random', colors: ['#4a4360', '#3c3550', '#5a5370'] } },
      { name: 'debris', texture: 'pfx-shard', blend: 'NORMAL', emit: { mode: 'burst', count: 18 }, speed: { min: 250, max: 600 }, angle: { min: -170, max: -10 }, gravityY: 1100, lifespan: { min: 800, max: 1200 }, scale: { mode: 'random', min: 0.3, max: 0.7 }, alpha: { start: 1, end: 0, ease: 'Quint.easeIn' }, rotation: { mode: 'spin', spinMin: -14, spinMax: 14 }, color: { mode: 'random', colors: ['#3a2f4a', '#5a4a3a', '#2a2530'] } }
    ] },
    { name: 'Hearts', layers: [
      { name: 'hearts', texture: 'pfx-heart', blend: 'NORMAL', emit: { mode: 'burst', count: 12 }, speed: { min: 60, max: 200 }, angle: { min: -150, max: -30 }, gravityY: -40, lifespan: { min: 1200, max: 1800 }, scale: { start: 0.5, end: 1.1 }, alpha: { start: 1, end: 0, ease: 'Quad.easeIn' }, rotation: { mode: 'random', min: -20, max: 20 }, color: { mode: 'random', colors: ['#ff5fa2', '#ff8ac2', '#ffb3d1'] } }
    ] },
    { name: 'Coin Shower', layers: [
      { name: 'coins', texture: 'pfx-coin', blend: 'NORMAL', emit: { mode: 'burst', count: 20 }, speed: { min: 250, max: 520 }, angle: { min: -125, max: -55 }, gravityY: 900, lifespan: { min: 1300, max: 1500 }, scale: { mode: 'random', min: 0.6, max: 0.9 }, alpha: { start: 1, end: 0, ease: 'Quint.easeIn' }, flutter: 30 }
    ] },
    { name: 'Bubbles', layers: [
      { name: 'bubbles', texture: 'pfx-ring', blend: 'NORMAL', emit: { mode: 'stream', frequency: 120 }, zone: { type: 'line', width: 300 }, angle: { min: -95, max: -85 }, speed: { min: 40, max: 90 }, accelX: { min: -20, max: 20 }, lifespan: { min: 2500, max: 3500 }, scale: { mode: 'random', min: 0.08, max: 0.2 }, alpha: { mode: 'fadeInOut', max: 0.85 }, color: { mode: 'random', colors: ['#bfefff', '#d8f6ff', '#ffffff'] } }
    ] },
    { name: 'Healing Aura', layers: [
      { name: 'rise', texture: 'pfx-star', emit: { mode: 'stream', frequency: 50 }, zone: { type: 'ellipse', width: 120, height: 30 }, angle: { min: -95, max: -85 }, speed: { min: 40, max: 80 }, lifespan: { min: 900, max: 1300 }, scale: { start: 0.6, end: 0 }, alpha: { mode: 'fadeInOut', max: 1 }, color: { mode: 'overLife', colors: ['#ffffff', '#7dffb2', '#2fd48a'] } },
      { name: 'rings', texture: 'pfx-ring', emit: { mode: 'burst', count: 1, bursts: 3, interval: 500 }, speed: { min: 0, max: 0 }, lifespan: { min: 900, max: 900 }, scale: { start: 0.2, end: 1.3, ease: 'Cubic.easeOut' }, alpha: { start: 0.8, end: 0 }, color: { mode: 'single', colors: ['#7dffb2'] } }
    ] },
    { name: 'Portal Swirl', layers: [
      { name: 'pull', texture: 'pfx-dot', emit: { mode: 'stream', frequency: 16, quantity: 2 }, zone: { type: 'ring', radius: 100, points: 48 }, moveTo: { enabled: true, x: 0, y: 0 }, lifespan: { min: 900, max: 900 }, scale: { start: 0.6, end: 0.05 }, alpha: { start: 1, end: 1 }, color: { mode: 'overLife', colors: ['#ffffff', '#9be8ff', '#7a5cff', '#2a1f7a'] } },
      { name: 'halo', texture: 'pfx-star', emit: { mode: 'stream', frequency: 90 }, zone: { type: 'circle', radius: 100 }, speed: { min: 10, max: 40 }, lifespan: { min: 1200, max: 1200 }, scale: { start: 0.4, end: 0 }, rotation: { mode: 'random' }, color: { mode: 'overLife', colors: ['#ffffff', '#9be8ff'] } }
    ] },
    { name: 'Level-Up Pillar', layers: [
      { name: 'pillar', texture: 'pfx-dot', emit: { mode: 'stream', frequency: 8, quantity: 2, duration: 1200 }, zone: { type: 'line', width: 120 }, angle: { min: -92, max: -88 }, speed: { min: 300, max: 600 }, lifespan: { min: 600, max: 900 }, scale: { start: 0.6, end: 0 }, color: { mode: 'overLife', colors: ['#ffffff', '#ffe680', '#ffb02e'] } },
      { name: 'stars', texture: 'pfx-star', emit: { mode: 'burst', count: 30 }, speed: { min: 120, max: 360 }, lifespan: { min: 700, max: 1100 }, gravityY: 120, scale: { start: 0.7, end: 0 }, rotation: { mode: 'spin' }, color: { mode: 'overLife', colors: ['#ffffff', '#ffd86b'] } }
    ] },
    { name: 'Poison Cloud', layers: [
      { name: 'cloud', texture: 'pfx-smoke', blend: 'NORMAL', emit: { mode: 'stream', frequency: 120 }, zone: { type: 'circle', radius: 50 }, speed: { min: 10, max: 40 }, lifespan: { min: 2000, max: 3000 }, scale: { start: 0.4, end: 1.8 }, alpha: { mode: 'fadeInOut', max: 0.45 }, rotation: { mode: 'random' }, color: { mode: 'random', colors: ['#7bd96a', '#4fa846', '#9be37a'] } },
      { name: 'bubbles', texture: 'pfx-dot', emit: { mode: 'stream', frequency: 160 }, zone: { type: 'circle', radius: 50 }, angle: { min: -100, max: -80 }, speed: { min: 20, max: 60 }, lifespan: { min: 900, max: 1400 }, scale: { start: 0.35, end: 0 }, color: { mode: 'single', colors: ['#c8ff9a'] } }
    ] },
    { name: 'Electric Zap', layers: [
      { name: 'bolts', texture: 'pfx-spark', emit: { mode: 'burst', count: 30, bursts: 3, interval: 90 }, speed: { min: 300, max: 800 }, lifespan: { min: 120, max: 260 }, scale: { start: 1, end: 0.2 }, alpha: { mode: 'flicker', min: 0.4, max: 1 }, rotation: { mode: 'velocity' }, color: { mode: 'overLife', colors: ['#ffffff', '#9be8ff', '#4f7bff'] } }
    ] },
    { name: 'Leaf Fall', layers: [
      { name: 'leaves', texture: 'pfx-leaf', blend: 'NORMAL', emit: { mode: 'stream', frequency: 260 }, zone: { type: 'line', width: 1000 }, angle: { min: 80, max: 100 }, speed: { min: 50, max: 110 }, lifespan: { min: 9000, max: 9000 }, accelX: { min: -15, max: 15 }, scale: { mode: 'random', min: 0.9, max: 1.4 }, alpha: { start: 1, end: 1 }, rotation: { mode: 'spin', spinMin: -3, spinMax: 3 }, flutter: 40, color: { mode: 'random', colors: ['#e8833a', '#d4572a', '#f2b84b', '#a8452a'] } }
    ] },
    { name: 'Firefly Swarm', layers: [
      { name: 'flies', texture: 'pfx-glow', emit: { mode: 'stream', frequency: 180 }, zone: { type: 'rect', width: 400, height: 200 }, speed: { min: 5, max: 25 }, accelX: { min: -8, max: 8 }, accelY: { min: -8, max: 8 }, lifespan: { min: 2500, max: 4500 }, scale: { mode: 'random', min: 0.06, max: 0.12 }, alpha: { mode: 'flicker', min: 0.2, max: 1 }, color: { mode: 'single', colors: ['#d9ff8a'] } }
    ] },
    { name: 'Star Trail', layers: [
      { name: 'trail', texture: 'pfx-star', emit: { mode: 'stream', frequency: 24 }, speed: { min: 5, max: 30 }, lifespan: { min: 450, max: 700 }, scale: { start: 0.5, end: 0 }, rotation: { mode: 'overLife', min: 0, max: 220 }, color: { mode: 'overLife', colors: ['#ffffff', '#ffd86b', '#ff5fa2', '#8a6bff'] } }
    ] }
  ];
}
