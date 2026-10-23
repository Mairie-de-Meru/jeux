// Maisons (vertes), hôtels (rouges), pastilles de propriétaire et voile d'hypothèque.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { SPACES } from '../logic/board.mjs';

// échelle des maisons et hôtels (1,15 : plus visibles sur téléphone, restent dans la case)
const BS = 1.15;
const houseBody = new RoundedBoxGeometry(0.36, 0.26, 0.34, 2, 0.05);
const houseRoof = new THREE.ConeGeometry(0.3, 0.2, 4); houseRoof.rotateY(Math.PI / 4);
const hotelBody = new RoundedBoxGeometry(1.2, 0.4, 0.5, 2, 0.08);
const hotelRoof = new THREE.ConeGeometry(0.5, 0.28, 4); hotelRoof.scale(1.25, 1, 0.6); hotelRoof.rotateY(0);
const mGreen = new THREE.MeshStandardMaterial({ color: '#3fb86a', roughness: 0.5 });
const mGreenRoof = new THREE.MeshStandardMaterial({ color: '#23864a', roughness: 0.5 });
const mRed = new THREE.MeshStandardMaterial({ color: '#e5424f', roughness: 0.5 });
const mRedRoof = new THREE.MeshStandardMaterial({ color: '#a8222e', roughness: 0.5 });
const flagGeo = new RoundedBoxGeometry(1.3, 0.12, 0.2, 2, 0.04);
const veilGeo = new THREE.PlaneGeometry(1.7, 2.5);
const veilMat = new THREE.MeshBasicMaterial({ color: '#6b7a90', transparent: true, opacity: 0.55 });

function mkHouse() {
  const g = new THREE.Group();
  const b = new THREE.Mesh(houseBody, mGreen); b.position.y = 0.13; b.castShadow = true;
  const r = new THREE.Mesh(houseRoof, mGreenRoof); r.position.y = 0.36; r.castShadow = true;
  g.add(b, r); g.scale.setScalar(BS); return g;
}
function mkHotel() {
  const g = new THREE.Group();
  const b = new THREE.Mesh(hotelBody, mRed); b.position.y = 0.2; b.castShadow = true;
  const r = new THREE.Mesh(hotelRoof, mRedRoof); r.position.y = 0.54; r.castShadow = true;
  g.add(b, r); g.scale.setScalar(BS); return g;
}

export function createBuildings(tileGroups, tween) {
  const cur = {}; // i -> { houses, owner, mortgaged, objs }
  function clear(i) {
    const c = cur[i]; if (!c) return;
    for (const o of c.objs) o.parent.remove(o);
    c.objs = [];
  }
  function sync(state) {
    for (const sp of SPACES) {
      if (!sp.price) continue;
      const o = state.owners[sp.i]; const i = sp.i;
      const want = o ? { houses: o.houses, owner: o.owner, mortgaged: o.mortgaged } : { houses: 0, owner: -1, mortgaged: false };
      const c = cur[i] || (cur[i] = { houses: -1, owner: -2, mortgaged: null, objs: [] });
      if (c.houses === want.houses && c.owner === want.owner && c.mortgaged === want.mortgaged) continue;
      const grew = want.houses > c.houses && c.houses >= 0;
      clear(i);
      const tg = tileGroups[i];
      if (want.owner >= 0) {
        const f = new THREE.Mesh(flagGeo, new THREE.MeshStandardMaterial({ color: state.players[want.owner].color, roughness: 0.4 }));
        f.position.set(0, 0.22, 1.12); f.castShadow = true; tg.add(f); c.objs.push(f);
        if (c.owner === -1) { f.position.y = 4; tween(520, (k) => { const u = k * k; f.position.y = 0.22 + (1 - u) * 3.8 + (k > 0.8 ? Math.sin((k - 0.8) / 0.2 * Math.PI) * 0.25 : 0); const q = k > 0.85 ? Math.sin((k - 0.85) / 0.15 * Math.PI) * 0.3 : 0; f.scale.set(1 + q, 1 - q, 1 + q); }); }
      }
      if (want.mortgaged) { const v = new THREE.Mesh(veilGeo, veilMat); v.rotation.x = -Math.PI / 2; v.position.y = 0.2; tg.add(v); c.objs.push(v); }
      if (want.houses === 5) {
        const h = mkHotel(); h.position.set(0, 0.17, -1.02); tg.add(h); c.objs.push(h);
        if (grew) { h.scale.setScalar(0.01); tween(350, (k) => h.scale.setScalar(BS * Math.max(0.01, 1 + Math.sin(k * Math.PI) * 0.3) * Math.min(1, k * 3 + 0.01))); }
      } else {
        for (let n = 0; n < want.houses; n++) {
          const h = mkHouse(); h.position.set(-0.66 + n * 0.44, 0.17, -1.02); tg.add(h); c.objs.push(h);
          if (grew && n === want.houses - 1) { h.scale.setScalar(0.01); tween(300, (k) => h.scale.setScalar(BS * Math.max(0.01, k < 1 ? k * (1 + 0.3 * Math.sin(k * Math.PI)) : 1))); }
        }
      }
      Object.assign(c, want);
    }
  }
  return { sync };
}
