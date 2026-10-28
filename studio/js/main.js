/**
 * PhaserFX Studio entry point.
 */
window.addEventListener('load', () => {
  if (!window.Phaser || !window.PhaserFX) {
    document.getElementById('stage').textContent = 'Phaser or PhaserFX did not load. Check your connection and reload.';
    return;
  }
  window.studio = new Studio();
  window.studio.start().catch((e) => {
    console.error(e);
    Toast.show(`Studio failed to start: ${e.message}`, 6000);
  });
});
