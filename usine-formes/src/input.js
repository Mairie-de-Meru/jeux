// Pointer events, raycasting, distinction tap / glisser (seuil 8 px).
import * as THREE from 'three';

const THRESHOLD = 8;

export function createInput(canvas, camera) {
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const tmp = new THREE.Vector3();
  let handler = null;
  let st = null;

  function setRay(x, y) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
  }

  const api = {
    setHandler(h) { handler = h; st = null; },
    // Premier objet touché (ou null).
    pick(objects, x, y, recursive = false) {
      setRay(x, y);
      const hits = raycaster.intersectObjects(objects, recursive);
      return hits.length ? hits[0] : null;
    },
    // Tous les objets touchés, du plus proche au plus lointain.
    pickAll(objects, x, y, recursive = false) {
      setRay(x, y);
      return raycaster.intersectObjects(objects, recursive);
    },
    // Point du plan horizontal y = planeY, ou null.
    ground(x, y, planeY, out) {
      setRay(x, y);
      plane.normal.set(0, 1, 0);
      plane.constant = -planeY;
      return raycaster.ray.intersectPlane(plane, out) ? out : null;
    },
    // Point du plan vertical z = planeZ.
    wall(x, y, planeZ, out) {
      setRay(x, y);
      plane.normal.set(0, 0, 1);
      plane.constant = -planeZ;
      return raycaster.ray.intersectPlane(plane, out) ? out : null;
    },
    // Projette un point monde vers des pixels CSS.
    project(v3) {
      camera.updateMatrixWorld();
      const r = canvas.getBoundingClientRect();
      tmp.copy(v3).project(camera);
      return { x: Math.round(r.left + ((tmp.x + 1) / 2) * r.width), y: Math.round(r.top + ((1 - tmp.y) / 2) * r.height) };
    },
  };

  canvas.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    st = { id: e.pointerId, sx: e.clientX, sy: e.clientY, dragging: false };
    if (handler && handler.down) handler.down({ x: e.clientX, y: e.clientY });
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!st || e.pointerId !== st.id) return;
    if (!st.dragging && Math.hypot(e.clientX - st.sx, e.clientY - st.sy) > THRESHOLD) st.dragging = true;
    if (handler && handler.move) handler.move({ x: e.clientX, y: e.clientY, dragging: st.dragging });
  });
  const end = (e) => {
    if (!st || e.pointerId !== st.id) return;
    const s = st;
    st = null;
    if (handler && handler.up) handler.up({ x: e.clientX, y: e.clientY, dragging: s.dragging, cancelled: e.type === 'pointercancel' });
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  return api;
}
