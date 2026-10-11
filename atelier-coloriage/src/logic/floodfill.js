// Remplissage de zones : logique pure, sans DOM. Les pixels sont des tableaux RGBA (Uint8Array / Uint8ClampedArray).

/** Luminance « effective » d'un pixel RGBA posé sur du blanc (0 = noir, 255 = blanc). */
export function effLum(r, g, b, a) {
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return (lum * a + 255 * (255 - a)) / 255;
}

/** Pixel de trait : alpha > 0 et luminance (sur fond blanc) < threshold. */
export function isLine(r, g, b, a, threshold = 128) {
  return a > 0 && effLum(r, g, b, a) < threshold;
}

/** Remplissage 4-connexe par lignes de balayage, pile explicite (pas de récursion). */
function scanFill(w, h, sx, sy, canFill) {
  const mask = new Uint8Array(w * h);
  sx = Math.floor(sx);
  sy = Math.floor(sy);
  if (!(sx >= 0 && sy >= 0 && sx < w && sy < h)) return mask;
  if (!canFill(sy * w + sx)) return mask;
  const stack = [sx, sy];
  while (stack.length) {
    const y = stack.pop();
    let x = stack.pop();
    while (x >= 0 && !mask[y * w + x] && canFill(y * w + x)) x--;
    x++;
    let up = false;
    let down = false;
    while (x < w && !mask[y * w + x] && canFill(y * w + x)) {
      mask[y * w + x] = 1;
      if (y > 0) {
        const ok = !mask[(y - 1) * w + x] && canFill((y - 1) * w + x);
        if (ok && !up) { stack.push(x, y - 1); up = true; } else if (!ok) up = false;
      }
      if (y < h - 1) {
        const ok = !mask[(y + 1) * w + x] && canFill((y + 1) * w + x);
        if (ok && !down) { stack.push(x, y + 1); down = true; } else if (!ok) down = false;
      }
      x++;
    }
  }
  return mask;
}

/** Zone fermée contenant (x,y) sur la couche de trait. Clic sur un trait -> masque vide. */
export function regionMask(linePixels, w, h, x, y, { threshold = 128 } = {}) {
  const p = linePixels;
  return scanFill(w, h, x, y, (i) => {
    const k = i * 4;
    return !isLine(p[k], p[k + 1], p[k + 2], p[k + 3], threshold);
  });
}

/** Dilate le masque dans l'anti-aliasing du trait, sans franchir le coeur noir. */
export function growMask(mask, linePixels, w, h, radius = 2, { coreThreshold = 60, threshold = 128 } = {}) {
  const p = linePixels;
  const out = new Uint8Array(mask);
  const soft = (i) => {
    const k = i * 4;
    const l = effLum(p[k], p[k + 1], p[k + 2], p[k + 3]);
    return p[k + 3] > 0 && l < threshold && l >= coreThreshold;
  };
  let frontier = [];
  for (let i = 0; i < out.length; i++) if (out[i]) frontier.push(i);
  for (let step = 0; step < radius; step++) {
    const next = [];
    for (const i of frontier) {
      const x = i % w;
      const y = (i - x) / w;
      const neighbours = [];
      if (x > 0) neighbours.push(i - 1);
      if (x < w - 1) neighbours.push(i + 1);
      if (y > 0) neighbours.push(i - w);
      if (y < h - 1) neighbours.push(i + w);
      for (const n of neighbours) {
        if (!out[n] && soft(n)) { out[n] = 1; next.push(n); }
      }
    }
    frontier = next;
    if (!frontier.length) break;
  }
  return out;
}

/** Pixels connexes de couleur proche de celle de (x,y) (écart max par canal <= tolerance). */
export function colorMask(pixels, w, h, x, y, { tolerance = 32 } = {}) {
  x = Math.floor(x);
  y = Math.floor(y);
  if (!(x >= 0 && y >= 0 && x < w && y < h)) return new Uint8Array(w * h);
  const s = (y * w + x) * 4;
  const r = pixels[s], g = pixels[s + 1], b = pixels[s + 2], a = pixels[s + 3];
  return scanFill(w, h, x, y, (i) => {
    const k = i * 4;
    return Math.abs(pixels[k] - r) <= tolerance && Math.abs(pixels[k + 1] - g) <= tolerance &&
      Math.abs(pixels[k + 2] - b) <= tolerance && Math.abs(pixels[k + 3] - a) <= tolerance;
  });
}

/** Écrit la couleur [r,g,b,a] sur les pixels du masque. Renvoie le nombre de pixels modifiés. */
export function applyMask(pixels, mask, [r, g, b, a]) {
  let n = 0;
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue;
    const k = i * 4;
    if (pixels[k] !== r || pixels[k + 1] !== g || pixels[k + 2] !== b || pixels[k + 3] !== a) {
      pixels[k] = r; pixels[k + 1] = g; pixels[k + 2] = b; pixels[k + 3] = a;
      n++;
    }
  }
  return n;
}
