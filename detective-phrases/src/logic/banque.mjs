// Validation des banques de questions. Module pur.
import { phraseCorrigee } from './partie.mjs';

export const ENQUETES = ['fautes', 'pronoms', 'temps', 'mystere'];
const PRONOMS = ['il', 'elle', 'ils', 'elles', 'nous', 'vous', 'je', 'tu'];
const REGLES = ['accord', 'a-à', 'et-est', 'son-sont', 'on-ont', 'majuscule', 'point'];
const TEMPS_CONJ = ['present', 'futur', 'passe-compose'];
const KINDS = {
  fautes: ['faute'],
  pronoms: ['pronom-remplacer', 'pronom-choisir'],
  temps: ['temps-classer', 'temps-conjuguer'],
};
const KINDS_ETAPE = [...KINDS.fautes, ...KINDS.pronoms, ...KINDS.temps];
const FAMILLE = (kind) => (kind === 'faute' ? 'faute' : kind.startsWith('pronom') ? 'pronom' : 'temps');
const MAJ = /^\p{Lu}/u;
const PONCT = ['.', ',', '?', '!'];

function validerCorps(q, nom, err) {
  const e = (m) => err.push(`${nom} : ${m}`);
  if (!Array.isArray(q.mots) || q.mots.length < 3 || q.mots.some((m) => typeof m !== 'string' || !m)) {
    e('mots invalides');
    return;
  }
  if (!Array.isArray(q.choix) || q.choix.length < 2 || q.choix.length > 4 || new Set(q.choix).size !== q.choix.length) {
    e('choix invalides (2 à 4 chaînes distinctes)');
    return;
  }
  if (!q.choix.includes(q.bonne)) e('bonne absente de choix');
  if (typeof q.explication !== 'string' || !q.explication || q.explication.length > 120) e('explication absente ou > 120 caractères');
  const dansMots = (i) => Number.isInteger(i) && i >= 0 && i < q.mots.length;
  switch (q.kind) {
    case 'faute':
      if (!REGLES.includes(q.regle)) e('regle inconnue');
      if (!dansMots(q.faute)) return e('indice faute invalide');
      if (q.regle === 'point') {
        if (q.mots[q.faute] !== '_' || q.faute !== q.mots.length - 1) e('point : « _ » attendu en dernier jeton');
        if (!['.', '?', ','].includes(q.bonne) || !q.choix.every((c) => ['.', '?', ','].includes(c))) e('point : choix invalides');
      } else {
        if (!q.choix.includes(q.mots[q.faute])) e('mots[faute] absent de choix');
        if (q.mots[q.faute] === q.bonne) e('mots[faute] égal à bonne');
      }
      break;
    case 'pronom-remplacer': {
      const g = q.groupe;
      if (!Array.isArray(g) || g.length !== 2 || !dansMots(g[0]) || !dansMots(g[1]) || g[0] > g[1]) return e('groupe invalide');
      pronoms(q, g[0], e);
      break;
    }
    case 'pronom-choisir':
      if (!dansMots(q.trou) || q.mots[q.trou] !== '___') return e('trou invalide');
      pronoms(q, q.trou, e);
      break;
    case 'temps-classer':
      if (JSON.stringify(q.choix) !== JSON.stringify(['passe', 'present', 'futur'])) e('choix : passe, present, futur attendus');
      if (q.indice !== undefined && !dansMots(q.indice)) e('indice invalide');
      break;
    case 'temps-conjuguer':
      if (!dansMots(q.trou) || q.mots[q.trou] !== '___') return e('trou invalide');
      if (!TEMPS_CONJ.includes(q.temps)) e('temps inconnu');
      if (!(q.verbe === 'être' || q.verbe === 'avoir' || /er$/.test(q.verbe || ''))) e('verbe : être, avoir ou 1er groupe');
      break;
    default:
      return e(`kind inconnu « ${q.kind} »`);
  }
  const c = phraseCorrigee(q);
  if (!MAJ.test(c[0])) e('la phrase corrigée ne commence pas par une majuscule');
  if (!['.', '?', '!'].includes(c[c.length - 1])) e('la phrase corrigée ne finit pas par . ? !');
  if (c.slice(0, -1).some((m, i) => i > 0 && PONCT.includes(m) && PONCT.includes(c[i - 1]))) e('ponctuation doublée');
}

function pronoms(q, debut, e) {
  for (const c of q.choix) {
    if (!PRONOMS.includes(c.toLowerCase())) e(`pronom inconnu « ${c} »`);
    else if (debut === 0 ? !MAJ.test(c) : c !== c.toLowerCase()) e(`majuscule incorrecte pour « ${c} »`);
  }
}

export function validerBanque(enquete, questions) {
  const err = [];
  if (!ENQUETES.includes(enquete)) return [`enquête inconnue « ${enquete} »`];
  if (!Array.isArray(questions)) return ['la banque doit être un tableau'];
  if (questions.length < 30) err.push(`moins de 30 questions (${questions.length})`);
  const ids = new Set();
  const parPalier = { 1: 0, 2: 0, 3: 0 };
  for (const q of questions) {
    const nom = q && q.id ? q.id : '(sans id)';
    if (!q || !q.id || ids.has(q.id)) err.push(`${nom} : id manquant ou en double`);
    else ids.add(q.id);
    if (![1, 2, 3].includes(q.palier)) err.push(`${nom} : palier invalide`);
    else parPalier[q.palier]++;
    if (enquete === 'mystere') {
      if (q.kind !== 'mystere') {
        err.push(`${nom} : kind « mystere » attendu`);
        continue;
      }
      validerMystere(q, nom, err);
    } else if (!KINDS[enquete].includes(q.kind)) {
      err.push(`${nom} : kind « ${q.kind} » interdit dans ${enquete}`);
    } else {
      validerCorps(q, nom, err);
    }
  }
  for (const pal of [1, 2, 3]) if (parPalier[pal] < 8) err.push(`palier ${pal} : moins de 8 questions (${parPalier[pal]})`);
  return err;
}

function validerMystere(q, nom, err) {
  const attendu = q.palier === 1 ? 2 : 3;
  if (!Array.isArray(q.etapes) || q.etapes.length !== attendu) return err.push(`${nom} : ${attendu} étapes attendues`);
  const fam = new Set();
  let base = null;
  q.etapes.forEach((et, i) => {
    const n = `${nom}/étape ${i + 1}`;
    if (!KINDS_ETAPE.includes(et.kind)) return err.push(`${n} : kind invalide`);
    if (et.id !== undefined || et.palier !== undefined) err.push(`${n} : id/palier interdits`);
    fam.add(FAMILLE(et.kind));
    validerCorps(et, n, err);
    if (i === 0) {
      if (et.kind !== 'faute') err.push(`${n} : l'étape faute vient en premier`);
      else base = phraseCorrigee(et);
    } else {
      if (et.kind === 'faute') err.push(`${n} : une seule étape faute`);
      if (base && JSON.stringify(et.mots) !== JSON.stringify(base)) err.push(`${n} : phrase différente de la phrase corrigée`);
    }
  });
  if (fam.size < 2) err.push(`${nom} : au moins deux familles différentes`);
}
