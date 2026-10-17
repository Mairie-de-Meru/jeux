// Cartes dessinées en canvas (aucune image externe). Partagé entre la main DOM et la scène three.
export const COLOR_HEX = { R: '#e8454d', B: '#2d78d6', G: '#2ba866', Y: '#f2b21f' };
export const COLOR_DARK = { R: '#a8232c', B: '#1a4c93', G: '#17703f', Y: '#b97d05' };
const W = 200, H = 300;

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Forme associée à chaque couleur (aide pour les daltoniens).
function shape(ctx, color, cx, cy, s) {
  ctx.beginPath();
  if (color === 'R') ctx.arc(cx, cy, s, 0, Math.PI * 2);
  else if (color === 'B') rr(ctx, cx - s * 0.9, cy - s * 0.9, s * 1.8, s * 1.8, s * 0.25);
  else if (color === 'G') { ctx.moveTo(cx, cy - s); ctx.lineTo(cx + s, cy + s * 0.8); ctx.lineTo(cx - s, cy + s * 0.8); ctx.closePath(); }
  else {
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 ? s * 0.45 : s * 1.1;
      ctx[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    ctx.closePath();
  }
  ctx.fill();
}

function pie(ctx, cx, cy, r) {
  ['R', 'B', 'G', 'Y'].forEach((c, i) => {
    ctx.fillStyle = COLOR_HEX[c];
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, i * Math.PI / 2 - Math.PI / 2, (i + 1) * Math.PI / 2 - Math.PI / 2);
    ctx.closePath();
    ctx.fill();
  });
  ctx.lineWidth = r * 0.12; ctx.strokeStyle = '#fff';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
}

function arrow(ctx, x1, y1, x2, y2, w) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2 + Math.cos(a) * w * 1.2, y2 + Math.sin(a) * w * 1.2);
  ctx.lineTo(x2 + Math.cos(a + 2.2) * w * 2, y2 + Math.sin(a + 2.2) * w * 2);
  ctx.lineTo(x2 + Math.cos(a - 2.2) * w * 2, y2 + Math.sin(a - 2.2) * w * 2);
  ctx.closePath(); ctx.fill();
}

function symbol(ctx, card, cx, cy, size, fill) {
  ctx.fillStyle = fill; ctx.strokeStyle = fill;
  if (card.kind === 'num') {
    ctx.font = `900 ${size * 1.9}px "Arial Rounded MT Bold", "Trebuchet MS", Arial, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(card.value), cx, cy + size * 0.08);
    if (card.value === 6 || card.value === 9) {
      ctx.lineWidth = size * 0.14; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx - size * 0.45, cy + size * 0.95); ctx.lineTo(cx + size * 0.45, cy + size * 0.95); ctx.stroke();
    }
  } else if (card.kind === 'skip') {
    ctx.lineWidth = size * 0.28; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, cy, size * 0.8, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - size * 0.56, cy + size * 0.56); ctx.lineTo(cx + size * 0.56, cy - size * 0.56); ctx.stroke();
  } else if (card.kind === 'rev') {
    arrow(ctx, cx - size * 0.7, cy - size * 0.38, cx + size * 0.6, cy - size * 0.38, size * 0.2);
    arrow(ctx, cx + size * 0.7, cy + size * 0.38, cx - size * 0.6, cy + size * 0.38, size * 0.2);
  } else if (card.kind === 'draw2') {
    ctx.font = `900 ${size * 1.5}px "Arial Rounded MT Bold", "Trebuchet MS", Arial, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('+2', cx, cy + size * 0.06);
  }
}

export function drawFace(ctx, card, w = W, h = H) {
  ctx.clearRect(0, 0, w, h);
  const wild = card.kind === 'wild' || card.kind === 'wild4';
  const base = wild ? '#2b2d42' : COLOR_HEX[card.color];
  // bord blanc
  ctx.fillStyle = '#fffdf6'; rr(ctx, 0, 0, w, h, 24); ctx.fill();
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, wild ? '#3a3d5c' : base); g.addColorStop(1, wild ? '#1f2136' : COLOR_DARK[card.color]);
  ctx.fillStyle = g; rr(ctx, 9, 9, w - 18, h - 18, 18); ctx.fill();
  // grand médaillon clair
  ctx.fillStyle = 'rgba(255,255,255,0.93)';
  rr(ctx, w * 0.17, h * 0.2, w * 0.66, h * 0.6, w * 0.3); ctx.fill();
  const cx = w / 2, cy = h / 2;
  if (wild) {
    pie(ctx, cx, cy - (card.kind === 'wild4' ? h * 0.05 : 0), w * (card.kind === 'wild4' ? 0.24 : 0.28));
    if (card.kind === 'wild4') {
      ctx.fillStyle = '#2b2d42'; ctx.font = '900 54px "Arial Rounded MT Bold", Arial, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('+4', cx, cy + h * 0.2);
    }
  } else {
    symbol(ctx, card, cx, cy, w * 0.28, COLOR_DARK[card.color]);
  }
  // coins
  const corner = (x, y, rot) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    if (wild) { pie(ctx, 0, 6, 15); }
    else {
      ctx.fillStyle = '#fff';
      if (card.kind === 'num') {
        ctx.font = '900 34px "Arial Rounded MT Bold", Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(card.value), 0, -4);
      } else if (card.kind === 'draw2') {
        ctx.font = '900 26px "Arial Rounded MT Bold", Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('+2', 0, -4);
      } else symbol(ctx, card, 0, -2, 12, '#fff');
      shape(ctx, card.color, 0, 26, 10);
    }
    ctx.restore();
  };
  corner(34, 40, 0); corner(w - 34, h - 40, Math.PI);
  // forme de couleur sous le médaillon (aide daltoniens)
  if (!wild) { ctx.fillStyle = COLOR_HEX[card.color]; shape(ctx, card.color, cx, h * 0.86, 13); }
}

export function drawBack(ctx, w = W, h = H) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#fffdf6'; rr(ctx, 0, 0, w, h, 24); ctx.fill();
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#34306b'); g.addColorStop(1, '#1b1840');
  ctx.fillStyle = g; rr(ctx, 9, 9, w - 18, h - 18, 18); ctx.fill();
  // motif de 4 pastilles
  const cols = ['R', 'B', 'G', 'Y'];
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    ctx.fillStyle = COLOR_HEX[cols[i]];
    ctx.beginPath(); ctx.ellipse(w / 2 + Math.cos(a) * 36, h / 2 + Math.sin(a) * 52, 30, 44, a + Math.PI / 2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#fffdf6'; ctx.beginPath(); ctx.arc(w / 2, h / 2, 22, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 3; rr(ctx, 20, 20, w - 40, h - 40, 12); ctx.stroke();
}

const faceCache = new Map();
let backC = null;
export const cardKey = (c) => `${c.color || '-'}${c.kind}${c.value ?? ''}`;

export function faceCanvas(card) {
  const k = cardKey(card);
  if (!faceCache.has(k)) {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    drawFace(cv.getContext('2d'), card);
    faceCache.set(k, cv);
  }
  return faceCache.get(k);
}
export function backCanvas() {
  if (!backC) { backC = document.createElement('canvas'); backC.width = W; backC.height = H; drawBack(backC.getContext('2d')); }
  return backC;
}
const urlCache = new Map();
export function faceURL(card) {
  const k = cardKey(card);
  if (!urlCache.has(k)) urlCache.set(k, faceCanvas(card).toDataURL());
  return urlCache.get(k);
}
export function backURL() { return backCanvas().toDataURL(); }
