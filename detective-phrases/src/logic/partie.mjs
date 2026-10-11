// Déroulement d'une partie. Module pur (aucun DOM, aucun three.js).
import { creerRng } from './rng.mjs';

const INDICES = {
  accord: 'Un seul ou plusieurs ? Regarde bien les mots.',
  'a-à': 'Essaie de dire « avait » à la place.',
  'et-est': 'Essaie de dire « était » à la place.',
  'son-sont': 'Essaie de dire « étaient » à la place.',
  'on-ont': 'Essaie de dire « avaient » à la place.',
  majuscule: 'Regarde bien le premier mot.',
  point: 'Regarde bien la fin de la phrase.',
};

export function melanger(tab, rng) {
  const t = [...tab];
  for (let i = t.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [t[i], t[j]] = [t[j], t[i]];
  }
  return t;
}

export function phraseCorrigee(q) {
  const m = [...q.mots];
  switch (q.kind) {
    case 'faute':
      m[q.faute] = q.bonne;
      break;
    case 'pronom-remplacer':
      m.splice(q.groupe[0], q.groupe[1] - q.groupe[0] + 1, q.bonne);
      break;
    case 'pronom-choisir':
    case 'temps-conjuguer':
      m[q.trou] = q.bonne;
      break;
    default:
  }
  return m;
}

export function etoiles(erreurs) {
  if (erreurs <= 1) return 3;
  if (erreurs <= 3) return 2;
  return 1;
}

function phaseInitiale(q) {
  return q && q.kind === 'faute' ? 'trouver' : 'choisir';
}

export function questionCourante(p) {
  if (!p || p.finie) return null;
  const q = p.questions[p.index];
  if (!q) return null;
  return q.kind === 'mystere' ? q.etapes[p.etape] : q;
}

export function creerPartie(questions, { palier = 1, nb = 6, rng } = {}) {
  const alea = rng || creerRng(Date.now());
  const choisies = melanger(questions.filter((q) => q.palier === palier), alea).slice(0, nb);
  for (let pal = palier - 1; pal >= 1 && choisies.length < nb; pal--) {
    const reste = melanger(questions.filter((q) => q.palier === pal), alea);
    choisies.push(...reste.slice(0, nb - choisies.length));
  }
  const p = {
    palier,
    nb: choisies.length,
    questions: choisies,
    index: 0,
    etape: 0,
    phase: 'choisir',
    erreurs: 0,
    retires: [],
    finie: choisies.length === 0,
  };
  p.phase = phaseInitiale(questionCourante(p));
  return p;
}

export function toucherMot(p, i) {
  const q = questionCourante(p);
  if (!q || p.phase !== 'trouver') return { ok: false, message: '', ignore: true };
  if (i === q.faute) {
    p.phase = 'corriger';
    return { ok: true, message: '' };
  }
  p.erreurs++;
  return { ok: false, message: `Pas celui-là, cherche encore ! ${INDICES[q.regle] || ''}`.trim() };
}

function avancer(p) {
  const q = p.questions[p.index];
  p.retires = [];
  if (q.kind === 'mystere' && p.etape + 1 < q.etapes.length) {
    p.etape++;
  } else {
    p.index++;
    p.etape = 0;
    if (p.index >= p.questions.length) p.finie = true;
  }
  p.phase = phaseInitiale(questionCourante(p));
}

export function choisir(p, valeur) {
  const q = questionCourante(p);
  if (!q || p.phase === 'trouver' || !q.choix.includes(valeur) || p.retires.includes(valeur)) {
    return { ok: false, explication: '', suivante: null, finie: p.finie, ignore: true };
  }
  if (valeur === q.bonne) {
    avancer(p);
    return { ok: true, explication: q.explication, suivante: questionCourante(p), finie: p.finie };
  }
  p.erreurs++;
  p.retires.push(valeur);
  return { ok: false, explication: q.explication, suivante: null, finie: false };
}
