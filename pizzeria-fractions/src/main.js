import * as THREE from 'three';
import { createScene, createPlate } from './scene.js';
import { createFood, createServing, TOPPINGS, dirOf } from './food.js';
import { createAnimal, updateAnimal, cheer, wobble } from './animals.js';
import { createConfetti } from './confetti.js';
import { createTweens, easeOutBack, easeInOutCubic, lerp } from './ease.js';
import { installAudioUnlock, sfx } from './audio.js';
import { speak, speakCurrent, setCurrentText } from './speech.js';
import { loadAssets } from './assets.js';
import { createUI, fracHtml } from './ui.js';
import { LEVELS, getLevel, generateRound } from './logic/levels.js';
import { createRng } from './logic/rng.js';
import { frenchName, orderPhrase } from './logic/fractions.js';
import { checkIdentify, checkCut, checkServe, checkCompare, starsFor } from './logic/rules.js';
import { isCutGesture, pathLength, resample } from './logic/gesture.js';
import { createProgress, recordRound, levelStars, serialize, deserialize } from './logic/progress.js';

const KEY = 'pizzeria-fractions-v1';
const canvas = document.getElementById('c');
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
const sc = createScene(canvas);
const tweens = createTweens();
const confetti = createConfetti(sc.scene);
const raycaster = new THREE.Raycaster();
installAudioUnlock();

function loadProgress() {
  try { return deserialize(localStorage.getItem(KEY)); } catch { return createProgress(); }
}

const S = {
  screen: 'title', levelId: null, level: null, roundIndex: 0, round: null, errors: 0,
  runStars: [], locked: false, cutDone: false, knife: null, topping: -1, rng: null, progress: loadProgress(),
  get servedCount() { return O.food ? O.food.slices.filter((s) => s.userData.inPlate).length : 0; },
  get parts() { return O.food ? O.food.parts : 0; },
};
let O = newObjs();
let anchors = [];
function newObjs() { return { animals: [], wrappers: [], food: null, plate: null, servings: [], spin: [] }; }

const ui = createUI({
  onPlay: () => showLevels(),
  onHome: () => showLevels(),
  onSpeak: () => speakCurrent(),
  onNext: () => goLevel(Math.min(LEVELS.length, S.levelId + 1)),
  onReplay: () => goLevel(S.levelId),
  onKnife: (n) => selectKnife(n),
  onTopping: (i) => { S.topping = S.topping === i ? -1 : i; ui.setToppings(S.round?.food, S.topping); sfx.pop(); },
  onServe: () => onServe(),
});

// ---------- utilitaires ----------
const after = (sec, fn) => tweens.add({ dur: 0.0001, delay: sec, done: fn });
const anim = (dur, ease, update, done) => tweens.add({ dur, ease, update, done });
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)];

function layout() {
  const p = sc.portrait;
  // Largeur utile (demi-largeur visible au niveau des choix) selon le format d'écran.
  const E = p ? 4.9 * sc.aspect : Math.min(5, 3.3 * sc.aspect);
  const idR = Math.min(1.25, E * (p ? 0.205 : 0.23));
  const idX = E - 0.4 - idR;
  return { p, R: p ? 1.1 : 1.45, px: p ? 1.95 : 2.6, clientX: p ? -1.3 : -1.0, idX, idR, cmpX: p ? 1.95 : 3.0 };
}

// Écartement des parts : plafonné et décroissant avec leur nombre (évite l'effet « anneau »).
const gapFor = (n) => Math.min(0.16, 0.5 / n);

function popIn(obj, delay = 0) {
  obj.scale.setScalar(0.01);
  tweens.add({ delay, dur: 0.5, ease: easeOutBack, update: (e) => obj.scale.setScalar(Math.max(0.01, e)) });
}

function pulse(obj, amp = 0.14, times = 2, dur = 1) {
  anim(dur, (t) => t, (_, k) => obj.scale.setScalar(1 + Math.sin(k * Math.PI * 2 * times) * amp * (1 - k)), () => obj.scale.setScalar(1));
}

function blink(slices, food, dur = 1.4) {
  anim(dur, (t) => t, (_, k) => {
    const on = Math.floor(k * 7) % 2 === 0;
    for (const s of slices) food.setHighlight(s, on);
  }, () => { for (const s of slices) food.setHighlight(s, false); });
}

function clearBoard() {
  tweens.clear();
  sc.board.clear();
  sc.board.visible = true;
  O = newObjs();
  anchors = [];
  ui.clearAnchors();
}

function addAnimal(type, x, z = -2.9) {
  const a = createAnimal(type);
  a.position.set(x, 0, z);
  sc.board.add(a);
  O.animals.push(a);
  popIn(a.userData.inner);
  return a;
}

function worldToScreen(v) {
  const p = v.clone().project(sc.camera);
  const r = canvas.getBoundingClientRect();
  return { x: r.left + (p.x * 0.5 + 0.5) * r.width, y: r.top + (-p.y * 0.5 + 0.5) * r.height };
}

// ---------- écrans ----------
function showDecor() {
  clearBoard();
  const l = layout();
  addAnimal('bear', 0);
  const p = createFood('pizza', l.R); p.setParts(8, 0.1); p.group.position.set(-l.px, 0, 1.6);
  const c = createFood('cake', l.R); c.setParts(6, 0.1); c.group.position.set(l.px, 0, 1.6);
  sc.board.add(p.group, c.group);
  O.spin.push(p, c);
}

function showTitle() { S.screen = 'title'; ui.showScreen('title'); showDecor(); }
function showLevels() {
  S.screen = 'levels';
  ui.buildLevels(LEVELS, S.progress, (id) => goLevel(id));
  ui.showScreen('levels');
  showDecor();
}

function goLevel(id) {
  const level = getLevel(id);
  if (!level) return;
  const seed = Number(new URLSearchParams(location.search).get('seed')) || (Date.now() >>> 0);
  S.levelId = id; S.level = level; S.rng = createRng(seed);
  S.roundIndex = 0; S.runStars = []; S.screen = 'play';
  ui.showScreen('play');
  startRound();
}

function roundTexts(r) {
  switch (r.type) {
    case 'identify': {
      const phrase = `Je voudrais ${orderPhrase(r.target.n, r.target.d, r.food)}.`;
      return { html: phrase, speech: phrase + ' Touche la bonne !' };
    }
    case 'cut': {
      const t = `Coupe en ${r.parts} parts égales.`;
      return { html: t, speech: t };
    }
    case 'serve': {
      const t = `${cap(orderPhrase(r.target.n, r.target.d, r.food))}, s'il te plaît !`;
      return { html: t, speech: t };
    }
    case 'compare':
      return { html: 'Qui en a le plus ?', speech: 'Qui en a le plus ? Touche le client.' };
    case 'equivalence': {
      const art = r.food === 'cake' ? 'Le gâteau est déjà coupé' : 'La pizza est déjà coupée';
      return {
        html: `Sers ${frenchName(r.target.n, r.target.d)}.<br><small>${art} en ${r.parts}.</small>`,
        speech: `Sers ${frenchName(r.target.n, r.target.d)} ${r.food === 'cake' ? "d'un gâteau" : "d'une pizza"}. ${art} en ${r.parts} parts.`,
      };
    }
  }
  return { html: '', speech: '' };
}

function startRound() {
  clearBoard();
  const level = S.level;
  const r = generateRound(level.id, S.roundIndex, S.rng);
  sc.board.visible = true;
  S.round = r; S.errors = 0; S.locked = false; S.cutDone = false; S.knife = null; canvas.style.cursor = ""; S.topping = -1;
  const l = layout();
  const texts = roundTexts(r);
  const fracSize = level.showFraction === 'none' ? null : level.showFraction;
  let bubble = { text: texts.html };
  let knives = false, serve = false, toppings = false;

  switch (r.type) {
    case 'identify': {
      const xs = [-l.idX, 0, l.idX];
      r.options.forEach((o, i) => {
        const w = new THREE.Group();
        w.position.set(xs[i], 0, 1.7);
        w.userData.choice = i;
        const f = createFood(r.food, l.idR);
        f.setParts(o.d, Math.min(0.1, 0.6 / o.d));
        f.slices.slice(0, o.n).forEach((s) => {
          f.setHighlight(s, true);
          const d = dirOf(s.userData.mid).multiplyScalar(Math.min(0.4, 1.6 / o.d));
          s.position.set(d.x, 0.22, d.z);
        });
        w.add(f.group);
        sc.board.add(w);
        O.wrappers.push(w);
        popIn(w, 0.12 * i);
      });
      addAnimal(r.animal, l.clientX);
      break;
    }
    case 'cut': {
      O.food = createFood(r.food, l.R);
      O.food.group.position.set(0, 0, 1.6);
      sc.board.add(O.food.group);
      popIn(O.food.group);
      addAnimal(r.animal, l.clientX - 0.5);
      bubble.pie = { parts: r.parts, hi: 0, kind: r.food };
      knives = true; toppings = true;
      break;
    }
    case 'serve':
    case 'equivalence': {
      O.food = createFood(r.food, l.R);
      O.food.group.position.set(-l.px, 0, 1.6);
      if (r.type === 'equivalence') O.food.setParts(r.parts, Math.min(0.14, 0.6 / r.parts));
      O.plate = createPlate(l.R * 1.22);
      O.plate.position.set(l.px, 0, 1.6);
      sc.board.add(O.food.group, O.plate);
      popIn(O.food.group); popIn(O.plate, 0.1);
      addAnimal(r.animal, l.clientX);
      bubble.pie = { parts: r.target.d, hi: r.target.n, kind: r.food };
      if (fracSize) bubble.frac = { n: r.target.n, d: r.target.d, size: fracSize };
      knives = r.type === 'serve'; serve = true; toppings = true;
      if (r.type === 'equivalence') S.cutDone = true;
      break;
    }
    case 'compare': {
      const xs = [-l.cmpX, l.cmpX];
      r.fractions.forEach((fr, i) => {
        const w = new THREE.Group();
        w.userData.side = i;
        const a = createAnimal(r.animals[i]);
        a.position.set(xs[i], 0, -2.7);
        w.add(a);
        O.animals.push(a);
        popIn(a.userData.inner, 0.1 * i);
        const plate = createPlate(l.R * 1.15);
        plate.position.set(xs[i], 0, 0.9);
        const serving = createServing(r.food, fr.n, fr.d, l.R * 0.95);
        serving.group.position.y = 0.15;
        plate.add(serving.group);
        w.add(plate);
        O.servings.push(serving);
        sc.board.add(w);
        O.wrappers.push(w);
        const lab = ui.addAnchor(fracHtml(fr.n, fr.d, level.showFraction === 'big' ? 'big' : 'small'));
        anchors.push({ el: lab, pos: new THREE.Vector3(xs[i], 0, 0.9 + l.R * 1.15 + 0.15) });
      });
      bubble = { text: texts.html, center: true };
      break;
    }
  }

  ui.setBubble(bubble);
  ui.setKnives({ visible: knives });
  ui.setServe(serve, false);
  ui.setToppings(toppings ? r.food : null, -1);
  refreshHud();
  setCurrentText(texts.speech);
  speak(texts.speech);
}

function refreshHud() {
  ui.setHud({
    icon: S.level.icon, name: S.level.name, round: S.roundIndex, rounds: S.level.nbManches,
    stars: S.runStars.reduce((a, b) => a + b, 0), doneStars: S.runStars,
  });
}

// ---------- règles de jeu côté rendu ----------
function fail(hint, good = false) {
  S.errors++;
  sfx.soft();
  ui.showHint(hint, good);
  speak(hint);
}

function success() {
  S.locked = true;
  const r = S.round;
  const stars = starsFor(S.errors);
  S.progress = recordRound(S.progress, r.levelId, r.roundIndex, stars);
  try { localStorage.setItem(KEY, serialize(S.progress)); } catch { /* stockage indisponible */ }
  S.runStars.push(stars);
  sfx.success();
  O.animals.forEach((a) => cheer(a));
  ui.showReward(stars);
  const phrase = pickOne(['Bravo !', 'Super !', 'Miam, merci !', 'Génial !']);
  ui.showHint(phrase, true);
  refreshHud();
  let wait = 1.9;
  if (r.type === 'equivalence') {
    ui.showEquation(`${fracHtml(r.written.n, r.written.d, 'big')}<span>=</span>${fracHtml(r.target.n, r.target.d, 'big')}`);
    wait = 3;
  }
  if (O.plate) {
    const z0 = O.plate.position.z;
    anim(0.6, easeInOutCubic, (e) => { O.plate.position.z = lerp(z0, z0 - 0.8, e); });
  }
  after(wait, nextRound);
}

function nextRound() {
  ui.hideEquation();
  S.roundIndex++;
  if (S.roundIndex >= S.level.nbManches) endLevel();
  else startRound();
}

function endLevel() {
  S.screen = 'end';
  S.locked = true;
  sc.board.visible = false;
  const stars = S.runStars.reduce((a, b) => a + b, 0);
  ui.showEnd({ stars, max: S.level.nbManches * 3, hasNext: S.levelId < LEVELS.length });
  sfx.fanfare();
  confetti.burst(new THREE.Vector3(0, 3.5, 0));
  after(0.7, () => confetti.burst(new THREE.Vector3(-2, 3, 1)));
  after(1.3, () => confetti.burst(new THREE.Vector3(2, 3, 1)));
  speak(`Bravo ! ${stars} étoiles !`);
}

function cutFood(n, done) {
  const f = O.food;
  f.setParts(n, 0);
  sfx.chop();
  anim(0.45, easeOutBack, (e) => { f.applyOffset(e * gapFor(n)); f.group.scale.y = lerp(0.8, 1, Math.min(1, e)); }, () => { f.group.scale.y = 1; done?.(); });
}

function glueFood(done) {
  const f = O.food;
  const from = f.offset;
  anim(0.4, easeInOutCubic, (e) => f.applyOffset(from * (1 - e)), () => { f.setParts(1); done?.(); });
}

function canCut() {
  const r = S.round;
  return S.screen === 'play' && !S.locked && !S.cutDone && !!r && (r.type === 'cut' || r.type === 'serve') && !!O.food;
}

function selectKnife(n) {
  if (!canCut()) return;
  S.knife = n;
  ui.setKnives({ visible: true, selected: n });
  O.food.setGuides(n);
  canvas.style.cursor = 'crosshair';
  sfx.pop();
  const msg = `Glisse le doigt sur ${S.round.food === 'cake' ? 'le gâteau' : 'la pizza'} pour couper !`;
  ui.showHint(msg, true);
  speak(msg);
}

function doCut() {
  const r = S.round;
  const n = S.knife;
  if (!canCut() || !n) return;
  const ok = checkCut(r, n).ok;
  S.locked = true;
  O.food.setGuides(null);
  canvas.style.cursor = '';
  cutFood(n, () => {
    if (ok) {
      if (r.type === 'cut') success();
      else {
        S.cutDone = true; S.locked = false;
        ui.setKnives({ visible: false });
        ui.setServe(true, S.servedCount > 0);
        ui.showHint('Touche les parts à servir !', true);
      }
    } else {
      wobble(O.animals[0]);
      fail(r.type === 'cut' ? 'Compte les parts sur la bulle !' : 'Combien de parts dans la bulle ?');
      after(0.6, () => glueFood(() => { S.locked = false; S.knife = null; ui.setKnives({ visible: true, selected: null }); }));
    }
  });
}

function moveSlice(sg, toPlate) {
  if (sg.userData.moving || sg.userData.inPlate === toPlate) return;
  const f = O.food;
  (toPlate ? O.plate : f.group).attach(sg);
  sg.userData.inPlate = toPlate;
  sg.userData.moving = true;
  const from = sg.position.clone();
  const to = toPlate ? new THREE.Vector3(0, 0.16, 0) : f.homePos(sg);
  sfx.pop();
  anim(0.5, easeInOutCubic, (e) => {
    sg.position.lerpVectors(from, to, e);
    sg.position.y += Math.sin(e * Math.PI) * 0.9;
  }, () => { sg.position.copy(to); sg.userData.moving = false; });
  ui.setServe(true, S.servedCount > 0);
}

function onServe() {
  const r = S.round;
  if (S.screen !== 'play' || S.locked || !O.food || !r) return;
  const served = S.servedCount;
  if (served === 0) return;
  const res = checkServe(r, O.food.parts, served);
  if (res.ok) { success(); return; }
  const f = O.food;
  if (res.hint === 'tooFew') {
    fail(`Il en faut ${r.served} !`);
    blink(f.slices.filter((s) => !s.userData.inPlate), f);
  } else if (res.hint === 'tooMany') {
    fail(`Il en faut ${r.served}, pas plus !`);
    blink(f.slices.filter((s) => s.userData.inPlate), f);
  }
  wobble(O.animals[0]);
}

function chooseIdentify(i) {
  if (S.locked) return;
  const res = checkIdentify(S.round, i);
  if (res.ok) { pulse(O.wrappers[i], 0.1, 1, 0.6); success(); }
  else { wobble(O.animals[0]); fail('Regarde bien !'); pulse(O.wrappers[S.round.answer]); }
}

function chooseCompare(i) {
  if (S.locked) return;
  const res = checkCompare(S.round, i);
  if (res.ok) { success(); cheer(O.animals[i]); }
  else {
    wobble(O.animals[i]);
    fail('Regarde la taille des parts !');
    O.servings.forEach((sv) => blink(sv.slices, sv));
  }
}

function placeTopping(hit) {
  const sg = hit.object.userData.slice;
  const f = sg.userData.food;
  const def = TOPPINGS[S.round.food][S.topping];
  const m = f.addTopping(sg, def.id, sg.worldToLocal(hit.point.clone()));
  const base = m.userData.baseScale;
  m.scale.setScalar(0.01);
  anim(0.35, easeOutBack, (e) => m.scale.set(base.x * Math.max(0.01, e), base.y * Math.max(0.01, e), base.z * Math.max(0.01, e)));
  sfx.pop();
}

function setRay(ev) {
  const r = canvas.getBoundingClientRect();
  const ndc = new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(ndc, sc.camera);
}

function onCanvasTap(ev) {
  if (S.screen !== 'play' || !S.round) return;
  setRay(ev);
  const r = S.round;
  if (r.type === 'identify' || r.type === 'compare') {
    const hits = raycaster.intersectObjects(O.wrappers, true);
    if (!hits.length) return;
    let o = hits[0].object;
    while (o && o.userData.choice === undefined && o.userData.side === undefined) o = o.parent;
    if (!o) return;
    if (r.type === 'identify') chooseIdentify(o.userData.choice);
    else chooseCompare(o.userData.side);
    return;
  }
  if (!O.food) return;
  const hits = raycaster.intersectObjects(O.food.meshes(), false);
  if (!hits.length) return;
  if (S.topping >= 0) { placeTopping(hits[0]); return; }
  if ((r.type === 'serve' || r.type === 'equivalence') && S.cutDone && !S.locked) {
    const sg = hits[0].object.userData.slice;
    moveSlice(sg, !sg.userData.inPlate);
  }
}

// Geste de coupe : traînée SVG + comptage des points qui touchent la nourriture.
const trailLine = document.getElementById('trail-line');
let down = null;
let trailTimer = 0;
function hitsFood(ev) {
  if (!O.food) return false;
  setRay(ev);
  return raycaster.intersectObjects(O.food.meshes(), false).length > 0;
}
function drawTrail(pts) {
  trailLine.style.opacity = '1';
  trailLine.style.transition = 'none';
  trailLine.setAttribute('points', pts.map((p) => `${p.x},${p.y}`).join(' '));
}
function fadeTrail() {
  trailLine.style.transition = 'opacity .3s';
  trailLine.style.opacity = '0';
  clearTimeout(trailTimer);
  trailTimer = setTimeout(() => trailLine.setAttribute('points', ''), 320);
}
canvas.addEventListener('pointerdown', (e) => {
  down = { x: e.clientX, y: e.clientY, pts: [{ x: e.clientX, y: e.clientY }], cutting: S.knife && canCut() };
  if (down.cutting) {
    try { canvas.setPointerCapture(e.pointerId); } catch { /* ignoré */ }
    drawTrail(down.pts);
  }
});
canvas.addEventListener('pointermove', (e) => {
  if (!down || !down.cutting) return;
  down.pts.push({ x: e.clientX, y: e.clientY });
  drawTrail(down.pts);
});
canvas.addEventListener('pointerup', (e) => {
  const d = down; down = null;
  if (!d) return;
  const moved = Math.hypot(e.clientX - d.x, e.clientY - d.y);
  if (d.cutting) {
    fadeTrail();
    d.pts.push({ x: e.clientX, y: e.clientY });
    const samples = resample(d.pts);
    const hits = samples.filter((p) => hitsFood({ clientX: p.x, clientY: p.y })).length;
    const swipe = isCutGesture({ length: pathLength(d.pts), hitCount: hits, total: samples.length });
    if (swipe && canCut() && S.knife) { sfx.swish(); doCut(); return; }
    // repli : simple toucher sur la nourriture
    if (moved < 14 && hitsFood(e) && canCut() && S.knife) { doCut(); return; }
    return;
  }
  if (moved < 14) onCanvasTap(e);
});
canvas.addEventListener('pointercancel', () => { down = null; fadeTrail(); });

// ---------- boucle ----------
const tmp = new THREE.Vector3();
function updateAnchors() {
  for (const a of anchors) {
    const p = worldToScreen(a.pos);
    a.el.style.left = p.x + 'px';
    a.el.style.top = Math.min(p.y, window.innerHeight - a.el.offsetHeight - 14) + 'px';
  }
  if (S.screen === 'play' && S.round && S.round.type !== 'compare' && O.animals[0]) {
    O.animals[0].userData.head.getWorldPosition(tmp);
    const p = worldToScreen(tmp);
    const { w, h } = ui.bubbleSize();
    const W = window.innerWidth;
    ui.placeBubble(Math.min(Math.max(8, p.x + 70), W - w - 8), Math.max(84, p.y - h * 0.6));
  }
}

let last = performance.now();
let time = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  time += dt;
  tweens.update(dt);
  for (const a of O.animals) updateAnimal(a, time, dt);
  for (const f of O.spin) f.group.rotation.y += dt * 0.35;
  confetti.update(dt);
  updateAnchors();
  sc.render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---------- démarrage ----------
loadAssets().then((assets) => {
  ui.setTitleImages(assets);
  if (assets.images['bois.png']) sc.setTableTexture(assets.images['bois.png']);
});
showTitle();

// ---------- hook de debug ----------
function expected() {
  const r = S.round;
  if (!r) return null;
  switch (r.type) {
    case 'identify': return { type: r.type, answer: r.answer };
    case 'cut': return { type: r.type, parts: r.parts };
    case 'serve': case 'equivalence': return { type: r.type, parts: r.parts, served: r.served };
    case 'compare': return { type: r.type, answer: r.answer };
  }
}

// Un pas de résolution par appel ; renvoie une chaîne décrivant l'action.
function solve() {
  const r = S.round;
  if (S.screen !== 'play' || !r) return 'idle';
  if (S.locked) return 'wait';
  switch (r.type) {
    case 'identify': chooseIdentify(r.answer); return 'choose';
    case 'compare': chooseCompare(r.answer); return 'choose';
    case 'cut': selectKnife(r.parts); doCut(); return 'knife';
    default: {
      if (!S.cutDone) { selectKnife(r.parts); doCut(); return 'knife'; }
      const f = O.food;
      if (f.slices.some((s) => s.userData.moving)) return 'wait';
      if (S.servedCount < r.served) {
        moveSlice(f.slices.find((s) => !s.userData.inPlate), true);
        return 'slice';
      }
      onServe();
      return 'serve';
    }
  }
}

function screenOf(kind, i = 0) {
  let v = null;
  if (kind === 'choice' || kind === 'side') v = O.wrappers[i]?.getWorldPosition(new THREE.Vector3()).setY(0.3);
  if (kind === 'animal') v = O.animals[i]?.userData.head.getWorldPosition(new THREE.Vector3());
  if (kind === 'slice') {
    const sg = O.food?.slices[i];
    if (sg) {
      const half = sg.userData.len / 2;
      v = sg.localToWorld(new THREE.Vector3(Math.cos(half) * O.food.radius * 0.6, 0.3, -Math.sin(half) * O.food.radius * 0.6));
    }
  }
  if (kind === 'plate') v = O.plate?.getWorldPosition(new THREE.Vector3());
  if (v) return worldToScreen(v);
  const dom = kind === 'knife' ? document.querySelector(`.knife[data-n="${i}"]`)
    : kind === 'serve' ? document.getElementById('btn-serve')
    : kind === 'topping' ? document.querySelector(`.tp[data-i="${i}"]`) : null;
  if (!dom) return null;
  const b = dom.getBoundingClientRect();
  return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
}

window.__pizzeria = {
  state: S,
  goLevel, goLevels: showLevels, goTitle: showTitle,
  expected, solve, screenOf,
  unlockAll() {
    for (const l of LEVELS) for (let r = 0; r < l.nbManches; r++) S.progress = recordRound(S.progress, l.id, r, 1);
    return LEVELS.map((l) => levelStars(S.progress, l.id));
  },
  // Joue automatiquement un niveau (une action toutes les `ms`) ; résout quand l'écran de fin s'affiche.
  autoplay(id, ms = 450) {
    goLevel(id);
    return new Promise((resolve) => {
      const t = setInterval(() => {
        if (S.screen === 'end') { clearInterval(t); resolve(S.runStars.slice()); } else solve();
      }, ms);
    });
  },
};
