// Cartes dessinées en canvas (symboles tracés, aucune image externe). Partagé entre la main DOM et la scène three.
import { rankChar } from '../logic/cards.js';

const W = 200, H = 300;
export const SUIT_COLOR = { S: '#23254a', C: '#1d6b4a', H: '#d92f45', D: '#e8731c' };
export const cardKey = (c) => c.id;

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Symbole de famille centré en (cx, cy), taille s (demi-largeur).
export function suit(ctx, s, cx, cy, size) {
  ctx.fillStyle = SUIT_COLOR[s];
  ctx.beginPath();
  if (s === 'H') {
    const k = size;
    ctx.moveTo(cx, cy + k * 0.95);
    ctx.bezierCurveTo(cx - k * 1.5, cy + k * 0.05, cx - k * 1.0, cy - k * 1.0, cx, cy - k * 0.35);
    ctx.bezierCurveTo(cx + k * 1.0, cy - k * 1.0, cx + k * 1.5, cy + k * 0.05, cx, cy + k * 0.95);
  } else if (s === 'D') {
    ctx.moveTo(cx, cy - size * 1.1); ctx.lineTo(cx + size * 0.8, cy); ctx.lineTo(cx, cy + size * 1.1); ctx.lineTo(cx - size * 0.8, cy);
  } else if (s === 'S') {
    const k = size;
    ctx.moveTo(cx, cy - k * 1.0);
    ctx.bezierCurveTo(cx + k * 1.7, cy + k * 0.35, cx + k * 0.9, cy + k * 1.0, cx + k * 0.1, cy + k * 0.5);
    ctx.lineTo(cx + k * 0.35, cy + k * 1.05); ctx.lineTo(cx - k * 0.35, cy + k * 1.05); ctx.lineTo(cx - k * 0.1, cy + k * 0.5);
    ctx.bezierCurveTo(cx - k * 0.9, cy + k * 1.0, cx - k * 1.7, cy + k * 0.35, cx, cy - k * 1.0);
  } else {
    const k = size, r = k * 0.5;
    ctx.arc(cx, cy - k * 0.5, r, 0, Math.PI * 2);
    ctx.moveTo(cx - k * 0.5 + r, cy + k * 0.35); ctx.arc(cx - k * 0.5, cy + k * 0.35, r, 0, Math.PI * 2);
    ctx.moveTo(cx + k * 0.5 + r, cy + k * 0.35); ctx.arc(cx + k * 0.5, cy + k * 0.35, r, 0, Math.PI * 2);
    ctx.moveTo(cx - k * 0.1, cy); ctx.lineTo(cx + k * 0.1, cy); ctx.lineTo(cx + k * 0.3, cy + k * 1.05); ctx.lineTo(cx - k * 0.3, cy + k * 1.05);
  }
  ctx.closePath();
  ctx.fill();
}

const faceCache = new Map();
export function faceCanvas(card) {
  if (faceCache.has(card.id)) return faceCache.get(card.id);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#fffdf6'; rr(ctx, 4, 4, W - 8, H - 8, 22); ctx.fill();
  ctx.lineWidth = 5; ctx.strokeStyle = '#cfcbe0'; ctx.stroke();
  const col = SUIT_COLOR[card.s];
  const ch = rankChar(card.r) === 'T' ? '10' : rankChar(card.r);
  ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `900 ${ch.length > 1 ? 54 : 64}px "Arial Rounded MT Bold", "Trebuchet MS", Arial, sans-serif`;
  ctx.fillText(ch, 44, 52);
  suit(ctx, card.s, 44, 104, 20);
  ctx.save(); ctx.translate(W, H); ctx.rotate(Math.PI);
  ctx.fillText(ch, 44, 52); suit(ctx, card.s, 44, 104, 20);
  ctx.restore();
  // centre : grosse famille ; figures : médaillon
  if (card.r >= 11 && card.r <= 13) {
    ctx.fillStyle = col + '22'; rr(ctx, 58, 70, 90, 160, 18); ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = col; ctx.stroke();
    ctx.font = '900 96px "Arial Rounded MT Bold", "Trebuchet MS", Arial, sans-serif';
    ctx.fillStyle = col; ctx.fillText(ch, 103, 138);
    suit(ctx, card.s, 103, 195, 18);
  } else {
    suit(ctx, card.s, 108, 152, card.r === 14 ? 50 : 38);
  }
  faceCache.set(card.id, cv);
  return cv;
}

let back = null;
export function backCanvas() {
  if (back) return back;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#fffdf6'; rr(ctx, 4, 4, W - 8, H - 8, 22); ctx.fill();
  ctx.fillStyle = '#4d3fb8'; rr(ctx, 14, 14, W - 28, H - 28, 16); ctx.fill();
  ctx.save(); rr(ctx, 14, 14, W - 28, H - 28, 16); ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 6;
  for (let i = -H; i < W + H; i += 30) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + H, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i, H); ctx.lineTo(i + H, 0); ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(W / 2, H / 2, 38, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#4d3fb8'; ctx.beginPath(); ctx.arc(W / 2, H / 2, 26, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd23f'; suit(ctx, 'D', W / 2, H / 2, 14);
  back = cv;
  return cv;
}

const urls = new Map();
export function faceURL(card) {
  if (!urls.has(card.id)) urls.set(card.id, faceCanvas(card).toDataURL('image/png'));
  return urls.get(card.id);
}
export function backURL() {
  if (!urls.has('back')) urls.set('back', backCanvas().toDataURL('image/png'));
  return urls.get('back');
}
