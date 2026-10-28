/** FX Lab entry point. */
(function () {
  const prefersReduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  Juice.reduced = prefersReduced;
  Juice.sound = new FXSound();

  function boot() {
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'stage',
      width: 960,
      height: 600,
      backgroundColor: '#0f0b1e',
      banner: false,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: []
    });
    window.game = game;
    window.labUI = new LabUI(game);
  }

  // Wait (briefly) for web fonts so canvas text uses them.
  if (document.fonts && document.fonts.load) {
    const fonts = Promise.all([
      document.fonts.load('700 20px "Unbounded"'),
      document.fonts.load('700 15px "Manrope"')
    ]).catch(() => {});
    Promise.race([fonts, new Promise((r) => setTimeout(r, 1500))]).then(boot);
  } else {
    boot();
  }
})();
