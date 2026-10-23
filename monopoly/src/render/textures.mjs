// Textures et icônes dessinées en canvas (tout est original).
import { GROUP_INFO } from '../logic/board.mjs';

export function makeCanvas(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}
const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
const INK = '#2b3a55';

// ---------- icônes ----------
export function drawTrain(ctx, cx, cy, s, col = '#3b78e0') {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
  ctx.fillStyle = col; rr(ctx, -0.5, -0.12, 0.62, 0.34, 0.06); ctx.fill();          // chaudière
  rr(ctx, 0.12, -0.3, 0.38, 0.52, 0.06); ctx.fill();                               // cabine
  ctx.fillStyle = '#fff'; rr(ctx, 0.2, -0.22, 0.22, 0.2, 0.04); ctx.fill();        // fenêtre
  ctx.fillStyle = '#e5424f'; rr(ctx, -0.42, -0.3, 0.14, 0.2, 0.03); ctx.fill();    // cheminée
  ctx.fillStyle = INK; for (const x of [-0.32, -0.08, 0.3]) { ctx.beginPath(); ctx.arc(x, 0.25, 0.1, 0, 7); ctx.fill(); }
  ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(-0.5, 0.0, 0.07, 0, 7); ctx.fill();
  ctx.restore();
}
export function drawTurbine(ctx, cx, cy, s) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
  ctx.fillStyle = '#9fb0c7'; ctx.beginPath(); ctx.moveTo(-0.05, 0.5); ctx.lineTo(0.05, 0.5); ctx.lineTo(0.025, -0.1); ctx.lineTo(-0.025, -0.1); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#6f84a3'; ctx.lineWidth = 0.025;
  for (let k = 0; k < 3; k++) {
    ctx.save(); ctx.translate(0, -0.1); ctx.rotate((k * 2 * Math.PI) / 3 + 0.3);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(0.09, -0.2, 0, -0.5); ctx.quadraticCurveTo(-0.05, -0.2, 0, 0); ctx.fill(); ctx.stroke(); ctx.restore();
  }
  ctx.fillStyle = '#e5424f'; ctx.beginPath(); ctx.arc(0, -0.1, 0.06, 0, 7); ctx.fill();
  ctx.restore();
}
export function drawTower(ctx, cx, cy, s) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
  ctx.strokeStyle = '#6f84a3'; ctx.lineWidth = 0.05; ctx.beginPath();
  ctx.moveTo(-0.22, 0.5); ctx.lineTo(-0.15, 0.05); ctx.moveTo(0.22, 0.5); ctx.lineTo(0.15, 0.05); ctx.moveTo(-0.2, 0.3); ctx.lineTo(0.2, 0.3); ctx.stroke();
  ctx.fillStyle = '#4aa8e8'; rr(ctx, -0.3, -0.32, 0.6, 0.4, 0.1); ctx.fill();
  ctx.fillStyle = '#2f7fc4'; ctx.beginPath(); ctx.moveTo(-0.32, -0.3); ctx.lineTo(0, -0.5); ctx.lineTo(0.32, -0.3); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(0, -0.22); ctx.quadraticCurveTo(0.12, -0.05, 0, 0.02); ctx.quadraticCurveTo(-0.12, -0.05, 0, -0.22); ctx.fill();
  ctx.restore();
}
export function drawPiggy(ctx, cx, cy, s, col = '#f48fb1') {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.ellipse(0, 0.05, 0.44, 0.32, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-0.15, -0.22); ctx.lineTo(-0.05, -0.42); ctx.lineTo(0.06, -0.22); ctx.fill();               // oreille
  rr(ctx, -0.3, 0.28, 0.14, 0.16, 0.04); ctx.fill(); rr(ctx, 0.16, 0.28, 0.14, 0.16, 0.04); ctx.fill();                  // pattes
  ctx.fillStyle = '#f06292'; rr(ctx, 0.34, -0.02, 0.2, 0.2, 0.08); ctx.fill();                                           // groin
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0.22, -0.08, 0.035, 0, 7); ctx.fill();
  ctx.fillRect(0.4, 0.04, 0.025, 0.05); ctx.fillRect(0.47, 0.04, 0.025, 0.05);
  ctx.fillRect(-0.1, -0.27, 0.22, 0.04);                                                                                  // fente
  ctx.strokeStyle = col; ctx.lineWidth = 0.05; ctx.beginPath(); ctx.arc(-0.5, 0.0, 0.07, 0, 5); ctx.stroke();            // queue
  ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.ellipse(0.01, -0.42, 0.09, 0.09, 0, 0, 7); ctx.fill();
  ctx.restore();
}
export function drawGift(ctx, cx, cy, s, col = '#ff9a2e', q = true) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
  ctx.fillStyle = col; rr(ctx, -0.4, -0.12, 0.8, 0.55, 0.06); ctx.fill();
  rr(ctx, -0.45, -0.28, 0.9, 0.2, 0.05); ctx.fill();
  ctx.fillStyle = '#fff'; if (!q) ctx.fillRect(-0.07, -0.28, 0.14, 0.71); else ctx.fillRect(-0.07, -0.28, 0.14, 0.2);
  ctx.beginPath(); ctx.ellipse(-0.14, -0.38, 0.14, 0.09, -0.4, 0, 7); ctx.ellipse(0.14, -0.38, 0.14, 0.09, 0.4, 0, 7); ctx.fill();
  if (q) { ctx.fillStyle = '#fff'; ctx.font = 'bold 0.5px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', 0.0, 0.22); ctx.fillStyle = col; }
  ctx.restore();
}
export function drawChest(ctx, cx, cy, s) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
  ctx.fillStyle = '#b9763d'; rr(ctx, -0.42, -0.02, 0.84, 0.46, 0.05); ctx.fill();
  ctx.fillStyle = '#d68f4d'; ctx.beginPath(); ctx.moveTo(-0.42, -0.02); ctx.quadraticCurveTo(-0.42, -0.4, 0, -0.4); ctx.quadraticCurveTo(0.42, -0.4, 0.42, -0.02); ctx.fill();
  ctx.fillStyle = '#ffd23f'; ctx.fillRect(-0.44, -0.04, 0.88, 0.07); rr(ctx, -0.07, -0.08, 0.14, 0.2, 0.03); ctx.fill();
  ctx.strokeStyle = '#7a4b2a'; ctx.lineWidth = 0.03; rr(ctx, -0.42, -0.02, 0.84, 0.46, 0.05); ctx.stroke();
  ctx.restore();
}
export function drawBulb(ctx, cx, cy, s) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
  ctx.fillStyle = '#ffe066'; ctx.strokeStyle = '#d99a00'; ctx.lineWidth = 0.03;
  ctx.beginPath(); ctx.arc(0, -0.1, 0.28, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#9fb0c7'; rr(ctx, -0.12, 0.17, 0.24, 0.1, 0.03); ctx.fill(); rr(ctx, -0.1, 0.28, 0.2, 0.08, 0.03); ctx.fill();
  ctx.strokeStyle = '#ffb703'; ctx.lineWidth = 0.04; ctx.lineCap = 'round';
  for (let k = 0; k < 5; k++) { const a = -Math.PI + (k * Math.PI) / 4 + 0.0; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 0.38, -0.1 + Math.sin(a) * 0.38); ctx.lineTo(Math.cos(a) * 0.5, -0.1 + Math.sin(a) * 0.5); ctx.stroke(); }
  ctx.strokeStyle = '#d99a00'; ctx.beginPath(); ctx.moveTo(-0.08, 0.1); ctx.lineTo(0, -0.05); ctx.lineTo(0.08, 0.1); ctx.stroke();
  ctx.restore();
}
export function drawFox(ctx, cx, cy, s) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
  ctx.fillStyle = '#f2792b'; // oreilles
  ctx.beginPath(); ctx.moveTo(-0.42, -0.1); ctx.lineTo(-0.38, -0.55); ctx.lineTo(-0.1, -0.3); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0.42, -0.1); ctx.lineTo(0.38, -0.55); ctx.lineTo(0.1, -0.3); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, 0.05, 0.46, 0.4, 0, 0, 7); ctx.fill();         // tête
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-0.46, 0.1); ctx.quadraticCurveTo(0, 0.7, 0.46, 0.1); ctx.quadraticCurveTo(0, 0.2, -0.46, 0.1); ctx.fill();
  ctx.fillStyle = '#2b3a55';
  for (const [x, y, r] of [[-0.17, 0.0, 0.05], [0.17, 0.0, 0.05], [0, 0.2, 0.06]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
  ctx.strokeStyle = '#2b3a55'; ctx.lineWidth = 0.03; ctx.beginPath(); ctx.arc(0, 0.2, 0.14, 0.3, Math.PI - 0.3); ctx.stroke();
  ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = '#d99a00'; ctx.lineWidth = 0.03; // casque de chantier
  ctx.beginPath(); ctx.moveTo(-0.38, -0.2); ctx.quadraticCurveTo(-0.38, -0.6, 0, -0.6); ctx.quadraticCurveTo(0.38, -0.6, 0.38, -0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
  rr(ctx, -0.46, -0.24, 0.92, 0.08, 0.03); ctx.fill(); ctx.stroke(); rr(ctx, -0.06, -0.62, 0.12, 0.3, 0.03); ctx.fill();
  ctx.restore();
}
export function drawCoins(ctx, cx, cy, s) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
  for (const [x, y] of [[-0.18, 0.1], [0.2, 0.15], [0, -0.15]]) {
    ctx.fillStyle = '#ffc928'; ctx.strokeStyle = '#d99a00'; ctx.lineWidth = 0.04;
    ctx.beginPath(); ctx.arc(x, y, 0.22, 0, 7); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, 0.13, 0, 7); ctx.stroke();
  }
  ctx.restore();
}
export function drawHouse(ctx, cx, cy, s, wall = '#fff3d6', roof = '#e5424f') {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
  ctx.fillStyle = wall; ctx.strokeStyle = INK; ctx.lineWidth = 0.04;
  rr(ctx, -0.35, -0.05, 0.7, 0.5, 0.04); ctx.fill(); ctx.stroke();
  ctx.fillStyle = roof; ctx.beginPath(); ctx.moveTo(-0.45, -0.03); ctx.lineTo(0, -0.45); ctx.lineTo(0.45, -0.03); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#7a4b2a'; rr(ctx, -0.09, 0.18, 0.18, 0.27, 0.03); ctx.fill();
  ctx.fillStyle = '#8fd3f4'; ctx.fillRect(0.14, 0.05, 0.14, 0.12); ctx.fillRect(-0.28, 0.05, 0.14, 0.12);
  ctx.restore();
}
export function drawSun(ctx, cx, cy, r) {
  ctx.save(); ctx.translate(cx, cy);
  ctx.strokeStyle = '#ffb703'; ctx.lineWidth = r * 0.12; ctx.lineCap = 'round';
  for (let k = 0; k < 12; k++) { const a = (k * Math.PI) / 6; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 1.3, Math.sin(a) * r * 1.3); ctx.lineTo(Math.cos(a) * r * 1.7, Math.sin(a) * r * 1.7); ctx.stroke(); }
  ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(-r * 0.35, -r * 0.1, r * 0.08, 0, 7); ctx.arc(r * 0.35, -r * 0.1, r * 0.08, 0, 7); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = r * 0.07; ctx.beginPath(); ctx.arc(0, r * 0.1, r * 0.4, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.restore();
}
function drawBars(ctx, x, y, w, h) {
  ctx.fillStyle = '#c9d3e3'; rr(ctx, x, y, w, h, 12); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.strokeRect(x, y, w, h);
  for (let k = 1; k < 5; k++) { ctx.beginPath(); ctx.moveTo(x + (w * k) / 5, y); ctx.lineTo(x + (w * k) / 5, y + h); ctx.stroke(); }
}

// Images de référence optionnelles (icônes de cases, billets) : repli sur les dessins canvas.
const REF = {};
export const setRef = (k, img) => { REF[k] = img; };
function drawRef(ctx, key, cx, cy, size) {
  const img = REF[key]; if (!img) return false;
  const k = size / Math.max(img.width, img.height);
  ctx.drawImage(img, cx - (img.width * k) / 2, cy - (img.height * k) / 2, img.width * k, img.height * k); return true;
}
export function iconCanvas(kind, size = 64, color) {
  const c = makeCanvas(size, size); const ctx = c.getContext('2d'); const m = size / 2;
  ({ station: () => drawTrain(ctx, m, m, size * 0.9), turbine: () => drawTurbine(ctx, m, m, size * 0.9), tower: () => drawTower(ctx, m, m, size * 0.9),
    tirelire: () => drawChest(ctx, m, m, size * 0.95), bulb: () => drawBulb(ctx, m, m, size * 0.9), fox: () => drawFox(ctx, m, m, size * 0.9), surprise: () => drawGift(ctx, m, m, size * 0.95, color), tax: () => drawCoins(ctx, m, m, size * 0.9) }[kind] || (() => {}))();
  return c;
}

// ---------- textures de cases ----------
// Coupe en lignes ; un mot composé peut se couper après son trait d'union.
function wrapText(ctx, text, maxW) {
  const words = text.split(' ').flatMap((w) => w.split(/(?<=-)/)); const lines = []; let line = '';
  for (const w of words) {
    const glue = line && !line.endsWith('-') ? ' ' : '';
    const t = line + glue + w;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  lines.push(line); return lines;
}
// Abréviations utilisées seulement si le nom complet ne tient pas en assez gros.
const ABBR = [[/^Boulevard /, 'Bd '], [/^Avenue /, 'Av. '], [/^Compagnie /, 'Cie '], [/^Faubourg /, 'Fg ']];
const abbreviate = (name) => ABBR.reduce((n, [re, r]) => n.replace(re, r), name);
const FONT = (fs) => `bold ${fs}px "Trebuchet MS", system-ui, sans-serif`;
function fitName(ctx, name, maxW, maxLines, size, min) {
  for (let fs = size; fs >= min; fs -= 2) { ctx.font = FONT(fs); const lines = wrapText(ctx, name, maxW); if (lines.length <= maxLines && lines.every((l) => ctx.measureText(l).width <= maxW)) return { fs, lines }; }
  return null;
}
// Nom centré, le plus gros possible : nom complet (≥ 36 px), sinon abrégé (≥ 32), sinon nom complet réduit.
function centeredName(ctx, name, cx, y0, maxW, maxLines = 3, size = 44) {
  ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const short = abbreviate(name);
  const fit = fitName(ctx, name, maxW, maxLines, size, 36) || (short !== name && fitName(ctx, short, maxW, maxLines, size, 32)) || fitName(ctx, name, maxW, maxLines, 34, 18) || { fs: 18, lines: wrapText(ctx, name, maxW) };
  ctx.font = FONT(fit.fs);
  fit.lines.forEach((l, k) => ctx.fillText(l, cx, y0 + k * (fit.fs + 2)));
  return { h: fit.lines.length * (fit.fs + 2), fs: fit.fs };
}
function emojiAt(ctx, e, cx, cy, size) {
  ctx.font = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText(e, cx, cy);
}

// Dimensions logiques d'une case (216 × 312 pour 1,8 × 2,6 unités) ; le canevas est 1,5× plus fin
// pour rester net quand on zoome. Taille des textes mémorisée pour les mesures (crochet textInfo).
export const TILE_PX = { W: 216, H: 312, K: 1.5, PRICE: 46, PLANE_W: 1.68 };
const nameFs = {};
export function tileTextInfo() {
  const u = TILE_PX.PLANE_W / TILE_PX.W; const sizes = Object.values(nameFs);
  return { nameUnits: (nameFs[1] || 0) * u, minNameUnits: Math.min(...sizes) * u, priceUnits: TILE_PX.PRICE * u, nameFs: { ...nameFs } };
}

export function tileCanvas(sp) {
  const { W, H, K } = TILE_PX;
  const c = makeCanvas(W * K, H * K); const ctx = c.getContext('2d'); ctx.scale(K, K);
  ctx.fillStyle = '#fbfdff'; ctx.fillRect(0, 0, W, H);
  let top = 6;
  if (sp.kind === 'prop') {
    ctx.fillStyle = GROUP_INFO[sp.group].color; ctx.fillRect(0, 0, W, 54);
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(0, 50, W, 5);
    top = 56;
  }
  const nm = centeredName(ctx, sp.name, W / 2, top + 26, W - 14, 3, sp.kind === 'prop' ? 44 : 40);
  nameFs[sp.i] = nm.fs;
  const iy = Math.max(top + 4 + nm.h + 52, 186);
  const cx = W / 2;
  switch (sp.kind) {
    case 'station': if (!drawRef(ctx, 'icone-gare', cx, iy, 96)) drawTrain(ctx, cx, iy, 86); break;
    case 'utility': if (!drawRef(ctx, sp.name.includes('eaux') ? 'icone-eau' : 'icone-electricite', cx, iy, 96)) (sp.name.includes('eaux') ? drawTower : drawBulb)(ctx, cx, iy, 88); break;
    case 'tirelire': if (!drawRef(ctx, 'icone-caisse', cx, iy, 96)) drawChest(ctx, cx, iy, 88); break;
    case 'surprise': if (!drawRef(ctx, 'icone-chance', cx, iy, 110)) drawGift(ctx, cx, iy, 100); break;
    case 'tax': if (!drawRef(ctx, sp.amount >= 200 ? 'icone-impot' : 'icone-luxe', cx, iy, 90)) drawCoins(ctx, cx, iy, 80); break;
  }
  ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = FONT(TILE_PX.PRICE);
  if (sp.price) ctx.fillText(String(sp.price) + ' €', cx, H - 30);
  if (sp.kind === 'tax') ctx.fillText(String(sp.amount) + ' €', cx, H - 30);
  ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.strokeRect(2.5, 2.5, W - 5, H - 5);
  return c;
}

export function cornerCanvas(sp) {
  const S = 300; const c = makeCanvas(S, S); const ctx = c.getContext('2d');
  const bg = { go: '#ffe9a8', jail: '#ffd2c2', freepark: '#d6f5d6', gotojail: '#cfd8ff' }[sp.kind];
  ctx.fillStyle = bg; ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (sp.kind === 'go') {
    ctx.font = 'bold 54px "Trebuchet MS", system-ui, sans-serif'; ctx.fillText('DÉPART', S / 2, 62);
    if (!drawRef(ctx, 'icone-depart', S / 2, 160, 140)) { ctx.fillStyle = '#e5424f'; ctx.beginPath(); ctx.moveTo(40, 170); ctx.lineTo(120, 105); ctx.lineTo(120, 145); ctx.lineTo(260, 145); ctx.lineTo(260, 195); ctx.lineTo(120, 195); ctx.lineTo(120, 235); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = INK; ctx.font = 'bold 38px "Trebuchet MS", system-ui, sans-serif'; ctx.fillText('+200 €', S / 2, 268);
  } else if (sp.kind === 'jail') {
    drawBars(ctx, 150, 20, 130, 130);
    ctx.fillStyle = INK; ctx.font = 'bold 40px "Trebuchet MS", system-ui, sans-serif'; ctx.fillText('PRISON', 150, 188);
    ctx.font = 'bold 34px "Trebuchet MS", system-ui, sans-serif'; ctx.fillText('simple visite', 150, 230);
    emojiAt(ctx, '👀', 52, 80, 48);
  } else if (sp.kind === 'freepark') {
    if (!drawRef(ctx, 'icone-parc', S / 2, 100, 110)) emojiAt(ctx, '🧺', S / 2, 100, 100);
    ctx.fillStyle = INK; ctx.font = 'bold 36px "Trebuchet MS", system-ui, sans-serif'; ctx.fillText('Aire de', S / 2, 190); ctx.fillText('pique-nique', S / 2, 232);
  } else {
    emojiAt(ctx, '🚓', S / 2, 100, 100);
    ctx.fillStyle = INK; ctx.font = 'bold 40px "Trebuchet MS", system-ui, sans-serif'; ctx.fillText('Va en', S / 2, 190); ctx.fillText('prison !', S / 2, 236);
  }
  ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.strokeRect(3, 3, S - 6, S - 6);
  return c;
}

// ---------- centre du plateau ----------
export function centerCanvas(S = 1024) {
  const c = makeCanvas(S, S); const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, S); g.addColorStop(0, '#e3f6dc'); g.addColorStop(1, '#cdebc3');
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  // nuages
  ctx.fillStyle = 'rgba(255,255,255,.8)';
  for (const [x, y, r] of [[200, 160, 50], [260, 150, 62], [320, 165, 46], [770, 120, 44], [830, 108, 58], [890, 126, 40]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
  drawSun(ctx, 860, 250, 52);
  drawHouse(ctx, 650, 330, 150, '#fff3d6', '#e5424f'); drawHouse(ctx, 780, 380, 110, '#fde0e8', '#3b78e0');
  ctx.fillStyle = '#9ed78f'; ctx.beginPath(); ctx.ellipse(S / 2, S - 40, 480, 50, 0, 0, 7); ctx.fill();
  // bandeau rouge arrondi « Ma ville » et mascotte
  ctx.save(); ctx.translate(S / 2, S / 2 + 10); ctx.rotate(-0.12);
  ctx.fillStyle = '#d6303d'; rr(ctx, -300, -62, 600, 124, 40); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 8; rr(ctx, -288, -50, 576, 100, 32); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold 104px "Trebuchet MS", system-ui, sans-serif'; ctx.fillText('Ma ville', 0, 6);
  ctx.restore();
  drawFox(ctx, 290, 730, 190);
  // zones pointillées des pioches (Surprise orange, Tirelire bleue)
  const zone = (cx, cy, col, label) => {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(cx < S / 2 ? 0.0 : 0.0);
    ctx.setLineDash([16, 14]); ctx.strokeStyle = col; ctx.lineWidth = 8; rr(ctx, -130, -90, 260, 180, 24); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = col; ctx.font = 'bold 27px "Trebuchet MS", system-ui, sans-serif'; ctx.fillText(label, 0, 120);
    ctx.restore();
  };
  zone(S * 0.3, S * 0.3, '#ff9a2e', 'Chance');
  zone(S * 0.7, S * 0.7, '#3b78e0', 'Caisse de communauté');
  return c;
}

export function deckBackCanvas(kind) {
  const W = 260; const H = 180; const c = makeCanvas(W, H); const ctx = c.getContext('2d');
  const col = kind === 'surprise' ? '#ff9a2e' : '#3b78e0';
  ctx.fillStyle = col; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 8; ctx.strokeRect(12, 12, W - 24, H - 24);
  if (kind === 'surprise') { ctx.fillStyle = '#fff'; ctx.font = 'bold 130px "Trebuchet MS", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', W / 2, H / 2 + 8); }
  else drawChest(ctx, W / 2, H / 2 + 6, 130);
  return c;
}

// ---------- dés ----------
export function pipsCanvas(n) {
  const S = 128; const c = makeCanvas(S, S); const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, S, S);
  const p = { 1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [2, 0], [0, 2], [2, 2]], 5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]], 6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]] }[n];
  ctx.fillStyle = '#243049';
  for (const [x, y] of p) { ctx.beginPath(); ctx.arc(28 + x * 36, 28 + y * 36, n === 1 ? 17 : 12, 0, 7); ctx.fill(); }
  return c;
}

// ---------- billets (1, 5, 10, 20, 50, 100, 200, 500) ----------
export const NOTES = [500, 200, 100, 50, 20, 10, 5, 1];
const NOTE_COL = { 1: '#f5f5dc', 5: '#ffd9e8', 10: '#ffe9a8', 20: '#c8f0cf', 50: '#ffd1a8', 100: '#cfe0ff', 200: '#e3d4ff', 500: '#bdeef0' };
export function drawNote(ctx, value, x, y, w, h, angle = 0) {
  ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(angle); ctx.translate(-w / 2, -h / 2);
  if (REF['billet-' + value]) { ctx.drawImage(REF['billet-' + value], 0, 0, w, h); ctx.restore(); return; }
  ctx.fillStyle = NOTE_COL[value]; rr(ctx, 0, 0, w, h, h * 0.14); ctx.fill();
  ctx.strokeStyle = 'rgba(43,58,85,.55)'; ctx.lineWidth = Math.max(1, h * 0.05); ctx.stroke();
  ctx.strokeStyle = 'rgba(43,58,85,.25)'; rr(ctx, h * 0.1, h * 0.1, w - h * 0.2, h * 0.8, h * 0.1); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.arc(w / 2, h / 2, h * 0.34, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `bold ${h * (String(value).length > 2 ? 0.28 : 0.36)}px "Trebuchet MS", system-ui, sans-serif`; ctx.fillText(String(value), w / 2, h / 2 + 1);
  ctx.font = `bold ${h * 0.2}px sans-serif`; ctx.textAlign = 'left'; ctx.fillText('€', h * 0.14, h * 0.24); ctx.textAlign = 'right'; ctx.fillText('€', w - h * 0.14, h * 0.8);
  ctx.restore();
}
export function breakdown(amount) {
  const out = []; let r = Math.max(0, amount);
  for (const v of NOTES) { const n = Math.floor(r / v); if (n) out.push([v, n]); r -= n * v; }
  return out;
}
// Éventail des plus gros billets de la fortune (max 5).
export function moneyCanvas(amount, w = 120, h = 40) {
  const c = makeCanvas(w * 2, h * 2); const ctx = c.getContext('2d');
  const notes = []; for (const [v, n] of breakdown(amount)) for (let k = 0; k < Math.min(n, 2); k++) notes.push(v);
  const shown = notes.slice(0, 5).reverse();
  const nw = w * 1.0; const nh = h * 1.3;
  shown.forEach((v, k) => drawNote(ctx, v, (w * 2 - nw) / 2 + (k - (shown.length - 1) / 2) * (nw * 0.2) - 0, h * 0.3 + (k % 2) * 4, nw * 0.9, nh * 0.9, (k - (shown.length - 1) / 2) * 0.12));
  return c;
}
