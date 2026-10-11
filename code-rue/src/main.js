import * as THREE from 'three';
import { createScene } from './scene.js';
import { buildCity, PLAN } from './city.js';
import { createTraffic, updateGarage } from './cars.js';
import { createWalker } from './walker.js';
import { createUI, attachGestures } from './ui.js';
import { initAudio, installAudioUnlock, sfx } from './audio.js';
import { speak, setSpeechEnabled, isSpeechEnabled, setCurrentText, speakCurrent, stopSpeech } from './speech.js';
import { createConfetti } from './confetti.js';
import { loadAssets } from './assets.js';
import { LEVELS, TIMING } from './logic/levels.js';
import { lightAt, trafficAt, garageAt } from './logic/signals.js';
import { prochaineAction, regardOk } from './logic/crossing.js';
import { createGame, goLevel, unlocked, act, starsFor } from './logic/game.js';

const KEY = 'code-rue-v1';
const WALK = 1.9;
const DEBUG = new URLSearchParams(location.search).has('debug');

function loadSave() {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null') ?? undefined; } catch { return undefined; }
}
function store(etoiles) {
  try { localStorage.setItem(KEY, JSON.stringify({ etoiles })); } catch { /* stockage indisponible */ }
}

const assets = await loadAssets();
const canvas = document.getElementById('c');
const sc = createScene(canvas);
const city = buildCity(sc.scene, assets);
const traffic = createTraffic(sc.scene);
const walker = createWalker();
sc.scene.add(walker.group);
const confetti = createConfetti(sc.scene);
installAudioUnlock();

let game = createGame(LEVELS, loadSave());
// Etat de jeu côté rendu.
const S = {
  screen: 'home', L: 0, T: 0, g: 0, ready: false, busy: false, crossing: false,
  hold: 0, errorUntil: 0, forced: null, lookTimer: 0, ending: null, lastDebug: 0, text: '',
};

const plan = () => PLAN[S.L].etapes[game.etape];
const timing = () => TIMING[S.L];
const etape = () => LEVELS[S.L].etapes[game.etape];

// ---- monde (signaux) ----
function realMonde() {
  const tm = timing();
  const light = tm.cycle ? lightAt(S.T, tm.cycle) : { voiture: 'vert', pieton: 'rouge' };
  const type = etape().type;
  let voitureProche = false;
  if (type === 'sansFeu') voitureProche = trafficAt(S.T, tm.trafic).voitureProche || traffic.anyNear(plan().crossX, 10);
  const garage = tm.garage ? garageAt(S.g, tm.garage) : 'ferme';
  return { pieton: light.pieton, voitureProche, garage, voiture: light.voiture };
}
const monde = () => S.forced ?? realMonde();

// ---- interface ----
const ui = createUI({
  onPlay() {
    const i = game.etoiles.findIndex((e, k) => e === 0 && unlocked(game, k));
    startLevel(i < 0 ? 0 : i);
  },
  onLevel: (i) => startLevel(i),
  onVoiceToggle() { setSpeechEnabled(!isSpeechEnabled()); ui.showHome(game.etoiles, (n) => unlocked(game, n), LEVELS, isSpeechEnabled()); },
  onSpeak() { initAudio(); speakCurrent(); },
  onHome: goHome,
  onNext: () => startLevel(S.L + 1),
  onRetry: () => startLevel(S.L),
  onReplay: () => startLevel(0),
  onLook: (cote) => perform({ type: 'regarder', cote }),
  onGo: (allure) => perform({ type: 'aller', allure }),
  onChoose: (id) => perform({ type: 'choisir', spot: id }),
});
ui.setBranding(assets);

function say(text, kind = '') {
  S.text = text;
  setCurrentText(text);
  ui.setBubble(text, kind);
  if (text) speak(text);
}

function consigne() {
  const c = game.crossing;
  if (c.phase === 'choix') return 'Touche le bon endroit pour traverser.';
  const t = etape().type;
  if (t === 'feu') return 'Attends le bonhomme vert. Regarde des deux côtés.';
  if (t === 'garage') return 'Attention au garage ! Regarde bien.';
  return 'Regarde des deux côtés. Attends les voitures.';
}

function showChoices() {
  const c = game.crossing;
  if (c.phase === 'choix') {
    ui.setChoices(c.choix.map((s) => ({ id: s.id, genre: s.genre })));
    const sp = plan().spots;
    city.setSpots(c.choix.map((s) => ({ id: s.id, x: sp[s.id][0], z: sp[s.id][1] })));
  } else {
    ui.setChoices([]); city.setSpots([]);
  }
  ui.setProgress(c.regards.includes('gauche'), regardOk(c.regards));
}

// ---- déroulement ----
function configureTraffic() {
  const t = etape().type, p = plan(), tm = timing();
  if (t === 'feu') traffic.configure({ mode: 'light', X: p.crossX }, S.T, (tt) => lightAt(tt, tm.cycle).voiture !== 'vert');
  else if (t === 'sansFeu') traffic.configure({ mode: 'schedule', X: p.crossX, trafic: tm.trafic }, S.T, () => false);
  else traffic.configure({ mode: 'off' });
}

function beginEtape() {
  const p = plan();
  S.ready = false; S.busy = false; S.crossing = false; S.forced = null;
  S.g = 0;
  configureTraffic();
  showChoices();
  ui.setHud(LEVELS[S.L].nom, starsFor(game.erreursNiveau));
  walker.walk([p.wait], WALK, () => {
    walker.face(p.side === 1 ? Math.PI : 0);
    S.ready = true;
    say(consigne());
  });
}

function startLevel(i) {
  initAudio(); stopSpeech();
  S.L = Math.max(0, Math.min(LEVELS.length - 1, i));
  game = goLevel(game, S.L);
  S.screen = 'play'; S.ending = null; S.T = 0; S.g = 0; S.hold = 0; S.errorUntil = 0;
  city.setLevel(S.L);
  const pl = PLAN[S.L];
  walker.stop(); walker.look(null);
  walker.setPose(pl.start[0], pl.start[1], PLAN[S.L].etapes[0].side === 1 ? Math.PI : 0);
  ui.showPlay();
  say('');
  beginEtape();
  const p = plan();
  sc.aim({ x: p.crossX, z: 0, width: p.width, angle: p.side === 1 ? 0 : Math.PI });
  sc.snap();
}

function goHome() {
  stopSpeech(); S.screen = 'home'; S.ready = false; S.ending = null;
  ui.showHome(game.etoiles, (n) => unlocked(game, n), LEVELS, isSpeechEnabled());
}

function onEvent(ev) {
  if (ev === 'etapeFinie') {
    sfx.success(); ui.popStar(innerWidth / 2, innerHeight / 2); walker.hop();
    beginEtape();
  } else if (ev === 'niveauFini' || ev === 'diplome') {
    sfx.success(); ui.popStar(innerWidth / 2, innerHeight / 2); walker.hop();
    store(game.etoiles);
    S.ready = false; S.busy = true; S.crossing = false; S.forced = null;
    ui.setChoices([]); ui.setEnabled(false); ui.setHint(null, false);
    say('Bravo !');
    const g = PLAN[S.L].goal;
    walker.walk([g], WALK, () => {
      walker.face(Math.PI);
      sfx.fanfare(); confetti.burst(new THREE.Vector3(g[0], 3, g[1]));
      S.ending = { ev, stars: game.etoiles[S.L], at: S.T + 1.6 };
    });
  }
}

// Point d'entrée unique des actions (boutons, gestes, crochet de débogage).
function perform(action) {
  if (S.screen !== 'play' || !S.ready || S.busy || S.crossing) return { ok: false, raison: 'occupe' };
  initAudio();
  const before = game.crossing;
  const out = act(game, action, monde());
  game = out.game;
  const r = out.resultat;
  if (!r.ok) {
    S.hold = S.T + 3.5;
    S.errorUntil = S.T + 4;
    sfx.soft(); say(r.conseil, 'conseil'); walker.wiggle();
    ui.setHud(LEVELS[S.L].nom, starsFor(game.erreursNiveau));
    if (action.type === 'choisir') {
      const pos = plan().spots?.[action.spot];
      if (pos) { S.busy = true; walker.walk([pos], WALK, () => walker.walk([plan().wait], WALK, () => { S.busy = false; walker.face(plan().side === 1 ? Math.PI : 0); })); }
    }
    return r;
  }
  if (action.type === 'regarder') {
    sfx.swish(); walker.look(action.cote);
    clearTimeout(S.lookTimer); S.lookTimer = setTimeout(() => walker.look(null), 900);
  } else if (action.type === 'choisir') {
    sfx.pop();
    const pos = plan().spots?.[action.spot];
    city.setSpots([]); ui.setChoices([]);
    S.busy = true; S.ready = false;
    walker.walk(pos ? [pos] : [], WALK, () => { S.busy = false; S.ready = true; walker.face(plan().side === 1 ? Math.PI : 0); say(consigne()); });
  } else if (action.type === 'aller') {
    sfx.pop();
    S.crossing = true;
    traffic.clearZone(plan().crossX, 4);
    S.errorUntil = 0; ui.setBubble('');
    walker.look(null);
    walker.walk([plan().across], WALK, () => {
      S.crossing = false;
      const o = act(game, { type: 'arrive' }, monde());
      game = o.game;
      S.forced = null;
      onEvent(o.evenement);
    });
  }
  if (before !== game.crossing && action.type !== 'aller') showChoices();
  return r;
}

attachGestures(canvas, {
  onSwipe: (cote) => perform({ type: 'regarder', cote }),
  onTap(x, y) {
    if (S.screen !== 'play' || game.crossing.phase !== 'choix' || !S.ready) return;
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1), sc.camera);
    const hit = ray.intersectObjects(city.spots.hits, false)[0];
    if (hit) perform({ type: 'choisir', spot: hit.object.userData.id });
  },
});

// ---- boucle ----
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  S.T += dt;
  const playing = S.screen === 'play';
  const tm = timing();
  const type = playing ? etape().type : 'feu';
  const light = tm.cycle ? lightAt(S.T, tm.cycle) : { voiture: 'vert', pieton: 'rouge' };
  city.setLights(light.voiture, light.pieton);

  if (playing && type === 'garage' && !S.crossing && !S.forced) S.g += dt;
  updateGarage(city.garage, S.g, tm.garage ?? { debut: 2.5, duree: 4, periode: 14 }, playing && type === 'garage');

  const stop = playing && (S.crossing || S.T < S.hold || !!S.forced || (type === 'feu' && light.voiture !== 'vert'));
  traffic.update(dt, S.T, stop);
  walker.update(dt);
  confetti.update(dt);

  if (playing) {
    const p = plan();
    const angle = p.side === 1 ? 0 : Math.PI;
    if (S.ready || S.crossing) sc.aim({ x: p.crossX, z: game.crossing.phase === 'choix' ? p.side * 3 : 0, width: p.width, angle });
    else sc.aim({ x: walker.x, z: walker.z * 0.4, width: Math.max(18, Math.min(p.width, 24)), angle });
    const m = monde();
    const a = prochaineAction(game.crossing, m);
    const hintOn = S.L === 0 || game.crossing.erreurs > 0 || game.erreursNiveau > 0;
    const actionable = S.ready && !S.busy && !S.crossing && !S.ending;
    ui.setEnabled(actionable);
    const spot = game.crossing.phase === 'choix' ? game.crossing.choix.find((s) => s.genre === 'passage')?.id : null;
    ui.setHint(a, actionable && hintOn, spot);
    city.updateSpots(S.T, actionable && hintOn ? spot : null);
    if (S.errorUntil && S.T > S.errorUntil) { S.errorUntil = 0; say(consigne()); }
    if (S.ending && S.T >= S.ending.at) {
      const e = S.ending; S.ending = null;
      if (e.ev === 'diplome') ui.showDiploma(game.etoiles, LEVELS); else ui.showLevelEnd(e.stars, true);
      S.screen = 'end';
    }
  } else if (S.screen === 'home') {
    sc.aim({ x: 4 + Math.sin(S.T * 0.1) * 6, z: 0, width: 26, angle: 0.5 });
  }
  sc.update(dt);
  if (DEBUG && now - S.lastDebug > 250) {
    S.lastDebug = now;
    ui.debug(JSON.stringify({ screen: S.screen, L: S.L, etape: game.etape, phase: game.crossing.phase, regards: game.crossing.regards, erreurs: game.erreursNiveau, etoiles: game.etoiles, ready: S.ready, busy: S.busy, cross: S.crossing, T: +S.T.toFixed(1), monde: S.screen === 'play' ? monde() : null, cars: traffic.count() }));
  }
  requestAnimationFrame(frame);
}

// ---- crochet de débogage ----
function solve() {
  if (S.screen !== 'play') return { ok: false, raison: 'pas en jeu' };
  const tm = timing();
  if (!S.ready || S.busy) {
    walker.stop();
    walker.setPose(plan().wait[0], plan().wait[1], plan().side === 1 ? Math.PI : 0);
    S.ready = true; S.busy = false;
  }
  if (S.crossing) return { ok: false, raison: 'traversee en cours' };
  S.forced = { pieton: 'vert', voitureProche: false, garage: 'partie', voiture: 'rouge' };
  S.hold = S.T + 8;
  traffic.clearZone(plan().crossX, 12);
  void tm;
  if (game.crossing.phase === 'choix') {
    const s = game.crossing.choix.find((x) => x.genre === 'passage');
    perform({ type: 'choisir', spot: s.id });
    // le déplacement vers le spot est instantané en mode solve
    walker.stop(); const pos = plan().spots[s.id]; walker.setPose(pos[0], pos[1], plan().side === 1 ? Math.PI : 0);
    S.busy = false; S.ready = true;
  }
  if (etape().type !== 'garage') { perform({ type: 'regarder', cote: 'gauche' }); perform({ type: 'regarder', cote: 'droite' }); }
  const r = perform({ type: 'aller', allure: 'marcher' });
  return r;
}
window.__codeRue = {
  game: () => game,
  monde: () => (S.screen === 'play' ? monde() : null),
  state: () => ({ ...S }),
  act: (action) => perform(action),
  goLevel: (n) => startLevel(n - 1),
  solve,
};

goHome();
sc.snap();
traffic.configure({ mode: 'light', X: 0 }, 0, () => false);
requestAnimationFrame(frame);
