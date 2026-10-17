// Dessins procéduraux au trait (repli si l'image manque + exemples de la galerie). Repère 1024x768.
function shape(ctx, build, fill, opts) {
  ctx.beginPath();
  build();
  if (opts.fills && fill) { ctx.fillStyle = fill; ctx.fill(); }
  ctx.stroke();
}

const DRAWERS = {
  soleil(ctx, o) {
    const cx = 512, cy = 360, r = 130;
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      shape(ctx, () => {
        ctx.moveTo(cx + Math.cos(a - 0.2) * r, cy + Math.sin(a - 0.2) * r);
        ctx.lineTo(cx + Math.cos(a) * 250, cy + Math.sin(a) * 250);
        ctx.lineTo(cx + Math.cos(a + 0.2) * r, cy + Math.sin(a + 0.2) * r);
        ctx.closePath();
      }, '#ff9500', o);
    }
    shape(ctx, () => ctx.arc(cx, cy, r, 0, Math.PI * 2), '#ffd60a', o);
    shape(ctx, () => ctx.arc(470, 335, 14, 0, Math.PI * 2), '#222', o);
    shape(ctx, () => ctx.arc(554, 335, 14, 0, Math.PI * 2), '#222', o);
    ctx.beginPath(); ctx.arc(512, 365, 62, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
  },
  fleur(ctx, o) {
    const cx = 512, cy = 280;
    shape(ctx, () => ctx.rect(497, 440, 30, 260), '#2ecc40', o);
    shape(ctx, () => ctx.ellipse(430, 560, 75, 30, -0.5, 0, Math.PI * 2), '#a6e22e', o);
    shape(ctx, () => ctx.ellipse(594, 520, 75, 30, 0.5, 0, Math.PI * 2), '#a6e22e', o);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + 0.3;
      shape(ctx, () => ctx.ellipse(cx + Math.cos(a) * 105, cy + Math.sin(a) * 105, 70, 45, a, 0, Math.PI * 2), '#ff5fb7', o);
    }
    shape(ctx, () => ctx.arc(cx, cy, 55, 0, Math.PI * 2), '#ffd60a', o);
    ctx.beginPath(); ctx.moveTo(60, 700); ctx.lineTo(964, 700); ctx.stroke();
  },
  voiture(ctx, o) {
    shape(ctx, () => {
      ctx.moveTo(130, 480); ctx.lineTo(130, 420); ctx.quadraticCurveTo(130, 390, 170, 380);
      ctx.lineTo(330, 360); ctx.lineTo(400, 270); ctx.quadraticCurveTo(420, 250, 450, 250);
      ctx.lineTo(650, 250); ctx.quadraticCurveTo(680, 250, 700, 270); ctx.lineTo(780, 360);
      ctx.lineTo(860, 375); ctx.quadraticCurveTo(900, 385, 900, 420); ctx.lineTo(900, 480); ctx.closePath();
    }, '#ff3b30', o);
    shape(ctx, () => { ctx.moveTo(420, 350); ctx.lineTo(455, 285); ctx.lineTo(535, 285); ctx.lineTo(535, 350); ctx.closePath(); }, '#4fc3ff', o);
    shape(ctx, () => { ctx.moveTo(565, 350); ctx.lineTo(565, 285); ctx.lineTo(645, 285); ctx.lineTo(690, 350); ctx.closePath(); }, '#4fc3ff', o);
    shape(ctx, () => ctx.arc(870, 425, 20, 0, Math.PI * 2), '#ffd60a', o);
    for (const wx of [300, 730]) {
      shape(ctx, () => ctx.arc(wx, 490, 80, 0, Math.PI * 2), '#222', o);
      shape(ctx, () => ctx.arc(wx, 490, 35, 0, Math.PI * 2), '#ccc', o);
    }
    ctx.beginPath(); ctx.moveTo(60, 580); ctx.lineTo(964, 580); ctx.stroke();
  },
};

export const LINEART_NAMES = Object.keys(DRAWERS);

/** Dessine `name` au trait noir (épaisseur 7) dans ctx, à l'échelle de (w,h). Pas de fond : à l'appelant. */
export function drawLineArt(ctx, w, h, name, { fills = false } = {}) {
  const fn = DRAWERS[name];
  if (!fn) return false;
  ctx.save();
  ctx.scale(w / 1024, h / 768);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 7;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  fn(ctx, { fills });
  ctx.restore();
  return true;
}

/** Canvas 512x384 d'un dessin d'exemple colorié (galerie vide). */
export function exampleCanvas(name, w = 512, h = 384) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = name === 'voiture' ? '#d8f1ff' : '#fffdf5';
  ctx.fillRect(0, 0, w, h);
  drawLineArt(ctx, w, h, name, { fills: true });
  return c;
}
