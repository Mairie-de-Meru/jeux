// Glisser au doigt / souris : pointer events, raycast sur un plan.
import * as THREE from 'three';

export const LIFT_Z = 0.3;

export function createDrag({ canvas, camera, world, getMeshes, onStart, onMove, onEnd }) {
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const out = new THREE.Vector3();
  let drag = null;

  function setRay(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
    ray.setFromCamera(ndc, camera);
  }
  // point du plan z = zWorld (monde) → coordonnées plateau (repère de `world`)
  function planePoint(e, z) {
    setRay(e);
    plane.constant = -z;
    if (!ray.ray.intersectPlane(plane, out)) return null;
    return world.worldToLocal(out.clone());
  }

  // Repli tactile : pièce libre dont le centre est le plus proche du doigt (tolérance en pixels).
  const tmp = new THREE.Vector3();
  function nearestMesh(meshes, e, tol = 36) {
    const r = canvas.getBoundingClientRect();
    let best = null, bd = tol;
    for (const m of meshes) {
      m.getWorldPosition(tmp).project(camera);
      const d = Math.hypot(r.left + ((tmp.x + 1) / 2) * r.width - e.clientX, r.top + ((1 - tmp.y) / 2) * r.height - e.clientY);
      if (d < bd) { bd = d; best = m; }
    }
    return best;
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (drag) return;
    setRay(e);
    const meshes = getMeshes();
    const hits = ray.intersectObjects(meshes, false);
    const mesh = hits.length ? hits[0].object : nearestMesh(meshes, e);
    if (!mesh) return;
    // les plans sont exprimés dans le repère monde de la scène (pivot sans rotation pendant le jeu)
    const p = planePoint(e, LIFT_Z + world.position.z);
    if (!p) return;
    drag = {
      id: mesh.userData.id, pointerId: e.pointerId, mesh,
      ox: mesh.position.x - p.x, oy: mesh.position.y - p.y,
      sx: mesh.position.x, sy: mesh.position.y, t0: performance.now(), moved: false,
    };
    try { canvas.setPointerCapture(e.pointerId); } catch { /* ignoré */ }
    onStart(drag.id);
    e.preventDefault();
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const p = planePoint(e, LIFT_Z + world.position.z);
    if (!p) return;
    const x = p.x + drag.ox, y = p.y + drag.oy;
    if (Math.hypot(x - drag.sx, y - drag.sy) > 0.15) drag.moved = true;
    onMove(drag.id, { x, y });
  });

  function end(e, cancelled) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const d = drag;
    drag = null;
    try { canvas.releasePointerCapture(e.pointerId); } catch { /* ignoré */ }
    const tap = !d.moved && performance.now() - d.t0 < 600;
    onEnd(d.id, { x: d.mesh.position.x, y: d.mesh.position.y }, { tap, cancelled });
  }
  canvas.addEventListener('pointerup', (e) => end(e, false));
  canvas.addEventListener('pointercancel', (e) => end(e, true));

  return { isDragging: () => (drag ? drag.id : null) };
}
