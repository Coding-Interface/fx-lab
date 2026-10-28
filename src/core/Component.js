/**
 * Component — base for long-lived effects (fire, weather, XP bar, dialogue…).
 * It tracks its game objects, can run per-frame code, and cleans up when you
 * call destroy() or when the scene shuts down.
 */
class Component {
  constructor(fx) {
    this.fx = fx;
    this.j = fx.juice;
    this.scene = fx.scene;
    this.objects = [];
    this.alive = true;
    this._onShutdown = () => this.destroy();
    this.scene.events.once('shutdown', this._onShutdown);
  }

  track(obj) { this.objects.push(obj); return obj; }

  /** Run fn(time, delta) every frame until destroy(). delta is already slow-mo scaled. */
  onUpdate(fn) {
    this._update = (time, delta) => { if (this.alive) fn(time, delta * this.j.timeScale); };
    this.scene.events.on('update', this._update);
  }

  destroy() {
    if (!this.alive) return;
    this.alive = false;
    if (this._update) this.scene.events.off('update', this._update);
    this.scene.events.off('shutdown', this._onShutdown);
    this.objects.forEach((o) => {
      if (!o) return;
      if (this.scene.tweens) this.scene.tweens.killTweensOf(o);
      if (o.destroy) o.destroy();
    });
    this.objects = [];
  }
}
