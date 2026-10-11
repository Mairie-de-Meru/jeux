import { THEMES } from './themes.js';
import { LEVELS } from './levels.js';
import { shuffle } from './rng.js';

export function createDeck(themeId, levelIndex, rng) {
  const theme = THEMES[themeId];
  if (!theme) throw new Error(`Thème inconnu : ${themeId}`);
  const level = LEVELS[levelIndex];
  if (!level) throw new Error(`Palier inconnu : ${levelIndex}`);
  const chosen = shuffle(theme.items, rng).slice(0, level.pairs);
  const doubled = chosen.flatMap((it) => [it, it]);
  return shuffle(doubled, rng).map((it, index) => ({
    index, pairKey: it.key, nom: it.nom, emoji: it.emoji,
  }));
}
