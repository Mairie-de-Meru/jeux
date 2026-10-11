import * as THREE from 'three';

const FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const cache = new Map();

// Texture d'un emoji dessiné sur un canvas (pour les sprites).
export function emojiTexture(emoji, size = 96) {
  const key = emoji + size;
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.font = `${Math.floor(size * 0.72)}px ${FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(emoji, size / 2, size / 2 + size * 0.04);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, tex);
  return tex;
}

export function emojiSprite(emoji, scale = 1) {
  const m = new THREE.SpriteMaterial({ map: emojiTexture(emoji), transparent: true, depthWrite: false });
  const s = new THREE.Sprite(m);
  s.scale.set(scale, scale, 1);
  return s;
}
