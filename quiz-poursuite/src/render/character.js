// Petit personnage (corps capsule, deux yeux, deux bras), d'après le jeu « tour d'équilibre ».
import * as THREE from 'three';

export const CHARACTERS = [
  { nom: 'Rosie', couleur: '#ff6bb5' },
  { nom: 'Turquo', couleur: '#4dd0e1' },
  { nom: 'Lila', couleur: '#b388ff' },
  { nom: 'Mango', couleur: '#ffa64d' },
  { nom: 'Pistache', couleur: '#6ad36a' },
  { nom: 'Citron', couleur: '#ffd84d' },
];
export const BOT_NAMES = ['Robo', 'Bip', 'Bulle'];
export const BOT_COLOR = '#b0bec5';

// Géométries et matériaux partagés
const geo = {
  body: new THREE.CapsuleGeometry(0.26, 0.4, 6, 14),
  eye: new THREE.SphereGeometry(0.075, 10, 8),
  pupil: new THREE.SphereGeometry(0.035, 8, 6),
  arm: new THREE.CapsuleGeometry(0.07, 0.22, 4, 8),
  rod: new THREE.CylinderGeometry(0.018, 0.018, 0.2, 6),
  ball: new THREE.SphereGeometry(0.055, 10, 8),
};
const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
const pupilMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
const rodMat = new THREE.MeshStandardMaterial({ color: 0x78909c, roughness: 0.5 });
const ballMat = new THREE.MeshStandardMaterial({ color: 0xff3b3b, roughness: 0.4 });
const mats = new Map();
function std(color) {
  const k = String(color);
  if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color, roughness: 0.4 }));
  return mats.get(k);
}
function shadowed(m) { m.castShadow = true; return m; }

export function makeCharacter(color, { bot = false } = {}) {
  const c = new THREE.Group();
  const bodyMat = std(color || BOT_COLOR);
  const body = shadowed(new THREE.Mesh(geo.body, bodyMat));
  body.position.y = 0.46;
  c.add(body);
  for (const sx of [-1, 1]) {
    const e = new THREE.Mesh(geo.eye, eyeMat);
    e.position.set(sx * 0.1, 0.62, 0.22);
    const p = new THREE.Mesh(geo.pupil, pupilMat);
    p.position.set(sx * 0.1, 0.62, 0.285);
    c.add(e, p);
  }
  const arms = [];
  for (const sx of [-1, 1]) {
    const a = new THREE.Group();
    a.position.set(sx * 0.3, 0.5, 0);
    const m = shadowed(new THREE.Mesh(geo.arm, bodyMat));
    m.position.y = -0.17;
    a.add(m);
    a.userData.side = sx;
    c.add(a);
    arms.push(a);
  }
  if (bot) {
    const rod = new THREE.Mesh(geo.rod, rodMat);
    rod.position.y = 1.0;
    const ball = new THREE.Mesh(geo.ball, ballMat);
    ball.position.y = 1.13;
    c.add(rod, ball);
  }
  c.userData.arms = arms;
  c.userData.body = body;
  return c;
}

function pose(ch, { bodyY = 0, bodyRot = 0, armL = 0, armR = 0, armSwing = 0 } = {}) {
  const [l, r] = ch.userData.arms;
  ch.userData.body.position.y = 0.46 + bodyY;
  ch.rotation.z = bodyRot;
  // bras gauche (-1) et droit (+1) : rotation z positive = bras levé vers l'extérieur côté gauche
  l.rotation.z = -(0.15 + armL) - armSwing;
  r.rotation.z = (0.15 + armR) + armSwing;
  l.position.y = r.position.y = 0.5 + bodyY;
}

// Léger balancement du corps et des bras
export function idle(ch, t) {
  pose(ch, { bodyY: 0.015 * Math.sin(t * 3), bodyRot: 0.05 * Math.sin(t * 2), armSwing: 0.15 * Math.sin(t * 3) });
}
// Sauts de joie, bras levés (le groupe entier monte, ch.position.y est géré par l'appelant via baseY)
export function cheer(ch, t, baseY = 0) {
  const j = Math.abs(Math.sin(t * 6));
  ch.position.y = baseY + 0.35 * j;
  pose(ch, { bodyRot: 0.08 * Math.sin(t * 6), armL: 2.6 + 0.3 * Math.sin(t * 12), armR: 2.6 - 0.3 * Math.sin(t * 12) });
}
// Pendant un saut de case en case : k de 0 à 1, bras qui se lèvent en vol
export function hop(ch, k) {
  const up = Math.sin(Math.PI * k);
  pose(ch, { armL: 1.8 * up, armR: 1.8 * up });
}
// Position de repos
export function rest(ch) { pose(ch); }
