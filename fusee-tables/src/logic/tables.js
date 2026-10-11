// Tables de multiplication : niveaux, faits, choix de réponses. Module pur.

export const LEVELS = [
  { id: 1, name: 'Niveau 1', tables: [2, 5, 10], input: 'choices' },
  { id: 2, name: 'Niveau 2', tables: [3, 4], input: 'pad' },
  { id: 3, name: 'Niveau 3', tables: [6, 7, 8, 9], input: 'pad', bonus: true },
];

/** Tables saisies par choix quand l'enfant/parent en choisit une seule. */
export const CHOICE_TABLES = [2, 5, 10];

export function inputForTables(tables) {
  return tables.every((t) => CHOICE_TABLES.includes(t)) ? 'choices' : 'pad';
}

/** PRNG déterministe (retourne une fonction () => [0,1)). */
export function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(list, rng = Math.random) {
  const arr = list.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function factsFor(tables) {
  const facts = [];
  for (const a of tables) {
    for (let b = 1; b <= 10; b++) {
      facts.push({ a, b, key: `${a}×${b}`, answer: a * b });
    }
  }
  return facts;
}

/** 3 nombres distincts, positifs, mélangés, dont la bonne réponse. */
export function makeChoices(fact, rng = Math.random) {
  const { a, b, answer } = fact;
  const plausible = [answer + a, answer - a, answer + b, answer - b, (a + 1) * b, (a - 1) * b];
  const picked = [];
  const ok = (n) => Number.isInteger(n) && n > 0 && n !== answer && !picked.includes(n);
  for (const n of shuffle(plausible, rng)) {
    if (picked.length >= 2) break;
    if (ok(n)) picked.push(n);
  }
  for (const d of [1, -1, 2, -2, 3, -3, 4, 5]) {
    if (picked.length >= 2) break;
    if (ok(answer + d)) picked.push(answer + d);
  }
  return shuffle([answer, ...picked], rng);
}
