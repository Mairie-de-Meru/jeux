// Entrées pointeur (souris et doigt) : taper ou glisser une pièce du plateau, taper une pièce posée.
export function createInput(canvas, stage, handlers) {
  let drag = null;
  const ghostPos = { x: 0, y: 0.9, z: 3 };

  canvas.addEventListener('pointerdown', (e) => {
    if (handlers.onGesture) handlers.onGesture();
    if (e.button !== undefined && e.button > 0) return;
    if (handlers.isLocked()) return;
    const hit = stage.pick(e.clientX, e.clientY);
    if (!hit) return;
    drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, moved: false, hit, ghost: null };
    try { canvas.setPointerCapture(e.pointerId); } catch { /* ignoré */ }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 8) drag.moved = true;
    if (drag.moved && drag.hit.where === 'tray') {
      if (!drag.ghost) drag.ghost = stage.makeGhost(drag.hit.value);
      const p = stage.planePoint(e.clientX, e.clientY, 0.9);
      if (p) { drag.ghost.position.copy(p); ghostPos.x = p.x; ghostPos.z = p.z; }
    }
  });

  function finish(e, cancelled) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    try { canvas.releasePointerCapture(e.pointerId); } catch { /* ignoré */ }
    stage.removeGhost();
    if (cancelled || handlers.isLocked()) return;
    if (d.hit.where === 'tray') {
      if (d.moved) {
        const p = stage.planePoint(e.clientX, e.clientY, 0);
        if (stage.isOverCounter(p)) handlers.onAdd(d.hit.value, { x: ghostPos.x, y: 0.9, z: ghostPos.z });
        else handlers.onMiss(d.hit.value);
      } else {
        handlers.onAdd(d.hit.value, null);
      }
    } else if (d.hit.where === 'placed' && !d.moved) {
      handlers.onRemove(d.hit.index);
    }
  }
  canvas.addEventListener('pointerup', (e) => finish(e, false));
  canvas.addEventListener('pointercancel', (e) => finish(e, true));
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}
