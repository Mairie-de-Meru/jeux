import * as THREE from 'three';
import { createScene } from './render/scene.js';
import { createConveyor, BELT_Y, BELT_HALF } from './render/conveyor.js';
import { createBin, layoutBins, BIN_Z } from './render/bins.js';
import { createItemMesh } from './render/objects.js';
import { createPlanet } from './render/planet.js';
import { Tweens, Confetti, ease, squash } from './render/fx.js';
import { createUI } from './ui/ui.js';
import { createGame, spawnNext, sortItem, missItem, currentSpeed, isLevelDone, starsFor } from './logic/game.js';
import { LEVELS } from './logic/levels.js';
import { binOf } from './logic/catalog.js';
import * as audio from './audio.js';
import * as speech from './speech.js';
import * as assets from './assets.js';

const params = new URLSearchParams(location.search);
const SEED = Number(params.get('seed')) || (Date.now() & 0xffffff);
const SPAWN_X = -BELT_HALF + 0.2;
const SPAWN_GAP = 3.3;
const DRAG_Y = 1.9;

const canvas = document.getElementById('c');
const { renderer, scene, camera } = createScene(canvas);
const conveyor = createConveyor();
scene.add(conveyor.group);
const planet = createPlanet();
scene.add(planet.group);
const tweens = new Tweens();
const confetti = new Confetti(scene);

// Anneau de sélection partagé
const ringGeo = new THREE.TorusGeometry(0.62, 0.06, 10, 32);
ringGeo.rotateX(Math.PI / 2);
const ringMat = new THREE.MeshBasicMaterial({ color: 0xffe14d });

// ---- état ----
let game = null;
let screen = 'home'; // home | play | fiche | end
let paused = true;
let bins = [];
const entities = new Map();
let selected = null;
let dragging = null;
let lastStars = 0;
let beltSpeed = 0;

const ui = createUI({
  onPlay: () => { audio.unlock(); startLevel(0); },
  onCloseFiche: () => closeFiche(),
  onNext: () => {
    audio.unlock();
    ui.hideEnd();
    if (game.levelIndex >= LEVELS.length - 1) startLevel(0);
    else startLevel(game.levelIndex + 1);
  },
  onToggleVoice: () => {
    audio.unlock();
    speech.setEnabled(!speech.isEnabled());
    ui.setVoiceIcon(speech.isEnabled());
    if (speech.isEnabled()) speech.speak('Je lis à voix haute.');
  },
});
ui.setVoiceIcon(speech.isEnabled());
assets.preload();

// ---- poubelles / entités ----
function clearBins() {
  for (const b of bins) { scene.remove(b.group); b.dispose(); }
  bins = [];
}
function buildBins(ids) {
  clearBins();
  for (const { id, x } of layoutBins(ids)) {
    const b = createBin(id, x);
    scene.add(b.group);
    bins.push(b);
  }
}
function removeEntity(ent) {
  scene.remove(ent.group);
  // Ne retire l'entrée que si elle désigne bien CETTE entité : un objet raté réapparaît avec le même uid
  // et ne doit pas être effacé par la fin de l'animation de l'ancien.
  if (entities.get(ent.uid) === ent) entities.delete(ent.uid);
  if (selected === ent) selected = null;
  if (dragging === ent) dragging = null;
}
function clearEntities() {
  for (const e of [...entities.values()]) removeEntity(e);
  tweens.clear();
}

function spawnOne() {
  const r = spawnNext(game);
  if (!r.item) return null;
  game = r.state;
  const group = createItemMesh(r.item.itemId);
  group.userData.uid = r.item.uid;
  group.position.set(SPAWN_X, BELT_Y, 0);
  const body = group.userData.body;
  body.scale.setScalar(0.01);
  const ent = { uid: r.item.uid, itemId: r.item.itemId, group, body, x: SPAWN_X, state: 'belt', ring: null, target: new THREE.Vector3() };
  entities.set(ent.uid, ent);
  scene.add(group);
  tweens.add(0.4, (k) => { const s = ease.outBack(k); body.scale.setScalar(Math.max(s, 0.01)); });
  audio.pop();
  return ent;
}

function setSelected(ent) {
  if (selected && selected.ring) { selected.group.remove(selected.ring); selected.ring = null; }
  selected = ent;
  if (ent) {
    ent.ring = new THREE.Mesh(ringGeo, ringMat);
    ent.ring.position.y = 0.05;
    ent.group.add(ent.ring);
    audio.pop();
  }
  hintBins(!!ent);
}
function hintBins(on) {
  // Les poubelles « invitent » : couvercle légèrement entrouvert pendant la sélection
  for (const b of bins) b.setOpen(false);
  if (on) for (const b of bins) b.bump();
}

// ---- déroulé ----
function startLevel(i) {
  speech.cancel();
  clearEntities();
  game = createGame(i, SEED + i * 101);
  buildBins(game.level.bins);
  planet.setGauge(0);
  ui.hideEnd(); ui.hideFiche(); ui.showHome(false); ui.showHud(true);
  ui.setProgress(0, game.total);
  screen = 'play';
  paused = false;
  const msg = i === 0 ? 'Glisse chaque objet dans la bonne poubelle !' : i === 1 ? 'Bien joué ! Une poubelle de plus.' : 'Dernier palier : cinq poubelles !';
  ui.showHint(msg, 5000);
  speech.speak(msg);
}

function handleSort(ent, binId) {
  const r = sortItem(game, ent.uid, binId);
  game = r.state;
  const bin = bins.find((b) => b.id === binId);
  setSelectedClear();
  ent.state = 'free';
  if (r.correct) {
    audio.good();
    planet.setGauge(game.gauge);
    ui.setProgress(game.sorted, game.total);
    fallInto(ent, bin);
  } else {
    audio.bad();
    if (bin) bin.wobble();
    bounceBack(ent, true);
    openFiche(r.item.itemId, r.expectedBin, r.pourquoi);
  }
  return r;
}
function setSelectedClear() {
  if (!selected) return false;
  if (selected.ring) { selected.group.remove(selected.ring); selected.ring = null; }
  selected = null;
  for (const b of bins) b.setOpen(false);
  return true;
}

function fallInto(ent, bin) {
  const p0 = ent.group.position.clone();
  const top = bin.top.clone();
  const body = ent.body;
  bin.setOpen(true);
  tweens.add(0.9, (k) => {
    if (k < 0.45) {
      const a = ease.inOutQuad(k / 0.45);
      ent.group.position.lerpVectors(p0, top, a);
      ent.group.position.y += Math.sin(a * Math.PI) * 0.6;
      squash(body, 0.15 * Math.sin(a * Math.PI));
    } else {
      const a = (k - 0.45) / 0.55;
      ent.group.position.set(top.x, top.y - ease.inQuad(a) * 1.7, top.z);
      const s = 1 - 0.6 * a;
      body.scale.set(s, s * (1 - 0.25 * Math.sin(a * Math.PI)), s);
    }
  }, () => {
    removeEntity(ent);
    bin.setOpen(false);
    bin.bump();
    confetti.burst(top, 22, 3.5);
    planet.cheer();
    if (isLevelDone(game)) tweens.add(0.5, () => {}, levelComplete);
  });
}

function bounceBack(ent, rebond) {
  const p0 = ent.group.position.clone();
  const x1 = Math.max(-BELT_HALF + 1, Math.min(BELT_HALF - 1.2, p0.x));
  const p1 = new THREE.Vector3(x1, BELT_Y, 0);
  ent.state = 'free';
  const h = rebond ? 1.8 : 0.9;
  tweens.add(rebond ? 0.8 : 0.45, (k) => {
    ent.group.position.lerpVectors(p0, p1, ease.outCubic(k));
    ent.group.position.y = p1.y + (p0.y - p1.y) * (1 - ease.outBounce(k)) + Math.sin(k * Math.PI) * h * (rebond ? 1 : 0.4);
    squash(ent.body, 0.18 * Math.sin(k * Math.PI * 3) * (1 - k));
  }, () => {
    ent.group.position.copy(p1);
    ent.body.scale.setScalar(1);
    ent.x = p1.x;
    ent.state = 'belt';
  });
}

function openFiche(itemId, binId, text) {
  screen = 'fiche';
  paused = true;
  ui.showFiche(itemId, binId, text);
  speech.speak(text);
}
function closeFiche() {
  if (screen !== 'fiche') return;
  speech.cancel();
  ui.hideFiche();
  screen = 'play';
  paused = false;
}

function levelComplete() {
  if (screen === 'end') return;
  screen = 'end';
  paused = true;
  ui.hideFiche(); ui.hideHint();
  lastStars = starsFor(game);
  planet.setGauge(1);
  const final = game.levelIndex >= LEVELS.length - 1;
  confetti.burst(new THREE.Vector3(0, 4, -2), 120, 6);
  confetti.burst(new THREE.Vector3(-3, 2, 1), 50, 5);
  confetti.burst(new THREE.Vector3(3, 2, 1), 50, 5);
  audio.win();
  speech.speak('Bravo !');
  ui.showEnd({ stars: lastStars, final });
}

let missHintShown = false;
function missEntity(ent) {
  game = missItem(game, ent.uid);
  audio.soft();
  confetti.burst(new THREE.Vector3(ent.group.position.x, BELT_Y + 0.3, 0.6), 8, 1.5);
  if (!missHintShown) { missHintShown = true; ui.showHint('Il reviendra !', 2500); }
  ent.state = 'free';
  const y0 = ent.group.position.y;
  const x0 = ent.group.position.x;
  tweens.add(0.45, (k) => {
    ent.group.position.x = x0 + k * 0.8;
    ent.group.position.y = y0 - ease.inQuad(k) * 1.5;
    ent.body.scale.setScalar(Math.max(1 - k * 0.7, 0.05));
  }, () => removeEntity(ent));
}

// ---- pointeurs ----
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -DRAG_Y);
const tmp = new THREE.Vector3();
let pointerId = null;
let downX = 0, downY = 0, moved = false;

function setRay(e) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
}
function climb(o, key) {
  while (o) { if (o.userData && o.userData[key] !== undefined) return o.userData[key]; o = o.parent; }
  return undefined;
}
const GRAB_PX = 70;
const tmp2 = new THREE.Vector3();
const box = new THREE.Box3();
function screenPos(v3) {
  const r = canvas.getBoundingClientRect();
  tmp2.copy(v3).project(camera);
  return { x: r.left + ((tmp2.x + 1) / 2) * r.width, y: r.top + ((1 - tmp2.y) / 2) * r.height };
}
// Centre visuel actuel de l'objet (boîte englobante du maillage affiché), en px CSS.
function entityScreenPos(ent) {
  camera.updateMatrixWorld();
  camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
  box.setFromObject(ent.body);
  if (box.isEmpty()) box.setFromCenterAndSize(ent.group.position, new THREE.Vector3(0.1, 0.1, 0.1));
  return screenPos(box.getCenter(new THREE.Vector3()));
}
// Objet du tapis le plus proche du point touché, en pixels écran (généreux pour les petits doigts).
function pickEntity(e) {
  let best = null, bd = GRAB_PX;
  for (const ent of entities.values()) {
    if (ent.state !== 'belt') continue;
    const p = entityScreenPos(ent);
    const d = Math.hypot(p.x - e.clientX, p.y - e.clientY);
    if (d < bd) { bd = d; best = ent; }
  }
  return best;
}
function pickBin() {
  const hits = ray.intersectObjects(bins.map((b) => b.group), true);
  for (const h of hits) { const id = climb(h.object, 'binId'); if (id) return bins.find((b) => b.id === id); }
  // tolérance : bin le plus proche du point de dépôt (plan de glisse)
  if (ray.ray.intersectPlane(dragPlane, tmp)) {
    let best = null, bd = 2.2;
    for (const b of bins) { const d = Math.hypot(tmp.x - b.x, tmp.z - BIN_Z); if (d < bd) { bd = d; best = b; } }
    return best;
  }
  return null;
}

canvas.addEventListener('pointerdown', (e) => {
  audio.unlock();
  if (screen !== 'play') return;
  if (pointerId !== null) endDrag({ pointerId, clientX: e.clientX, clientY: e.clientY }, true); // geste précédent resté ouvert
  setRay(e);
  const ent = pickEntity(e);
  if (ent) {
    pointerId = e.pointerId;
    canvas.setPointerCapture(e.pointerId);
    downX = e.clientX; downY = e.clientY; moved = false;
    dragging = ent;
    ent.state = 'drag';
    ent.target.copy(ent.group.position);
    return;
  }
  if (selected) {
    const b = pickBin();
    // clic direct sur une poubelle (pas seulement tolérance) pour valider l'objet choisi
    if (b) { const ent2 = selected; handleSort(ent2, b.id); }
  }
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerId !== pointerId || !dragging) return;
  if (!moved && Math.hypot(e.clientX - downX, e.clientY - downY) > 6) moved = true;
  if (!moved) return;
  setRay(e);
  if (ray.ray.intersectPlane(dragPlane, tmp)) dragging.target.set(tmp.x, DRAG_Y, tmp.z);
  const over = pickBin();
  for (const b of bins) b.setOpen(b === over);
});
function endDrag(e, cancelled) {
  if (e.pointerId !== pointerId) return;
  pointerId = null;
  const ent = dragging;
  dragging = null;
  if (!ent) return;
  if (!moved) {
    // simple toucher : sélection
    ent.state = 'belt';
    ent.group.position.copy(ent.target);
    if (selected === ent) setSelectedClear(); else setSelected(ent);
    return;
  }
  setRay(e);
  const b = cancelled ? null : pickBin();
  for (const x of bins) x.setOpen(false);
  if (b) handleSort(ent, b.id);
  else { ent.x = ent.group.position.x; bounceBack(ent, false); }
}
canvas.addEventListener('pointerup', (e) => endDrag(e, false));
canvas.addEventListener('pointercancel', (e) => endDrag(e, true));
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// ---- boucle ----
const clock = new THREE.Clock();
let time = 0;
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  time += dt;
  tweens.update(dt);

  if (screen === 'play' && game && !paused) {
    beltSpeed = currentSpeed(game);
    // garde-fou : tout objet logiquement sur le tapis doit avoir une entité (sinon on le remet en file)
    for (const it of [...game.onBelt]) if (!entities.has(it.uid)) game = missItem(game, it.uid);
    // spawn régulier
    if (game.queue.length) {
      let minX = Infinity;
      for (const e of entities.values()) if (e.state === 'belt') minX = Math.min(minX, e.x);
      if (minX > SPAWN_X + SPAWN_GAP) spawnOne();
    }
    for (const e of [...entities.values()]) {
      if (e.state !== 'belt') continue;
      e.x += beltSpeed * dt;
      e.group.position.set(e.x, BELT_Y, 0);
      e.group.rotation.y = Math.sin(time * 2 + e.uid) * 0.12;
      if (e.x > BELT_HALF + 0.3) missEntity(e);
    }
  } else beltSpeed = 0;

  // objet glissé : suit le doigt, avec un léger étirement
  if (dragging && moved) {
    const k = 1 - Math.exp(-22 * dt);
    dragging.group.position.lerp(dragging.target, k);
    dragging.group.rotation.y += dt * 2;
    squash(dragging.body, 0.08);
  }
  if (selected && selected.ring) {
    selected.ring.scale.setScalar(1 + Math.sin(time * 6) * 0.08);
    squash(selected.body, Math.sin(time * 6) * 0.05);
  }

  conveyor.update(dt, beltSpeed);
  planet.update(dt, time);
  for (const b of bins) b.update(dt, time);
  confetti.update(dt);
  renderer.render(scene, camera);
}
frame();

// ---- crochet de débogage ----
function summary() {
  return {
    screen,
    levelIndex: game ? game.levelIndex : null,
    sorted: game ? game.sorted : 0,
    total: game ? game.total : 0,
    errors: game ? game.errors : 0,
    missed: game ? game.missed : 0,
    attempts: game ? game.attempts : 0,
    queue: game ? game.queue.length : 0,
    onBelt: game ? game.onBelt.length : 0,
    entities: entities.size,
    gauge: game ? game.gauge : 0,
    done: game ? game.done : false,
    ficheOpen: ui.isFicheOpen(),
    stars: lastStars,
    bins: bins.map((b) => b.id),
    speed: game ? currentSpeed(game) : 0,
  };
}
window.__tri = {
  start(i = 0) { audio.unlock(); startLevel(i); return summary(); },
  state: summary,
  sortFirst(correct = true) {
    if (screen !== 'play' || !game) return { error: 'pas en jeu', ...summary() };
    let ent = null;
    for (const e of entities.values()) if (e.state === 'belt' && (!ent || e.x > ent.x)) ent = e;
    if (!ent) ent = spawnOne();
    if (!ent) return { error: 'aucun objet', ...summary() };
    const right = binOf(ent.itemId);
    const binId = correct ? right : game.level.bins.find((b) => b !== right);
    const r = handleSort(ent, binId);
    return { correct: r.correct, itemId: ent.itemId, bin: binId, expectedBin: right, ...summary() };
  },
  finish() {
    if (!game) return { error: 'pas de partie' };
    clearEntities();
    game = { ...game, sorted: game.total, queue: [], onBelt: [], gauge: 1, done: true };
    ui.setProgress(game.total, game.total);
    levelComplete();
    return summary();
  },
  closeFiche() { closeFiche(); return summary(); },
  objectScreenPos(i = 0) {
    // sur le tapis d'abord (le plus avancé en premier), puis les autres objets visibles
    const all = [...entities.values()];
    const list = [...all.filter((e) => e.state === 'belt').sort((a, b) => b.x - a.x), ...all.filter((e) => e.state !== 'belt')];
    const ent = list[i];
    if (!ent) return null;
    const p = entityScreenPos(ent);
    return { x: Math.round(p.x), y: Math.round(p.y) };
  },
  pause(b = true) { if (screen === 'play') paused = !!b; return paused; },
};
if (params.has('debug')) console.info('[tri] debug actif, window.__tri disponible');
