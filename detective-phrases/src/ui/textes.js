// Consignes et textes lus à voix haute.
export const NOMS_ENQUETES = { fautes: 'Fautes', pronoms: 'Pronoms', temps: 'Temps', mystere: 'Mystère' };
const TEMPS_LABEL = { present: 'au présent', futur: 'au futur', 'passe-compose': 'au passé composé' };
export const LABELS_PONCT = { '.': ['.', 'point'], '?': ['?', 'interrogation'], ',': [',', 'virgule'] };
export const FRISE = {
  passe: { ico: '🌙', label: 'Hier' },
  present: { ico: '☀️', label: "Aujourd'hui" },
  futur: { ico: '➡️', label: 'Demain' },
};

export function consigne(q, phase) {
  switch (q.kind) {
    case 'faute':
      if (phase === 'trouver') return 'Touche le mot qui a une faute.';
      return q.regle === 'point' ? 'Quel signe faut-il mettre ?' : 'Choisis la bonne façon de l’écrire.';
    case 'pronom-remplacer':
      return 'Quel mot peut remplacer le groupe souligné ?';
    case 'pronom-choisir':
      return 'Quel mot va dans la case ?';
    case 'temps-classer':
      return 'C’est quand ? Hier, aujourd’hui ou demain ?';
    case 'temps-conjuguer':
      return `Verbe « ${q.verbe} » ${TEMPS_LABEL[q.temps]} : choisis la bonne forme.`;
    default:
      return '';
  }
}

export function texteLu(mots) {
  return mots
    .map((m) => (m === '___' ? 'blanc' : m === '_' ? '' : m))
    .filter(Boolean)
    .join(' ')
    .replace(/ ([.,?!])/g, '$1');
}
