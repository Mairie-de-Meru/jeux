import * as THREE from 'three';
import { clamp } from './logic/ease.js';

const FLOAT_COUNT = 36;
const BURST_COUNT = 18;
const BURST_LIFE = 1.2;

// Petite étoile à 4 branches, dessinée une fois et partagée.
function starTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.8)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  for (let k = 0; k < 8; k++) {
    const r = k % 2 ? 7 : 32;
    const a = (k * Math.PI) / 4;
    ctx.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r);
  }
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function points(count, size, map) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  const mat = new THREE.PointsMaterial({
    size, map, vertexColors: true, transparent: true, depthWrite: false, alphaTest: 0.02,
  });
  const obj = new THREE.Points(geo, mat);
  obj.frustumCulled = false;
  return obj;
}

// Paillettes qui flottent autour du livre + gerbe d'étoiles quand une page se pose.
export function createSparkles(scene) {
  const map = starTexture();
  const float = points(FLOAT_COUNT, 0.28, map);
  const burst = points(BURST_COUNT, 0.4, map);
  burst.visible = false;
  scene.add(float, burst);

  // Tirées autour du livre, jamais au-dessus des pages (le texte reste lisible).
  const seeds = Array.from({ length: FLOAT_COUNT }, () => {
    // Sur les côtés ou derrière : vue en perspective, une paillette posée devant monterait sur la page.
    const side = Math.random() < 0.5;
    const x = side ? (Math.random() < 0.5 ? -1 : 1) * (1.75 + Math.random() * 0.9) : (Math.random() - 0.5) * 4.6;
    const z = side ? (Math.random() - 0.5) * 2.4 : -1.25 - Math.random() * 0.8;
    return { x, z, speed: 0.08 + Math.random() * 0.12, phase: Math.random() * Math.PI * 2 };
  });
  const vel = Array.from({ length: BURST_COUNT }, () => new THREE.Vector3());
  let burstStart = -1;
  const palette = [new THREE.Color('#ffd93b'), new THREE.Color('#ffb703'), new THREE.Color('#ff5d8f')];

  function setColor(hex) {
    const base = new THREE.Color(hex).lerp(new THREE.Color('#ffffff'), 0.25);
    const col = float.geometry.attributes.color;
    for (let k = 0; k < FLOAT_COUNT; k++) {
      const c = k % 2 === 0 ? palette[0] : base;
      col.setXYZ(k, c.r, c.g, c.b);
    }
    col.needsUpdate = true;
  }
  setColor('#ffd93b');

  function pop(x, y, z, time) {
    const pos = burst.geometry.attributes.position;
    const col = burst.geometry.attributes.color;
    for (let k = 0; k < BURST_COUNT; k++) {
      const a = (k / BURST_COUNT) * Math.PI * 2 + Math.random() * 0.3;
      vel[k].set(Math.cos(a) * (0.6 + Math.random() * 0.6), 1 + Math.random() * 0.8, Math.sin(a) * 0.5);
      pos.setXYZ(k, x, y, z);
      const c = palette[k % palette.length];
      col.setXYZ(k, c.r, c.g, c.b);
    }
    col.needsUpdate = true;
    burstStart = time;
    burst.visible = true;
  }

  // t : temps en secondes, dt : pas en secondes.
  function update(t, dt) {
    const pos = float.geometry.attributes.position;
    seeds.forEach((s, k) => {
      const y = ((t * s.speed + s.phase) % 1.6) + 0.05;
      pos.setXYZ(k, s.x + Math.sin(t * 0.7 + s.phase) * 0.15, y, s.z + Math.cos(t * 0.5 + s.phase) * 0.1);
    });
    pos.needsUpdate = true;
    float.material.opacity = 0.75 + Math.sin(t * 2.3) * 0.2;

    if (burstStart < 0) return;
    const age = t - burstStart;
    if (age > BURST_LIFE) {
      burst.visible = false;
      burstStart = -1;
      return;
    }
    const bp = burst.geometry.attributes.position;
    for (let k = 0; k < BURST_COUNT; k++) {
      vel[k].y -= 2.2 * dt;
      bp.setXYZ(k, bp.getX(k) + vel[k].x * dt, bp.getY(k) + vel[k].y * dt, bp.getZ(k) + vel[k].z * dt);
    }
    bp.needsUpdate = true;
    burst.material.opacity = 1 - clamp(age / BURST_LIFE) ** 2;
  }

  return { setColor, pop, update };
}
