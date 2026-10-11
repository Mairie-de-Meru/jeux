// Énumération exhaustive de tout ce que le jeu peut dire (pour pré-générer les voix). Module pur. Anglais seulement : le jeu ne dit plus rien en français (le texte français reste affiché).
// Miroir des générateurs de logic.js : les choix d'une manche appartiennent toujours à l'ensemble des cibles du (thème, palier).
import { ANIMALS, FRUITS, OBJECTS, COLORS, THEMES, colorsFor, getNoun } from './data.js';
import { LEVELS } from './logic.js';
import { nameEn, promptFor, wrongEn, listenLabel } from './phrases.js';

export const FIXED_PHRASES = [
  { lang: 'en', text: 'Touch anything!' },
  { lang: 'en', text: 'Well done!' },
];

// Couleurs des objets de l'écoute libre (même règle que LISTEN_PAGES dans main.js).
export const LISTEN_OBJECT_COLORS = ['blue', 'red', 'yellow', 'pink'];

const t = (noun, color, count) => ({ noun, color, count });
const validColors = (id) => colorsFor(id).filter((c) => getNoun(id).en !== c);

// Toutes les cibles possibles pour (thème, palier).
export function targetsFor(theme, level) {
  const L = LEVELS[level];
  const out = [];
  if (L.combined) {
    const base = theme === 'fruits' ? FRUITS : theme === 'colors' ? OBJECTS : [...FRUITS, ...OBJECTS];
    for (const n of base) for (const c of validColors(n.id)) for (let k = 2; k <= L.maxCount; k++) out.push(t(n.id, c, k));
    return out;
  }
  if (theme === 'colors') for (const o of OBJECTS) for (const c of COLORS) out.push(t(o.id, c.id, 1));
  else if (theme === 'numbers') for (const n of [...ANIMALS, ...FRUITS]) for (let k = 1; k <= L.maxCount; k++) out.push(t(n.id, null, k));
  else for (const n of theme === 'fruits' ? FRUITS : ANIMALS) out.push(t(n.id, null, 1));
  return out;
}

// [{ lang, text }] sans doublon, ordre stable.
// opts.wrongLevel3 = false : omet les « That's / Those are… » du palier 3 (ils retombent sur la synthèse).
export function allPhrases({ wrongLevel3 = true } = {}) {
  const seen = new Set();
  const list = [];
  const add = (lang, text) => {
    const k = `${lang}|${text}`;
    if (seen.has(k)) return;
    seen.add(k);
    list.push({ lang, text });
  };
  FIXED_PHRASES.forEach((p) => add(p.lang, p.text));
  for (const theme of THEMES) {
    for (const level of Object.keys(LEVELS).map(Number)) {
      const combined = LEVELS[level].combined;
      for (const tg of targetsFor(theme, level)) {
        add('en', promptFor(tg, theme, combined));
        add('en', nameEn(tg, theme));
        if (wrongLevel3 || !combined) add('en', wrongEn(tg, theme));
      }
    }
  }
  const items = [
    ...ANIMALS.map((a) => t(a.id, null, 1)),
    ...FRUITS.map((f) => t(f.id, null, 1)),
    ...OBJECTS.map((o, i) => t(o.id, LISTEN_OBJECT_COLORS[i % 4], 1)),
  ];
  for (const it of items) {
    const l = listenLabel(it);
    add('en', l.en);
  }
  return list;
}

export const phraseKey = (p) => `${p.lang}|${p.text}`;
