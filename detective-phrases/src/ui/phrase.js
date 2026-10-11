// Phrase en étiquettes : mots cliquables (phase trouver), groupe souligné, trou, case vide.
import { el } from './dom.js';
import { phraseCorrigee } from '../logic/partie.mjs';

const PONCT = ['.', ',', '?', '!'];

function indicesChanges(q) {
  switch (q.kind) {
    case 'faute': return new Set([q.faute]);
    case 'pronom-remplacer': return new Set([q.groupe[0]]);
    case 'pronom-choisir':
    case 'temps-conjuguer': return new Set([q.trou]);
    default: return new Set();
  }
}

// mode : 'trouver' | 'corriger' | 'choisir' | 'resolu'
export function rendrePhrase(zone, q, mode, { onMot, fauxIndex } = {}) {
  zone.replaceChildren();
  const resolu = mode === 'resolu';
  const mots = resolu ? phraseCorrigee(q) : q.mots;
  const changes = resolu ? indicesChanges(q) : new Set();
  mots.forEach((m, i) => {
    const classes = ['mot'];
    let texte = m;
    const ponct = PONCT.includes(m);
    if (ponct) classes.push('ponct');
    if (!resolu && q.kind === 'pronom-remplacer' && i >= q.groupe[0] && i <= q.groupe[1]) classes.push('groupe');
    if (!resolu && m === '___') { classes.push('trou'); texte = ''; }
    if (!resolu && m === '_') { classes.push('vide'); texte = ''; }
    if (!resolu && mode === 'corriger' && q.kind === 'faute' && i === q.faute) classes.push('cible');
    if (q.kind === 'temps-classer' && q.indice === i) classes.push('repere');
    if (changes.has(i)) classes.push('change');
    if (i === fauxIndex) classes.push('faux');
    const cliquable = mode === 'trouver' && !ponct;
    const n = el(cliquable ? 'button' : 'span', { class: classes.join(' '), texte });
    if (cliquable) {
      n.type = 'button';
      n.setAttribute('aria-label', m === '_' ? 'fin de la phrase' : m);
      n.addEventListener('click', () => onMot && onMot(i));
    }
    zone.append(n);
  });
}
