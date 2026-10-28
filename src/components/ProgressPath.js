/**
 * ProgressPath — a lesson/level map: nodes on a smooth path, a token that hops
 * along, a gold trail that draws itself, and locks that lift off.
 *   const map = this.fx.progressPath([[110,470],[250,380],[190,230],[370,150]], {
 *     current: 0, labels: ['Intro', 'Nouns', 'Verbs', 'Quiz'], token: 'hero',  // any texture key
 *     onFinish: () => this.fx.confetti()
 *   });
 *   await map.complete();       // finish the current node and travel to the next
 * Points are world coordinates. A token texture is optional (a glowing dot is used otherwise).
 */
class ProgressPath extends Component {
  constructor(fx, points, o = {}) {
    super(fx);
    const sc = this.scene;
    this.o = o;
    this.points = points.map((p) => new Phaser.Math.Vector2(p[0] != null ? p[0] : p.x, p[1] != null ? p[1] : p.y));
    this.curve = new Phaser.Curves.Spline(this.points);
    this.n = this.points.length;
    this.samples = Array.from({ length: 301 }, (_, i) => this.curve.getPoint(i / 300));
    this.current = Phaser.Math.Clamp(o.current || 0, 0, this.n - 1);
    this.prog = this.current / (this.n - 1);
    this.color = o.color || 0xffc94a;
    const depth = o.depth != null ? o.depth : this.j.depth(0);
    const dots = this.track(sc.add.graphics().setDepth(depth));
    dots.fillStyle(o.routeColor || 0x3a3170, 1);
    this.samples.forEach((p, i) => { if (i % 6 === 0) dots.fillCircle(p.x, p.y, 3.5); });
    this.trail = this.track(sc.add.graphics().setDepth(depth + 1));
    this.nodes = this.points.map((p, i) => {
      const c = this.track(sc.add.container(p.x, p.y).setDepth(depth + 2));
      const g = sc.add.graphics();
      const lock = sc.add.graphics();
      const lab = o.labels ? o.labels[i] : (i === this.n - 1 ? 'Finish' : `${i + 1}`);
      const label = this.j.text(0, 50, lab || '', 13, '#9b93c4', { body: true });
      c.add([g, lock, label]);
      return { c, g, lock, label };
    });
    this.nodes.forEach((nd, i) => this.setState(i, i < this.current ? 'done' : i === this.current ? 'current' : 'locked'));
    const tp = this.points[this.current];
    this.shadow = this.track(sc.add.ellipse(tp.x, tp.y - 26, 34, 10, 0x000000, 0.35).setDepth(depth + 3));
    this.token = this.track(o.token
      ? sc.add.image(tp.x, tp.y - 30, o.token).setOrigin(0.5, 1).setDepth(depth + 4)
      : sc.add.image(tp.x, tp.y - 40, 'pfx-glow').setScale(0.3).setTint(0xffffff).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth + 4));
    if (o.token && o.tokenSize) this.token.setDisplaySize(o.tokenSize, o.tokenSize * (this.token.height / this.token.width));
    this.tokenOffset = o.token ? 30 : 40;
    this.drawTrail();
  }

  setState(i, state) {
    const nd = this.nodes[i];
    const r = i === this.n - 1 ? 32 : 26;
    const g = nd.g;
    g.clear().fillStyle(0x07050f, 0.6).fillCircle(0, 6, r + 4);
    nd.lock.clear();
    if (state === 'locked') {
      g.fillStyle(0x241c48, 1).fillCircle(0, 0, r).lineStyle(3, 0x3a3170, 1).strokeCircle(0, 0, r);
      nd.lock.fillStyle(0x6f689a, 1).fillRoundedRect(-10, -4, 20, 16, 4).lineStyle(4, 0x6f689a, 1).beginPath().arc(0, -4, 7, Math.PI, 0, false).strokePath();
      nd.label.setColor('#6f689a');
    } else if (state === 'current') {
      g.fillStyle(0xffffff, 1).fillCircle(0, 0, r).lineStyle(5, this.color, 1).strokeCircle(0, 0, r);
      g.fillStyle(this.color, 1).fillTriangle(-7, -10, -7, 10, 11, 0);
      nd.label.setColor('#ffc94a');
    } else {
      g.fillStyle(this.color, 1).fillCircle(0, 0, r).lineStyle(3, 0xfff1b8, 1).strokeCircle(0, 0, r);
      if (!nd.star) { nd.star = this.scene.add.image(0, 0, 'pfx-star5').setScale(0.4); nd.c.add(nd.star); }
      nd.label.setColor('#ece8ff');
    }
    this.scene.tweens.killTweensOf(nd.c);
    nd.c.setScale(1);
    if (state === 'current' && !Settings.reducedMotion) this.scene.tweens.add({ targets: nd.c, scale: 1.1, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  drawTrail() {
    const g = this.trail;
    const upto = Math.floor(this.prog * 300);
    g.clear();
    if (upto < 1) return;
    [[10, 0x000000, 0.35, 3], [7, this.color, 1, 0]].forEach(([w, c, a, dy]) => {
      g.lineStyle(w, c, a).beginPath().moveTo(this.samples[0].x, this.samples[0].y + dy);
      for (let i = 1; i <= upto; i++) g.lineTo(this.samples[i].x, this.samples[i].y + dy);
      g.strokePath();
    });
  }

  /** Complete the current node and travel to the next. Resolves on arrival. */
  async complete() {
    if (this.busy || !this.alive || this.current >= this.n - 1) return;
    this.busy = true;
    const j = this.j;
    const i = this.current;
    const nd = this.nodes[i];
    this.setState(i, 'done');
    nd.star.setScale(2).setAlpha(0);
    await j.tween({ targets: nd.star, scale: 0.4, alpha: 1, duration: 220, ease: 'Cubic.easeIn' });
    j.sfx('chime');
    j.shockwave(nd.c.x, nd.c.y, 0xffd86b, 1.2, 400, nd.c.depth + 1);
    j.burst(nd.c.x, nd.c.y, 'pfx-star', { speed: { min: 80, max: 220 }, lifespan: 600, scale: { start: 0.5, end: 0 }, color: [0xffffff, 0xffd86b], blendMode: 'ADD' }, 16, nd.c.depth + 1);
    await j.wait(200);
    const from = i / (this.n - 1);
    const to = (i + 1) / (this.n - 1);
    const o = { t: from };
    const hops = this.o.hops != null ? this.o.hops : 3;
    j.sfx('whoosh');
    await j.tween({
      targets: o, t: to, duration: this.o.travel || 900, ease: 'Sine.easeInOut',
      onUpdate: () => {
        this.prog = o.t;
        this.drawTrail();
        const p = this.curve.getPoint(o.t);
        const local = (o.t - from) / (to - from);
        const hop = hops && !Settings.reducedMotion ? Math.abs(Math.sin(local * Math.PI * hops)) * 26 : 0;
        this.token.setPosition(p.x, p.y - this.tokenOffset - hop);
        this.shadow.setPosition(p.x, p.y - 26).setScale(1 - hop / 60);
      }
    });
    if (!this.alive) return;
    j.pop(this.token, 0.18, 260);
    const next = this.nodes[i + 1];
    const ghost = this.scene.add.graphics().setDepth(next.c.depth + 2).setPosition(next.c.x, next.c.y);
    ghost.fillStyle(0x9b93c4, 1).fillRoundedRect(-10, -4, 20, 16, 4).lineStyle(4, 0x9b93c4, 1).beginPath().arc(0, -4, 7, Math.PI, 0, false).strokePath();
    this.scene.tweens.add({ targets: ghost, y: next.c.y - 70, angle: 30, alpha: 0, duration: 520, ease: 'Quad.easeOut', onComplete: () => ghost.destroy() });
    j.sfx('pop');
    this.current += 1;
    if (this.current === this.n - 1) {
      this.setState(this.current, 'done');
      j.pop(next.c, 0.25, 360);
      j.sfx('fanfare');
      if (this.o.onFinish) this.o.onFinish();
    } else {
      this.setState(this.current, 'current');
      j.pop(next.c, 0.25, 360);
    }
    if (this.o.onComplete) this.o.onComplete(i, this.current);
    this.busy = false;
  }
}
