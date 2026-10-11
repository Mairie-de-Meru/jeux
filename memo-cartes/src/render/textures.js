import * as THREE from 'three';
import { THEMES } from '../logic/themes.js';

const loaded = { back: null, faces: new Map() }; // faces : "theme/key" -> Texture
const fallback = new Map();
let maxAniso = 1;

function prep(tex) {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(4, maxAniso);
  return tex;
}

function load(url) {
  return new Promise((resolve) => {
    new THREE.TextureLoader().load(url, (t) => resolve(prep(t)), undefined, () => resolve(null));
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function canvasTexture(draw) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  draw(c.getContext('2d'), 256);
  return prep(new THREE.CanvasTexture(c));
}

function fallbackFace(themeId, item) {
  const key = `${themeId}/${item.key}`;
  if (!fallback.has(key)) {
    const color = THEMES[themeId].couleur;
    fallback.set(key, canvasTexture((ctx, s) => {
      ctx.fillStyle = color;
      roundRect(ctx, 0, 0, s, s, 40); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.82)';
      roundRect(ctx, 14, 14, s - 28, s - 28, 30); ctx.fill();
      ctx.font = `${s * 0.58}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(item.emoji, s / 2, s / 2 + s * 0.04);
    }));
  }
  return fallback.get(key);
}

function fallbackBack() {
  if (!fallback.has('dos')) {
    fallback.set('dos', canvasTexture((ctx, s) => {
      ctx.fillStyle = '#7a5cff'; roundRect(ctx, 0, 0, s, s, 40); ctx.fill();
      ctx.fillStyle = '#ffd23f';
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        if ((x + y) % 2 === 0) { ctx.beginPath(); ctx.arc(16 + x * 32, 16 + y * 32, 6, 0, 7); ctx.fill(); }
      }
      ctx.fillStyle = '#fff';
      roundRect(ctx, 56, 56, s - 112, s - 112, 36); ctx.fill();
      ctx.fillStyle = '#7a5cff'; ctx.font = `bold ${s * 0.5}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('?', s / 2, s / 2 + s * 0.04);
    }));
  }
  return fallback.get('dos');
}

// Charge uniquement les chemins du manifeste ; toute erreur -> repli canvas à la demande.
export async function preloadTextures(images, renderer) {
  maxAniso = renderer ? renderer.capabilities.getMaxAnisotropy() : 1;
  const jobs = [];
  if (images.dos) jobs.push(load(images.dos).then((t) => { loaded.back = t; }));
  for (const [themeId, faces] of Object.entries(images.faces || {})) {
    for (const [key, url] of Object.entries(faces)) {
      jobs.push(load(url).then((t) => { if (t) loaded.faces.set(`${themeId}/${key}`, t); }));
    }
  }
  await Promise.all(jobs);
}

export const getBackTexture = () => loaded.back || fallbackBack();
export const getFaceTexture = (themeId, item) =>
  loaded.faces.get(`${themeId}/${item.key}`) || fallbackFace(themeId, item);
