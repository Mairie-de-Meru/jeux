// Logique pure de SOTUM (aucun DOM, aucun three.js). RNG injecté.

// Longueur du mot tirée dans `lens` ; nombre d'essais fixe par palier.
export const PALIERS = {
  1: { lens: [4, 5], tries: 7, hint: true },
  2: { lens: [5, 6, 7], tries: 6, hint: false },
  3: { lens: [6, 7, 8], tries: 5, hint: false },
  4: { lens: [8, 9, 10], tries: 6, hint: false },
};
export const MIN_LEN = 4, MAX_LEN = 10;
export const MAX_HINTS = 2;

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Coloration : 'correct' (carré rouge), 'present' (rond jaune), 'absent' (bleu).
// Lettres répétées : d'abord les bien placées, puis chaque lettre mal placée
// n'est jaune que tant qu'il reste des exemplaires non appariés dans la solution.
export function evaluate(guess, solution) {
  const n = solution.length;
  const res = new Array(n).fill('absent');
  const left = {};
  for (let i = 0; i < n; i++) {
    if (guess[i] === solution[i]) res[i] = 'correct';
    else left[solution[i]] = (left[solution[i]] || 0) + 1;
  }
  for (let i = 0; i < n; i++) {
    if (res[i] === 'correct') continue;
    const c = guess[i];
    if (left[c] > 0) { res[i] = 'present'; left[c]--; }
  }
  return res;
}

const RANK = { absent: 1, present: 2, correct: 3 };
// Fusionne les états des touches du clavier : correct > present > absent.
export function mergeKeys(keys, guess, result) {
  const out = { ...keys };
  for (let i = 0; i < guess.length; i++) {
    const c = guess[i];
    if (!out[c] || RANK[result[i]] > RANK[out[c]]) out[c] = result[i];
  }
  return out;
}

export function dateKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Mot du jour : le même pour tout le monde ce jour-là (liste triée, hachage de la date).
export function dailyWord(key, len, solutions) {
  const list = [...solutions].sort();
  return list[hashString(`sotum:${key}:${len}`) % list.length];
}

export function randomWord(solutions, rng, avoid) {
  let w;
  let tries = 0;
  do { w = solutions[Math.floor(rng() * solutions.length)]; tries++; } while (w === avoid && tries < 10 && solutions.length > 1);
  return w;
}

// Longueur uniforme dans la plage du palier (rng injecté), puis mot de cette longueur.
// `byLen` : { 4: [...], 5: [...], ... }
export function pickRandom(level, byLen, rng, avoid) {
  const lens = PALIERS[level].lens;
  const len = lens[Math.floor(rng() * lens.length)];
  return { len, word: randomWord(byLen[len], rng, avoid) };
}

// Mot du jour d'un palier : longueur ET mot déterministes par (date, palier).
export function dailyPick(key, level, byLen) {
  const lens = PALIERS[level].lens;
  const len = lens[hashString(`sotum:${key}:len:${level}`) % lens.length];
  return { len, word: dailyWord(key, len, byLen[len]) };
}

export function newGame({ level, word, mode = 'libre', dayKey = null }) {
  const cfg = PALIERS[level];
  if (!cfg || word.length < MIN_LEN || word.length > MAX_LEN) throw new Error('mot ou palier invalide');
  return {
    level, mode, dayKey, word, len: word.length, maxTries: cfg.tries,
    guesses: [], results: [], keys: {}, status: 'playing',
    hintLetters: [], hintsUsed: 0, hintDef: false,
  };
}

// Essai : renvoie { ok:false, error } sans changer l'état (aucun essai perdu),
// ou { ok:true, result, status }. `accepted` : fonction mot -> booléen.
export function submit(state, guess, accepted) {
  if (state.status !== 'playing') return { ok: false, error: 'fini' };
  if (guess.length !== state.len) return { ok: false, error: 'court' };
  if (guess[0] !== state.word[0]) return { ok: false, error: 'premiere' };
  if (!accepted(guess)) return { ok: false, error: 'inconnu' };
  const result = evaluate(guess, state.word);
  state.guesses.push(guess);
  state.results.push(result);
  state.keys = mergeKeys(state.keys, guess, result);
  if (guess === state.word) state.status = 'won';
  else if (state.guesses.length >= state.maxTries) state.status = 'lost';
  return { ok: true, result, status: state.status };
}

export function hintAvailable(state) {
  return state.status === 'playing' && PALIERS[state.level].hint && state.hintsUsed < MAX_HINTS;
}

// Indice : kind 'lettre' (révèle une position pas encore trouvée) ou 'definition'.
export function useHint(state, kind, rng) {
  if (!hintAvailable(state)) return { ok: false };
  if (kind === 'definition') {
    state.hintDef = true;
    state.hintsUsed++;
    return { ok: true, kind };
  }
  const found = new Set(state.hintLetters);
  for (const r of state.results) r.forEach((v, i) => { if (v === 'correct') found.add(i); });
  const cand = [];
  for (let i = 1; i < state.len; i++) if (!found.has(i)) cand.push(i);
  if (!cand.length) return { ok: false };
  const pos = cand[Math.floor(rng() * cand.length)];
  state.hintLetters.push(pos);
  state.hintsUsed++;
  return { ok: true, kind: 'lettre', pos, letter: state.word[pos] };
}

// Étoiles (1 à 3) pour une victoire ; 0 sinon. Chaque indice en retire une (min 1).
export function starsFor(state) {
  if (state.status !== 'won') return 0;
  const n = state.guesses.length;
  let s = n <= 2 ? 3 : n <= Math.ceil(state.maxTries / 2) + 1 ? 2 : 1;
  s -= state.hintsUsed;
  return Math.max(1, s);
}

export function emptyStats() {
  return { stars: 0, streak: 0, best: 0, played: 0, won: 0, daily: {} };
}

// Enregistre une partie terminée. Le mot du jour ne rapporte qu'une fois par palier et par jour.
export function recordResult(stats, state) {
  const s = { ...emptyStats(), ...stats, daily: { ...(stats && stats.daily) } };
  const won = state.status === 'won';
  const dkey = state.mode === 'jour' ? `${state.dayKey}:${state.level}` : null;
  const already = dkey && s.daily[dkey];
  if (already) return { stats: s, stars: 0, counted: false };
  s.played++;
  if (dkey) s.daily[dkey] = won ? 'won' : 'lost';
  let stars = 0;
  if (won) {
    stars = starsFor(state);
    s.won++;
    s.stars += stars;
    s.streak++;
    s.best = Math.max(s.best, s.streak);
  } else {
    s.streak = 0;
  }
  return { stats: s, stars, counted: true };
}

// Prépare la saisie courante : la 1re lettre est donnée.
export function typeLetter(cur, ch, len) {
  return /^[a-z]$/.test(ch) && cur.length < len ? cur + ch : cur;
}
// Saisie façon Motus : seule la 1re lettre est imposée. Les lettres trouvées en rouge
// (essais précédents ou indice) sont affichées comme aide sur les positions non atteintes ;
// le curseur avance de la position 1 à la fin et une lettre tapée REMPLACE l'aide.
export function knownLetters(state) {
  const k = new Array(state.len).fill(null);
  k[0] = state.word[0];
  for (const i of state.hintLetters) k[i] = state.word[i];
  for (let r = 0; r < state.results.length; r++) {
    state.results[r].forEach((v, i) => { if (v === 'correct') k[i] = state.word[i]; });
  }
  return k;
}
// typed : lettres tapées pour les positions 1, 2, ... (la position 0 n'est jamais saisie).
export function typeInto(known, typed, ch) {
  return /^[a-z]$/.test(ch) && typed.length < known.length - 1 ? typed + ch : typed;
}
export function backInto(known, typed) { return typed.slice(0, -1); }
// Lettre affichée par position : 1re lettre, lettre tapée, sinon lettre rouge connue, sinon null.
export function displayLetters(known, typed) {
  return known.map((k, i) => (i === 0 ? k : i - 1 < typed.length ? typed[i - 1] : k));
}
export const isComplete = (known, typed) => displayLetters(known, typed).every((x) => x !== null);
// Mot proposé : positions vides ignorées (mot trop court => 'court' à la validation).
export function composeGuess(known, typed) {
  return displayLetters(known, typed).filter((x) => x !== null).join('');
}
export function backspace(cur) { return cur.length > 1 ? cur.slice(0, -1) : cur; }
