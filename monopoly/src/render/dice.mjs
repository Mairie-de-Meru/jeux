// Deux dés blancs à points sombres.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { pipsCanvas } from './textures.mjs';

const FACE_ORDER = [3, 4, 1, 6, 2, 5]; // +x -x +y -y +z -z
const Q = (axis, a) => new THREE.Quaternion().setFromAxisAngle(axis, a);
const X = new THREE.Vector3(1, 0, 0); const Y = new THREE.Vector3(0, 1, 0); const Z = new THREE.Vector3(0, 0, 1);
const TOP = { 1: Q(X, 0), 6: Q(X, Math.PI), 3: Q(Z, Math.PI / 2), 4: Q(Z, -Math.PI / 2), 2: Q(X, -Math.PI / 2), 5: Q(X, Math.PI / 2) };

export function createDice() {
  const mats = FACE_ORDER.map((n) => new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(pipsCanvas(n)), roughness: 0.4 }));
  const group = new THREE.Group();
  const dice = [0, 1].map((k) => {
    const d = new THREE.Mesh(new RoundedBoxGeometry(0.95, 0.95, 0.95, 4, 0.16), mats);
    d.castShadow = true; d.position.set(k ? 0.9 : -0.9, 0.5, 1.6); group.add(d); return d;
  });
  group.visible = false;
  return {
    group, dice,
    // orientation finale montrant la valeur v sur le dessus
    quatFor(v, yaw) { return Q(Y, yaw).multiply(TOP[v]); },
  };
}
