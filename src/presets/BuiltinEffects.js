/**
 * BuiltinEffects — ready-made composed effects (the Effect Editor's examples).
 *   await this.fx.play('Critical Hit', 0, 0, { target: enemy });
 * Steps list only what differs from each step type's defaults.
 */
class BuiltinEffects {
  static LIST = [
    { name: 'Correct Answer', steps: [
      { type: 'target', at: 0, action: 'pop', amount: 0.6, ms: 320 },
      { type: 'sound', at: 0, name: 'correct' },
      { type: 'particles', at: 0, preset: 'Sparkle Burst' },
      { type: 'shockwave', at: 0, color: '#9dffcf', size: 1.8, ms: 450 },
      { type: 'text', at: 150, text: '+10', style: 'float', color: '#ffc94a', size: 32, dy: -60, ms: 500 }
    ] },
    { name: 'Gentle Try Again', steps: [
      { type: 'target', at: 0, action: 'wiggle', amount: 0.8 },
      { type: 'sound', at: 0, name: 'soft' },
      { type: 'text', at: 100, text: 'Try again!', style: 'float', color: '#ffd88a', size: 26, dy: -60, ms: 700 }
    ] },
    { name: 'Level Up', steps: [
      { type: 'target', at: 0, action: 'jump', amount: 0.8, ms: 400 },
      { type: 'particles', at: 0, preset: 'Level-Up Pillar' },
      { type: 'rays', at: 100, color: '#ffd23f', size: 0.9, ms: 1800 },
      { type: 'sound', at: 100, name: 'fanfare' },
      { type: 'shake', at: 300, ms: 150, intensity: 0.004 },
      { type: 'text', at: 300, text: 'LEVEL UP!', style: 'stamp', color: '#ffc94a', size: 48, dy: -110, ms: 1100 },
      { type: 'confetti', at: 400, mode: 'burst', count: 50 }
    ] },
    { name: 'Critical Hit', steps: [
      { type: 'sound', at: 0, name: 'crack' },
      { type: 'target', at: 0, action: 'flash', ms: 70 },
      { type: 'hitStop', at: 0, ms: 80 },
      { type: 'sound', at: 80, name: 'boom' },
      { type: 'particles', at: 80, preset: 'Spark Shower' },
      { type: 'shockwave', at: 80, color: '#ffd23f', size: 2.4, ms: 420 },
      { type: 'shake', at: 80, ms: 200, intensity: 0.01 },
      { type: 'target', at: 80, action: 'squash', amount: 1, ms: 420 },
      { type: 'text', at: 120, text: 'CRIT!', style: 'stamp', color: '#ff8a3d', size: 46, dy: -100, ms: 600 }
    ] },
    { name: 'Treasure Open', steps: [
      { type: 'target', at: 0, action: 'squash', amount: 1, ms: 380 },
      { type: 'sound', at: 0, name: 'chime' },
      { type: 'rays', at: 100, color: '#ffd23f', size: 0.7, ms: 1600 },
      { type: 'particles', at: 150, preset: 'Coin Shower' },
      { type: 'particles', at: 150, preset: 'Sparkle Burst', dy: -20 },
      { type: 'coins', at: 500, count: 8, corner: 'top-right' },
      { type: 'text', at: 300, text: '+50', style: 'float', color: '#ffc94a', size: 34, dy: -90, ms: 700 }
    ] },
    { name: 'Power Up', steps: [
      { type: 'sound', at: 0, name: 'charge' },
      { type: 'target', at: 0, action: 'grow', amount: 1, ms: 500 },
      { type: 'glow', at: 0, color: '#4fe0c8', strength: 8, ms: 1600, pulse: true },
      { type: 'particles', at: 0, preset: 'Magic Dust', follow: true, ms: 1500 },
      { type: 'shockwave', at: 250, color: '#4fe0c8', size: 2.2, ms: 500 },
      { type: 'sound', at: 250, name: 'sparkle' },
      { type: 'text', at: 300, text: 'POWER UP!', style: 'float', color: '#7ff7e3', size: 34, dy: -100, ms: 900 }
    ] },
    { name: 'Heal', steps: [
      { type: 'particles', at: 0, preset: 'Healing Aura', follow: true, ms: 1400 },
      { type: 'target', at: 0, action: 'tint', color: '#7dffb2', ms: 300 },
      { type: 'sound', at: 0, name: 'chime' },
      { type: 'text', at: 200, text: '+25', style: 'float', color: '#7dffb2', size: 32, dy: -90, ms: 700 }
    ] },
    { name: 'Teleport', steps: [
      { type: 'sound', at: 0, name: 'whoosh' },
      { type: 'particles', at: 0, preset: 'Portal Swirl', ms: 900 },
      { type: 'target', at: 500, action: 'fadeOut', ms: 300 },
      { type: 'flash', at: 850, ms: 160, color: '#9be8ff', alpha: 0.5 },
      { type: 'particles', at: 900, preset: 'Sparkle Burst' },
      { type: 'sound', at: 900, name: 'chime' },
      { type: 'target', at: 1100, action: 'fadeIn', ms: 300 }
    ] },
    { name: 'Defeat Poof', steps: [
      { type: 'target', at: 0, action: 'squash', amount: 1.2, ms: 200 },
      { type: 'sound', at: 100, name: 'boom' },
      { type: 'particles', at: 120, preset: 'Smoke Puff', scale: 1.4 },
      { type: 'target', at: 150, action: 'fadeOut', ms: 200 },
      { type: 'particles', at: 200, preset: 'Coin Shower' },
      { type: 'text', at: 250, text: 'Defeated!', style: 'float', color: '#9dffcf', size: 30, dy: -100, ms: 700 }
    ] },
    { name: 'Big Explosion', steps: [
      { type: 'hitStop', at: 0, ms: 70 },
      { type: 'sound', at: 0, name: 'boom' },
      { type: 'flash', at: 0, ms: 120, color: '#fff1c4', alpha: 0.7 },
      { type: 'particles', at: 0, preset: 'Explosion', scale: 1.2 },
      { type: 'shockwave', at: 0, color: '#ffffff', size: 3.6, ms: 520 },
      { type: 'shockwave', at: 90, color: '#ff8a3d', size: 2.8, ms: 600 },
      { type: 'shake', at: 0, ms: 300, intensity: 0.012 },
      { type: 'camera', at: 0, zoom: 1.06, ms: 90, hold: 60 }
    ] },
    { name: 'Unlock!', steps: [
      { type: 'target', at: 0, action: 'wiggle', amount: 0.8 },
      { type: 'sound', at: 0, name: 'charge' },
      { type: 'target', at: 300, action: 'wiggle', amount: 1.3 },
      { type: 'sound', at: 600, name: 'crack' },
      { type: 'shockwave', at: 600, color: '#ffd23f', size: 2.2, ms: 480 },
      { type: 'particles', at: 600, preset: 'Sparkle Burst', scale: 1.3 },
      { type: 'rays', at: 600, color: '#ffd23f', size: 0.8, ms: 1600 },
      { type: 'target', at: 620, action: 'pop', amount: 0.8 },
      { type: 'sound', at: 700, name: 'chime' },
      { type: 'text', at: 700, text: 'UNLOCKED!', style: 'stamp', color: '#ffc94a', size: 40, dy: -120, ms: 900 }
    ] },
    { name: 'Love', steps: [
      { type: 'emote', at: 0, emote: 'love' },
      { type: 'particles', at: 0, preset: 'Hearts', dy: -40 },
      { type: 'target', at: 0, action: 'pop', amount: 0.5 }
    ] },
    { name: 'Victory', steps: [
      { type: 'sound', at: 0, name: 'fanfare' },
      { type: 'fireworks', at: 0, dx: -220, dy: -160, size: 260 },
      { type: 'fireworks', at: 300, dx: 220, dy: -190, size: 300 },
      { type: 'fireworks', at: 600, dx: 0, dy: -230, size: 340 },
      { type: 'confetti', at: 200, mode: 'cannons', count: 80 },
      { type: 'text', at: 300, text: 'VICTORY!', style: 'banner', color: '#ffffff', size: 54, dy: 0, ms: 1400 }
    ] }
  ];
}
