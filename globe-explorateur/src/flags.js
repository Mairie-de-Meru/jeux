// Dessin canvas des 19 drapeaux (aucune image).
const W = 240, H = 160;

function bandesV(ctx, couleurs) {
  const w = W / couleurs.length;
  couleurs.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(i * w, 0, w + 1, H); });
}

function etoile(ctx, cx, cy, r, couleur) {
  ctx.fillStyle = couleur; ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.4 : r;
    ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill();
}

function bandesH(ctx, couleurs) {
  const h = H / couleurs.length;
  couleurs.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(0, i * h, W, h + 1); });
}

// étoile à 5 branches pleine
function etoile5(ctx, cx, cy, r, couleur) { etoile(ctx, cx, cy, r, couleur); }

function disque(ctx, cx, cy, r, couleur) { ctx.fillStyle = couleur; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); }

// croix de saint André / saint Georges simplifiées pour le Royaume-Uni
function diag(ctx, w, couleur) {
  ctx.strokeStyle = couleur; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, H); ctx.moveTo(W, 0); ctx.lineTo(0, H); ctx.stroke();
}

const DESSINS = {
  france: (ctx) => bandesV(ctx, ['#0055a4', '#ffffff', '#ef4135']),
  belgique: (ctx) => bandesV(ctx, ['#111111', '#fdda24', '#ef3340']),
  suisse: (ctx) => {
    ctx.fillStyle = '#da291c'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff'; ctx.fillRect(100, 30, 40, 100); ctx.fillRect(70, 60, 100, 40);
  },
  canada: (ctx) => {
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#d52b1e'; ctx.fillRect(0, 0, 60, H); ctx.fillRect(180, 0, 60, H);
    // feuille d'érable simplifiée
    const pts = [[0, -52], [10, -30], [26, -36], [20, -8], [40, -16], [36, 2], [50, 8], [20, 26], [24, 38], [4, 34], [4, 56], [-4, 56], [-4, 34], [-24, 38], [-20, 26], [-50, 8], [-36, 2], [-40, -16], [-20, -8], [-26, -36], [-10, -30]];
    ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(120 + x, 78 + y) : ctx.moveTo(120 + x, 78 + y))); ctx.closePath(); ctx.fill();
  },
  senegal: (ctx) => { bandesV(ctx, ['#00853f', '#fdef42', '#e31b23']); etoile(ctx, 120, 80, 26, '#00853f'); },
  japon: (ctx) => {
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#bc002d'; ctx.beginPath(); ctx.arc(120, 80, 44, 0, Math.PI * 2); ctx.fill();
  },
  bresil: (ctx) => {
    ctx.fillStyle = '#009c3b'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffdf00'; ctx.beginPath(); ctx.moveTo(120, 14); ctx.lineTo(222, 80); ctx.lineTo(120, 146); ctx.lineTo(18, 80); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#002776'; ctx.beginPath(); ctx.arc(120, 80, 36, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(120, 112, 62, Math.PI * 1.22, Math.PI * 1.78); ctx.stroke();
  },
  italie: (ctx) => bandesV(ctx, ['#009246', '#ffffff', '#ce2b37']),
  allemagne: (ctx) => bandesH(ctx, ['#111111', '#dd0000', '#ffce00']),
  espagne: (ctx) => { ctx.fillStyle = '#aa151b'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#f1bf00'; ctx.fillRect(0, H / 4, W, H / 2); },
  irlande: (ctx) => bandesV(ctx, ['#169b62', '#ffffff', '#ff883e']),
  mali: (ctx) => bandesV(ctx, ['#14b53a', '#fcd116', '#ce1126']),
  coteIvoire: (ctx) => bandesV(ctx, ['#f77f00', '#ffffff', '#009e60']),
  maroc: (ctx) => {
    ctx.fillStyle = '#c1272d'; ctx.fillRect(0, 0, W, H);
    // pentagramme vert (étoile à 5 branches tracée en une ligne)
    ctx.strokeStyle = '#006233'; ctx.lineWidth = 7; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let i = 0; i <= 5; i++) { const a = -Math.PI / 2 + ((i * 2) % 5) * (2 * Math.PI) / 5; ctx.lineTo(120 + Math.cos(a) * 42, 82 + Math.sin(a) * 42); }
    ctx.stroke();
  },
  chine: (ctx) => {
    ctx.fillStyle = '#de2910'; ctx.fillRect(0, 0, W, H);
    etoile5(ctx, 48, 48, 30, '#ffde00');
    [[96, 22], [112, 46], [112, 74], [96, 98]].forEach(([x, y]) => etoile5(ctx, x, y, 9, '#ffde00'));
  },
  inde: (ctx) => {
    bandesH(ctx, ['#ff9933', '#ffffff', '#138808']);
    ctx.strokeStyle = '#000080'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(120, 80, 20, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) { const a = (i * Math.PI) / 6; ctx.beginPath(); ctx.moveTo(120, 80); ctx.lineTo(120 + Math.cos(a) * 20, 80 + Math.sin(a) * 20); ctx.stroke(); }
  },
  argentine: (ctx) => {
    bandesH(ctx, ['#74acdf', '#ffffff', '#74acdf']);
    disque(ctx, 120, 80, 14, '#f6b40e');
    ctx.strokeStyle = '#f6b40e'; ctx.lineWidth = 3;
    for (let i = 0; i < 12; i++) { const a = (i * Math.PI) / 6; ctx.beginPath(); ctx.moveTo(120 + Math.cos(a) * 17, 80 + Math.sin(a) * 17); ctx.lineTo(120 + Math.cos(a) * 25, 80 + Math.sin(a) * 25); ctx.stroke(); }
  },
  royaumeUni: (ctx) => {
    ctx.fillStyle = '#012169'; ctx.fillRect(0, 0, W, H);
    diag(ctx, 22, '#ffffff'); diag(ctx, 9, '#c8102e');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 56, W, 48); ctx.fillRect(96, 0, 48, H);
    ctx.fillStyle = '#c8102e'; ctx.fillRect(0, 66, W, 28); ctx.fillRect(106, 0, 28, H);
  },
  etatsUnis: (ctx) => {
    bandesH(ctx, ['#b22234', '#ffffff', '#b22234', '#ffffff', '#b22234', '#ffffff', '#b22234']);
    ctx.fillStyle = '#3c3b6e'; ctx.fillRect(0, 0, 100, 92);
    ctx.fillStyle = '#ffffff';
    for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) { ctx.beginPath(); ctx.arc(14 + c * 18, 14 + r * 21, 4, 0, Math.PI * 2); ctx.fill(); }
  },
};

export function drawFlag(canvas, id) {
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  (DESSINS[id] || DESSINS.france)(ctx);
  ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, W - 2, H - 2);
  return canvas;
}
