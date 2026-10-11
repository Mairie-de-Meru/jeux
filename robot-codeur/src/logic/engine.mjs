// Moteur pur du jeu (sans DOM ni three.js).
export const DIRS = ['N', 'E', 'S', 'W'];
const VEC = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
export const dirVec = (d) => VEC[d];

const TILE_OF = { '.': 'water', '#': 'ground', '=': 'bridge', R: 'rock', S: 'ground', T: 'ground', K: 'ground' };

export function parseLevel(level) {
  const rows = level.map;
  const height = rows.length;
  const width = rows[0].length;
  const tiles = [];
  let start = null;
  let treasure = null;
  let key = null;
  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      const c = rows[y][x] ?? '.';
      row.push(TILE_OF[c] ?? 'water');
      if (c === 'S') start = { x, y, dir: level.dir };
      if (c === 'T') treasure = { x, y };
      if (c === 'K') key = { x, y };
    }
    tiles.push(row);
  }
  return { width, height, tiles, start, treasure, key };
}

export function initialState(world) {
  return { x: world.start.x, y: world.start.y, dir: world.start.dir, hasKey: false };
}

export function tileAt(world, x, y) {
  if (y < 0 || y >= world.height || x < 0 || x >= world.width) return 'water';
  return world.tiles[y][x];
}

export function turn(dir, delta) {
  return DIRS[(DIRS.indexOf(dir) + delta + 4) % 4];
}

export function step(world, state, action) {
  const [dx, dy] = VEC[state.dir];
  switch (action) {
    case 'left':
      return { state: { ...state, dir: turn(state.dir, -1) }, ok: true, event: 'turn' };
    case 'right':
      return { state: { ...state, dir: turn(state.dir, 1) }, ok: true, event: 'turn' };
    case 'forward': {
      const nx = state.x + dx;
      const ny = state.y + dy;
      const t = tileAt(world, nx, ny);
      if (t === 'water') return { state, ok: false, error: 'water' };
      if (t === 'rock') return { state, ok: false, error: 'rock' };
      const gotKey = !state.hasKey && world.key && world.key.x === nx && world.key.y === ny;
      if (gotKey) return { state: { ...state, x: nx, y: ny, hasKey: true }, ok: true, event: 'key' };
      return { state: { ...state, x: nx, y: ny }, ok: true, event: 'move' };
    }
    default:
      return { state, ok: false, error: 'unknown' };
  }
}

export function compile(program) {
  const out = [];
  program.forEach((item, i) => {
    if (item.type === 'repeat') {
      for (let it = 0; it < item.times; it++) {
        item.body.forEach((b, j) => out.push({ action: b.type, path: [i, j], iteration: it }));
      }
    } else {
      out.push({ action: item.type, path: [i] });
    }
  });
  return out;
}

export function isWon(world, state) {
  return state.x === world.treasure.x && state.y === world.treasure.y && !!state.hasKey; // le coffre ne s'ouvre qu'avec la clé
}

export function run(level, program, maxSteps = 200) {
  const world = parseLevel(level);
  let state = initialState(world);
  const plan = compile(program);
  const steps = [];
  let skippedTreasure = false;
  if (plan.length > maxSteps) {
    return { steps, outcome: 'too-long' };
  }
  for (const p of plan) {
    const r = step(world, state, p.action);
    const rec = { action: p.action, path: p.path, iteration: p.iteration, ok: r.ok, state: r.state };
    if (r.event) rec.event = r.event;
    if (!r.ok) rec.error = r.error;
    steps.push(rec);
    state = r.state;
    if (!r.ok) return { steps, outcome: 'error', errorStep: steps.length - 1 };
    if (isWon(world, state)) return { steps, outcome: 'win' };
    if (state.x === world.treasure.x && state.y === world.treasure.y) skippedTreasure = true;
  }
  return { steps, outcome: skippedTreasure ? 'missing-key' : 'incomplete' };
}

export function countCards(program) {
  let n = 0;
  for (const it of program) n += it.type === 'repeat' ? 1 + it.body.length : 1;
  return n;
}

export function stars(level, program) {
  const n = countCards(program);
  const best = countCards(level.solution);
  if (n <= best) return 3;
  if (n <= best + 2) return 2;
  return 1;
}

export function hintFor(outcome, error) {
  if (outcome === 'error') {
    switch (error) {
      case 'water': return 'Oups, de l’eau ! Essaie de tourner. 💧';
      case 'rock': return 'Un rocher ! Change de chemin. 🪨';
      default: return 'Oups ! Essaie encore, tu y es presque.';
    }
  }
  switch (outcome) {
    case 'missing-key': return 'Il te faut d’abord la clé 🔑 !';
    case 'incomplete': return 'Presque ! Le robot n’est pas arrivé au trésor.';
    case 'too-long': return 'C’est très long ! Essaie avec moins de cartes.';
    case 'empty': return 'Ajoute des cartes pour commencer ! 👆';
    case 'win': return 'Bravo ! 🎉';
    default: return 'Essaie encore !';
  }
}
