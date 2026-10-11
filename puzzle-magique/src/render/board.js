// Plateau : cadre, silhouette fantôme, contours, halo d'indice, révélation finale.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { coverFactors, FRONT_Z } from './pieceMesh.js';

function haloTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 8, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,230,120,0.95)'); gr.addColorStop(0.6, 'rgba(255,200,60,0.55)'); gr.addColorStop(1, 'rgba(255,200,60,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function coverPlane(cols, rows, imgAspect) {
  const geo = new THREE.PlaneGeometry(cols, rows);
  const { ku, kv } = coverFactors(cols, rows, imgAspect);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.5 + (uv.getX(i) - 0.5) * ku, 0.5 + (uv.getY(i) - 0.5) * kv);
  geo.translate(cols / 2, rows / 2, 0);
  return geo;
}

export function createBoard(puzzle, texture, imgAspect) {
  const { cols, rows, pieces } = puzzle;
  const group = new THREE.Group();
  const disposables = [];
  const track = (o) => { disposables.push(o); return o; };

  const frameGeo = track(new RoundedBoxGeometry(cols + 0.7, rows + 0.7, 0.1, 3, 0.14));
  const frame = new THREE.Mesh(frameGeo, track(new THREE.MeshStandardMaterial({ color: 0xffe9c4, emissive: 0xf0d3a0, emissiveIntensity: 0.55, roughness: 0.8 })));
  frame.position.set(cols / 2, rows / 2, -0.16);
  frame.receiveShadow = true;
  group.add(frame);

  const ghostGeo = track(coverPlane(cols, rows, imgAspect));
  const ghostMat = track(new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.2, depthWrite: false }));
  const ghost = new THREE.Mesh(ghostGeo, ghostMat);
  ghost.position.z = -0.1;
  group.add(ghost);

  // contours de toutes les pièces
  const verts = [];
  for (const p of pieces) {
    const o = p.outline, n = o.length;
    for (let i = 0; i < n; i++) {
      const a = o[i], b = o[(i + 1) % n];
      verts.push(a[0] + p.target[0], a[1] + p.target[1], 0, b[0] + p.target[0], b[1] + p.target[1], 0);
    }
  }
  const lineGeo = track(new THREE.BufferGeometry());
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  const lines = new THREE.LineSegments(lineGeo, track(new THREE.LineBasicMaterial({ color: 0x6b5b95, transparent: true, opacity: 0.55 })));
  lines.position.z = -0.09;
  group.add(lines);

  // halo + contour d'indice
  const halo = new THREE.Mesh(track(new THREE.PlaneGeometry(1.8, 1.8)),
    track(new THREE.MeshBasicMaterial({ map: track(haloTexture()), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
  halo.position.z = 0.35;
  halo.visible = false;
  halo.renderOrder = 5;
  group.add(halo);
  let hintLine = null;
  const hintMat = track(new THREE.LineBasicMaterial({ color: 0xffd400, transparent: true, depthTest: false }));

  let full = null;

  return {
    group,
    showHint(piece) {
      halo.position.x = piece.target[0]; halo.position.y = piece.target[1];
      halo.visible = true;
      if (hintLine) { group.remove(hintLine); hintLine.geometry.dispose(); }
      const pts = piece.outline.map(([x, y]) => new THREE.Vector3(x + piece.target[0], y + piece.target[1], 0.02));
      hintLine = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), hintMat);
      hintLine.renderOrder = 6;
      group.add(hintLine);
    },
    hideHint() {
      halo.visible = false;
      if (hintLine) { group.remove(hintLine); hintLine.geometry.dispose(); hintLine = null; }
    },
    update(t) {
      if (halo.visible) {
        const s = 1 + 0.12 * Math.sin(t * 6);
        halo.scale.set(s, s, 1);
        halo.material.opacity = 0.65 + 0.3 * Math.sin(t * 6);
        if (hintLine) hintMat.opacity = 0.6 + 0.4 * Math.sin(t * 6);
      }
    },
    // image complète par-dessus les pièces (fondu), contours masqués
    reveal(duration, tweenFn) {
      this.hideHint();
      lines.visible = false;
      if (!full) {
        const mat = track(new THREE.MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false, opacity: duration ? 0 : 1 }));
        full = new THREE.Mesh(track(coverPlane(cols, rows, imgAspect)), mat);
        full.position.z = FRONT_Z + 0.004;
        group.add(full);
      }
      const mat = full.material;
      if (!duration) mat.opacity = 1;
      else tweenFn(duration, (e) => { mat.opacity = e; });
    },
    dispose() { disposables.forEach((d) => d.dispose && d.dispose()); if (hintLine) hintLine.geometry.dispose(); },
  };
}
