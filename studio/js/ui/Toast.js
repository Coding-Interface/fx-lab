/** Toast — a short status message at the bottom of the screen. */
class Toast {
  static show(text, ms = 2200) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = text;
    el.hidden = false;
    clearTimeout(Toast.timer);
    Toast.timer = setTimeout(() => { el.hidden = true; }, ms);
  }
}
