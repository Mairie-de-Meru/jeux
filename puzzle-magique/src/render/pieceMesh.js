// Pièces 3D : ExtrudeGeometry depuis le contour, UV = position plateau (recadrage « cover »).
import * as THREE from 'three';

export const DEPTH = 0.18;
const BEVEL = 0.03;
export const FRONT_Z = DEPTH + BEVEL;

const SIDE_COLORS = [0xff6b6b, 0xffb347, 0xffd93d, 0x6bcb77, 0x4d96ff, 0xb983ff, 0xff7eb6, 0x2ec4b6];

export function coverFactors(cols, rows, imgAspect) {
  const A = cols / rows;
  return { ku: Math.min(1, A / imgAspect), kv: Math.min(1, imgAspect / A) };
}

export function makeSideMaterials() {
  return SIDE_COLORS.map((color) => new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0 }));
}
export function makeFaceMaterial(texture) {
  return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.5, metalness: 0 });
}

export function createPieceGeometry(piece, { cols, rows, imgAspect }) {
  const shape = new THREE.Shape();
  piece.outline.forEach(([x, y], i) => (i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)));
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: DEPTH, steps: 1, curveSegments: 1,
    bevelEnabled: true, bevelThickness: BEVEL, bevelSize: 0.02, bevelOffset: -0.02, bevelSegments: 2,
  });
  const { ku, kv } = coverFactors(cols, rows, imgAspect);
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  const g0 = geo.groups.find((g) => g.materialIndex === 0);
  if (g0) {
    for (let i = g0.start; i < g0.start + g0.count; i++) {
      const x = pos.getX(i) + piece.target[0], y = pos.getY(i) + piece.target[1];
      uv.setXY(i, 0.5 + (x / cols - 0.5) * ku, 0.5 + (y / rows - 0.5) * kv);
    }
    uv.needsUpdate = true;
  }
  return geo;
}

export function createPieceMesh(piece, geo, faceMat, sideMats) {
  const mesh = new THREE.Mesh(geo, [faceMat, sideMats[piece.id % sideMats.length]]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData = { id: piece.id, restZ: 0 };
  return mesh;
}
