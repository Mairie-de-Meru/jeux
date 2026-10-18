// Faces et dos de cartes dessinés en canvas (design original : aucun visuel de marque).
export const CW = 256, CH = 384;
export const SUIT_COLOR = { S: '#23263d', C: '#23263d', H: '#d6283a', D: '#d6283a' };
const RANK_LABEL = { 7: '7', 8: '8', 9: '9', 10: '10', J: 'V', Q: 'D', K: 'R', A: 'A' };
const PIPS = {
  7: [[0, 0], [1, 0], [0, 0.5], [1, 0.5], [0.5, 0.25], [0, 1], [1, 1]],
  8: [[0, 0], [1, 0], [0, 1 / 3], [1, 1 / 3], [0, 2 / 3], [1, 2 / 3], [0, 1], [1, 1]],
  9: [[0, 0], [1, 0], [0, 1 / 3], [1, 1 / 3], [0, 2 / 3], [1, 2 / 3], [0, 1], [1, 1], [0.5, 0.5]],
  10: [[0, 0], [1, 0], [0, 1 / 3], [1, 1 / 3], [0, 2 / 3], [1, 2 / 3], [0, 1], [1, 1], [0.5, 1 / 6], [0.5, 5 / 6]],
};

export const cardKey = (card) => card.id;

function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

// Symbole de couleur dessiné en chemins (pas de dépendance aux polices).
export function drawSuit(ctx, suit, cx, cy, s, color) {
  ctx.save(); ctx.translate(cx, cy); ctx.fillStyle = color; ctx.beginPath();
  if (suit === 'H') {
    ctx.moveTo(0, 0.9 * s);
    ctx.bezierCurveTo(-1.4 * s, 0.1 * s, -1.0 * s, -0.9 * s, 0, -0.3 * s);
    ctx.bezierCurveTo(1.0 * s, -0.9 * s, 1.4 * s, 0.1 * s, 0, 0.9 * s);
  } else if (suit === 'D') {
    ctx.moveTo(0, -s); ctx.quadraticCurveTo(0.25 * s, -0.3 * s, 0.75 * s, 0);
    ctx.quadraticCurveTo(0.25 * s, 0.3 * s, 0, s); ctx.quadraticCurveTo(-0.25 * s, 0.3 * s, -0.75 * s, 0);
    ctx.quadraticCurveTo(-0.25 * s, -0.3 * s, 0, -s);
  } else if (suit === 'S') {
    ctx.moveTo(0, -0.95 * s);
    ctx.bezierCurveTo(-1.5 * s, -0.05 * s, -1.0 * s, 0.8 * s, 0, 0.3 * s);
    ctx.bezierCurveTo(1.0 * s, 0.8 * s, 1.5 * s, -0.05 * s, 0, -0.95 * s);
    ctx.moveTo(0, 0.1 * s); ctx.lineTo(-0.38 * s, 0.98 * s); ctx.lineTo(0.38 * s, 0.98 * s);
  } else {
    for (const [x, y] of [[0, -0.5], [-0.52, 0.18], [0.52, 0.18]]) { ctx.moveTo(x * s + 0.46 * s, y * s); ctx.arc(x * s, y * s, 0.46 * s, 0, Math.PI * 2); }
    ctx.moveTo(0, 0); ctx.lineTo(-0.36 * s, 0.98 * s); ctx.lineTo(0.36 * s, 0.98 * s);
  }
  ctx.fill(); ctx.restore();
}

function corner(ctx, label, suit, color) {
  ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `900 ${label.length > 1 ? 58 : 70}px "Trebuchet MS", Arial, sans-serif`;
  ctx.fillText(label, 40, 52);
  drawSuit(ctx, suit, 40, 108, 22, color);
}

export function faceCanvas(card) {
  const cv = document.createElement('canvas'); cv.width = CW; cv.height = CH;
  const ctx = cv.getContext('2d');
  const color = SUIT_COLOR[card.suit];
  ctx.fillStyle = '#fffdf6'; roundRect(ctx, 0, 0, CW, CH, 22); ctx.fill();
  ctx.lineWidth = 6; ctx.strokeStyle = '#cfd2e6'; roundRect(ctx, 3, 3, CW - 6, CH - 6, 20); ctx.stroke();
  const label = RANK_LABEL[card.rank];
  corner(ctx, label, card.suit, color);
  ctx.save(); ctx.translate(CW, CH); ctx.rotate(Math.PI); corner(ctx, label, card.suit, color); ctx.restore();

  if (PIPS[card.rank]) {
    const x0 = 92, x1 = 164, y0 = 92, y1 = 292;
    for (const [px, py] of PIPS[card.rank]) drawSuit(ctx, card.suit, x0 + px * (x1 - x0), y0 + py * (y1 - y0), 26, color);
  } else if (card.rank === 'A') {
    ctx.fillStyle = color === '#d6283a' ? '#fde3e6' : '#e3e5f3';
    ctx.beginPath(); ctx.arc(CW / 2, CH / 2, 82, 0, Math.PI * 2); ctx.fill();
    drawSuit(ctx, card.suit, CW / 2, CH / 2 + 4, 62, color);
  } else {
    // V / D / R : médaillon avec grande lettre et deux symboles
    const tint = color === '#d6283a' ? '#fde3e6' : '#e3e5f3';
    ctx.fillStyle = tint; roundRect(ctx, 70, 84, 116, 216, 40); ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = color; roundRect(ctx, 70, 84, 116, 216, 40); ctx.stroke();
    drawSuit(ctx, card.suit, CW / 2, 128, 24, color);
    ctx.fillStyle = color; ctx.font = '900 104px "Trebuchet MS", Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, CW / 2, 195);
    drawSuit(ctx, card.suit, CW / 2, 262, 24, color);
  }
  return cv;
}

export function backCanvas() {
  const cv = document.createElement('canvas'); cv.width = CW; cv.height = CH;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#fffdf6'; roundRect(ctx, 0, 0, CW, CH, 22); ctx.fill();
  const g = ctx.createLinearGradient(0, 0, CW, CH); g.addColorStop(0, '#3b4fc4'); g.addColorStop(1, '#22307f');
  ctx.fillStyle = g; roundRect(ctx, 14, 14, CW - 28, CH - 28, 14); ctx.fill();
  ctx.save(); roundRect(ctx, 14, 14, CW - 28, CH - 28, 14); ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 4;
  for (let i = -CH; i < CW + CH; i += 38) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + CH, CH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i + CH, 0); ctx.lineTo(i, CH); ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(CW / 2, CH / 2, 66, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#22307f'; ctx.beginPath(); ctx.arc(CW / 2, CH / 2, 56, 0, Math.PI * 2); ctx.fill();
  [['S', -22, -22, '#ffffff'], ['H', 22, -22, '#ff7b86'], ['D', -22, 22, '#ff7b86'], ['C', 22, 22, '#ffffff']]
    .forEach(([s, dx, dy, c]) => drawSuit(ctx, s, CW / 2 + dx, CH / 2 + dy, 15, c));
  ctx.lineWidth = 5; ctx.strokeStyle = '#ffd23f'; roundRect(ctx, 14, 14, CW - 28, CH - 28, 14); ctx.stroke();
  return cv;
}

const urls = new Map();
export function faceURL(card) {
  const k = cardKey(card);
  if (!urls.has(k)) urls.set(k, faceCanvas(card).toDataURL('image/png'));
  return urls.get(k);
}
let backUrl = null;
export const backURL = () => backUrl || (backUrl = backCanvas().toDataURL('image/png'));
