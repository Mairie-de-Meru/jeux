// Tours et places (pur) : passe et joue, plusieurs humains sur le même appareil.
import { BOT_ANIMALS } from './game.js';

export const MAX_NAME = 12;

export const humanCount = (g) => g.players.filter((p) => p.human).length;
export const isHumanTurn = (g) => g.phase === 'play' && !!g.players[g.current].human;

// Faut-il l'écran « Passe l'appareil » avant ce tour ?
export function needsPassScreen(g, shownHuman) {
  return g.phase === 'play' && !!g.players[g.current].human && humanCount(g) >= 2 && g.current !== shownHuman;
}

// Nom par défaut de la place i d'après les types ('human'|'bot') des places.
export function defaultSeatName(types, i) {
  if (types[i] === 'bot') {
    const order = types.slice(0, i).filter((t) => t === 'bot').length;
    return BOT_ANIMALS[order % BOT_ANIMALS.length].name;
  }
  return i === 0 ? 'Toi' : `Joueur ${i + 1}`;
}

// Normalise les choix de l'accueil : 2 à 4 places, place 0 humaine, prénoms vides -> défaut, 12 caractères max.
export function seatsFromSettings(list) {
  let src = Array.isArray(list) ? list.slice(0, 4) : [];
  while (src.length < 2) src.push({ type: 'bot' });
  const types = src.map((s, i) => (i === 0 || s?.type === 'human' ? 'human' : 'bot'));
  return types.map((type, i) => {
    const raw = typeof src[i]?.name === 'string' ? src[i].name.trim().slice(0, MAX_NAME).trim() : '';
    return { type, name: raw || defaultSeatName(types, i) };
  });
}
