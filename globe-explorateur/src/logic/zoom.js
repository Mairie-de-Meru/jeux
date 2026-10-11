// Zoom de la caméra (pur) : valeur courante lissée vers une cible, bornes, pincement.
export function createZoom({ min = 1, max = 2.5, value = 1 } = {}) {
  const v = Math.max(min, Math.min(max, value));
  return { min, max, value: v, target: v };
}

const borne = (z, v) => Math.max(z.min, Math.min(z.max, v));

// Multiplie la cible par `factor` (>1 = plus près).
export function zoomBy(z, factor) {
  z.target = borne(z, z.target * factor);
  return z;
}

// Pincement : la cible suit le rapport des distances entre les deux doigts.
export function pinch(z, distStart, distNow, valueStart) {
  if (!(distStart > 0) || !(distNow > 0)) return z;
  z.target = borne(z, valueStart * (distNow / distStart));
  return z;
}

export function setZoomTarget(z, v) {
  z.target = borne(z, v);
  return z;
}

// Retour doux au zoom par défaut.
export function resetZoom(z, v = 1) {
  return setZoomTarget(z, v);
}

// Lissage exponentiel vers la cible.
export function stepZoom(z, dt) {
  const k = 1 - Math.exp(-8 * dt);
  z.value += (z.target - z.value) * k;
  if (Math.abs(z.target - z.value) < 0.001) z.value = z.target;
  return z.value;
}

// Plus on est près, plus la rotation au doigt est lente.
export function rotationScale(z) {
  return 1 / z.value;
}
