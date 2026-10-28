/**
 * ProgressMap — a lesson path: finish a node, the trail draws to the next,
 * your token hops along, and the next lesson unlocks.
 *
 * LESSONS:
 *  - A Phaser.Curves.Spline through the node positions gives a smooth
 *    winding path for free. A Catmull-Rom spline passes exactly through its
 *    points, so node k sits at t = k / (n − 1).
 *  - "Drawing on" the path (redraw it up to t every frame) makes progress
 *    feel like travel, not just a colour change.
 *  - Unlocking the NEXT thing is a reward in itself: the lock lifts off and
 *    the node bounces, inviting the next tap.
 */
class ProgressMap extends BaseEffect {
  static id = 'map';
  static title = 'Progress Map';
  static group = 'rewards';
  static tags = ['learning', 'games', 'stories'];
  static useFor = 'Course or lesson maps, level-select worlds, story chapter maps, onboarding steps.';
  static mode = 'tap';
  static hint = 'Click to complete the current lesson.';
  static file = 'js/effects/ProgressMap.js';
  static uses = ['js/fx/Juice.js', 'js/fx/UIArt.js'];
  static summary = 'Complete a lesson node: it stamps a star, the gold trail draws itself to the next node, your token hops along, and the next node\'s lock lifts away.';
  static steps = [
    'The path is a Spline through the node points; a dotted gray copy shows the whole route.',
    'Complete: a star stamps onto the node (scale 2 → 0.42), with a burst and a chime.',
    'Travel: a progress value tweens from node k to k+1. Each frame the gold trail is redrawn up to it.',
    'The token follows the curve and hops: y offset = −|sin(progress × π × hops)| × height.',
    'Arrive: the lock flies up and fades, the node bounces and starts its "current" pulse.',
    'The last node is the finish: fireworks and a message.'
  ];
  static params = [
    { key: 'travel', label: 'Travel time (ms)', min: 300, max: 2000, step: 50, value: 900 },
    { key: 'hops', label: 'Hops per segment', min: 0, max: 6, step: 1, value: 3 }
  ];

  static POINTS = [[110, 470], [250, 380], [190, 230], [370, 150], [540, 270], [700, 180], [850, 320]];

  start() {
    const s = this.scene;
    this.points = ProgressMap.POINTS.map(([x, y]) => new Phaser.Math.Vector2(x, y));
    this.curve = new Phaser.Curves.Spline(this.points);
    // sample with the SAME t the token uses (getPoint), so the trail end and the token always match
    this.samples = Array.from({ length: 301 }, (_, i) => this.curve.getPoint(i / 300));
    this.n = this.points.length;
    this.current = 0;
    this.prog = 0;

    // dotted route
    const dots = this.track(s.add.graphics().setDepth(1));
    dots.fillStyle(0x3a3170, 1);
    this.samples.forEach((p, i) => { if (i % 6 === 0) dots.fillCircle(p.x, p.y, 3.5); });
    this.trail = this.track(s.add.graphics().setDepth(2));

    this.nodes = this.points.map((p, i) => {
      const c = this.track(s.add.container(p.x, p.y).setDepth(5));
      const g = s.add.graphics();
      const lock = s.add.graphics();
      const label = Juice.text(s, 0, 52, i === this.n - 1 ? 'Finish' : `Lesson ${i + 1}`, 13, '#9b93c4', { body: true, weight: '800' });
      c.add([g, lock, label]);
      return { c, g, lock, label, state: 'locked' };
    });
    this.nodes.forEach((nd, i) => this.setState(i, i === 0 ? 'current' : 'locked'));

    this.token = this.track(s.add.image(this.points[0].x, this.points[0].y - 40, 'ui-fox').setScale(0.36).setOrigin(0.5, 1).setDepth(20));
    this.tokenShadow = this.track(s.add.ellipse(this.points[0].x, this.points[0].y - 34, 34, 10, 0x000000, 0.35).setDepth(19));
    this.msg = this.track(Juice.text(s, this.cx, 44, 'Your learning path', 22, '#ece8ff'));
  }

  setState(i, state) {
    const nd = this.nodes[i];
    nd.state = state;
    const g = nd.g;
    const finish = i === this.n - 1;
    const r = finish ? 34 : 28;
    g.clear();
    g.fillStyle(0x07050f, 0.6).fillCircle(0, 6, r + 4);
    if (state === 'locked') {
      g.fillStyle(0x241c48, 1).fillCircle(0, 0, r).lineStyle(3, 0x3a3170, 1).strokeCircle(0, 0, r);
      nd.lock.clear().fillStyle(0x6f689a, 1).fillRoundedRect(-10, -4, 20, 16, 4).lineStyle(4, 0x6f689a, 1);
      nd.lock.beginPath().arc(0, -4, 7, Math.PI, 0, false).strokePath();
      nd.label.setColor('#6f689a');
    } else if (state === 'current') {
      g.fillStyle(0xffffff, 1).fillCircle(0, 0, r).lineStyle(5, 0xffc94a, 1).strokeCircle(0, 0, r);
      g.fillStyle(0xffc94a, 1).fillTriangle(-7, -10, -7, 10, 11, 0);
      nd.lock.clear();
      nd.label.setColor('#ffc94a');
    } else {
      g.fillStyle(0xffc94a, 1).fillCircle(0, 0, r).lineStyle(3, 0xfff1b8, 1).strokeCircle(0, 0, r);
      nd.lock.clear();
      nd.label.setColor('#ece8ff');
    }
    this.scene.tweens.killTweensOf(nd.c);
    nd.c.setScale(1);
    if (state === 'current' && !Juice.reduced) {
      this.scene.tweens.add({ targets: nd.c, scale: 1.1, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  autoPlay() { this.scene.time.delayedCall(400, () => this.play()); }

  drawTrail() {
    const g = this.trail;
    const upto = Math.floor(this.prog * (this.samples.length - 1));
    g.clear();
    if (upto < 1) return;
    g.lineStyle(10, 0xb07a10, 1).beginPath().moveTo(this.samples[0].x, this.samples[0].y + 3);
    for (let i = 1; i <= upto; i++) g.lineTo(this.samples[i].x, this.samples[i].y + 3);
    g.strokePath();
    g.lineStyle(7, 0xffc94a, 1).beginPath().moveTo(this.samples[0].x, this.samples[0].y);
    for (let i = 1; i <= upto; i++) g.lineTo(this.samples[i].x, this.samples[i].y);
    g.strokePath();
  }

  async play() {
    if (this.busy) return;
    if (this.current >= this.n - 1) { this.scene.restartEffect(true); return; }
    this.busy = true;
    const s = this.scene;
    const i = this.current;
    const nd = this.nodes[i];

    // 1. complete: stamp a star
    this.setState(i, 'done');
    const star = s.add.image(0, 0, 'ui-star').setScale(2).setAlpha(0);
    nd.c.add(star);
    await Juice.tween(s, { targets: star, scale: 0.42, alpha: 1, duration: 220, ease: 'Cubic.easeIn' });
    Juice.sfx('chime');
    Juice.shockwave(s, nd.c.x, nd.c.y, 0xffd86b, 1.2, 400, 6);
    Juice.burst(s, nd.c.x, nd.c.y, 'fx-star', { speed: { min: 80, max: 220 }, lifespan: 600, scale: { start: 0.5, end: 0 }, color: [0xffffff, 0xffd86b], blendMode: 'ADD' }, 16, 7);
    await Juice.wait(s, 200);

    // 2. travel along the curve
    const from = i / (this.n - 1);
    const to = (i + 1) / (this.n - 1);
    const o = { t: from };
    const hopH = 26;
    Juice.sfx('whoosh');
    await Juice.tween(s, {
      targets: o, t: to, duration: this.p.travel, ease: 'Sine.easeInOut',
      onUpdate: () => {
        this.prog = o.t;
        this.drawTrail();
        const p = this.curve.getPoint(o.t);
        const local = (o.t - from) / (to - from);
        const hop = this.p.hops && !Juice.reduced ? Math.abs(Math.sin(local * Math.PI * this.p.hops)) * hopH : 0;
        this.token.setPosition(p.x, p.y - 30 - hop);
        this.tokenShadow.setPosition(p.x, p.y - 26).setScale(1 - hop / 60);
      }
    });
    if (!s.sys.isActive()) return;
    Juice.pop(s, this.token, 0.18, 260);

    // 3. unlock the next node
    const next = this.nodes[i + 1];
    const lockGhost = s.add.graphics().setDepth(30);
    lockGhost.fillStyle(0x9b93c4, 1).fillRoundedRect(-10, -4, 20, 16, 4).lineStyle(4, 0x9b93c4, 1).beginPath().arc(0, -4, 7, Math.PI, 0, false).strokePath();
    lockGhost.setPosition(next.c.x, next.c.y);
    s.tweens.add({ targets: lockGhost, y: next.c.y - 70, angle: 30, alpha: 0, duration: 520, ease: 'Quad.easeOut', onComplete: () => lockGhost.destroy() });
    Juice.sfx('pop');
    this.current += 1;
    if (this.current === this.n - 1) {
      this.setState(this.current, 'done');
      const big = s.add.image(0, 0, 'ui-star').setScale(0.6);
      next.c.add(big);
      Juice.pop(s, next.c, 0.25, 360);
      this.finale();
    } else {
      this.setState(this.current, 'current');
      Juice.pop(s, next.c, 0.25, 360);
    }
    this.busy = false;
  }

  finale() {
    const s = this.scene;
    const p = this.points[this.n - 1];
    Juice.sfx('fanfare');
    this.msg.setText('Course complete!').setColor('#ffc94a');
    Juice.pop(s, this.msg, 0.15, 320);
    [0, 250, 500].forEach((d, k) => s.time.delayedCall(d, () => {
      const x = p.x + (k - 1) * 60;
      const y = p.y - 120 - k * 20;
      Juice.burst(s, x, y, 'fx-dot', { speed: { min: 180, max: 220 }, lifespan: 900, gravityY: 120, scale: { start: 0.55, end: 0 }, color: [0xffffff, [0xffd86b, 0xff8ac2, 0x7ff7e3][k]], blendMode: 'ADD' }, 40, 40);
      Juice.sfx('boom');
    }));
  }
}
