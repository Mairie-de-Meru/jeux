// Horloge 3D : cadran, graduations, chiffres, deux aiguilles, picking.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { timeToAngles, pointerAngle } from '../logic/clock.js';
import { easeOutElastic, clamp01 } from '../easing.js';

export const FACE_Z = 0.2;
export const MINUTE_LEN = 0.98;
export const HOUR_LEN = 0.62;

function digitTexture(txt) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.font = '800 92px "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#2b3a67';
  g.fillText(txt, 64, 70);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function makeHand(width, len, depth, color, tail) {
  const pivot = new THREE.Group();
  const geo = new RoundedBoxGeometry(width, len + tail, depth, 3, width * 0.45);
  geo.translate(0, (len - tail) / 2, 0);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.05 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  pivot.add(mesh);
  return { pivot, mesh, mat, base: new THREE.Color(color) };
}

export function createClock3D(scene) {
  const group = new THREE.Group();
  group.rotation.set(-0.12, 0.1, 0);
  scene.add(group);

  // Boîtier et lunette
  const back = new THREE.Mesh(
    new THREE.CylinderGeometry(1.42, 1.42, 0.3, 64).rotateX(Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xff7a59, roughness: 0.5 })
  );
  back.castShadow = true;
  back.receiveShadow = true;
  group.add(back);
  const bezel = new THREE.Mesh(
    new THREE.TorusGeometry(1.34, 0.1, 24, 80),
    new THREE.MeshStandardMaterial({ color: 0xffc233, roughness: 0.35, metalness: 0.1 })
  );
  bezel.position.z = 0.14;
  bezel.castShadow = true;
  group.add(bezel);
  // Petites cloches
  const bellMat = new THREE.MeshStandardMaterial({ color: 0xffc233, roughness: 0.4 });
  for (const s of [-1, 1]) {
    const bell = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 16), bellMat);
    bell.scale.set(1, 0.8, 0.7); // sphère pleine aplatie : plus de demi-coque ouverte vue à travers
    bell.position.set(s * 0.95, 1.2, 0);
    bell.rotation.z = -s * 0.7;
    bell.castShadow = true;
    group.add(bell);
  }
  const face = new THREE.Mesh(
    new THREE.CylinderGeometry(1.25, 1.25, 0.06, 64).rotateX(Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xfffdf5, roughness: 0.8 })
  );
  face.position.z = 0.15;
  face.receiveShadow = true;
  group.add(face);

  // Graduations
  const marks = [];
  const markMats = [];
  const smallGeo = new THREE.BoxGeometry(0.025, 0.07, 0.03);
  const bigGeo = new RoundedBoxGeometry(0.07, 0.16, 0.04, 2, 0.02);
  const smallMat = new THREE.MeshStandardMaterial({ color: 0x7c88b4 });
  const bigMat = new THREE.MeshStandardMaterial({ color: 0x2b3a67 });
  for (let i = 0; i < 60; i++) {
    const big = i % 5 === 0;
    const m = new THREE.Mesh(big ? bigGeo : smallGeo, big ? bigMat : smallMat);
    const a = (i / 60) * Math.PI * 2;
    const r = big ? 1.12 : 1.15;
    m.position.set(Math.sin(a) * r, Math.cos(a) * r, 0.19);
    m.rotation.z = -a;
    group.add(m);
    marks.push(m);
    markMats.push(m.material);
  }
  const flashMat = new THREE.MeshStandardMaterial({ color: 0x21c45d, emissive: 0x21c45d, emissiveIntensity: 0.6 });

  // Chiffres
  for (let n = 1; n <= 12; n++) {
    const a = (n / 12) * Math.PI * 2;
    const p = new THREE.Mesh(
      new THREE.PlaneGeometry(0.34, 0.34),
      new THREE.MeshBasicMaterial({ map: digitTexture(String(n)), transparent: true })
    );
    p.position.set(Math.sin(a) * 0.84, Math.cos(a) * 0.84, 0.19);
    group.add(p);
  }

  // Aiguilles
  const minute = makeHand(0.085, MINUTE_LEN, 0.05, 0x2f7bff, 0.16);
  const hour = makeHand(0.14, HOUR_LEN, 0.06, 0xff3b5c, 0.12);
  minute.pivot.position.z = 0.27;
  hour.pivot.position.z = 0.22;
  group.add(hour.pivot, minute.pivot);
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 24, 16),
    new THREE.MeshStandardMaterial({ color: 0xffc233, roughness: 0.3 })
  );
  cap.position.z = 0.29;
  cap.castShadow = true;
  group.add(cap);

  // État d'animation
  let grabbed = null;
  const grow = { minute: 1, hour: 1 };
  let flashIndex = -1, flashT = 0;
  let pulseT = 0;
  let squashT = 1;
  const plane = new THREE.Plane();
  const ray = new THREE.Raycaster();
  const v = new THREE.Vector3();
  const nrm = new THREE.Vector3();

  function setTime(t) {
    const a = timeToAngles(t);
    minute.pivot.rotation.z = -a.minute;
    hour.pivot.rotation.z = -a.hour;
  }

  // ndcX/ndcY dans [-1,1]. Retourne { x, y, angle, r } dans le repère du cadran.
  function dialPoint(ndcX, ndcY, camera) {
    group.updateMatrixWorld(true);
    nrm.set(0, 0, 1).transformDirection(group.matrixWorld);
    v.set(0, 0, 0.27).applyMatrix4(group.matrixWorld);
    plane.setFromNormalAndCoplanarPoint(nrm, v);
    ray.setFromCamera({ x: ndcX, y: ndcY }, camera);
    const hit = ray.ray.intersectPlane(plane, new THREE.Vector3());
    if (!hit) return null;
    group.worldToLocal(hit);
    return { x: hit.x, y: hit.y, angle: pointerAngle(hit.x, hit.y), r: Math.hypot(hit.x, hit.y) };
  }

  function grab(which) { grabbed = which; }
  function flashMark(n) { flashIndex = (n % 12) * 5; flashT = 3.2; }
  function pulseHour() { pulseT = 2.4; }
  function squash() { squashT = 0; }

  function update(dt) {
    for (const k of ['minute', 'hour']) {
      const target = grabbed === k ? 1.35 : 1;
      grow[k] += (target - grow[k]) * Math.min(1, dt * 14);
    }
    let hs = grow.hour;
    if (pulseT > 0) {
      pulseT -= dt;
      hs *= 1 + 0.25 * Math.max(0, Math.sin(pulseT * 9));
      hour.mat.emissive.setRGB(0.6 * Math.max(0, Math.sin(pulseT * 9)), 0, 0);
      if (pulseT <= 0) hour.mat.emissive.setRGB(0, 0, 0);
    }
    minute.mesh.scale.set(grow.minute, 1, grow.minute);
    hour.mesh.scale.set(hs, 1, hs);

    // Graduation qui clignote
    marks.forEach((m, i) => {
      if (i === flashIndex && flashT > 0) return;
      m.material = markMats[i];
      m.scale.setScalar(1);
    });
    if (flashT > 0 && flashIndex >= 0) {
      flashT -= dt;
      const m = marks[flashIndex];
      const on = Math.sin(flashT * 10) > -0.2;
      m.material = on ? flashMat : markMats[flashIndex];
      m.scale.setScalar(on ? 2.4 : 1);
      if (flashT <= 0) { m.material = markMats[flashIndex]; m.scale.setScalar(1); flashIndex = -1; }
    }

    // Squash & stretch du boîtier
    if (squashT < 1) {
      squashT = clamp01(squashT + dt / 0.6);
      const e = 1 - easeOutElastic(squashT);
      group.scale.set(1 + 0.07 * e, 1 - 0.07 * e, 1);
    } else {
      group.scale.set(1, 1, 1);
    }
  }

  return { group, setTime, dialPoint, grab, flashMark, pulseHour, squash, update, radius: 1.55 };
}
