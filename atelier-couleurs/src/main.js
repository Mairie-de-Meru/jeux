// Boucle principale : branche logique pure <-> rendu three.js <-> HUD, expose window.__atelier.
import * as THREE from 'three';
import { createAtelier, couleurPigment } from './scene/atelier.js';
import { createPainting3D } from './scene/painting.js';
import { createUI } from './ui.js';
import { audio } from './audio.js';
import { parler, taire } from './speech.js';
import { chargerImages } from './assets.js';
import { PIGMENTS, PIGMENT_IDS, rgbToHex } from './logic/pigments.js';
import { LEVELS, targetRgb } from './logic/levels.js';
import { createGame, addDrop, emptyPot, evaluate, validate, currentTarget, gotoLevel, MAX_GOUTTES } from './logic/game.js';
import { ZONES, createPainting, paintZone, isComplete } from './logic/paint.js';

const total = (g) => PIGMENT_IDS.reduce((a, id) => a + g[id], 0);
const sommeEtoiles = (s) => Object.values(s.etoiles).reduce((a, n) => a + n, 0);

async function demarrer() {
  const images = await chargerImages();
  const canvas = document.getElementById('c');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const atelier = createAtelier(renderer, images);
  const peinture3d = createPainting3D();

  let state = createGame();
  let tableau = createPainting();
  let mode = 'atelier';
  let attentePeindre = false; // un palier est fini : on propose de peindre
  let verrou = false; // pendant l'animation de réussite
  let brush = null;
  let timerAuto = null;

  const ui = createUI({
    onPlay: () => { audio.unlock(); audio.clic(); ui.showHome(false); afficherCible(); parler(consigneCourante()); },
    onReadHome: () => { audio.unlock(); parler('Bienvenue à l’atelier des couleurs ! Appuie sur jouer.'); },
    onEmpty: () => vider(),
    onHint: () => indice(),
    onRead: () => parler(consigneCourante()),
    onPaintGo: () => allerPeindre(),
    onBack: () => retourAtelier(),
    onBrush: (hex) => { brush = hex; audio.clic(); },
    onReplay: () => rejouer(),
  }, images);
  if (images.mur) {
    document.body.style.background = `linear-gradient(rgba(255,255,255,.35), rgba(255,255,255,.35)), url(${images.mur}) center / cover`;
  }

  function consigneCourante() {
    const c = currentTarget(state);
    return c ? c.phrase : 'Bravo !';
  }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    const { haut, bas } = ui.insets();
    atelier.resize(w, h, haut, bas);
    peinture3d.resize(w, h, haut, bas);
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);

  function majJauge() {
    const e = evaluate(state);
    ui.setGauge(e.proximite, e.trouve);
    return e;
  }

  function afficherCible() {
    const c = currentTarget(state);
    ui.setTarget(c, c ? rgbToHex(targetRgb(c)) : null);
    ui.setStars(sommeEtoiles(state));
    ui.setPalette(state.palette);
    majJauge();
  }

  // ---- actions de jeu ----
  function verser(id, { auto = true, instant = false } = {}) {
    if (mode !== 'atelier' || verrou || attentePeindre) return;
    const suivant = addDrop(state, id);
    if (suivant === state) {
      ui.message('Vide le chaudron !');
      ui.pulse('vider');
      audio.indice();
      return;
    }
    state = suivant;
    // Les rappels lisent l'état COURANT (jamais une copie ancienne) : l'ordre d'atterrissage des gouttes est sans effet.
    const rafraichir = () => {
      const cur = evaluate(state);
      atelier.setLiquid(cur.rgb, total(state.gouttes));
      ui.setGauge(cur.proximite, cur.trouve);
      return cur;
    };
    atelier.drop(id, () => {
      audio.plic();
      if (total(state.gouttes) % 3 === 0) setTimeout(() => audio.bulle(), 120);
      const cur = rafraichir();
      if (cur.trouve) {
        if (auto) { clearTimeout(timerAuto); const ref = state; timerAuto = setTimeout(() => { if (state === ref) valider(); }, 900); }
      } else if (cur.indice && cur.indice.type === 'vide') {
        ui.message('Essaie de vider !');
        ui.pulse('vider');
      } else if (cur.proximite >= 0.7) {
        ui.message('Presque !', 1400);
      }
    });
    if (instant) rafraichir();
  }

  function vider() {
    if (mode !== 'atelier' || verrou) return;
    clearTimeout(timerAuto);
    state = emptyPot(state);
    atelier.setLiquid(null, 0);
    atelier.chaudronSecoue();
    audio.vider();
    majJauge();
  }

  function indice() {
    if (mode !== 'atelier' || verrou) return;
    audio.indice();
    const e = evaluate(state);
    if (!e.indice) { ui.message('Super !'); return; }
    if (e.indice.type === 'ajoute') {
      atelier.highlightPot(e.indice.pigment);
      ui.message('Essaie ' + PIGMENTS[e.indice.pigment].nom.toLowerCase() + ' !');
    } else {
      ui.pulse('vider');
      ui.message('Vide et recommence !');
    }
  }

  function valider() {
    if (mode !== 'atelier' || verrou) return;
    const prev = state;
    if (!evaluate(prev).trouve) return;
    clearTimeout(timerAuto);
    const cible = currentTarget(prev);
    const hex = rgbToHex(targetRgb(cible));
    state = validate(prev);
    verrou = true;
    const palierFini = state.termine || state.palier !== prev.palier;
    audio.succes();
    atelier.confetti();
    atelier.chaudronSecoue();
    ui.setStars(sommeEtoiles(state));
    ui.message('Bravo ! ' + '⭐'.repeat(state.etoiles[cible.id]), 1800);
    ui.voler(hex, () => ui.setPalette(state.palette, cible.id));
    setTimeout(() => {
      atelier.setLiquid(null, 0);
      verrou = false;
      attentePeindre = palierFini;
      afficherCible();
      if (palierFini) ui.showPeindre(true);
      else parler(consigneCourante());
    }, 1700);
  }

  function allerPeindre() {
    mode = 'peinture';
    attentePeindre = false;
    ui.showPeindre(false);
    const bases = PIGMENT_IDS.map((id) => ({ id: 'base-' + id, nom: PIGMENTS[id].nom, hex: couleurPigment(id) }));
    ui.setMode('peinture');
    ui.setPalette([...state.palette, ...bases]);
    brush = brush || (state.palette[0] ? state.palette[0].hex : bases[0].hex);
    ui.setBrush(brush);
    peinture3d.applyPainting(tableau);
    resize();
    parler('Touche pour peindre !');
  }

  function retourAtelier() {
    taire();
    mode = 'atelier';
    ui.setMode('atelier');
    resize();
    if (state.termine) { ui.showFin(true, sommeEtoiles(state)); audio.succes(); atelier.confetti(); return; }
    afficherCible();
  }

  function rejouer() {
    state = createGame();
    tableau = createPainting();
    brush = null;
    ui.showFin(false);
    atelier.setLiquid(null, 0);
    mode = 'atelier';
    ui.setMode('atelier');
    afficherCible();
    resize();
  }

  function peindreZone(id, hex) {
    tableau = paintZone(tableau, id, hex);
    peinture3d.colorZone(id, hex);
    audio.bulle();
    if (isComplete(tableau)) { audio.succes(); ui.message('Magnifique !', 2500); }
  }

  // ---- entrées pointeur ----
  canvas.addEventListener('pointerdown', (ev) => {
    audio.unlock();
    const rect = canvas.getBoundingClientRect();
    if (mode === 'atelier') {
      const id = atelier.pickPot(ev.clientX, ev.clientY, rect);
      if (id) verser(id);
    } else {
      const z = peinture3d.pickZone(ev.clientX, ev.clientY, rect);
      if (z && brush) peindreZone(z, brush);
    }
  });

  // ---- crochet de débogage ----
  window.__atelier = {
    state: () => ({ ...state, mode, eval: (({ proximite, trouve, indice }) => ({ proximite, trouve, indice }))(evaluate(state)), tableau, attentePeindre }),
    goto: (palier, cible = 0) => {
      clearTimeout(timerAuto);
      verrou = false; attentePeindre = false;
      if (mode !== 'atelier') { mode = 'atelier'; ui.setMode('atelier'); }
      ui.showHome(false); ui.showFin(false); ui.showPeindre(false);
      state = gotoLevel(state, palier, cible);
      atelier.setLiquidInstant(null, 0);
      afficherCible();
      resize();
    },
    drop: (id) => verser(id, { auto: false, instant: true }),
    empty: () => vider(),
    solve: () => {
      vider();
      const c = currentTarget(state);
      if (!c) return;
      for (const [id, n] of Object.entries(c.recette)) for (let i = 0; i < n; i++) verser(id, { auto: false, instant: true });
    },
    validate: () => valider(),
    paint: () => { verrou = false; ui.showHome(false); ui.showPeindre(false); allerPeindre(); },
    paintAll: () => {
      if (mode !== 'peinture') window.__atelier.paint();
      const pal = ui_palette();
      ZONES.forEach((z, i) => peindreZone(z.id, pal[i % pal.length]));
    },
  };
  function ui_palette() {
    const l = state.palette.map((p) => p.hex);
    return l.length ? l : PIGMENT_IDS.map((id) => couleurPigment(id));
  }

  afficherCible();
  resize();
  const horloge = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(horloge.getDelta(), 0.05);
    const t = horloge.elapsedTime;
    if (mode === 'atelier') {
      atelier.update(dt, t);
      renderer.render(atelier.scene, atelier.camera);
    } else {
      peinture3d.update(dt);
      atelier.update(dt, t);
      renderer.render(peinture3d.scene, peinture3d.camera);
    }
  });
}

demarrer();
