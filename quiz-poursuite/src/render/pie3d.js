import * as THREE from 'three';
import { CATEGORIES } from '../logic/categories.js';
import { ease, tween } from './anim.js';

const GREY = '#c9ced8';

// Camembert central : la part k est orientée vers le quartier k de l'anneau.
export function createPie3D(scene) {
  const group = new THREE.Group();
  group.position.y = 0.15;
  scene.add(group);
  const wedges = [];
  const mats = [];
  for (let k = 0; k < 6; k++) {
    const start = Math.PI - k * (Math.PI / 3) - Math.PI / 6 + 0.02;
    const geo = new THREE.CylinderGeometry(3.1, 3.1, 0.3, 24, 1, false, start, Math.PI / 3 - 0.04);
    const mat = new THREE.MeshStandardMaterial({ color: GREY, roughness: 0.5 });
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    wedges.push(m);
    mats.push(mat);
  }
  return {
    group,
    setParts(parts) {
      parts.forEach((got, k) => {
        mats[k].color.set(got ? CATEGORIES[k].couleur : GREY);
        wedges[k].position.y = 0;
        wedges[k].scale.set(1, 1, 1);
      });
    },
    // Animation « pop » quand une part est gagnée
    async pop(k) {
      mats[k].color.set(CATEGORIES[k].couleur);
      const m = wedges[k];
      await tween(450, (t) => {
        const s = Math.sin(t * Math.PI);
        m.position.y = 0.9 * s;
        m.scale.set(1 + 0.12 * s, 1 + 0.5 * s, 1 + 0.12 * s);
      }, ease.outQuad);
      m.position.y = 0;
      m.scale.set(1, 1, 1);
    },
  };
}
