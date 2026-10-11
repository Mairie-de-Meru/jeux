// Plan du village (pur) : église et maisons de décor autour des quatre maisons d'enquête.
// Chaque bâtiment regarde vers la place (rot calculée), sauf mention contraire.

const versPlace = (x, z) => Math.atan2(-x, -z);

// type : 'eglise' ou 'maison' ; l = largeur, p = profondeur (rayon d'encombrement = r).
export const EGLISE = { type: 'eglise', x: 0, z: -10, rot: 0, r: 3.2 };

const MAISONS_DECOR = [
  [-8.6, -6.2, 0xf8b4c8, 0x9c3d2e, 1.0],
  [-11.6, -0.8, 0xfff3bf, 0x6741d9, 0.9],
  [-10.8, 4.6, 0xb2f2bb, 0xc0392b, 1.05],
  [8.6, -6.2, 0xa5d8ff, 0xb5651d, 1.0],
  [11.6, -0.8, 0xffd8a8, 0x2b8a3e, 0.95],
  [10.8, 4.6, 0xe5dbff, 0xd9480f, 0.9],
  [-5.2, -9.8, 0xffe066, 0x1864ab, 0.85],
  [5.2, -9.8, 0xffc9c9, 0x5f3dc4, 0.85],
  [-9.2, -10.4, 0xd3f9d8, 0xa61e4d, 0.9],
  [9.2, -10.4, 0xfff9db, 0x862e9c, 0.9],
  [-12.5, 9.2, 0xffa8a8, 0x364fc7, 1.0],
  [12.5, 9.2, 0x99e9f2, 0xe8590c, 1.0],
];

export const VILLAGE = [
  EGLISE,
  ...MAISONS_DECOR.map(([x, z, mur, toit, s]) => ({ type: 'maison', x, z, rot: versPlace(x, z), mur, toit, s, r: 1.9 * s })),
];

// Arbres en plus, entre les maisons du tour.
export const ARBRES_VILLAGE = [
  [-10.2, -3.4, 1.1], [10.2, -3.4, 1.0], [-7.2, -12.2, 1.2], [7.2, -12.2, 1.1],
  [-3.6, -13.4, 1.0], [3.8, -13.6, 1.1], [-13.2, 2.0, 1.2], [13.2, 2.0, 1.1],
  [-11.8, -7.8, 1.0], [11.8, -7.8, 1.0],
];

// Habitants (PNJ et animaux) : trajet en aller-retour, cercle, ou pose fixe.
export const HABITANTS = [
  { type: 'boulangere', trajet: [[-1.5, -6.6], [-6.0, -7.8]], vitesse: 0.55 },
  { type: 'enfant', trajet: [[1.4, 6.4], [6.4, 7.4]], vitesse: 0.8 },
  { type: 'grandmere', pose: [-1.7, -2.35, 0] },
  { type: 'chien', cercle: [0, 0.2, 1.5], vitesse: 1.1 },
  { type: 'chat', pose: [-1.9, 5.4, 0.6] },
  { type: 'canard', cercle: [0.5, -4.8, 0.6], vitesse: 0.35, phase: 0 },
  { type: 'canard', cercle: [0.5, -4.8, 0.6], vitesse: 0.35, phase: 2.4 },
];

// Position au temps t (secondes) : {x, z, rot, marche} ; le modèle regarde vers +z quand rot = 0.
export function positionHabitant(h, t) {
  if (h.pose) return { x: h.pose[0], z: h.pose[1], rot: h.pose[2], marche: false };
  const phase = h.phase ?? 0;
  if (h.cercle) {
    const [cx, cz, r] = h.cercle;
    const a = (t * h.vitesse) / r + phase;
    return { x: cx + Math.sin(a) * r, z: cz + Math.cos(a) * r, rot: Math.atan2(Math.cos(a), -Math.sin(a)), marche: true };
  }
  const [[ax, az], [bx, bz]] = h.trajet;
  const L = Math.hypot(bx - ax, bz - az);
  const s = ((t * h.vitesse + phase) % (2 * L) + 2 * L) % (2 * L);
  const aller = s < L;
  const d = aller ? s : 2 * L - s;
  const sens = aller ? 1 : -1;
  return {
    x: ax + ((bx - ax) * d) / L, z: az + ((bz - az) * d) / L,
    rot: Math.atan2((bx - ax) * sens, (bz - az) * sens), marche: true,
  };
}
