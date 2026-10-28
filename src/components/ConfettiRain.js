/**
 * ConfettiRain — gentle confetti falling across the screen until stopped.
 *   const rain = this.fx.confettiRain({ density: 5 });
 *   rain.stop();      // let the pieces finish falling
 *   rain.destroy();   // remove now
 */
class ConfettiRain extends Component {
  constructor(fx, o = {}) {
    super(fx);
    const { w } = this.j.screen();
    const density = o.density || 4;
    this.em = this.track(this.j.emitter(0, -20, 'pfx-confetti', {
      ...Particles._confettiConfig(o),
      alpha: 1,
      emitZone: { type: 'random', source: new Phaser.Geom.Line(0, 0, w, 0) },
      speedY: { min: 40, max: 110 }, speedX: { min: -30, max: 30 }, accelerationX: { min: -20, max: 20 },
      gravityY: o.gravity || 65, lifespan: o.lifespan || 9000,
      frequency: 600 / Settings.amount(density), quantity: 1, maxParticles: 600
    }, o.depth != null ? o.depth : this.j.depth(390)));
    this.em.setScrollFactor(0);
    if (o.duration) this.j.wait(o.duration).then(() => this.stop());
  }

  stop() { if (this.alive) this.em.stop(); return this; }
}
