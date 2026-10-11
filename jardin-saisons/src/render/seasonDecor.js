import * as THREE from 'three';
import { mulberry32 } from '../logic/rng.js';
import { SEASON_INFO } from '../logic/seasons.js';
import { mat, PLOT_POS } from './scene.js';
import { lerp } from './ease.js';

const dummy = new THREE.Object3D();

function inst(geo, material, count, place, parent) {
  const m = new THREE.InstancedMesh(geo, material, count);
  for (let i = 0; i < count; i++) {
    dummy.position.set(0, 0, 0); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1);
    place(dummy, i);
    dummy.updateMatrix();
    m.setMatrixAt(i, dummy.matrix);
  }
  m.castShadow = false; m.receiveShadow = false;
  parent.add(m);
  return m;
}

// Décor par saison : chaque groupe grossit (0 → 1) quand sa saison est active.
export function createSeasonDecor(garden, tree) {
  const rng = mulberry32(2024);
  const groups = {};
  const mk = (name) => { const g = new THREE.Group(); g.scale.setScalar(0.001); g.visible = false; groups[name] = { g, cur: 0, tgt: 0 }; return g; };

  const onGround = (d, i, margin = 0) => {
    // hors du carré de terre et de l'arbre
    let x, z, tries = 0;
    do { x = (rng() - 0.5) * 9.6; z = (rng() - 0.5) * 6.4; tries++; }
    while (tries < 20 && (Math.abs(x - PLOT_POS.x) < 1.9 && Math.abs(z - PLOT_POS.z) < 1.9 || Math.hypot(x - tree.position.x, z - tree.position.z) < 0.9));
    d.position.set(x, margin, z);
  };

  // Printemps : fleurs au sol + fleurs roses sur l'arbre
  const flowers = mk('fleurs-sol'); garden.add(flowers);
  const petalGeo = new THREE.SphereGeometry(0.11, 10, 8);
  const colors = ['#ff6fa8', '#ffd23f', '#ffffff', '#b784ff'];
  colors.forEach((c, ci) => {
    inst(petalGeo, mat(c), 9, (d, i) => { onGround(d, i, 0.12); d.scale.set(1, 0.8, 1); d.rotation.set(0, 0, 0); }, flowers);
  });
  inst(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 5), mat('#3f9a3a'), 24, (d, i) => { onGround(d, i, 0.05); }, flowers);

  const blossoms = mk('fleurs-arbre'); tree.add(blossoms);
  inst(new THREE.SphereGeometry(0.13, 10, 8), mat('#ff9fc4'), 40, (d, i) => {
    const a = rng() * Math.PI * 2, r = 0.7 + rng() * 1.0, y = 2.6 + (rng() - 0.3) * 1.4;
    d.position.set(Math.cos(a) * r * 0.95, y, Math.sin(a) * r * 0.9); d.scale.setScalar(0.7 + rng() * 0.7);
  }, blossoms);

  // Été : fruits rouges dans l'arbre + tournesols au sol
  const fruits = mk('fruits'); tree.add(fruits);
  inst(new THREE.SphereGeometry(0.17, 12, 10), mat('#e8383d'), 14, (d, i) => {
    const a = rng() * Math.PI * 2, r = 0.9 + rng() * 0.6, y = 2.2 + rng() * 1.2;
    d.position.set(Math.cos(a) * r, y, Math.sin(a) * r * 0.9); d.scale.setScalar(1);
  }, fruits);
  const sunflowers = mk('tournesols'); garden.add(sunflowers);
  inst(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 6), mat('#3f9a3a'), 6, (d, i) => { onGround(d, i, 0.3); }, sunflowers);
  const sfPos = []; // positions des tiges, réutilisées pour les têtes
  for (let i = 0; i < 6; i++) { const m = new THREE.Matrix4(); sunflowers.children[0].getMatrixAt(i, m); sfPos.push(new THREE.Vector3().setFromMatrixPosition(m)); }
  inst(new THREE.CylinderGeometry(0.22, 0.22, 0.07, 14), mat('#ffc928'), 6, (d, i) => { d.position.copy(sfPos[i]).y += 0.34; d.rotation.set(Math.PI / 2.6, 0, 0); d.scale.setScalar(1); }, sunflowers);

  // Automne : feuilles rousses au sol
  const leaves = mk('feuilles-sol'); garden.add(leaves);
  const leafGeo = new THREE.CircleGeometry(0.17, 7);
  ['#e8782a', '#d1452b', '#f2b134', '#a8531f'].forEach((c) => {
    inst(leafGeo, new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, side: THREE.DoubleSide }), 16, (d, i) => {
      onGround(d, i, 0.03 + rng() * 0.02); d.rotation.set(-Math.PI / 2, 0, rng() * 6.28); d.scale.setScalar(0.8 + rng() * 0.7);
    }, leaves);
  });

  // Hiver : neige sur l'arbre et sur le carré de terre
  const snowTree = mk('neige-arbre'); tree.add(snowTree);
  const snowMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 });
  [[-1.0, 2.7, 0.1, 0.34], [0.9, 2.85, 0, 0.36], [0, 3.4, 0, 0.3], [-0.3, 3.0, 0.5, 0.26], [0.4, 2.5, -0.5, 0.28]].forEach(([x, y, z, s]) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), snowMat); m.position.set(x, y, z); m.scale.set(s * 1.5, s * 0.7, s * 1.3); snowTree.add(m);
  });
  const snowGround = mk('neige-sol'); garden.add(snowGround);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), snowMat);
  cap.scale.set(1.3, 0.12, 1.3); cap.position.set(PLOT_POS.x, 0.26, PLOT_POS.z); snowGround.add(cap);
  [[-4, 2.4, 0.8], [3.8, -1.8, 0.6], [4, 2.6, 0.7], [-1.4, -2.7, 0.7], [1.5, -2.5, 0.5]].forEach(([x, z, s]) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), snowMat); m.position.set(x, 0.05, z); m.scale.set(s, s * 0.35, s); snowGround.add(m);
  });

  const which = {
    printemps: ['fleurs-sol', 'fleurs-arbre'], ete: ['fruits', 'tournesols'],
    automne: ['feuilles-sol'], hiver: ['neige-arbre', 'neige-sol'],
  };
  function setSeason(s, instant = false) {
    for (const [k, v] of Object.entries(groups)) {
      v.tgt = which[s].includes(k) ? 1 : 0;
      if (instant) { v.cur = v.tgt; apply(v); }
    }
  }
  function apply(v) {
    v.g.visible = v.cur > 0.01;
    v.g.scale.setScalar(Math.max(v.cur, 0.001));
  }
  function update(dt) {
    const k = 1 - Math.exp(-dt * 4);
    for (const v of Object.values(groups)) {
      if (Math.abs(v.cur - v.tgt) > 0.002) { v.cur = lerp(v.cur, v.tgt, k); apply(v); }
    }
  }
  void SEASON_INFO;
  return { setSeason, update };
}
