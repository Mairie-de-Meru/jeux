import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { BINS } from '../logic/catalog.js';
import { BIN_EMOJI } from '../ui/icons.js';

export const BIN_Z = 3.4;
export const BIN_TOP = 1.3;

const bodyGeo = new RoundedBoxGeometry(1.7, 1.3, 1.4, 4, 0.2);
const lidGeo = new RoundedBoxGeometry(1.85, 0.16, 1.55, 3, 0.07);
const plateGeo = new THREE.PlaneGeometry(1, 1);

function plateTexture(binId) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.beginPath(); g.arc(64, 64, 60, 0, Math.PI * 2); g.fill();
  g.font = '78px serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(BIN_EMOJI[binId] || '', 64, 70);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function shade(hex, f) {
  const c = new THREE.Color(hex);
  return c.multiplyScalar(f);
}

// Poubelle : corps arrondi, couvercle articulé à l'arrière, étiquette-icône sur la face avant.
export function createBin(binId, x) {
  const color = BINS[binId].color;
  const group = new THREE.Group();
  group.position.set(x, 0, BIN_Z);
  group.userData.binId = binId;

  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.45 });
  const lidMat = new THREE.MeshStandardMaterial({ color: shade(color, 0.82), roughness: 0.45 });
  const plateTex = plateTexture(binId);
  const plateMat = new THREE.MeshBasicMaterial({ map: plateTex, transparent: true });

  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.65;
  body.castShadow = true; body.receiveShadow = true;
  group.add(body);

  const pivot = new THREE.Group();
  pivot.position.set(0, BIN_TOP, -0.75);
  const lid = new THREE.Mesh(lidGeo, lidMat);
  lid.position.set(0, 0.06, 0.78);
  lid.castShadow = true;
  pivot.add(lid);
  group.add(pivot);

  const plate = new THREE.Mesh(plateGeo, plateMat);
  plate.scale.setScalar(0.95);
  plate.position.set(0, 0.68, 0.71);
  group.add(plate);

  const state = { open: 0, openTarget: 0, wobble: 0, squashT: 1 };

  function update(dt, time) {
    state.open += (state.openTarget - state.open) * (1 - Math.exp(-14 * dt));
    pivot.rotation.x = -state.open * 1.25;
    if (state.wobble > 0) {
      state.wobble = Math.max(0, state.wobble - dt);
      group.rotation.z = Math.sin(time * 40) * 0.08 * (state.wobble / 0.5);
    } else group.rotation.z = 0;
    if (state.squashT < 1) {
      state.squashT = Math.min(1, state.squashT + dt / 0.35);
      const s = Math.sin(state.squashT * Math.PI * 2) * (1 - state.squashT) * 0.18;
      group.scale.set(1 - s * 0.5, 1 + s, 1 - s * 0.5);
    }
  }

  function dispose() {
    bodyMat.dispose(); lidMat.dispose(); plateMat.dispose(); plateTex.dispose();
  }

  return {
    id: binId, x, group,
    top: new THREE.Vector3(x, BIN_TOP + 0.9, BIN_Z),
    setOpen(v) { state.openTarget = v ? 1 : 0; },
    wobble() { state.wobble = 0.5; },
    bump() { state.squashT = 0; },
    update, dispose,
  };
}

export function layoutBins(ids) {
  const n = ids.length;
  const spacing = n <= 3 ? 2.8 : 2.2;
  return ids.map((id, i) => ({ id, x: (i - (n - 1) / 2) * spacing }));
}
