// Configuration de partie pure : deux places (Humain / Robot), couleur, palier.
export const LEVELS = [
  { id: 1, nom: 'Découverte' },
  { id: 2, nom: 'Classique' },
  { id: 3, nom: 'Champion' },
];

export function defaultConfig() {
  return {
    p1: { type: 'human', name: 'Toi' },
    p2: { type: 'bot', name: 'Robot' },
    color: 'w', // couleur de la place 1 : 'w' | 'b' | 'random'
    level: 1,
    rotate: false,
  };
}

function seat(s, fallback) {
  const type = s && s.type === 'bot' ? 'bot' : s && s.type === 'human' ? 'human' : fallback.type;
  let name = s && typeof s.name === 'string' ? s.name.trim().slice(0, 14) : '';
  if (!name) name = type === 'bot' ? 'Robot' : fallback.name;
  return { type, name };
}

// Résout la config : place 1 reçoit la couleur choisie, place 2 l'autre.
export function resolveSetup(cfg = {}, rng = Math.random) {
  const d = defaultConfig();
  const p1 = seat(cfg.p1, d.p1);
  const p2 = seat(cfg.p2, d.p2);
  let c = cfg.color;
  if (c !== 'w' && c !== 'b') c = rng() < 0.5 ? 'w' : 'b';
  const level = [1, 2, 3].includes(+cfg.level) ? +cfg.level : 1;
  const seats = c === 'w' ? { w: p1, b: p2 } : { w: p2, b: p1 };
  if (seats.w.type === 'human' && seats.b.type === 'human') {
    if (seats.w.name === seats.b.name) seats.b = { ...seats.b, name: seats.b.name + ' 2' };
  } else if (seats.w.type === 'bot' && seats.b.type === 'bot') {
    if (seats.w.name === seats.b.name) seats.b = { ...seats.b, name: seats.b.name + ' 2' };
  }
  return { seats, level, rotate: !!cfg.rotate && countHumans({ seats }) === 2 };
}

export function countHumans(setup) {
  return (setup.seats.w.type === 'human' ? 1 : 0) + (setup.seats.b.type === 'human' ? 1 : 0);
}
// Le robot ne joue que pour une place « robot ».
export function isBotSeat(setup, color) { return setup.seats[color].type === 'bot'; }
export function humanColors(setup) { return ['w', 'b'].filter((c) => setup.seats[c].type === 'human'); }
// Côté d'où l'on regarde le plateau au départ.
export function viewColor(setup) {
  const h = humanColors(setup);
  return h.length === 1 ? h[0] : 'w';
}
