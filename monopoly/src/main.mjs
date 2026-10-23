// Orchestration : état -> rendu 3D + interface ; robots avec délai ; crochet window.__monopoly.
import { createGame, applyAction, legalActions, actor, BOT_NAMES, PLAYER_COLORS, lvl, localHuman, turnBanner } from './logic/rules.mjs';
import { chooseAction } from './logic/bots.mjs';
import { LEVELS, DURATIONS } from './logic/levels.mjs';
import { mulberry32 } from './logic/rng.mjs';
import { SPACES, GROUPS } from './logic/board.mjs';
import { DECKS } from './logic/cards.mjs';
import { getImage, refsReady, pawnAvatar, playerAvatar } from './render/images.mjs';
import { PAWNS } from './render/pawns.mjs';
import { assignPawns } from './logic/seats.mjs';
import { createScene } from './render/scene.mjs';
import { iconCanvas, drawHouse, tileTextInfo } from './render/textures.mjs';
import { h, $, showModal, hideModal, hasModal, hideAllModals } from './ui/dom.mjs';
import { renderPlayers } from './ui/hud.mjs';
import { buildContent } from './ui/build.mjs';
import { renderActions, panelMessage, propsContent } from './ui/actions.mjs';
import { deedNode } from './ui/sheets.mjs';
import { showCard } from './ui/cards.mjs';
import { renderAuction } from './ui/auction.mjs';
import { openTrade, renderIncoming } from './ui/trade.mjs';
import { RULES } from './ui/rules.mjs';
import { sfx, setMuted, isMuted } from './ui/sound.mjs';
import { speak, setAutoSpeak, isAutoSpeak, autoSpeak } from './ui/speech.mjs';

const G = { state: null, me: 0, fast: false, busy: false, scene: null, timer: null, startMs: 0, botRng: null, cfg: null, viewPid: 0, lastMsg: '', cardsShown: 0 };
// Rythme des robots : multiplicateur des délais/animations quand un robot agit (G.pace), pas pour l'enfant.
const BOT_PACE = 1.6, BOT_GAP_MS = 1200;
const sleep = (ms) => new Promise((r) => setTimeout(r, G.fast ? 0 : ms * (G.pace || 1)));
const defName = (k, human) => (human ? (k === 0 ? 'Toi' : `Joueur ${k + 1}`) : BOT_NAMES[(k - 1) % 3].name);
const cfg = { name: 'Toi', pawn: 'car', bots: 1, seats: [{ name: 'Toi', human: true }, { name: BOT_NAMES[0].name, human: false }], botLevel: 'facile', level: 1, minutes: 20 };

// ---------- écrans ----------
const SCREENS = ['home', 'setup', 'rules', 'game', 'end'];
function show(name) {
  for (const s of SCREENS) $('#' + s).classList.toggle('hidden', s !== name);
  if (name === 'game') requestAnimationFrame(() => G.scene && G.scene.resize());
}

// ---------- accueil ----------
function buildHome() {
  const hero = $('#hero');
  const c = document.createElement('canvas'); c.width = 260; c.height = 200;
  const ctx = c.getContext('2d');
  drawHouse(ctx, 60, 110, 90, '#fff3d6', '#e5424f'); drawHouse(ctx, 200, 120, 70, '#fde0e8', '#3b78e0');
  ctx.drawImage(iconCanvas('fox', 140), 60, 40);
  hero.append(c);
  getImage('titre').then((img) => { if (img) { img.alt = 'Ma ville'; hero.replaceChildren(img); } });
  $('#b-play').onclick = () => { sfx('click'); show('setup'); };
  $('#b-rules').onclick = () => { sfx('click'); show('rules'); };
}

function buildRules() {
  const box = $('#rules-text');
  box.replaceChildren(...RULES.flatMap(([t, p]) => [h('h3', {}, t), h('p', {}, p)]));
  $('#b-rules-back').onclick = () => show('home');
  $('#b-rules-say').onclick = () => speak(RULES.map(([t, p]) => `${t}. ${p}`).join(' '));
}

// ---------- réglages ----------
function buildSetup() {
  const fill = (id, items, get, set, cls = '') => {
    const box = $(id);
    const draw = () => box.replaceChildren(...(typeof items === 'function' ? items() : items).map((it) => h('button', { class: (cls + ' ' + (get() === it.v ? 'sel' : '')).trim(), onclick: () => { set(it.v); sfx('click'); draw(); }, 'aria-label': it.aria || null }, ...it.c)));
    draw(); return draw;
  };
  const redrawPawns = fill('#s-pawn', () => PAWNS.map((p) => ({ v: p.id, c: [pawnAvatar(p.id, p.emoji, 44, PLAYER_COLORS[0])], aria: p.label })), () => cfg.pawn, (v) => { cfg.pawn = v; drawSeats(); }, 'pawnbtn');
  refsReady.then(() => { redrawPawns(); if (G.state) render(); });
  let drawSeats;
  fill('#s-bots', [2, 3, 4].map((n) => ({ v: n, c: [`${n} joueurs`] })), () => cfg.seats.length, (v) => {
    while (cfg.seats.length < v) { const k = cfg.seats.length; cfg.seats.push({ name: defName(k, false), human: false }); }
    cfg.seats.length = v; cfg.bots = v - 1; drawSeats();
  });
  const seatPawn = (k) => { const id = assignPawns(cfg.pawn, PAWNS.map((p) => p.id), cfg.seats.length)[k]; return pawnAvatar(id, PAWNS.find((p) => p.id === id).emoji, 34, PLAYER_COLORS[k]); };
  drawSeats = () => {
    $('#s-seats').replaceChildren(...cfg.seats.map((st, k) => {
      const toggle = h('button', { class: 'seatbtn' + (st.human ? ' sel' : ''), 'aria-label': st.human ? 'Humain' : 'Robot', onclick: () => {
        if (st.human && cfg.seats.filter((x) => x.human).length <= 1) { sfx('oops'); return; }
        const wasDefault = st.name === defName(k, st.human) || !st.name;
        st.human = !st.human; if (wasDefault) st.name = defName(k, st.human);
        sfx('click'); drawSeats();
      } }, st.human ? '🙂 Humain' : '🤖 Robot');
      const input = h('input', { type: 'text', maxlength: '12', value: st.name, autocomplete: 'off', 'aria-label': `Prénom place ${k + 1}` });
      input.addEventListener('input', () => { st.name = input.value.trim() || defName(k, st.human); });
      return h('div', { class: 'seat', style: `border-color:${PLAYER_COLORS[k]}` }, h('span', { class: 'sdot', style: `background:${PLAYER_COLORS[k]}` }, String(k + 1)), seatPawn(k), input, toggle);
    }));
    cfg.bots = cfg.seats.length - 1; cfg.name = cfg.seats[0].name;
  };
  drawSeats();
  fill('#s-botlvl', [{ v: 'facile', c: ['😊 Facile'] }, { v: 'normal', c: ['😎 Normal'] }], () => cfg.botLevel, (v) => { cfg.botLevel = v; });
  let redrawDur;
  const redrawLvl = fill('#s-level', [1, 2, 3].map((n) => ({ v: n, c: [h('span', { class: 'lvl' }, h('span', { style: 'font-size:1.8rem' }, LEVELS[n].icon), h('span', {}, h('b', {}, `${n}. ${LEVELS[n].name}`), h('br'), LEVELS[n].hint))] })),
    () => cfg.level, (v) => { cfg.level = v; cfg.minutes = LEVELS[v].minutes; redrawDur(); }, 'lvlbtn');
  redrawDur = fill('#s-dur', DURATIONS.map((m) => ({ v: m, c: [m ? `${m} min` : '∞ Libre'] })), () => cfg.minutes, (v) => { cfg.minutes = v; });
  void redrawLvl;
  $('#b-back').onclick = () => show('home');
  $('#b-start').onclick = () => { sfx('click'); startGame({ ...cfg }); };
}

// ---------- partie ----------
function ensureScene() {
  if (G.scene) return true;
  try {
    G.scene = createScene($('#gl'), $('#stage'));
    G.scene.setFast(G.fast);
    new ResizeObserver(() => G.scene.resize()).observe($('#stage'));
    window.addEventListener('resize', () => G.scene.resize());
    // rotation du téléphone et barre d'adresse mobile : recadrage (zone libre recalculée par resize)
    window.addEventListener('orientationchange', () => setTimeout(() => G.scene && G.scene.resize(), 120));
    if (window.visualViewport) window.visualViewport.addEventListener('resize', () => G.scene && G.scene.resize());
    setupPicking();
    return true;
  } catch (e) {
    console.error(e); $('#msg').textContent = 'Ton navigateur ne sait pas afficher la 3D.'; return false;
  }
}

// Places : o.seats [{name, human}] (2 à 4, au moins un humain) ; à défaut, joueur 0 humain + o.bots robots (compatibilité).
function buildSeats(o) {
  let seats;
  if (Array.isArray(o.seats) && o.seats.length >= 2) seats = o.seats.slice(0, 4).map((x) => ({ name: x.name, human: !!x.human }));
  else seats = [{ name: o.name || 'Toi', human: true }, ...Array.from({ length: Math.min(3, Math.max(1, o.bots ?? 1)) }, () => ({ human: false }))];
  if (!seats.some((x) => x.human)) seats[0].human = true;
  return seats;
}
function buildPlayers(o) {
  const pawnIds = PAWNS.map((p) => p.id);
  const seatsN = buildSeats(o).length;
  const pawns = assignPawns(o.pawn, pawnIds, seatsN);
  const emoji = (id) => PAWNS.find((p) => p.id === id).emoji;
  return buildSeats(o).map((st, k) => {
    const pawn = pawns[k];
    const base = { name: (st.name || '').trim().slice(0, 12) || defName(k, st.human), pawn, emoji: emoji(pawn), isBot: !st.human, color: PLAYER_COLORS[k] };
    return st.human ? base : { ...base, name: (st.name || '').trim() ? base.name : BOT_NAMES[(k - 1) % 3].name, botLevel: o.botLevel || 'facile' };
  });
}

function startGame(o) {
  hideAllModals(); clearTimeout(G.timer);
  if (!$('#game')) return null;
  show('game');
  if (!ensureScene()) return null;
  const level = o.level ?? 1;
  const seed = o.seed ?? ((Date.now() % 100000) + 1);
  G.state = createGame({ level, seed, players: buildPlayers(o), minutes: o.minutes ?? LEVELS[level].minutes, maxTurns: o.maxTurns ?? 1500, startedAt: 0 });
  G.cfg = o; G.me = localHuman(G.state, null); G.lastKey = ''; G.botRng = mulberry32(seed * 7 + 3); G.busy = false; G.startMs = performance.now(); G.lastMsg = '';
  G.scene.setPlayers(G.state.players); G.scene.placePawns(G.state); G.scene.syncBoard(G.state);
  $('#dicebox').classList.add('hidden');
  render(); afterRender();
  return G.state;
}

// ---------- rendu de l'interface ----------
function render() {
  const s = G.state; if (!s) return;
  const me = localHuman(s, G.me);
  if (me !== G.me) { for (const id of ['props', 'build', 'trade', 'tradein', 'deed']) hideModal(id, true); G.me = me; }
  renderPlayers($('#players'), s, G.me, (pid) => openProps(pid));
  const ban = turnBanner(s); const bar = $('#turnbar');
  bar.classList.toggle('hidden', !ban);
  if (ban) { bar.textContent = ban.text; bar.style.background = ban.color; }
  const ctx = { calc: '', openProps: () => openProps(G.me), confirmBankrupt, openBuild, buildFirst: () => { if (G.buildSeen) return false; G.buildSeen = true; if (!G.fast) setTimeout(() => speak('Tu peux construire une maison !'), 400); return true; } };
  const msg = panelMessage(s, G.me);
  const box = $('#actions');
  renderActions(box, s, G.me, dispatch, ctx);
  const m = $('#msg'); m.replaceChildren(...[msg, ctx.calc ? h('div', { id: 'calc' }, ctx.calc) : null].filter(Boolean));
  const key = `${G.me}|${ban ? ban.text : ''}|${msg}`;
  if (key !== G.lastKey && actor(s) === G.me) { G.lastKey = key; if (!G.fast) autoSpeak(ban ? `${ban.text}. ${msg}` : msg); }
  renderAuction(s, G.me, dispatch);
  renderIncoming(s, G.me, dispatch);
  $('#t-trade').disabled = !lvl(s).trade;
  $('#t-props').disabled = false;
  if (hasModal('props')) refreshProps();
  if (hasModal('build')) showBuild();
  G.scene.syncBoard(s); G.scene.setFollow(s.current);
  updateClock();
}

function openBuild() { sfx('click'); showBuild(); }
function showBuild() {
  const prev = document.querySelector('.layer[data-id=build] .sheet'); const top = prev ? prev.scrollTop : 0;
  const sheet = showModal('build', buildContent(G.state, G.me, dispatch, () => hideModal('build')));
  sheet.scrollTop = top;
}

let propsScroll = 0;
function openProps(view = G.me) {
  G.viewPid = view; showProps();
}
function showProps() {
  const sheet = showModal('props', propsContent(G.state, G.me, G.viewPid, dispatch, openDeed, () => hideModal('props')));
  sheet.scrollTop = propsScroll;
  sheet.addEventListener('scroll', () => { propsScroll = sheet.scrollTop; });
}
function refreshProps() { showProps(); }

function openDeed(i) {
  showModal('deed', h('div', {}, deedNode(G.state, i), h('div', { class: 'row' }, h('button', { class: 'primary', onclick: () => hideModal('deed') }, 'OK'))));
}

function confirmBankrupt() {
  showModal('confirm', h('div', {}, h('h2', {}, 'Quitter la partie ?'), h('p', {}, 'Tu perds tes biens. Tu peux aussi vendre ou mettre en gage pour continuer.'),
    h('div', { class: 'row' }, h('button', { class: 'primary', onclick: () => hideModal('confirm') }, 'Continuer à jouer'), h('button', { class: 'danger', onclick: () => { hideModal('confirm', true); dispatch({ type: 'bankrupt' }); } }, 'Abandonner'))));
}

function updateClock() {
  const s = G.state; if (!s) return;
  const el = $('#clock'); const mins = s.config.minutes;
  const ms = performance.now() - G.startMs;
  if (mins > 0) { const left = Math.max(0, mins * 60000 - ms); el.textContent = `⏱ ${Math.floor(left / 60000)}:${String(Math.floor((left % 60000) / 1000)).padStart(2, '0')}`; }
  else el.textContent = `Tour ${s.turn}`;
}
setInterval(() => {
  const s = G.state; if (!s || s.over || $('#game').classList.contains('hidden')) return;
  updateClock();
  if (s.config.minutes > 0 && performance.now() - G.startMs >= s.config.minutes * 60000 && s.phase === 'roll' && !s.doubles && !G.busy) dispatch({ type: 'timeUp' });
}, 1000);

// ---------- actions et événements ----------
async function toast(text, ms = 700) {
  const t = $('#toast'); t.textContent = text;
  // pastille juste sous la barre des joueurs (qui peut faire deux lignes en portrait)
  const tb = $('#topbar').getBoundingClientRect(); const ov = $('#overlay').getBoundingClientRect();
  t.style.top = `${Math.round(tb.bottom - ov.top + 6)}px`; t.classList.add('on');
  // reste lisible après l'action (≥ 2,6 s, plus si long) sans ralentir le jeu ; un nouveau message remplace l'ancien
  clearTimeout(G.toastTimer);
  const linger = G.fast ? ms : Math.max(2600, text.length * 70) * (G.pace || 1);
  G.toastTimer = setTimeout(() => t.classList.remove('on'), linger);
  await sleep(ms);
}

async function playEvents(events, prev, next) {
  const sc = G.scene;
  for (const e of events) {
    switch (e.type) {
      case 'turn': $('#dicebox').classList.add('hidden'); if (!G.fast) await toast(e.text, 450); break;
      case 'roll': {
        sc.setFollow(e.p); sfx('dice'); await sc.rollDice(e.dice);
        const b = $('#dicebox'); b.classList.remove('hidden'); b.textContent = `🎲 ${e.dice[0]} + ${e.dice[1]} = ${e.dice[0] + e.dice[1]}`;
        await sleep(250); break;
      }
      case 'move': {
        const jail = e.to === 10 && next.players[e.p].inJail;
        await sc.movePawn(e.p, e.from, e.to, e.steps, e.teleport, jail, () => sfx('step'));
        if (jail) await sc.fx.jailBars(e.p);
        break;
      }
      case 'passGo': sfx('coin'); sc.fx.sparklesGo(); await toast(e.text, 600); break;
      case 'buy': case 'auctionWin': {
        sfx('buy'); const fly = sc.fx.money(e.p, null, e.amount); const g = SPACES[e.space].group;
        if (g && GROUPS[g].every((j) => next.owners[j] && next.owners[j].owner === e.p) && !GROUPS[g].every((j) => prev.owners[j] && prev.owners[j].owner === e.p)) { sfx('win'); sc.fx.confetti(e.p); }
        await toast(e.text, 800); await fly; break;
      }
      case 'build': case 'sell': sfx('build'); sc.peek(e.space, 1500); await toast(e.text, 600); break;
      case 'card': {
        sfx('card'); await sc.fx.card(e.deck);
        const card = { deck: e.deck, text: DECKS[e.deck][e.id].text };
        if (!G.fast) {
          autoSpeak(card.text);
          await showCard(card, { auto: next.players[e.p].isBot, autoMs: Math.round(2600 * (G.pace || 1)) });
        }
        break;
      }
      case 'rent': case 'tax': case 'pay': { const fly = sc.fx.money(e.p, e.to ?? null, e.amount || 0); if (e.text) { sfx('pay'); await toast(e.text, 800); } await fly; break; }
      case 'jail': case 'speeding': sfx('jail'); if (e.text) await toast(e.text, 800); break;
      case 'bankrupt': sfx('oops'); await toast(e.text, 900); break;
      case 'over': sfx('win'); break;
      default: if (e.text) { sfx('click'); await toast(e.text, 600); }
    }
  }
  G.scene.placePawns(next);
}

export async function dispatch(action) {
  if (G.busy || !G.state || G.state.over) return null;
  let res;
  const who = actor(G.state); const botActed = who != null && !!G.state.players[who]?.isBot;
  try { res = applyAction(G.state, action); } catch (err) { console.warn(err.message); toast('Oups, essaie autre chose !', 900); return null; }
  G.busy = true; clearTimeout(G.timer); $('#actions').replaceChildren();
  const prev = G.state; G.state = res.state;
  G.pace = (!G.fast && botActed) ? BOT_PACE : 1; if (G.scene) G.scene.setPace(G.pace);
  try { await playEvents(res.events, prev, res.state); } catch (err) { console.error(err); } finally { G.busy = false; G.pace = 1; if (G.scene) G.scene.setPace(1); }
  render(); afterRender();
  return G.state;
}

function afterRender() {
  const s = G.state;
  if (s.over) { setTimeout(showEnd, G.fast ? 0 : 900); return; }
  clearTimeout(G.timer);
  const a = actor(s); if (a == null) return;
  const p = s.players[a];
  if (p.isBot && !G.busy) {
    const delay = G.fast ? 0 : Math.max(BOT_GAP_MS, Math.round((s.phase === 'manage' ? 450 : s.phase === 'auction' ? 600 : 800) * BOT_PACE));
    G.timer = setTimeout(() => {
      if (G.busy || !G.state || G.state.over || actor(G.state) !== a) return;
      dispatch(chooseAction(G.state, a, p.botLevel, G.botRng));
    }, delay);
  }
}

// ---------- fin ----------
function showEnd() {
  const s = G.state; if (!s || !s.over || !$('#end').classList.contains('hidden')) return;
  hideAllModals(); show('end');
  const w = s.players[s.winner]; const multi = s.players.filter((p) => !p.isBot).length > 1;
  $('#end-title').textContent = w.isBot ? `${w.name} gagne !` : (multi ? `Bravo ${w.name} !` : 'Bravo, tu as gagné !');
  const medals = ['🥇', '🥈', '🥉', '🎈'];
  $('#end-rank').replaceChildren(h('p', { class: 'hint' }, s.final.reason === 'timeUp' ? 'Le temps est écoulé : le plus riche gagne.' : s.final.reason === 'maxTurns' ? 'Partie très longue : le plus riche gagne.' : 'Il ne reste qu’un joueur.'),
    ...s.final.ranking.map((r, k) => h('div', { class: 'rk', style: `border-color:${s.players[r.id].color}` }, medals[k] || '🎈', ' ', playerAvatar(s.players[r.id], 30), ` ${s.players[r.id].name}`, h('span', { style: 'margin-left:auto' }, r.bankrupt ? 'Sorti' : `💰 ${r.net}`), k === 0 ? ' ⭐⭐⭐' : k === 1 ? ' ⭐⭐' : ' ⭐')));
  getImage('mascotte').then((img) => { if (img && !$('#end-mascot')) { const m = img.cloneNode(); m.id = 'end-mascot'; m.alt = ''; m.style.cssText = 'max-height:22dvh;max-width:60%;display:block;margin:0 auto 8px'; $('#end-rank').before(m); } });
  confetti();
  sfx('win');
}
let confettiRaf = 0;
function confetti() {
  const c = $('#confetti'); c.width = c.clientWidth; c.height = c.clientHeight; const ctx = c.getContext('2d');
  const cols = ['#e5424f', '#ffd23f', '#3fb86a', '#3b78e0', '#ff9a2e', '#f276b0'];
  const bits = Array.from({ length: 90 }, () => ({ x: Math.random() * c.width, y: -Math.random() * c.height, v: 1.5 + Math.random() * 3, r: Math.random() * 6, s: 6 + Math.random() * 8, c: cols[(Math.random() * cols.length) | 0] }));
  cancelAnimationFrame(confettiRaf);
  const loop = () => {
    ctx.clearRect(0, 0, c.width, c.height);
    for (const b of bits) { b.y += b.v; b.r += 0.1; if (b.y > c.height) b.y = -10; ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.r); ctx.fillStyle = b.c; ctx.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2); ctx.restore(); }
    if (!$('#end').classList.contains('hidden')) confettiRaf = requestAnimationFrame(loop);
  };
  loop();
}

// ---------- outils du panneau, menu, sélection de case ----------
// Un tap sur une case ouvre sa fiche après un court délai, pour laisser place au double-tap (zoom) :
// si le relâché suivant fait partie d'un geste de la scène (double-tap, pincement, glissé), la fiche n'est pas ouverte.
function setupPicking() {
  const cv = $('#gl'); let down = null; let pending = null;
  cv.addEventListener('pointerdown', (e) => { if (!e.isPrimary) { down = null; return; } down = { x: e.clientX, y: e.clientY }; });
  cv.addEventListener('pointerup', (e) => {
    if (G.scene.gestureActive()) { clearTimeout(pending); pending = null; down = null; return; }
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 12) { down = null; return; }
    down = null;
    const i = G.scene.pickSpace(e.clientX, e.clientY);
    clearTimeout(pending);
    if (i >= 0) pending = setTimeout(() => { pending = null; if (G.scene.gestureActive()) return; sfx('click'); G.scene.flash(i); openDeed(i); }, 300);
  });
}
function buildTools() {
  $('#t-props').onclick = () => { sfx('click'); openProps(G.me); };
  $('#t-trade').onclick = () => { sfx('click'); openTrade(G.state, G.me, dispatch); };
  $('#t-log').onclick = () => {
    sfx('click');
    const log = G.state.log.slice(-18).reverse();
    showModal('log', h('div', {}, h('h2', {}, '📜 Journal'), ...(log.length ? log.map((t) => h('div', { style: 'padding:3px 0;border-bottom:1px solid #dde' }, t)) : [h('p', {}, 'Rien pour l’instant.')]),
      h('div', { class: 'row' }, h('button', { class: 'primary', onclick: () => hideModal('log') }, 'Fermer'))));
  };
  $('#t-say').onclick = () => speak($('#msg').textContent);
  const camBtn = $('#camBtn');
  camBtn.onclick = () => { sfx('click'); const m = G.scene.camMode() === 'follow' ? 'overview' : 'follow'; G.scene.setCamMode(m); camBtn.textContent = m === 'follow' ? '🗺️ Plateau' : '📍 Mon pion'; };
  $('#menubtn').onclick = () => {
    sfx('click');
    const body = h('div', {}, h('h2', {}, 'Menu'),
      h('div', { class: 'row' },
        h('button', { onclick: () => { setAutoSpeak(!isAutoSpeak()); hideModal('menu'); } }, isAutoSpeak() ? '🗣 Voix : oui' : '🗣 Voix : non'),
        h('button', { onclick: () => { setMuted(!isMuted()); hideModal('menu'); } }, isMuted() ? '🔇 Sons : non' : '🔊 Sons : oui')),
      h('div', { class: 'row' },
        h('button', { onclick: () => { hideModal('menu'); startGame({ ...G.cfg, seed: undefined }); } }, '🔁 Recommencer'),
        h('button', { class: 'danger', onclick: () => { hideModal('menu'); clearTimeout(G.timer); G.state = null; show('home'); } }, '🏠 Accueil')),
      h('div', { class: 'row' }, h('button', { class: 'primary', onclick: () => hideModal('menu') }, 'Continuer')));
    showModal('menu', body);
  };
  $('#b-again').onclick = () => { sfx('click'); startGame({ ...G.cfg, seed: undefined }); };
  $('#b-home').onclick = () => { sfx('click'); G.state = null; show('home'); };
}

// ---------- crochet de débogage ----------
const waitIdle = async () => { while (G.busy) await new Promise((r) => setTimeout(r, 5)); };
function buttonsOffscreen() {
  const bad = [];
  const layers = document.querySelectorAll('.layer'); const top = layers[layers.length - 1];
  for (const b of document.querySelectorAll('button')) {
    if (top && !top.contains(b)) continue;
    const r = b.getBoundingClientRect(); const cs = getComputedStyle(b);
    if (!r.width || !r.height || cs.visibility === 'hidden' || cs.display === 'none') continue;
    const scroller = (() => { for (let a = b.parentElement; a && a !== document.body; a = a.parentElement) { const o = getComputedStyle(a).overflowY; if ((o === 'auto' || o === 'scroll') && a.scrollHeight > a.clientHeight) return a; } return null; })();
    if (scroller) { const sr = scroller.getBoundingClientRect(); if (sr.top >= -1 && sr.bottom <= innerHeight + 1 && sr.left >= -1 && sr.right <= innerWidth + 1 && (r.bottom > sr.bottom + 1 || r.top < sr.top - 1)) continue; }
    const inside = r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1;
    let covered = false;
    if (inside) { const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); covered = !(el === b || b.contains(el)); }
    if (!inside || covered) bad.push({ text: b.textContent.trim().slice(0, 24), id: b.id || null, rect: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)], covered });
  }
  return bad;
}
window.__monopoly = {
  state: () => G.state,
  legal: () => (G.state ? legalActions(G.state) : []),
  act: async (a) => { await waitIdle(); return dispatch(a); },
  // o.seats : [{name, human}] optionnel (2 à 4 places) ; sinon joueur 0 humain + o.bots robots.
  newGame: (o = {}) => startGame({ level: 1, bots: 1, botLevel: 'facile', name: 'Toi', ...o, minutes: o.minutes }),
  me: () => G.me,
  banner: () => turnBanner(G.state),
  pawnScreen: (pid = 0) => G.scene.pawnScreen(pid),
  textInfo: () => tileTextInfo(),
  userZoom: () => G.scene.userZoom(),
  setUserZoom: (z) => G.scene.setUserZoom(z),
  autoplay: async (n = 10) => {
    let done = 0;
    while (done < n && G.state && !G.state.over) {
      await waitIdle();
      const s = G.state; const a = actor(s);
      if (a == null) break;
      if (s.players[a].isBot) { await new Promise((r) => setTimeout(r, 4)); continue; }
      await dispatch(chooseAction(s, a, 'normal', G.botRng)); done++;
    }
    return { done, over: !!(G.state && G.state.over), turn: G.state && G.state.turn };
  },
  setMoney: (p, n) => { G.state.players[p].money = n; render(); },
  giveGroup: (group, p = 0) => { for (const i of GROUPS[group]) G.state.owners[i] = { owner: p, houses: 0, mortgaged: false }; render(); },
  openBuild: () => openBuild(),
  give: (space, p) => { G.state.owners[space] = { owner: p, houses: 0, mortgaged: false }; render(); },
  fast: (b = true) => { G.fast = !!b; if (G.scene) G.scene.setFast(!!b); },
  buttonsOffscreen,
  pickAt: (x, y) => (G.scene ? G.scene.pickSpace(x, y) : -1),
  showEnd: () => showEnd(),
  screen: () => SCREENS.find((s) => !$('#' + s).classList.contains('hidden')),
  spaces: SPACES.length,
};

buildHome(); buildRules(); buildSetup(); buildTools();

// ?vitrine : scène 3D seule (plateau garni) pour produire l'image d'accueil
async function vitrine() {
  document.body.classList.add('vitrine');
  const st = startGame({ level: 3, bots: 3, botLevel: 'facile', name: 'Toi', seed: 12, minutes: 0 }); if (!st) return;
  clearTimeout(G.timer); G.busy = true;
  const own = { 1: [0, 1], 3: [0, 1], 6: [1, 2], 8: [1, 3], 9: [1, 2], 11: [2, 3], 13: [2, 0], 14: [2, 0], 16: [3, 0], 18: [3, 1], 19: [3, 3], 21: [0, 0], 23: [0, 0], 24: [0, 0], 26: [1, 0], 27: [1, 0], 29: [1, 0], 31: [2, 0], 32: [2, 0], 34: [2, 0], 37: [3, 5], 39: [3, 5], 5: [0, 0], 15: [1, 0], 25: [2, 0], 35: [3, 0] };
  for (const [i, [o, hs]] of Object.entries(own)) st.owners[i] = { owner: o, houses: hs, mortgaged: false };
  const types = ['car', 'dog', 'cat', 'boat', 'plane'];
  const fake = types.map((t, k) => ({ pawn: t, color: PLAYER_COLORS[k % 4], pos: [1, 2, 4, 6, 8][k], inJail: false }));
  G.scene.setPlayers(fake); G.scene.placePawns({ players: fake });
  G.scene.syncBoard(st);
  G.scene.setCamMode('vitrine'); G.scene.bigPawns(1.7); G.scene.setFast(false);
  await new Promise((r) => setTimeout(r, 900));
  await G.scene.rollDice([4, 3]);
  window.__vitrineReady = true;
}
if (new URLSearchParams(location.search).has('vitrine')) vitrine();
