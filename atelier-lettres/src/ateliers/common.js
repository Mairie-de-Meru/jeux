// Entrée pointeur commune aux ateliers 2 et 3 : tap (sélection) et glisser-déposer sur le plan z = 0.
import * as THREE from 'three';
import { tileFromHit } from '../tiles.js';

export function createInput(stage, { tiles, draggable = () => true, onTap, onDrop, onDrag }) {
  const cv = stage.canvas;
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshBasicMaterial({ visible: false }));
  plane.userData.shared = true;
  plane.geometry.userData.shared = true;
  let st = null;

  function world(e) {
    const h = stage.pick(e, [plane], false)[0];
    // coordonnées locales à root (root peut être décalé en y)
    return h ? { x: h.point.x - stage.root.position.x, y: h.point.y - stage.root.position.y } : null;
  }
  function down(e) {
    const hit = stage.pick(e, tiles(), true)[0];
    const tile = hit && tileFromHit(hit);
    if (!tile) return;
    const p = world(e);
    st = { tile, id: e.pointerId, cx: e.clientX, cy: e.clientY, moved: false, ox: p ? tile.position.x - p.x : 0, oy: p ? tile.position.y - p.y : 0 };
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* id synthétique */ }
  }
  function move(e) {
    if (!st) return;
    if (!st.moved && Math.hypot(e.clientX - st.cx, e.clientY - st.cy) > 14 && draggable(st.tile)) {
      st.moved = true;
      st.tile.position.z = 0.7;
    }
    if (st.moved) {
      const p = world(e);
      if (p) {
        st.tile.position.x = p.x + st.ox;
        st.tile.position.y = p.y + st.oy;
        if (onDrag) onDrag(st.tile);
      }
    }
  }
  function up(e) {
    if (!st) return;
    const s = st;
    st = null;
    if (s.moved) onDrop(s.tile, world(e));
    else onTap(s.tile);
  }
  return {
    attach() {
      cv.addEventListener('pointerdown', down);
      cv.addEventListener('pointermove', move);
      cv.addEventListener('pointerup', up);
      cv.addEventListener('pointercancel', up);
    },
    detach() {
      cv.removeEventListener('pointerdown', down);
      cv.removeEventListener('pointermove', move);
      cv.removeEventListener('pointerup', up);
      cv.removeEventListener('pointercancel', up);
      st = null;
    },
    world,
  };
}

export const clientOf = (stage, tile) => stage.project(stage.root.localToWorld(tile.position.clone()));
