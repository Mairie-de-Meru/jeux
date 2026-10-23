// Level 8 : interface, tour du joueur, tours des bots, crochet de débogage.
import { TableView } from './render/table.js';
import { createGame, objectiveOf, drawFromPile, takeDiscard, layDown, addToGroup, addTargets, swapTargets, swapJoker, discardCard, nextRound, setLevel, forceHand, takeableDiscards, topDiscard, playSkip, skipTargets, applyAction } from './logic/game.js';
import { chooseAction } from './logic/bot.js';
import { findLayout, sortCards, canAddToGroup, canSwapJoker, COLORS } from './logic/cards.js';
import { usefulIds, bestDiscard, objectiveFill } from './logic/planner.js';
import { objectiveTotal, RULES_SPEECH } from './logic/levels.js';
import { cardEl, cardName } from './ui/cardview.js';
import { goalEl } from './ui/goalview.js';
import { AVATARS } from './logic/avatars.js';
import { avatarHTML, preloadAvatars, onAvatarLoaded } from './avatarimg.js';
import { speak } from './speech.js';
import { sfx } from './audio.js';

const $ = (id) => document.getElementById(id);
const S = { g: null, view: null, sel: new Set(), sort: 'number', helpOn: false, fast: false, newId: null, flash: null, suggest: null, token: 0, botsPromise: Promise.resolve(), opts: { palier: 1, bots: 1, difficulty: 'facile', mode: 'full', jokerSwap: 'false', avatar: loadAvatar(), count: 2, seats: defaultSeats() }, viewer: 0, gateFor: null, cloak: false, fresh: false, goalSeen: new Set() };
loadSeats();

function loadAvatar() {
  try { const v = +localStorage.getItem('level8.avatar'); if (v >= 1 && v <= AVATARS.length) return v; } catch (e) { /* silencieux */ }
  return 1;
}
function defaultSeats() {
  return [{ type: 'human', name: '', avatar: loadAvatar() }, { type: 'bot', name: '', avatar: 2 }, { type: 'bot', name: '', avatar: 3 }, { type: 'bot', name: '', avatar: 4 }];
}
function loadSeats() {
  try {
    const d = JSON.parse(localStorage.getItem('level8.seats') || 'null');
    if (!d || !Array.isArray(d.seats) || d.seats.length !== 4) return;
    const used = new Set();
    const seats = d.seats.map((x, i) => {
      let av = AVATARS.some((a) => a.id === x.avatar) && !used.has(x.avatar) ? x.avatar : (AVATARS.find((a) => !used.has(a.id)) || AVATARS[0]).id;
      used.add(av);
      return { type: i === 0 || x.type !== 'bot' ? 'human' : 'bot', name: String(x.name || '').slice(0, 10), avatar: av };
    });
    S.opts.seats = seats;
    S.opts.count = Math.max(2, Math.min(4, +d.count || 2));
  } catch (e) { /* silencieux */ }
}
function saveSeats() { try { localStorage.setItem('level8.seats', JSON.stringify({ count: +S.opts.count, seats: S.opts.seats })); } catch (e) { /* silencieux */ } }
function saveAvatar(v) { try { localStorage.setItem('level8.avatar', String(v)); } catch (e) { /* silencieux */ } }

const wait = (ms) => new Promise((r) => setTimeout(r, S.fast ? 0 : ms));
// Rythme des robots : multiplicateur des délais/animations des robots (jamais des humains).
const BOT_PACE = 1.6;
const isBotSeat = (p) => !!(S.g && S.g.players[p] && S.g.players[p].isBot);
const botMs = (ms, p) => (isBotSeat(p) ? Math.round(ms * BOT_PACE) : ms);
const flyMs = (p = 0) => (S.fast ? 0 : botMs(450, p));
const me = () => S.g.players[S.viewer];
const multi = () => S.g.players.filter((p) => !p.isBot).length >= 2;
const handVisible = () => !S.cloak && S.gateFor == null;
// C'est le tour du joueur dont la main est affichée (et la main est visible).
const humanTurn = () => S.g.status === 'playing' && S.g.current === S.viewer && !S.g.players[S.viewer].isBot && handVisible();

function setMsg(text, shake = false) {
  const m = $('msg');
  if (text) m.textContent = text; // garde l'ancien texte pendant le fondu de sortie
  m.classList.toggle('off', !text);
  const c = $('chips'); // la pastille se place sous les pastilles des joueurs
  m.style.setProperty('--chips-h', (c && c.offsetHeight ? c.offsetTop + c.offsetHeight : 0) + 'px');
  m.classList.remove('shake');
  if (shake) { void m.offsetWidth; m.classList.add('shake'); }
}

function turnHint() {
  const g = S.g;
  if (g.status !== 'playing') return '';
  if (g.players[g.current].isBot) return multi() ? `Au tour des robots… ${g.players[g.current].emoji}` : `${g.players[g.current].emoji} ${g.players[g.current].name} joue…`;
  if (!handVisible() || g.current !== S.viewer) return '';
  const short = window.matchMedia && window.matchMedia('(max-width: 500px) and (orientation: portrait)').matches;
  const you = multi() ? `À toi, ${me().name} !` : 'À toi !';
  if (g.phase === 'draw') return short ? `${you} Pioche une carte.` : `${you} Pioche, ou prends une carte sur une défausse.`;
  if (short) return me().laid ? 'Ajoute, puis jette.' : 'Pose ton objectif, puis jette.';
  return me().laid ? 'Ajoute des cartes aux groupes, puis jette une carte.' : 'Pose ton objectif si tu l\'as, puis jette une carte.';
}

/* ---------- affichage ---------- */
function helpActive() {
  return S.g.pal.help === 'auto' || (S.g.pal.help === 'button' && S.helpOn);
}

function renderHand() {
  const g = S.g;
  const p = me();
  const hand = $('hand');
  hand.textContent = '';
  if (!handVisible()) return;
  // largeur des cartes pour tenir sur une ligne en éventail (portrait étroit, voir style.css)
  const W = ($('handwrap').clientWidth || window.innerWidth) - 14;
  const n = Math.max(p.hand.length, 1);
  let hcw;
  if (window.matchMedia && window.matchMedia('(orientation: landscape)').matches) {
    // paysage : au plus 2 rangées en éventail, cartes limitées par la hauteur disponible
    const low = window.matchMedia('(max-height: 500px)').matches; // paysage bas : une seule ligne, cartes qui se chevauchent
    const rows = !low && n > 5 ? 2 : 1;
    const perRow = Math.ceil(n / rows);
    const byW = Math.floor(W / (0.84 * perRow + 0.16));
    const availH = window.innerHeight - 44 - 60 - 64 - 54 - 28;
    const byH = Math.floor((availH - 16 - (rows - 1) * 4) / (1.4 * rows));
    hcw = Math.max(low ? 22 : 34, Math.min(72, byW, byH));
  } else hcw = Math.max(30, Math.min(46, Math.floor(W / (0.84 * n + 0.16))));
  hand.style.setProperty('--hcw', hcw + 'px');
  const myTurn = humanTurn();
  const specs = objectiveOf(g, p).groups;
  let keep = null;
  let ready = null;
  if (myTurn && helpActive()) {
    if (p.laid) {
      keep = new Set(p.hand.filter((c) => g.groups.some((x) => canAddToGroup(x, c) || (g.jokerSwap && canSwapJoker(x, c) >= 0))).map((c) => c.id));
    } else {
      keep = usefulIds(p.hand, specs);
      if (g.phase === 'play') {
        const lay = findLayout(p.hand, specs);
        if (lay) ready = new Set(lay.flat().map((c) => c.id));
      }
    }
  }
  for (const c of sortCards(p.hand, S.sort)) {
    const el = cardEl(c);
    if (S.sel.has(c.id)) el.classList.add('sel');
    if (keep && keep.has(c.id)) el.classList.add('keep');
    if (ready && ready.has(c.id)) el.classList.add('ready');
    if (keep && !keep.has(c.id)) el.classList.add('dim');
    if (S.suggest === c.id) el.classList.add('suggest');
    if (S.newId === c.id) el.classList.add('new');
    el.addEventListener('click', () => toggleSel(c.id));
    hand.appendChild(el);
  }
}

function renderGroups() {
  const g = S.g;
  const box = $('groups');
  box.textContent = '';
  box.classList.toggle('hidden', !g.groups.length);
  $('goal').classList.toggle('grow', !g.groups.length);
  if (!g.groups.length) {
    const e = document.createElement('span');
    e.className = 'empty';
    e.textContent = '🃏 Les groupes posés apparaîtront ici';
    box.appendChild(e);
    return;
  }
  const one = S.sel.size === 1 && humanTurn() && me().laid ? me().hand.find((c) => S.sel.has(c.id)) : null;
  const canSwap = (grp) => !!one && g.jokerSwap && canSwapJoker(grp, one) >= 0;
  for (const grp of g.groups) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'group' + (one && (canAddToGroup(grp, one) || canSwap(grp)) ? ' target' : '') + (canSwap(grp) ? ' swap' : '');
    const m = grp.meta;
    const label = m.t === 'set' ? `= ${m.n}` : m.t === 'run' ? `${m.start} → ${m.end}` : `couleur ${COLORS[m.c]}`;
    b.innerHTML = `<span class="glabel">${avatarHTML(g.players[grp.owner])} ${label}</span>`;
    const row = document.createElement('div');
    row.className = 'cards';
    for (const it of grp.items) {
      const ce = cardEl(it.card, { tag: 'span', mini: true, as: it.card.k === 'j' ? it.n : null });
      if (S.flash === it.card.id) ce.classList.add('flash');
      row.appendChild(ce);
    }
    if (grp.items.length > 5) row.classList.add('many');
    b.appendChild(row);
    b.addEventListener('click', () => onGroupTap(grp));
    box.appendChild(b);
  }
}

function renderGoal() {
  const g = S.g;
  const p = me();
  const box = $('goal');
  box.textContent = '';
  box.classList.remove('done', 'laid');
  if (p.laid) {
    box.classList.add('laid');
    box.textContent = '✅ Objectif posé ! Ajoute tes cartes aux groupes, puis jette.';
    return;
  }
  const fill = objectiveFill(p.hand, objectiveOf(g, p).groups);
  const full = fill.every((f) => f.cards.length >= f.size);
  box.classList.toggle('done', full);
  box.appendChild(goalEl(fill));
  if (full) { const ok = document.createElement('b'); ok.className = 'gok'; ok.textContent = '✅'; box.appendChild(ok); }
}

function showGoalCard(then) {
  const g = S.g;
  S.afterGoal = then;
  if (S.fast || S.noGoalCard) { S.afterGoal = null; then(); return; }
  const fill = objectiveFill([], objectiveOf(g, me()).groups);
  const pic = $('goalcard-pic');
  pic.textContent = '';
  pic.appendChild(goalEl(fill, { big: true }));
  $('goalcard').classList.remove('hidden');
}

function closeGoalCard() {
  $('goalcard').classList.add('hidden');
  const f = S.afterGoal;
  S.afterGoal = null;
  if (f) f();
}

function renderTop() {
  const g = S.g;
  const p = me();
  const obj = objectiveOf(g, p);
  $('lvl').textContent = `Niveau ${Math.min(p.level + 1, g.levelCount)} sur ${g.levelCount} · manche ${g.round}`;
  $('objtxt').textContent = obj.title;
  const chips = $('chips');
  chips.textContent = '';
  g.players.forEach((b, i) => {
    if (i === S.viewer) return;
    const c = document.createElement('span');
    c.className = 'chip' + (g.status === 'playing' && g.current === i ? ' active' : '');
    c.innerHTML = `${avatarHTML(b)} <span class="cn">${b.name}</span> 🃏${b.hand.length} · niv ${Math.min(b.level + 1, g.levelCount)}${b.laid ? ' ✅' : ''}${b.skip ? ' ⏭️' : ''}`;
    chips.appendChild(c);
  });
}

function renderButtons() {
  const g = S.g;
  const p = me();
  const t = humanTurn();
  $('btn-draw').disabled = !(t && g.phase === 'draw');
  $('btn-draw').lastElementChild.textContent = `Pioche ${g.drawPile.length}`;
  renderDiscards();
  const lay = $('btn-lay');
  lay.disabled = !(t && g.phase === 'play');
  lay.lastElementChild.textContent = p.laid ? 'Ajouter' : 'Poser';
  lay.firstChild.textContent = p.laid ? '➕' : '✅';
  $('btn-throw').disabled = !(t && g.phase === 'play');
  const selSkip = S.sel.size === 1 && me().hand.some((c) => S.sel.has(c.id) && c.k === 's') && p.hand.length > 1;
  $('btn-throw').lastElementChild.textContent = selSkip ? 'Faire passer' : 'Jeter';
  $('btn-throw').firstChild.textContent = selSkip ? '⏭️' : '🗑️';
  $('btn-help').classList.toggle('hidden', g.pal.help === 'none');
  $('btn-help').disabled = !t;
  // aide visuelle : bouton qui pulse quand c'est le bon moment
  $('btn-lay').classList.toggle('pulse', t && g.phase === 'play' && !p.laid && !!findLayout(p.hand, objectiveOf(g, p).groups));
  $('btn-sort-n').classList.toggle('on', S.sort === 'number');
  $('btn-sort-c').classList.toggle('on', S.sort === 'colour');
}

// Défausses dont la carte du dessus aide le joueur (indices de joueurs).
function helpfulDiscards() {
  const g = S.g;
  const p = me();
  const specs = objectiveOf(g, p).groups;
  return takeableDiscards(g).filter((j) => {
    const top = topDiscard(g, j);
    if (p.laid) return g.groups.some((x) => canAddToGroup(x, top) || (g.jokerSwap && canSwapJoker(x, top) >= 0));
    return usefulIds([...p.hand, top], specs).has(top.id);
  });
}
const wantsDiscard = () => helpfulDiscards().length > 0;

// Une défausse par joueur : petit bouton avec l'avatar et la carte du dessus.
function renderDiscards() {
  const g = S.g;
  const box = $('discards');
  box.textContent = '';
  const can = humanTurn() && g.phase === 'draw';
  const ok = new Set(takeableDiscards(g));
  const help = can && helpActive() ? new Set(helpfulDiscards()) : new Set();
  g.players.forEach((pl, j) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'dis' + (help.has(j) ? ' pulse' : '');
    b.disabled = !(can && ok.has(j));
    b.setAttribute('aria-label', j === S.viewer && !multi() ? 'Ma défausse' : `Défausse de ${pl.name}`);
    const top = topDiscard(g, j);
    const av = document.createElement('span');
    av.className = 'dis-av';
    av.innerHTML = avatarHTML(pl);
    b.appendChild(av);
    if (top) b.appendChild(cardEl(top, { tag: 'span', mini: true }));
    else { const e = document.createElement('span'); e.className = 'dis-empty'; b.appendChild(e); }
    b.addEventListener('click', () => onTake(j));
    box.appendChild(b);
  });
}

function refresh() {
  const g = S.g;
  for (const id of [...S.sel]) if (!handVisible() || !me().hand.some((c) => c.id === id)) S.sel.delete(id);
  renderTop();
  renderGoal();
  renderGroups();
  renderButtons();
  renderHand();
  document.getElementById('app').classList.toggle('cloak', !handVisible());
  S.view.sync(g, S.viewer);
}

function toggleSel(id) {
  if (!humanTurn()) return;
  if (S.sel.has(id)) S.sel.delete(id); else S.sel.add(id);
  sfx.pick();
  S.suggest = null;
  refresh();
}

/* ---------- événements ---------- */
function describe(ev) {
  const g = S.g;
  const pl = g.players[ev.p];
  const who = pl ? `${pl.emoji} ${pl.name}` : '';
  const human = pl && !pl.isBot;
  const solo = human && !multi(); // seul humain : on lui parle directement
  switch (ev.t) {
    case 'draw': return human ? '' : ev.from === 'pile' ? `${who} pioche` : ev.fromPlayer === ev.p ? `${who} reprend sa carte` : `${who} prend ${cardName(ev.card)} chez ${g.players[ev.fromPlayer].emoji}`;
    case 'lay': return human ? '' : `${who} pose son objectif ! 🎉`;
    case 'add': return human ? '' : `${who} ajoute une carte`;
    case 'swap': return solo ? 'Tu récupères le joker ! 🃏' : `${who} récupère un joker 🃏`;
    case 'discard': return human ? '' : `${who} jette ${cardName(ev.card)}${ev.card.k === 's' ? ' ⏭' : ''}`;
    case 'skipplay': return human ? '' : `${who} fait passer ${g.players[ev.target].emoji} ${g.players[ev.target].name} ⏭️`;
    case 'skip': return solo ? '⏭ Tu sautes ton tour !' : `⏭ ${pl.name} saute son tour`;
    case 'reshuffle': return 'La pioche est remélangée';
    default: return '';
  }
}

async function consume(awaitFlights) {
  const evs = S.g.events.splice(0);
  const ps = [];
  let mySkip = false;
  for (const ev of evs) {
    if (ev.t === 'skip' && !S.g.players[ev.p].isBot) mySkip = true;
    if (ev.t === 'skipplay') sfx.add();
    if (ev.t === 'draw') {
      ps.push(S.view.fly({ from: ev.from === 'pile' ? 'pile' : { disc: ev.fromPlayer }, to: { seat: ev.p }, card: ev.from === 'discard' ? ev.card : null, ms: flyMs(ev.p) }));
      sfx.draw();
    } else if (ev.t === 'discard') {
      ps.push(S.view.fly({ from: { seat: ev.p }, to: { disc: ev.p }, card: ev.card, ms: flyMs(ev.p) }));
      sfx.discard();
    } else if (ev.t === 'lay') sfx.lay();
    else if (ev.t === 'add') sfx.add();
    else if (ev.t === 'swap') {
      sfx.swap();
      S.flash = ev.cardId;
      setTimeout(() => { S.flash = null; if (S.g) renderGroups(); }, S.fast ? 0 : botMs(1000, ev.p));
    }
    const d = describe(ev);
    if (d) setMsg(d);
  }
  if (awaitFlights) await Promise.all(ps);
  return mySkip;
}

/* ---------- actions du joueur ---------- */
async function afterHuman() {
  await consume(false);
  flow();
}

// Décide la suite après un changement d'état : fin de manche, passage d'appareil, objectif, robots.
function settle() {
  const g = S.g;
  const humans = g.players.map((p, i) => (p.isBot ? -1 : i)).filter((i) => i >= 0);
  if (humans.length < 2) { S.viewer = humans[0]; S.gateFor = null; S.cloak = false; S.fresh = false; return; }
  if (g.status !== 'playing') return;
  if (g.players[g.current].isBot) { S.cloak = true; return; }
  if (g.current !== S.viewer || S.fresh) { S.viewer = g.current; S.gateFor = g.current; S.cloak = true; S.fresh = false; return; }
  S.cloak = false;
}

function showGate() {
  const p = S.g.players[S.gateFor];
  $('gate-av').innerHTML = avatarHTML(p, 'bigav');
  $('gate-name').textContent = p.name;
  $('gate').classList.remove('hidden');
}

function onReady() {
  if (S.gateFor == null) return false;
  S.gateFor = null;
  S.cloak = false;
  $('gate').classList.add('hidden');
  flow();
  return true;
}

// Fenêtre « Ton objectif » : une fois par joueur humain et par manche.
function maybeGoalCard(then) {
  const g = S.g;
  const ok = !S.fast && !S.noGoalCard && g.status === 'playing' && !S.goalSeen.has(S.viewer) && (!multi() || humanTurn());
  if (!ok) { then(); return; }
  S.goalSeen.add(S.viewer);
  speakObjective();
  showGoalCard(then);
}

function flow() {
  const g = S.g;
  settle();
  refresh();
  if (g.status !== 'playing') { showRoundEnd(); return; }
  if (S.gateFor != null) { setMsg(''); showGate(); return; }
  setMsg(turnHint());
  maybeGoalCard(() => {
    if (g.players[g.current].isBot) S.botsPromise = runBots();
  });
}

function onDraw() {
  if (!humanTurn() || S.g.phase !== 'draw') return false;
  const r = drawFromPile(S.g);
  if (!r.ok) return false;
  S.newId = r.card ? r.card.id : null;
  S.suggest = null;
  setMsg(turnHint());
  afterHuman();
  return true;
}

function onTake(from) {
  if (!humanTurn() || S.g.phase !== 'draw') return false;
  const r = takeDiscard(S.g, typeof from === 'number' ? from : (S.g.players.length - 1));
  if (!r.ok) { setMsg('Cette carte ne peut pas être prise.', true); sfx.oops(); return false; }
  S.newId = r.card.id;
  S.suggest = null;
  afterHuman().then(() => setMsg(turnHint()));
  return true;
}

function onLay() {
  const g = S.g;
  if (!humanTurn() || g.phase !== 'play') return false;
  const p = me();
  if (p.laid) return onAddSelected();
  const need = objectiveTotal(objectiveOf(g, p));
  if (S.sel.size === 0) { setMsg(`Choisis les ${need} cartes de ton objectif, puis appuie sur Poser.`, true); sfx.oops(); return false; }
  const r = layDown(g, [...S.sel]);
  if (!r.ok) {
    setMsg(r.reason === 'count' ? `Il faut ${r.need} cartes pour ce niveau : tu en as choisi ${r.have}.` : 'Pas tout à fait… regarde bien l\'objectif, tu peux réessayer !', true);
    sfx.oops();
    return false;
  }
  S.sel.clear();
  S.suggest = null;
  setMsg('Bravo, objectif posé ! Ajoute des cartes ou jette-en une.');
  afterHuman().then(() => setMsg(S.g.status === 'playing' ? 'Bravo, objectif posé ! Ajoute des cartes ou jette-en une.' : ''));
  return true;
}

function doAdd(cardId, groupId) {
  const r = addToGroup(S.g, cardId, groupId);
  if (r.ok) S.sel.delete(cardId);
  return r.ok;
}

// Échange (préféré) ou ajout d'une carte à un groupe ; renvoie 'swap', 'add' ou null.
function placeCard(c, grp) {
  const g = S.g;
  if (g.status !== 'playing') return null;
  if (g.jokerSwap && canSwapJoker(grp, c) >= 0) {
    const r = swapJoker(g, c.id, grp.id);
    if (r.ok) { S.sel.delete(c.id); return 'swap'; }
  }
  return canAddToGroup(grp, c) && doAdd(c.id, grp.id) ? 'add' : null;
}

function doSwap(cardId, groupId) {
  const r = swapJoker(S.g, cardId, groupId);
  if (r.ok) S.sel.delete(cardId);
  return r.ok;
}

function onAddSelected() {
  const p = me();
  const cards = sortCards(p.hand.filter((c) => S.sel.has(c.id)), 'number');
  if (!cards.length) { setMsg('Choisis une carte, puis appuie sur Ajouter.', true); return false; }
  let added = 0;
  for (const c of cards) {
    if (S.g.status !== 'playing') break;
    const t = swapTargets(S.g, c)[0] || addTargets(S.g, c)[0];
    if (t && placeCard(c, t)) added++;
  }
  if (!added) { setMsg('Cette carte ne va dans aucun groupe pour l\'instant.', true); sfx.oops(); return false; }
  afterHuman();
  return true;
}

function onGroupTap(grp) {
  const g = S.g;
  if (!humanTurn()) return;
  if (g.phase !== 'play') { setMsg('Commence par prendre une carte.'); return; }
  if (!me().laid) { setMsg('Pose d\'abord ton objectif pour ajouter des cartes.'); return; }
  const cards = me().hand.filter((c) => S.sel.has(c.id));
  if (!cards.length) { setMsg('Choisis une carte, puis touche le groupe.'); return; }
  let added = 0;
  for (const c of cards) if (placeCard(c, grp)) added++;
  if (!added) { setMsg('Cette carte ne va pas dans ce groupe.', true); sfx.oops(); return; }
  afterHuman();
}

// Carte Passe sélectionnée : choisir l'adversaire visé (ou le seul possible).
function onSkipSelected(card) {
  const targets = skipTargets(S.g);
  if (me().hand.length === 1) return false; // dernière carte : on la jette, effet ignoré
  if (!targets.length) { setMsg('Tout le monde a déjà une Passe ! Tu peux la jeter.', true); sfx.oops(); return true; }
  if (targets.length === 1) { doSkip(card.id, targets[0]); return true; }
  const box = $('skippick-list');
  box.textContent = '';
  for (const j of targets) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'avbtn';
    b.setAttribute('aria-label', S.g.players[j].name);
    b.innerHTML = avatarHTML(S.g.players[j]);
    b.addEventListener('click', () => { $('skippick').classList.add('hidden'); doSkip(card.id, j); });
    box.appendChild(b);
  }
  $('skippick').classList.remove('hidden');
  return true;
}

function doSkip(cardId, target) {
  const r = playSkip(S.g, cardId, target);
  if (!r.ok) { setMsg('Impossible de faire passer ce joueur.', true); sfx.oops(); return false; }
  S.sel.clear();
  S.suggest = null;
  S.helpOn = false;
  afterHuman();
  return true;
}

function onThrow() {
  if (!humanTurn() || S.g.phase !== 'play') return false;
  if (S.sel.size !== 1) { setMsg(S.sel.size ? 'Une seule carte à jeter !' : 'Choisis la carte à jeter.', true); return false; }
  const id = [...S.sel][0];
  const sel = me().hand.find((c) => c.id === id);
  if (sel && sel.k === 's' && onSkipSelected(sel)) return true;
  const r = discardCard(S.g, id);
  if (!r.ok) return false;
  S.sel.clear();
  S.suggest = null;
  S.helpOn = false;
  afterHuman();
  return true;
}

function onHelp() {
  const g = S.g;
  if (!humanTurn() || g.pal.help === 'none') return;
  S.helpOn = true;
  const p = me();
  const specs = objectiveOf(g, p).groups;
  if (g.phase === 'draw') {
    refresh();
    setMsg(wantsDiscard() ? 'Une carte de défausse t\'aide : prends-la !' : 'Les cartes entourées t\'aident. Pioche une carte.');
    return;
  }
  if (!p.laid) {
    const lay = findLayout(p.hand, specs);
    if (lay) {
      S.sel = new Set(lay.flat().map((c) => c.id));
      refresh();
      setMsg('Tu peux poser ! Appuie sur ✅ Poser.');
      return;
    }
    S.suggest = bestDiscard(p.hand, specs, () => 0).id;
    S.sel.clear();
    refresh();
    setMsg('Garde les cartes entourées. Tu peux jeter la carte en pointillés.');
    return;
  }
  const stuck = p.hand.find((c) => !g.groups.some((x) => canAddToGroup(x, c)));
  S.suggest = stuck ? stuck.id : null;
  refresh();
  setMsg(stuck ? 'Les cartes entourées vont dans un groupe. Jette celle en pointillés.' : 'Toutes tes cartes vont dans un groupe !');
}

/* ---------- bots ---------- */
async function runBots() {
  const tk = ++S.token;
  const g = S.g;
  while (g.status === 'playing' && g.players[g.current].isBot && tk === S.token) {
    refresh();
    setMsg(turnHint());
    await wait(botMs(550, g.current));
    if (tk !== S.token) return;
    const a = chooseAction(g);
    const r = applyAction(g, a);
    if (!r.ok) { console.error('action de bot refusée', a, r); break; }
    const mySkip = await consume(true);
    refresh();
    await wait(Math.round(350 * BOT_PACE));
    if (mySkip) await wait(Math.round(1300 * BOT_PACE));
  }
  if (tk !== S.token) return;
  if (g.status === 'playing') sfx.turn();
  flow();
}

/* ---------- fin de manche / de partie ---------- */
function confetti() {
  const box = $('confetti');
  const cols = ['#e5484d', '#2f7de1', '#f5b50a', '#2fa84f', '#a35cf0'];
  for (let i = 0; i < 50; i++) {
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + '%';
    p.style.background = cols[i % cols.length];
    p.style.animationDelay = Math.random() * 0.8 + 's';
    box.appendChild(p);
  }
  setTimeout(() => { box.textContent = ''; }, 4000);
}

function showRoundEnd() {
  const g = S.g;
  const r = g.roundResult;
  setMsg('');
  if (g.status === 'over') { showEnd(); return; }
  const group = multi();
  const mine = group ? Math.max(0, ...r.gains) : r.gains[S.viewer];
  const adv = group ? mine > 0 : r.advanced.includes(S.viewer);
  const outP = r.out === null ? null : g.players[r.out];
  $('round-emoji').textContent = mine ? '🎉' : '💪';
  if (group) {
    $('round-title').textContent = outP ? `Bravo ${outP.name} : +${r.gains[r.out]} niveau${r.gains[r.out] > 1 ? 'x' : ''} ! ⭐` : 'Bien joué tout le monde !';
  } else {
    $('round-title').textContent = mine === 2 ? 'Bravo, tu as fini : +2 niveaux ! ⭐⭐' : mine ? 'Bravo, tu montes d\'un niveau ! ⭐' : 'On recommence ce niveau, tu y es presque !';
  }
  $('round-sub').textContent = r.out === null ? 'Personne n\'a fini ses cartes.' : (!group && r.out === S.viewer) ? 'Tu as fini tes cartes !' : `${outP.emoji} ${outP.name} a fini ses cartes.`;
  const list = $('round-list');
  list.textContent = '';
  g.players.forEach((p, i) => {
    const li = document.createElement('li');
    if (!group && i === S.viewer) li.className = 'me';
    const up = r.advanced.includes(i);
    li.innerHTML = `<span>${avatarHTML(p)} ${p.name}</span><span>${up ? `${r.gains[i] === 2 ? '+2 ⭐⭐' : '+1 ⭐'} niveau ${r.prevLevels[i] + 1} ✅ → ${Math.min(p.level + 1, g.levelCount)}` : `niveau ${r.prevLevels[i] + 1} (encore)`}</span>`;
    list.appendChild(li);
  });
  if (adv) sfx.lay(); else sfx.oops();
  $('round').classList.remove('hidden');
}

function showEnd() {
  const g = S.g;
  const group = multi();
  const humanWon = g.winners.some((i) => !g.players[i].isBot);
  const won = group ? humanWon : g.winners.includes(S.viewer);
  const w = g.players[g.winners[0]];
  $('end-emoji').innerHTML = won ? '🏆' : avatarHTML(w, 'bigav');
  $('end-title').textContent = group ? `Bravo ${w.name} !` : won ? 'Bravo, tu as gagné !' : `Bravo ${w.name} ! Tu as bien joué !`;
  const prog = Math.min(1, me().level / g.levelCount);
  $('end-stars').textContent = won || group ? '⭐⭐⭐' : prog > 0.5 ? '⭐⭐' : '⭐';
  const list = $('end-list');
  list.textContent = '';
  g.players.forEach((p, i) => {
    const li = document.createElement('li');
    if (!group && i === S.viewer) li.className = 'me';
    li.innerHTML = `<span>${g.winners.includes(i) ? '🏆 ' : ''}${avatarHTML(p)} ${p.name}</span><span>niveau ${Math.min(p.level, g.levelCount)} / ${g.levelCount}</span>`;
    list.appendChild(li);
  });
  $('end').classList.remove('hidden');
  if (won) { confetti(); sfx.win(); } else sfx.lay();
}

/* ---------- démarrage ---------- */
function speakObjective() {
  const g = S.g;
  const p = me();
  speak(`Niveau ${Math.min(p.level + 1, g.levelCount)}. ${objectiveOf(g, p).speech}`);
}

function seatsFor(o) {
  const list = (o.seats || S.opts.seats).slice(0, o.seats ? 4 : Math.max(2, Math.min(4, +S.opts.count || 2)));
  return list.map((x) => ({ type: x.type === 'bot' ? 'bot' : 'human', name: x.name, avatar: x.avatar }));
}

function resetRound() {
  S.sel.clear();
  S.helpOn = false;
  S.suggest = null;
  S.newId = null;
  S.goalSeen = new Set();
  S.cloak = false;
  S.gateFor = null;
  S.fresh = true; // premier tour de la manche : en jeu à plusieurs, on passe toujours par « Passe l'appareil »
  S.g.events.length = 0;
  $('gate').classList.add('hidden');
}

function startGame(o = {}) {
  S.token++;
  const opts = { ...S.opts, ...o };
  const base = { seed: opts.seed ?? ((Date.now() ^ (Math.random() * 1e9)) & 0x7fffffff), palier: +opts.palier, difficulty: opts.difficulty, mode: opts.mode, jokerSwap: opts.jokerSwap === true || opts.jokerSwap === 'true', shortRounds: 5 };
  if (o.seats || o.bots == null) base.seats = seatsFor(o);
  else { base.bots = +o.bots; base.avatar = +opts.avatar || 1; }
  S.g = createGame(base);
  S.viewer = Math.max(0, S.g.players.findIndex((p) => !p.isBot));
  resetRound();
  S.view.setPlayers(S.g.players);
  for (const id of ['setup', 'round', 'end', 'rules', 'goalcard', 'skippick']) $(id).classList.add('hidden');
  S.noGoalCard = o.goalCard === false;
  flow();
  S.view.resize(); // recadrage une fois #chips rempli (bande réservée en haut)
}

function continueRound() {
  nextRound(S.g);
  S.token++;
  resetRound();
  $('round').classList.add('hidden');
  flow();
}

function renderSeats() {
  const box = $('seats');
  if (!box) return;
  const count = Math.max(2, Math.min(4, +S.opts.count || 2));
  document.querySelectorAll('.seg[data-key="count"] button').forEach((b) => b.classList.toggle('on', +b.dataset.v === count));
  box.textContent = '';
  const seats = S.opts.seats;
  for (let i = 0; i < count; i++) {
    const seat = seats[i];
    const av = AVATARS.find((a) => a.id === seat.avatar) || AVATARS[0];
    const row = document.createElement('div');
    row.className = 'seat';
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'avbtn on';
    b.setAttribute('aria-label', `Avatar du joueur ${i + 1} : changer`);
    b.innerHTML = avatarHTML({ avatar: av.id, emoji: av.emoji });
    b.addEventListener('click', () => {
      // prochain avatar libre (jamais deux joueurs avec le même)
      const used = new Set(seats.slice(0, count).map((x, k) => (k === i ? -1 : x.avatar)));
      for (let k = 1; k <= AVATARS.length; k++) {
        const cand = AVATARS[(AVATARS.findIndex((a) => a.id === seat.avatar) + k) % AVATARS.length];
        if (!used.has(cand.id)) { seat.avatar = cand.id; break; }
      }
      if (i === 0) saveAvatar(seat.avatar);
      saveSeats(); sfx.pick(); renderSeats();
    });
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.maxLength = 10;
    inp.value = seat.name;
    inp.placeholder = seat.type === 'bot' ? av.name : `Joueur ${i + 1}`;
    inp.setAttribute('aria-label', `Prénom du joueur ${i + 1}`);
    inp.addEventListener('input', () => { seat.name = inp.value.slice(0, 10); saveSeats(); });
    const k = document.createElement('button');
    k.type = 'button';
    k.className = 'kind ' + seat.type;
    k.textContent = seat.type === 'bot' ? '🤖 Robot' : '🧑 Humain';
    k.setAttribute('aria-label', `Joueur ${i + 1} : ${seat.type === 'bot' ? 'robot' : 'humain'}`);
    if (i === 0) k.disabled = true; // le joueur 1 est toujours humain
    else k.addEventListener('click', () => { seat.type = seat.type === 'bot' ? 'human' : 'bot'; saveSeats(); sfx.pick(); renderSeats(); });
    row.append(b, inp, k);
    box.appendChild(row);
  }
}

function init() {
  S.view = new TableView($('c'), $('stage'));
  document.querySelectorAll('.seg').forEach((seg) => {
    seg.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      seg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
      S.opts[seg.dataset.key] = b.dataset.v;
      if (seg.dataset.key === 'count') { saveSeats(); renderSeats(); }
      sfx.pick();
    });
  });
  renderSeats();
  preloadAvatars();
  onAvatarLoaded(() => { renderSeats(); if (S.g) refresh(); });
  const hero = new Image();
  hero.alt = '';
  hero.onload = () => { const box = $('hero'); box.appendChild(hero); box.classList.remove('hidden'); };
  hero.onerror = () => {};
  hero.src = './assets/img/titre.jpg';
  $('goal').addEventListener('click', () => S.g && speakObjective());
  $('btn-goal-voice').addEventListener('click', () => S.g && speakObjective());
  $('btn-goal-ok').addEventListener('click', closeGoalCard);
  $('btn-play').addEventListener('click', () => { saveSeats(); startGame(); });
  $('btn-ready').addEventListener('click', onReady);
  $('btn-draw').addEventListener('click', onDraw);
  $('btn-lay').addEventListener('click', onLay);
  $('btn-throw').addEventListener('click', onThrow);
  $('btn-help').addEventListener('click', onHelp);
  $('btn-sort-n').addEventListener('click', () => { S.sort = 'number'; if (S.g) refresh(); });
  $('btn-sort-c').addEventListener('click', () => { S.sort = 'colour'; if (S.g) refresh(); });
  $('btn-voice').addEventListener('click', () => S.g && speakObjective());
  $('btn-rules').addEventListener('click', () => $('rules').classList.remove('hidden'));
  $('btn-rules-ok').addEventListener('click', () => $('rules').classList.add('hidden'));
  $('btn-rules-voice').addEventListener('click', () => speak(RULES_SPEECH));
  $('btn-menu').addEventListener('click', () => { S.token++; $('setup').classList.remove('hidden'); });
  $('btn-skip-cancel').addEventListener('click', () => $('skippick').classList.add('hidden'));
  $('btn-next').addEventListener('click', continueRound);
  $('btn-again').addEventListener('click', () => startGame());
  $('btn-home').addEventListener('click', () => { $('end').classList.add('hidden'); $('setup').classList.remove('hidden'); });
  $('c').addEventListener('pointerdown', (e) => {
    if (!S.g || !humanTurn() || S.g.phase !== 'draw') return;
    const hit = S.view.pickPile(e.clientX, e.clientY);
    if (hit === 'pile') onDraw(); else if (hit && hit.disc !== undefined) onTake(hit.disc);
  });
  // partie en arrière-plan pour que la table ne soit pas vide derrière le menu
  S.g = createGame({ seed: 7, palier: 1, bots: 1, avatar: +S.opts.avatar });
  S.viewer = 0;
  S.g.events.length = 0;
  S.view.setPlayers(S.g.players);
  refresh();
  setMsg('');
}

init();

/* ---------- crochet de débogage ---------- */
window.__level8 = {
  S,
  get g() { return S.g; },
  set fast(v) { S.fast = !!v; },
  start: (o) => startGame(o),
  jump(n) {
    S.token++;
    setLevel(S.g, S.viewer, n);
    S.g.events.length = 0;
    S.sel.clear();
    for (const id of ['setup', 'round', 'end']) $(id).classList.add('hidden');
    flow();
  },
  draw: onDraw,
  take: (from) => onTake(from),
  lay(ids) { S.sel = new Set(ids); refresh(); return onLay(); },
  swap(cardId, groupId) { const ok = doSwap(cardId, groupId); afterHuman(); return ok; },
  add(cardId, groupId) { const ok = doAdd(cardId, groupId); afterHuman(); return ok; },
  skip(cardId, target) { const ok = doSkip(cardId, target); return ok; },
  discard(id) { S.sel = new Set([id]); return onThrow(); },
  select(ids) { S.sel = new Set(ids); refresh(); },
  sort(mode) { S.sort = mode; refresh(); },
  help: onHelp,
  objFill() { return objectiveFill(me().hand, objectiveOf(S.g, me()).groups).map((f) => ({ t: f.spec.t, size: f.size, have: f.cards.length, ids: f.cards.map((c) => c.id), full: f.cards.length >= f.size })); },
  closeGoalCard,
  give(list) { forceHand(S.g, S.viewer, list); refresh(); return me().hand; },
  // passage d'appareil : appuie sur « Je suis prêt » (renvoie le prénom du joueur qui prend la main, ou null)
  ready() { const who = S.gateFor; return onReady() ? S.g.players[who].name : null; },
  get viewer() { return S.viewer; },
  // mesures de la table 3D en px CSS : {stage, pilePx, discPx, botHandPx, pitch, dist, cz}
  metrics() { return S.view.metrics(); },
  get gate() { return S.gateFor; },
  speakObjective,
  // joue le tour complet du joueur avec le planificateur des bots, puis laisse les bots jouer
  async auto() {
    let guard = 0;
    if (S.gateFor != null) onReady();
    while (humanTurn() && guard++ < 30) {
      const a = chooseAction(S.g);
      if (a.type === 'draw') onDraw();
      else if (a.type === 'takeDiscard') onTake(a.from);
      else if (a.type === 'lay') { S.sel = new Set(a.ids); onLay(); }
      else if (a.type === 'add') { doAdd(a.cardId, a.groupId); await afterHuman(); }
      else if (a.type === 'swap') { doSwap(a.cardId, a.groupId); await afterHuman(); }
      else if (a.type === 'skip') doSkip(a.cardId, a.target);
      else if (a.type === 'discard') { S.sel = new Set([a.cardId]); onThrow(); }
      await wait(0);
    }
    await S.botsPromise;
    return { status: S.g.status, current: S.g.current };
  },
  next: continueRound,
};
