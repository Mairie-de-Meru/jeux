// Objectifs (niveaux) et paliers. Formulations originales.
export const OBJECTIVES = [
  { id: 1, groups: [{ t: 'set', size: 3 }, { t: 'set', size: 3 }], title: 'Deux trios : deux fois 3 cartes avec le même nombre',
    speech: 'Fais deux trios. Un trio, ce sont trois cartes avec le même nombre, par exemple trois cinq. La couleur ne compte pas.' },
  { id: 2, groups: [{ t: 'set', size: 3 }, { t: 'run', size: 4 }], title: 'Un trio et une suite de 4',
    speech: 'Fais un trio, trois cartes avec le même nombre, par exemple trois cinq. Et une suite de quatre nombres qui se suivent, comme trois, quatre, cinq, six. La couleur ne compte pas.' },
  { id: 3, groups: [{ t: 'set', size: 4 }, { t: 'run', size: 4 }], title: 'Un carré et une suite de 4',
    speech: 'Fais un carré, quatre cartes avec le même nombre, par exemple quatre neuf. Et une suite de quatre nombres qui se suivent, comme trois, quatre, cinq, six.' },
  { id: 4, groups: [{ t: 'run', size: 7 }], title: 'Une suite de 7',
    speech: 'Fais une suite de sept nombres qui se suivent, par exemple de un à sept. La couleur ne compte pas.' },
  { id: 5, groups: [{ t: 'run', size: 8 }], title: 'Une suite de 8',
    speech: 'Fais une suite de huit nombres qui se suivent, par exemple de un à huit. La couleur ne compte pas.' },
  { id: 6, groups: [{ t: 'colour', size: 7 }], title: '7 cartes de la même couleur',
    speech: 'Rassemble sept cartes de la même couleur, par exemple sept cartes rouges. Les nombres peuvent être différents.' },
  { id: 7, groups: [{ t: 'set', size: 4 }, { t: 'set', size: 4 }], title: 'Deux carrés : deux fois 4 cartes avec le même nombre',
    speech: 'Fais deux carrés. Un carré, ce sont quatre cartes avec le même nombre, par exemple quatre neuf. La couleur ne compte pas.' },
  { id: 8, groups: [{ t: 'set', size: 3 }, { t: 'run', size: 5 }], title: 'Un trio et une suite de 5',
    speech: 'Fais un trio, trois cartes avec le même nombre. Et une suite de cinq nombres qui se suivent, comme trois, quatre, cinq, six, sept.' },
];

// help : 'auto' (cartes utiles entourées + bouton), 'button', 'none'
export const PALIERS = {
  1: { id: 1, label: 'Court', objectiveIds: [1, 2, 4, 6], hand: 8, help: 'auto' },
  2: { id: 2, label: 'Complet', objectiveIds: [1, 2, 3, 4, 5, 6, 7, 8], hand: 10, help: 'button' },
  3: { id: 3, label: 'Expert', objectiveIds: [1, 2, 3, 4, 5, 6, 7, 8], hand: 10, help: 'none' },
};

export function objectiveAt(palier, levelIdx) {
  const pal = PALIERS[palier];
  const id = pal.objectiveIds[Math.min(levelIdx, pal.objectiveIds.length - 1)];
  return OBJECTIVES.find((o) => o.id === id);
}

export function objectiveTotal(obj) {
  return obj.groups.reduce((s, g) => s + g.size, 0);
}

export const RULES_SPEECH =
  'À ton tour, prends une carte dans la pioche, ou sur le dessus d\'une défausse : la tienne ou celle d\'un autre. Quand tu as les cartes de ton objectif, choisis-les et appuie sur Poser. ' +
  'Ensuite tu peux ajouter des cartes aux groupes posés. Pour finir, jette une carte sur ta défausse. ' +
  'Le joker remplace n\'importe quelle carte. La carte passe se pose, à la place d\'une défausse, devant un adversaire de ton choix : il passera son tour. ' +
  'Celui qui n\'a plus de cartes termine la manche et monte de deux niveaux. Les autres qui ont posé montent d\'un niveau. Celui qui pose le niveau huit gagne tout de suite.';
