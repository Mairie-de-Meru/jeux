import { createGame, rollDice, botRollDice, applyRoll, firstLanding, walkPath } from './logic/game.js';
import { sumChoices, hintLevel } from './logic/quiz.js';
import { numberToFrench } from './logic/numbers.js';
import { mulberry32 } from './logic/rng.js';
import { SPECIALS, RULES } from './logic/texts.js';
import { createWorld } from './render/world.js';
import { createDice } from './render/dice.js';
import { clock, sleep, dur, BOT_PACE } from './timing.js';
import * as speech from './speech.js';
import * as sfx from './audio.js';

const $ = (id) => document.getElementById(id);

// Manifeste des images : seules celles listées sont demandées (pas de 404 si une image manque encore)
const IMAGES = { titre: 'assets/img/titre.jpg' };
if (IMAGES.titre) { const im = $('titre-img'); im.onload = () => { im.hidden = false; }; im.src = IMAGES.titre; }
const app = $('app'), canvas = $('c');
const cfg = { palier: 1, bots: 1, difficulty: 'facile', death: true, voice: true };
const num = numberToFrench;

let world, dice;
try {
  world = createWorld(canvas);
  dice = createDice();
} catch (e) {
  $('fatal').classList.remove('hidden');
  throw e;
}

let G = null, run = 0, auto = false;
let rollResolver = null, tapResolver = null, answerResolver = null;
let lastRng = mulberry32(Date.now() & 0xffffffff);

// ---------- mise en page / boucle de rendu ----------
let W = 0, H = 0;
function resize() {
  const r = app.getBoundingClientRect();
  W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
  world.resize(W, H);
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 150));
resize();
const rel = (el) => {
  const a = app.getBoundingClientRect(), r = el.getBoundingClientRect();
  return { x: r.left - a.left, y: r.top - a.top, w: r.width, h: r.height };
};
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  try { world.frame(now, dt, rel($('boardArea')), rel($('dieZone')), dice, W, H); } catch (e) { console.error(e); }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ---------- interface ----------
function setMsg(t) { $('msg').textContent = t; }
function say(t, o) { speech.say(t, o); }
function showCounter(v) { const c = $('counter'); if (v == null) c.classList.add('hidden'); else { c.textContent = v; c.classList.remove('hidden'); } }
function updateHud() {
  const box = $('chips');
  box.textContent = '';
  for (const p of G.players) {
    const d = document.createElement('div');
    d.className = 'chip' + (p.id === G.turn && !G.over ? ' active' : '') + (p.skip > 0 ? ' rest' : '');
    d.style.setProperty('--c', '#' + p.color.toString(16).padStart(6, '0'));
    d.innerHTML = `<span class="e">${p.emoji}</span><span>${p.pos}</span>`;
    d.title = p.name;
    box.appendChild(d);
  }
}
function enableRoll(on) {
  const b = $('btn-roll');
  b.disabled = !on;
  b.classList.toggle('invite', on);
  dice.setInvite(on);
}
function showAnswers(list) {
  const a = $('answers');
  a.textContent = '';
  if (!list) { a.classList.add('hidden'); $('btn-roll').classList.remove('hidden'); return; }
  $('btn-roll').classList.add('hidden');
  a.classList.remove('hidden');
  for (const v of list) {
    const b = document.createElement('button');
    b.textContent = v;
    b.dataset.v = v;
    b.addEventListener('click', () => { sfx.unlock(); if (answerResolver) answerResolver(v, b); });
    a.appendChild(b);
  }
}
async function showBubble(kind, ms = 2600, ownerName = '') {
  const s = SPECIALS[kind];
  const b = $('bubble');
  b.querySelector('.b-emoji').textContent = s.emoji;
  b.querySelector('.b-title').textContent = s.title;
  b.querySelector('.b-text').textContent = s.say;
  b.classList.remove('hidden');
  sfx.special();
  say((ownerName ? ownerName + ' : ' : '') + s.say);
  await sleep(ms);
  b.classList.add('hidden');
}
function confetti() {
  const em = ['🎉', '⭐', '🌟', '🎈', '🦆'];
  for (let i = 0; i < 40; i++) {
    const s = document.createElement('span');
    s.className = 'confetti';
    s.textContent = em[i % em.length];
    s.style.left = Math.random() * 100 + 'vw';
    s.style.animationDuration = 2 + Math.random() * 2.5 + 's';
    s.style.animationDelay = Math.random() * 0.8 + 's';
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 6000);
  }
}

// ---------- boucle de partie ----------
const ABORT = 'abort';
const chk = (r) => { if (r !== run) throw ABORT; };

function waitRoll() { return new Promise((res) => { rollResolver = res; if (auto) setTimeout(() => requestRoll(), 30); }); }
function requestRoll() { if (rollResolver) { const r = rollResolver; rollResolver = null; r(); } }

async function countAlong(p, from, path, count) {
  if (path.length) world.setFocus([path[path.length - 1]]);
  try {
  for (let i = 0; i < path.length; i++) {
    if (count) { showCounter(i + 1); say(num(i + 1), { rate: 1.1 }); }
    sfx.hop(i);
    await world.hop(p.id, path[i], p.bot ? Math.round(380 * BOT_PACE) : 380);
    G_hud();
  }
  if (count) { await sleep(450); showCounter(null); }
  } finally { world.setFocus(null); }
}
function G_hud() { /* positions des pastilles : mises à jour par événement */ const live = world.pawns; G.players.forEach((q, i) => { q._shown = live[i] ? live[i].userData.index : q.pos; }); const chips = $('chips').children; G.players.forEach((q, i) => { if (chips[i]) chips[i].lastChild.textContent = q._shown; }); }

async function playEvents(events, myRun, humanMoves) {
  for (const e of events) {
    chk(myRun);
    const p = G.players[e.pid];
    switch (e.t) {
      case 'bounce':
        setMsg('Trop loin ! On revient en arrière.');
        if (!p.bot) say('Trop loin ! On revient en arrière.', { queue: true });
        break;
      case 'walk':
        await countAlong(p, e.from, e.path, !p.bot && humanMoves);
        break;
      case 'special':
        await showBubble(e.kind, p.bot ? Math.round(2600 * BOT_PACE) : 2600, p.bot ? p.name : '');
        break;
      case 'jump':
        sfx.good();
        world.setFocus([e.to]);
        try { await world.jump(p.id, e.to); } finally { world.setFocus(null); }
        G_hud();
        break;
      case 'rest':
        setMsg(`${p.name === 'Toi' ? 'Tu te reposes' : p.name + ' se repose'}.`);
        break;
      case 'release':
        setMsg(`${G.players[e.pid].name === 'Toi' ? 'Tu es libéré' : G.players[e.pid].name + ' est libéré'} !`);
        sfx.good();
        await world.wiggle(e.pid);
        break;
      case 'turnSkipped':
        setMsg(`${G.players[e.pid].name === 'Toi' ? 'Tu passes' : G.players[e.pid].name + ' passe'} son tour en se reposant.`);
        updateHud();
        await sleep(p.bot ? Math.round(1200 * BOT_PACE) : 1200);
        break;
      case 'win':
        break;
      default:
    }
    chk(myRun);
  }
}

function awaitTap() {
  return new Promise((res) => { tapResolver = res; });
}
canvas.addEventListener('pointerdown', (ev) => {
  sfx.unlock();
  if (!tapResolver) return;
  const rect = $('boardArea').getBoundingClientRect();
  if (ev.clientX < rect.left || ev.clientX > rect.right || ev.clientY < rect.top || ev.clientY > rect.bottom) return;
  const i = world.pickCase(ev.clientX, ev.clientY, rect);
  if (i >= 0) { const r = tapResolver; tapResolver = null; r(i); }
});

async function askDestination(p, total, myRun) {
  const path = walkPath(G.n, p.pos, total);
  const dest = firstLanding(G, p.id, total);
  let wrong = 0;
  world.setFocus(path);
  try {
  setMsg('Touche la case où ton pion arrive !');
  say(`Tu as fait ${num(total)}. Touche la case où ton pion arrive !`);
  for (;;) {
    const tapped = auto ? dest : await awaitTap();
    chk(myRun);
    world.showHalo(tapped, tapped === dest ? 0x3ddc84 : 0xffb703);
    if (tapped === dest) { sfx.good(); await sleep(450); world.showHalo(-1); return; }
    wrong++;
    sfx.oops();
    await sleep(350);
    if (hintLevel(wrong) === 'reveal') {
      setMsg("Regarde, c'est ici !");
      say("Regarde, c'est ici ! On compte ensemble.");
      world.showHalo(dest, 0x3ddc84);
      await sleep(1100);
      world.showHalo(-1);
      return;
    }
    setMsg(`Compte avec moi : tu pars de la case ${p.pos}.`);
    say(`Compte avec moi. Tu pars de la case ${num(p.pos)}.`);
    await sleep(900);
    for (let i = 0; i < path.length; i++) {
      chk(myRun);
      showCounter(i + 1);
      say(num(i + 1), { rate: 1.1 });
      world.showHalo(path[i], 0xffffff);
      await sleep(650);
    }
    world.showHalo(-1);
    showCounter(null);
    setMsg('Essaie encore : touche la case !');
    say('Essaie encore !');
  }
  } finally { world.setFocus(null); }
}

async function askSum(dc, myRun) {
  const total = dc[0] + dc[1];
  const choices = sumChoices(total, lastRng);
  let wrong = 0;
  setMsg(`${dc[0]} + ${dc[1]} = ?`);
  say(`${num(dc[0])} plus ${num(dc[1])}. Combien ça fait ?`);
  showAnswers(choices);
  for (;;) {
    const [v, btn] = auto ? [total, null] : await new Promise((res) => { answerResolver = (a, b) => res([a, b]); });
    answerResolver = null;
    chk(myRun);
    if (v === total) {
      if (btn) btn.classList.add('right');
      sfx.good();
      setMsg(`${dc[0]} + ${dc[1]} = ${total}. Bravo !`);
      say(`Bravo ! ${num(total)} !`);
      await sleep(900);
      showAnswers(null);
      return;
    }
    wrong++;
    sfx.oops();
    if (btn) { btn.classList.add('wrong'); btn.disabled = true; }
    if (hintLevel(wrong) === 'reveal') {
      setMsg(`${dc[0]} + ${dc[1]} = ${total}`);
      say(`Regarde : ${num(dc[0])} plus ${num(dc[1])} font ${num(total)}.`);
      await sleep(1500);
      showAnswers(null);
      return;
    }
    setMsg('Pas tout à fait. Compte avec moi !');
    say('Compte avec moi.');
    await sleep(600);
    for (let k = 1; k <= dc[0]; k++) { showCounter(k); say(num(k), { rate: 1.1 }); await sleep(600); chk(myRun); }
    for (let k = 1; k <= dc[1]; k++) { showCounter(dc[0] + k); say(num(dc[0] + k), { rate: 1.1 }); await sleep(600); chk(myRun); }
    await sleep(500);
    showCounter(null);
    setMsg(`${dc[0]} + ${dc[1]} = ?`);
  }
}

async function playTurn(myRun) {
  const p = G.players[G.turn];
  world.setFollow(p.id);
  world.setActive(p.id);
  updateHud();
  let dc;
  if (p.bot) {
    setMsg(`${p.emoji} ${p.name} joue…`);
    await sleep(Math.round(1000 * BOT_PACE));
    chk(myRun);
    dc = botRollDice(G);
  } else {
    setMsg('À toi ! Touche le dé.');
    say('À toi de jouer ! Touche le dé.');
    enableRoll(true);
    await waitRoll();
    chk(myRun);
    enableRoll(false);
    dc = rollDice(G);
  }
  sfx.roll();
  await dice.roll(dc, p.bot ? BOT_PACE : 1);
  chk(myRun);
  const total = dc.reduce((a, b) => a + b, 0);
  if (p.bot) {
    setMsg(`${p.emoji} ${p.name} fait ${dc.join(' + ')}${dc.length > 1 ? ' = ' + total : ''}.`);
    await sleep(Math.round(600 * BOT_PACE));
  } else if (G.palier === 3) {
    await askSum(dc, myRun);
  } else if (G.palier === 2) {
    await askDestination(p, total, myRun);
  } else {
    setMsg(`Tu as fait ${total} ! On compte ensemble.`);
    say(`Tu as fait ${num(total)} ! On compte ensemble.`);
    await sleep(900);
  }
  chk(myRun);
  if (!p.bot) setMsg('On avance… compte avec moi !');
  const events = applyRoll(G, dc);
  await playEvents(events, myRun, true);
  chk(myRun);
  updateHud();
  G_hud();
  if (G.over) return finish();
}

async function loopGame(myRun) {
  try {
    while (!G.over) {
      await playTurn(myRun);
      chk(myRun);
    }
  } catch (e) {
    if (e !== ABORT) console.error(e);
  }
}

function finish() {
  const w = G.players[G.winner];
  sfx.fanfare();
  confetti();
  $('end-emoji').textContent = w.emoji + '🏆';
  if (!w.bot) {
    $('end-title').textContent = 'Bravo, tu as gagné !';
    $('end-text').textContent = "Tu es arrivé pile sur la dernière case.";
    say('Bravo, tu as gagné !');
  } else {
    $('end-title').textContent = `${w.name} a gagné !`;
    $('end-text').textContent = 'Bravo à tous ! On rejoue ?';
    say(`${w.name} a gagné ! Bravo à tous. On rejoue ?`);
  }
  $('btn-next').classList.toggle('hidden', w.bot || G.palier >= 3);
  setTimeout(() => $('end').classList.remove('hidden'), dur(1200));
}

function startGame(o = {}) {
  Object.assign(cfg, o);
  run++;
  const myRun = run;
  rollResolver = tapResolver = answerResolver = null;
  speech.cancel();
  speech.setVoice(cfg.voice);
  G = createGame({ palier: cfg.palier, bots: cfg.bots, difficulty: cfg.difficulty, death: cfg.death, seed: (Math.random() * 1e9) | 0 });
  lastRng = mulberry32((Math.random() * 1e9) | 0);
  world.build(G);
  dice.setCount(G.diceCount);
  showAnswers(null);
  showCounter(null);
  $('bubble').classList.add('hidden');
  $('menu').classList.add('hidden');
  $('end').classList.add('hidden');
  enableRoll(false);
  world.setOverview(false);
  $('btn-zoom').classList.remove('on');
  updateHud();
  resize();
  loopGame(myRun);
}
function toMenu() {
  run++;
  rollResolver = tapResolver = answerResolver = null;
  speech.cancel();
  $('end').classList.add('hidden');
  $('menu').classList.remove('hidden');
}

// ---------- menu ----------
function syncMenu() {
  document.querySelectorAll('.seg').forEach((seg) => {
    const g = seg.dataset.group;
    seg.querySelectorAll('.opt').forEach((b) => b.classList.toggle('sel', String(cfg[g]) === b.dataset.val));
  });
  $('tog-voice').dataset.on = cfg.voice ? '1' : '0';
  $('tog-voice').textContent = '🔊 Voix : ' + (cfg.voice ? 'oui' : 'non');
  $('tog-death').dataset.on = cfg.death ? '1' : '0';
  $('tog-death').textContent = '😂 Case « retour en riant » (palier 3) : ' + (cfg.death ? 'oui' : 'non');
}
document.querySelectorAll('.seg').forEach((seg) => {
  seg.addEventListener('click', (ev) => {
    const b = ev.target.closest('.opt');
    if (!b) return;
    const g = seg.dataset.group;
    cfg[g] = g === 'difficulty' ? b.dataset.val : Number(b.dataset.val);
    sfx.unlock();
    syncMenu();
  });
});
$('tog-voice').addEventListener('click', () => { cfg.voice = !cfg.voice; speech.setVoice(cfg.voice); sfx.unlock(); syncMenu(); });
$('tog-death').addEventListener('click', () => { cfg.death = !cfg.death; sfx.unlock(); syncMenu(); });
$('btn-play').addEventListener('click', () => { sfx.unlock(); startGame(); });
$('btn-again').addEventListener('click', () => { sfx.unlock(); startGame(); });
$('btn-next').addEventListener('click', () => { sfx.unlock(); startGame({ palier: Math.min(3, cfg.palier + 1) }); });
$('btn-end-menu').addEventListener('click', () => { syncMenu(); toMenu(); });
$('btn-menu').addEventListener('click', () => { syncMenu(); toMenu(); });
$('btn-menu-rules').addEventListener('click', () => { sfx.unlock(); speech.say(RULES[cfg.palier], { force: true }); });
$('btn-rules').addEventListener('click', () => { sfx.unlock(); speech.say(RULES[cfg.palier], { force: true }); });
$('btn-zoom').addEventListener('click', () => {
  world.setOverview(!world.overview);
  $('btn-zoom').classList.toggle('on', world.overview);
});
$('btn-roll').addEventListener('click', () => { sfx.unlock(); requestRoll(); });
const dz = $('dieZone');
dz.addEventListener('pointerdown', (ev) => { ev.preventDefault(); sfx.unlock(); requestRoll(); });
dz.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); requestRoll(); } });
syncMenu();

// ---------- crochet de test ----------
window.__oie = {
  get state() { return G; },
  get cfg() { return cfg; },
  get world() { return world; },
  start: (o) => startGame(o),
  menu: toMenu,
  roll: requestRoll,
  set timeScale(v) { clock.scale = v; },
  get timeScale() { return clock.scale; },
  set auto(v) { auto = !!v; if (auto && rollResolver) setTimeout(requestRoll, 30); },
  get auto() { return auto; },
  tap(i) { if (tapResolver) { const r = tapResolver; tapResolver = null; r(i); return true; } return false; },
  answer(v) { if (answerResolver) { answerResolver(v, null); return true; } return false; },
  pick: (cx, cy) => world.pickCase(cx, cy, $('boardArea').getBoundingClientRect()),
  screenOf: (i) => world.screenOf(i, $('boardArea').getBoundingClientRect()),
  firstLanding: (total) => (G ? firstLanding(G, G.turn, total) : null),
  jumpTo(pid, pos) { G.players[pid].pos = pos; world.place(pid, pos); updateHud(); },
};
