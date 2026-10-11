// Tuiles 3D arrondies (RoundedBoxGeometry) avec texture lettre / mot / ponctuation, bacs et emplacements.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { getGlyph } from './logic/glyphs.js';

export const TILE_COLORS = [0xff5c8a, 0xffb020, 0x35c27b, 0x3b9ae8, 0x8e6cef, 0xff7a45, 0x19b5c8];
const FONT = '"Arial Rounded MT Bold", "Nunito", ui-rounded, "Helvetica Neue", Arial, sans-serif';
const PPU = 160; // pixels de texture par unité de monde
const D = 0.36;

const geoCache = new Map();
const texCache = new Map();

function geo(w, h, d = D) {
  const k = `${w.toFixed(3)}x${h.toFixed(3)}x${d}`;
  if (!geoCache.has(k)) {
    const g = new RoundedBoxGeometry(w, h, d, 4, Math.min(0.16, Math.min(w, h) / 4));
    g.userData.shared = true;
    geoCache.set(k, g);
  }
  return geoCache.get(k);
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function cached(key, w, h, draw) {
  if (texCache.has(key)) return texCache.get(key);
  const cv = document.createElement('canvas');
  cv.width = Math.max(8, Math.round(w * PPU));
  cv.height = Math.max(8, Math.round(h * PPU));
  const c = cv.getContext('2d');
  c.fillStyle = '#ffffff';
  roundRect(c, 4, 4, cv.width - 8, cv.height - 8, cv.height * 0.18);
  c.fill();
  draw(c, cv.width, cv.height);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.userData.shared = true;
  texCache.set(key, t);
  return t;
}

const INK = '#2b3a67';

function drawText(c, text, w, h, size) {
  c.fillStyle = INK;
  c.font = `bold ${size}px ${FONT}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(text, w / 2, h / 2 + size * 0.06);
}

// Lettre dessinée sur un canvas (utilisable pour l'UI) : caps/script en police, cursive en gabarit.
export function drawLetter(c, style, letter, w, h) {
  if (style === 'cursive') {
    const g = getGlyph('cursive', letter);
    const s = Math.min(w, h) * 0.8;
    const ox = (w - s) / 2;
    const oy = (h - s) / 2;
    c.strokeStyle = INK;
    c.fillStyle = INK;
    c.lineWidth = s * 0.075;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    for (const st of g.strokes) {
      c.beginPath();
      st.forEach((p, i) => (i ? c.lineTo(ox + p.x * s, oy + p.y * s) : c.moveTo(ox + p.x * s, oy + p.y * s)));
      c.stroke();
    }
    return;
  }
  const text = style === 'caps' ? letter.toUpperCase() : letter.toLowerCase();
  drawText(c, text, w, h, Math.min(w, h) * 0.66);
}

export function measureWord(text) {
  const c = document.createElement('canvas').getContext('2d');
  c.font = `bold ${Math.round(0.56 * PPU)}px ${FONT}`;
  return c.measureText(text).width / PPU;
}

export function wordWidth(text) {
  return Math.max(1.5, measureWord(text) + 0.7);
}

function faceFor(spec) {
  switch (spec.kind) {
    case 'letter':
      return cached(`L|${spec.style}|${spec.letter}`, 1.4, 1.4, (c, w, h) => drawLetter(c, spec.style, spec.letter, w, h));
    case 'word': {
      const w = spec.w - 0.2;
      return cached(`W|${spec.text}|${spec.w.toFixed(2)}`, w, 1.0, (c, cw, ch) => drawText(c, spec.text, cw, ch, 0.56 * PPU));
    }
    case 'punct':
      return cached(`P|${spec.text}`, 1.0, 1.0, (c, w, h) => drawText(c, spec.text, w, h, h * 0.9));
    case 'bin':
      return cached(`B|${spec.text}`, spec.w - 0.3, spec.h - 0.3, (c, w, h) => drawText(c, spec.text, w, h, h * 0.5));
    default:
      return null;
  }
}

export function tileSize(spec) {
  switch (spec.kind) {
    case 'letter': return { w: 1.6, h: 1.6 };
    case 'word': return { w: spec.w, h: 1.2 };
    case 'punct': return { w: 1.2, h: 1.2 };
    case 'bin': return { w: spec.w, h: spec.h };
    case 'slot': return { w: spec.w, h: spec.h || 1.3 };
    default: return { w: 1.5, h: 1.5 };
  }
}

// Crée une tuile : Group { body, face } ; userData.spec contient la description.
export function makeTile(spec) {
  const { w, h } = tileSize(spec);
  const isSlot = spec.kind === 'slot';
  const color = spec.color ?? TILE_COLORS[0];
  const body = new THREE.Mesh(
    geo(w, h, isSlot ? 0.12 : D),
    new THREE.MeshStandardMaterial({ color: isSlot ? 0xc9dcf2 : color, roughness: 0.55, emissive: 0x000000 })
  );
  body.castShadow = !isSlot;
  body.receiveShadow = true;
  const g = new THREE.Group();
  g.add(body);
  let face = null;
  const tex = faceFor(spec);
  if (tex) {
    face = new THREE.Mesh(
      new THREE.PlaneGeometry(spec.kind === 'bin' ? w - 0.3 : spec.kind === 'word' ? w - 0.2 : 1.4, spec.kind === 'bin' ? h - 0.3 : spec.kind === 'word' ? 1.0 : spec.kind === 'punct' ? 1.0 : 1.4),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true })
    );
    face.position.z = D / 2 + 0.004;
    face.material.userData.shared = false;
    g.add(face);
  }
  g.userData = { spec, w, h, body, face, selected: false, root: g };
  body.userData.root = g;
  if (face) face.userData.root = g;
  return g;
}

export function retexture(tile, spec) {
  tile.userData.spec = spec;
  const tex = faceFor(spec);
  if (tile.userData.face && tex) {
    tile.userData.face.material.map = tex;
    tile.userData.face.material.needsUpdate = true;
  }
}

export function setSelected(tile, on) {
  tile.userData.selected = on;
  tile.userData.body.material.emissive.setHex(on ? 0x554400 : 0x000000);
  tile.position.z = on ? 0.5 : 0;
  tile.scale.setScalar(on ? 1.08 : 1);
}

// Objet touché -> tuile racine (ou null)
export function tileFromHit(hit) {
  let o = hit.object;
  while (o && !o.userData.root) o = o.parent;
  return o ? o.userData.root : null;
}
