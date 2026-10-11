// Géométries partagées : une par type de pièce (corps + tenons fusionnés), centrée sur l'empreinte,
// bas à y=0. L'unité du monde est la case ; une plaque de hauteur = PLATE.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PIECES } from '../logic/pieces.js';

export const PLATE = 0.4;
export const STUD_R = 0.3;
export const STUD_H = 0.2;
const GAP = 0.04;
const flat = (g) => (g.index ? g.toNonIndexed() : g);

let studGeo = null;
export function studGeometry() {
  if (!studGeo) studGeo = new THREE.CylinderGeometry(STUD_R, STUD_R, STUD_H, 14);
  return studGeo;
}

function studAt(x, y, z) {
  const g = studGeometry().clone();
  g.translate(x, y, z);
  return flat(g);
}

function brickBody(w, h, d) {
  const g = new RoundedBoxGeometry(w - GAP, h, d - GAP, 2, 0.09);
  g.translate(0, h / 2, 0);
  return flat(g);
}

function roofBody(w, h, d) {
  // Profil dans le plan (z,y) : haut au bord z=0, la pente descend vers z=d.
  const low = h * 0.34;
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(d - GAP, 0);
  s.lineTo(d - GAP, low);
  s.lineTo(1, h);
  s.lineTo(0, h);
  s.lineTo(0, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: w - GAP, bevelEnabled: false });
  // (sx,sy,sz) → (X=-sz, Y=sy, Z=sx) : rotation propre, puis recentrage.
  g.applyMatrix4(new THREE.Matrix4().set(0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1));
  g.translate((w - GAP) / 2, 0, -d / 2 + GAP / 2);
  g.deleteAttribute('uv');
  return flat(g);
}

const cache = new Map();

export function pieceGeometry(type) {
  let g = cache.get(type);
  if (g) return g;
  const p = PIECES[type];
  const h = p.h * PLATE;
  const parts = [];
  if (p.kind === 'roof') {
    parts.push(roofBody(p.w, h, p.d));
    if (p.studs) {
      for (let i = 0; i < p.w; i++) parts.push(studAt(-p.w / 2 + i + 0.5, h + STUD_H / 2, -p.d / 2 + 0.5));
    }
  } else {
    parts.push(brickBody(p.w, h, p.d));
    if (p.studs) {
      for (let i = 0; i < p.w; i++) for (let j = 0; j < p.d; j++) {
        parts.push(studAt(-p.w / 2 + i + 0.5, h + STUD_H / 2, -p.d / 2 + j + 0.5));
      }
    }
  }
  for (const part of parts) {
    if (part.attributes.uv) part.deleteAttribute('uv');
  }
  g = mergeGeometries(parts, false);
  g.computeBoundingSphere();
  cache.set(type, g);
  return g;
}
