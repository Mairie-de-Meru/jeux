// Construction de la petite ville : sol, maisons, arbres, détective. Géométries partagées.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { VILLAGE, ARBRES_VILLAGE } from '../logic/village.mjs';

export const MAISONS = [
  { enquete: 'fautes', couleur: 0xff6b6b, toit: 0x7b3fe4, emoji: '✏️', titre: 'Fautes', icone: 'icone-fautes.png', pos: [-4.4, 0, -1.6], rot: 0.5 },
  { enquete: 'pronoms', couleur: 0x4dabf7, toit: 0xff922b, emoji: '👤', titre: 'Pronoms', icone: 'icone-pronoms.png', pos: [4.4, 0, -1.6], rot: -0.5 },
  { enquete: 'temps', couleur: 0x51cf66, toit: 0xe64980, emoji: '⏳', titre: 'Temps', icone: 'icone-temps.png', pos: [-4.0, 0, 3.6], rot: 0.9 },
  { enquete: 'mystere', couleur: 0xffd43b, toit: 0x364fc7, emoji: '🔍', titre: 'Mystère', icone: 'detective.png', pos: [4.0, 0, 3.6], rot: -0.9 },
];

const G = {
  corps: new RoundedBoxGeometry(2.4, 1.8, 2.2, 4, 0.22),
  toit: new THREE.ConeGeometry(2.1, 1.3, 4).rotateY(Math.PI / 4),
  porte: new RoundedBoxGeometry(0.6, 1.0, 0.1, 3, 0.05),
  fenetre: new RoundedBoxGeometry(0.5, 0.5, 0.1, 3, 0.05),
  panneau: new RoundedBoxGeometry(1.7, 0.9, 0.14, 3, 0.07),
  face: new THREE.PlaneGeometry(1.56, 0.78),
  poteau: new THREE.CylinderGeometry(0.07, 0.07, 0.8, 8),
  tronc: new THREE.CylinderGeometry(0.14, 0.2, 0.7, 10),
  feuille: new THREE.IcosahedronGeometry(0.62, 1),
};
const matCache = new Map();
const mat = (c, tex = null) => {
  const cle = `${c}|${tex}`;
  if (!matCache.has(cle)) {
    const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.75 });
    m.userData.tex = tex;
    matCache.set(cle, m);
  }
  return matCache.get(cle);
};

// Teinte gardée sous la texture : les murs gardent la couleur de leur maison, le bois et
// le feuillage prennent la couleur de l'image.
const TEINTE = { mur: 0.55, tuiles: 0.45, bois: 0, ecorce: 0, feuillage: 0 };

// Pose les textures du kit (THREE.Texture par nom) sur les matériaux déjà créés.
export function appliquerTextures(textures) {
  for (const m of matCache.values()) {
    const t = textures[m.userData.tex];
    if (!t) continue;
    m.map = t;
    m.color.lerp(new THREE.Color(0xffffff), 1 - TEINTE[m.userData.tex]);
    m.needsUpdate = true;
  }
}

export function mesh(geo, couleur, { cast = true, receive = false, tex = null } = {}) {
  const m = new THREE.Mesh(geo, mat(couleur, tex));
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

// Texture du panneau : emoji (ou image listée au manifeste) + titre.
export function dessinerPanneau(canvas, def, img) {
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff8e1';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#' + def.toit.toString(16).padStart(6, '0');
  ctx.lineWidth = 14;
  ctx.strokeRect(7, 7, canvas.width - 14, canvas.height - 14);
  if (img) ctx.drawImage(img, 18, 18, canvas.height - 36, canvas.height - 36);
  else {
    ctx.font = `${canvas.height * 0.62}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.emoji, canvas.height * 0.52, canvas.height * 0.54);
  }
  ctx.fillStyle = '#2b2d42';
  ctx.font = `bold ${canvas.height * 0.3}px "Trebuchet MS", sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(def.titre, canvas.height * 0.92, canvas.height * 0.54, canvas.width - canvas.height);
}

export function creerMaison(def, index) {
  const g = new THREE.Group();
  const corps = mesh(G.corps, def.couleur, { receive: true, tex: 'mur' });
  corps.position.y = 0.9;
  const toit = mesh(G.toit, def.toit, { tex: 'tuiles' });
  toit.position.y = 2.4;
  const porte = mesh(G.porte, 0x8d5524, { tex: 'bois' });
  porte.position.set(0.55, 0.55, 1.12);
  const f1 = mesh(G.fenetre, 0xcaf0f8, { cast: false });
  f1.position.set(-0.6, 1.1, 1.12);
  const f2 = mesh(G.fenetre, 0xcaf0f8, { cast: false });
  f2.position.set(-0.75, 1.1, -1.12);
  const poteau = mesh(G.poteau, 0x8d5524, { tex: 'bois' });
  poteau.position.set(-1.5, 0.4, 1.7);
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  dessinerPanneau(canvas, def, null);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const panneau = mesh(G.panneau, 0x8d5524, { tex: 'bois' });
  panneau.position.set(-1.5, 1.05, 1.75);
  panneau.rotation.y = 0.2;
  const face = new THREE.Mesh(G.face, new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  face.position.z = 0.075;
  panneau.add(face);
  g.add(corps, toit, porte, f1, f2, poteau, panneau);
  g.position.set(...def.pos);
  g.rotation.y = def.rot;
  g.userData = { maison: index, canvas, tex, def, base: g.position.clone() };
  g.traverse((o) => { o.userData.maison = index; });
  return g;
}

export function creerArbre(x, z, s = 1) {
  const g = new THREE.Group();
  const t = mesh(G.tronc, 0x8d5524, { tex: 'ecorce' });
  t.position.y = 0.35;
  const f = mesh(G.feuille, 0x2fbf71, { tex: 'feuillage' });
  f.position.y = 1.2;
  f.scale.set(1, 1.15, 1);
  g.add(t, f);
  g.position.set(x, 0, z);
  g.scale.setScalar(s);
  return g;
}

// Boîte aux lettres en volume (poteau, boîte à dessus arrondi, drapeau), façade vers +z.
const GB = {
  poteau: new RoundedBoxGeometry(0.09, 0.78, 0.09, 2, 0.02),
  boite: new RoundedBoxGeometry(0.3, 0.2, 0.42, 3, 0.04),
  dome: new THREE.CylinderGeometry(0.15, 0.15, 0.42, 16, 1, false, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2),
  tige: new THREE.BoxGeometry(0.025, 0.2, 0.025),
  drapeau: new RoundedBoxGeometry(0.02, 0.1, 0.13, 2, 0.01),
};

export function creerBoiteAuxLettres() {
  const g = new THREE.Group();
  const poteau = mesh(GB.poteau, 0x8d5524, { tex: 'bois' });
  poteau.position.y = 0.39;
  const boite = mesh(GB.boite, 0xe03131);
  boite.position.y = 0.88;
  const dome = mesh(GB.dome, 0xe03131);
  dome.position.y = 0.98;
  const face = mesh(new THREE.CircleGeometry(0.1, 16), 0x9b1c1c, { cast: false });
  face.position.set(0, 0.92, 0.215);
  const tige = mesh(GB.tige, 0xffd43b);
  tige.position.set(0.17, 1.0, 0.02);
  const drapeau = mesh(GB.drapeau, 0xffd43b);
  drapeau.position.set(0.17, 1.06, -0.05);
  g.add(poteau, boite, dome, face, tige, drapeau);
  return g;
}

// Détective : petit personnage articulé (jambes, manteau, tête expressive, deerstalker, loupe).
// Les parties animées sont exposées : corps (y = 0.62), tete (y = 1.3), bras (épaule droite).
const P = {
  peau: 0xffd3b0, joue: 0xff9aa2, cheveux: 0x3b2416, manteau: 0xb0804f, col: 0x8a5a33,
  pantalon: 0x6b4529, chaussure: 0x3a2414, chapeau: 0x9a6a3e, carreau: 0x7d5230, echarpe: 0x2b1d14,
  chemise: 0xfaf6ee, iris: 0x6b3e1f,
};
const boule = (r, c, opts) => mesh(new THREE.SphereGeometry(r, 20, 16), c, opts);
const capsule = (r, l, c) => mesh(new THREE.CapsuleGeometry(r, l, 6, 12), c);

function creerJambe(x) {
  const j = new THREE.Group();
  const cuisse = capsule(0.075, 0.24, P.pantalon);
  cuisse.position.y = 0.26;
  const chaussure = mesh(new RoundedBoxGeometry(0.16, 0.1, 0.26, 3, 0.045), P.chaussure);
  chaussure.position.set(0, 0.05, 0.04);
  j.add(cuisse, chaussure);
  j.position.x = x;
  return j;
}

function creerMain() {
  return boule(0.065, P.peau);
}

export function creerDetective() {
  const g = new THREE.Group();
  g.add(creerJambe(-0.11), creerJambe(0.11));

  // Manteau : jupe évasée, buste, épaules, col, ceinture, boutons, écharpe.
  const corps = new THREE.Group();
  corps.position.y = 0.62;
  const jupe = mesh(new THREE.CylinderGeometry(0.22, 0.32, 0.42, 20), P.manteau);
  jupe.position.y = -0.04;
  const buste = mesh(new THREE.CapsuleGeometry(0.22, 0.2, 6, 16), P.manteau);
  buste.position.y = 0.2;
  buste.scale.set(1, 1, 0.85);
  const ceinture = mesh(new THREE.TorusGeometry(0.235, 0.03, 8, 24), P.echarpe);
  ceinture.rotation.x = Math.PI / 2;
  ceinture.position.y = 0.1;
  const boucle = mesh(new RoundedBoxGeometry(0.08, 0.07, 0.03, 2, 0.01), 0xffd43b, { cast: false });
  boucle.position.set(0, 0.1, 0.215);
  // Col en V : chemise blanche, cravate sombre, revers du manteau.
  const chemise = mesh(new THREE.ConeGeometry(0.1, 0.24, 3), P.chemise, { cast: false });
  chemise.rotation.set(Math.PI, Math.PI / 6, 0);
  chemise.scale.z = 0.3;
  chemise.position.set(0, 0.33, 0.2);
  const cravate = mesh(new RoundedBoxGeometry(0.045, 0.17, 0.02, 2, 0.01), P.echarpe, { cast: false });
  cravate.position.set(0, 0.32, 0.225);
  const col = mesh(new THREE.TorusGeometry(0.14, 0.04, 8, 20), P.col);
  col.rotation.x = Math.PI / 2;
  col.position.y = 0.42;
  corps.add(jupe, buste, ceinture, boucle, chemise, cravate, col);
  [-1, 1].forEach((s) => {
    const revers = mesh(new RoundedBoxGeometry(0.07, 0.2, 0.03, 2, 0.012), P.col, { cast: false });
    revers.position.set(0.075 * s, 0.31, 0.205);
    revers.rotation.set(-0.15, 0, 0.35 * s);
    corps.add(revers);
  });
  [0.0, -0.12].forEach((y) => {
    const b = boule(0.022, P.chaussure, { cast: false });
    b.position.set(-0.06, y, 0.25 + y * 0.35);
    corps.add(b);
  });

  // Tête : visage, cheveux, oreilles, yeux brillants, sourcils, nez, joues, sourire, deerstalker.
  const tete = new THREE.Group();
  tete.position.y = 1.36;
  tete.scale.setScalar(1.3);
  const visage = boule(0.27, P.peau);
  visage.scale.set(1, 0.95, 0.95);
  const cheveux = boule(0.275, P.cheveux);
  cheveux.scale.set(1.02, 0.7, 0.98);
  cheveux.position.set(0, 0.06, -0.05);
  tete.add(visage, cheveux);
  [-1, 1].forEach((s) => {
    const oreille = boule(0.06, P.peau);
    oreille.position.set(0.26 * s, -0.01, 0);
    oreille.scale.set(0.6, 1, 0.8);
    const blanc = boule(0.075, 0xffffff, { cast: false });
    blanc.position.set(0.1 * s, 0.0, 0.215);
    blanc.scale.set(1, 1.15, 0.6);
    const iris = boule(0.056, P.iris, { cast: false });
    iris.position.set(0.1 * s, -0.005, 0.245);
    iris.scale.set(1, 1.1, 0.5);
    const pupille = boule(0.03, 0x1d1d2b, { cast: false });
    pupille.position.set(0.1 * s, -0.005, 0.265);
    pupille.scale.z = 0.5;
    const reflet = boule(0.018, 0xffffff, { cast: false });
    reflet.position.set(0.1 * s + 0.02, 0.025, 0.28);
    const petitReflet = boule(0.008, 0xffffff, { cast: false });
    petitReflet.position.set(0.1 * s - 0.02, -0.03, 0.28);
    const meche = boule(0.07, P.cheveux);
    meche.scale.set(1, 0.45, 0.6);
    meche.position.set(0.09 * s, 0.155, 0.2);
    meche.rotation.z = 0.4 * s;
    const cote = boule(0.09, P.cheveux);
    cote.scale.set(0.55, 0.8, 0.9);
    cote.position.set(0.235 * s, 0.07, -0.02);
    tete.add(iris, petitReflet, meche, cote);
    const sourcil = capsule(0.012, 0.06, P.cheveux);
    sourcil.rotation.z = Math.PI / 2 + 0.2 * s;
    sourcil.position.set(0.1 * s, 0.105, 0.24);
    const joue = boule(0.04, P.joue, { cast: false });
    joue.position.set(0.16 * s, -0.07, 0.2);
    joue.scale.set(1, 0.7, 0.4);
    tete.add(oreille, blanc, pupille, reflet, sourcil, joue);
  });
  const nez = boule(0.028, 0xffb48f, { cast: false });
  nez.position.set(0, -0.06, 0.255);
  const bouche = mesh(new THREE.TorusGeometry(0.04, 0.011, 6, 14, Math.PI), 0xa8323e, { cast: false });
  bouche.rotation.z = Math.PI;
  bouche.position.set(0, -0.12, 0.235);
  tete.add(nez, bouche);
  const chapeau = new THREE.Group();
  chapeau.position.y = 0.08;
  const dome = mesh(new THREE.SphereGeometry(0.29, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2), P.chapeau);
  dome.scale.set(1.04, 0.8, 1.08);
  const bande = mesh(new THREE.CylinderGeometry(0.292, 0.292, 0.05, 24, 1, true), P.carreau);
  bande.position.y = 0.025;
  const visiere = mesh(new THREE.SphereGeometry(0.22, 16, 6, 0, Math.PI, 0, Math.PI / 2), P.carreau);
  visiere.scale.set(1.05, 0.15, 1.1);
  visiere.rotation.x = -0.15;
  const avant = visiere.clone();
  visiere.position.set(0, 0.01, 0.2);
  avant.rotation.set(0.15, Math.PI, 0);
  avant.position.set(0, 0.01, -0.2);
  const pompon = boule(0.04, P.carreau);
  pompon.position.y = 0.25;
  pompon.scale.y = 0.5;
  pompon.position.y = 0.245;
  avant.scale.multiplyScalar(0.6);
  chapeau.add(dome, bande, visiere, avant, pompon);
  tete.add(chapeau);

  // Bras droit (animé) : l'épaule pivote, la main tient la loupe devant lui.
  const bras = new THREE.Group();
  bras.position.set(0.27, 0.98, 0);
  const pose = new THREE.Group();
  pose.rotation.set(-1.75, 0, -0.35);
  const manche = capsule(0.065, 0.26, P.manteau);
  manche.position.y = -0.17;
  const poignet = mesh(new THREE.TorusGeometry(0.06, 0.02, 6, 14), P.col);
  poignet.rotation.x = Math.PI / 2;
  poignet.position.y = -0.33;
  const main = creerMain();
  main.position.y = -0.39;
  const loupe = new THREE.Group();
  // repère de la loupe ramené à la verticale : manche vers le haut, verre face à l'avant
  loupe.position.set(0, -0.42, 0.02);
  loupe.rotation.set(1.75, 0, 0);
  const manchon = mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.2, 10), 0x2b1d14);
  manchon.position.y = 0.06;
  const anneau = mesh(new THREE.TorusGeometry(0.15, 0.03, 10, 28), 0x2b1d14);
  anneau.position.y = 0.33;
  const verre = new THREE.Mesh(new THREE.CircleGeometry(0.14, 28), new THREE.MeshStandardMaterial({
    color: 0xbde0fe, transparent: true, opacity: 0.45, roughness: 0.05, metalness: 0.2, side: THREE.DoubleSide,
  }));
  verre.position.y = 0.33;
  loupe.add(manchon, anneau, verre);
  pose.add(manche, poignet, main, loupe);
  bras.add(pose);

  // Bras gauche, posé le long du corps.
  const brasG = new THREE.Group();
  brasG.position.set(-0.27, 0.98, 0);
  brasG.rotation.z = -0.22;
  const mancheG = capsule(0.065, 0.26, P.manteau);
  mancheG.position.y = -0.17;
  const mainG = creerMain();
  mainG.position.y = -0.38;
  brasG.add(mancheG, mainG);

  g.add(corps, tete, bras, brasG);
  g.userData = { tete, bras, corps };
  return g;
}

// Village autour des maisons d'enquête : église et maisons de décor (plan dans logic/village.mjs).
const GV = {
  corps: new RoundedBoxGeometry(2.2, 1.6, 1.8, 3, 0.12),
  toit: new THREE.CylinderGeometry(1.25, 1.25, 2.5, 3).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2),
  cheminee: new RoundedBoxGeometry(0.3, 0.7, 0.3, 2, 0.05),
  volet: new RoundedBoxGeometry(0.16, 0.5, 0.06, 2, 0.03),
};

function creerMaisonDecor(b) {
  const g = new THREE.Group();
  const corps = mesh(GV.corps, b.mur, { receive: true, tex: 'mur' });
  corps.position.y = 0.8;
  const toit = mesh(GV.toit, b.toit, { tex: 'tuiles' });
  toit.position.y = 1.6 + 0.62;
  const cheminee = mesh(GV.cheminee, 0xb85c38, { tex: 'mur' });
  cheminee.position.set(0.6, 2.35, -0.3);
  const porte = mesh(G.porte, 0x8d5524, { tex: 'bois' });
  porte.position.set(0.5, 0.52, 0.91);
  g.add(corps, toit, cheminee, porte);
  [[-0.45, 0.95], [0.5, 1.32]].forEach(([x, y]) => {
    const f = mesh(G.fenetre, 0xfff3bf, { cast: false });
    f.position.set(x, y, 0.91);
    g.add(f);
    [-1, 1].forEach((s) => {
      const v = mesh(GV.volet, b.toit, { cast: false });
      v.position.set(x + 0.34 * s, y, 0.92);
      g.add(v);
    });
  });
  g.position.set(b.x, 0, b.z);
  g.rotation.y = b.rot;
  g.scale.setScalar(b.s);
  return g;
}

function creerEglise(b) {
  const g = new THREE.Group();
  const pierre = 0xf1e6d2, ardoise = 0x5c6b8a;
  const nef = mesh(new RoundedBoxGeometry(2.8, 2.4, 4.6, 3, 0.12), pierre, { receive: true, tex: 'mur' });
  nef.position.set(0, 1.2, -1.0);
  const toitNef = mesh(new THREE.CylinderGeometry(1.75, 1.75, 4.9, 3).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2).rotateY(Math.PI / 2), ardoise, { tex: 'tuiles' });
  toitNef.position.set(0, 2.4 + 0.86, -1.0);
  const tour = mesh(new RoundedBoxGeometry(1.5, 4.4, 1.5, 3, 0.1), pierre, { receive: true, tex: 'mur' });
  tour.position.set(0, 2.2, 1.7);
  const fleche = mesh(new THREE.ConeGeometry(1.1, 2.6, 4).rotateY(Math.PI / 4), ardoise, { tex: 'tuiles' });
  fleche.position.set(0, 4.4 + 1.3, 1.7);
  const or = 0xffc933;
  const croixV = mesh(new THREE.BoxGeometry(0.1, 0.6, 0.1), or);
  croixV.position.set(0, 7.25, 1.7);
  const croixH = mesh(new THREE.BoxGeometry(0.38, 0.1, 0.1), or);
  croixH.position.set(0, 7.35, 1.7);
  const cadran = mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.06, 28).rotateX(Math.PI / 2), 0xffffff, { cast: false });
  cadran.position.set(0, 3.5, 2.47);
  const aiguilles = [[0.05, 0.32, 0], [0.05, 0.24, Math.PI / 2.4]].map(([l, h, r]) => {
    const a = mesh(new THREE.BoxGeometry(l, h, 0.02), 0x1d1d2b, { cast: false });
    a.geometry.translate(0, h / 2, 0);
    a.rotation.z = r;
    a.position.set(0, 3.5, 2.51);
    return a;
  });
  const cloche = mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.7, 16, 1, false, 0, Math.PI).rotateY(-Math.PI / 2), 0x3b3355, { cast: false });
  cloche.position.set(0, 2.55, 2.42);
  cloche.scale.z = 0.25;
  const porte = mesh(new RoundedBoxGeometry(0.8, 1.3, 0.1, 3, 0.05), 0x8d5524, { tex: 'bois' });
  porte.position.set(0, 0.65, 2.46);
  const arc = mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.1, 20, 1, false, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2), 0x8d5524, { tex: 'bois' });
  arc.position.set(0, 1.3, 2.46);
  g.add(nef, toitNef, tour, fleche, croixV, croixH, cadran, ...aiguilles, cloche, porte, arc);
  [-1, 1].forEach((s) => [-2.4, -1.0, 0.4].forEach((z) => {
    const v = mesh(new RoundedBoxGeometry(0.08, 0.9, 0.4, 2, 0.03), [0x74c0fc, 0xf783ac, 0xffd43b][(z + 2.4) / 1.4 | 0], { cast: false });
    v.position.set(1.41 * s, 1.4, z - 1.0 + 1.0);
    g.add(v);
  }));
  g.position.set(b.x, 0, b.z);
  g.rotation.y = b.rot;
  return g;
}

export function creerVillage() {
  const g = new THREE.Group();
  for (const b of VILLAGE) g.add(b.type === 'eglise' ? creerEglise(b) : creerMaisonDecor(b));
  for (const [x, z, s] of ARBRES_VILLAGE) g.add(creerArbre(x, z, s));
  return g;
}

export function creerNuage(x, y, z) {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
  [[0, 0, 0, 0.8], [0.8, -0.1, 0, 0.6], [-0.8, -0.1, 0, 0.6]].forEach(([a, b, c, r]) => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), m);
    s.position.set(a, b, c);
    g.add(s);
  });
  g.position.set(x, y, z);
  return g;
}
