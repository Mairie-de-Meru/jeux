// Habitants du village : PNJ et animaux procéduraux, animés au repos ou en marche.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { HABITANTS, positionHabitant } from '../logic/village.mjs';
import { mesh } from './ville.js';

const G = {
  boule: new THREE.SphereGeometry(1, 16, 12),
  demi: new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
  capsule: new THREE.CapsuleGeometry(1, 1, 4, 8),
  cone: new THREE.ConeGeometry(1, 1, 12),
  tronc: new RoundedBoxGeometry(1, 1, 1, 3, 0.25),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 14),
};
const PEAU = 0xf2c19b, NOIR = 0x2b2b2b;

function piece(geo, couleur, sx, sy, sz, x, y, z) {
  const m = mesh(geo, couleur);
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  return m;
}

// Membre articulé en haut : le pivot est à l'épaule ou à la hanche.
function membre(couleur, r, l, x, y, z) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, z);
  pivot.add(piece(G.capsule, couleur, r, l / 2, r, 0, -l / 2, 0));
  return pivot;
}

function yeux(tete, y, z, ecart, taille = 0.035) {
  for (const s of [-1, 1]) tete.add(piece(G.boule, NOIR, taille, taille, taille, s * ecart, y, z));
}

// Personnage : h = taille totale, options de tenue.
function personne({ h = 1.5, haut, bas, cheveux, jupe = false, tablier = false, toque = false, casquette = false, chignon = false }) {
  const g = new THREE.Group();
  const k = h / 1.5;
  const corps = new THREE.Group();
  corps.scale.setScalar(k);
  g.add(corps);
  const jambes = [-1, 1].map((s) => membre(bas, 0.07, 0.42, s * 0.1, 0.5, 0));
  const bras = [-1, 1].map((s) => membre(haut, 0.06, 0.38, s * 0.24, 1.0, 0));
  corps.add(...jambes, ...bras);
  corps.add(piece(G.tronc, haut, 0.4, 0.5, 0.28, 0, 0.78, 0));
  if (jupe) corps.add(piece(G.cone, bas, 0.26, 0.4, 0.22, 0, 0.55, 0));
  if (tablier) corps.add(piece(G.tronc, 0xffffff, 0.3, 0.5, 0.04, 0, 0.66, 0.15));
  for (const b of bras) b.add(piece(G.boule, PEAU, 0.065, 0.065, 0.065, 0, -0.42, 0));
  const tete = new THREE.Group();
  tete.position.y = 1.24;
  tete.add(piece(G.boule, PEAU, 0.21, 0.22, 0.2, 0, 0, 0));
  tete.add(piece(G.demi, cheveux, 0.225, 0.2, 0.215, 0, 0.02, -0.01));
  yeux(tete, 0.02, 0.18, 0.07);
  tete.add(piece(G.boule, 0xff8787, 0.035, 0.025, 0.02, 0, -0.08, 0.185));
  if (toque) {
    tete.add(piece(G.cyl, 0xffffff, 0.17, 0.18, 0.17, 0, 0.26, 0));
    tete.add(piece(G.boule, 0xffffff, 0.22, 0.12, 0.22, 0, 0.38, 0));
  }
  if (casquette) {
    tete.add(piece(G.demi, 0xe03131, 0.23, 0.14, 0.23, 0, 0.09, 0));
    tete.add(piece(G.cyl, 0xe03131, 0.14, 0.015, 0.12, 0, 0.1, 0.2));
  }
  if (chignon) tete.add(piece(G.boule, cheveux, 0.1, 0.1, 0.1, 0, 0.2, -0.12));
  corps.add(tete);
  g.userData = { jambes, bras, tete, corps };
  return g;
}

function chien() {
  const g = new THREE.Group();
  const c = 0xc68642, fonce = 0x7f4f24;
  g.add(piece(G.capsule, c, 0.13, 0.18, 0.13, 0, 0.32, 0).rotateX(Math.PI / 2));
  const jambes = [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([sx, sz]) => {
    const j = membre(c, 0.045, 0.2, sx * 0.08, 0.24, sz * 0.13);
    return j;
  });
  g.add(...jambes);
  const tete = new THREE.Group();
  tete.position.set(0, 0.5, 0.25);
  tete.add(piece(G.boule, c, 0.13, 0.12, 0.13, 0, 0, 0));
  tete.add(piece(G.boule, 0xf1d3a6, 0.07, 0.06, 0.08, 0, -0.03, 0.12));
  tete.add(piece(G.boule, NOIR, 0.03, 0.025, 0.025, 0, 0, 0.2));
  for (const s of [-1, 1]) tete.add(piece(G.boule, fonce, 0.04, 0.1, 0.06, s * 0.12, -0.02, -0.01));
  yeux(tete, 0.04, 0.11, 0.055, 0.025);
  g.add(tete);
  const queue = new THREE.Group();
  queue.position.set(0, 0.38, -0.27);
  queue.add(piece(G.capsule, fonce, 0.025, 0.08, 0.025, 0, 0.08, -0.03).rotateX(-0.5));
  g.add(queue);
  g.userData = { jambes, tete, queue };
  return g;
}

function chat() {
  const g = new THREE.Group();
  const c = 0xff922b, clair = 0xfff4e6;
  g.add(piece(G.boule, c, 0.13, 0.15, 0.14, 0, 0.15, -0.03));
  g.add(piece(G.boule, clair, 0.08, 0.1, 0.05, 0, 0.17, 0.08));
  for (const s of [-1, 1]) g.add(piece(G.capsule, c, 0.035, 0.04, 0.035, s * 0.06, 0.05, 0.1));
  const tete = new THREE.Group();
  tete.position.set(0, 0.36, 0.03);
  tete.add(piece(G.boule, c, 0.11, 0.1, 0.1, 0, 0, 0));
  for (const s of [-1, 1]) tete.add(piece(G.cone, c, 0.04, 0.08, 0.03, s * 0.065, 0.1, 0).rotateZ(-s * 0.3));
  tete.add(piece(G.boule, 0xff8fab, 0.018, 0.014, 0.012, 0, -0.01, 0.1));
  yeux(tete, 0.02, 0.085, 0.04, 0.02);
  g.add(tete);
  const queue = new THREE.Group();
  queue.position.set(0, 0.05, -0.14);
  queue.add(piece(G.capsule, c, 0.025, 0.12, 0.025, 0, 0.13, -0.04).rotateX(-0.3));
  g.add(queue);
  g.userData = { tete, queue };
  return g;
}

function canard() {
  const g = new THREE.Group();
  g.add(piece(G.boule, 0xffe066, 0.12, 0.09, 0.16, 0, 0.05, 0));
  g.add(piece(G.cone, 0xffe066, 0.05, 0.08, 0.05, 0, 0.1, -0.15).rotateX(-1.1));
  const tete = new THREE.Group();
  tete.position.set(0, 0.2, 0.09);
  tete.add(piece(G.boule, 0xffe066, 0.07, 0.07, 0.07, 0, 0, 0));
  tete.add(piece(G.boule, 0xff922b, 0.035, 0.015, 0.05, 0, -0.01, 0.07));
  yeux(tete, 0.02, 0.055, 0.04, 0.012);
  g.add(tete);
  g.userData = { tete };
  return g;
}

const FABRIQUES = {
  boulangere: () => personne({ haut: 0xf783ac, bas: 0x845ef7, cheveux: 0x6d3b1d, jupe: true, tablier: true, toque: true }),
  enfant: () => personne({ h: 1.05, haut: 0x40c057, bas: 0x1c7ed6, cheveux: 0xffd43b, casquette: true }),
  grandmere: () => personne({ haut: 0x9775fa, bas: 0x5c7cfa, cheveux: 0xdee2e6, jupe: true, chignon: true }),
  chien, chat, canard,
};

export function creerHabitants() {
  const groupe = new THREE.Group();
  const liste = HABITANTS.map((h, i) => {
    const o = FABRIQUES[h.type]();
    o.userData.def = h;
    o.userData.decalage = i * 1.7;
    if (h.type === 'grandmere') {
      // assise sur le banc : jambes à l'horizontale, un peu plus bas
      o.userData.corps.position.y = -0.18;
      o.userData.jambes.forEach((j) => { j.rotation.x = -1.4; });
    }
    groupe.add(o);
    return o;
  });
  function maj(t) {
    for (const o of liste) {
      const { def, decalage, jambes, bras, tete, queue, corps } = o.userData;
      const p = positionHabitant(def, t);
      o.position.set(p.x, def.type === 'canard' ? 0.03 : 0, p.z);
      o.rotation.y = p.rot;
      const pas = t * (def.type === 'chien' ? 11 : 7) + decalage;
      if (p.marche && jambes) jambes.forEach((j, n) => { j.rotation.x = Math.sin(pas + (n % 2 ? Math.PI : 0) + (n > 1 ? Math.PI : 0)) * 0.5; });
      if (p.marche && bras) bras.forEach((b, n) => { b.rotation.x = Math.sin(pas + (n ? 0 : Math.PI)) * 0.4; });
      if (p.marche && corps) corps.position.y = Math.abs(Math.sin(pas)) * 0.04;
      if (def.type === 'grandmere') {
        // tricote : les mains bougent devant elle
        bras.forEach((b, n) => { b.rotation.x = -0.9 + Math.sin(t * 6 + n * Math.PI) * 0.12; });
        tete.rotation.z = Math.sin(t * 0.7) * 0.08;
      }
      if (def.type === 'chien') queue.rotation.z = Math.sin(t * 14) * 0.6;
      if (def.type === 'chat') {
        queue.rotation.z = Math.sin(t * 1.6) * 0.5;
        tete.rotation.y = Math.sin(t * 0.5 + 1) * 0.5;
      }
      if (def.type === 'canard') {
        o.position.y += Math.sin(t * 2 + decalage) * 0.015;
        tete.rotation.x = Math.max(0, Math.sin(t * 0.6 + decalage)) ** 8 * 0.9; // plonge le bec de temps en temps
      }
    }
  }
  return { groupe, maj };
}
