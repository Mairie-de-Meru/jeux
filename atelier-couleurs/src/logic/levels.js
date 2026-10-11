// Module PUR : paliers et cibles (chaque cible est une recette, donc atteignable).
import { mixToRgb } from './pigments.js';

export const LEVELS = [
  {
    id: 1,
    titre: 'Deux couleurs',
    consigne: 'Mélange deux couleurs !',
    cibles: [
      { id: 'orange', nom: 'Orange', recette: { rouge: 1, jaune: 1 }, phrase: 'Fais de l’orange !' },
      { id: 'vert', nom: 'Vert', recette: { jaune: 1, bleu: 1 }, phrase: 'Fais du vert !' },
      { id: 'violet', nom: 'Violet', recette: { rouge: 1, bleu: 1 }, phrase: 'Fais du violet !' },
    ],
  },
  {
    id: 2,
    titre: 'Plus clair, plus foncé',
    consigne: 'Ajoute du blanc ou du noir !',
    cibles: [
      { id: 'rose', nom: 'Rose', recette: { rouge: 1, blanc: 2 }, phrase: 'Fais du rose !' },
      { id: 'bleu-clair', nom: 'Bleu clair', recette: { bleu: 1, blanc: 2 }, phrase: 'Fais du bleu clair !' },
      { id: 'gris', nom: 'Gris', recette: { blanc: 2, noir: 1 }, phrase: 'Fais du gris !' },
      { id: 'marron', nom: 'Marron', recette: { rouge: 1, jaune: 1, bleu: 1 }, phrase: 'Fais du marron !' },
    ],
  },
  {
    id: 3,
    titre: 'Les proportions',
    consigne: 'Plus de l’une, moins de l’autre !',
    cibles: [
      { id: 'orange-dore', nom: 'Orange doré', recette: { rouge: 1, jaune: 2 }, phrase: 'Plus de jaune !' },
      { id: 'vert-pomme', nom: 'Vert pomme', recette: { jaune: 2, bleu: 1 }, phrase: 'Plus de jaune !' },
      { id: 'violet-rouge', nom: 'Violet rouge', recette: { rouge: 2, bleu: 1 }, phrase: 'Plus de rouge !' },
      { id: 'vert-sapin', nom: 'Vert sapin', recette: { jaune: 1, bleu: 1, noir: 1 }, phrase: 'Un peu de noir !' },
    ],
  },
];

export function targetRgb(cible) {
  return mixToRgb(cible.recette);
}
