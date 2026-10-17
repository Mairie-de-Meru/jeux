// Règles pures du jeu des petits chevaux (aucun DOM, aucun three.js). Voir .project/ARCHITECTURE.md.
export const COULEURS = ['rouge', 'bleu', 'jaune', 'vert'];
export const DEPART = [0, 14, 28, 42];
export const ARRIVE = 61;
export const NOMS_ROBOTS = ['Cheval bleu', 'Cheval jaune', 'Cheval vert'];

export const PALIERS = {
  1: { nom: 'Découverte', chevaux: 2, sortie: [5, 6], prises: false, escalierExact: false, blocage: false, surlignage: true, comptageVoix: true },
  2: { nom: 'Classique', chevaux: 4, sortie: [6], prises: false, escalierExact: true, blocage: false, surlignage: true, comptageVoix: false },
  3: { nom: 'Champion', chevaux: 4, sortie: [6], prises: true, escalierExact: true, blocage: true, surlignage: false, comptageVoix: false },
};

const clone = (o) => JSON.parse(JSON.stringify(o));

// Case commune (0..55) occupée par un cheval de progression p de la couleur c, sinon null.
export function caseCommune(c, p) {
  return p >= 0 && p <= 55 ? (14 * c + p) % 56 : null;
}

export function nouvellePartie({ palier = 1, nbRobots = 1, difficulte = 'facile', seed = 1 } = {}) {
  const cfg = PALIERS[palier];
  if (!cfg) throw new Error('palier inconnu : ' + palier);
  const n = Math.max(1, Math.min(3, nbRobots));
  const joueurs = [];
  for (let c = 0; c <= n; c++) {
    joueurs.push({
      couleur: COULEURS[c],
      nom: c === 0 ? 'Toi' : NOMS_ROBOTS[c - 1],
      humain: c === 0,
      chevaux: Array(cfg.chevaux).fill(-1),
      rang: null,
    });
  }
  return { palier, nbRobots: n, difficulte, seed, joueurs, courant: 0, phase: 'lancer', de: null, coups: [], classement: [], tour: 0 };
}

export function joueurCourant(state) { return state.courant; }

export function progressionTotale(state, j) {
  return state.joueurs[j].chevaux.reduce((s, p) => s + p, 0);
}

export function legalMoves(state, j, de) {
  const cfg = PALIERS[state.palier];
  const own = state.joueurs[j].chevaux;
  const moves = [];
  for (let h = 0; h < own.length; h++) {
    const depuis = own[h];
    if (depuis === ARRIVE) continue;
    let vers;
    if (depuis === -1) {
      if (!cfg.sortie.includes(de)) continue;
      vers = 0;
    } else {
      vers = depuis + de;
      if (vers > ARRIVE) {
        if (cfg.escalierExact) continue;
        vers = ARRIVE;
      }
    }
    // jamais s'arrêter sur un de ses chevaux (les arrivés se rangent ensemble)
    if (vers !== ARRIVE && own.some((q, k) => k !== h && q === vers)) continue;
    if (cfg.blocage && depuis >= 0) {
      let bloque = false;
      for (let q = depuis + 1; q < vers && q <= 55; q++) {
        if (own.some((o, k) => k !== h && o === q)) { bloque = true; break; }
      }
      if (bloque) continue;
    }
    const prises = [];
    if (cfg.prises && vers <= 55) {
      const cell = caseCommune(j, vers);
      state.joueurs.forEach((adv, k) => {
        if (k === j) return;
        adv.chevaux.forEach((p, g) => { if (caseCommune(k, p) === cell) prises.push({ joueur: k, cheval: g }); });
      });
    }
    const type = depuis === -1 ? 'sortie' : vers === ARRIVE ? 'arrivee' : vers >= 56 ? 'escalier' : 'avance';
    moves.push({ cheval: h, de, depuis, vers, type, prises });
  }
  return moves;
}

function suivant(s) {
  const n = s.joueurs.length;
  for (let i = 1; i <= n; i++) {
    const k = (s.courant + i) % n;
    if (!s.classement.includes(k)) return k;
  }
  return s.courant;
}

// Lance le dé (valeur fournie) : calcule les coups ; sans coup, le tour passe (sauf 6).
export function lancer(state, valeur) {
  if (state.phase !== 'lancer') throw new Error('phase invalide pour lancer : ' + state.phase);
  const s = clone(state);
  const j = s.courant;
  const evenements = [{ type: 'lancer', joueur: j, de: valeur }];
  s.de = valeur;
  s.coups = legalMoves(s, j, valeur);
  if (s.coups.length) {
    s.phase = 'choisir';
  } else {
    const rejoue = valeur === 6;
    evenements.push({ type: 'passe', joueur: j, rejoue });
    if (!rejoue) s.courant = suivant(s);
    s.tour++;
  }
  return { state: s, evenements };
}

// Termine la partie : les non finis sont classés par progression totale décroissante.
export function forcerFin(state) {
  const s = clone(state);
  const restants = s.joueurs.map((_, i) => i).filter((i) => !s.classement.includes(i));
  restants.sort((a, b) => progressionTotale(s, b) - progressionTotale(s, a) || a - b);
  for (const i of restants) s.classement.push(i);
  s.joueurs.forEach((jo, i) => { jo.rang = s.classement.indexOf(i) + 1; });
  s.phase = 'fini';
  s.coups = [];
  return s;
}

export function jouer(state, coup) {
  if (state.phase !== 'choisir') throw new Error('phase invalide pour jouer : ' + state.phase);
  const s = clone(state);
  const j = s.courant;
  const m = s.coups.find((c) => c.cheval === coup.cheval && c.vers === coup.vers);
  if (!m) throw new Error('coup illégal');
  const me = s.joueurs[j];
  const evenements = [];
  me.chevaux[m.cheval] = m.vers;
  if (m.type === 'sortie') {
    evenements.push({ type: 'sortie', joueur: j, cheval: m.cheval });
  } else {
    const cases = [];
    for (let q = m.depuis + 1; q <= m.vers; q++) cases.push(q);
    evenements.push({ type: 'deplacement', joueur: j, cheval: m.cheval, depuis: m.depuis, vers: m.vers, cases });
  }
  for (const pr of m.prises) {
    s.joueurs[pr.joueur].chevaux[pr.cheval] = -1;
    evenements.push({ type: 'prise', joueur: pr.joueur, cheval: pr.cheval, par: j });
  }
  let fini = false;
  if (m.vers === ARRIVE) {
    evenements.push({ type: 'arrivee', joueur: j, cheval: m.cheval });
    if (me.chevaux.every((p) => p === ARRIVE)) {
      fini = true;
      s.classement.push(j);
      me.rang = s.classement.length;
      evenements.push({ type: 'joueurFini', joueur: j, rang: me.rang });
    }
  }
  s.coups = [];
  s.tour++;
  const restants = s.joueurs.filter((_, i) => !s.classement.includes(i)).length;
  if (s.classement.includes(0) || restants <= 1) {
    const f = forcerFin(s);
    f.de = s.de;
    evenements.push({ type: 'partieFinie', classement: f.classement.slice() });
    return { state: f, evenements };
  }
  s.phase = 'lancer';
  if (fini || s.de !== 6) s.courant = suivant(s);
  return { state: s, evenements };
}
