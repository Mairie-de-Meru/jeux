import { layoutText } from './logic/words.js';

export const PAGE_W = 768;
export const PAGE_H = 1024;
export const FONT_FAMILY = '"Andika","Comic Neue",system-ui,sans-serif';
export const PAPER = '#fff8e8';
const INK = '#2b2438';
const HILITE = '#ffd93b';
const TEXT_SIZE = 64;
const LINE_H = 96;
const MARGIN = 70;

function newCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = PAGE_W;
  canvas.height = PAGE_H;
  return [canvas, canvas.getContext('2d')];
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function bigEmoji(ctx, emoji, y, size) {
  ctx.font = `${size}px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = INK;
  ctx.fillText(emoji, PAGE_W / 2, y);
}

// Image en « cover-fit » dans un rectangle arrondi.
function drawImageIn(ctx, img, x, y, w, h, r) {
  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.clip();
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
}

function softGradient(ctx, couleur, x, y, w, h, r) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, couleur);
  g.addColorStop(1, PAPER);
  ctx.fillStyle = g;
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();
}

function wrapLines(ctx, text, maxWidth, lineHeight) {
  const layout = layoutText(text, (s) => ctx.measureText(s).width, maxWidth, lineHeight);
  return layout.lines.map((line) => line.words.map((w) => w.text).join(' '));
}

export function drawIllustration(img, couleur) {
  const [canvas, ctx] = newCanvas();
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);
  const m = 36;
  if (img) {
    drawImageIn(ctx, img, m, m, PAGE_W - 2 * m, PAGE_H - 2 * m, 48);
  } else {
    softGradient(ctx, couleur, m, m, PAGE_W - 2 * m, PAGE_H - 2 * m, 48);
    bigEmoji(ctx, '🦊', PAGE_H / 2, 320);
  }
  return canvas;
}

export function drawCover(img, couleur, titre) {
  const [canvas, ctx] = newCanvas();
  ctx.fillStyle = couleur;
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);
  const m = 40;
  if (img) {
    drawImageIn(ctx, img, m, m, PAGE_W - 2 * m, PAGE_H - 2 * m, 56);
  } else {
    bigEmoji(ctx, '🦊', PAGE_H * 0.4, 380);
  }
  ctx.font = `bold 68px ${FONT_FAMILY}`;
  const lines = wrapLines(ctx, titre, PAGE_W - 2 * m - 80, 84);
  const bh = lines.length * 84 + 56;
  const by = PAGE_H - m - 30 - bh;
  ctx.fillStyle = 'rgba(255, 248, 232, 0.93)';
  roundRect(ctx, m + 20, by, PAGE_W - 2 * m - 40, bh, 40);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((l, k) => ctx.fillText(l, PAGE_W / 2, by + 28 + k * 84 + 42));
  return canvas;
}

export function drawFin() {
  const [canvas, ctx] = newCanvas();
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);
  ctx.font = `bold 200px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = INK;
  ctx.fillText('Fin', PAGE_W / 2, PAGE_H * 0.38);
  bigEmoji(ctx, '🌟', PAGE_H * 0.62, 220);
  return canvas;
}

export function drawEndArt(couleur) {
  const [canvas, ctx] = newCanvas();
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);
  softGradient(ctx, couleur, 36, 36, PAGE_W - 72, PAGE_H - 72, 48);
  bigEmoji(ctx, '⭐', PAGE_H / 2, 320);
  return canvas;
}

// Page de texte : mise en page calculée une fois, `draw(i)` redessine avec le mot i surligné.
export function makeTextPage(texte, number) {
  const [canvas, ctx] = newCanvas();
  const font = `${TEXT_SIZE}px ${FONT_FAMILY}`;
  ctx.font = font;
  const layout = layoutText(texte, (s) => ctx.measureText(s).width, PAGE_W - 2 * MARGIN, LINE_H);
  const origin = { x: MARGIN, y: Math.max(110, (PAGE_H - layout.height) / 2) };

  function draw(highlight = -1) {
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, PAGE_W, PAGE_H);
    ctx.font = font;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (const line of layout.lines) {
      for (const word of line.words) {
        const x = origin.x + word.x;
        const y = origin.y + line.y;
        if (word.i === highlight) {
          ctx.fillStyle = HILITE;
          roundRect(ctx, x - 8, y + 8, word.w + 16, LINE_H - 16, 20);
          ctx.fill();
        }
        ctx.fillStyle = INK;
        ctx.fillText(word.text, x, y + LINE_H / 2);
      }
    }
    ctx.font = `32px ${FONT_FAMILY}`;
    ctx.fillStyle = 'rgba(43, 36, 56, 0.4)';
    ctx.textAlign = 'center';
    ctx.fillText(String(number), PAGE_W / 2, PAGE_H - 56);
  }

  draw();
  return { canvas, layout, origin, lineHeight: LINE_H, draw };
}
