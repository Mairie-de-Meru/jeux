// Atelier : canvas couleur (dessous) + canvas trait (dessus), 1200x768 (coloriages 4:3 centrés), mis à l'échelle en CSS.
import { regionMask, growMask, colorMask, applyMask } from '../logic/floodfill.js';
import { createHistory } from '../logic/history.js';
import { getBrush, interpolate, rainbowHue, sparkles, mulberry32 } from '../logic/brushes.js';
import { starPoints, heartPoints } from '../logic/stamps.js';
import { PALETTE } from '../logic/palette.js';

export const W = 1200;
export const H = 768;

export function createEditor(host, { sound = null, onChange = () => {} } = {}) {
  const sheet = document.createElement('div');
  sheet.className = 'sheet';
  const colorCanvas = document.createElement('canvas');
  const lineCanvas = document.createElement('canvas');
  for (const c of [colorCanvas, lineCanvas]) { c.width = W; c.height = H; sheet.appendChild(c); }
  host.appendChild(sheet);
  const cctx = colorCanvas.getContext('2d', { willReadFrequently: true });
  const lctx = lineCanvas.getContext('2d', { willReadFrequently: true });

  const history = createHistory(30);
  const rng = mulberry32(2024);
  let mode = 'coloriage';
  let tool = 'pot';
  let colorIndex = 0;
  let linePixels = null; // RGBA de la couche trait (null en dessin libre)
  let pointerId = null;
  let stroke = null;
  let lockUntil = 0;

  function fillWhite() { cctx.globalAlpha = 1; cctx.fillStyle = '#fff'; cctx.fillRect(0, 0, W, H); }
  fillWhite();

  const grab = () => new Uint8ClampedArray(cctx.getImageData(0, 0, W, H).data);
  const put = (arr) => cctx.putImageData(new ImageData(new Uint8ClampedArray(arr), W, H), 0, 0);
  const notify = () => onChange({ canUndo: history.canUndo(), canRedo: history.canRedo() });
  const color = () => PALETTE[colorIndex];

  function fit() {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    const s = Math.min((w - 32) / W, (h - 32) / H);
    sheet.style.width = `${Math.floor(W * s)}px`;
    sheet.style.height = `${Math.floor(H * s)}px`;
  }
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(fit).observe(host);
  window.addEventListener('resize', fit);

  function newSheet(m) {
    mode = m;
    history.clear();
    fillWhite();
    lctx.clearRect(0, 0, W, H);
    linePixels = null;
    notify();
    fit();
  }

  /** Charge un dessin au trait : drawFn(ctx, W, H) dessine en noir sur le fond que l'on a rendu blanc. */
  function loadLine(drawFn) {
    newSheet('coloriage');
    // le dessin reste en 4:3 (1024x768), centré sur la feuille sans déformation
    const BW = 1024, ox = Math.round((W - BW) / 2);
    const tmp = document.createElement('canvas');
    tmp.width = W; tmp.height = H;
    const t = tmp.getContext('2d', { willReadFrequently: true });
    t.fillStyle = '#fff'; t.fillRect(0, 0, W, H);
    t.save(); t.translate(ox, 0); t.beginPath(); t.rect(0, 0, BW, H); t.clip();
    drawFn(t, BW, H);
    t.restore();
    const src = t.getImageData(0, 0, W, H);
    const out = lctx.createImageData(W, H);
    const s = src.data, d = out.data;
    for (let i = 0; i < s.length; i += 4) {
      const lum = 0.299 * s[i] + 0.587 * s[i + 1] + 0.114 * s[i + 2];
      d[i + 3] = Math.max(0, Math.min(255, Math.round(255 - lum))); // blanc -> transparent, noir -> opaque
    }
    lctx.putImageData(out, 0, 0);
    linePixels = d;
    tool = 'pot';
  }

  function freeDraw() { newSheet('libre'); tool = 'gros'; }

  // --- retour visuel
  function ripple(x, y, good = true) {
    const r = document.createElement('div');
    r.className = good ? 'ripple' : 'ripple bad';
    r.style.left = `${(x / W) * 100}%`;
    r.style.top = `${(y / H) * 100}%`;
    r.style.background = good ? color().hex : '#ff3b30';
    sheet.appendChild(r);
    setTimeout(() => r.remove(), 600);
  }

  // --- outils
  function polygon(pts, hex) {
    cctx.globalAlpha = 1;
    cctx.fillStyle = hex;
    cctx.beginPath();
    pts.forEach((p, i) => (i ? cctx.lineTo(p.x, p.y) : cctx.moveTo(p.x, p.y)));
    cctx.closePath();
    cctx.fill();
  }

  function bucket(x, y) {
    const pixels = grab();
    let mask;
    if (linePixels) {
      mask = regionMask(linePixels, W, H, x, y);
      if (!mask.some((v) => v)) { sound && sound.oops(); ripple(x, y, false); return false; }
      mask = growMask(mask, linePixels, W, H, 2);
    } else {
      mask = colorMask(pixels, W, H, x, y, { tolerance: 32 });
    }
    const before = new Uint8ClampedArray(pixels);
    const n = applyMask(pixels, mask, color().rgba);
    if (!n) { ripple(x, y); return false; }
    history.push(before);
    put(pixels);
    notify();
    sound && sound.paint();
    ripple(x, y);
    return true;
  }

  function stamp(x, y, kind) {
    history.push(grab());
    const pts = kind === 'etoile' ? starPoints(x, y, 72) : heartPoints(x, y, 64);
    polygon(pts, color().hex);
    notify();
    sound && sound.stamp();
    ripple(x, y);
  }

  function dab(brush, x, y, dist) {
    const isErase = brush.kind === 'erase';
    cctx.globalAlpha = 1;
    if (brush.kind === 'sparkle') {
      for (const s of sparkles(rng, x, y, 26, 3)) {
        polygon(starPoints(s.x, s.y, s.size + 3, 4, 0.4), `hsl(${s.hue} 95% 60%)`);
      }
      polygon(starPoints(x, y, 6, 4, 0.4), color().hex);
      return;
    }
    cctx.fillStyle = isErase ? '#fff' : brush.kind === 'rainbow' ? `hsl(${rainbowHue(dist)} 95% 55%)` : color().hex;
    cctx.beginPath();
    cctx.arc(x, y, brush.size / 2, 0, Math.PI * 2);
    cctx.fill();
  }

  function redrawMarker(brush) {
    put(stroke.before);
    cctx.globalAlpha = brush.alpha;
    cctx.strokeStyle = color().hex;
    cctx.lineWidth = brush.size;
    cctx.lineCap = 'round'; cctx.lineJoin = 'round';
    cctx.beginPath();
    stroke.pts.forEach((p, i) => (i ? cctx.lineTo(p.x, p.y) : cctx.moveTo(p.x, p.y)));
    if (stroke.pts.length === 1) cctx.lineTo(stroke.pts[0].x + 0.01, stroke.pts[0].y);
    cctx.stroke();
    cctx.globalAlpha = 1;
  }

  // --- événements (coordonnées feuille)
  function down(x, y) {
    if (tool === 'pot') { bucket(x, y); return; }
    if (tool === 'etoile' || tool === 'coeur') { stamp(x, y, tool); return; }
    const brush = getBrush(tool);
    if (!brush) return;
    const before = grab();
    history.push(before);
    stroke = { brush, before, last: { x, y }, pts: [{ x, y }], dist: 0 };
    if (brush.kind === 'marker') redrawMarker(brush); else dab(brush, x, y, 0);
    notify();
    sound && (brush.kind === 'erase' ? sound.erase() : sound.brush());
  }
  function move(x, y) {
    if (!stroke) return;
    const b = stroke.brush;
    const spacing = Math.max(2, b.size / (b.kind === 'sparkle' ? 1.2 : 4));
    const pts = interpolate(stroke.last, { x, y }, spacing);
    if (!pts.length) return;
    for (const p of pts) {
      stroke.dist += spacing;
      stroke.pts.push(p);
      if (b.kind !== 'marker') dab(b, p.x, p.y, stroke.dist);
    }
    stroke.last = pts[pts.length - 1];
    if (b.kind === 'marker') redrawMarker(b);
  }
  function up() { stroke = null; }

  function toSheet(e) {
    const r = lineCanvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height };
  }
  sheet.addEventListener('pointerdown', (e) => {
    if (pointerId !== null || performance.now() < lockUntil) return;
    pointerId = e.pointerId;
    try { sheet.setPointerCapture(e.pointerId); } catch (err) { /* ignoré */ }
    sound && sound.unlock();
    const p = toSheet(e);
    down(p.x, p.y);
    e.preventDefault();
  });
  sheet.addEventListener('pointermove', (e) => {
    if (e.pointerId !== pointerId) return;
    const p = toSheet(e);
    move(p.x, p.y);
  });
  const end = (e) => { if (e.pointerId === pointerId) { pointerId = null; up(); } };
  sheet.addEventListener('pointerup', end);
  sheet.addEventListener('pointercancel', end);

  function undo() {
    const prev = history.undo(grab());
    if (!prev) return false;
    put(prev); notify(); sound && sound.undo();
    return true;
  }
  function redo() {
    const next = history.redo(grab());
    if (!next) return false;
    put(next); notify(); sound && sound.redo();
    return true;
  }

  /** Fusion couleur + trait à la taille voulue. */
  function merged(w = W, h = H) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, w, h);
    x.drawImage(colorCanvas, 0, 0, w, h);
    x.drawImage(lineCanvas, 0, 0, w, h);
    return c;
  }
  function exportPNG() {
    const a = document.createElement('a');
    a.href = merged().toDataURL('image/png');
    a.download = 'mon-dessin.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    sound && sound.success();
  }

  function clear() {
    history.push(grab());
    fillWhite();
    notify();
    sound && sound.whoosh();
    sheet.classList.remove('squash');
    void sheet.offsetWidth;
    sheet.classList.add('squash');
    setTimeout(() => sheet.classList.remove('squash'), 600);
    return true;
  }

  /** PNG pleine taille de la couche couleur (coloriage) ou de la feuille (libre). */
  function snapshotSource() { return colorCanvas.toDataURL('image/png'); }
  /** Charge une image dans la couche couleur, réinitialise l'historique. */
  function loadSource(dataUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        fillWhite();
        if (img.naturalWidth === W) cctx.drawImage(img, 0, 0, W, H);
        else cctx.drawImage(img, Math.round((W - img.naturalWidth) / 2), Math.round((H - img.naturalHeight) / 2), img.naturalWidth, img.naturalHeight); // ancien 1024x768 : centré
        history.clear();
        notify();
        resolve(true);
      };
      img.onerror = () => resolve(false);
      img.src = dataUrl;
    });
  }

  return {
    clear, snapshotSource, loadSource,
    lock(ms = 400) { lockUntil = performance.now() + ms; pointerId = null; stroke = null; },
    sheet, fit, loadLine, freeDraw, undo, redo, merged, exportPNG,
    thumbnail: () => merged(600, 384).toDataURL('image/png'),
    setTool(id) { tool = id; sound && sound.tap(); },
    setColor(i) { if (i >= 0 && i < PALETTE.length) colorIndex = i; sound && sound.tap(); },
    getTool: () => tool,
    getColor: () => colorIndex,
    getMode: () => mode,
    canUndo: () => history.canUndo(),
    canRedo: () => history.canRedo(),
    pixel(x, y) { return Array.from(cctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data); },
    tap(x, y) { down(x, y); up(); },
    stroke(points) {
      if (!points.length) return;
      down(points[0][0], points[0][1]);
      for (const p of points.slice(1)) move(p[0], p[1]);
      up();
    },
  };
}
