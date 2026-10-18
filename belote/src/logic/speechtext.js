// Textes lus à voix haute (purs).
import { SUIT_NAMES } from './cards.js';

const RANK_SPEECH = { 7: 'sept', 8: 'huit', 9: 'neuf', 10: 'dix', J: 'valet', Q: 'dame', K: 'roi', A: 'as' };

export function cardSpeech(card) {
  return `${RANK_SPEECH[card.rank]} de ${SUIT_NAMES[card.suit]}`;
}

export function rulesText(palier = 1) {
  let t = 'On joue à quatre, deux équipes : toi et ton partenaire contre les deux autres. '
    + 'D\'abord, chacun peut prendre : la carte retournée donne l\'atout. '
    + 'Ensuite, on joue huit plis. Il faut fournir la couleur demandée. Sinon, on coupe avec l\'atout. '
    + 'Le valet d\'atout est la plus forte carte, puis le neuf. Les cartes brillantes sont celles que tu peux jouer. '
    + 'Si tu prends, ton équipe doit faire plus de points que les autres.';
  if (palier >= 2) t += ' Roi et dame d\'atout dans la même main : belote et rebelote, vingt points en plus. Le dernier pli vaut dix points.';
  if (palier >= 3) t += ' Au palier champion, les robots retiennent les atouts déjà tombés. Bonne chance !';
  return t;
}
