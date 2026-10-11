import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { whenImage } from '../assets.js';

export const TOP = 0.04; // hauteur du dessus des tuiles

const loader = new THREE.TextureLoader();

// Charge une texture ; en cas d'absence (404) on ne fait rien (repli sur la couleur unie).
function tryTexture(url, material, repeat = 1) {
  loader.load(
    url,
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(repeat, repeat);
      material.map = tex;
      material.color.set(0xffffff);
      material.needsUpdate = true;
    },
    undefined,
    () => {},
  );
}

const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0, ...extra });

// Ressources partagées (géométries et matériaux créés une seule fois).
export const mats = {
  grassA: std(0x62d94a),
  grassB: std(0x56cc42),
  dirt: std(0xa86a3c),
  wood: std(0xc98a4b),
  woodDark: std(0x8a5a2b),
  rock: std(0x9aa0aa, { flatShading: true, roughness: 0.9 }),
  gold: std(0xffc928, { roughness: 0.35, metalness: 0.4 }),
  water: std(0x35b6f5, { roughness: 0.25, transparent: true, opacity: 0.9 }),
  body: std(0xff7a1a),
  head: std(0x4fc3f7),
  limb: std(0xffd23f),
  dark: std(0x2b2f45),
  white: std(0xffffff, { roughness: 0.4 }),
  red: std(0xff3b5c, { emissive: 0x551020 }),
  chest: std(0xc98a4b),
};
whenImage('grass.png', (url) => { tryTexture(url, mats.grassA); tryTexture(url, mats.grassB); });
whenImage('wood.png', (url) => { tryTexture(url, mats.wood); tryTexture(url, mats.chest); });

export const geo = {
  grass: new RoundedBoxGeometry(0.98, 0.24, 0.98, 3, 0.09),
  dirt: new RoundedBoxGeometry(0.9, 0.5, 0.9, 3, 0.09),
  plank: new RoundedBoxGeometry(0.98, 0.1, 0.2, 2, 0.04),
  post: new RoundedBoxGeometry(0.1, 0.2, 0.1, 2, 0.03),
  rock: new THREE.IcosahedronGeometry(0.36, 0),
};

export function makeGround(x, y) {
  const g = new THREE.Group();
  const top = new THREE.Mesh(geo.grass, (x + y) % 2 ? mats.grassA : mats.grassB);
  top.position.y = TOP - 0.12;
  top.castShadow = false;
  top.receiveShadow = true;
  const base = new THREE.Mesh(geo.dirt, mats.dirt);
  base.position.y = TOP - 0.12 - 0.12 - 0.25 + 0.06;
  g.add(top, base);
  return g;
}

export function makeBridge(alongX) {
  const g = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const p = new THREE.Mesh(geo.plank, i % 2 ? mats.wood : mats.woodDark);
    p.position.set(0, TOP - 0.05, -0.36 + i * 0.24);
    p.receiveShadow = true;
    g.add(p);
  }
  for (const sx of [-0.45, 0.45]) {
    for (const sz of [-0.4, 0.4]) {
      const post = new THREE.Mesh(geo.post, mats.woodDark);
      post.position.set(sx, TOP + 0.05, sz);
      g.add(post);
    }
  }
  // planches perpendiculaires au sens de marche (par défaut : marche le long de z)
  if (alongX) g.rotation.y = Math.PI / 2;
  return g;
}

export function makeRock() {
  const m = new THREE.Mesh(geo.rock, mats.rock);
  m.scale.set(1, 0.7, 1);
  m.position.y = TOP + 0.2;
  m.rotation.y = Math.random() * 3;
  m.castShadow = true;
  return m;
}

const goldBright = new THREE.MeshStandardMaterial({ color: 0xf5c400, metalness: 0.6, roughness: 0.3, emissive: 0x4a3600 });

function heartPath(sc) {
  const h = new THREE.Path();
  const P = (x, y) => [x * sc, y * sc];
  h.moveTo(...P(0, -0.5));
  h.bezierCurveTo(...P(-0.15, -0.35), ...P(-0.55, -0.1), ...P(-0.55, 0.15));
  h.bezierCurveTo(...P(-0.55, 0.4), ...P(-0.25, 0.5), ...P(0, 0.3));
  h.bezierCurveTo(...P(0.25, 0.5), ...P(0.55, 0.4), ...P(0.55, 0.15));
  h.bezierCurveTo(...P(0.55, -0.1), ...P(0.15, -0.35), ...P(0, -0.5));
  return h;
}

// Clé dorée : anneau épais à trou en cœur, collerette, tige à dents arrondies (le haut est +Y).
export function makeKey() {
  const g = new THREE.Group();
  const head = new THREE.Shape();
  head.absellipse(0, 0, 0.17, 0.18, 0, Math.PI * 2, false, 0);
  head.holes.push(heartPath(0.21));
  const hg = new THREE.ExtrudeGeometry(head, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.018, bevelSize: 0.018, bevelSegments: 3, curveSegments: 20 });
  hg.translate(0, 0, -0.02);
  const ring = new THREE.Mesh(hg, goldBright);
  ring.position.y = 0.22;
  const collar = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), goldBright);
  collar.scale.set(0.095, 0.04, 0.06);
  collar.position.y = 0.02;
  const shaft = new THREE.Mesh(new RoundedBoxGeometry(0.07, 0.36, 0.05, 3, 0.022), goldBright);
  shaft.position.y = -0.18;
  g.add(ring, collar, shaft);
  for (const ty of [-0.14, -0.24, -0.33]) {
    const tooth = new THREE.Mesh(new RoundedBoxGeometry(0.085, 0.06, 0.05, 3, 0.024), goldBright);
    tooth.position.set(0.06, ty, 0);
    g.add(tooth);
  }
  g.scale.setScalar(0.85);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// Coffre : bois à lattes, couvercle bombé, cerclages dorés, gros cadenas rond.
export function makeChest() {
  const g = new THREE.Group();
  const W = 0.62, D = 0.44, BH = 0.26, R = D / 2;
  const base = new THREE.Mesh(new RoundedBoxGeometry(W, BH, D, 3, 0.03), mats.chest);
  base.position.y = TOP + BH / 2;
  base.castShadow = true;
  g.add(base);
  // lattes (rainures sombres)
  for (const ly of [0.08, 0.17]) {
    const groove = new THREE.Mesh(new THREE.BoxGeometry(W + 0.002, 0.012, D + 0.002), mats.woodDark);
    groove.position.y = TOP + ly;
    g.add(groove);
  }
  // cerclages dorés : coins, ceinture et base
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const post = new THREE.Mesh(new RoundedBoxGeometry(0.07, BH + 0.02, 0.07, 2, 0.025), goldBright);
    post.position.set(sx * (W / 2 - 0.02), TOP + BH / 2, sz * (D / 2 - 0.02));
    g.add(post);
  }
  const belt = new THREE.Mesh(new RoundedBoxGeometry(W + 0.05, 0.065, D + 0.05, 2, 0.025), goldBright);
  belt.position.y = TOP + BH - 0.03;
  const foot = new THREE.Mesh(new RoundedBoxGeometry(W + 0.03, 0.04, D + 0.03, 2, 0.015), goldBright);
  foot.position.y = TOP + 0.02;
  g.add(belt, foot);
  // couvercle bombé (demi-cylindre) : pivot à l'arrière
  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, TOP + BH, -R);
  const arc = (r) => { const sh = new THREE.Shape(); sh.moveTo(-r, 0); sh.absarc(0, 0, r, Math.PI, 0, true); sh.lineTo(-r, 0); return sh; };
  const mkArch = (r, depth, mat) => {
    const geo = new THREE.ExtrudeGeometry(arc(r), { depth, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 2, curveSegments: 14 });
    geo.translate(0, 0, -depth / 2).rotateY(Math.PI / 2);
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    return m;
  };
  const lidWood = mkArch(R - 0.005, W - 0.02, mats.chest);
  const lid = new THREE.Group();
  lid.position.set(0, 0, R);
  lid.add(lidWood);
  for (const sx of [-1, 1]) {
    const band = mkArch(R + 0.012, 0.06, goldBright);
    band.position.x = sx * (W / 2 - 0.03);
    lid.add(band);
  }
  const mid = mkArch(R + 0.012, 0.05, goldBright);
  lid.add(mid);
  lidPivot.add(lid);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), new THREE.MeshBasicMaterial({ color: 0xfff2a0, transparent: true, opacity: 0 }));
  glow.position.y = TOP + 0.34;
  g.add(lidPivot, glow);
  // cadenas rond doré (disque + anse en tore), devant
  const lock = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.05, 20).rotateX(Math.PI / 2), goldBright);
  const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.018, 8, 16, Math.PI), goldBright);
  shackle.position.y = 0.075;
  const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.02, 8).rotateX(Math.PI / 2), mats.dark);
  hole.position.z = 0.026;
  lock.add(disc, shackle, hole);
  lock.position.set(0, TOP + 0.2, D / 2 + 0.03);
  lock.userData.y0 = TOP + 0.2;
  g.add(lock);
  g.userData = { lidPivot, glow, lock };
  return g;
}

function box(w, h, d, mat, r = 0.05) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat);
  m.castShadow = true;
  return m;
}

// Robot : l'avant est +Z local. Groupes : root (position/lacet) > squash > parts.
export function makeRobot() {
  const root = new THREE.Group();
  const squash = new THREE.Group();
  root.add(squash);

  const feet = new THREE.Group();
  for (const sx of [-0.15, 0.15]) {
    const foot = box(0.16, 0.12, 0.26, mats.dark, 0.05);
    foot.position.set(sx, 0.06, 0.02);
    feet.add(foot);
  }
  const torso = new THREE.Group(); // pivot pour se pencher
  torso.position.y = 0.12;
  const body = box(0.5, 0.36, 0.4, mats.body, 0.09);
  body.position.y = 0.2;
  const badge = box(0.16, 0.12, 0.03, mats.white, 0.02);
  badge.position.set(0, 0.2, 0.21);
  const light = box(0.07, 0.07, 0.03, mats.red, 0.02);
  light.position.set(0, 0.2, 0.23);
  torso.add(body, badge, light);

  const head = new THREE.Group();
  head.position.y = 0.42;
  const skull = box(0.44, 0.3, 0.38, mats.head, 0.09);
  skull.position.y = 0.17;
  head.add(skull);
  for (const sx of [-0.1, 0.1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 12), mats.white);
    eye.position.set(sx, 0.2, 0.17);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 10), mats.dark);
    pupil.position.set(sx, 0.2, 0.225);
    head.add(eye, pupil);
  }
  const mouth = box(0.14, 0.03, 0.02, mats.dark, 0.01);
  mouth.position.set(0, 0.08, 0.195);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.14, 8), mats.dark);
  stem.position.y = 0.39;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), mats.red);
  ball.position.y = 0.47;
  head.add(mouth, stem, ball);
  torso.add(head);

  const arms = [];
  for (const sx of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx * 0.31, 0.34, 0);
    const arm = box(0.1, 0.26, 0.1, mats.limb, 0.04);
    arm.position.y = -0.11;
    pivot.add(arm);
    torso.add(pivot);
    arms.push(pivot);
  }
  squash.add(feet, torso);
  root.userData = { squash, torso, head, armL: arms[0], armR: arms[1], ball };
  return root;
}

export function makeQuestionSprite() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.font = 'bold 100px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 12;
  g.strokeStyle = '#ffffff';
  g.strokeText('?', 64, 70);
  g.fillStyle = '#ff5c8a';
  g.fillText('?', 64, 70);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  s.scale.set(0.42, 0.42, 0.42);
  s.visible = false;
  return s;
}
