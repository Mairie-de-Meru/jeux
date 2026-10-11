// Ardoise de tracé : CanvasTexture 1280x1024 (guide pointillé, lignes d'écriture, flèche du trait attendu,
// traits réussis en couleur, tracé de l'enfant en direct) + cadre 3D + point de départ vert pulsant.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { pathLength } from './logic/trace.js';

const W = 1280;
const H = 1024;
const WORLD_W = 5;
const WORLD_H = 4;
const S = 900; // côté de la boîte du gabarit en pixels
const OX = (W - S) / 2;
const OY = (H - S) / 2;
export const BOARD_CONTENT = { w: 5.8, h: 4.8 };

const DONE_COLORS = ['#2fb67c', '#ff8a3d', '#3b9ae8', '#e8559a', '#8e6cef'];
export const CLAY_COLORS = [0xff5c8a, 0xffb020, 0x35c27b, 0x3b9ae8, 0x8e6cef, 0xff7a45];

const px = (gx, gy) => ({ x: OX + gx * S, y: OY + gy * S });

function pathOf(ctx, pts) {
  ctx.beginPath();
  pts.forEach((p, i) => {
    const q = px(p.x, p.y);
    if (i) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y);
  });
}

// Points d'un trait aux abscisses curvilignes s0 et s1 (en pixels).
function slice(pts, s0, s1) {
  const out = [];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = px(pts[i - 1].x, pts[i - 1].y);
    const b = px(pts[i].x, pts[i].y);
    const l = Math.hypot(b.x - a.x, b.y - a.y);
    for (const s of [s0, s1]) {
      if (l > 0 && s >= acc && s <= acc + l && !out.some((o) => o.s === s)) {
        const t = (s - acc) / l;
        out.push({ s, x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      }
    }
    acc += l;
  }
  return out;
}

export function createBoard(assets) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const base = document.createElement('canvas');
  base.width = W;
  base.height = H;
  const c = base.getContext('2d');

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  const group = new THREE.Group();
  const frameTex = assets && assets.texture('board');
  const frame = new THREE.Mesh(
    new RoundedBoxGeometry(WORLD_W + 0.5, WORLD_H + 0.5, 0.3, 4, 0.14),
    new THREE.MeshStandardMaterial({ color: frameTex ? 0xffffff : 0xe8964a, roughness: 0.7, map: frameTex || null })
  );
  frame.position.z = -0.16;
  frame.castShadow = true;
  frame.receiveShadow = true;
  group.add(frame);

  const surface = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_W, WORLD_H),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.95 })
  );
  surface.receiveShadow = true;
  group.add(surface);

  // Point de départ pulsant (disque vert + anneau blanc)
  const marker = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.17, 32), new THREE.MeshBasicMaterial({ color: 0x2fcf6e }));
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.26, 32), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  ring.position.z = 0.001;
  marker.add(disc, ring);
  marker.position.z = 0.03;
  marker.visible = false;
  group.add(marker);

  let glyph = null;
  let done = [];
  let expected = -1;
  let trail = null;

  function toLocal(gx, gy) {
    const q = px(gx, gy);
    return new THREE.Vector3((q.x / W - 0.5) * WORLD_W, (0.5 - q.y / H) * WORLD_H, 0);
  }

  function drawBase() {
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#f4fbff');
    g.addColorStop(1, '#dcefff');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    if (!glyph) return;
    const lower = /[a-z]/.test(glyph.char);
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.lineWidth = 6;
    const rows = lower
      ? [[0.15, '#cfe3f7', []], [0.45, '#bcd7f2', [14, 14]], [0.85, '#7fb0e6', []]]
      : [[0.15, '#cfe3f7', []], [0.85, '#7fb0e6', []]];
    for (const [gy, col, dash] of rows) {
      c.strokeStyle = col;
      c.setLineDash(dash);
      const y = px(0, gy).y;
      c.beginPath();
      c.moveTo(60, y);
      c.lineTo(W - 60, y);
      c.stroke();
    }
    c.setLineDash([]);
    glyph.strokes.forEach((s, i) => {
      const isDot = pathLength(s) < 0.03;
      const q = px(s[0].x, s[0].y);
      if (done[i]) {
        c.strokeStyle = c.fillStyle = DONE_COLORS[i % DONE_COLORS.length];
        if (isDot) {
          c.beginPath();
          c.arc(q.x, q.y, 28, 0, Math.PI * 2);
          c.fill();
        } else {
          c.lineWidth = 44;
          pathOf(c, s);
          c.stroke();
        }
        return;
      }
      c.strokeStyle = c.fillStyle = '#a9b6c6';
      if (isDot) {
        c.beginPath();
        c.arc(q.x, q.y, 26, 0, Math.PI * 2);
        c.fill();
        return;
      }
      c.lineWidth = 34;
      c.setLineDash([1, 50]);
      pathOf(c, s);
      c.stroke();
      c.setLineDash([]);
    });
    // flèche du trait attendu
    if (expected >= 0 && pathLength(glyph.strokes[expected]) >= 0.03) {
      const L = pathLength(glyph.strokes[expected]) * S;
      const seg = slice(glyph.strokes[expected], Math.min(85, L * 0.2), Math.min(215, L * 0.55));
      if (seg.length >= 2) {
        const a = seg[0];
        const b = seg[seg.length - 1];
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        c.strokeStyle = c.fillStyle = '#ff8a00';
        c.lineWidth = 16;
        c.beginPath();
        c.moveTo(a.x, a.y);
        c.lineTo(b.x, b.y);
        c.stroke();
        c.beginPath();
        c.moveTo(b.x + Math.cos(ang) * 30, b.y + Math.sin(ang) * 30);
        c.lineTo(b.x + Math.cos(ang + 2.4) * 34, b.y + Math.sin(ang + 2.4) * 34);
        c.lineTo(b.x + Math.cos(ang - 2.4) * 34, b.y + Math.sin(ang - 2.4) * 34);
        c.closePath();
        c.fill();
      }
    }
  }

  function redraw() {
    drawBase();
    ctx.drawImage(base, 0, 0);
    if (trail && trail.length) {
      ctx.strokeStyle = ctx.fillStyle = '#ff4f8b';
      ctx.lineWidth = 36;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash([]);
      pathOf(ctx, trail.length === 1 ? [trail[0], { x: trail[0].x + 0.0005, y: trail[0].y }] : trail);
      ctx.stroke();
    }
    texture.needsUpdate = true;
  }

  function updateMarker() {
    if (glyph && expected >= 0) {
      const p = glyph.strokes[expected][0];
      const v = toLocal(p.x, p.y);
      marker.position.set(v.x, v.y, 0.03);
      marker.visible = true;
    } else marker.visible = false;
  }

  return {
    group, surface, frame, toLocal,
    setGlyph(g) {
      glyph = g;
      done = g.strokes.map(() => false);
      expected = 0;
      trail = null;
      updateMarker();
      redraw();
    },
    // Appeler après markDone ; i = -1 si la lettre est complète.
    setExpected(i) { expected = i; updateMarker(); redraw(); },
    markDone(i) { done[i] = true; },
    setTrail(pts) { trail = pts; redraw(); },
    // Intersection (monde) -> coordonnées du gabarit
    toGlyph(worldPoint) {
      const l = surface.worldToLocal(worldPoint.clone());
      const u = l.x / WORLD_W + 0.5;
      const v = l.y / WORLD_H + 0.5;
      return { x: (u * W - OX) / S, y: ((1 - v) * H - OY) / S };
    },
    // Gabarit -> point du monde
    toWorld(gx, gy) { return surface.localToWorld(toLocal(gx, gy)); },
    update(t) {
      if (!marker.visible) return;
      const k = 1 + 0.22 * Math.sin(t * 6);
      marker.scale.set(k, k, 1);
    },
  };
}
