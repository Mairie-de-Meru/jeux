// Phrase courte lue à voix haute quand une carte est jouée (fonction pure).
const NAMES = { R: 'Rouge', B: 'Bleu', G: 'Vert', Y: 'Jaune' };

export function cardSpeech(card, chosenColor) {
  const col = NAMES[card.color];
  switch (card.kind) {
    case 'num': return `${col} ${card.value}`;
    case 'skip': return `${col}, passe ton tour`;
    case 'rev': return `${col}, sens inverse`;
    case 'draw2': return `${col}, plus deux`;
    case 'wild': return chosenColor ? `Joker, couleur ${NAMES[chosenColor].toLowerCase()}` : 'Joker';
    case 'wild4': return chosenColor ? `Plus quatre, couleur ${NAMES[chosenColor].toLowerCase()}` : 'Plus quatre';
    default: return '';
  }
}
