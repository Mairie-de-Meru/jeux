// Textures générées au canvas : plateau, tuiles (lettre + points), table en bois, fond.
import * as THREE from 'three';
import { pointsOf } from '../logic/bag.js';

const FONT = '"Trebuchet MS","Avenir Next Rounded","Segoe UI",system-ui,sans-serif';

const BONUS_STYLE = {
  W3: { bg: '#ee5a5a', big: '×3', small: 'MOT', fg: '#fff' },
  W2: { bg: '#f6a04d', big: '×2', small: 'MOT', fg: '#fff' },
  L3: { bg: '#3f86d9', big: '×3', small: 'LETTRE', fg: '#fff' },
  L2: { bg: '#98d2f4', big: '×2', small: 'LETTRE', fg: '#14456b' },
};

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function star(ctx, cx, cy, R, r, color) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? r : R;
    ctx.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

export function boardTexture(size, premium, centerCell) {
  const P = 64;
  const cv = canvas(size * P, size * P);
  const ctx = cv.getContext('2d');
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const x = c * P, y = r * P;
      const code = premium[r][c];
      const st = BONUS_STYLE[code];
      ctx.fillStyle = (r + c) % 2 ? '#48b39c' : '#4fbca5';
      ctx.fillRect(x, y, P, P);
      if (st) {
        ctx.fillStyle = st.bg;
        rr(ctx, x + 3, y + 3, P - 6, P - 6, 9);
        ctx.fill();
        ctx.fillStyle = st.fg;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `bold 26px ${FONT}`;
        ctx.fillText(st.big, x + P / 2, y + P / 2 - 6);
        ctx.font = `bold 11px ${FONT}`;
        ctx.fillText(st.small, x + P / 2, y + P / 2 + 15);
      }
      if (r === centerCell && c === centerCell) star(ctx, x + P / 2, y + P / 2 + (st ? -22 : 0), st ? 11 : 21, st ? 5 : 9, st ? '#fff6c2' : '#ffe66d');
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, P - 2, P - 2);
    }
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const TILE_STYLE = {
  normal: { a: '#fbe3a8', b: '#efc476', edge: '#c9964a', ink: '#4a2a10', alpha: 1 },
  pending: { a: '#ffe08a', b: '#ffb22e', edge: '#d9480f', ink: '#4a1f00', alpha: 1 },
  last: { a: '#e8ffd9', b: '#aee79a', edge: '#35a853', ink: '#1e4a1c', alpha: 1 },
  ghost: { a: '#d6ffe0', b: '#8ff0a8', edge: '#16a34a', ink: '#0d5a2a', alpha: 0.78 },
  hintrack: { a: '#fff', b: '#fff', edge: '#16a34a', ink: '#000', alpha: 1 },
};

const tileCache = new Map();
export function tileTexture(letter, variant = 'normal') {
  const key = letter + '|' + variant;
  if (tileCache.has(key)) return tileCache.get(key);
  const st = TILE_STYLE[variant] || TILE_STYLE.normal;
  const S = 128;
  const cv = canvas(S, S);
  const ctx = cv.getContext('2d');
  ctx.globalAlpha = st.alpha;
  const g = ctx.createLinearGradient(0, 0, S, S);
  g.addColorStop(0, st.a);
  g.addColorStop(1, st.b);
  rr(ctx, 4, 4, S - 8, S - 8, 22);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 7;
  ctx.strokeStyle = st.edge;
  ctx.stroke();
  ctx.fillStyle = st.ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold 84px ${FONT}`;
  ctx.fillText(letter, S / 2 - 3, S / 2 - 2);
  ctx.font = `bold 28px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText(String(pointsOf(letter)), S - 16, S - 22);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  tileCache.set(key, t);
  return t;
}

export function woodTexture() {
  const cv = canvas(256, 256);
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#c98b52';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 40; i++) {
    const y = (i / 40) * 256;
    ctx.fillStyle = `rgba(${90 + (i * 7) % 40},${50 + (i * 5) % 30},20,${0.07 + ((i * 13) % 10) / 100})`;
    ctx.fillRect(0, y, 256, 3 + (i % 4));
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 6);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function backgroundTexture() {
  const cv = canvas(8, 256);
  const ctx = cv.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#6c63d9');
  g.addColorStop(1, '#2fa5c4');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 8, 256);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
