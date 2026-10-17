// Effets visuels : poussière d'atterrissage, étincelles, confettis, billets volants, barreaux, carte qui se retourne.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { drawNote, breakdown } from './textures.mjs';

const mkTex = (size, draw) => { const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
const texPuff = mkTex(64, (g, s) => { const r = g.createRadialGradient(s / 2, s / 2, 2, s / 2, s / 2, s / 2); r.addColorStop(0, 'rgba(255,255,255,.95)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, s, s); });
const texStar = mkTex(64, (g, s) => { g.fillStyle = '#ffd23f'; g.strokeStyle = '#fff'; g.lineWidth = 4; g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5; const r = k % 2 ? s * 0.2 : s * 0.46; g.lineTo(s / 2 + Math.cos(a) * r, s / 2 + Math.sin(a) * r); } g.closePath(); g.fill(); g.stroke(); });
const texSquare = mkTex(16, (g, s) => { g.fillStyle = '#fff'; g.fillRect(0, 0, s, s); });
const noteTex = {};
const noteTexture = (v) => noteTex[v] ||= (() => { const c = document.createElement('canvas'); c.width = 160; c.height = 80; drawNote(c.getContext('2d'), v, 4, 4, 152, 72); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const COLORS = ['#e5424f', '#ffd23f', '#3fb86a', '#3b78e0', '#ff9a2e', '#f276b0'];
const barGeo = new THREE.CylinderGeometry(0.045, 0.045, 1.3, 8);
const barMat = new THREE.MeshStandardMaterial({ color: '#39445c', roughness: 0.5, metalness: 0.4 });
const cardGeo = new RoundedBoxGeometry(1.5, 0.04, 1.05, 2, 0.05);

export function createFx(scene, tween) {
  const spr = (tex, color) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, color: color || 0xffffff })); scene.add(s); return s; };
  const drop = (s) => { scene.remove(s); s.material.dispose(); };

  function puff(x, z) {
    const ps = [0, 1, 2, 3].map((k) => { const s = spr(texPuff); const a = k * Math.PI / 2 + 0.5; s.userData = { a }; s.position.set(x, 0.3, z); return s; });
    return tween(380, (t) => ps.forEach((s) => {
      const a = s.userData.a; s.position.set(x + Math.cos(a) * t * 0.55, 0.28 + t * 0.2, z + Math.sin(a) * t * 0.55);
      s.scale.setScalar(0.3 + t * 0.5); s.material.opacity = (1 - t) * 0.8; if (t >= 1) drop(s);
    }));
  }
  function burst(x, z, { tex, count, speed, life, colors, size }) {
    const ps = Array.from({ length: count }, (_, k) => {
      const s = spr(tex, colors ? colors[k % colors.length] : null); const a = Math.random() * Math.PI * 2; const v = speed * (0.5 + Math.random() * 0.7);
      s.userData = { vx: Math.cos(a) * v, vz: Math.sin(a) * v, vy: 3 + Math.random() * 4, spin: Math.random() * 4 };
      s.position.set(x, 0.5, z); s.scale.setScalar(size); return s;
    });
    return tween(life, (t) => ps.forEach((s) => {
      const u = s.userData; const sec = t * life / 1000;
      s.position.set(x + u.vx * sec, Math.max(0.2, 0.5 + u.vy * sec - 5 * sec * sec * 1.2), z + u.vz * sec);
      s.material.opacity = Math.min(1, (1 - t) * 2.2); s.material.rotation = u.spin * sec;
      if (t >= 1) drop(s);
    }));
  }
  const sparkles = (x, z) => burst(x, z, { tex: texStar, count: 14, speed: 2.2, life: 900, size: 0.55 });
  const confetti = (x, z) => burst(x, z, { tex: texSquare, count: 44, speed: 3.2, life: 1400, colors: COLORS, size: 0.22 });

  // billets de banque qui volent d'un point à un autre
  function notes(from, to, amount) {
    const list = breakdown(amount).flatMap(([v, n]) => Array(Math.min(n, 2)).fill(v)).slice(0, 4);
    if (!list.length) return Promise.resolve();
    const sprites = list.map((v) => { const s = spr(noteTexture(v)); s.scale.set(1.0, 0.5, 1); s.visible = false; return s; });
    const stag = 0.16; const total = 800;
    return tween(total, (t) => sprites.forEach((s, k) => {
      const u = Math.min(1, Math.max(0, (t - k * stag * 0.8) / (1 - (sprites.length - 1) * stag * 0.8)));
      if (t >= 1) { drop(s); return; }
      s.visible = u > 0 && u < 1;
      const e = u * u * (3 - 2 * u);
      s.position.set(from.x + (to.x - from.x) * e, 0.8 + Math.sin(u * Math.PI) * 2.2 + (to.y - from.y) * e, from.z + (to.z - from.z) * e);
      const sq = 1 + 0.25 * Math.sin(u * Math.PI); s.scale.set(1.0 * sq, 0.5 / sq, 1); s.material.rotation = Math.sin(u * 9 + k) * 0.35;
    }));
  }

  // barreaux qui tombent autour d'un pion
  async function bars(x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    const bs = Array.from({ length: 8 }, (_, k) => { const b = new THREE.Mesh(barGeo, barMat); const a = k / 8 * Math.PI * 2; b.position.set(Math.cos(a) * 0.62, 4, Math.sin(a) * 0.62); g.add(b); return b; });
    await tween(520, (t) => bs.forEach((b, k) => { const u = Math.min(1, Math.max(0, t * 1.4 - k * 0.04)); b.position.y = 0.68 + (1 - u * u) * 3.4 + (u >= 1 ? Math.sin(t * 40) * 0.02 : 0); }));
    await tween(500, (t) => { if (t >= 1) scene.remove(g); });
  }

  // carte qui quitte la pioche, se retourne et grandit
  async function flyCard(from, to, color) {
    const front = new THREE.MeshStandardMaterial({ color: '#fffdf2' }); const back = new THREE.MeshStandardMaterial({ color });
    const m = new THREE.Mesh(cardGeo, [back, back, back, front, back, back]); m.castShadow = true; scene.add(m);
    await tween(750, (t) => {
      const e = t * t * (3 - 2 * t);
      m.position.set(from.x + (to.x - from.x) * e, 0.5 + Math.sin(Math.min(1, t * 1.2) * Math.PI * 0.5) * 2.2 + e * 0.6, from.z + (to.z - from.z) * e);
      m.rotation.set(-e * 0.5, 0, e * Math.PI); // retournement : la face apparaît
      m.scale.setScalar(1 + e * 1.4);
      if (t >= 1) { scene.remove(m); front.dispose(); back.dispose(); }
    });
  }
  return { puff, sparkles, confetti, notes, bars, flyCard };
}
