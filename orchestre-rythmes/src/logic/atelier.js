export const PAS = 8;
export const ATELIER_BPM = 100;

export function createGrille(ids) {
  const cases = {};
  for (const id of ids) cases[id] = Array(PAS).fill(false);
  return { ids: [...ids], cases };
}

export function basculer(grille, id, pas) {
  if (!grille.cases[id] || !Number.isInteger(pas) || pas < 0 || pas >= PAS) return grille;
  const ligne = grille.cases[id].map((v, i) => (i === pas ? !v : v));
  return { ...grille, cases: { ...grille.cases, [id]: ligne } };
}

export const notesAuPas = (grille, pas) => grille.ids.filter((id) => grille.cases[id]?.[pas]);

export const vider = (grille) => createGrille(grille.ids);

export const estVide = (grille) => grille.ids.every((id) => !grille.cases[id].some(Boolean));

export const pasSuivant = (pas) => (pas + 1) % PAS;

export const serialiser = (grille) => JSON.stringify({ ids: grille.ids, cases: grille.cases });

export function deserialiser(texte) {
  try {
    const o = JSON.parse(texte);
    if (!o || !Array.isArray(o.ids) || o.ids.some((i) => typeof i !== 'string') || typeof o.cases !== 'object' || !o.cases) {
      return createGrille([]);
    }
    const g = createGrille(o.ids);
    for (const id of o.ids) {
      const l = o.cases[id];
      if (Array.isArray(l)) g.cases[id] = Array.from({ length: PAS }, (_, i) => l[i] === true);
    }
    return g;
  } catch {
    return createGrille([]);
  }
}
