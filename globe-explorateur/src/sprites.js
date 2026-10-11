// Textures de sprites : emoji dessiné en canvas (repli sans image) et mesure du contenu opaque.
import { boiteOpaque } from './logic/pins.js';

const POLICES = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

// Canvas carré avec l'emoji centré (vignette d'album et texture de sprite).
export function emojiCanvas(emoji, taille = 256, cv = document.createElement('canvas')) {
  cv.width = taille; cv.height = taille;
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, taille, taille);
  ctx.font = `${Math.round(taille * 0.72)}px ${POLICES}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(emoji, taille / 2, taille * 0.53);
  return cv;
}

// Boîte du contenu opaque d'une image ou d'un canvas (calculée une fois, sur une copie réduite).
export function mesurerContenu(source) {
  const sw = source.naturalWidth || source.width, sh = source.naturalHeight || source.height;
  const k = Math.min(1, 128 / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * k)), h = Math.max(1, Math.round(sh * k));
  try {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(source, 0, 0, w, h);
    return boiteOpaque(ctx.getImageData(0, 0, w, h).data, w, h);
  } catch {
    return { x0: 0, y0: 0, x1: 1, y1: 1 }; // canvas « taché » ou illisible : pas de recadrage
  }
}
