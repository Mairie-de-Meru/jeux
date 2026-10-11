// Consignes anglaises et réponses françaises. Module pur.
import { getNoun, getColor, getNumber } from './data.js';

const VOWELS = 'aeiou';
function article(word) {
  return VOWELS.includes(word[0]) ? 'an' : 'a';
}

// « two red apples », « a cow », « an orange ball » ; theme 'numbers' : « one duck ».
export function nameEn(target, theme) {
  const noun = getNoun(target.noun);
  const color = target.color ? getColor(target.color).en : null;
  const parts = [];
  if (target.count === 1) {
    const first = color || noun.en;
    parts.push(theme === 'numbers' ? 'one' : article(first));
    if (color) parts.push(color);
    parts.push(noun.en);
  } else {
    parts.push(getNumber(target.count).en);
    if (color) parts.push(color);
    parts.push(noun.enPlural);
  }
  return parts.join(' ');
}

// « deux pommes rouges », « une vache », « un ballon bleu » : couleur après le nom, accord genre/nombre.
export function nameFr(target) {
  const noun = getNoun(target.noun);
  const plural = target.count > 1;
  const parts = [];
  if (plural) parts.push(getNumber(target.count).fr, noun.frPlural);
  else parts.push(noun.gender === 'f' ? 'une' : 'un', noun.fr);
  if (target.color) {
    const f = getColor(target.color).fr;
    parts.push(f[(noun.gender === 'f' ? 'f' : 'm') + (plural ? 'p' : 's')]);
  }
  return parts.join(' ');
}

// Consigne : « Touch the cow! », « Find something red! », « Show me three ducks! », « Find two red apples! ».
export function promptFor(target, theme, combined) {
  if (combined) {
    const noun = getNoun(target.noun);
    const color = target.color ? getColor(target.color).en : null;
    const n = getNumber(target.count).en;
    const plural = target.count === 1 ? noun.en : noun.enPlural;
    return `Find ${n} ${color ? color + ' ' : ''}${plural}!`.replace(/^Find one /, 'Find a ');
  }
  switch (theme) {
    case 'colors':
      return `Find something ${getColor(target.color).en}!`;
    case 'numbers': {
      const noun = getNoun(target.noun);
      return `Show me ${getNumber(target.count).en} ${target.count === 1 ? noun.en : noun.enPlural}!`;
    }
    default:
      return `Touch the ${getNoun(target.noun).en}!`;
  }
}

// Phrase dite quand l'enfant touche un mauvais groupe.
export function wrongEn(target, theme) {
  const name = nameEn(target, theme);
  return target.count === 1 ? `That's ${name}!` : `Those are ${name}!`;
}

// Mode écoute libre : nom anglais et français d'un objet.
export function listenLabel(item) {
  return { en: nameEn(item), fr: nameFr(item) };
}
