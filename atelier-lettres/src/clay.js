// Lettre 3D « pâte à modeler » : tubes le long des traits, sphères aux extrémités.
import * as THREE from 'three';
import { pathLength, resample } from './logic/trace.js';

const R = 0.13;

export function createClay(glyph, toLocal, color, map) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, map: map || null });
  const sph = new THREE.SphereGeometry(R, 20, 14);
  const bigSph = new THREE.SphereGeometry(R * 1.3, 20, 14);
  const addSphere = (geo, v) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(v);
    m.castShadow = true;
    group.add(m);
  };
  for (const stroke of glyph.strokes) {
    if (pathLength(stroke) < 0.03) {
      addSphere(bigSph, toLocal(stroke[0].x, stroke[0].y));
      continue;
    }
    const n = Math.min(64, Math.max(10, Math.round(pathLength(stroke) * 40)));
    const pts = [];
    for (const p of resample(stroke, n)) {
      const v = toLocal(p.x, p.y);
      if (!pts.length || pts[pts.length - 1].distanceTo(v) > 1e-4) pts.push(v);
    }
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, pts.length * 3, R, 12, false), mat);
    tube.castShadow = true;
    group.add(tube);
    addSphere(sph, pts[0]);
    addSphere(sph, pts[pts.length - 1]);
  }
  return group;
}
