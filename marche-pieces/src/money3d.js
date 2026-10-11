// Modèles 3D des pièces et billets. Une géométrie/texture/matériau par valeur, partagés.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { DENOMINATIONS, denomination } from './money.js';

const K = 1.5; // échelle globale (pièces plus grosses pour les enfants)
const DIAMETER = { 1: 0.7 * K, 2: 0.78 * K, 5: 0.86 * K, 10: 0.94 * K, 20: 1.02 * K, 50: 1.1 * K, 100: 1.18 * K, 200: 1.28 * K };
const BILL_SIZE = { 500: [2.0 * K, 1.0 * K], 1000: [2.2 * K, 1.1 * K] };
const COIN_H = 0.12 * K;
const BILL_H = 0.05 * K;

const COLORS = { copper: 0xc9733a, gold: 0xe8b830, silver: 0xd5dae0 };
const TEXT = { copper: '#3d1500', gold: '#3d2800', silver: '#1f2630' };

const cache = new Map();

function labelTexture(label, textColor, w = 256, h = 256, bg = null) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
  g.fillStyle = textColor;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `900 ${label.length > 3 ? 120 : 150}px ui-rounded, "Arial Rounded MT Bold", system-ui, sans-serif`;
  g.lineJoin = 'round';
  g.lineWidth = 14;
  g.strokeStyle = 'rgba(255,255,255,0.75)';
  g.strokeText(label, w / 2, h / 2 + 6);
  g.fillText(label, w / 2, h / 2 + 6);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function billTexture(label, base, edge, w = 512, h = 256) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  g.strokeStyle = edge; g.lineWidth = 14; g.strokeRect(14, 14, w - 28, h - 28);
  g.fillStyle = edge; g.globalAlpha = 0.25;
  g.beginPath(); g.arc(w * 0.18, h / 2, 62, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(w * 0.82, h / 2, 62, 0, Math.PI * 2); g.fill();
  g.globalAlpha = 1;
  g.fillStyle = '#ffffff';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = 'bold 130px ui-rounded, "Arial Rounded MT Bold", system-ui, sans-serif';
  g.fillText(label, w / 2, h / 2 + 8);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function mat(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.55 });
}

function build(value) {
  const d = denomination(value);
  if (d.kind === 'bill') {
    const [w, depth] = BILL_SIZE[value];
    const body = new THREE.MeshStandardMaterial({ color: value === 500 ? 0x6f8fb0 : 0xe25a78, roughness: 0.7 });
    const tex = billTexture(d.label, value === 500 ? '#6f8fb0' : '#e25a78', value === 500 ? '#3d5a78' : '#a82b49');
    return {
      kind: 'bill', h: BILL_H,
      parts: [
        { geo: new RoundedBoxGeometry(w, BILL_H, depth, 3, 0.06), mat: body, y: BILL_H / 2 },
        { geo: new THREE.PlaneGeometry(w * 0.96, depth * 0.94).rotateX(-Math.PI / 2), mat: new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }), y: BILL_H + 0.003, deco: true },
      ],
    };
  }
  const r = DIAMETER[value] / 2;
  const bimetal = value === 100 ? ['silver', 'gold'] : value === 200 ? ['gold', 'silver'] : null; // [centre, anneau]
  const metal = value <= 5 ? 'copper' : 'gold';
  const parts = [];
  if (bimetal) {
    const [centre, ring] = bimetal;
    parts.push({ geo: new THREE.CylinderGeometry(r, r, COIN_H, 40), mat: mat(COLORS[ring]), y: COIN_H / 2 });
    parts.push({ geo: new THREE.CylinderGeometry(r * 0.64, r * 0.64, COIN_H + 0.006, 40), mat: mat(COLORS[centre]), y: COIN_H / 2 });
    parts.push({ geo: new THREE.CircleGeometry(r * 0.64, 40).rotateX(-Math.PI / 2), mat: new THREE.MeshBasicMaterial({ map: labelTexture(d.label, TEXT[centre]), transparent: true }), y: COIN_H + 0.008, deco: true });
  } else {
    parts.push({ geo: new THREE.CylinderGeometry(r, r, COIN_H, 40), mat: mat(COLORS[metal]), y: COIN_H / 2 });
    parts.push({ geo: new THREE.CircleGeometry(r * 0.86, 40).rotateX(-Math.PI / 2), mat: new THREE.MeshBasicMaterial({ map: labelTexture(d.label, TEXT[metal]), transparent: true }), y: COIN_H + 0.004, deco: true });
  }
  return { kind: 'coin', h: COIN_H, parts };
}

function spec(value) {
  if (!cache.has(value)) cache.set(value, build(value));
  return cache.get(value);
}

// Crée un groupe (origine au pied de la pièce). Géométries et matériaux partagés.
export function makeMoney(value) {
  const s = spec(value);
  const g = new THREE.Group();
  for (const p of s.parts) {
    const m = new THREE.Mesh(p.geo, p.mat);
    m.position.y = p.y;
    if (!p.deco) { m.castShadow = true; m.receiveShadow = true; }
    g.add(m);
  }
  g.userData.value = value;
  g.userData.kind = s.kind;
  g.userData.height = s.h;
  return g;
}

export function moneyWidth(value) {
  return value >= 500 ? BILL_SIZE[value][0] : DIAMETER[value];
}

export const VALUES_3D = DENOMINATIONS.map((d) => d.value);
