// Rendu three.js : plateau en bois, chevaux, dé 3D, caméra ajustée, animations.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CASES, ESCALIERS, ECURIES, CENTRE, positionCheval } from './plateau.js';
import { createRng } from './rng.js';

// échelle des pions sur le plateau (+26 % par rapport à 1.15)
const TAILLE = 1.45;
export const COL = [0xe53935, 0x1e88e5, 0xfdd835, 0x43a047];
const PALE = [0xffcdd2, 0xbbdefb, 0xfff59d, 0xc8e6c9];
const css = (n) => '#' + n.toString(16).padStart(6, '0');
const facile = (u) => 1 - Math.pow(1 - u, 3);
const W = (g) => g - 7; // grille -> monde

function textureBois() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  const r = createRng(7);
  const n = 8, l = 512 / n;
  for (let i = 0; i < n; i++) {
    const v = 150 + Math.floor(r() * 30);
    g.fillStyle = `rgb(${v + 40},${v - 5},${v - 60})`;
    g.fillRect(i * l, 0, l, 512);
    for (let k = 0; k < 14; k++) {
      g.strokeStyle = `rgba(90,50,20,${0.08 + r() * 0.12})`;
      g.lineWidth = 1 + r() * 2;
      const x = i * l + r() * l;
      g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 8 * (r() - 0.5), 170, x + 8 * (r() - 0.5), 340, x + 4 * (r() - 0.5), 512); g.stroke();
    }
    g.fillStyle = 'rgba(70,35,10,0.35)';
    g.fillRect(i * l, 0, 2, 512);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function textureCentre() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#fff4dc'; g.fillRect(0, 0, 256, 256);
  // triangle vers chaque bras : haut = jaune (2), droite = vert (3), bas = rouge (0), gauche = bleu (1)
  const tri = (col, pts) => { g.fillStyle = css(col); g.beginPath(); g.moveTo(pts[0], pts[1]); g.lineTo(pts[2], pts[3]); g.lineTo(pts[4], pts[5]); g.closePath(); g.fill(); };
  tri(COL[2], [0, 0, 256, 0, 128, 128]);
  tri(COL[3], [256, 0, 256, 256, 128, 128]);
  tri(COL[0], [0, 256, 256, 256, 128, 128]);
  tri(COL[1], [0, 0, 0, 256, 128, 128]);
  // étoile
  g.fillStyle = '#fffdf5'; g.strokeStyle = '#ff9800'; g.lineWidth = 6;
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 === 0 ? 62 : 26;
    g.lineTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r);
  }
  g.closePath(); g.fill(); g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const POINTS = {
  1: [[0.5, 0.5]], 2: [[0.28, 0.28], [0.72, 0.72]], 3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
  4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
  5: [[0.27, 0.27], [0.73, 0.27], [0.5, 0.5], [0.27, 0.73], [0.73, 0.73]],
  6: [[0.3, 0.25], [0.7, 0.25], [0.3, 0.5], [0.7, 0.5], [0.3, 0.75], [0.7, 0.75]],
};
function textureFace(v) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#fffdf5'; g.fillRect(0, 0, 128, 128);
  g.fillStyle = v === 1 ? '#e53935' : '#2b2d42';
  for (const [x, y] of POINTS[v]) { g.beginPath(); g.arc(x * 128, y * 128, v === 1 ? 20 : 13, 0, Math.PI * 2); g.fill(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
// ordre des faces d'une BoxGeometry : +x, -x, +y, -y, +z, -z
const VALEUR_FACE = [3, 4, 1, 6, 2, 5];
const NORMALE = { 1: [0, 1, 0], 6: [0, -1, 0], 3: [1, 0, 0], 4: [-1, 0, 0], 2: [0, 0, 1], 5: [0, 0, -1] };

export function creerScene(canvas, conteneur) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 1, 200);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9b98f, 1.9));
  const soleil = new THREE.DirectionalLight(0xfff0d6, 2.4);
  soleil.position.set(5, 14, 9);
  soleil.castShadow = true;
  soleil.shadow.mapSize.set(1024, 1024);
  Object.assign(soleil.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 40 });
  soleil.shadow.bias = -0.0006;
  soleil.shadow.normalBias = 0.03;
  scene.add(soleil);

  let vitesse = 1;

  // ---- plateau ----
  const bois = textureBois();
  const matBois = new THREE.MeshStandardMaterial({ map: bois, roughness: 0.8 });
  const base = new THREE.Mesh(new RoundedBoxGeometry(15.8, 0.5, 15.8, 4, 0.22), matBois);
  base.position.y = -0.25;
  base.receiveShadow = true;
  scene.add(base);

  const geoCase = new RoundedBoxGeometry(0.92, 0.14, 0.92, 3, 0.05);
  const matClair = new THREE.MeshStandardMaterial({ color: 0xfff4dc, roughness: 0.6 });
  const matCouleur = COL.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 }));
  const matEscalier = COL.map((c) => new THREE.MeshStandardMaterial({ color: new THREE.Color(c).lerp(new THREE.Color(0xffffff), 0.3), roughness: 0.5 }));
  const casesMesh = [];
  CASES.forEach((p, i) => {
    const m = new THREE.Mesh(geoCase, i % 14 === 0 ? matCouleur[i / 14] : matClair);
    m.position.set(W(p.x), 0.07, W(p.z));
    m.receiveShadow = true;
    scene.add(m);
    casesMesh.push(m);
  });
  ESCALIERS.forEach((e, c) => e.forEach((p, k) => {
    const m = new THREE.Mesh(geoCase, matEscalier[c]);
    m.position.set(W(p.x), 0.07 + k * 0.025, W(p.z));
    m.scale.y = 1 + k * 0.4;
    m.receiveShadow = true;
    scene.add(m);
  }));
  // centre étoilé
  const centre = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshStandardMaterial({ map: textureCentre(), roughness: 0.6 }));
  centre.rotation.x = -Math.PI / 2;
  centre.position.set(W(CENTRE.x), 0.02, W(CENTRE.z));
  centre.receiveShadow = true;
  scene.add(centre);
  // écuries : enclos coloré + pré clair + 4 places
  const geoEnclos = new RoundedBoxGeometry(5.9, 0.2, 5.9, 3, 0.15);
  const geoPre = new RoundedBoxGeometry(5.4, 0.2, 5.4, 3, 0.12);
  const geoPlace = new THREE.CylinderGeometry(0.4, 0.4, 0.04, 24);
  ECURIES.forEach((pl, c) => {
    const qx = pl.reduce((s, p) => s + p.x, 0) / 4, qz = pl.reduce((s, p) => s + p.z, 0) / 4;
    const e = new THREE.Mesh(geoEnclos, matCouleur[c]);
    e.position.set(W(qx), 0.05, W(qz)); e.receiveShadow = true; scene.add(e);
    const pre = new THREE.Mesh(geoPre, new THREE.MeshStandardMaterial({ color: PALE[c], roughness: 0.9 }));
    pre.position.set(W(qx), 0.07, W(qz)); pre.receiveShadow = true; scene.add(pre);
    pl.forEach((p) => {
      const m = new THREE.Mesh(geoPlace, matCouleur[c]);
      m.position.set(W(p.x), 0.18, W(p.z)); m.receiveShadow = true; scene.add(m);
    });
  });

  // ---- chevaux ----
  const matPion = COL.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.45 }));
  const matBase = COL.map((c) => new THREE.MeshStandardMaterial({ color: new THREE.Color(c).multiplyScalar(0.65), roughness: 0.6 }));
  const matCrin = new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.7 });
  const matMuseau = new THREE.MeshStandardMaterial({ color: 0xfff3e0, roughness: 0.6 });
  // contour « coque inversée » : faces arrière sombres légèrement agrandies
  const matContour = new THREE.MeshBasicMaterial({ color: 0x22232e, side: THREE.BackSide });
  const matOeil = new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.3 });
  const g = {
    base: new THREE.CylinderGeometry(0.3, 0.34, 0.1, 24),
    corps: new THREE.SphereGeometry(0.3, 20, 14),
    cou: new THREE.CylinderGeometry(0.11, 0.16, 0.42, 14),
    tete: new THREE.SphereGeometry(0.17, 16, 12),
    museau: new THREE.SphereGeometry(0.1, 12, 10),
    oeil: new THREE.SphereGeometry(0.035, 8, 6),
    oreille: new THREE.ConeGeometry(0.06, 0.17, 10),
    crin: new THREE.SphereGeometry(0.075, 10, 8),
    liseré: new THREE.TorusGeometry(0.335, 0.03, 8, 32),
  };
  const add = (parent, geo, mat, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.x = rx; m.castShadow = true;
    parent.add(m); return m;
  };
  const contour = (parent, m, k = 1.1) => {
    const o = new THREE.Mesh(m.geometry, matContour);
    o.position.copy(m.position); o.rotation.copy(m.rotation); o.scale.copy(m.scale).multiplyScalar(k);
    parent.add(o);
  };
  const liseré = (grp) => { const l = add(grp, g.liseré, matContour, 0, 0.02, 0); l.rotation.x = Math.PI / 2; l.castShadow = false; };
  let modele = null; // modèle GLB optionnel
  function chevalPrimitives(c) {
    const grp = new THREE.Group();
    add(grp, g.base, matBase[c], 0, 0.05, 0);
    contour(grp, add(grp, g.corps, matPion[c], 0, 0.38, -0.02, 0.9, 0.95, 1.2), 1.06);
    contour(grp, add(grp, g.cou, matPion[c], 0, 0.64, 0.17, 1, 1, 1, Math.PI / 5), 1.1);
    contour(grp, add(grp, g.tete, matPion[c], 0, 0.86, 0.3, 0.9, 0.9, 1.35, Math.PI / 12), 1.08);
    liseré(grp);
    add(grp, g.museau, matMuseau, 0, 0.8, 0.46, 1, 0.9, 1.1);
    add(grp, g.oeil, matOeil, 0.09, 0.9, 0.38);
    add(grp, g.oeil, matOeil, -0.09, 0.9, 0.38);
    add(grp, g.oreille, matPion[c], 0.08, 1.03, 0.25);
    add(grp, g.oreille, matPion[c], -0.08, 1.03, 0.25);
    add(grp, g.crin, matCrin, 0, 0.97, 0.17);
    add(grp, g.crin, matCrin, 0, 0.85, 0.09);
    add(grp, g.crin, matCrin, 0, 0.72, 0.02);
    add(grp, g.crin, matCrin, 0, 0.42, -0.36, 1, 1.4, 1);
    return grp;
  }
  function chevalModele(c) {
    const grp = new THREE.Group();
    add(grp, g.base, matBase[c], 0, 0.05, 0);
    liseré(grp);
    const m = modele.clone(true);
    m.traverse((o) => { if (o.isMesh) { o.material = matPion[c]; o.castShadow = true; } });
    grp.add(m);
    return grp;
  }
  const chevaux = []; // chevaux[j][h] = { grp, s, ...}
  function viderChevaux() {
    chevaux.forEach((l) => l.forEach((hc) => scene.remove(hc.grp)));
    chevaux.length = 0;
  }
  let dernierEtat = null;
  function setJoueurs(state) {
    viderChevaux();
    state.joueurs.forEach((jo, j) => {
      const liste = jo.chevaux.map((p, h) => {
        const grp = modele ? chevalModele(j) : chevalPrimitives(j);
        scene.add(grp);
        return { grp, s: 1, j, h };
      });
      chevaux.push(liste);
    });
    sync(state);
  }

  const tmpV = new THREE.Vector3();
  function poser(hc, gx, gz, y = 0) {
    hc.grp.position.set(W(gx), y, W(gz));
  }
  function orienterVersCentre(hc) {
    hc.grp.rotation.y = Math.atan2(-hc.grp.position.x, -hc.grp.position.z);
  }
  // Place tous les chevaux sur leurs positions d'état (décalage léger si plusieurs sur une case).
  function sync(state) {
    dernierEtat = state;
    const groupes = new Map();
    state.joueurs.forEach((jo, j) => jo.chevaux.forEach((p, h) => {
      if (p === -1 || p === 61) return;
      const q = positionCheval(j, p, h);
      const key = Math.round(q.x * 10) + ',' + Math.round(q.z * 10);
      if (!groupes.has(key)) groupes.set(key, []);
      groupes.get(key).push(chevaux[j][h]);
    }));
    state.joueurs.forEach((jo, j) => jo.chevaux.forEach((p, h) => {
      const hc = chevaux[j][h];
      const q = positionCheval(j, p, h);
      hc.s = p === 61 ? 0.8 : TAILLE;
      hc.grp.scale.setScalar(hc.s);
      hc.grp.rotation.x = 0;
      poser(hc, q.x, q.z, 0);
      if (p !== -1 && p !== 61) {
        const lst = groupes.get(Math.round(q.x * 10) + ',' + Math.round(q.z * 10));
        if (lst.length > 1) {
          const i = lst.indexOf(hc);
          const dx = lst.length === 2 ? (i === 0 ? -0.2 : 0.2) : (i % 2 ? 0.2 : -0.2);
          const dz = lst.length === 2 ? 0 : (i < 2 ? -0.2 : 0.2);
          hc.grp.position.x += dx; hc.grp.position.z += dz;
          hc.s = 1; hc.grp.scale.setScalar(1);
        }
      }
      orienterVersCentre(hc);
    }));
  }

  // ---- tweens ----
  const tweens = [];
  function tween(duree, fn) {
    return new Promise((res) => { tweens.push({ t: 0, d: duree, fn, res }); });
  }
  function majTweens(dt) {
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i];
      tw.t += dt * vitesse;
      const u = Math.min(1, tw.t / tw.d);
      tw.fn(u);
      if (u >= 1) { tweens.splice(i, 1); tw.res(); }
    }
  }
  // saut d'un cheval d'un point de grille à un autre, avec squash & stretch
  function saut(hc, a, b, haut, duree, tourne = false) {
    const ax = W(a.x), az = W(a.z), bx = W(b.x), bz = W(b.z);
    const dx = bx - ax, dz = bz - az;
    if (!tourne && dx * dx + dz * dz > 0.01) hc.grp.rotation.y = Math.atan2(dx, dz);
    const r0 = hc.grp.rotation.y;
    return tween(duree, (u) => {
      hc.grp.position.set(ax + dx * u, 4 * haut * u * (1 - u), az + dz * u);
      const sy = 1 + 0.2 * Math.sin(u * Math.PI * 2) * (1 - 0.3 * u);
      const sx = 1 / Math.sqrt(sy);
      hc.grp.scale.set(hc.s * sx, hc.s * sy, hc.s * sx);
      if (tourne) hc.grp.rotation.y = r0 + u * Math.PI * 2;
      if (u >= 1) hc.grp.scale.setScalar(hc.s);
    });
  }
  const posGrille = (hc) => ({ x: hc.grp.position.x + 7, z: hc.grp.position.z + 7 });

  async function deplacer(j, h, cases, { compter = false, onPas = null } = {}) {
    const hc = chevaux[j][h];
    hc.s = TAILLE; hc.grp.scale.setScalar(TAILLE);
    for (let i = 0; i < cases.length; i++) {
      const from = posGrille(hc);
      const to = positionCheval(j, cases[i], h);
      if (onPas) onPas(i, cases[i]);
      await saut(hc, from, to, 0.32, compter ? 0.62 : 0.14);
    }
  }
  async function sortie(j, h) {
    const hc = chevaux[j][h];
    const from = posGrille(hc);
    await saut(hc, from, positionCheval(j, 0, h), 1.1, 0.45);
  }
  async function prise(j, h) {
    const hc = chevaux[j][h];
    hc.s = TAILLE; hc.grp.scale.setScalar(TAILLE);
    await saut(hc, posGrille(hc), positionCheval(j, -1, h), 2.2, 0.95, true);
  }

  // ---- dé ----
  const DE_Y = 0.62;
  const matsDe = VALEUR_FACE.map((v) => new THREE.MeshStandardMaterial({ map: textureFace(v), roughness: 0.4 }));
  const de = new THREE.Mesh(new RoundedBoxGeometry(1.2, 1.2, 1.2, 4, 0.18), matsDe);
  de.castShadow = true;
  de.position.set(0, DE_Y, 0);
  scene.add(de);
  const qFinal = new THREE.Quaternion(), qAxe = new THREE.Quaternion(), qYaw = new THREE.Quaternion();
  const vAxe = new THREE.Vector3(), vHaut = new THREE.Vector3(0, 1, 0), vNorm = new THREE.Vector3();
  let invite = false;
  function orienterDe(valeur, yaw) {
    vNorm.set(...NORMALE[valeur]);
    qFinal.setFromUnitVectors(vNorm, vHaut);
    qYaw.setFromAxisAngle(vHaut, yaw);
    qFinal.premultiply(qYaw);
  }
  orienterDe(1, 0.4);
  de.quaternion.copy(qFinal);
  function lancerDe(valeur) {
    invite = false;
    const rr = Math.random;
    orienterDe(valeur, rr() * Math.PI * 2);
    vAxe.set(rr() - 0.5, rr() - 0.5, rr() - 0.5).normalize();
    const angle = Math.PI * 2 * (3 + rr() * 2);
    const dx = (rr() - 0.5) * 1.6, dz = (rr() - 0.5) * 1.6;
    return tween(0.5, (u) => {
      const e = facile(u);
      qAxe.setFromAxisAngle(vAxe, angle * (1 - e));
      de.quaternion.copy(qFinal).premultiply(qAxe);
      const k = Math.sin(u * Math.PI);
      de.position.set(dx * k, DE_Y + 2.2 * k * (1 - 0.3 * u), dz * k);
    });
  }

  // ---- surlignage des coups ----
  const geoAnneau = new THREE.RingGeometry(0.56, 0.86, 32);
  const matAnneau = new THREE.MeshBasicMaterial({ color: 0xffee58, transparent: true, opacity: 1, side: THREE.DoubleSide, depthWrite: false });
  const geoBord = new THREE.RingGeometry(0.86, 0.95, 32);
  const matBord = new THREE.MeshBasicMaterial({ color: 0xef6c00, side: THREE.DoubleSide, depthWrite: false, transparent: true });
  const geoMarq = new THREE.CircleGeometry(0.42, 24);
  const matMarq = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, depthWrite: false });
  const anneaux = [], marqueurs = [];
  for (let i = 0; i < 4; i++) {
    const a = new THREE.Mesh(geoAnneau, matAnneau); a.rotation.x = -Math.PI / 2; a.visible = false; a.add(new THREE.Mesh(geoBord, matBord)); scene.add(a); anneaux.push(a);
    const m = new THREE.Mesh(geoMarq, matMarq); m.rotation.x = -Math.PI / 2; m.visible = false; scene.add(m); marqueurs.push(m);
  }
  let surlignes = []; // [{hc, mx, mz}]
  function surligner(j, coups, avecMarqueurs = true) {
    effacer();
    coups.forEach((m, k) => {
      const hc = chevaux[j][m.cheval];
      const q = positionCheval(j, m.vers, m.cheval);
      surlignes.push({ hc, mx: W(q.x), mz: W(q.z), marq: avecMarqueurs });
      anneaux[k].visible = true;
      marqueurs[k].visible = avecMarqueurs;
    });
  }
  function effacer() {
    for (const s of surlignes) { s.hc.grp.position.y = 0; }
    surlignes = [];
    anneaux.forEach((a) => { a.visible = false; });
    marqueurs.forEach((a) => { a.visible = false; });
  }
  function animSurlignage(t) {
    const pulse = 1 + 0.14 * Math.sin(t * 7);
    for (let i = 0; i < surlignes.length; i++) {
      const s = surlignes[i];
      s.hc.grp.position.y = 0.2 * Math.abs(Math.sin(t * 4));
      anneaux[i].position.set(s.hc.grp.position.x, 0.2, s.hc.grp.position.z);
      anneaux[i].scale.setScalar(pulse);
      if (s.marq) { marqueurs[i].position.set(s.mx, 0.17, s.mz); marqueurs[i].scale.setScalar(pulse); }
    }
    if (invite) { de.position.y = DE_Y + 0.12 * Math.abs(Math.sin(t * 4)); de.rotation.y += 0; }
  }

  // ---- caméra ----
  // Ajustement serré : boîte du plateau (dessus et dessous du bois) + têtes des chevaux du fond.
  // Plongée plus verticale en portrait ; centre de projection décalé sous la pastille de messages.
  const MARGE = 0.985; // ≈ 1,5 % de marge par bord
  const RESERVE_HAUT = 44; // px occupés par la pastille translucide en portrait
  const pts = [];
  for (const x of [-7.9, 7.9]) for (const z of [-7.9, 7.9]) for (const y of [-0.5, 0]) pts.push(new THREE.Vector3(x, y, z));
  for (const x of [-6.5, 6.5]) pts.push(new THREE.Vector3(x, 1.7, -6.5));
  const vp = new THREE.Vector3();
  function placer(el, d) {
    camera.position.set(0, Math.sin(el) * d, Math.cos(el) * d);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);
  }
  function ajuster() {
    const w = conteneur.clientWidth, h = conteneur.clientHeight;
    if (!w || !h) return;
    const portrait = h > w;
    // portrait étroit : plongée plus verticale (75°) pour employer la hauteur libre
    const el = (portrait ? ((h - Math.min(RESERVE_HAUT, h * 0.08)) / w > 1.15 ? 75 : 70) : 60) * Math.PI / 180;
    const margeX = portrait ? 0.98 : MARGE; // bords gauche/droit : marge ≥ 1 %
    const haut = portrait ? Math.min(RESERVE_HAUT, h * 0.08) : 0; // bande utile : [haut, h]
    const hu = h - haut;
    camera.clearViewOffset();
    renderer.setSize(w, h, false);
    camera.aspect = w / hu;
    camera.updateProjectionMatrix();
    let lo = 4, hi = 90;
    for (let it = 0; it < 24; it++) {
      const d = (lo + hi) / 2;
      placer(el, d);
      // largeur symétrique ; hauteur jugée sur l'étendue (le décalage vertical recentre ensuite)
      let ok = true, ymin = 9, ymax = -9;
      for (const p of pts) {
        vp.copy(p).project(camera);
        if (Math.abs(vp.x) > margeX || vp.z > 1) { ok = false; break; }
        ymin = Math.min(ymin, vp.y); ymax = Math.max(ymax, vp.y);
      }
      if (ok && ymax - ymin > 2 * MARGE) ok = false;
      if (ok) hi = d; else lo = d;
    }
    placer(el, hi);
    // centre le plateau dans la bande utile, puis étend la vue à tout le canvas
    let mn = 9, mx = -9;
    for (const p of pts) { vp.copy(p).project(camera); mn = Math.min(mn, vp.y); mx = Math.max(mx, vp.y); }
    const cy = -((mx + mn) / 2) * hu / 2; // décalage px pour centrer dans la bande
    // le cadrage (aspect w/hu) devient la « vue complète » ; la fenêtre affichée w×h remonte de `haut`
    camera.setViewOffset(w, hu, 0, cy - haut, w, h);
  }
  new ResizeObserver(ajuster).observe(conteneur);
  window.addEventListener('resize', ajuster);
  window.addEventListener('orientationchange', () => setTimeout(ajuster, 150));
  if (window.visualViewport) window.visualViewport.addEventListener('resize', ajuster);
  ajuster();

  function projeter(j, h, out) {
    const hc = chevaux[j][h];
    tmpV.set(hc.grp.position.x, 0.6, hc.grp.position.z).project(camera);
    out.x = (tmpV.x * 0.5 + 0.5) * canvas.clientWidth;
    out.y = (-tmpV.y * 0.5 + 0.5) * canvas.clientHeight;
    return out;
  }
  function projeterDe(out) {
    tmpV.set(0, DE_Y, 0).project(camera);
    out.x = (tmpV.x * 0.5 + 0.5) * canvas.clientWidth;
    out.y = (-tmpV.y * 0.5 + 0.5) * canvas.clientHeight;
    return out;
  }

  let dernier = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - dernier) / 1000);
    dernier = now;
    majTweens(dt);
    animSurlignage(now / 1000);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  async function chargerModele(url) {
    try {
      const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
      const gltf = await new GLTFLoader().loadAsync(url);
      const m = gltf.scene;
      const box = new THREE.Box3().setFromObject(m);
      const taille = box.getSize(new THREE.Vector3());
      const k = 0.95 / (taille.y || 1);
      m.scale.setScalar(k);
      box.setFromObject(m);
      m.position.y -= box.min.y - 0.1;
      const racine = new THREE.Group(); racine.add(m);
      modele = racine;
      if (dernierEtat) setJoueurs(dernierEtat);
    } catch (e) { console.warn('modèle de cheval indisponible, primitives conservées', e); }
  }

  // Avatars : le même pion que sur le plateau, rendu une fois par couleur (3/4 face, fond transparent).
  // Renderer hors écran jeté après les rendus ; renvoie null si WebGL échoue.
  function rendreAvatars(taille = 128) {
    let r = null;
    try {
      const cv = document.createElement('canvas');
      cv.width = cv.height = taille;
      r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true });
      r.setPixelRatio(1); r.setSize(taille, taille, false); r.setClearColor(0x000000, 0);
      const sc = new THREE.Scene();
      sc.add(new THREE.HemisphereLight(0xffffff, 0xd9b98f, 1.9));
      const dl = new THREE.DirectionalLight(0xfff0d6, 2.4); dl.position.set(3, 5, 6); sc.add(dl);
      const cam = new THREE.PerspectiveCamera(24, 1, 0.1, 50);
      cam.position.set(1.5, 0.9, 2.5); cam.lookAt(0, 0.55, 0.1);
      const urls = [0, 1, 2, 3].map((c) => {
        const grp = modele ? chevalModele(c) : chevalPrimitives(c);
        grp.rotation.y = -0.25;
        sc.add(grp);
        r.render(sc, cam);
        const u = cv.toDataURL('image/png');
        sc.remove(grp);
        return u;
      });
      return urls;
    } catch (e) { console.warn('avatars 3D indisponibles', e); return null; }
    finally { if (r) { r.dispose(); r.forceContextLoss(); } }
  }

  // taille à l'écran (px) d'une case au centre du plateau, pour la sélection tolérante
  function pxParCase() {
    tmpV.set(0, 0.6, 0).project(camera); const x0 = tmpV.x;
    tmpV.set(1, 0.6, 0).project(camera);
    return Math.abs(tmpV.x - x0) * 0.5 * canvas.clientWidth;
  }

  return {
    rendreAvatars, pxParCase,
    // débogage : points du cadrage projetés en px écran
    cadre: () => pts.map((p) => { vp.copy(p).project(camera); return [Math.round((vp.x + 1) / 2 * canvas.clientWidth), Math.round((1 - vp.y) / 2 * canvas.clientHeight)]; }), setJoueurs, sync, deplacer, sortie, prise, lancerDe, surligner, effacer,
    projeter, projeterDe, chargerModele, ajuster,
    deInvite(v) { invite = v; if (!v) de.position.y = DE_Y; },
    setVitesse(x) { vitesse = Math.max(0.1, x); },
    getVitesse() { return vitesse; },
    stats() { return { appels: renderer.info.render.calls, triangles: renderer.info.render.triangles }; },
  };
}
