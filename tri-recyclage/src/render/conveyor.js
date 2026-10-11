import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const BELT_Y = 0.5;     // dessus de la bande
export const BELT_HALF = 6.7;  // demi-longueur

export function createConveyor() {
  const group = new THREE.Group();

  // Bande avec chevrons défilants
  const c = document.createElement('canvas');
  c.width = 128; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#4a4f5c';
  g.fillRect(0, 0, 128, 64);
  g.fillStyle = '#5d6373';
  g.fillRect(0, 0, 64, 64);
  g.strokeStyle = '#8b92a6';
  g.lineWidth = 6;
  g.beginPath(); g.moveTo(40, 8); g.lineTo(70, 32); g.lineTo(40, 56); g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(BELT_HALF * 2 / 1.6, 1);
  const beltMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 });
  const belt = new THREE.Mesh(new THREE.BoxGeometry(BELT_HALF * 2, 0.1, 1.5), beltMat);
  belt.position.y = BELT_Y - 0.05;
  belt.receiveShadow = true;
  group.add(belt);

  // Châssis et rails
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xff8a3d, roughness: 0.5 });
  const frameGeo = new RoundedBoxGeometry(BELT_HALF * 2 + 0.6, 0.35, 0.22, 3, 0.08);
  for (const z of [-0.85, 0.85]) {
    const rail = new THREE.Mesh(frameGeo, frameMat);
    rail.position.set(0, BELT_Y - 0.12, z);
    rail.castShadow = true; rail.receiveShadow = true;
    group.add(rail);
  }
  const under = new THREE.Mesh(new RoundedBoxGeometry(BELT_HALF * 2, 0.2, 1.5, 3, 0.06), new THREE.MeshStandardMaterial({ color: 0x353945, roughness: 0.9 }));
  under.position.y = BELT_Y - 0.25;
  group.add(under);

  // Pieds
  const legGeo = new RoundedBoxGeometry(0.4, 0.8, 1.7, 3, 0.1);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.7 });
  for (const x of [-5.4, 0, 5.4]) {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(x, BELT_Y - 0.65, 0);
    leg.castShadow = true;
    group.add(leg);
  }

  // Rouleaux d'extrémité (tournent)
  const rollerGeo = new THREE.CylinderGeometry(0.3, 0.3, 1.5, 20);
  rollerGeo.rotateX(Math.PI / 2);
  const rollerMat = new THREE.MeshStandardMaterial({ color: 0xc4c9d6, roughness: 0.4, metalness: 0.2 });
  const stripeGeo = new THREE.BoxGeometry(0.1, 0.62, 1.52);
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0x4a4f5c });
  const rollers = [];
  for (const x of [-BELT_HALF, BELT_HALF]) {
    const r = new THREE.Mesh(rollerGeo, rollerMat);
    r.position.set(x, BELT_Y - 0.3, 0);
    r.add(new THREE.Mesh(stripeGeo, stripeMat));
    r.castShadow = true;
    group.add(r);
    rollers.push(r);
  }

  function update(dt, speed) {
    tex.offset.x -= (speed * dt) / 1.6;
    for (const r of rollers) r.rotation.z -= (speed * dt) / 0.3;
  }
  return { group, update };
}
