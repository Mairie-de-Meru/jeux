// Rotation du globe au doigt avec inertie, et visée automatique. Pur.
const PX_TO_RAD = 0.005;
const FRICTION = 2.5;
const MAX_PITCH = 1.2;
const MIN_SPEED = 0.02;
const TWO_PI = Math.PI * 2;

export function createSpin() {
  return { yaw: 0, pitch: 0, vYaw: 0, vPitch: 0, dragging: false, aim: null };
}

export function dragStart(s) {
  s.dragging = true; s.vYaw = 0; s.vPitch = 0; s.aim = null;
}

export function wrapYaw(y) {
  let w = ((y % TWO_PI) + TWO_PI) % TWO_PI; // [0, 2π[
  if (w > Math.PI) w -= TWO_PI;
  return w; // ]-π, π]
}

export function dragMove(s, dx, dy, dt) {
  const ay = dx * PX_TO_RAD, ap = dy * PX_TO_RAD;
  s.yaw = wrapYaw(s.yaw + ay);
  s.pitch = clampPitch(s.pitch + ap);
  if (dt > 0) {
    const k = Math.min(1, dt * 20); // lissage de la vitesse
    s.vYaw += (ay / dt - s.vYaw) * k;
    s.vPitch += (ap / dt - s.vPitch) * k;
  }
}

export function dragEnd(s) {
  s.dragging = false;
}

export function clampPitch(p) {
  return Math.max(-MAX_PITCH, Math.min(MAX_PITCH, p));
}

export function step(s, dt) {
  if (s.dragging) return;
  if (s.aim) { stepAim(s, dt); if (!s.aim) s.yaw = wrapYaw(s.yaw); return; }
  s.yaw = wrapYaw(s.yaw + s.vYaw * dt);
  s.pitch = clampPitch(s.pitch + s.vPitch * dt);
  const f = Math.exp(-FRICTION * dt);
  s.vYaw *= f; s.vPitch *= f;
  if (Math.abs(s.vYaw) < MIN_SPEED) s.vYaw = 0;
  if (Math.abs(s.vPitch) < MIN_SPEED) s.vPitch = 0;
}

// Cible yaw/pitch pour amener (lat, lon) face à la caméra (yaw le plus proche du yaw actuel).
export function aimAt(s, lat, lon) {
  let yaw = -lon * Math.PI / 180;
  yaw += Math.round((s.yaw - yaw) / TWO_PI) * TWO_PI;
  const pitch = clampPitch(lat * Math.PI / 180);
  s.aim = { yaw, pitch };
  s.vYaw = 0; s.vPitch = 0;
  return s.aim;
}

// Retourne true quand la visée est atteinte.
export function stepAim(s, dt) {
  if (!s.aim) return true;
  const k = 1 - Math.exp(-4 * dt);
  s.yaw += (s.aim.yaw - s.yaw) * k;
  s.pitch += (s.aim.pitch - s.pitch) * k;
  if (Math.abs(s.aim.yaw - s.yaw) < 0.003 && Math.abs(s.aim.pitch - s.pitch) < 0.003) {
    s.yaw = s.aim.yaw; s.pitch = s.aim.pitch; s.aim = null;
    return true;
  }
  return false;
}

export function isTap(totalMovePx, durationMs) {
  return totalMovePx < 10 && durationMs < 600;
}
