import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { dur, easeOut } from '../timing.js';

const PIPS = {
  1: [[0.5, 0.5]],
  2: [[0.28, 0.28], [0.72, 0.72]],
  3: [[0.28, 0.28], [0.5, 0.5], [0.72, 0.72]],
  4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
  5: [[0.28, 0.28], [0.72, 0.28], [0.5, 0.5], [0.28, 0.72], [0.72, 0.72]],
  6: [[0.28, 0.24], [0.72, 0.24], [0.28, 0.5], [0.72, 0.5], [0.28, 0.76], [0.72, 0.76]],
};
// Ordre des faces de BoxGeometry : +x, -x, +y, -y, +z, -z (faces opposées : somme 7).
const FACE_VALUES = [3, 4, 1, 6, 2, 5];

function faceTexture(v, bg, pip) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 128, 128);
  g.fillStyle = pip;
  for (const [x, y] of PIPS[v]) { g.beginPath(); g.arc(x * 128, y * 128, v === 1 ? 20 : 13, 0, Math.PI * 2); g.fill(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Orientation qui place la face v vers le haut (+y).
function faceUp(v) {
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  switch (v) {
    case 1: e.set(0, 0, 0); break;
    case 6: e.set(Math.PI, 0, 0); break;
    case 3: e.set(0, 0, Math.PI / 2); break;
    case 4: e.set(0, 0, -Math.PI / 2); break;
    case 2: e.set(-Math.PI / 2, 0, 0); break;
    default: e.set(Math.PI / 2, 0, 0);
  }
  return q.setFromEuler(e);
}

export function createDice() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9aa8c8, 1.5));
  const dl = new THREE.DirectionalLight(0xffffff, 1.6);
  dl.position.set(2, 6, 3);
  scene.add(dl);
  const geo = new RoundedBoxGeometry(1.2, 1.2, 1.2, 4, 0.2);
  const looks = [['#fffaf0', '#d62828'], ['#eaf2ff', '#1d4ed8']];
  const dice = looks.map(([bg, pip]) => {
    const mats = FACE_VALUES.map((v) => new THREE.MeshStandardMaterial({ map: faceTexture(v, bg, pip), roughness: 0.45 }));
    const mesh = new THREE.Mesh(geo, mats);
    scene.add(mesh);
    return { mesh, value: 1, anim: null, base: new THREE.Vector3(), q: faceUp(1) };
  });
  let count = 1, invite = false, aspect = 1;

  function layout(a) {
    aspect = a;
    const along = 1.8;
    const spanHalf = ((count - 1) * along) / 2 + 0.85;
    const wide = a >= 1;
    dice.forEach((d, i) => {
      const off = (i - (count - 1) / 2) * along;
      d.base.set(wide ? off : 0, 0.6, wide ? 0 : off);
      d.mesh.visible = i < count;
    });
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    const halfW = wide ? spanHalf : 1.05;
    const halfH = wide ? 1.45 : spanHalf * 0.95 + 1.0;
    const D = Math.max(halfH / t, halfW / (t * a)) * 1.12;
    camera.aspect = a;
    camera.position.set(0, D * 0.93, D * 0.37);
    camera.lookAt(0, 0.5, 0);
    camera.updateProjectionMatrix();
  }
  function setCount(n) { count = n; layout(aspect); setValues(new Array(n).fill(1)); }
  function setValues(vals) {
    vals.forEach((v, i) => { dice[i].value = v; dice[i].q = faceUp(v); dice[i].mesh.quaternion.copy(dice[i].q); dice[i].mesh.position.copy(dice[i].base); });
  }
  function roll(values, pace = 1) {
    return new Promise((resolve) => {
      let pending = values.length;
      values.forEach((v, i) => {
        const d = dice[i];
        const yaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (Math.random() - 0.5) * 0.8);
        d.value = v;
        d.q = yaw.multiply(faceUp(v));
        const axis = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.4 + 0.3, Math.random() - 0.5).normalize();
        d.anim = { t0: performance.now(), d: dur((1050 + i * 180) * pace), axis, spin: (5 + Math.random() * 2) * Math.PI, done: () => { if (--pending === 0) resolve(); } };
      });
    });
  }
  const tmp = new THREE.Quaternion();
  function update(now) {
    dice.forEach((d, i) => {
      if (i >= count) return;
      if (d.anim) {
        const a = d.anim;
        const u = a.d <= 1 ? 1 : Math.min(1, (now - a.t0) / a.d);
        const e = easeOut(u);
        tmp.setFromAxisAngle(a.axis, (1 - e) * a.spin);
        d.mesh.quaternion.copy(tmp).multiply(d.q);
        d.mesh.position.copy(d.base);
        d.mesh.position.y += Math.abs(Math.sin(u * Math.PI * 2.2)) * 1.1 * (1 - u) ;
        d.mesh.scale.setScalar(1);
        if (u >= 1) { const f = a.done; d.anim = null; d.mesh.quaternion.copy(d.q); d.mesh.position.copy(d.base); f(); }
      } else {
        const k = invite ? 1 + 0.07 * Math.sin(now / 160 + i) : 1;
        d.mesh.scale.setScalar(k);
        d.mesh.position.copy(d.base);
        if (invite) d.mesh.position.y += 0.12 + 0.1 * Math.sin(now / 200 + i);
      }
    });
  }
  function pulse(i) { dice[i].mesh.scale.setScalar(1.25); }
  layout(1);
  return { scene, camera, layout, setCount, setValues, roll, update, setInvite: (v) => { invite = v; }, pulse, get count() { return count; } };
}
