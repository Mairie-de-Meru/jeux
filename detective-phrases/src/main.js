import { creerScene } from './render/scene.js';
import { $, el, montrer, etoilesTexte } from './ui/dom.js';
import { chargerManifeste, chargerImg, urlImage } from './ui/images.js';
import { creerPartieUI } from './ui/partie-ui.js';
import { NOMS_ENQUETES } from './ui/textes.js';
import { voix, parler, taire } from './ui/voix.js';
import * as son from './ui/son.js';
import { creerRng } from './logic/rng.mjs';
import { ENQUETES } from './logic/banque.mjs';
import {
  chargerProgression, sauverProgression, enregistrerResultat, etoilesDe, palierDebloque,
} from './logic/progression.mjs';

const ICONES = { fautes: ['✏️', 'icone-fautes.png'], pronoms: ['👤', 'icone-pronoms.png'], temps: ['⏳', 'icone-temps.png'], mystere: ['🔍', 'detective.png'] };
const MAISON_ENQUETE = ['fautes', 'pronoms', 'temps', 'mystere'];
const debug = new URLSearchParams(location.search).has('debug');

let storage = null;
try { storage = window.localStorage; } catch { storage = null; }
let progression = chargerProgression(storage);
const banques = {};
let ecran = 'titre';
let courant = { enquete: null, palier: 1 };
let graineFixe = null;

async function chargerBanques() {
  await Promise.all(ENQUETES.map(async (e) => {
    const r = await fetch(`data/${e}.json`, { cache: 'no-store' });
    banques[e] = await r.json();
  }));
}

const scene = creerScene($('scene'), { onMaison: (i) => ouvrirPaliers(MAISON_ENQUETE[i]) });

const partie = creerPartieUI({ scene, onFin: finir });

function total(e) { return [1, 2, 3].reduce((s, p) => s + etoilesDe(progression, e, p), 0); }

function allerTitre() {
  ecran = 'titre'; partie.annuler(); scene.mode('titre'); montrer('ecran-titre');
}

function allerVille() {
  ecran = 'ville'; partie.annuler(); scene.mode('ville'); montrer('ecran-ville');
  const nav = $('ville-boutons');
  nav.replaceChildren();
  MAISON_ENQUETE.forEach((e, i) => {
    const [emoji, img] = ICONES[e];
    const ico = el('span', { class: 'icone', texte: urlImage(img) ? '' : emoji });
    if (urlImage(img)) ico.append(el('img', { src: urlImage(img), alt: '' }));
    const b = el('button', { class: 'gros', onclick: () => { son.clic(); ouvrirPaliers(e); } },
      ico, el('span', { texte: NOMS_ENQUETES[e] }), el('span', { class: 'petites-etoiles', texte: `${total(e)} / 9 ⭐` }));
    b.type = 'button';
    nav.append(b);
  });
}

function ouvrirPaliers(e) {
  if (!e || ecran !== 'ville') return;
  ecran = 'paliers'; courant.enquete = e;
  scene.mode('partie', MAISON_ENQUETE.indexOf(e));
  montrer('ecran-paliers');
  $('paliers-titre').textContent = `Enquête : ${NOMS_ENQUETES[e]}`;
  $('paliers-message').textContent = '';
  const liste = $('paliers-liste');
  liste.replaceChildren();
  [1, 2, 3].forEach((pal) => {
    const ouvert = palierDebloque(progression, e, pal);
    const b = el('button', { class: `gros${ouvert ? '' : ' verrou'}`, onclick: () => {
      son.clic();
      if (!ouvert) {
        $('paliers-message').textContent = `Gagne au moins une étoile au niveau ${pal - 1} pour ouvrir celui-ci.`;
        parler($('paliers-message').textContent);
        return;
      }
      jouer(e, pal);
    } }, el('span', { texte: ouvert ? `Niveau ${pal}` : `🔒 Niveau ${pal}` }), el('span', { class: 'etoiles', texte: etoilesTexte(etoilesDe(progression, e, pal)) }));
    b.type = 'button';
    liste.append(b);
  });
}

function jouer(e, palier, graine = null) {
  courant = { enquete: e, palier };
  ecran = 'partie';
  scene.mode('partie', MAISON_ENQUETE.indexOf(e));
  montrer('ecran-partie');
  const g = graine ?? graineFixe ?? Date.now();
  partie.demarrer(e, banques[e], palier, creerRng(g));
}

function finir(res) {
  progression = enregistrerResultat(progression, res.enquete, res.palier, res.etoiles);
  if (storage) sauverProgression(storage, progression);
  ecran = 'fin';
  montrer('ecran-fin');
  $('fin-etoiles').textContent = etoilesTexte(res.etoiles);
  const texte = res.etoiles === 3 ? 'Quel super détective !' : res.etoiles === 2 ? 'Très bien, continue !' : 'Bien joué, tu peux rejouer pour gagner plus d’étoiles !';
  $('fin-texte').textContent = texte;
  son.fanfare();
  scene.confettis();
  parler(`Bravo ! ${texte}`);
  const suivant = res.palier < 3 && palierDebloque(progression, res.enquete, res.palier + 1);
  $('btn-rejouer').textContent = suivant && res.etoiles >= 1 ? 'Niveau suivant' : 'Rejouer';
  $('btn-rejouer').onclick = () => { son.clic(); jouer(res.enquete, suivant && res.etoiles >= 1 ? res.palier + 1 : res.palier); };
}

$('btn-jouer').addEventListener('click', () => { son.clic(); allerVille(); });
$('btn-paliers-retour').addEventListener('click', () => { son.clic(); allerVille(); });
$('btn-quitter').addEventListener('click', () => { son.clic(); allerVille(); });
$('btn-fin-ville').addEventListener('click', () => { son.clic(); allerVille(); });
$('btn-lire').addEventListener('click', () => partie.relire());
$('btn-voix-auto').addEventListener('click', () => {
  voix.auto = !voix.auto;
  $('btn-voix-auto').setAttribute('aria-pressed', String(voix.auto));
  $('btn-voix-auto').textContent = voix.auto ? '🔈' : '🔇';
  if (!voix.auto) taire();
});

// Crochet de débogage : jouer chaque niveau par script.
window.__detective = {
  etat() {
    const p = partie.partie();
    return {
      ecran,
      enquete: courant.enquete,
      palier: courant.palier,
      index: p ? p.index : null,
      etape: p ? p.etape : null,
      phase: p ? p.phase : null,
      erreurs: p ? p.erreurs : null,
      finie: p ? p.finie : null,
      progression,
      scene: scene.etat(),
    };
  },
  jouer(enquete, palier = 1, graine = 1) { jouer(enquete, palier, graine); return this.etat(); },
  repondreJuste() { partie.repondreJuste(); return this.etat(); },
  repondreFaux() { partie.repondreFaux(); return this.etat(); },
  allerVille() { allerVille(); return this.etat(); },
};

if (debug) {
  const d = $('debug');
  d.classList.remove('cache');
  setInterval(() => { d.textContent = JSON.stringify(window.__detective.etat(), null, 1); }, 500);
}

async function init() {
  await chargerManifeste();
  try { await chargerBanques(); } catch (err) { console.error('Banques indisponibles', err); }
  scene.mode('titre');
  montrer('ecran-titre');
  const img = await chargerImg('titre.png');
  if (img) {
    const t = $('titre-detective');
    t.src = img.src;
    t.classList.remove('cache');
    $('ecran-titre').classList.add('avec-image');
  }
  ICONES_MAJ();
  scene.chargerKit(urlImage).catch((err) => console.error('Kit indisponible', err));
}

async function ICONES_MAJ() {
  const noms = MAISON_ENQUETE.map((e) => ICONES[e][1]);
  for (let i = 0; i < noms.length; i++) {
    const im = await chargerImg(noms[i]);
    if (im) scene.setIcone(i, im);
  }
}

init();
