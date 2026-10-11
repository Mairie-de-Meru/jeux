// Boucle, machine d'écrans, câblage logique <-> rendu, crochet de débogage.
import { createScene } from './scene.js';
import { createUI } from './ui.js';
import { initAudio, jouerInstrument, sonBravo, sonIndice, clic, maintenant } from './audio.js';
import { INSTRUMENTS, instrumentsPourPalier } from './logic/instruments.js';
import { createRng } from './logic/rng.js';
import { createEcho, sequenceAJouer, commencerSaisie, jouer, etoilesEcho } from './logic/echo.js';
import { createRythme, frapper, manquees, etoilesRythme, periode } from './logic/rythme.js';
import { createGrille, basculer, notesAuPas, vider, pasSuivant, serialiser as serGrille, deserialiser as deserGrille, ATELIER_BPM } from './logic/atelier.js';
import { createProgression, enregistrer, serialiser as serProg, deserialiser as deserProg } from './logic/score.js';

const CLE_PROG = 'orchestre-rythmes-progression';
const CLE_ATELIER = 'orchestre-rythmes-atelier';
const TOUS = INSTRUMENTS.map((i) => i.id);
const debug = new URLSearchParams(location.search).has('debug');

const lire = (cle) => { try { return localStorage.getItem(cle); } catch { return null; } };
const ecrire = (cle, v) => { try { localStorage.setItem(cle, v); } catch { /* stockage indisponible */ } };

let prog = deserProg(lire(CLE_PROG));
let ecranCourant = 'accueil';
let mode = null;
let palier = 1;
let echo = null;
let rythme = null;
let grille = null;
let token = 0; // invalide les temporisations d'une partie précédente
let rythmeInfo = null; // { t0, annonce, fin }
let atelierPlay = { actif: false, pas: 0, prochain: 0 };

const canvas = document.getElementById('canvas');
const scene = createScene(canvas);

const ui = createUI({
  onJouer: () => { initAudio(); allerModes(); },
  onMode: (m) => { initAudio(); choisirMode(m); },
  onModes: () => allerModes(),
  onPalier: (n) => lancer(mode, n),
  onMaison: () => allerAccueil(),
  onConsigne: () => ui.dire(consigne()),
  onEncore: () => lancer(mode, palier),
  onSuivant: () => lancer(mode, Math.min(3, palier + 1)),
  onAtelierCase: (id, pas) => atelierBasculer(id, pas),
  onAtelierPlay: () => atelierToggle(),
  onAtelierVider: () => { grille = vider(grille); ui.majAtelier(grille); ecrire(CLE_ATELIER, serGrille(grille)); },
});

// ---------- utilitaires ----------
function delai(fn, ms) {
  const id = token;
  setTimeout(() => { if (id === token) fn(); }, ms);
}
function sonEtRebond(id) {
  jouerInstrument(id);
  scene.rebondir(id);
}
function consigne() {
  if (ecranCourant === 'accueil') return 'Bienvenue à l\'orchestre ! Appuie sur le bouton pour jouer.';
  if (ecranCourant === 'mode') return 'Choisis un jeu : Écho, Rythme ou Atelier.';
  if (ecranCourant === 'palier') return 'Choisis ton niveau.';
  if (mode === 'echo') return 'Écoute l\'orchestre, puis touche les instruments dans le même ordre.';
  if (mode === 'rythme') return 'Tape sur le tambour en même temps que la balle.';
  if (mode === 'atelier') return 'Touche les cases pour composer ta musique, puis appuie sur lecture.';
  return '';
}
function arreter() {
  token++;
  echo = null;
  rythme = null;
  rythmeInfo = null;
  atelierPlay.actif = false;
  ui.setPlay(false);
  scene.balle(null);
  try { speechSynthesis.cancel(); } catch { /* sans voix */ }
}

// ---------- navigation ----------
function allerAccueil() {
  arreter();
  mode = null;
  ecranCourant = 'accueil';
  scene.afficher(TOUS);
  ui.majAccueil(prog);
  ui.montrer('accueil');
}
function allerModes() {
  arreter();
  ecranCourant = 'mode';
  scene.afficher(TOUS);
  ui.montrer('mode');
  ui.dire(consigne());
}
function choisirMode(m) {
  mode = m;
  if (m === 'atelier') { lancer('atelier', 1); return; }
  ecranCourant = 'palier';
  ui.construirePaliers(m, prog);
  ui.montrer('palier');
}
function lancer(m, p) {
  if (!['echo', 'rythme', 'atelier'].includes(m)) return;
  arreter();
  initAudio();
  mode = m;
  palier = Math.max(1, Math.min(3, p | 0 || 1));
  ecranCourant = 'jeu';
  if (m === 'echo') lancerEcho();
  else if (m === 'rythme') lancerRythme();
  else lancerAtelier();
}

function finir(etoiles) {
  token++;
  if (mode === 'echo' || mode === 'rythme') {
    prog = enregistrer(prog, mode, palier, etoiles);
    ecrire(CLE_PROG, serProg(prog));
  }
  ecranCourant = 'fin';
  rythmeInfo = null;
  scene.balle(null);
  ui.afficherFin(etoiles, palier < 3);
  sonBravo();
  ui.dire('Bravo !');
}

// ---------- Écho ----------
function lancerEcho() {
  echo = createEcho({ palier, rng: createRng((Date.now() & 0x7fffffff) || 1) });
  scene.afficher(instrumentsPourPalier(palier));
  ui.montrer('jeu', { hud: true });
  jouerSequenceEcho(900);
}
function jouerSequenceEcho(attente = 700) {
  const id = ++token;
  ui.setBulle('Écoute !');
  ui.setPips(0, echo.longueur);
  const seq = sequenceAJouer(echo);
  let i = 0;
  const pas = () => {
    if (id !== token) return;
    if (i < seq.length) {
      sonEtRebond(seq[i++]);
      setTimeout(pas, 750);
    } else {
      echo = commencerSaisie(echo);
      ui.setBulle('À toi !');
    }
  };
  setTimeout(pas, attente);
}
function toucheEcho(id) {
  if (!echo) return;
  sonEtRebond(id);
  const r = jouer(echo, id);
  echo = r.etat;
  if (r.resultat === 'bon') {
    ui.setPips(echo.saisie.length, echo.longueur);
  } else if (r.resultat === 'manche') {
    ui.setPips(echo.longueur - 1, echo.longueur - 1);
    ui.setBulle('Bravo ! Un de plus !', 'ok');
    delai(() => jouerSequenceEcho(300), 1000);
  } else if (r.resultat === 'gagne') {
    ui.setPips(echo.longueur, echo.longueur);
    const etoiles = etoilesEcho(echo.erreurs);
    delai(() => finir(etoiles), 800);
  } else if (r.resultat === 'indice') {
    sonIndice();
    scene.clignoter(r.attendu);
    ui.setBulle('Écoute encore !', 'doux');
    ui.setPips(0, echo.longueur);
    delai(() => jouerSequenceEcho(300), 1500);
  }
}

// ---------- Rythme ----------
function lancerRythme() {
  scene.afficher(['tambour'], { solo: true, balle: true });
  ui.montrer('jeu', { hud: true });
  const t0 = performance.now() + 900;
  rythme = createRythme({ palier, depart: t0 });
  const p = periode(rythme.bpm);
  rythmeInfo = { t0, annonce: false, fin: false };
  const nb = 2 + rythme.frappes;
  const base = maintenant() + (t0 - performance.now()) / 1000;
  for (let k = 0; k < nb; k++) clic(base + (k * p) / 1000, k === 0);
  ui.setBulle('Prépare-toi !');
  ui.setPips(0, rythme.frappes);
}
function retourRythme(verdict) {
  if (verdict === 'juste') ui.setBulle('Bravo !', 'ok');
  else if (verdict === 'avance') ui.setBulle('Un peu tôt', 'doux');
  else if (verdict === 'retard') ui.setBulle('Un peu tard', 'doux');
}
function frappeRythme(t = performance.now()) {
  sonEtRebond('tambour');
  if (!rythme || rythme.fini) return;
  const r = frapper(rythme, t);
  rythme = r.etat;
  retourRythme(r.verdict);
  ui.setPips(rythme.index, rythme.frappes);
}
function majRythme(now) {
  if (!rythme || !rythmeInfo) return;
  const p = periode(rythme.bpm);
  const dt = now - rythmeInfo.t0;
  if (!rythmeInfo.annonce && now >= rythme.cibles[0] - p * 0.9) {
    rythmeInfo.annonce = true;
    ui.setBulle('Tape !');
  }
  if (!rythme.fini) {
    const avant = rythme.resultats.length;
    rythme = manquees(rythme, now);
    if (rythme.resultats.length > avant) {
      ui.setBulle('On continue !', 'doux');
      ui.setPips(rythme.index, rythme.frappes);
    }
  }
  if (rythme.fini && !rythmeInfo.fin) {
    rythmeInfo.fin = true;
    const etoiles = etoilesRythme(rythme.resultats);
    delai(() => finir(etoiles), 900);
  }
  if (dt >= 0 && !rythmeInfo.fin) scene.balle((((dt % p) + p) % p) / p);
  else scene.balle(null);
}

// ---------- Atelier ----------
function lancerAtelier() {
  if (!grille) {
    const g = deserGrille(lire(CLE_ATELIER));
    grille = g.ids.length === TOUS.length && TOUS.every((id) => g.ids.includes(id)) ? g : createGrille(TOUS);
  }
  scene.afficher(TOUS);
  ui.construireAtelier(grille);
  ui.setPlay(false);
  ui.montrer('jeu', { hud: true, atelier: true });
  ui.setBulle('Compose ta musique !');
  ui.setPips(0, 0);
  scene.resize();
}
function atelierBasculer(id, pas) {
  grille = basculer(grille, id, pas);
  ui.majAtelier(grille);
  ecrire(CLE_ATELIER, serGrille(grille));
  if (grille.cases[id][pas]) sonEtRebond(id);
}
function atelierToggle(force) {
  atelierPlay.actif = force ?? !atelierPlay.actif;
  atelierPlay.pas = 0;
  atelierPlay.prochain = performance.now();
  ui.setPlay(atelierPlay.actif);
}
function majAtelier(now) {
  if (!atelierPlay.actif || !grille || now < atelierPlay.prochain) return;
  const pas = atelierPlay.pas;
  for (const id of notesAuPas(grille, pas)) sonEtRebond(id);
  ui.setCurseur(pas);
  atelierPlay.pas = pasSuivant(pas);
  atelierPlay.prochain = Math.max(atelierPlay.prochain + 30000 / ATELIER_BPM, now - 50);
}

// ---------- entrées ----------
document.addEventListener('pointerdown', () => initAudio(), { capture: true });
scene.onPick((id) => {
  if (ecranCourant !== 'jeu') return;
  if (mode === 'rythme') frappeRythme();
  else if (id && mode === 'echo') toucheEcho(id);
  else if (id && mode === 'atelier') sonEtRebond(id);
});
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && ecranCourant === 'jeu' && mode === 'rythme') {
    e.preventDefault();
    if (!e.repeat) frappeRythme();
  }
});
new ResizeObserver(() => scene.resize()).observe(canvas);

// ---------- boucle ----------
let dernierDebug = 0;
function boucle(now) {
  requestAnimationFrame(boucle);
  scene.update(now);
  if (ecranCourant === 'jeu') {
    if (mode === 'rythme') majRythme(performance.now());
    else if (mode === 'atelier') majAtelier(now);
  }
  scene.render();
  if (debug && now - dernierDebug > 250) {
    dernierDebug = now;
    ui.debug(JSON.stringify(etat(), null, 1).slice(0, 700));
  }
}

// ---------- manifeste d'images (facultatif) ----------
async function chargerManifeste() {
  try {
    const res = await fetch('./assets/manifest.json', { cache: 'no-store' });
    if (!res.ok) return;
    const m = await res.json();
    const images = {};
    for (const [k, v] of Object.entries(m?.images ?? {})) if (typeof v === 'string' && v) images[k] = v;
    ui.appliquerImages(images);
  } catch { /* pas d'images : repli couleurs et émojis */ }
}

// ---------- crochet de débogage ----------
function etat() {
  return {
    ecran: ecranCourant,
    mode,
    palier,
    logique: mode === 'echo' ? echo : mode === 'rythme' ? rythme : mode === 'atelier' ? grille : null,
    atelierPlay: mode === 'atelier' ? atelierPlay.actif : undefined,
  };
}
window.__orchestre = {
  etat,
  lancer,
  echo: {
    repondre() {
      if (!echo) return;
      if (echo.phase !== 'joue') { token++; echo = commencerSaisie(echo); }
      toucheEcho(echo.sequence[echo.saisie.length]);
    },
    erreur() {
      if (!echo) return;
      if (echo.phase !== 'joue') { token++; echo = commencerSaisie(echo); }
      const attendu = echo.sequence[echo.saisie.length];
      toucheEcho(instrumentsPourPalier(palier).find((id) => id !== attendu));
    },
  },
  rythme: {
    frapperJuste() {
      if (rythme && !rythme.fini) frappeRythme(rythme.cibles[rythme.index]);
    },
  },
  atelier: {
    basculer: (id, pas) => { if (grille) atelierBasculer(id, pas); },
    jouer: () => atelierToggle(true),
  },
  finirPalier: (etoiles = 3) => finir(etoiles),
  progression: () => prog,
};

allerAccueil();
chargerManifeste();
requestAnimationFrame(boucle);
