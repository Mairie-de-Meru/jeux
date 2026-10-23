// Orchestration : jeu, interface, robots, crochet de débogage window.__scrabble.
import { BoardView } from './render/scene.js';
import { createGame, setBigDict, HUMAN_AVATARS, evaluateMove, applyMove, passTurn, exchangeTiles, chooseBotMove, suggestMove, ranking } from './logic/rules.js';
import { PALIERS } from './logic/board.js';
import { pointsOf } from './logic/bag.js';
import { playableCells } from './logic/targets.js';
import { autoZoomWanted, zoomAnchor } from './logic/zoom.js';
import { sounds, setMuted } from './audio.js';
import * as speech from './speech.js';
import { $, showMsg, showPop, seg, confetti } from './ui/ui.js';

const RULES_TEXT = "Choisis une lettre en bas, puis touche une case du plateau. Le premier mot passe par l'étoile. "
  + "Les autres mots doivent toucher les mots déjà posés. Les cases de couleur donnent plus de points. "
  + "Appuie sur Valider quand ton mot est prêt. Si le mot est inconnu, tes lettres reviennent, sans problème. "
  + "Tu peux aussi échanger tes lettres ou passer ton tour. Le plus de points gagne !";

const settings = { palier: 1, bots: 1, difficulty: 'facile' };
// Places de joueurs de l'accueil : place 1 humaine, les autres Vide (null) / 'robot' / 'human'.
const seatUi = { kinds: ['human', 'robot', null, null], names: ['Toi', '', '', ''] };
// Grande liste de validation (assets/lexique.txt), chargée sans bloquer l'accueil.
const lex = { loaded: false, set: null };
fetch('./assets/lexique.txt').then((r) => (r.ok ? r.text() : Promise.reject(new Error(r.status)))).then((t) => {
  lex.set = new Set(t.split('\n').filter(Boolean));
  lex.loaded = true;
  if (S.game) setBigDict(S.game, lex.set);
}).catch((err) => console.warn('lexique indisponible, liste enfant seule', err));

const S = { shown: 0, passScreen: false, game: null, pending: [], selected: null, view: [], busy: true, lastCells: [], token: 0, hint: null, swapSel: new Set(), drag: null, autoZoom: false };

const view = new BoardView($('c'), $('stage'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Rythme des robots : multiplicateur des délais/animations des robots (pas de l'enfant).
const BOT_PACE = 1.6;
const bp = (ms) => Math.round(ms * BOT_PACE);
// Joueur humain dont le chevalet est affiché (celui dont c'est le tour, ou le dernier humain actif pendant un robot).
const human = () => S.game.players[S.shown];
const isHumanTurn = () => S.game && !S.game.over && !S.passScreen && !S.game.players[S.game.turn].bot;
const humanCount = () => S.game.players.filter((p) => !p.bot).length;

// ---------- affichage ----------
function renderScores() {
  const g = S.game;
  $('scores').classList.toggle('many', g.players.length >= 4);
  $('scores').innerHTML = g.players.map((p, i) =>
    `<div class="chip${i === g.turn && !g.over ? ' active' : ''}"><span class="av">${p.avatar}</span><span class="nm">${p.name}</span><b>${p.score}</b></div>`).join('');
  renderStatus();
}

function usedIdx() { return new Set(S.pending.map((p) => p.idx)); }

// Cases jouables surlignées quand une lettre est choisie (jamais pendant un tour de robot).
let targetCells = [];
function syncTargets() {
  const on = S.game && S.selected !== null && !S.busy && isHumanTurn();
  targetCells = on ? playableCells(S.game.grid, S.pending, S.game.center, S.game.firstMove) : [];
  view.setTargets(targetCells, on && S.pending.length === 0 && S.game.firstMove ? [S.game.center, S.game.center] : null);
  if (!on) view.setMarker(null);
}

function renderRack() {
  const rack = human().rack;
  const used = usedIdx();
  const hintIdx = S.hint ? S.hint.rackIdx : [];
  const box = $('rack');
  box.innerHTML = '';
  if (S.passScreen) { syncTargets(); return; } // aucune lettre dans le DOM pendant l'écran de passage
  for (const i of S.view) {
    if (i >= rack.length) continue;
    const b = document.createElement('button');
    b.className = 'tile' + (S.selected === i ? ' sel' : '') + (used.has(i) ? ' used' : '') + (hintIdx.includes(i) ? ' hint' : '');
    b.dataset.idx = i;
    b.setAttribute('aria-label', 'Lettre ' + rack[i]);
    b.innerHTML = `${rack[i]}<small>${pointsOf(rack[i])}</small>`;
    box.appendChild(b);
  }
  syncTargets();
}

let statusText = '';
function renderStatus() { $('status').textContent = (statusText ? statusText + '  ·  ' : '') + '🎒 ' + S.game.bag.length; }
function setStatus(t) { statusText = t; renderStatus(); }

function renderButtons() {
  const can = isHumanTurn() && !S.busy;
  for (const id of ['btn-ok', 'btn-recall', 'btn-shuffle', 'btn-swap', 'btn-hint', 'btn-pass']) $(id).disabled = !can;
  $('btn-ok').disabled = !can || S.pending.length === 0;
  $('btn-recall').disabled = !can || S.pending.length === 0;
  $('btn-hint').classList.toggle('hidden', PALIERS[S.game.palier].hint === 'none');
}

function refresh() {
  renderScores();
  renderRack();
  renderButtons();
}

function resetView() {
  S.view = human().rack.map((_, i) => i);
}

// ---------- pose ----------
function isFree(r, c) {
  return !S.game.grid[r][c] && !S.pending.some((p) => p.r === r && p.c === c);
}

function clearHint() {
  if (S.hint) { S.hint = null; view.clearGhosts(); renderRack(); }
}

function placePending(r, c, idx) {
  const l = human().rack[idx];
  S.pending.push({ r, c, l, idx });
  view.addTile(r, c, l, 'pending', { drop: true });
  sounds.place();
  S.selected = null;
  clearHint();
  refocus();
  refresh();
}

function removePending(r, c) {
  const k = S.pending.findIndex((p) => p.r === r && p.c === c);
  if (k < 0) return;
  S.pending.splice(k, 1);
  view.removeTile(r, c);
  sounds.back();
  refocus();
  refresh();
}

function recallAll(silent = false) {
  for (const p of S.pending) view.removeTile(p.r, p.c);
  S.pending = [];
  S.selected = null;
  clearHint();
  if (!silent) sounds.back();
  refocus();
  refresh();
}

// Cases à montrer en zoom : lettres en cours, dernier mot, étoile, sinon cases jouables proches du centre.
function focusCells() {
  const g = S.game;
  const playable = !S.pending.length && !S.lastCells.length && !g.firstMove ? playableCells(g.grid, [], g.center, false) : [];
  return zoomAnchor({ pending: S.pending, lastCells: S.lastCells, firstMove: g.firstMove, center: g.center, playable });
}
// Bouton 🔍/🗺 masqué quand le plateau entier est déjà assez grand ; flèches visibles en zoom.
function syncZoomUi() {
  $('btn-zoom').classList.toggle('hidden', !view.zoomUseful() && !view.focus);
  $('btn-zoom').textContent = view.focus ? '🗺' : '🔍';
  $('pan').classList.toggle('hidden', !view.focus);
}
view.onResize = syncZoomUi;
function refocus() { if (view.focus) view.setFocus(true, focusCells()); }
// Zoom automatique sur petit écran quand l'enfant prend une lettre (sélection ou glisser).
function autoZoomIn() {
  if (view.focus || !autoZoomWanted(view.fullPx) || S.busy || !isHumanTurn()) return;
  view.setFocus(true, focusCells());
  S.autoZoom = view.focus;
  syncZoomUi();
}
// Retour à la vue d'ensemble (après Valider, Reprendre ou en fin de tour), seulement si le zoom était automatique.
function autoZoomOut() {
  if (!S.autoZoom) return;
  S.autoZoom = false;
  view.setFocus(false);
  syncZoomUi();
}

function tapRack(idx) {
  if (S.busy || !isHumanTurn()) return;
  sounds.tap();
  S.selected = S.selected === idx ? null : idx;
  renderRack();
  if (S.selected !== null) autoZoomIn();
}

function boardTap(x, y) {
  if (S.busy || !isHumanTurn()) return 'none';
  const hit = view.pickCell(x, y, isFree, 40);
  if (S.selected !== null && hit) { placePending(hit.r, hit.c, S.selected); return 'place'; }
  const mine = view.pickExact(x, y, (r, c) => S.pending.some((p) => p.r === r && p.c === c), 28);
  if (mine) { removePending(mine.r, mine.c); return 'remove'; }
  if (S.selected === null) { showMsg('Choisis une lettre en bas, puis touche une case.', { ms: 2800 }); return 'msg'; }
  return 'none';
}

// ---------- tour de l'enfant ----------
function messageFor(res) {
  switch (res.code) {
    case 'unknown': return `Hmm, « ${res.words[0]} » : je ne connais pas ce mot. Tes lettres reviennent, essaie encore !`;
    case 'toolong': return `Sur ce plateau, les mots font ${PALIERS[S.game.palier].maxWord} lettres au plus. Essaie plus court !`;
    case 'center': return 'Le premier mot doit passer par l\'étoile ⭐.';
    case 'connect': return 'Ton mot doit toucher un mot déjà posé.';
    case 'gap': return 'Il y a un trou entre tes lettres.';
    case 'line': return 'Pose tes lettres en ligne droite : vers la droite ou vers le bas.';
    case 'short': return 'Il faut au moins 2 lettres pour faire un mot.';
    case 'empty': return 'Pose d\'abord quelques lettres sur le plateau.';
    default: return res.message || 'Essaie encore !';
  }
}

async function submit() {
  if (S.busy || !isHumanTurn()) return null;
  const placements = S.pending.map(({ r, c, l }) => ({ r, c, l }));
  const res = evaluateMove(S.game, placements);
  if (!res.ok) {
    sounds.oops();
    showMsg(messageFor(res), { bad: true, ms: 6000 });
    if (res.code === 'empty') return res;
    S.busy = true; renderButtons();
    const t = ++S.token;
    await sleep(900);
    if (t === S.token) { recallAll(true); autoZoomOut(); S.busy = false; refresh(); }
    return res;
  }
  S.busy = true;
  autoZoomOut();
  const cells = S.pending.map((p) => [p.r, p.c]);
  const out = applyMove(S.game, placements);
  S.pending = [];
  S.selected = null;
  clearLast();
  for (const [r, c] of cells) { view.setVariant(r, c, 'last'); view.pop(view.tiles.get(r + ',' + c)); }
  S.lastCells = cells;
  celebrate(out, human().name);
  resetView();
  refresh();
  await sleep(1100);
  return afterTurn(out);
}

function clearLast() {
  for (const [r, c] of S.lastCells) view.setVariant(r, c, 'normal');
  S.lastCells = [];
}

function celebrate(out, who) {
  const main = out.words[0].word;
  showPop('+' + out.score);
  if (out.bingo) { showMsg(humanCount() > 1 ? `Magnifique ${human().name} ! 7 lettres : bonus +20 !` : `Magnifique ! Tu as posé 7 lettres : bonus +20 !`, { ms: 5000 }); sounds.big(); confetti(90); }
  else {
    showMsg(out.words.map((w) => w.word).join(' · ') + ` : +${out.score} points`, { ms: 4200 });
    out.score >= 20 ? sounds.big() : sounds.good(3);
  }
  if (who === human().name) speech.speak(main);
  refocus();
}

function afterTurn() {
  S.token++;
  autoZoomOut();
  if (S.game.over) return endGame();
  refresh();
  const cur = S.game.players[S.game.turn];
  if (cur.bot) return botTurn();
  beginHumanTurn();
  return Promise.resolve();
}

// Début du tour d'un humain : avec au moins 2 humains, écran « Passe l'appareil » avant d'afficher le chevalet.
function beginHumanTurn() {
  const g = S.game;
  S.shown = g.turn;
  S.hint = null;
  resetView();
  const p = g.players[g.turn];
  if (humanCount() >= 2) {
    S.passScreen = true;
    S.busy = true;
    $('pass-who').textContent = `${p.avatar} ${p.name}`;
    $('pass').classList.remove('hidden');
    refresh();
    speech.speak(`Passe l'appareil à ${p.name}`);
    return;
  }
  S.busy = false;
  setStatus('À toi de jouer ! ' + p.avatar);
  refresh();
}

function ready() {
  if (!S.passScreen) return;
  S.passScreen = false;
  $('pass').classList.add('hidden');
  S.busy = false;
  const p = human();
  setStatus(`À ${p.avatar} ${p.name} de jouer !`);
  resetView();
  refresh();
}

// ---------- robots ----------
async function botTurn() {
  const g = S.game;
  const p = g.players[g.turn];
  S.busy = true;
  renderButtons();
  setStatus(`${p.avatar} ${p.name} réfléchit…`);
  await sleep(bp(800 + Math.random() * 500));
  const choice = chooseBotMove(g);
  if (choice.type === 'play') {
    const pl = choice.move.placements;
    clearLast();
    sounds.bot();
    const from = view.cellPos(-3, (g.size - 1) / 2, 3.2);
    from.x += (Math.random() - 0.5) * 2;
    await Promise.all(pl.map(async (t, i) => {
      await sleep(bp(i * 260));
      return view.flyTile(t.r, t.c, t.l, 'last', from.clone(), bp(520));
    }));
    S.lastCells = pl.map((t) => [t.r, t.c]);
    const out = applyMove(g, pl);
    if (!out.ok) throw new Error('coup robot illégal : ' + out.message);
    sounds.good(2);
    showPop('+' + out.score);
    showMsg(`${p.avatar} ${p.name} joue ${out.words[0].word} : +${out.score}`, { ms: bp(3500) });
    speech.speak(`${p.name} joue ${out.words[0].word}`);
    refocus();
    refresh();
    await sleep(bp(1300));
  } else if (choice.type === 'exchange') {
    exchangeTiles(g, choice.indices);
    sounds.shuffle();
    showMsg(`${p.avatar} ${p.name} change des lettres.`, { ms: bp(2500) });
    refresh();
    await sleep(bp(1100));
  } else {
    passTurn(g);
    showMsg(`${p.avatar} ${p.name} passe son tour.`, { ms: bp(2500) });
    refresh();
    await sleep(bp(1000));
  }
  return afterTurn();
}

// ---------- actions ----------
function shuffleRack() {
  if (S.busy) return;
  for (let i = S.view.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [S.view[i], S.view[j]] = [S.view[j], S.view[i]]; }
  sounds.shuffle();
  renderRack();
}

function hint() {
  if (S.busy || !isHumanTurn()) return null;
  const mode = PALIERS[S.game.palier].hint;
  if (mode === 'none') return null;
  recallAll(true);
  const m = suggestMove(S.game);
  if (!m) { showMsg('Je ne vois pas de mot. Tu peux échanger des lettres ♻ !', { ms: 5000 }); return null; }
  sounds.tap();
  const dirTxt = m.dir === 'H' ? 'vers la droite →' : 'vers le bas ↓';
  if (mode === 'full') {
    const rack = human().rack;
    const taken = new Set();
    const rackIdx = [];
    for (const t of m.placements) {
      const i = rack.findIndex((l, k) => l === t.l && !taken.has(k));
      taken.add(i); rackIdx.push(i);
    }
    S.hint = { move: m, rackIdx };
    view.setGhosts(m.placements);
    renderRack();
    showMsg(`💡 Essaie le mot ${m.word}, les lettres vertes montrent où le poser !`, { ms: 7000 });
  } else {
    showMsg(`💡 Essaie le mot ${m.word}, ${dirTxt} (ligne ${m.start[0] + 1}, colonne ${m.start[1] + 1}).`, { ms: 7000 });
  }
  speech.speak(m.word);
  return m;
}

async function pass() {
  if (S.busy || !isHumanTurn()) return;
  recallAll(true);
  S.busy = true;
  passTurn(S.game);
  showMsg('Tu passes ton tour.', { ms: 2500 });
  refresh();
  await sleep(700);
  return afterTurn();
}

function openSwap() {
  if (S.busy || !isHumanTurn()) return;
  recallAll(true);
  if (S.game.bag.length === 0) { showMsg('Le sac est vide : plus d\'échange possible.', { bad: true }); return; }
  S.swapSel = new Set();
  const box = $('swap-rack');
  box.innerHTML = '';
  human().rack.forEach((l, i) => {
    const b = document.createElement('button');
    b.className = 'tile';
    b.innerHTML = `${l}<small>${pointsOf(l)}</small>`;
    b.onclick = () => { sounds.tap(); S.swapSel.has(i) ? S.swapSel.delete(i) : S.swapSel.add(i); b.classList.toggle('swapsel'); };
    box.appendChild(b);
  });
  $('swap').classList.remove('hidden');
}

async function doSwap(indices) {
  const idx = indices ?? [...S.swapSel];
  const res = exchangeTiles(S.game, idx);
  if (!res.ok) { showMsg(res.code === 'bag' ? 'Il ne reste pas assez de lettres dans le sac.' : 'Choisis les lettres à changer.', { bad: true }); return res; }
  $('swap').classList.add('hidden');
  S.busy = true;
  sounds.shuffle();
  resetView();
  showMsg(`Tu as changé ${res.count} lettre${res.count > 1 ? 's' : ''}.`, { ms: 2500 });
  refresh();
  await sleep(800);
  await afterTurn();
  return res;
}

// ---------- fin de partie ----------
function endGame() {
  S.busy = true;
  renderScores();
  renderButtons();
  const { sorted, winners } = ranking(S.game);
  S.passScreen = false;
  $('pass').classList.add('hidden');
  const nbH = humanCount();
  const won = winners.some((p) => !p.bot);
  const rank = sorted.findIndex((p) => !p.bot);
  const title = won
    ? (winners.length > 1 ? 'Égalité, bravo !' : nbH === 1 ? 'Bravo, tu as gagné !' : `Bravo ${winners[0].name} !`)
    : (nbH === 1 ? 'Bien joué !' : `Bravo ${winners[0].name} ! Bien joué tout le monde`);
  $('end-title').textContent = title;
  $('end-stars').textContent = '⭐'.repeat(won ? 3 : rank === 1 ? 2 : 1);
  $('end-list').innerHTML = sorted.map((p) => `<li class="${winners.includes(p) ? 'win' : ''}"><span>${p.avatar} ${p.name}</span><span>${p.score}</span></li>`).join('');
  setTimeout(() => {
    $('end').classList.remove('hidden');
    if (won) { sounds.win(); confetti(200); } else sounds.good(4);
    speech.speak(won || nbH > 1 ? title : 'Bien joué ! On rejoue ?');
  }, 900);
  return Promise.resolve();
}

// ---------- démarrage ----------
function startGame(opts = {}) {
  const { seats: _s, ...rest } = opts;
  Object.assign(settings, rest);
  S.token++;
  // `seats` explicites, sinon réglages de l'accueil ; l'ancien mode (bots/allBots) reste pour le débogage.
  const legacy = !opts.seats && ('bots' in opts || opts.allBots);
  const seats = legacy ? null : (opts.seats || seatsForGame());
  S.game = createGame({ palier: settings.palier, bots: settings.bots, difficulty: settings.difficulty, seed: opts.seed ?? (Date.now() & 0x7fffffff), allBots: !!opts.allBots, seats, bigDict: lex.set });
  S.shown = 0; S.passScreen = false; $('pass').classList.add('hidden');
  S.pending = []; S.selected = null; S.lastCells = []; S.hint = null; S.autoZoom = false;
  view.setupBoard(S.game.size, S.game.premium);
  syncZoomUi();
  resetView();
  $('home').classList.add('hidden');
  $('end').classList.add('hidden');
  $('swap').classList.add('hidden');
  $('btn-resume').classList.remove('hidden');
  showMsg(S.game.palier === 1 ? 'Pose un mot sur l\'étoile ⭐ ! Le bouton 💡 t\'aide.' : 'Le premier mot passe par l\'étoile ⭐ !', { ms: 5000 });
  S.busy = false;
  refresh();
  if (S.game.players[0].bot) return botTurn();
  beginHumanTurn();
  return Promise.resolve();
}

function readRules() { sounds.tap(); speech.speak(RULES_TEXT, { force: true }); }

// ---------- événements ----------
seg('seg-palier', (v) => { settings.palier = +v; });
// ----- places de joueurs (accueil) -----
const SEAT_NEXT = { '': 'robot', robot: 'human', human: '' };
function seatsForGame() {
  const out = [];
  seatUi.kinds.forEach((k, i) => { if (k === 'human') out.push({ kind: 'human', name: seatUi.names[i] }); else if (k === 'robot') out.push({ kind: 'robot' }); });
  return out;
}
function renderSeatsUi() {
  let h = 0;
  document.querySelectorAll('#seats .seat').forEach((el, i) => {
    const k = seatUi.kinds[i];
    const av = k === 'human' ? HUMAN_AVATARS[h++] : k === 'robot' ? '🤖' : '➕';
    const b = el.querySelector('.seat-b');
    if (b) b.innerHTML = `${av}<span>${k === 'human' ? 'Humain' : k === 'robot' ? 'Robot' : 'Vide'}</span>`;
    else el.querySelector('.seat-av').textContent = av;
    el.querySelector('input').classList.toggle('hidden', k !== 'human');
  });
  const hasBot = seatUi.kinds.includes('robot');
  $('lbl-diff').classList.toggle('hidden', !hasBot);
  $('seg-diff').classList.toggle('hidden', !hasBot);
}
document.querySelectorAll('#seats .seat').forEach((el, i) => {
  el.querySelector('input').addEventListener('input', (e) => { seatUi.names[i] = e.target.value; });
  const b = el.querySelector('.seat-b');
  if (!b) return;
  b.onclick = () => {
    sounds.tap();
    let nk = SEAT_NEXT[seatUi.kinds[i] || ''] || null;
    // au moins 2 places occupées : on ne vide pas la dernière place autre que la première
    if (!nk && !seatUi.kinds.some((k, j) => j > 0 && j !== i && k)) nk = 'robot';
    seatUi.kinds[i] = nk;
    renderSeatsUi();
  };
});
renderSeatsUi();
seg('seg-diff', (v) => { settings.difficulty = v; });
$('pass-ready').onclick = () => { sounds.tap(); ready(); };
$('btn-play').onclick = () => { sounds.tap(); startGame(); };
$('btn-resume').onclick = () => { $('home').classList.add('hidden'); };
$('btn-menu').onclick = () => { sounds.tap(); $('home').classList.remove('hidden'); };
$('btn-rules').onclick = readRules;
$('btn-rules2').onclick = readRules;
$('btn-voice').onclick = () => {
  const on = $('btn-voice').getAttribute('aria-pressed') !== 'true';
  $('btn-voice').setAttribute('aria-pressed', on ? 'true' : 'false');
  $('btn-voice').textContent = on ? '🗣 Voix : oui' : '🗣 Voix : non';
  speech.setEnabled(on);
  setMuted(false);
};
$('btn-zoom').onclick = () => { sounds.tap(); S.autoZoom = false; view.setFocus(!view.focus, focusCells()); syncZoomUi(); };
for (const [id, dr, dc] of [['pan-up', -3, 0], ['pan-down', 3, 0], ['pan-left', 0, -3], ['pan-right', 0, 3]]) {
  $(id).onclick = () => { sounds.tap(); view.panFocus(dr, dc); };
}
$('btn-ok').onclick = submit;
$('btn-recall').onclick = () => { if (!S.busy) { recallAll(); autoZoomOut(); } };
$('btn-shuffle').onclick = shuffleRack;
$('btn-swap').onclick = openSwap;
$('btn-hint').onclick = hint;
$('btn-pass').onclick = pass;
$('swap-ok').onclick = () => doSwap();
$('swap-cancel').onclick = () => $('swap').classList.add('hidden');
$('end-again').onclick = () => { sounds.tap(); startGame(); };
$('end-menu').onclick = () => { $('end').classList.add('hidden'); $('btn-resume').classList.add('hidden'); $('home').classList.remove('hidden'); };

// tap sur le plateau ; double-tap = zoom sur la case ; deux doigts = pincement (zoom / vue d'ensemble)
let tapStart = null;
let lastTap = null;
let pinch = null;
const ptrs = new Map();
const cv = $('c');
const pdist = () => { const [a, b] = [...ptrs.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
function cancelDrag() {
  const d = S.drag;
  if (!d) return;
  S.drag = null;
  if (d.active) { d.el.remove(); view.clearGhosts(); view.setMarker(null); }
  try { rackEl.releasePointerCapture(d.id); } catch (err) { /* ok */ }
}
function toggleZoomAt(x, y) {
  if (!view.zoomUseful() && !view.focus) return;
  sounds.tap();
  S.autoZoom = false;
  if (view.focus) view.setFocus(false);
  else { const cell = view.pickCell(x, y, () => true, 80); if (cell) view.zoomAt(cell.r, cell.c); }
  syncZoomUi();
}
cv.addEventListener('pointerdown', (e) => {
  if (e.isPrimary) ptrs.clear(); // pointeur principal : aucun autre doigt actif, on oublie d'éventuels restes
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size === 1 && !(S.drag && e.pointerType !== 'mouse')) { tapStart = { x: e.clientX, y: e.clientY }; return; }
  // deuxième pointeur (ou doigt posé pendant un glisser) : geste, on annule la sélection et le glisser
  tapStart = null;
  lastTap = null;
  cancelDrag();
  if (S.selected !== null) { S.selected = null; renderRack(); }
  view.setMarker(null);
  pinch = ptrs.size >= 2 ? { d0: pdist(), done: false } : null;
});
cv.addEventListener('pointermove', (e) => {
  if (!ptrs.has(e.pointerId)) return;
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (!pinch || pinch.done || ptrs.size < 2 || !(pinch.d0 > 0)) return;
  const k = pdist() / pinch.d0;
  const [a, b] = [...ptrs.values()];
  if (k > 1.25 && !view.focus) { pinch.done = true; toggleZoomAt((a.x + b.x) / 2, (a.y + b.y) / 2); }
  else if (k < 0.8 && view.focus) { pinch.done = true; toggleZoomAt(0, 0); }
});
const ptrEnd = (e) => { ptrs.delete(e.pointerId); if (!ptrs.size) pinch = null; };
cv.addEventListener('pointercancel', (e) => { ptrEnd(e); tapStart = null; });
cv.addEventListener('pointerup', (e) => {
  ptrEnd(e);
  if (!tapStart) return;
  const moved = Math.hypot(e.clientX - tapStart.x, e.clientY - tapStart.y);
  tapStart = null;
  if (moved >= 12) return;
  const did = boardTap(e.clientX, e.clientY);
  // double-tap : seulement si le premier tap n'a ni posé ni repris de lettre (aucune gêne pour la pose)
  const now = performance.now();
  if ((did === 'none' || did === 'msg') && lastTap && now - lastTap.t < 350 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 30) {
    if (lastTap.msg || did === 'msg') showMsg('');
    lastTap = null;
    toggleZoomAt(e.clientX, e.clientY);
    return;
  }
  lastTap = did === 'none' || did === 'msg' ? { t: now, x: e.clientX, y: e.clientY, msg: did === 'msg' } : null;
});
// survol souris : marqueur sur la case sous le curseur quand une lettre est choisie
cv.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse') return;
  view.setMarker(S.selected !== null && !S.busy && isHumanTurn() ? view.pickCell(e.clientX, e.clientY, isFree, 1) : null);
});
cv.addEventListener('pointerleave', () => view.setMarker(null));
cv.addEventListener('contextmenu', (e) => e.preventDefault());

// chevalet : toucher = sélectionner, glisser = déposer sur le plateau
const rackEl = $('rack');
rackEl.addEventListener('pointerdown', (e) => {
  const b = e.target.closest('.tile');
  if (!b || b.classList.contains('used')) return;
  S.drag = { idx: +b.dataset.idx, sx: e.clientX, sy: e.clientY, active: false, el: null, id: e.pointerId };
  try { rackEl.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
});
rackEl.addEventListener('pointermove', (e) => {
  const d = S.drag;
  if (!d || d.id !== e.pointerId) return;
  if (!d.active && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 10 && !S.busy && isHumanTurn()) {
    d.active = true;
    const l = human().rack[d.idx];
    d.el = document.createElement('div');
    d.el.className = 'tile drag';
    d.el.innerHTML = `${l}<small>${pointsOf(l)}</small>`;
    document.body.appendChild(d.el);
    S.selected = d.idx;
    renderRack();
    autoZoomIn();
  }
  if (d.active) {
    const off = dragOffset(e);
    d.el.style.left = e.clientX - d.el.offsetWidth / 2 + 'px';
    d.el.style.top = (off ? e.clientY - d.el.offsetHeight - 14 : e.clientY - d.el.offsetHeight / 2) + 'px';
    const hit = view.pickCell(e.clientX, e.clientY - off, isFree, off ? 40 : 28);
    view.setGhosts(hit ? [{ r: hit.r, c: hit.c, l: human().rack[d.idx] }] : []);
    view.setMarker(hit);
  }
});
// Tactile : la tuile flotte au-dessus du doigt, on vise donc 40 px plus haut ; souris : la case sous le curseur.
function dragOffset(e) { return e.pointerType === 'mouse' ? 0 : 40; }
function endDrag(e, cancel) {
  const d = S.drag;
  if (!d || d.id !== e.pointerId) return;
  S.drag = null;
  if (d.active) {
    d.el.remove();
    view.clearGhosts();
    view.setMarker(null);
    const off = dragOffset(e);
    const hit = cancel ? null : view.pickCell(e.clientX, e.clientY - off, isFree, off ? 40 : 28);
    const r = $('c').getBoundingClientRect();
    const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY - off >= r.top && e.clientY - off <= r.bottom;
    if (hit && inside && !S.busy && isHumanTurn()) placePending(hit.r, hit.c, d.idx);
    else { S.selected = null; renderRack(); }
  } else if (!cancel) {
    tapRack(d.idx);
  }
}
rackEl.addEventListener('pointerup', (e) => endDrag(e, false));
rackEl.addEventListener('pointercancel', (e) => endDrag(e, true));

// ---------- crochet de débogage ----------
window.__scrabble = {
  view,
  get state() { return S.game; },
  get ui() { return { passScreen: S.passScreen, pending: S.pending, selected: S.selected, busy: S.busy, hint: S.hint, view: S.view }; },
  settings,
  newGame: (o) => startGame(o),
  setPalier: (p, o = {}) => startGame({ palier: p, ...o }),
  rack: () => [...human().rack],
  // pose et valide un coup [{r,c,l}] comme le ferait l'enfant
  async play(placements) {
    recallAll(true);
    const rack = human().rack;
    const taken = new Set();
    for (const t of placements) {
      const idx = rack.findIndex((l, k) => l === t.l && !taken.has(k));
      if (idx < 0) return { ok: false, code: 'rack', message: 'lettre absente' };
      taken.add(idx);
      S.pending.push({ r: t.r, c: t.c, l: t.l, idx });
      view.addTile(t.r, t.c, t.l, 'pending');
    }
    refresh();
    return submit();
  },
  suggest: () => suggestMove(S.game),
  hint,
  // joue automatiquement la suggestion pour l'enfant (ou passe)
  async auto() {
    const m = suggestMove(S.game);
    if (!m) return pass();
    return this.play(m.placements);
  },
  pass,
  exchange: (idx) => doSwap(idx),
  tapRack,
  tapCell: (r, c) => { if (S.selected !== null && isFree(r, c)) placePending(r, c, S.selected); },
  submit,
  recall: () => recallAll(),
  shuffle: shuffleRack,
  zoom: () => $('btn-zoom').click(),
  ready,
  lexique: () => ({ loaded: lex.loaded, size: lex.set ? lex.set.size : 0 }),
  targets: () => targetCells.map(([r, c]) => [r, c]),
  cellPx: () => view.cellPx(),
  get fullPx() { return view.fullPx; },
  get focus() { return view.focus; },
  get autoZoom() { return S.autoZoom; },
  zoomAt: (r, c) => { S.autoZoom = false; view.zoomAt(r, c); syncZoomUi(); },
  overview: () => { S.autoZoom = false; view.setFocus(false); syncZoomUi(); },
  pan: (dr, dc) => view.panFocus(dr, dc),
  waitIdle: async () => { for (let i = 0; i < 200 && S.busy; i++) await sleep(100); return !S.busy; },
  endGame,
};

// démarre sur le menu ; la scène est déjà prête avec un plateau vide
S.game = createGame({ palier: 1, bots: 1 });
view.setupBoard(S.game.size, S.game.premium);
resetView();
refresh();
setStatus('');
