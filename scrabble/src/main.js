// Orchestration : jeu, interface, robots, crochet de débogage window.__scrabble.
import { BoardView } from './render/scene.js';
import { createGame, setBigDict, evaluateMove, applyMove, passTurn, exchangeTiles, chooseBotMove, suggestMove, ranking } from './logic/rules.js';
import { PALIERS } from './logic/board.js';
import { pointsOf } from './logic/bag.js';
import { playableCells } from './logic/targets.js';
import { sounds, setMuted } from './audio.js';
import * as speech from './speech.js';
import { $, showMsg, showPop, seg, confetti } from './ui/ui.js';

const RULES_TEXT = "Choisis une lettre en bas, puis touche une case du plateau. Le premier mot passe par l'étoile. "
  + "Les autres mots doivent toucher les mots déjà posés. Les cases de couleur donnent plus de points. "
  + "Appuie sur Valider quand ton mot est prêt. Si le mot est inconnu, tes lettres reviennent, sans problème. "
  + "Tu peux aussi échanger tes lettres ou passer ton tour. Le plus de points gagne !";

const settings = { palier: 1, bots: 1, difficulty: 'facile' };
// Grande liste de validation (assets/lexique.txt), chargée sans bloquer l'accueil.
const lex = { loaded: false, set: null };
fetch('./assets/lexique.txt').then((r) => (r.ok ? r.text() : Promise.reject(new Error(r.status)))).then((t) => {
  lex.set = new Set(t.split('\n').filter(Boolean));
  lex.loaded = true;
  if (S.game) setBigDict(S.game, lex.set);
}).catch((err) => console.warn('lexique indisponible, liste enfant seule', err));

const S = { game: null, pending: [], selected: null, view: [], busy: true, lastCells: [], token: 0, hint: null, swapSel: new Set(), drag: null };

const view = new BoardView($('c'), $('stage'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Rythme des robots : multiplicateur des délais/animations des robots (pas de l'enfant).
const BOT_PACE = 1.6;
const bp = (ms) => Math.round(ms * BOT_PACE);
const human = () => S.game.players[0];
const isHumanTurn = () => S.game && !S.game.over && S.game.turn === 0 && !S.game.players[0].bot;

// ---------- affichage ----------
function renderScores() {
  const g = S.game;
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

function focusCells() { return S.pending.length ? S.pending.map((p) => [p.r, p.c]) : S.lastCells; }
function syncZoomUi() { $('btn-zoom').textContent = view.focus ? '🗺' : '🔍'; $('pan').classList.toggle('hidden', !view.focus); }
function refocus() { if (view.focus) view.setFocus(true, focusCells()); }

function tapRack(idx) {
  if (S.busy || !isHumanTurn()) return;
  sounds.tap();
  S.selected = S.selected === idx ? null : idx;
  renderRack();
}

function boardTap(x, y) {
  if (S.busy || !isHumanTurn()) return;
  const hit = view.pickCell(x, y, isFree, 40);
  if (S.selected !== null && hit) { placePending(hit.r, hit.c, S.selected); return; }
  const mine = view.pickExact(x, y, (r, c) => S.pending.some((p) => p.r === r && p.c === c), 28);
  if (mine) { removePending(mine.r, mine.c); return; }
  if (S.selected === null) showMsg('Choisis une lettre en bas, puis touche une case.', { ms: 2800 });
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
    if (t === S.token) { recallAll(true); S.busy = false; refresh(); }
    return res;
  }
  S.busy = true;
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
  if (out.bingo) { showMsg(`Magnifique ! Tu as posé 7 lettres : bonus +20 !`, { ms: 5000 }); sounds.big(); confetti(90); }
  else {
    showMsg(out.words.map((w) => w.word).join(' · ') + ` : +${out.score} points`, { ms: 4200 });
    out.score >= 20 ? sounds.big() : sounds.good(3);
  }
  if (who === human().name) speech.speak(main);
  refocus();
}

function afterTurn() {
  S.token++;
  if (S.game.over) return endGame();
  refresh();
  const cur = S.game.players[S.game.turn];
  if (cur.bot) return botTurn();
  S.busy = false;
  setStatus('À toi de jouer ! 🧒');
  resetView();
  refresh();
  return Promise.resolve();
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
  const won = winners.some((p) => p.id === 0);
  const rank = sorted.findIndex((p) => p.id === 0);
  $('end-title').textContent = won ? (winners.length > 1 ? 'Égalité, bravo !' : 'Bravo, tu as gagné !') : 'Bien joué !';
  $('end-stars').textContent = '⭐'.repeat(won ? 3 : rank === 1 ? 2 : 1);
  $('end-list').innerHTML = sorted.map((p) => `<li class="${winners.includes(p) ? 'win' : ''}"><span>${p.avatar} ${p.name}</span><span>${p.score}</span></li>`).join('');
  setTimeout(() => {
    $('end').classList.remove('hidden');
    if (won) { sounds.win(); confetti(200); } else sounds.good(4);
    speech.speak(won ? 'Bravo, tu as gagné !' : 'Bien joué ! On rejoue ?');
  }, 900);
  return Promise.resolve();
}

// ---------- démarrage ----------
function startGame(opts = {}) {
  Object.assign(settings, opts);
  S.token++;
  S.game = createGame({ palier: settings.palier, bots: settings.bots, difficulty: settings.difficulty, seed: opts.seed ?? (Date.now() & 0x7fffffff), allBots: !!opts.allBots, bigDict: lex.set });
  S.pending = []; S.selected = null; S.lastCells = []; S.hint = null;
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
  setStatus('À toi de jouer ! 🧒');
  return Promise.resolve();
}

function readRules() { sounds.tap(); speech.speak(RULES_TEXT, { force: true }); }

// ---------- événements ----------
seg('seg-palier', (v) => { settings.palier = +v; });
seg('seg-bots', (v) => { settings.bots = +v; });
seg('seg-diff', (v) => { settings.difficulty = v; });
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
$('btn-zoom').onclick = () => { sounds.tap(); view.setFocus(!view.focus, focusCells()); syncZoomUi(); };
for (const [id, dr, dc] of [['pan-up', -3, 0], ['pan-down', 3, 0], ['pan-left', 0, -3], ['pan-right', 0, 3]]) {
  $(id).onclick = () => { sounds.tap(); view.panFocus(dr, dc); };
}
$('btn-ok').onclick = submit;
$('btn-recall').onclick = () => { if (!S.busy) recallAll(); };
$('btn-shuffle').onclick = shuffleRack;
$('btn-swap').onclick = openSwap;
$('btn-hint').onclick = hint;
$('btn-pass').onclick = pass;
$('swap-ok').onclick = () => doSwap();
$('swap-cancel').onclick = () => $('swap').classList.add('hidden');
$('end-again').onclick = () => { sounds.tap(); startGame(); };
$('end-menu').onclick = () => { $('end').classList.add('hidden'); $('btn-resume').classList.add('hidden'); $('home').classList.remove('hidden'); };

// tap sur le plateau
let tapStart = null;
const cv = $('c');
cv.addEventListener('pointerdown', (e) => { tapStart = { x: e.clientX, y: e.clientY }; });
cv.addEventListener('pointerup', (e) => {
  if (!tapStart) return;
  const moved = Math.hypot(e.clientX - tapStart.x, e.clientY - tapStart.y);
  tapStart = null;
  if (moved < 12) boardTap(e.clientX, e.clientY);
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
  get ui() { return { pending: S.pending, selected: S.selected, busy: S.busy, hint: S.hint, view: S.view }; },
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
  lexique: () => ({ loaded: lex.loaded, size: lex.set ? lex.set.size : 0 }),
  targets: () => targetCells.map(([r, c]) => [r, c]),
  cellPx: () => view.cellPx(),
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
