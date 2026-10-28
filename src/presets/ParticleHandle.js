/**
 * ParticleHandle — what fx.particles() returns: move it, burst again, stop or destroy.
 */
class ParticleHandle {
  constructor(fx, preset, anchor) {
    this.fx = fx;
    this.preset = preset;
    this.anchor = anchor;
    this.emitters = [];
    this.timers = [];
    this.alive = true;
    this.done = new Promise((resolve) => { this._resolve = resolve; });
    this._off = () => this.destroy();
    fx.scene.events.once('shutdown', this._off);
  }

  schedule(ms, fn) { this.timers.push(this.fx.scene.time.delayedCall(Math.max(0, ms), () => { if (this.alive) fn(); })); }

  /** Move where NEW particles appear (live particles stay where they are). */
  setPosition(x, y) { if (!this.anchor.scene) { this.anchor.x = x; this.anchor.y = y; } return this; }

  /** Stop emitting; existing particles finish, then everything is removed. */
  stop() {
    if (!this.alive) return this;
    this.emitters.forEach((e) => e.stop());
    const life = Math.max(0, ...this.preset.layers.map((L) => L.lifespan.max));
    this.schedule(life + 200, () => this.destroy());
    return this;
  }

  /** Burst again (burst layers only), e.g. on every click. */
  burst(x, y) {
    if (x != null) this.setPosition(x, y);
    this.preset.layers.filter((L) => L.enabled !== false).forEach((L, i) => {
      if (L.emit.mode !== 'stream' && this.emitters[i]) { const n = Quality.budget(this.fx.scene, Settings.amount(L.emit.count)); if (n > 0) this.emitters[i].explode(n, this.anchor.x, this.anchor.y); }
    });
    return this;
  }

  count() { return this.emitters.reduce((n, e) => n + (e.getAliveParticleCount ? e.getAliveParticleCount() : 0), 0); }

  destroy() {
    if (!this.alive) return;
    this.alive = false;
    this.timers.forEach((t) => t.remove(false));
    this.emitters.forEach((e) => e.destroy());
    this.emitters = [];
    if (this.fx.scene && this.fx.scene.events) this.fx.scene.events.off('shutdown', this._off);
    this._resolve();
  }
}
