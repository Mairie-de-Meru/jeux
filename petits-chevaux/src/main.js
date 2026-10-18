// Boucle de jeu : enchaîne humain / robots, animations, interface et crochet de debug.
import { createRng, rollDie } from './rng.js';
import { nouvellePartie, lancer, jouer, forcerFin, nomParDefaut, PALIERS, ARRIVE } from './regles.js';
import { chooseMove } from './robots.js';
import { plusProche } from './pick.js';
import { creerScene } from './scene.js';
import { sons, setSon, debloquer } from './audio.js';
import * as voix from './voix.js';
import * as ui from './ui.js';

const canvas = document.getElementById('c');
const scene = creerScene(canvas, document.getElementById('zone3d'));
const params = new URLSearchParams(location.search);

// Sièges par couleur (rouge, bleu, jaune, vert) : humain | robot | absent. Défaut : toi contre un robot.
const sieges = (types, noms = []) => types.map((type, c) => ({ type, nom: noms[c] ?? (type === 'absent' ? '' : nomParDefaut(c, type)) }));
const joueursDepuisRobots = (n) => sieges([0, 1, 2, 3].map((c) => (c === 0 ? 'humain' : c <= n ? 'robot' : 'absent')));
const reglages = { palier: 1, difficulte: 'facile', joueurs: sieges(['humain', 'robot', 'absent', 'absent']) };
let dernierHumain = -1;
let etat = null;
let rng = createRng(1), rngRobot = createRng(2);
let occupe = false;          // une animation / un tour automatique est en cours
let attenteChoix = false;    // l'enfant doit toucher un cheval
let robotCourant = false;    // le joueur courant est joué par le programme
let partieId = 0;            // invalide les actions asynchrones d'une partie abandonnée
let autoRestant = 0, autoResolve = null;
let vit = 1;

// Rythme des robots : multiplicateur des délais/animations quand un robot joue (pas l'enfant).
const BOT_PACE = 1.6, BOT_GAP_MS = 1200;
const rythme = () => (robotCourant ? BOT_PACE : 1);
const attente = (ms) => new Promise((r) => setTimeout(r, (ms * rythme()) / vit));
const appliquerVitesse = () => scene.setVitesse(vit / rythme());
const humainCourant = () => etat && etat.joueurs[etat.courant].humain && !robotCourant;

// ---- partie ----
function demarrer(opts = {}) {
  if (opts.palier) reglages.palier = opts.palier;
  if (opts.difficulte) reglages.difficulte = opts.difficulte;
  if (opts.joueurs) reglages.joueurs = opts.joueurs.map((s, c) => ({ type: s.type, nom: s.nom ?? (s.type === 'absent' ? '' : nomParDefaut(c, s.type)) }));
  else if (opts.nbRobots != null) reglages.joueurs = joueursDepuisRobots(opts.nbRobots);
  iface.majReglages();
  partieId++;
  dernierHumain = -1;
  const seed = opts.seed ?? Math.floor(Math.random() * 2147483647);
  etat = nouvellePartie({ palier: reglages.palier, difficulte: reglages.difficulte, joueurs: reglages.joueurs, seed });
  rng = createRng(seed);
  rngRobot = createRng(seed + 1);
  occupe = false; attenteChoix = false; robotCourant = false;
  scene.effacer();
  scene.setJoueurs(etat);
  ui.ecran(null);
  if (etat.joueurs.filter((x) => x.humain).length === 1) ui.toast(`${PALIERS[etat.palier].nom} : à toi de jouer !`);
  prochain();
  return etat;
}

function consigneTexte() {
  if (!etat) return '';
  if (etat.phase === 'lancer') { const jo = etat.joueurs[etat.courant]; return humainCourant() ? `À ${jo.nom === 'Toi' ? 'toi' : jo.nom} de jouer. Appuie sur le dé.` : 'Un ami joue. Regarde !'; }
  if (etat.phase === 'choisir' && humainCourant()) return PALIERS[etat.palier].surlignage ? 'Touche un cheval qui brille.' : 'Touche le cheval que tu veux faire avancer.';
  return 'Regarde !';
}

function prochain() {
  if (autoRestant === 0 && autoResolve) { const r = autoResolve; autoResolve = null; r(etat); }
  scene.effacer();
  scene.deInvite(false);
  ui.setLancer(false);
  attenteChoix = false;
  if (etat.phase === 'fini') { finPartie(); return; }
  const j = etat.courant, jo = etat.joueurs[j];
  robotCourant = !jo.humain || autoRestant > 0;
  if (autoRestant > 0) autoRestant--;
  appliquerVitesse();
  ui.setJoueur(jo, j);
  const g = partieId;
  if (robotCourant) {
    attente(BOT_GAP_MS / BOT_PACE).then(() => { if (g === partieId && !occupe && etat.phase === 'lancer') actionLancer(undefined, true); });
  } else {
    ui.setLancer(true);
    scene.deInvite(true);
    occupe = false;
    const nbH = etat.joueurs.filter((x) => x.humain).length;
    if (nbH > 1 && dernierHumain !== j) ui.toast(`À ${jo.nom} !`, 1800);
    dernierHumain = j;
  }
}

async function actionLancer(valeur, interne = false) {
  if (occupe || !etat || etat.phase !== 'lancer') return null;
  if (!interne && !humainCourant()) return null; // jamais pour un robot, ni hors du tour d'un humain
  occupe = true;
  const g = partieId;
  const j = etat.courant;
  ui.setLancer(false);
  scene.deInvite(false);
  const de = valeur ?? rollDie(rng);
  const r = lancer(etat, de);
  sons.de();
  await scene.lancerDe(de);
  if (g !== partieId) return null;
  etat = r.state;
  const passe = r.evenements.find((e) => e.type === 'passe');
  if (passe) {
    sons.passe();
    ui.toast(de === 6 ? '6 ! Pas de coup, mais on rejoue !' : `${de} : pas de coup, on passe.`);
    await attente(1100);
    if (g !== partieId) return null;
    occupe = false;
    prochain();
    return etat;
  }
  if (etat.coups.length === 1) {
    await attente(200);
    if (g !== partieId) return null;
    return jouerCoup(0, true);
  }
  if (robotCourant) {
    const jo = etat.joueurs[j];
    const coup = chooseMove(etat, etat.coups, jo.humain ? 'facile' : etat.difficulte, rngRobot);
    scene.surligner(j, [coup], false);
    await attente(300);
    if (g !== partieId) return null;
    return jouerCoup(etat.coups.indexOf(coup), true);
  }
  // à l'enfant de choisir
  occupe = false;
  attenteChoix = true;
  ui.setTexteQui('Choisis un cheval', etat.joueurs[j]);
  if (PALIERS[etat.palier].surlignage) scene.surligner(j, etat.coups, true);
  ui.toast(PALIERS[etat.palier].surlignage ? 'Touche un cheval qui brille !' : 'Touche un cheval !', 3000);
  return etat;
}

async function jouerCoup(i, interne = false) {
  if (!etat || etat.phase !== 'choisir' || !etat.coups[i]) return null;
  // une action externe (tap, bouton, crochet) n'est acceptée que si un humain doit choisir, hors animation
  if (!interne && (occupe || !attenteChoix || !humainCourant())) return null;
  const g = partieId;
  occupe = true;
  attenteChoix = false;
  scene.effacer();
  const cfg = PALIERS[etat.palier];
  const r = jouer(etat, etat.coups[i]);
  for (const ev of r.evenements) {
    if (ev.type === 'sortie') {
      sons.sortie();
      await scene.sortie(ev.joueur, ev.cheval);
    } else if (ev.type === 'deplacement') {
      await scene.deplacer(ev.joueur, ev.cheval, ev.cases, {
        compter: cfg.comptageVoix,
        onPas: (k) => { sons.pas(); if (cfg.comptageVoix) voix.compter(k + 1); },
      });
    } else if (ev.type === 'prise') {
      sons.prise();
      ui.toast('Retour au pré ! 🌿 Il repartira.');
      await scene.prise(ev.joueur, ev.cheval);
    } else if (ev.type === 'arrivee') {
      sons.arrivee();
      ui.toast('Un cheval est arrivé ! ⭐');
    }
    if (g !== partieId) return null;
  }
  etat = r.state;
  scene.sync(etat);
  await attente(100);
  if (g !== partieId) return null;
  occupe = false;
  prochain();
  return etat;
}

function finPartie() {
  const g = partieId;
  sons.victoire();
  attente(900).then(() => { if (g === partieId && etat.phase === 'fini') ui.afficherFin(etat, etat.joueurs); });
}

// Le bouton Lancer reflète toujours l'état : actif seulement pour un humain, en phase « lancer », hors animation.
function syncLancer() {
  const ok = !!etat && etat.phase === 'lancer' && etat.joueurs[etat.courant].humain && !robotCourant && !occupe;
  ui.setLancer(ok);
}
setInterval(syncLancer, 250);

// ---- entrées ----
canvas.addEventListener('pointerdown', (e) => {
  debloquer();
  if (!etat || occupe || !humainCourant()) return;
  const r = canvas.getBoundingClientRect();
  const px = e.clientX - r.left, py = e.clientY - r.top;
  if (etat.phase === 'lancer') {
    const d = scene.projeterDe({});
    if (plusProche([{ x: d.x, y: d.y }], px, py, 64)) actionLancer();
  } else if (attenteChoix) {
    const j = etat.courant;
    const pts = etat.coups.map((m, i) => { const p = scene.projeter(j, m.cheval, {}); p.id = i; return p; });
    const hit = plusProche(pts, px, py, 40);
    if (hit) { sons.clic(); jouerCoup(hit.id); } else ui.toast('Touche un autre cheval !', 1500);
  }
});

// ---- crochet de debug ----
window.__chevaux = {
  state: () => etat,
  nouvellePartie: (opts) => demarrer(opts),
  lancer: (valeur) => actionLancer(valeur),
  jouer: (i) => jouerCoup(i),
  coups: () => (etat ? etat.coups : []),
  auto(n = 1) {
    autoRestant = n;
    const p = new Promise((res) => { autoResolve = res; });
    if (etat && !occupe && etat.phase !== 'fini') {
      if (etat.phase === 'lancer') prochain();
      else if (attenteChoix) { robotCourant = true; const c = chooseMove(etat, etat.coups, 'facile', rngRobot); jouerCoup(etat.coups.indexOf(c), true); }
    }
    return p;
  },
  palier(n) { reglages.palier = n; return demarrer({ palier: n }); },
  finir() {
    partieId++;
    occupe = false;
    const s = JSON.parse(JSON.stringify(etat));
    s.joueurs.forEach((jo, i) => { if (jo.humain) { jo.chevaux.fill(ARRIVE); s.classement.push(i); } });
    etat = forcerFin(s);
    scene.sync(etat);
    ui.afficherFin(etat, etat.joueurs);
    return etat;
  },
  vitesse(x) { vit = x; appliquerVitesse(); },
  scene,
};

// ---- écrans ----
const iface = ui.initUI({
  clic: () => { debloquer(); sons.clic(); },
  commencer: () => { debloquer(); sons.clic(); demarrer({}); },
  lancer: () => { debloquer(); actionLancer(); },
  consigne: () => voix.parler(consigneTexte(), { force: true }),
  accueil: () => { partieId++; occupe = false; voix.arreter(); scene.effacer(); ui.ecran('accueil'); },
  suivant: () => { reglages.palier = Math.min(3, reglages.palier + 1); iface.majReglages(); demarrer({}); },
  son: (v) => { setSon(v); voix.setVoix(v); },
}, reglages);

// vue de fond pour l'accueil
scene.setJoueurs(nouvellePartie({ palier: 2, nbRobots: 3 }));

// ?joueurs=hrha : h = humain, r = robot, a = absent, par couleur (rouge, bleu, jaune, vert)
if (/^[hra]{4}$/.test(params.get('joueurs') || '')) {
  reglages.joueurs = sieges([...params.get('joueurs')].map((l) => ({ h: 'humain', r: 'robot', a: 'absent' })[l]));
  iface.majReglages();
}

// manifeste d'assets : uniquement les fichiers listés
fetch('./assets/manifest.json').then((r) => (r.ok ? r.json() : {})).then((m) => {
  if (m.images && m.images.titre) {
    const img = new Image();
    img.onload = () => ui.fondAccueil(m.images.titre);
    img.src = m.images.titre;
  }
  const ch = m.images && m.images.chevaux; 
  if (ch && ['rouge', 'bleu', 'jaune', 'vert'].every((k) => ch[k])) {
    const urls = ['rouge', 'bleu', 'jaune', 'vert'].map((k) => ch[k]);
    ui.setIcones(urls);
    if (etat && !attenteChoix) ui.setJoueur(etat.joueurs[etat.courant], etat.courant);
  }
  if (m.modeles && m.modeles.cheval) scene.chargerModele(m.modeles.cheval);
}).catch((e) => console.warn("manifeste", e));

// démarrage direct pour les tests : ?partie=1&palier=2&robots=2&seed=3&vitesse=10&auto=30
if (params.has('vitesse')) { vit = +params.get('vitesse') || 1; appliquerVitesse(); }
if (params.has('partie')) {
  demarrer({
    palier: +(params.get('palier') || 1),
    ...(params.has('joueurs') ? {} : { nbRobots: +(params.get('robots') || 1) }),
    difficulte: params.get('diff') || 'facile', seed: params.has('seed') ? +params.get('seed') : undefined,
  });
  if (params.has('auto')) window.__chevaux.auto(+params.get('auto'));
}
