// Géométrie pure du plateau : grille 15x15, parcours de 56 cases, escaliers, écuries.
// Coordonnées de grille (x = colonne, z = ligne, z vers le bas de l'écran). Le centre de
// la case (x,z) est en (x,z). La rouge (c = 0) joue dans le bras du bas, puis sens horaire.
export const TAILLE = 15;
export const CENTRE = { x: 7, z: 7 };

// Rotation d'un quart de tour horaire autour du centre de la grille.
function rot(p, n) {
  let x = p.x, z = p.z;
  for (let i = 0; i < n; i++) { const nx = 14 - z; z = x; x = nx; }
  return { x, z };
}

// Bloc de 14 cases du bras du haut, dans le sens horaire :
// côté montant (6) ; pointe milieu (= pied d'escalier) ; départ ; côté descendant (5) ; jonction.
const BLOC_HAUT = [
  { x: 6, z: 5 }, { x: 6, z: 4 }, { x: 6, z: 3 }, { x: 6, z: 2 }, { x: 6, z: 1 }, { x: 6, z: 0 },
  { x: 7, z: 0 },
  { x: 8, z: 0 },
  { x: 8, z: 1 }, { x: 8, z: 2 }, { x: 8, z: 3 }, { x: 8, z: 4 }, { x: 8, z: 5 },
  { x: 9, z: 5 },
];
const ESCALIER_HAUT = [1, 2, 3, 4, 5, 6].map((z) => ({ x: 7, z }));
const ECURIE_HAUT = [{ x: 10.5, z: 1.5 }, { x: 12.5, z: 1.5 }, { x: 10.5, z: 3.5 }, { x: 12.5, z: 3.5 }];

// Le bras de la couleur c est le bras n° (2 + c) % 4 (0 haut, 1 droite, 2 bas, 3 gauche).
const bras = (c) => (2 + c) % 4;

const LISTE = [];
for (let a = 0; a < 4; a++) for (const p of BLOC_HAUT) LISTE.push(rot(p, a));

export const CASES = Array.from({ length: 56 }, (_, i) => LISTE[(i + 35) % 56]);
export const ESCALIERS = [0, 1, 2, 3].map((c) => ESCALIER_HAUT.map((p) => rot(p, bras(c))));
export const ECURIES = [0, 1, 2, 3].map((c) => ECURIE_HAUT.map((p) => rot(p, bras(c))));

// Position (grille) d'un cheval de progression p. Les chevaux arrivés (61) se rangent
// près du bord du centre en deux rangées.
export function positionCheval(c, p, indexCheval = 0) {
  if (p < 0) return ECURIES[c][indexCheval];
  if (p <= 55) return CASES[(14 * c + p) % 56];
  if (p < 61) return ESCALIERS[c][p - 56];
  const m = ESCALIERS[c][5];
  const dx = Math.sign(CENTRE.x - m.x), dz = Math.sign(CENTRE.z - m.z);
  const px = -dz, pz = dx; // perpendiculaire
  const lat = (indexCheval % 2 === 0 ? -0.25 : 0.25);
  const av = (indexCheval < 2 ? 0.1 : 0.4);
  return { x: m.x + dx * av + px * lat, z: m.z + dz * av + pz * lat };
}
