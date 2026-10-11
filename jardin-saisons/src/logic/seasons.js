import { shuffle } from './rng.js';

export const SEASONS = ['printemps', 'ete', 'automne', 'hiver'];

export const SEASON_INFO = {
  printemps: { label: 'Printemps', emoji: '🌸', weather: 'pluie', tree: 'fleurs', sky: ['#7fd0ff', '#d9f5ff'] },
  ete: { label: 'Été', emoji: '☀️', weather: 'soleil', tree: 'fruits', sky: ['#3fa9ff', '#bfeaff'] },
  automne: { label: 'Automne', emoji: '🍂', weather: 'vent', tree: 'feuilles-rousses', sky: ['#f2b27a', '#ffe3c2'] },
  hiver: { label: 'Hiver', emoji: '❄️', weather: 'neige', tree: 'nu-neige', sky: ['#9db8d9', '#eef4fb'] },
};

export function nextSeason(s) {
  return SEASONS[(SEASONS.indexOf(s) + 1) % SEASONS.length];
}
export function prevSeason(s) {
  return SEASONS[(SEASONS.indexOf(s) + SEASONS.length - 1) % SEASONS.length];
}

export const ITEMS = [
  { id: 'bonhomme-de-neige', label: 'Bonhomme de neige', emoji: '⛄', seasons: ['hiver'] },
  { id: 'luge', label: 'Luge', emoji: '🛷', seasons: ['hiver'] },
  { id: 'echarpe', label: 'Écharpe', emoji: '🧣', seasons: ['hiver'] },
  { id: 'tulipes', label: 'Tulipes', emoji: '🌷', seasons: ['printemps'] },
  { id: 'nid', label: 'Nid d\'oiseau', emoji: '🪺', seasons: ['printemps'] },
  { id: 'parapluie', label: 'Parapluie', emoji: '☂️', seasons: ['printemps'] },
  { id: 'parasol', label: 'Parasol', emoji: '⛱️', seasons: ['ete'] },
  { id: 'glace', label: 'Glace', emoji: '🍦', seasons: ['ete'] },
  { id: 'seau-pelle', label: 'Seau et pelle', emoji: '🪣', seasons: ['ete'] },
  { id: 'citrouille', label: 'Citrouille', emoji: '🎃', seasons: ['automne'] },
  { id: 'champignons', label: 'Champignons', emoji: '🍄', seasons: ['automne'] },
  { id: 'tas-de-feuilles', label: 'Tas de feuilles', emoji: '🍁', seasons: ['automne'] },
];

const LEVEL_CFG = { 1: { total: 3, needed: 1 }, 2: { total: 4, needed: 2 }, 3: { total: 6, needed: 3 } };

export function makeDressRound(season, level, rng) {
  const cfg = LEVEL_CFG[level] || LEVEL_CFG[1];
  const good = shuffle(ITEMS.filter((i) => i.seasons.includes(season)), rng).slice(0, cfg.needed);
  const bad = shuffle(ITEMS.filter((i) => !i.seasons.includes(season)), rng).slice(0, cfg.total - cfg.needed);
  const proposals = shuffle([...good, ...bad], rng).map((i) => i.id);
  return { season, level, proposals, needed: cfg.needed, placed: [] };
}

export function chooseItem(round, itemId) {
  const item = ITEMS.find((i) => i.id === itemId);
  if (!item || !round.proposals.includes(itemId)) return { round, ok: false, done: false, hint: 'objet-inconnu' };
  if (round.placed.includes(itemId)) return { round, ok: false, done: round.placed.length >= round.needed, hint: 'deja-pose' };
  if (!item.seasons.includes(round.season)) return { round, ok: false, done: false, hint: 'intrus-' + round.season };
  const next = { ...round, placed: [...round.placed, itemId] };
  return { round: next, ok: true, done: next.placed.length >= next.needed, hint: null };
}
