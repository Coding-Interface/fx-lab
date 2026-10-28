/**
 * BuiltinTransitions — ready-made transition presets. Use them by name:
 *   this.fx.transition('Heart Iris', { onCovered: () => … });
 *   this.fx.goto('Level2', data, 'Theatre Curtain');
 * Every preset is plain JSON, exactly what PhaserFX Studio exports.
 */
class BuiltinTransitions {
  static LIST = [
    { name: 'Fade to Black', style: 'fade', duration: 800, hold: 120, color: '#000000' },
    { name: 'Dip to White', style: 'fade', duration: 700, hold: 60, color: '#ffffff', sound: 'sparkle', easeIn: 'Quad.easeIn', easeOut: 'Quad.easeOut' },
    { name: 'Circle Iris', style: 'iris', duration: 900, hold: 120, color: '#000000', params: { shape: 'circle' } },
    { name: 'Heart Iris', style: 'iris', duration: 1000, hold: 150, color: '#2a0f22', sound: 'chime', params: { shape: 'heart', pause: 0.18 } },
    { name: 'Star Spin Iris', style: 'iris', duration: 1100, hold: 120, color: '#120d2e', sound: 'sparkle', revealSound: 'sparkle', params: { shape: 'star', spin: 180 } },
    { name: 'Diagonal Wipe', style: 'wipe', duration: 800, hold: 80, color: '#0f0b1e', reveal: 'continue', params: { angle: 25, edge: 8, edgeColor: '#ffc94a' } },
    { name: 'Slide Left', style: 'wipe', duration: 700, hold: 0, color: '#1b1440', reveal: 'continue', easeIn: 'Cubic.easeIn', easeOut: 'Cubic.easeOut', params: { angle: 180, edge: 0 } },
    { name: 'Sliding Doors', style: 'doors', duration: 900, hold: 150, color: '#23254d', easeIn: 'Bounce.easeOut', easeOut: 'Cubic.easeIn', params: { axis: 'horizontal', trim: 6, trimColor: '#ffc94a' } },
    { name: 'Theatre Curtain', style: 'curtain', duration: 1300, hold: 300, color: '#8b1e2d', revealSound: 'fanfare', easeIn: 'Sine.easeInOut', easeOut: 'Sine.easeInOut', params: { folds: 12, valance: true } },
    { name: 'Blinds', style: 'blinds', duration: 900, hold: 80, color: '#000000', params: { count: 10, angle: 0, stagger: 0.5, from: 'start' } },
    { name: 'Diagonal Stripes', style: 'blinds', duration: 900, hold: 80, color: '#ff5fa2', params: { count: 14, angle: 45, stagger: 0.6, from: 'center' } },
    { name: 'Checker Diagonal', style: 'tiles', duration: 1000, hold: 80, color: '#120d2e', params: { cols: 12, rows: 8, order: 'diagonal', shape: 'square', stagger: 0.6 } },
    { name: 'Pixel Dissolve', style: 'tiles', duration: 900, hold: 60, color: '#000000', sound: 'glitch', params: { cols: 32, rows: 20, order: 'random', shape: 'square', stagger: 0.85 } },
    { name: 'Diamond Spiral', style: 'tiles', duration: 1100, hold: 80, color: '#2a1d5e', sound: 'riser', params: { cols: 14, rows: 9, order: 'spiral', shape: 'diamond', stagger: 0.65 } },
    { name: 'Clock Wipe', style: 'clock', duration: 1000, hold: 100, color: '#000000', reveal: 'continue', params: { start: -90, direction: 'clockwise', sectors: 1 } },
    { name: 'Comic Bubbles', style: 'bubbles', duration: 1000, hold: 100, color: '#ffc94a', params: { count: 40, shape: 'circle', stagger: 0.55, bounce: true } },
    { name: 'Heart Shower', style: 'bubbles', duration: 1100, hold: 120, color: '#ff5fa2', params: { count: 50, shape: 'heart', stagger: 0.6, bounce: true } },
    { name: 'Retro Pixelate', style: 'pixelate', duration: 900, hold: 60, color: '#000000', params: { amount: 40, fadeFrom: 0.55 } },
    { name: 'Zoom Through', style: 'zoom', duration: 800, hold: 40, color: '#ffffff', params: { zoom: 0.8, spin: 0, fadeFrom: 0.3 } },
    { name: 'Spin Dive', style: 'zoom', duration: 1000, hold: 60, color: '#0f0b1e', params: { zoom: 1.6, spin: 120, fadeFrom: 0.4 } },
    { name: 'Chapter Card', style: 'fade', duration: 900, hold: 1400, color: '#0f0b1e', sound: 'rumble', revealSound: 'chime', label: 'Chapter 2', sublabel: 'The Whispering Woods', labelColor: '#ffc94a' },
    // Slanted shutter bars with a spinning "?" medallion (the Pun Intended look)
    { name: 'Mystery Shutter', style: 'shutter', duration: 1500, hold: 160, color: '#3a2e7a', easeIn: 'Linear', easeOut: 'Linear', reveal: 'continue', sound: 'whoosh', revealSound: 'swish',
      params: { palette: ['#ff5e5b', '#ffc93c', '#2ec4b6', '#3a2e7a', '#ff7eb6', '#4ea8ff'], count: 8, angle: -14, stagger: 0.45, from: 'alternate', shine: true, badge: true, badgeText: '?' } },
    { name: 'Candy Stripes', style: 'shutter', duration: 1200, hold: 80, color: '#2a1d5e', easeIn: 'Linear', easeOut: 'Linear', reveal: 'reverse', sound: 'shutter', revealSound: 'swish',
      params: { palette: ['#ff7eb6', '#ffffff', '#ff5fa2', '#ffe3f1'], count: 14, angle: 22, stagger: 0.6, from: 'top', shine: false, badge: false } },
    { name: 'Star Shutter', style: 'shutter', duration: 1400, hold: 300, color: '#120d2e', easeIn: 'Linear', easeOut: 'Linear', reveal: 'continue', sound: 'riser', revealSound: 'sparkle',
      params: { palette: ['#3a4bd8', '#59d0e3', '#7b5cff', '#2a1d5e'], count: 10, angle: -20, stagger: 0.5, from: 'alternate', shine: true, badge: true, badgeText: '★', badgeFill: '#1b1440', badgeRing: '#59d0e3', badgeTextColor: '#ffc94a' } }
  ];

  /** Old short names from PhaserFX 1.0 still work. */
  static ALIASES = { fade: 'Fade to Black', iris: 'Circle Iris', wipe: 'Diagonal Wipe', blinds: 'Blinds', zoom: 'Zoom Through' };
}
