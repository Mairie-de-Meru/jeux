import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CATEGORIES } from '../logic/categories.js';
import { BOARD_SIZE } from '../logic/board.js';
import { emojiSprite, emojiTexture } from './textures.js';

export const RING_R = 6;

export function tilePos(i) {
  const a = (i * 2 * Math.PI) / BOARD_SIZE;
  return new THREE.Vector3(RING_R * Math.sin(a), 0, -RING_R * Math.cos(a));
}
export function tileTop(board, i) {
  return board[i].type === 'quartier' ? 0.6 : 0.3;
}

export function createBoard3D(scene, board) {
  const group = new THREE.Group();
  scene.add(group);
  const geoNormal = new RoundedBoxGeometry(1.8, 0.3, 1.6, 3, 0.08);
  const geoQuartier = new RoundedBoxGeometry(1.8, 0.6, 1.6, 3, 0.1);
  const geoGlow = new RoundedBoxGeometry(2.15, 0.2, 1.95, 2, 0.08);
  const mats = CATEGORIES.map((c) => new THREE.MeshStandardMaterial({ color: c.couleur, roughness: 0.45 }));
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
  const arrowMat = new THREE.SpriteMaterial({ map: emojiTexture('👇'), transparent: true, depthWrite: false });

  const tiles = [];
  const pickables = [];
  board.forEach((c, i) => {
    const p = tilePos(i);
    const a = (i * 2 * Math.PI) / BOARD_SIZE;
    const q = c.type === 'quartier';
    const mesh = new THREE.Mesh(q ? geoQuartier : geoNormal, mats[c.cat]);
    mesh.position.set(p.x, q ? 0.3 : 0.15, p.z);
    mesh.rotation.y = -a;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.index = i;
    group.add(mesh);
    pickables.push(mesh);

    const glow = new THREE.Mesh(geoGlow, glowMat);
    glow.position.set(p.x, 0.1, p.z);
    glow.rotation.y = -a;
    glow.visible = false;
    glow.userData.index = i;
    group.add(glow);
    pickables.push(glow);

    const arrow = new THREE.Sprite(arrowMat);
    arrow.scale.set(1, 1, 1);
    arrow.position.set(p.x, tileTop(board, i) + 1.6, p.z);
    arrow.visible = false;
    group.add(arrow);

    if (q) {
      const icon = emojiSprite(CATEGORIES[c.cat].icone, 1.0);
      icon.position.set(p.x, 1.25, p.z);
      group.add(icon);
    }
    tiles.push({ mesh, glow, arrow, baseArrowY: tileTop(board, i) + 1.6 });
  });

  let reachable = [];
  return {
    group,
    pickables,
    setReachable(dests) {
      reachable = dests || [];
      tiles.forEach((t, i) => {
        const on = reachable.includes(i);
        t.glow.visible = on;
        t.arrow.visible = on;
      });
    },
    update(time) {
      glowMat.opacity = 0.55 + 0.45 * Math.sin(time * 6);
      for (const i of reachable) {
        const t = tiles[i];
        t.arrow.position.y = t.baseArrowY + 0.15 * Math.sin(time * 6);
        t.mesh.scale.y = 1 + 0.08 * Math.sin(time * 6);
      }
    },
    resetPulse() {
      tiles.forEach((t) => { t.mesh.scale.y = 1; });
    },
  };
}
