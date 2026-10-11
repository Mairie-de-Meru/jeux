import * as THREE from 'three';

// Décor procédural (construit une seule fois) : ciel, lac sous le plateau, prairie peinte (2D) et décorations 3D, nuages, soleil.
// Pas d'ombres portées, géométries et matériaux partagés.

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const HORIZON = 0xcdeef6;

function skyTexture() {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#5db8f5');
  grad.addColorStop(0.35, '#9bdcf5');
  grad.addColorStop(0.5, '#cdeef6');
  grad.addColorStop(1, '#cdeef6');
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}


// Sol 2D : prairie peinte (tuile répétable, 1024 px).
function meadowTexture(rand) {
  const S = 1024;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#7fd04a';
  g.fillRect(0, 0, S, S);
  // dessine un motif en le répétant sur les bords (tuile sans couture)
  const wrap = (x, y, r, fn) => {
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
      if (x + ox + r < 0 || x + ox - r > S || y + oy + r < 0 || y + oy - r > S) continue;
      fn(x + ox, y + oy);
    }
  };
  const blob = (x, y, r, col, a) => wrap(x, y, r, (px, py) => {
    g.globalAlpha = a; g.fillStyle = col;
    g.beginPath(); g.ellipse(px, py, r, r * (0.6 + rand() * 0.3), rand() * 3, 0, Math.PI * 2); g.fill();
  });
  const tones = ['#72c946', '#8fdc55', '#68bf42', '#9be860', '#7ccf4c'];
  for (let i = 0; i < 70; i++) blob(rand() * S, rand() * S, 40 + rand() * 110, tones[i % tones.length], 0.35);
  for (let i = 0; i < 28; i++) blob(rand() * S, rand() * S, 25 + rand() * 60, '#a4ee80', 0.28);
  // chemin de terre sinueux (même hauteur aux deux bords : sans couture)
  g.globalAlpha = 1;
  g.lineCap = 'round'; g.lineJoin = 'round';
  const path = (w, col, dy) => {
    g.strokeStyle = col; g.lineWidth = w;
    g.beginPath();
    for (let x = -20; x <= S + 20; x += 16) {
      const y = 760 + dy + Math.sin((x / S) * Math.PI * 2) * 80 + Math.sin((x / S) * Math.PI * 6) * 18;
      if (x === -20) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
  };
  path(74, '#d9bf86', 0);
  path(56, '#ecd9a4', 0);
  // brins d'herbe
  for (let i = 0; i < 1800; i++) {
    const x = rand() * S, y = rand() * S;
    g.globalAlpha = 0.5;
    g.strokeStyle = rand() < 0.5 ? '#5aad3c' : '#a8ee70';
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rand() - 0.5) * 6, y - 5 - rand() * 7); g.stroke();
  }
  // petites fleurs
  const cols = ['#ffffff', '#ffe14d', '#b58cff', '#ffe14d', '#ffffff', '#c9a3ff'];
  g.globalAlpha = 1;
  for (let i = 0; i < 90; i++) {
    const x = rand() * S, y = rand() * S;
    const col = cols[i % cols.length];
    wrap(x, y, 10, (px, py) => {
      g.fillStyle = col;
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        g.beginPath(); g.arc(px + Math.cos(a) * 3.4, py + Math.sin(a) * 3.4, 2.6, 0, Math.PI * 2); g.fill();
      }
      g.fillStyle = '#ffd23d';
      g.beginPath(); g.arc(px, py, 2.4, 0, Math.PI * 2); g.fill();
    });
  }
  g.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

const lam = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, ...extra });
const M = {
  sand: lam(0xf3d98e),
  dirt: lam(0x9a6a3f),
  hillA: lam(0x7fcf55),
  hillB: lam(0x66c04c),
  hillC: lam(0x95dc62),
  mount: lam(0x74b88a),
  snow: lam(0xffffff),
  rockM: lam(0xaab2bd),
  rockD: lam(0x8e98a6),
  trunk: lam(0x8a5a32),
  leafA: lam(0x8fd14f),
  leafB: lam(0x7ed321),
  leafC: lam(0xa5dc5a),
  pine: lam(0x2a9a55),
  bush: lam(0x5cc14a),
  white: lam(0xffffff),
  yellow: lam(0xffd93d),
  cream: lam(0xf8efd8),
  capRed: lam(0xff4d3d),
  wall: lam(0xfdeccb),
  roofA: lam(0xe8603c),
  roofB: lam(0xe0574a),
  wood: lam(0x8a5a35),
  glass: lam(0xbfe8ff),
  stem: lam(0x3fa84a),
  petal: lam(0xffffff),
  center: lam(0xffd23d),
  tuft: lam(0x5fc24d),
  cloud: new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xd5d9de }),
  sun: new THREE.MeshBasicMaterial({ color: 0xfff1a8, fog: false }),
  water: new THREE.MeshStandardMaterial({ color: 0x3fc3f0, roughness: 0.25 }),
};

const G = {
  sphere: new THREE.SphereGeometry(1, 12, 9),
  hill: new THREE.SphereGeometry(1, 16, 10),
  cone: new THREE.ConeGeometry(1, 1, 9),
  mount: new THREE.ConeGeometry(1, 1, 7),
  trunk: new THREE.CylinderGeometry(0.06, 0.09, 1, 7),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 8),
  cap: new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
  rock: new THREE.IcosahedronGeometry(1, 1),
  box: new THREE.BoxGeometry(1, 1, 1),
  roof: new THREE.ConeGeometry(1, 1, 4).rotateY(Math.PI / 4),
  stem: new THREE.CylinderGeometry(0.01, 0.014, 1, 4).translate(0, 0.5, 0),
  tuft: new THREE.ConeGeometry(0.04, 0.16, 4).translate(0, 0.08, 0),
};

const mesh = (geo, mat, sx = 1, sy = sx, sz = sx, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(geo, mat);
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  return m;
};

// Arbre rond : ~1,3 à 1,6 de haut pour s = 1.
function roundTree(s, mat) {
  const p = new THREE.Group();
  p.add(mesh(G.trunk, M.trunk, 1.5 * s, 0.7 * s, 1.5 * s, 0, 0.35 * s, 0));
  p.add(mesh(G.sphere, mat, 0.52 * s, 0.5 * s, 0.52 * s, 0, 0.98 * s, 0));
  p.add(mesh(G.sphere, mat, 0.3 * s, 0.28 * s, 0.3 * s, 0.26 * s, 0.7 * s, 0.1 * s));
  return p;
}

// Sapin : 3 cônes empilés, ~1,7 de haut pour s = 1.
function pineTree(s) {
  const p = new THREE.Group();
  p.add(mesh(G.trunk, M.trunk, 1.4 * s, 0.35 * s, 1.4 * s, 0, 0.17 * s, 0));
  p.add(mesh(G.cone, M.pine, 0.5 * s, 0.6 * s, 0.5 * s, 0, 0.62 * s, 0));
  p.add(mesh(G.cone, M.pine, 0.4 * s, 0.55 * s, 0.4 * s, 0, 0.98 * s, 0));
  p.add(mesh(G.cone, M.pine, 0.28 * s, 0.5 * s, 0.28 * s, 0, 1.33 * s, 0));
  return p;
}

// Buisson rond avec de petites fleurs jaunes, ~0,4 pour s = 1.
function bushObj(s) {
  const p = new THREE.Group();
  p.add(mesh(G.sphere, M.bush, 0.25 * s, 0.2 * s, 0.25 * s, 0, 0.16 * s, 0));
  p.add(mesh(G.sphere, M.bush, 0.17 * s, 0.15 * s, 0.17 * s, 0.2 * s, 0.11 * s, 0.07 * s));
  p.add(mesh(G.sphere, M.bush, 0.15 * s, 0.14 * s, 0.15 * s, -0.18 * s, 0.1 * s, -0.05 * s));
  for (const [x, y, z] of [[0.08, 0.3, 0.12], [-0.1, 0.27, 0.1], [0.22, 0.2, 0.15], [-0.2, 0.17, 0.08]]) {
    p.add(mesh(G.sphere, M.yellow, 0.03 * s, 0.03 * s, 0.03 * s, x * s, y * s, z * s));
  }
  return p;
}

// Champignon rouge à pois blancs, ~0,25.
function mushroom(s) {
  const p = new THREE.Group();
  p.add(mesh(G.cyl, M.cream, 0.04 * s, 0.1 * s, 0.04 * s, 0, 0.05 * s, 0));
  p.add(mesh(G.cap, M.capRed, 0.11 * s, 0.09 * s, 0.11 * s, 0, 0.09 * s, 0));
  p.add(mesh(G.sphere, M.white, 0.02 * s, 0.012 * s, 0.02 * s, 0.04 * s, 0.175 * s, 0.03 * s));
  p.add(mesh(G.sphere, M.white, 0.016 * s, 0.01 * s, 0.016 * s, -0.045 * s, 0.16 * s, -0.02 * s));
  p.add(mesh(G.sphere, M.white, 0.016 * s, 0.01 * s, 0.016 * s, 0.0, 0.18 * s, -0.05 * s));
  return p;
}

// Rocher gris arrondi, ~0,25.
function rockObj(s) {
  const p = new THREE.Group();
  p.add(mesh(G.rock, M.rockM, 0.22 * s, 0.16 * s, 0.19 * s, 0, 0.07 * s, 0));
  p.add(mesh(G.rock, M.rockD, 0.11 * s, 0.08 * s, 0.1 * s, 0.2 * s, 0.03 * s, 0.07 * s));
  return p;
}

// Petite maison crème à toit orangé, ~1,2 de haut.
function house(roofMat) {
  const p = new THREE.Group();
  p.add(mesh(G.box, M.wall, 1.0, 0.65, 0.8, 0, 0.325, 0));
  p.add(mesh(G.roof, roofMat, 1.15, 0.55, 1.0, 0, 0.92, 0));
  p.add(mesh(G.box, M.wood, 0.2, 0.34, 0.04, 0.0, 0.17, 0.41));
  p.add(mesh(G.box, M.glass, 0.18, 0.18, 0.04, 0.3, 0.4, 0.41));
  p.add(mesh(G.box, M.glass, 0.18, 0.18, 0.04, -0.3, 0.4, 0.41));
  p.add(mesh(G.box, M.wall, 0.14, 0.32, 0.14, 0.3, 1.1, -0.15));
  return p;
}

function cloud(rand) {
  const c = new THREE.Group();
  const n = 4 + Math.floor(rand() * 2);
  for (let i = 0; i < n; i++) {
    const s = 2.2 + rand() * 1.6 - Math.abs(i - n / 2) * 0.25;
    c.add(mesh(G.sphere, M.cloud, s, s * 0.7, s, (i - n / 2) * 2.4, rand() * 0.8, (rand() - 0.5) * 1.2));
  }
  return c;
}

const GROUND_Y = -0.34; // dessus du socle de prairie
const WATER_Y = -0.42; // sous la prairie : l'eau n'est visible que par le trou du lac
const FAR_Y = -1.5; // sol lointain
const PLINTH_H = 0.6;
const BANK_W = 0.5;
const LAKE_M = 0.7; // marge d'eau autour des cases

// Contour de rectangle arrondi à bord ondulé (points), `grow` = décalage vers l'extérieur.
function organicOutline(hw, hh, r, amp, phase) {
  const pts = [];
  const corners = [[hw - r, hh - r, 0], [-(hw - r), hh - r, Math.PI / 2], [-(hw - r), -(hh - r), Math.PI], [hw - r, -(hh - r), Math.PI * 1.5]];
  let s = 0;
  const N = 10;
  for (const [cx, cy, a0] of corners) {
    for (let k = 0; k <= N; k++) {
      const a = a0 + (k / N) * (Math.PI / 2);
      const nx = Math.cos(a), ny = Math.sin(a);
      const d = amp * (0.55 + 0.45 * Math.sin(s * 0.9 + phase) * Math.cos(s * 0.37 + phase * 2));
      pts.push([cx + nx * (r + d), cy + ny * (r + d)]);
      s += (r * Math.PI) / (2 * N) * 1.0 + 0.12;
    }
    // arête vers le coin suivant : points intermédiaires
    const a1 = a0 + Math.PI / 2;
    const [ncx, ncy] = corners[(corners.findIndex((c) => c[2] === a0) + 1) % 4];
    const ex = cx + Math.cos(a1) * r, ey = cy + Math.sin(a1) * r;
    const fx = ncx + Math.cos(a1) * r, fy = ncy + Math.sin(a1) * r;
    const len = Math.hypot(fx - ex, fy - ey);
    const m = Math.max(0, Math.floor(len / 0.5));
    for (let k = 1; k <= m; k++) {
      const t = k / (m + 1);
      s += len / (m + 1);
      const d = amp * (0.55 + 0.45 * Math.sin(s * 0.9 + phase) * Math.cos(s * 0.37 + phase * 2));
      pts.push([ex + (fx - ex) * t + Math.cos(a1) * d, ey + (fy - ey) * t + Math.sin(a1) * d]);
    }
  }
  return pts;
}

const shapeOf = (pts) => {
  const sh = new THREE.Shape();
  pts.forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y)));
  sh.closePath();
  return sh;
};

function roundedRectShape(w, h, r) {
  const x = -w / 2, y = -h / 2;
  const s = new THREE.Shape();
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

export function buildDecor(scene) {
  const rand0 = rng(20261010);
  const decor = new THREE.Group();

  // dôme de ciel (suit la caméra), même mappage pour une image équirectangulaire
  const skyMat = new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false, depthWrite: false });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(350, 24, 16), skyMat);
  sky.renderOrder = -1;
  decor.add(sky);

  // texture peinte de la prairie (tuile de 24 unités)
  const TILE = 24;
  const tex = meadowTexture(rng(777));
  tex.repeat.set(1200 / TILE, 1200 / TILE);
  const farGround = new THREE.Mesh(
    new THREE.PlaneGeometry(1200, 1200).rotateX(-Math.PI / 2),
    new THREE.MeshLambertMaterial({ map: tex, color: 0xb4cf9a }),
  );
  farGround.position.y = FAR_Y;
  decor.add(farGround);
  const topTex = tex.clone();
  topTex.needsUpdate = true;
  topTex.repeat.set(1 / TILE, 1 / TILE);
  const topMat = new THREE.MeshLambertMaterial({ map: topTex });

  // collines douces et montagnes à neige à l'horizon (fixes)
  const hillMats = [M.hillA, M.hillB, M.hillC];
  for (let i = 0; i < 20; i++) {
    const a = rand0() * Math.PI * 2;
    const d = 38 + rand0() * 80;
    const s = 4 + rand0() * 6;
    const h = mesh(G.hill, hillMats[i % 3], s * 1.7, s * 0.55, s * 1.4);
    h.position.set(Math.cos(a) * d, FAR_Y + s * 0.1, Math.sin(a) * d);
    decor.add(h);
  }
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + rand0() * 0.3;
    const d = 130 + rand0() * 40;
    const h = 22 + rand0() * 22;
    const w = 20 + rand0() * 14;
    const m = mesh(G.mount, M.mount, w, h, w, Math.cos(a) * d, FAR_Y + h / 2 - 1, Math.sin(a) * d);
    const cap = mesh(G.mount, M.snow, w * 0.36, h * 0.34, w * 0.36, m.position.x, FAR_Y + h * 0.83 - 1, m.position.z);
    decor.add(m, cap);
  }

  // éléments dépendant du plateau (reconstruits par setBoard)
  const water = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), M.water);
  water.position.y = WATER_Y;
  water.receiveShadow = true;
  const bank = new THREE.Mesh(new THREE.BufferGeometry(), M.sand);
  const plinth = new THREE.Mesh(new THREE.BufferGeometry(), [topMat, M.dirt]);
  const local = new THREE.Group(); // décorations de la scène courante
  decor.add(plinth, bank, water, local);
  let waterBase = null;
  let flowerMeshes = [];

  function setBoard(width, height, center = { x: 0, z: 0 }) {
    const rand = rng(424242 + width * 31 + height * 7);
    // nettoyage
    while (local.children.length) local.remove(local.children[0]);
    for (const m of flowerMeshes) m.dispose();
    flowerMeshes = [];

    const lhw = width / 2 + LAKE_M, lhh = height / 2 + LAKE_M; // lac (demi-dimensions)
    const bhw = lhw + BANK_W, bhh = lhh + BANK_W; // berge
    const pw = Math.max(width + 9, 15), ph = Math.max(height + 8, 12); // socle

    // socle de prairie : dessus peint, tranche de terre brune
    // lac : eau plus large que l'ouverture (bords cachés sous la prairie et la berge)
    const lakePts = organicOutline(lhw - 0.15, lhh - 0.15, 1.0, 0.3, 0.7);
    plinth.geometry.dispose();
    const plinthShape = roundedRectShape(pw, ph, 2.4);
    plinthShape.holes.push(shapeOf(organicOutline(lhw - 0.05, lhh - 0.05, 1.0, 0.3, 0.7).reverse()));
    plinth.geometry = new THREE.ExtrudeGeometry(plinthShape, {
      depth: PLINTH_H, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 2, curveSegments: 8,
    }).rotateX(-Math.PI / 2);
    plinth.position.y = GROUND_Y - PLINTH_H - 0.06; // le biseau dépasse de 0.06 : dessus à GROUND_Y
    water.geometry.dispose();
    water.geometry = new THREE.PlaneGeometry(lhw * 2 + 1, lhh * 2 + 1, Math.round(lhw * 2 * 3), Math.round(lhh * 2 * 3)).rotateX(-Math.PI / 2);
    waterBase = Float32Array.from(water.geometry.attributes.position.array);
    // berge de sable : anneau fin aux contours organiques
    const outer = shapeOf(organicOutline(bhw - 0.2, bhh - 0.2, 1.3, 0.35, 2.1));
    outer.holes.push(shapeOf(lakePts.slice().reverse()));
    bank.geometry.dispose();
    bank.geometry = new THREE.ExtrudeGeometry(outer, { depth: 0.1, bevelEnabled: false, curveSegments: 4 }).rotateX(-Math.PI / 2);
    bank.position.y = GROUND_Y - 0.06;

    // ---- décorations 3D sur le socle ----
    const placed = [];
    const inBank = (x, z, r) => Math.abs(x) < bhw + 0.35 + r && Math.abs(z) < bhh + 0.35 + r;
    const onPlinth = (x, z, r) => Math.abs(x) < pw / 2 - 0.5 - r && Math.abs(z) < ph / 2 - 0.5 - r;
    const frontZone = (x, z) => z > 0 && Math.abs(x) < bhw + 1.6; // devant le plateau : rien de haut
    const free = (x, z, r) => placed.every((q) => (q.x - x) ** 2 + (q.z - z) ** 2 > (q.r + r) ** 2);
    const spot = (r, tall) => {
      for (let t = 0; t < 30; t++) {
        const x = (rand() - 0.5) * pw, z = (rand() - 0.5) * ph;
        if (!onPlinth(x, z, r) || inBank(x, z, r) || !free(x, z, r)) continue;
        if (tall && frontZone(x, z)) continue;
        placed.push({ x, z, r });
        return { x, z };
      }
      return null;
    };
    const put = (obj, x, z) => {
      obj.position.set(x, GROUND_Y, z);
      obj.rotation.y = rand() * Math.PI * 2;
      local.add(obj);
    };
    const scatter = (n, r, tall, make) => {
      for (let i = 0; i < n; i++) {
        const p = spot(r, tall);
        if (p) put(make(i), p.x, p.z);
      }
    };
    const area = pw * ph - (bhw * 2) * (bhh * 2);
    const cnt = (per) => Math.max(2, Math.round(area / per));

    // maisons : au fond, de part et d'autre
    for (const [sx, sz, roof] of [[-1, -1, M.roofA], [1, -1, M.roofB]]) {
      const x = sx * (pw / 2 - 2.0), z = sz * (ph / 2 - 1.8);
      if (inBank(x, z, 1)) continue;
      placed.push({ x, z, r: 1.0 });
      const h = house(roof);
      h.rotation.y = 0;
      h.position.set(x, GROUND_Y, z);
      h.rotation.y = -sx * 0.4;
      local.add(h);
    }
    scatter(cnt(18), 0.55, true, (i) => roundTree(0.8 + rand() * 0.25, [M.leafA, M.leafB, M.leafC][i % 3]));
    scatter(cnt(26), 0.5, true, () => pineTree(0.85 + rand() * 0.25));
    scatter(cnt(9), 0.35, false, () => bushObj(0.9 + rand() * 0.4));
    scatter(cnt(24), 0.3, false, () => rockObj(0.8 + rand() * 0.6));
    scatter(cnt(30), 0.2, false, () => mushroom(0.9 + rand() * 0.4));

    // fleurs (tige + pétales + coeur) et brins d'herbe : instanciés
    const NF = cnt(1.8), NT = cnt(1.2);
    const pickXZ = (r) => {
      for (let t = 0; t < 20; t++) {
        const x = (rand() - 0.5) * pw, z = (rand() - 0.5) * ph;
        if (onPlinth(x, z, r) && !inBank(x, z, r)) return { x, z };
      }
      return null;
    };
    const petalCols = [0xffd93d, 0xb58cff, 0xffffff, 0xffd93d, 0xc9a3ff].map((c) => new THREE.Color(c));
    const stems = new THREE.InstancedMesh(G.stem, M.stem, NF);
    const heads = new THREE.InstancedMesh(G.sphere, M.petal, NF);
    const hearts = new THREE.InstancedMesh(G.sphere, M.center, NF);
    const tufts = new THREE.InstancedMesh(G.tuft, M.tuft, NT);
    const d = new THREE.Object3D();
    const hide = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < NF; i++) {
      const p = pickXZ(0.1);
      heads.setColorAt(i, petalCols[i % petalCols.length]);
      if (!p) { stems.setMatrixAt(i, hide); heads.setMatrixAt(i, hide); hearts.setMatrixAt(i, hide); continue; }
      const h = 0.13 + rand() * 0.09;
      d.rotation.set(0, 0, 0);
      d.position.set(p.x, GROUND_Y, p.z);
      d.scale.set(1, h, 1);
      d.updateMatrix(); stems.setMatrixAt(i, d.matrix);
      d.position.set(p.x, GROUND_Y + h, p.z);
      d.scale.set(0.055, 0.028, 0.055);
      d.updateMatrix(); heads.setMatrixAt(i, d.matrix);
      d.position.y += 0.012;
      d.scale.set(0.026, 0.016, 0.026);
      d.updateMatrix(); hearts.setMatrixAt(i, d.matrix);
    }
    for (let i = 0; i < NT; i++) {
      const p = pickXZ(0.1);
      if (!p) { tufts.setMatrixAt(i, hide); continue; }
      const sc = 0.8 + rand() * 1.0;
      d.position.set(p.x, GROUND_Y, p.z);
      d.rotation.set(0, rand() * 3, 0);
      d.scale.set(sc, sc, sc);
      d.updateMatrix(); tufts.setMatrixAt(i, d.matrix);
    }
    for (const m of [stems, heads, hearts, tufts]) { m.frustumCulled = false; local.add(m); flowerMeshes.push(m); }
    decor.position.set(center.x, 0, center.z);
  }

  // nuages (dérivent en tournant autour du plateau)
  const clouds = [];
  for (let i = 0; i < 8; i++) {
    const pivot = new THREE.Group();
    const c = cloud(rand0);
    c.position.set(30 + rand0() * 40, 14 + rand0() * 8, 0);
    c.scale.setScalar(0.8 + rand0() * 0.6);
    pivot.add(c);
    pivot.rotation.y = rand0() * Math.PI * 2;
    pivot.userData.speed = 0.004 + rand0() * 0.006;
    decor.add(pivot);
    clouds.push(pivot);
  }

  const sun = new THREE.Mesh(new THREE.SphereGeometry(7, 16, 12), M.sun);
  sun.position.set(-90, 55, -150);
  decor.add(sun);

  scene.add(decor);
  scene.fog = new THREE.Fog(HORIZON, 60, 270);
  scene.background = new THREE.Color(HORIZON);

  setBoard(5, 3);

  return {
    sky, skyMat, water, setBoard,
    update(time, dt, camPos) {
      sky.position.set(camPos.x - decor.position.x, camPos.y, camPos.z - decor.position.z);
      for (const c of clouds) c.rotation.y += c.userData.speed * dt;
      const pos = water.geometry.attributes.position;
      const base = waterBase;
      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3];
        const z = base[i * 3 + 2];
        pos.array[i * 3 + 1] = Math.sin(x * 0.9 + time * 1.4) * 0.025 + Math.cos(z * 0.8 + time * 1.1) * 0.025;
      }
      pos.needsUpdate = true;
    },
  };
}
