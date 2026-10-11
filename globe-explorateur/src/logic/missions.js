// Missions et paliers (pur, état immuable, aléatoire injecté).
import { CONTINENT_LIST, OCEAN_LIST, ITEM_LIST, COUNTRY_LIST, WONDER_LIST } from '../data/items.js';
import { continentAt, oceanAt, angularDistance, distancePolyligne } from './geo.js';
import { RIVERS } from '../data/rivers.js';

// taille : nombre de missions tirées au hasard dans `ids` (absent = toutes) ; la moitié au moins vient des originaux de la v1.
export const PALIERS = [
  { n: 1, kind: 'continent', titre: 'Les continents', ids: CONTINENT_LIST.map((c) => c.id) },
  { n: 2, kind: 'ocean', titre: 'Les océans', ids: OCEAN_LIST.map((c) => c.id) },
  { n: 3, kind: 'item', titre: 'Animaux et monuments', ids: ITEM_LIST.map((c) => c.id), taille: 8, originaux: ITEM_LIST.filter((c) => c.original).map((c) => c.id) },
  { n: 4, kind: 'flag', titre: 'Les drapeaux', ids: COUNTRY_LIST.map((c) => c.id), taille: 7, originaux: COUNTRY_LIST.filter((c) => c.original).map((c) => c.id) },
  { n: 5, kind: 'wonder', titre: 'Merveilles du monde', ids: WONDER_LIST.map((c) => c.id), taille: 8 },
];

const byId = (list, id) => list.find((x) => x.id === id);

function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Tire `taille` ids : au moins la moitié parmi les originaux (s'il y en a), le reste dans le pool entier.
function tirer(p, rng) {
  if (!p.taille || p.taille >= p.ids.length) return shuffle(p.ids, rng);
  const orig = shuffle(p.originaux || [], rng).slice(0, Math.ceil(p.taille / 2));
  const reste = shuffle(p.ids.filter((x) => !orig.includes(x)), rng).slice(0, p.taille - orig.length);
  return shuffle([...orig, ...reste], rng);
}

// Réussite d'une merveille : cibles ponctuelles, bande de latitude ou océan.
export function merveilleReussie(w, lat, lon) {
  if (w.fleuve) return RIVERS[w.fleuve].lignes.some((l) => distancePolyligne({ lat, lon }, l) < w.rayon);
  if (w.cibles) return w.cibles.some((c) => angularDistance({ lat, lon }, c) < w.rayon);
  if (w.bande) return Math.abs(lat) < w.bande;
  return oceanAt(lat, lon) === w.ocean;
}

function makeChoix(id, rng) {
  const others = shuffle(COUNTRY_LIST.map((c) => c.id).filter((x) => x !== id), rng).slice(0, 2);
  return shuffle([id, ...others], rng);
}

export function createGame({ rng = Math.random, palier = 1 } = {}) {
  const p = PALIERS[palier - 1];
  const queue = tirer(p, rng).map((id) => (p.kind === 'flag' ? { id, choix: makeChoix(id, rng) } : { id }));
  return { palier, queue, index: 0, erreurs: 0, etoiles: 0, termine: false, fini: false };
}

export function currentMission(state) {
  if (state.termine || state.index >= state.queue.length) return null;
  const kind = PALIERS[state.palier - 1].kind;
  const { id, choix } = state.queue[state.index];
  let texte;
  if (kind === 'continent') texte = `Trouve ${byId(CONTINENT_LIST, id).article} !`;
  else if (kind === 'ocean') texte = `Montre ${byId(OCEAN_LIST, id).nom} !`;
  else if (kind === 'item') texte = byId(ITEM_LIST, id).question;
  else if (kind === 'wonder') texte = byId(WONDER_LIST, id).question;
  else {
    const nom = byId(COUNTRY_LIST, id).nom;
    texte = `Voici ${nom}. Quel est son drapeau ?`;
  }
  const m = { kind, target: id, texte, parle: texte };
  if (kind === 'wonder') m.fiche = byId(WONDER_LIST, id).fiche;
  if (kind === 'flag') m.choix = choix.slice();
  return m;
}

export function targetPosition(kind, id) {
  if (kind === 'continent') return byId(CONTINENT_LIST, id).centre;
  if (kind === 'ocean') return byId(OCEAN_LIST, id).centre;
  if (kind === 'item') return byId(ITEM_LIST, id).pos;
  if (kind === 'wonder') return byId(WONDER_LIST, id).centre;
  return byId(COUNTRY_LIST, id).centre;
}

function success(state, id) {
  const gain = state.erreurs === 0 ? 3 : state.erreurs === 1 ? 2 : 1;
  const index = state.index + 1;
  const termine = index >= state.queue.length;
  return {
    ok: true, hint: null, reward: id, gain,
    newState: { ...state, index, erreurs: 0, etoiles: state.etoiles + gain, termine },
  };
}

function failure(state, kind, id, nomTouche) {
  const erreurs = state.erreurs + 1;
  const newState = { ...state, erreurs };
  let hint;
  if (erreurs === 1) hint = { type: 'nom', dit: `${nomTouche} Cherche encore.` };
  else {
    const { lat, lon } = targetPosition(kind, id);
    hint = { type: 'montre', lat, lon, cible: id, kind };
  }
  return { ok: false, hint, newState };
}

export function answerTap(state, { lat, lon }) {
  const m = currentMission(state);
  if (!m || m.kind === 'flag') return { ok: false, hint: null, newState: state };
  const cont = continentAt(lat, lon);
  if (m.kind === 'continent') {
    if (cont === m.target) return success(state, m.target);
    const nom = cont ? `Ça, c'est ${byId(CONTINENT_LIST, cont).article} !` : "C'est la mer !";
    return failure(state, m.kind, m.target, nom);
  }
  if (m.kind === 'ocean') {
    const oc = oceanAt(lat, lon);
    if (oc === m.target) return success(state, m.target);
    const nom = oc ? `Ça, c'est ${byId(OCEAN_LIST, oc).nom} !` : "C'est la terre !";
    return failure(state, m.kind, m.target, nom);
  }
  if (m.kind === 'wonder') {
    if (merveilleReussie(byId(WONDER_LIST, m.target), lat, lon)) return success(state, m.target);
    const oc = oceanAt(lat, lon);
    const nom = cont ? `Ça, c'est ${byId(CONTINENT_LIST, cont).article} !` : oc ? `Ça, c'est ${byId(OCEAN_LIST, oc).nom} !` : "C'est la mer !";
    return failure(state, m.kind, m.target, nom);
  }
  const item = byId(ITEM_LIST, m.target);
  // tolérance autour du pin (les côtes simplifiées peuvent le laisser en mer)
  if (cont === item.continent || angularDistance({ lat, lon }, item.pos) < 5) return success(state, m.target);
  const nom = cont ? `Ça, c'est ${byId(CONTINENT_LIST, cont).article} !` : "C'est la mer !";
  return failure(state, m.kind, m.target, nom);
}

export function answerFlag(state, countryId) {
  const m = currentMission(state);
  if (!m || m.kind !== 'flag') return { ok: false, hint: null, newState: state };
  if (countryId === m.target) return success(state, m.target);
  const c = byId(COUNTRY_LIST, countryId);
  return failure(state, m.kind, m.target, `Ça, c'est le drapeau de ${c ? c.nom : 'un autre pays'} !`);
}

export function nextPalier(state, rng = Math.random) {
  if (!state.termine) return state;
  if (state.palier >= PALIERS.length) return { ...state, fini: true };
  const g = createGame({ rng, palier: state.palier + 1 });
  return { ...g, etoiles: state.etoiles };
}
