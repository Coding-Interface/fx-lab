/**
 * TexturePicker — choose a particle texture: the built-in soft textures or
 * your own uploaded image (stored inside the preset, so it travels with it).
 */
class TexturePicker {
  static BUILTIN = ['pfx-dot', 'pfx-glow', 'pfx-ember', 'pfx-star', 'pfx-spark', 'pfx-smoke', 'pfx-ring', 'pfx-confetti',
    'pfx-shard', 'pfx-coin', 'pfx-drop', 'pfx-leaf', 'pfx-heart', 'pfx-star5', 'pfx-flare'];

  static thumbs = {};

  static thumb(game, key) {
    if (TexturePicker.thumbs[key]) return TexturePicker.thumbs[key];
    try {
      if (!game.textures.exists(key)) return '';
      const url = game.textures.getBase64(key);
      if (url && url.length > 30) TexturePicker.thumbs[key] = url;
      return url;
    } catch (e) { return ''; }
  }

  /** Render the picker into `ctl`. onPick(key) is called on selection. */
  static render(ctl, game, preset, current, onPick) {
    const grid = document.createElement('div');
    grid.className = 'tex-grid';
    const keys = [...TexturePicker.BUILTIN, ...Object.keys(preset.textures || {})];
    keys.forEach((key) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tex';
      b.title = key;
      b.setAttribute('aria-label', `Texture ${key}`);
      b.setAttribute('aria-pressed', String(key === current));
      const img = document.createElement('img');
      img.alt = '';
      img.src = (preset.textures && preset.textures[key]) || TexturePicker.thumb(game, key);
      b.appendChild(img);
      b.addEventListener('click', () => onPick(key));
      grid.appendChild(b);
    });
    const up = document.createElement('label');
    up.className = 'tex upload';
    up.title = 'Upload your own image (PNG, JPG, WebP or SVG, up to 300 KB)';
    up.innerHTML = '<span aria-hidden="true">+</span><input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden>';
    up.setAttribute('aria-label', 'Upload a texture');
    up.querySelector('input').addEventListener('change', (e) => {
      const f = e.target.files[0];
      if (!f) return;
      if (f.size > 300 * 1024) { Toast.show('That image is over 300 KB. Use a smaller particle image (64–128 px is plenty).'); return; }
      const reader = new FileReader();
      reader.onload = () => {
        const key = `custom-${f.name.replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
        preset.textures = preset.textures || {};
        preset.textures[key] = reader.result;
        const done = () => onPick(key);
        if (game.textures.exists(key)) game.textures.remove(key);
        game.textures.once(`addtexture-${key}`, done);
        game.textures.addBase64(key, reader.result);
      };
      reader.readAsDataURL(f);
    });
    grid.appendChild(up);
    ctl.appendChild(grid);
  }
}
