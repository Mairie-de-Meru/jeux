// Level 8 : interface, tour du joueur, tours des bots, crochet de débogage.
import { TableView } from './render/table.js';
import { createGame, objectiveOf, drawFromPile, takeDiscard, layDown, addToGroup, addTargets, swapTargets, swapJoker, discardCard, nextRound, setLevel, forceHand, takeableDiscards, topDiscard, playSkip, skipTargets, applyAction } from './logic/game.js';
import { chooseAction } from './logic/bot.js';
import { findLayout, sortCards, canAddToGroup, canSwapJoker, COLORS } from './logic/cards.js';
import { usefulIds, bestDiscard, objectiveFill } from './logic/planner.js';
import { objectiveTotal, RULES_SPEECH } from './logic/levels.js';
import { cardEl, cardName } from './ui/cardview.js';
import { goalEl } from './ui/goalview.js';
import { AVATARS, botAvatars } from './logic/avatars.js';
import { avatarHTML, preloadAvatars, onAvatarLoaded } from './avatarimg.js';
import { speak } from './speech.js';
import { sfx } from './audio.js';

const $ = (id) => document.getElementById(id);
const S = { g: null, view: null, sel: new Set(), sort: 'number', helpOn: false, fast: false, newId: null, flash: null, suggest: null, token: 0, botsPromise: Promise.resolve(), opts: { palier: 1, bots: 1, difficulty: 'facile', mode: 'full', jokerSwap: 'false', avatar: loadAvatar() } };

function loadAvatar() {
  try { const v = +localStorage.getItem('level8.avatar'); if (v >= 1 && v <= AVATARS.length) return v; } catch (e) { /* silencieux */ }
  return 1;
}
function saveAvatar(v) { try { localStorage.setItem('level8.avatar', String(v)); } catch (e) { /* silencieux */ } }

const wait = (ms) => new Promise((r) => setTimeout(r, S.fast ? 0 : ms));
// Rythme des robots : multiplicateur des délais/animations des robots (pas du joueur 0).
const BOT_PACE = 1.6;
const botMs = (ms, p) => (p !== 0 ? Math.round(ms * BOT_PACE) : ms);
const flyMs = (p = 0) => (S.fast ? 0 : botMs(450, p));
const me = () => S.g.players[0];
const humanTurn = () => S.g.status === 'playing' && S.g.current === 0;

function setMsg(text, shake = false) {
  const m = $('msg');
  m.textContent = text;
  m.classList.toggle('hidden', !text);
  m.classList.remove('shake');
  if (shake) { void m.offsetWidth; m.classList.add('shake'); }
}

function turnHint() {
  const g = S.g;
  if (g.status !== 'playing') return '';
  if (g.current !== 0) return `${g.players[g.current].emoji} ${g.players[g.current].name} joue…`;
  const short = window.matchMedia && window.matchMedia('(max-width: 500px) and (orientation: portrait)').matches;
  if (g.phase === 'draw') return short ? 'À toi ! Pioche une carte.' : 'À toi ! Pioche, ou prends une carte sur une défausse.';
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
  // largeur des cartes pour tenir sur une ligne en éventail (portrait étroit, voir style.css)
  const W = ($('handwrap').clientWidth || window.innerWidth) - 14;
  hand.style.setProperty('--hcw', Math.max(30, Math.min(46, Math.floor(W / (0.84 * Math.max(p.hand.length, 1) + 0.16)))) + 'px');
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
  g.players.slice(1).forEach((b, i) => {
    const c = document.createElement('span');
    c.className = 'chip' + (g.status === 'playing' && g.current === i + 1 ? ' active' : '');
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
    b.setAttribute('aria-label', j === 0 ? 'Ma défausse' : `Défausse de ${pl.name}`);
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
  for (const id of [...S.sel]) if (!me().hand.some((c) => c.id === id)) S.sel.delete(id);
  renderTop();
  renderGoal();
  renderGroups();
  renderButtons();
  renderHand();
  S.view.sync(g);
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
  switch (ev.t) {
    case 'draw': return ev.p === 0 ? '' : ev.from === 'pile' ? `${who} pioche` : ev.fromPlayer === ev.p ? `${who} reprend sa carte` : `${who} prend ${cardName(ev.card)} chez ${g.players[ev.fromPlayer].emoji}`;
    case 'lay': return ev.p === 0 ? '' : `${who} pose son objectif ! 🎉`;
    case 'add': return ev.p === 0 ? '' : `${who} ajoute une carte`;
    case 'swap': return ev.p === 0 ? 'Tu récupères le joker ! 🃏' : `${who} récupère un joker 🃏`;
    case 'discard': return ev.p === 0 ? '' : `${who} jette ${cardName(ev.card)}${ev.card.k === 's' ? ' ⏭' : ''}`;
    case 'skipplay': return ev.p === 0 ? '' : `${who} fait passer ${g.players[ev.target].emoji} ${g.players[ev.target].name} ⏭️`;
    case 'skip': return ev.p === 0 ? '⏭ Tu sautes ton tour !' : `⏭ ${pl.name} saute son tour`;
    case 'reshuffle': return 'La pioche est remélangée';
    default: return '';
  }
}

async function consume(awaitFlights) {
  const evs = S.g.events.splice(0);
  const ps = [];
  let mySkip = false;
  for (const ev of evs) {
    if (ev.t === 'skip' && ev.p === 0) mySkip = true;
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
  refresh();
  if (S.g.status !== 'playing') { showRoundEnd(); return; }
  if (S.g.current !== 0) { S.botsPromise = runBots(); return; }
  setMsg(S.g.events.length ? '' : turnHint());
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
  while (g.status === 'playing' && g.current !== 0 && tk === S.token) {
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
  refresh();
  if (g.status !== 'playing') { showRoundEnd(); return; }
  sfx.turn();
  setMsg(turnHint());
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
  const adv = r.advanced.includes(0);
  const mine = r.gains[0];
  $('round-emoji').textContent = mine ? '🎉' : '💪';
  $('round-title').textContent = mine === 2 ? 'Bravo, tu as fini : +2 niveaux ! ⭐⭐' : mine ? 'Bravo, tu montes d\'un niveau ! ⭐' : 'On recommence ce niveau, tu y es presque !';
  $('round-sub').textContent = r.out === null ? 'Personne n\'a fini ses cartes.' : r.out === 0 ? 'Tu as fini tes cartes !' : `${g.players[r.out].emoji} ${g.players[r.out].name} a fini ses cartes.`;
  const list = $('round-list');
  list.textContent = '';
  g.players.forEach((p, i) => {
    const li = document.createElement('li');
    if (i === 0) li.className = 'me';
    const up = r.advanced.includes(i);
    li.innerHTML = `<span>${avatarHTML(p)} ${p.name}</span><span>${up ? `${r.gains[i] === 2 ? '+2 ⭐⭐' : '+1 ⭐'} niveau ${r.prevLevels[i] + 1} ✅ → ${Math.min(p.level + 1, g.levelCount)}` : `niveau ${r.prevLevels[i] + 1} (encore)`}</span>`;
    list.appendChild(li);
  });
  if (adv) sfx.lay(); else sfx.oops();
  $('round').classList.remove('hidden');
}

function showEnd() {
  const g = S.g;
  const won = g.winners.includes(0);
  $('end-emoji').innerHTML = won ? '🏆' : avatarHTML(g.players[g.winners[0]], 'bigav');
  $('end-title').textContent = won ? 'Bravo, tu as gagné !' : `Bravo ${g.players[g.winners[0]].name} ! Tu as bien joué !`;
  const prog = Math.min(1, me().level / g.levelCount);
  $('end-stars').textContent = won ? '⭐⭐⭐' : prog > 0.5 ? '⭐⭐' : '⭐';
  const list = $('end-list');
  list.textContent = '';
  g.players.forEach((p, i) => {
    const li = document.createElement('li');
    if (i === 0) li.className = 'me';
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

function startGame(o = {}) {
  S.token++;
  const opts = { ...S.opts, ...o };
  S.g = createGame({ seed: opts.seed ?? ((Date.now() ^ (Math.random() * 1e9)) & 0x7fffffff), palier: +opts.palier, bots: +opts.bots, difficulty: opts.difficulty, mode: opts.mode, jokerSwap: opts.jokerSwap === true || opts.jokerSwap === 'true', avatar: +opts.avatar || 1, shortRounds: 5 });
  S.sel.clear();
  S.helpOn = false;
  S.suggest = null;
  S.newId = null;
  S.g.events.length = 0;
  S.view.setPlayers(S.g.players);
  for (const id of ['setup', 'round', 'end', 'rules', 'goalcard', 'skippick']) $(id).classList.add('hidden');
  refresh();
  setMsg(turnHint());
  S.noGoalCard = o.goalCard === false;
  const go = () => { if (S.g.current !== 0) S.botsPromise = runBots(); };
  if (S.fast || S.noGoalCard) go(); else { speakObjective(); }
  showGoalCard(go);
}

function continueRound() {
  nextRound(S.g);
  S.g.events.length = 0;
  S.sel.clear();
  S.helpOn = false;
  S.suggest = null;
  $('round').classList.add('hidden');
  refresh();
  setMsg(turnHint());
  const go = () => { if (S.g.current !== 0) S.botsPromise = runBots(); };
  if (!S.fast && !S.noGoalCard) speakObjective();
  showGoalCard(go);
}

function renderBotsPicker() {
  const seg = document.querySelector('.seg[data-key="bots"]');
  if (!seg) return;
  seg.textContent = '';
  const bots = botAvatars(+S.opts.avatar);
  for (let n = 1; n <= 3; n++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.v = String(n);
    b.className = 'botsbtn' + (+S.opts.bots === n ? ' on' : '');
    b.setAttribute('aria-label', `${n} adversaire${n > 1 ? 's' : ''}`);
    b.innerHTML = bots.slice(0, n).map((a) => avatarHTML({ avatar: a.id, emoji: a.emoji })).join('');
    seg.appendChild(b);
  }
}

function renderAvatarPicker() {
  renderBotsPicker();
  const box = $('avatars');
  if (!box) return;
  box.textContent = '';
  for (const a of AVATARS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'avbtn' + (+S.opts.avatar === a.id ? ' on' : '');
    b.setAttribute('aria-label', a.name);
    b.innerHTML = avatarHTML({ avatar: a.id, emoji: a.emoji });
    b.addEventListener('click', () => { S.opts.avatar = a.id; saveAvatar(a.id); sfx.pick(); renderAvatarPicker(); });
    box.appendChild(b);
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
      sfx.pick();
    });
  });
  renderAvatarPicker();
  preloadAvatars();
  onAvatarLoaded(() => { renderAvatarPicker(); if (S.g) refresh(); });
  const hero = new Image();
  hero.alt = '';
  hero.onload = () => { const box = $('hero'); box.appendChild(hero); box.classList.remove('hidden'); };
  hero.onerror = () => {};
  hero.src = './assets/img/titre.jpg';
  $('goal').addEventListener('click', () => S.g && speakObjective());
  $('btn-goal-voice').addEventListener('click', () => S.g && speakObjective());
  $('btn-goal-ok').addEventListener('click', closeGoalCard);
  $('btn-play').addEventListener('click', () => startGame());
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
    setLevel(S.g, 0, n);
    S.g.events.length = 0;
    S.sel.clear();
    for (const id of ['setup', 'round', 'end']) $(id).classList.add('hidden');
    refresh();
    if (S.g.current !== 0) S.botsPromise = runBots(); else setMsg(turnHint());
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
  give(list) { forceHand(S.g, 0, list); refresh(); return S.g.players[0].hand; },
  speakObjective,
  // joue le tour complet du joueur avec le planificateur des bots, puis laisse les bots jouer
  async auto() {
    let guard = 0;
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
