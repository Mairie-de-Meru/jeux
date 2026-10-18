// Avatars de pions : le pion 3D du jeu rendu hors écran (un seul renderer partagé), mis en cache par pion+couleur.
import * as THREE from 'three';
import { createPawn, upgradePawn } from './pawns.mjs';
import { avatarKey } from '../logic/seats.mjs';

const SIZE = 128;
const urls = {}; const pending = {};
let gl = null; let failed = false;

function setup() {
  if (gl || failed) return gl;
  try {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1); renderer.setSize(SIZE, SIZE, false); renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb8c4e0, 1.5));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(2, 4, 3); scene.add(sun);
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    gl = { renderer, scene, camera };
  } catch (e) { failed = true; gl = null; }
  return gl;
}

// Cadre le pion : même plongée 3/4, centré, ~88 % de l'image.
const DIR = new THREE.Vector3(1.9, 1.6, 2.2).normalize();
const FILL = 0.88;
function fit(camera, pawn) {
  pawn.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(pawn); const c = box.getCenter(new THREE.Vector3());
  const corners = [];
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) corners.push(new THREE.Vector3(x, y, z));
  const target = c.clone(); let dist = box.getSize(new THREE.Vector3()).length() * 1.5;
  for (let it = 0; it < 6; it++) {
    camera.position.copy(target).addScaledVector(DIR, dist); camera.lookAt(target); camera.updateMatrixWorld(true);
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const v of corners) { const p = v.clone().project(camera); x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
    const half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist;
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0); const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    target.addScaledVector(right, ((x0 + x1) / 2) * half).addScaledVector(up, ((y0 + y1) / 2) * half);
    dist *= Math.max(x1 - x0, y1 - y0) / 2 / FILL;
  }
  camera.position.copy(target).addScaledVector(DIR, dist); camera.lookAt(target);
}
// URL (PNG) du pion rendu, ou null si WebGL est indisponible.
export function pawnAvatarURL(type, color) {
  const key = avatarKey(type, color);
  if (urls[key]) return Promise.resolve(urls[key]);
  return (pending[key] ||= (async () => {
    const g = setup(); if (!g) return null;
    const pawn = createPawn(type, color);
    await upgradePawn(pawn, type, color);
    g.scene.add(pawn); fit(g.camera, pawn); g.renderer.render(g.scene, g.camera);
    const url = g.renderer.domElement.toDataURL('image/png');
    g.scene.remove(pawn);
    pawn.traverse((o) => { if (o.isMesh) { if (!o.userData.sharedGeo) o.geometry.dispose(); o.material.dispose(); } });
    return (urls[key] = url);
  })().catch(() => null));
}
export const peekAvatarURL = (type, color) => urls[avatarKey(type, color)] || null;
