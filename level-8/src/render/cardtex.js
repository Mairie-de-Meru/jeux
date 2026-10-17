// Textures de cartes dessinées au canvas (aucun fichier image).
import * as THREE from 'three';

export const COL_HEX = ['#e5484d', '#2f7de1', '#f5b50a', '#2fa84f'];
export const COL_DARK = ['#a62a31', '#1b55a8', '#b07d00', '#1a7133'];
export const SHAPE = ['●', '■', '▲', '◆'];

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawFace(ctx, card, w, h) {
  ctx.clearRect(0, 0, w, h);
  if (card.k === 'n') {
    ctx.fillStyle = COL_HEX[card.c];
    roundRect(ctx, 0, 0, w, h, w * 0.1); ctx.fill();
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, w * 0.12, h * 0.16, w * 0.76, h * 0.68, w * 0.18); ctx.fill();
    ctx.fillStyle = COL_DARK[card.c];
    ctx.font = `800 ${h * 0.46}px system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(card.n), w / 2, h * 0.5);
    if (card.n === 6 || card.n === 9) ctx.fillRect(w * 0.36, h * 0.74, w * 0.28, h * 0.025);
    ctx.fillStyle = '#fff';
    ctx.font = `700 ${h * 0.12}px system-ui, sans-serif`;
    ctx.fillText(SHAPE[card.c], w * 0.17, h * 0.09);
    ctx.fillText(SHAPE[card.c], w * 0.83, h * 0.92);
  } else if (card.k === 'j') {
    const gr = ctx.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, '#e5484d'); gr.addColorStop(0.35, '#f5b50a'); gr.addColorStop(0.65, '#2fa84f'); gr.addColorStop(1, '#2f7de1');
    ctx.fillStyle = gr; roundRect(ctx, 0, 0, w, h, w * 0.1); ctx.fill();
    ctx.fillStyle = '#fff'; roundRect(ctx, w * 0.12, h * 0.16, w * 0.76, h * 0.68, w * 0.18); ctx.fill();
    ctx.fillStyle = '#7a3fd1'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `800 ${h * 0.4}px system-ui, sans-serif`; ctx.fillText('★', w / 2, h * 0.45);
    ctx.font = `800 ${h * 0.11}px system-ui, sans-serif`; ctx.fillText('JOKER', w / 2, h * 0.72);
  } else {
    ctx.fillStyle = '#26324f'; roundRect(ctx, 0, 0, w, h, w * 0.1); ctx.fill();
    ctx.fillStyle = '#fff'; roundRect(ctx, w * 0.12, h * 0.16, w * 0.76, h * 0.68, w * 0.18); ctx.fill();
    ctx.fillStyle = '#26324f'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `800 ${h * 0.34}px system-ui, sans-serif`; ctx.fillText('⏭', w / 2, h * 0.46);
    ctx.font = `800 ${h * 0.11}px system-ui, sans-serif`; ctx.fillText('PASSE', w / 2, h * 0.72);
  }
}

export function drawBack(ctx, w, h) {
  const gr = ctx.createLinearGradient(0, 0, w, h);
  gr.addColorStop(0, '#5b3fd1'); gr.addColorStop(1, '#a35cf0');
  ctx.fillStyle = gr; roundRect(ctx, 0, 0, w, h, w * 0.1); ctx.fill();
  ctx.strokeStyle = '#ffffffcc'; ctx.lineWidth = w * 0.04;
  roundRect(ctx, w * 0.08, w * 0.08, w * 0.84, h - w * 0.16, w * 0.07); ctx.stroke();
  ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `800 ${h * 0.42}px system-ui, sans-serif`; ctx.fillText('8', w / 2, h * 0.52);
  COL_HEX.forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(w * (0.22 + i * 0.185), h * 0.9, w * 0.05, 0, 7); ctx.fill(); });
}

const cache = new Map();
function tex(key, w, h, fn) {
  if (cache.has(key)) return cache.get(key);
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  fn(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  cache.set(key, t);
  return t;
}
export const backTexture = () => tex('back', 128, 180, drawBack);
export const faceTexture = (card) => tex(card.k + (card.n || '') + (card.c ?? ''), 128, 180, (ctx, w, h) => drawFace(ctx, card, w, h));

// Étiquette de joueur (sprite) : redessinée quand son contenu change.
export function makeTag() {
  const cv = document.createElement('canvas');
  cv.width = 192; cv.height = 112;
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return { cv, t, key: '' };
}
export function drawTag(tag, { emoji, count, active, img = null }) {
  const key = [emoji, count, active, img ? 'img' : ''].join('|');
  if (tag.key === key) return;
  tag.key = key;
  const ctx = tag.cv.getContext('2d');
  ctx.clearRect(0, 0, 192, 112);
  ctx.fillStyle = active ? '#ffd23f' : '#ffffffee';
  roundRect(ctx, 4, 4, 184, 104, 40); ctx.fill();
  ctx.fillStyle = '#26324f'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  if (img) {
    ctx.save();
    ctx.beginPath(); ctx.arc(52, 56, 38, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(img, 14, 18, 76, 76);
    ctx.restore();
    ctx.lineWidth = 4; ctx.strokeStyle = '#26324f'; ctx.beginPath(); ctx.arc(52, 56, 38, 0, Math.PI * 2); ctx.stroke();
  } else { ctx.font = '64px system-ui, sans-serif'; ctx.fillText(emoji, 14, 58); }
  ctx.font = '800 40px system-ui, sans-serif'; ctx.fillText(String(count), 104, 60);
  tag.t.needsUpdate = true;
}
