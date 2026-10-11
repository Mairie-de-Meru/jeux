// Atelier 3 : phrases à remettre dans l'ordre. Module pur.
// Premier mot : jamais un nom propre ; les noms propres (Léa, Max) gardent leur majuscule.
const S = (text, emoji) => ({ text, emoji, words: text.replace(/\.$/, '').split(' ') });

export const SENTENCES = {
  1: [
    S('Le chat dort.', '🐱'), S('Le chien court.', '🐶'), S('Un oiseau chante.', '🐦'), S('La lune brille.', '🌙'),
    S('Le soleil brille.', '☀️'), S('Le bébé rit.', '👶'), S('Le poisson nage.', '🐟'), S('La fleur pousse.', '🌸'),
    S('Le train roule.', '🚂'), S('La vache mange.', '🐄'),
  ],
  2: [
    S('Le chien aime Max.', '🐶'), S('La petite fille rit.', '👧'), S('Le ballon est rouge.', '🎈'), S('Mon papa a faim.', '😋'),
    S('La souris est petite.', '🐭'), S('Le soleil est chaud.', '🌞'), S('Les enfants jouent dehors.', '🧒'), S('Une pomme est rouge.', '🍎'),
    S('Le lapin saute haut.', '🐰'), S('La neige est froide.', '❄️'),
  ],
  3: [
    S('Le chat boit du lait.', '🐱'), S('La fille mange une pomme.', '🍎'), S('Mon papa lit un livre.', '📖'),
    S('Le chien de Léa dort.', '🐕'), S('Le petit oiseau chante bien.', '🐦'), S('La maîtresse écrit au tableau.', '👩‍🏫'),
    S("Les enfants vont à l'école.", '🏫'), S('Le gros camion roule vite.', '🚚'), S('Ma maman fait un gâteau.', '🎂'),
    S('Le vélo de Max roule.', '🚲'),
  ],
};

const lowerFirst = (w) => w.charAt(0).toLowerCase() + w.slice(1);
const upperFirst = (w) => w.charAt(0).toUpperCase() + w.slice(1);

export function prepareWords(sentence) {
  return sentence.words.map((w, i) => ({ id: `w${i}`, text: i === 0 ? lowerFirst(w) : w }));
}

export function shuffleWords(words, rng) {
  const same = (arr) => arr.every((w, i) => w.id === words[i].id);
  if (words.length < 2) return words.slice();
  for (let k = 0; k < 50; k++) {
    const r = rng.shuffle(words);
    if (!same(r)) return r;
  }
  return words.slice(1).concat(words[0]);
}

export function checkOrder(sentence, placedTexts) {
  return sentence.words.map((w, i) => typeof placedTexts[i] === 'string' && placedTexts[i].toLowerCase() === w.toLowerCase());
}

export function checkFinish(sentence, { capitalized, hasPoint }) {
  if (!capitalized) return { ok: false, hint: 'majuscule' };
  if (!hasPoint) return { ok: false, hint: 'point' };
  return { ok: true, hint: null };
}

export function finalText(sentence) {
  return sentence.words.map((w, i) => (i === 0 ? upperFirst(w) : w)).join(' ') + '.';
}
