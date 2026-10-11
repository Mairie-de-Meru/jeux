import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { ease, tween } from './anim.js';

const PATTERNS = {
  1: [[0.5, 0.5]],
  2: [[0.25, 0.25], [0.75, 0.75]],
  3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
  4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
  5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
  6: [[0.25, 0.22], [0.75, 0.22], [0.25, 0.5], [0.75, 0.5], [0.25, 0.78], [0.75, 0.78]],
};
// Ordre des matériaux d'une BoxGeometry : +x, -x, +y, -y, +z, -z
const FACE_VALUES = [3, 4, 1, 6, 2, 5];
const FACE_NORMALS = {
  3: new THREE.Vector3(1, 0, 0), 4: new THREE.Vector3(-1, 0, 0),
  1: new THREE.Vector3(0, 1, 0), 6: new THREE.Vector3(0, -1, 0),
  2: new THREE.Vector3(0, 0, 1), 5: new THREE.Vector3(0, 0, -1),
};

function faceMaterial(v) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#fffaf0';
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = v === 1 ? '#e8423f' : '#2b2f45';
  for (const [x, y] of PATTERNS[v]) {
    g.beginPath();
    g.arc(x * 128, y * 128, v === 1 ? 20 : 13, 0, Math.PI * 2);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4 });
}

export const DICE_Y = 1.2;

export function createDice3D(scene) {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(1.3, 1.3, 1.3, 4, 0.18), FACE_VALUES.map(faceMaterial));
  mesh.position.set(0, DICE_Y, 0);
  mesh.castShadow = true;
  mesh.userData.isDice = true;
  scene.add(mesh);

  function finalQuat(v, yaw) {
    const q = new THREE.Quaternion().setFromUnitVectors(FACE_NORMALS[v], new THREE.Vector3(0, 1, 0));
    const qy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    return qy.multiply(q);
  }
  mesh.quaternion.copy(finalQuat(1, 0.5));

  return {
    mesh,
    // Culbute puis orientation sur la face `value` (déjà tirée par la logique)
    async roll(value) {
      const target = finalQuat(value, Math.random() * Math.PI * 2);
      const axis = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.6 + 0.2, Math.random() - 0.5).normalize();
      const spins = 2 + Math.floor(Math.random() * 2);
      const tmp = new THREE.Quaternion();
      await tween(800, (t) => {
        tmp.setFromAxisAngle(axis, (1 - t) * spins * Math.PI * 2);
        mesh.quaternion.copy(tmp).multiply(target);
        mesh.position.y = DICE_Y + 1.8 * Math.sin(Math.PI * Math.min(1, t * 1.15)) * (1 - 0.3 * t);
      }, ease.outQuad);
      mesh.quaternion.copy(target);
      mesh.position.y = DICE_Y;
    },
    // Petite pulsation pour inviter à taper dessus
    idle(time, active) {
      const s = active ? 1 + 0.07 * Math.sin(time * 5) : 1;
      mesh.scale.set(s, s, s);
    },
  };
}
