// Ciel : fond dégradé (CSS sur le conteneur), lumières et soleil/lune selon l'heure.
import * as THREE from 'three';
import { skyBlend } from '../logic/day.js';

const PAL = {
  nuit:  { top: '#14173f', bottom: '#3b3f8f', hemiSky: '#6a74d8', hemiGround: '#2a2a55', hemiI: 0.75, dir: '#9fb0ff', dirI: 0.7 },
  matin: { top: '#7fd3ff', bottom: '#ffe6a8', hemiSky: '#cfeeff', hemiGround: '#ffd9a0', hemiI: 1.0, dir: '#fff0c0', dirI: 1.5 },
  midi:  { top: '#35a7ff', bottom: '#b8ecff', hemiSky: '#e6f6ff', hemiGround: '#fff3c2', hemiI: 1.1, dir: '#ffffff', dirI: 1.9 },
  soir:  { top: '#ff8a5c', bottom: '#ffd27a', hemiSky: '#ffd7b0', hemiGround: '#b66a8a', hemiI: 0.95, dir: '#ffb066', dirI: 1.5 },
};

const tmpA = new THREE.Color();
const tmpB = new THREE.Color();
function mix(a, b, k) {
  return tmpA.set(a).lerp(tmpB.set(b), k).clone();
}

export function createSky(scene, container) {
  const hemi = new THREE.HemisphereLight(0xffffff, 0xffffff, 1);
  scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xffffff, 1.5);
  dir.position.set(-2.5, 4, 5);
  dir.castShadow = true;
  dir.shadow.mapSize.set(1024, 1024);
  dir.shadow.radius = 5;
  dir.shadow.bias = -0.0004;
  const sc = dir.shadow.camera;
  sc.left = -2; sc.right = 2; sc.top = 2; sc.bottom = -2; sc.near = 1; sc.far = 14;
  scene.add(dir);

  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 32, 16),
    new THREE.MeshBasicMaterial({ color: 0xffd23c })
  );
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 32, 16),
    new THREE.MeshBasicMaterial({ color: 0xfff1a0, transparent: true, opacity: 0.35 })
  );
  sun.add(halo);
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 32, 16),
    new THREE.MeshBasicMaterial({ color: 0xf4f1ff })
  );
  const crater = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 16, 8),
    new THREE.MeshBasicMaterial({ color: 0xd9d4f0 })
  );
  crater.position.set(0.1, 0.08, 0.27);
  moon.add(crater);
  scene.add(sun, moon);

  let halfW = 3, halfH = 2, z = -3;

  function place(obj, phase) {
    // phase 0..1 : lever -> coucher, arc au-dessus de l'horizon
    const a = phase * Math.PI;
    obj.position.set(-Math.cos(a) * halfW * 0.85, -halfH * 0.55 + Math.sin(a) * halfH * 1.35, z);
  }

  function update(t) {
    const { from, to, k } = skyBlend(t);
    const A = PAL[from], B = PAL[to];
    const top = mix(A.top, B.top, k), bottom = mix(A.bottom, B.bottom, k);
    if (container) {
      container.style.background = `linear-gradient(to bottom, #${top.getHexString()}, #${bottom.getHexString()})`;
    }
    hemi.color.copy(mix(A.hemiSky, B.hemiSky, k));
    hemi.groundColor.copy(mix(A.hemiGround, B.hemiGround, k));
    hemi.intensity = A.hemiI + (B.hemiI - A.hemiI) * k;
    dir.color.copy(mix(A.dir, B.dir, k));
    dir.intensity = A.dirI + (B.dirI - A.dirI) * k;

    const h = (((t % 1440) + 1440) % 1440) / 60;
    // Soleil : 5 h -> 20 h ; lune : 19 h -> 7 h (lendemain)
    const sp = (h - 5) / 15;
    sun.visible = sp >= 0 && sp <= 1;
    if (sun.visible) place(sun, sp);
    const mh = h >= 19 ? h - 19 : h + 5;
    const mp = mh / 12;
    moon.visible = mp >= 0 && mp <= 1;
    if (moon.visible) place(moon, mp);
  }

  function resize(w, h, zPlane) {
    halfW = w; halfH = h; z = zPlane;
  }

  return { update, resize, dir };
}
